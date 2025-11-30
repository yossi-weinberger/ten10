use rusqlite::{params, Connection};
use serde::Serialize;
use tauri::State;

use crate::DbState;
use crate::transaction_types::{donation_types_case_condition, donation_types_condition};

// New struct for returning detailed donation data
#[derive(Serialize, Debug)]
pub struct DesktopDonationData {
    total_donations_amount: f64,
    non_tithe_donation_amount: f64,
}

#[tauri::command]
pub async fn get_desktop_total_donations_in_range(
    db_state: State<'_, DbState>,
    start_date: String,
    end_date: String,
) -> Result<DesktopDonationData, String> {
    let query_sql = format!(
        "SELECT
            COALESCE(SUM({}), 0) AS total_donations_amount,
            COALESCE(SUM(CASE WHEN type = 'non_tithe_donation' THEN amount ELSE 0 END), 0) AS non_tithe_donation_amount
        FROM
            transactions
        WHERE
            {} AND
            date >= ?1 AND
            date <= ?2;",
        donation_types_case_condition(),
        donation_types_condition()
    );

    println!(
        "Desktop Query (donation_commands.rs): Fetching detailed donations between {} and {}",
        start_date, end_date
    );

    let conn_guard = db_state.0.lock().map_err(|e| e.to_string())?;
    let conn: &Connection = &*conn_guard;

    match conn.query_row(query_sql.as_str(), params![start_date, end_date], |row| {
        Ok(DesktopDonationData {
            total_donations_amount: row.get(0)?,
            non_tithe_donation_amount: row.get(1)?,
        })
    }) {
        Ok(donation_data) => {
            println!(
                "Desktop Query Result (donation_commands.rs): donation_data = {:?}",
                donation_data
            );
            Ok(donation_data)
        }
        Err(e) => {
            eprintln!("Desktop Query Error (donation_commands.rs): {}", e);
            Err(format!(
                "Failed to fetch detailed donations with rusqlite: {}",
                e
            ))
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
            row.get::<usize, String>(0)?,      // type
            row.get::<usize, f64>(1)?,         // amount
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
    println!(
        "Desktop Query Result (donation_commands.rs): overall_tithe_balance = {}",
        balance
    );
    Ok(balance)
}
