use crate::DbState; // Assuming DbState is defined in main.rs or lib.rs and made public from there
use serde::Serialize;
use tauri::State; // Import Serialize
                  // We might need to import Connection from rusqlite if it's not exposed via DbState directly in a usable way here.
                  // For now, assuming DbState and its usage pattern allows access as in main.rs

// Define a struct to hold the aggregation result
#[derive(Debug, Serialize)]
pub struct IncomeAggregationResult {
    total_income: f64,
    chomesh_amount: f64,
}

#[tauri::command]
pub fn get_desktop_total_income_in_range(
    db_state: State<'_, DbState>,
    start_date: String, // Expecting "YYYY-MM-DD"
    end_date: String,   // Expecting "YYYY-MM-DD"
) -> Result<IncomeAggregationResult, String> {
    let conn_guard = db_state
        .0
        .lock()
        .map_err(|e| format!("DB lock error: {}", e))?;

    // Updated SQL query from sql_queries/sqlite/income/select_total_income.sql
    // Reflects the change to select both total_income and chomesh_amount
    // AND uses is_chomesh for SQLite.
    let sql = "
        SELECT
            COALESCE(SUM(amount), 0) AS total_income,
            COALESCE(SUM(CASE WHEN is_chomesh THEN amount ELSE 0 END), 0) AS chomesh_amount
        FROM transactions
        WHERE
            (type = 'income' OR type = 'exempt-income') AND
            date >= ?1 AND
            date <= ?2;
    ";

    println!(
        "Desktop Query (income_commands.rs): Fetching income and chomesh between {} and {}",
        start_date, end_date
    );

    match conn_guard.query_row(sql, rusqlite::params![start_date, end_date], |row| {
        Ok(IncomeAggregationResult {
            total_income: row.get::<usize, f64>(0)?,
            chomesh_amount: row.get::<usize, f64>(1)?,
        })
    }) {
        Ok(result) => {
            println!(
                "Desktop Query Result (income_commands.rs): total_income = {}, chomesh_amount = {}",
                result.total_income, result.chomesh_amount
            );
            Ok(result)
        }
        Err(e) => {
            eprintln!("Desktop Query Error (income_commands.rs): {}", e);
            Err(format!("Failed to fetch income and chomesh: {}", e))
        }
    }
}
