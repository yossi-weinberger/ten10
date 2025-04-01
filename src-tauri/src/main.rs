// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
struct Income {
    id: String,
    date: String,
    description: String,
    amount: f64,
    currency: String,
    is_chomesh: bool,
    is_recurring: bool,
    recurring_day: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
struct Donation {
    id: String,
    date: String,
    recipient: String,
    amount: f64,
    currency: String,
    is_recurring: bool,
    recurring_day: Option<i32>,
}

struct DbState(Mutex<Connection>);

#[tauri::command]
async fn init_db(db: State<'_, DbState>) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    
    conn.execute(
        "CREATE TABLE IF NOT EXISTS incomes (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            currency TEXT NOT NULL,
            is_chomesh INTEGER NOT NULL,
            is_recurring INTEGER NOT NULL,
            recurring_day INTEGER
        )",
        [],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS donations (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            recipient TEXT NOT NULL,
            amount REAL NOT NULL,
            currency TEXT NOT NULL,
            is_recurring INTEGER NOT NULL,
            recurring_day INTEGER
        )",
        [],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

fn main() {
    let conn = Connection::open("tenten.db").expect("Failed to open database");
    
    tauri::Builder::default()
        .manage(DbState(Mutex::new(conn)))
        .invoke_handler(tauri::generate_handler![init_db])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}