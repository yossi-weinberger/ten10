use chrono::{Datelike, Months, NaiveDate};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tauri::State;
// use log::{info, error, warn}; // No longer using log crate macros

use crate::transaction_types::{
    donation_types_case_condition, expense_types_case_condition, income_types_case_condition,
};
use crate::DbState; // Assuming DbState is defined in main.rs or lib.rs

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DesktopMonthlyDataPoint {
    month_label: String, // YYYY-MM
    income: f64,
    donations: f64,
    expenses: f64,
}

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

#[tauri::command]
pub fn get_desktop_monthly_financial_summary(
    db_state: State<'_, DbState>,
    end_date_str: String, // Expected ISO format 'YYYY-MM-DD'
    num_months: i32,
) -> Result<Vec<DesktopMonthlyDataPoint>, String> {
    println!(
        "[Rust Chart] get_desktop_monthly_financial_summary called with endDateStr: {}, num_months: {}",
        end_date_str,
        num_months
    );

    let conn_guard = db_state.0.lock().map_err(|e| {
        eprintln!("[Rust Chart] Error locking DB: {}", e.to_string());
        e.to_string()
    })?;
    let conn: &Connection = &*conn_guard;

    let end_date_actual = NaiveDate::parse_from_str(&end_date_str, "%Y-%m-%d").map_err(|e| {
        eprintln!(
            "[Rust Chart] Error parsing end_date_str '{}': {}",
            end_date_str, e
        );
        format!("Error parsing end_date '{}': {}", end_date_str, e)
    })?;
    println!("[Rust Chart] Parsed end_date_actual: {}", end_date_actual);

    let end_month_start_date = end_date_actual
        .with_day(1)
        .ok_or_else(|| format!("Invalid date '{}': cannot normalize to first of month", end_date_actual))?;
    let start_date_actual = end_month_start_date
        .checked_sub_months(Months::new((num_months - 1) as u32))
        .ok_or_else(|| format!("Date range out of bounds: {} months before {}", num_months, end_month_start_date))?;

    println!(
        "[Rust Chart] Calculated start_date_actual (first day of period): {}",
        start_date_actual
    );
    println!(
        "[Rust Chart] Calculated end_month_start_date (first day of last month in period): {}",
        end_month_start_date
    );

    let mut results: Vec<DesktopMonthlyDataPoint> = Vec::new();
    let mut current_month_iter = start_date_actual;

    while current_month_iter <= end_month_start_date {
        let month_start_str = current_month_iter.format("%Y-%m-01").to_string();
        let next_month_start = current_month_iter
            .checked_add_months(Months::new(1))
            .ok_or_else(|| format!("Date overflow iterating past {}", current_month_iter))?;
        let month_end_str = next_month_start
            .checked_sub_days(chrono::Days::new(1))
            .ok_or_else(|| format!("Date underflow computing end of month {}", current_month_iter))?
            .format("%Y-%m-%d")
            .to_string();
        let month_label_str = current_month_iter.format("%Y-%m").to_string();

        println!(
            "[Rust Chart] Querying for month: {}, range: {} to {}",
            month_label_str, month_start_str, month_end_str
        );

        let sql_query = format!(
            "SELECT 
                COALESCE(SUM({}), 0) as income, 
                COALESCE(SUM({}), 0) as donations, 
                COALESCE(SUM({}), 0) as expenses 
             FROM transactions 
             WHERE date >= ?1 AND date <= ?2",
            income_types_case_condition(),
            donation_types_case_condition(),
            expense_types_case_condition()
        );

        let mut stmt = conn.prepare(&sql_query)
            .map_err(|e| {
                eprintln!("[Rust Chart] Error preparing SQL statement for month {}: {}", month_label_str, e);
                e.to_string()
            })?;

        let mut rows = stmt
            .query(params![month_start_str, month_end_str])
            .map_err(|e| {
                eprintln!(
                    "[Rust Chart] Error executing SQL query for month {}: {}",
                    month_label_str, e
                );
                e.to_string()
            })?;

        if let Some(row) = rows.next().map_err(|e| {
            eprintln!(
                "[Rust Chart] Error fetching row for month {}: {}",
                month_label_str, e
            );
            e.to_string()
        })? {
            let income: f64 = row.get(0).unwrap_or(0.0);
            let donations: f64 = row.get(1).unwrap_or(0.0);
            let expenses: f64 = row.get(2).unwrap_or(0.0);
            println!(
                "[Rust Chart] Month {}: Income={}, Donations={}, Expenses={}",
                month_label_str, income, donations, expenses
            );
            results.push(DesktopMonthlyDataPoint {
                month_label: month_label_str.clone(),
                income,
                donations,
                expenses,
            });
        } else {
            eprintln!(
                "[Rust Chart] No row returned from query for month {}, adding zeroed entry.",
                month_label_str
            );
            results.push(DesktopMonthlyDataPoint {
                month_label: month_label_str.clone(),
                income: 0.0,
                donations: 0.0,
                expenses: 0.0,
            });
        }

        current_month_iter = next_month_start;
    }

    println!(
        "[Rust Chart] Final results ({} items): {:?}",
        results.len(),
        results
    );
    Ok(results)
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
