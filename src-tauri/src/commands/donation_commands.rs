use rusqlite::{params, Connection};
use serde::Serialize;
use tauri::State;

use crate::DbState;
use crate::models::TitheBalanceBreakdown;
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

fn compute_tithe_balance(
    conn: &Connection,
    as_of_date: Option<&str>,
) -> Result<TitheBalanceBreakdown, String> {
    let (query, params): (&str, Vec<&str>) = match as_of_date {
        Some(date) => (
            "SELECT type, amount, is_chomesh FROM transactions WHERE date <= ?1",
            vec![date],
        ),
        None => (
            "SELECT type, amount, is_chomesh FROM transactions",
            Vec::new(),
        ),
    };

    let mut stmt = conn
        .prepare(query)
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let rows = stmt
        .query_map(rusqlite::params_from_iter(params), |row| {
            Ok((
                row.get::<usize, String>(0)?,
                row.get::<usize, f64>(1)?,
                row.get::<usize, Option<i32>>(2)?,
            ))
        })
        .map_err(|e| format!("Failed to query rows: {}", e))?;

    let mut maaser_balance = 0.0;
    let mut chomesh_balance = 0.0;

    for row_result in rows {
        let (type_str, amount, is_chomesh_opt) =
            row_result.map_err(|e| format!("Error processing row: {}", e))?;
        let is_chomesh = is_chomesh_opt.map_or(false, |v| v == 1);
        match type_str.as_str() {
            "income" => {
                // BALANCE SPLIT LOGIC: maaser gets 10% of ALL income (base obligation).
                // Chomesh pot gets only the EXTRA 10% from chomesh-marked income (delta).
                // So income of 1000 with chomesh: maaser +100, chomesh +100, total +200.
                // To change this split logic, also update: SQL migration file.
                maaser_balance += amount * 0.1;
                if is_chomesh {
                    chomesh_balance += amount * 0.1;
                }
            }
            "donation" => {
                if is_chomesh {
                    chomesh_balance -= amount;
                } else {
                    maaser_balance -= amount;
                }
            }
            "recognized-expense" => {
                maaser_balance -= amount * 0.1;
                if is_chomesh {
                    chomesh_balance -= amount * 0.1;
                }
            }
            "initial_balance" => {
                if is_chomesh {
                    chomesh_balance += amount;
                } else {
                    maaser_balance += amount;
                }
            }
            _ => {}
        }
    }

    Ok(TitheBalanceBreakdown {
        total_balance: maaser_balance + chomesh_balance,
        maaser_balance,
        chomesh_balance,
    })
}

#[tauri::command]
pub async fn get_desktop_overall_tithe_balance(
    db_state: State<'_, DbState>,
) -> Result<TitheBalanceBreakdown, String> {
    let conn_guard = db_state.0.lock().map_err(|e| e.to_string())?;
    let conn: &Connection = &*conn_guard;
    let balance = compute_tithe_balance(conn, None)?;
    println!(
        "Desktop Query Result (donation_commands.rs): tithe_balance = {} (maaser: {}, chomesh: {})",
        balance.total_balance, balance.maaser_balance, balance.chomesh_balance
    );
    Ok(balance)
}

#[tauri::command]
pub async fn get_desktop_tithe_balance_as_of(
    db_state: State<'_, DbState>,
    as_of_date: String,
) -> Result<TitheBalanceBreakdown, String> {
    let conn_guard = db_state.0.lock().map_err(|e| e.to_string())?;
    let conn: &Connection = &*conn_guard;
    compute_tithe_balance(conn, Some(&as_of_date))
}

#[cfg(test)]
mod tithe_as_of_tests {
    use super::*;

    #[test]
    fn as_of_date_excludes_later_transactions() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE transactions (
                id TEXT PRIMARY KEY,
                date TEXT NOT NULL,
                amount REAL NOT NULL,
                type TEXT NOT NULL,
                is_chomesh INTEGER
            );
            INSERT INTO transactions (id, date, amount, type, is_chomesh) VALUES
                ('before', '2026-09-11', 1000, 'income', 0),
                ('start', '2026-09-12', 3000, 'income', 0),
                ('after', '2027-10-02', 800, 'income', 0);",
        )
        .unwrap();

        let opening = compute_tithe_balance(&conn, Some("2026-09-11")).unwrap();
        let closing = compute_tithe_balance(&conn, Some("2027-10-01")).unwrap();
        let all_time = compute_tithe_balance(&conn, None).unwrap();

        assert_eq!(opening.total_balance, 100.0);
        assert_eq!(closing.total_balance, 400.0);
        assert_eq!(all_time.total_balance, 480.0);
    }
}
