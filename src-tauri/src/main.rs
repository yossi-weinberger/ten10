// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use env_logger;
use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

mod commands;
use commands::chart_commands::get_desktop_monthly_financial_summary;
use commands::donation_commands::{
    get_desktop_overall_tithe_balance, get_desktop_total_donations_in_range,
};
use commands::expense_commands::get_desktop_total_expenses_in_range;
use commands::income_commands::get_desktop_total_income_in_range;
use commands::recurring_transaction_commands::{
    add_recurring_transaction_handler, execute_due_recurring_transactions_handler,
};
use commands::transaction_commands::{
    delete_transaction_handler, export_transactions_handler, get_filtered_transactions_handler,
    update_transaction_handler,
};

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Transaction {
    id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    user_id: Option<String>,
    date: String,
    amount: f64,
    currency: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    description: Option<String>,
    #[serde(rename = "type")]
    transaction_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    category: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    created_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    updated_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    is_chomesh: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    recipient: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    source_recurring_id: Option<String>,
}

pub struct DbState(Mutex<Connection>);

#[tauri::command]
async fn init_db(db: State<'_, DbState>) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    // Create transactions table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            date TEXT NOT NULL,
            amount REAL NOT NULL,
            currency TEXT NOT NULL,
            description TEXT,
            type TEXT NOT NULL,
            category TEXT,
            is_chomesh INTEGER,
            recipient TEXT,
            created_at TEXT,
            updated_at TEXT
        )",
        [],
    )
    .map_err(|e| e.to_string())?;

    // Create recurring_transactions table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS recurring_transactions (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            start_date TEXT NOT NULL,
            next_due_date TEXT NOT NULL,
            frequency TEXT NOT NULL DEFAULT 'monthly',
            day_of_month INTEGER NOT NULL,
            total_occurrences INTEGER,
            execution_count INTEGER NOT NULL DEFAULT 0,
            description TEXT,
            amount REAL NOT NULL,
            currency TEXT NOT NULL,
            type TEXT NOT NULL,
            category TEXT,
            is_chomesh INTEGER,
            recipient TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        [],
    )
    .map_err(|e| e.to_string())?;

    // Add source_recurring_id to transactions table if it doesn't exist
    // Use a helper function to check for column existence to avoid errors on re-runs
    if !column_exists(&conn, "transactions", "source_recurring_id").map_err(|e| e.to_string())? {
        conn.execute(
            "ALTER TABLE transactions ADD COLUMN source_recurring_id TEXT",
            [],
        )
        .map_err(|e| e.to_string())?;
    }

    // Add occurrence_number to transactions table if it doesn't exist
    if !column_exists(&conn, "transactions", "occurrence_number").map_err(|e| e.to_string())? {
        conn.execute(
            "ALTER TABLE transactions ADD COLUMN occurrence_number INTEGER",
            [],
        )
        .map_err(|e| e.to_string())?;
    }

    // --- Cleanup: Drop old recurring columns if they exist ---
    let columns_to_drop = vec!["is_recurring", "recurring_day_of_month", "recurring_total_count"];
    for col in columns_to_drop {
        if column_exists(&conn, "transactions", col).map_err(|e| e.to_string())? {
            // Note: DROP COLUMN might not be supported in older SQLite versions,
            // but it's available in versions shipped with recent tauri builds.
            conn.execute(&format!("ALTER TABLE transactions DROP COLUMN {}", col), [])
                .map_err(|e| e.to_string())?;
            println!("[DB Migration] Dropped deprecated column: {}", col);
        }
    }

    Ok(())
}

// Helper function to check if a column exists in a table
fn column_exists(conn: &Connection, table_name: &str, column_name: &str) -> Result<bool> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({})", table_name))?;
    let mut rows = stmt.query([])?;
    while let Some(row) = rows.next()? {
        let name: String = row.get(1)?;
        if name.eq_ignore_ascii_case(column_name) {
            return Ok(true);
        }
    }
    Ok(false)
}

#[tauri::command]
async fn add_transaction(db: State<'_, DbState>, transaction: Transaction) -> Result<(), String> {
    // DEBUG: Print the received transaction struct
    println!("Received transaction in Rust: {:?}", transaction);

    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO transactions (id, user_id, date, amount, currency, description, type, category, is_chomesh, recipient, created_at, updated_at, source_recurring_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        (
            &transaction.id,
            &transaction.user_id,
            &transaction.date,
            &transaction.amount,
            &transaction.currency,
            &transaction.description,
            &transaction.transaction_type,
            &transaction.category,
            &transaction.is_chomesh.map(|b| b as i32),
            &transaction.recipient,
            &transaction.created_at,
            &transaction.updated_at,
            &transaction.source_recurring_id,
        ),
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn clear_all_data(db: State<'_, DbState>) -> Result<(), String> {
    let mut conn = db.0.lock().map_err(|e| e.to_string())?;
    
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute("DELETE FROM recurring_transactions", [])
        .map_err(|e| e.to_string())?;
    println!("Cleared all recurring_transactions from the database.");

    tx.execute("DELETE FROM transactions", [])
        .map_err(|e| e.to_string())?;
    println!("Cleared all transactions from the database.");

    tx.commit().map_err(|e| e.to_string())?;
    
    Ok(())
}

fn main() {
    env_logger::init();

    let conn = Connection::open("Ten10.db").expect("Failed to open database");

    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .manage(DbState(Mutex::new(conn)))
        .invoke_handler(tauri::generate_handler![
            init_db,
            add_transaction,
            clear_all_data,
            get_desktop_total_income_in_range,
            get_desktop_total_expenses_in_range,
            get_desktop_total_donations_in_range,
            get_desktop_overall_tithe_balance,
            delete_transaction_handler,
            export_transactions_handler,
            get_filtered_transactions_handler,
            update_transaction_handler,
            get_desktop_monthly_financial_summary,
            execute_due_recurring_transactions_handler,
            add_recurring_transaction_handler
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
