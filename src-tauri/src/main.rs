// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;
use env_logger;

mod commands;
use commands::income_commands::get_desktop_total_income_in_range;
use commands::expense_commands::get_desktop_total_expenses_in_range;
use commands::donation_commands::{get_desktop_total_donations_in_range, get_desktop_overall_tithe_balance};
use commands::transaction_commands::{delete_transaction_handler, export_transactions_handler, get_filtered_transactions_handler, update_transaction_handler};
use commands::chart_commands::get_desktop_monthly_financial_summary;

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
    is_recurring: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    recurring_day_of_month: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    recurring_total_count: Option<i32>,
}

pub struct DbState(Mutex<Connection>);

#[tauri::command]
async fn init_db(db: State<'_, DbState>) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    
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
            updated_at TEXT,
            is_recurring INTEGER,
            recurring_day_of_month INTEGER,
            recurring_total_count INTEGER
        )",
        [],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn add_transaction(db: State<'_, DbState>, transaction: Transaction) -> Result<(), String> {
    // DEBUG: Print the received transaction struct
    println!("Received transaction in Rust: {:?}", transaction);

    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO transactions (id, user_id, date, amount, currency, description, type, category, is_chomesh, recipient, created_at, updated_at, is_recurring, recurring_day_of_month, recurring_total_count)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
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
            &transaction.is_recurring.map(|b| b as i32),
            &transaction.recurring_day_of_month,
            &transaction.recurring_total_count,
        ),
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn clear_all_data(db: State<'_, DbState>) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM transactions", [])
        .map_err(|e| e.to_string())?;
    println!("Cleared all transactions from the database.");
    Ok(())
}

fn main() {
    env_logger::init();

    let conn = Connection::open("Ten10.db").expect("Failed to open database");
    
    tauri::Builder::default()
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
            get_desktop_monthly_financial_summary
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}