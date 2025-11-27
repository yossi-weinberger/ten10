use rusqlite::{params, Connection};
use tauri::State;

use crate::DbState;
use crate::transaction_types::expense_types_condition;

#[tauri::command]
pub async fn get_desktop_total_expenses_in_range(
    db_state: State<'_, DbState>,
    start_date: String,
    end_date: String,
) -> Result<f64, String> {
    // SQL query directly embedded
    let query_sql = format!(
        "SELECT
            COALESCE(SUM(amount), 0)
        FROM
            transactions
        WHERE
            {} AND
            date >= ?1 AND
            date <= ?2;",
        expense_types_condition()
    );

    println!(
        "Desktop Query (expense_commands.rs): Fetching expenses between {} and {}",
        start_date, end_date
    );

    let conn_guard = db_state.0.lock().map_err(|e| e.to_string())?;
    let conn: &Connection = &*conn_guard;

    match conn.query_row::<f64, _, _>(query_sql.as_str(), params![start_date, end_date], |row| row.get(0)) {
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
