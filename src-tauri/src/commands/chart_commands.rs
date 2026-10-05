use chrono::NaiveDate;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tauri::State;
// use log::{info, error, warn}; // No longer using log crate macros

use crate::transaction_types::{
    donation_types_case_condition, expense_types_case_condition, income_types_case_condition,
};
use crate::DbState; // Assuming DbState is defined in main.rs or lib.rs

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DesktopPeriodDataPoint {
    period_index: usize,
    period_start: String,
    period_end: String,
    income: f64,
    donations: f64,
    expenses: f64,
}

fn query_period_financial_summary(
    conn: &Connection,
    boundaries: &[String],
) -> Result<Vec<DesktopPeriodDataPoint>, String> {
    if boundaries.len() < 2 {
        return Err("At least two period boundaries are required".to_string());
    }

    let sql_query = format!(
        "SELECT
            COALESCE(SUM({}), 0),
            COALESCE(SUM({}), 0),
            COALESCE(SUM({}), 0)
         FROM transactions
         WHERE date >= ?1 AND date < ?2",
        income_types_case_condition(),
        donation_types_case_condition(),
        expense_types_case_condition()
    );
    let mut statement = conn
        .prepare(&sql_query)
        .map_err(|error| error.to_string())?;
    let mut results = Vec::with_capacity(boundaries.len() - 1);

    for (index, adjacent_boundaries) in boundaries.windows(2).enumerate() {
        let period_start = &adjacent_boundaries[0];
        let period_end = &adjacent_boundaries[1];
        let parsed_start = NaiveDate::parse_from_str(period_start, "%Y-%m-%d")
            .map_err(|error| format!("Invalid period boundary '{}': {}", period_start, error))?;
        let parsed_end = NaiveDate::parse_from_str(period_end, "%Y-%m-%d")
            .map_err(|error| format!("Invalid period boundary '{}': {}", period_end, error))?;
        if parsed_start >= parsed_end {
            return Err("Period boundaries must be strictly ascending".to_string());
        }

        let (income, donations, expenses) = statement
            .query_row(params![period_start, period_end], |row| {
                Ok((row.get(0)?, row.get(1)?, row.get(2)?))
            })
            .map_err(|error| error.to_string())?;

        results.push(DesktopPeriodDataPoint {
            period_index: index + 1,
            period_start: period_start.clone(),
            period_end: period_end.clone(),
            income,
            donations,
            expenses,
        });
    }

    Ok(results)
}

#[tauri::command]
pub fn get_desktop_period_financial_summary(
    db_state: State<'_, DbState>,
    boundaries: Vec<String>,
) -> Result<Vec<DesktopPeriodDataPoint>, String> {
    let connection = db_state.0.lock().map_err(|error| error.to_string())?;
    query_period_financial_summary(&connection, &boundaries)
}

#[cfg(test)]
mod period_tests {
    use super::*;

    #[test]
    fn summarizes_explicit_boundaries_and_preserves_empty_periods() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE transactions (
                id TEXT PRIMARY KEY,
                date TEXT NOT NULL,
                amount REAL NOT NULL,
                type TEXT NOT NULL
            );
            INSERT INTO transactions (id, date, amount, type) VALUES
                ('income', '2026-09-30', 100, 'income'),
                ('donation', '2026-10-01', 10, 'donation'),
                ('expense', '2026-10-11', 20, 'expense');",
        )
        .unwrap();
        let boundaries = vec![
            "2026-09-12".to_string(),
            "2026-10-12".to_string(),
            "2026-11-11".to_string(),
        ];

        let result = query_period_financial_summary(&conn, &boundaries).unwrap();

        assert_eq!(result.len(), 2);
        assert_eq!(result[0].period_index, 1);
        assert_eq!(result[0].period_start, "2026-09-12");
        assert_eq!(result[0].period_end, "2026-10-12");
        assert_eq!(result[0].income, 100.0);
        assert_eq!(result[0].donations, 10.0);
        assert_eq!(result[0].expenses, 20.0);
        assert_eq!(result[1].period_index, 2);
        assert_eq!(result[1].period_start, "2026-10-12");
        assert_eq!(result[1].period_end, "2026-11-11");
        assert_eq!(result[1].income, 0.0);
        assert_eq!(result[1].donations, 0.0);
        assert_eq!(result[1].expenses, 0.0);
    }
}
