// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
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
    #[serde(alias = "is_recurring")]
    is_recurring: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(alias = "recurring_day_of_month")]
    recurring_day_of_month: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    supabase_id: Option<String>,
    // Legacy camelCase support fields
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(alias = "isChomesh")]
    is_chomesh_alt: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(alias = "createdAt")]
    created_at_alt: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(alias = "updatedAt")]
    updated_at_alt: Option<String>,
}

struct DbState(Mutex<Connection>);

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
            supabase_id TEXT
        )",
        [],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn add_transaction(db: State<'_, DbState>, transaction: Transaction) -> Result<(), String> {
    // DEBUG: Print the received transaction struct
    println!("Received transaction in Rust: {:?}", transaction);

    // Prioritize snake_case fields but fall back to camelCase if needed
    let is_chomesh_value = transaction.is_chomesh.or(transaction.is_chomesh_alt);
    let created_at_value = transaction.created_at.or(transaction.created_at_alt);
    let updated_at_value = transaction.updated_at.or(transaction.updated_at_alt);

    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO transactions (id, user_id, date, amount, currency, description, type, category, is_chomesh, recipient, created_at, updated_at, is_recurring, recurring_day_of_month, supabase_id)
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
            &is_chomesh_value.map(|b| b as i32),
            &transaction.recipient,
            &created_at_value,
            &updated_at_value,
            &transaction.is_recurring.map(|b| b as i32),
            &transaction.recurring_day_of_month,
            &transaction.supabase_id,
        ),
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn get_transactions(db: State<'_, DbState>) -> Result<Vec<Transaction>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, user_id, date, amount, currency, description, type, category, is_chomesh, recipient, created_at, updated_at, is_recurring, recurring_day_of_month, supabase_id FROM transactions")
        .map_err(|e| e.to_string())?;

    let transaction_iter = stmt
        .query_map([], |row| {
            Ok(Transaction {
                id: row.get(0)?,
                user_id: row.get(1)?,
                date: row.get(2)?,
                amount: row.get(3)?,
                currency: row.get(4)?,
                description: row.get(5)?,
                transaction_type: row.get(6)?,
                category: row.get(7)?,
                is_chomesh: row.get::<_, Option<i32>>(8)?.map(|v| v != 0),
                recipient: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
                is_recurring: row.get::<_, Option<i32>>(12)?.map(|v| v != 0),
                recurring_day_of_month: row.get(13)?,
                supabase_id: row.get(14)?,
                // Set alternative fields to None as they're only for deserialization
                is_chomesh_alt: None,
                created_at_alt: None,
                updated_at_alt: None,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut transactions = Vec::new();
    for transaction in transaction_iter {
        transactions.push(transaction.map_err(|e| e.to_string())?);
    }

    Ok(transactions)
}

#[tauri::command]
async fn clear_all_data(db: State<'_, DbState>) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    
    conn.execute("DELETE FROM transactions", [])
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .manage(DbState(Mutex::new(
            Connection::open("tenten.db").expect("Failed to open database"),
        )))
        .invoke_handler(tauri::generate_handler![
            init_db,
            add_transaction,
            get_transactions,
            clear_all_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}