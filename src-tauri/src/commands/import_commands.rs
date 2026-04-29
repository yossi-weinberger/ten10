// Bulk desktop JSON import: single SQLite transaction, minimal IPC from the frontend.

use crate::models::{RecurringTransaction, Transaction};
use crate::DbState;
use tauri::State;

use super::recurring_transaction_commands::insert_recurring_transaction_row;
use super::transaction_commands::insert_transaction_row;

/// Runs replace (clear + insert) or merge (insert only) inside one SQLite transaction.
#[tauri::command]
pub fn import_desktop_data_bulk(
    db_state: State<'_, DbState>,
    mode: String,
    recurring: Vec<RecurringTransaction>,
    transactions: Vec<Transaction>,
) -> Result<(), String> {
    if mode != "replace" && mode != "merge" {
        return Err(format!("invalid import mode: {}", mode));
    }

    let mut conn_guard = db_state.0.lock().map_err(|e| e.to_string())?;
    let conn = &mut *conn_guard;

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    if mode == "replace" {
        tx.execute("DELETE FROM recurring_transactions", [])
            .map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM transactions", [])
            .map_err(|e| e.to_string())?;
    }

    for rec in &recurring {
        insert_recurring_transaction_row(&tx, rec).map_err(|e| e.to_string())?;
    }
    for t in &transactions {
        insert_transaction_row(&tx, t).map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}
