use rusqlite::{params, Connection};
use tauri::State;

use crate::DbState;

#[tauri::command]
pub async fn get_desktop_total_donations_in_range(
    db_state: State<'_, DbState>,
    start_date: String,
    end_date: String,
) -> Result<f64, String> {
    let query_sql = "
        SELECT
            COALESCE(SUM(amount), 0)
        FROM
            transactions
        WHERE
            type = 'donation' AND
            strftime('%Y-%m-%dT%H:%M:%S.%fZ', date) BETWEEN ?1 AND ?2;
    ";

    println!(
        "Desktop Query (donation_commands.rs): Fetching donations between {} and {}",
        start_date, end_date
    );

    let conn_guard = db_state.0.lock().map_err(|e| e.to_string())?;
    let conn: &Connection = &*conn_guard;

    match conn.query_row::<f64, _, _>(&query_sql, params![start_date, end_date], |row| row.get(0)) {
        Ok(total_donations) => {
            println!("Desktop Query Result (donation_commands.rs): total_donations = {}", total_donations);
            Ok(total_donations)
        }
        Err(e) => {
            eprintln!("Desktop Query Error (donation_commands.rs): {}", e);
            Err(format!("Failed to fetch total donations with rusqlite: {}", e))
        }
    }
}

#[tauri::command]
pub async fn get_desktop_overall_tithe_balance(
    db_state: State<'_, DbState>,
) -> Result<f64, String> {
    let conn_guard = db_state.0.lock().map_err(|e| e.to_string())?;
    let conn: &Connection = &*conn_guard;

    let mut stmt = match conn.prepare("SELECT type, amount, is_chomesh FROM transactions") {
        Ok(s) => s,
        Err(e) => return Err(format!("Failed to prepare statement: {}", e)),
    };

    let rows = match stmt.query_map([], |row| {
        Ok((
            row.get::<usize, String>(0)?, // type
            row.get::<usize, f64>(1)?,    // amount
            row.get::<usize, Option<i32>>(2)?, // is_chomesh (INTEGER in SQLite, can be NULL)
        ))
    }) {
        Ok(r) => r,
        Err(e) => return Err(format!("Failed to query rows: {}", e)),
    };

    let mut balance = 0.0;

    for row_result in rows {
        match row_result {
            Ok((type_str, amount, is_chomesh_opt)) => {
                let is_chomesh = is_chomesh_opt.map_or(false, |v| v == 1);
                match type_str.as_str() {
                    "income" => {
                        balance += amount * if is_chomesh { 0.2 } else { 0.1 };
                    }
                    "donation" => {
                        balance -= amount;
                    }
                    "recognized-expense" => {
                        balance -= amount * 0.1;
                    }
                    _ => {} // Other types do not affect the balance
                }
            }
            Err(e) => return Err(format!("Error processing row: {}", e)),
        }
    }
    println!("Desktop Query Result (donation_commands.rs): overall_tithe_balance = {}", balance);
    Ok(balance)
} 