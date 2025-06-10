use rusqlite::{params, Connection};
use tauri::State;

use crate::DbState;

#[tauri::command]
pub async fn get_desktop_total_expenses_in_range(
    db_state: State<'_, DbState>,
    start_date: String,
    end_date: String,
) -> Result<f64, String> {
    // SQL query directly embedded
    let query_sql = "
        SELECT
            COALESCE(SUM(amount), 0)
        FROM
            transactions
        WHERE
            (type = 'expense' OR type = 'recognized-expense') AND
            strftime('%Y-%m-%dT%H:%M:%S.%fZ', date) BETWEEN ?1 AND ?2;
    ";

    println!(
        "Desktop Query (expense_commands.rs): Fetching expenses between {} and {}",
        start_date, end_date
    );

    let conn_guard = db_state.0.lock().map_err(|e| e.to_string())?;
    let conn: &Connection = &*conn_guard;

    match conn.query_row::<f64, _, _>(&query_sql, params![start_date, end_date], |row| row.get(0)) {
        Ok(total_expenses) => {
            println!(
                "Desktop Query Result (expense_commands.rs): total_expenses = {}",
                total_expenses
            );
            Ok(total_expenses)
        }
        Err(e) => {
            eprintln!("Desktop Query Error (expense_commands.rs): {}", e);
            Err(format!(
                "Failed to fetch total expenses with rusqlite: {}",
                e
            ))
        }
    }
}
