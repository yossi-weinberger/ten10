// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

mod commands;
use commands::income_commands::get_desktop_total_income_in_range;
use commands::expense_commands::get_desktop_total_expenses_in_range;
use commands::donation_commands::{get_desktop_total_donations_in_range, get_desktop_overall_tithe_balance};

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
async fn get_transactions(db: State<'_, DbState>) -> Result<Vec<Transaction>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, user_id, date, amount, currency, description, type, category, 
                is_chomesh, recipient, created_at, updated_at, 
                is_recurring, recurring_day_of_month, recurring_total_count
         FROM transactions")
        .map_err(|e| e.to_string())?;

    let transaction_iter = stmt.query_map([], |row| {
        let is_chomesh_opt: Option<i32> = row.get(8)?;
        let is_chomesh_bool_opt = is_chomesh_opt.map(|i| i != 0);

        let is_recurring_opt: Option<i32> = row.get(12)?;
        let is_recurring_bool_opt = is_recurring_opt.map(|i| i != 0);

        Ok(Transaction {
            id: row.get(0)?,
            user_id: row.get(1)?,
            date: row.get(2)?,
            amount: row.get(3)?,
            currency: row.get(4)?,
            description: row.get(5)?,
            transaction_type: row.get(6)?,
            category: row.get(7)?,
            is_chomesh: is_chomesh_bool_opt,
            recipient: row.get(9)?,
            created_at: row.get(10)?,
            updated_at: row.get(11)?,
            is_recurring: is_recurring_bool_opt,
            recurring_day_of_month: row.get(13)?,
            recurring_total_count: row.get(14)?,
        })
    }).map_err(|e| e.to_string())?;

    let transactions = transaction_iter.collect::<Result<Vec<Transaction>, rusqlite::Error>>().map_err(|e| e.to_string())?;
    Ok(transactions)
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
    let conn = Connection::open("Ten10.db").expect("Failed to open database");
    
    tauri::Builder::default()
        .manage(DbState(Mutex::new(conn)))
        .invoke_handler(tauri::generate_handler![
            init_db, 
            add_transaction,
            get_transactions,
            clear_all_data,
            get_desktop_total_income_in_range,
            get_desktop_total_expenses_in_range,
            get_desktop_total_donations_in_range,
            get_desktop_overall_tithe_balance
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}