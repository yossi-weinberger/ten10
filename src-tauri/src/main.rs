// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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
#[serde(rename_all = "camelCase")]
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

#[tauri::command]
async fn add_income(db: State<'_, DbState>, income: Income) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO incomes (id, date, description, amount, currency, is_chomesh, is_recurring, recurring_day)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        (
            income.id,
            income.date,
            income.description,
            income.amount,
            income.currency,
            income.is_chomesh as i32,
            income.is_recurring as i32,
            income.recurring_day,
        ),
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn add_donation(db: State<'_, DbState>, donation: Donation) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO donations (id, date, recipient, amount, currency, is_recurring, recurring_day)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        (
            donation.id,
            donation.date,
            donation.recipient,
            donation.amount,
            donation.currency,
            donation.is_recurring as i32,
            donation.recurring_day,
        ),
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn get_incomes(db: State<'_, DbState>) -> Result<Vec<Income>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, date, description, amount, currency, is_chomesh, is_recurring, recurring_day FROM incomes")
        .map_err(|e| e.to_string())?;
    
    let income_iter = stmt.query_map([], |row| {
        Ok(Income {
            id: row.get(0)?,
            date: row.get(1)?,
            description: row.get(2)?,
            amount: row.get(3)?,
            currency: row.get(4)?,
            is_chomesh: row.get::<usize, i32>(5)? != 0, // Convert INTEGER back to bool
            is_recurring: row.get::<usize, i32>(6)? != 0, // Convert INTEGER back to bool
            recurring_day: row.get(7)?,
        })
    }).map_err(|e| e.to_string())?;

    let incomes = income_iter.collect::<Result<Vec<Income>, rusqlite::Error>>().map_err(|e| e.to_string())?;
    Ok(incomes)
}

#[tauri::command]
async fn get_donations(db: State<'_, DbState>) -> Result<Vec<Donation>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, date, recipient, amount, currency, is_recurring, recurring_day FROM donations")
        .map_err(|e| e.to_string())?;

    let donation_iter = stmt.query_map([], |row| {
        Ok(Donation {
            id: row.get(0)?,
            date: row.get(1)?,
            recipient: row.get(2)?,
            amount: row.get(3)?,
            currency: row.get(4)?,
            is_recurring: row.get::<usize, i32>(5)? != 0, // Convert INTEGER back to bool
            recurring_day: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?;

    let donations = donation_iter.collect::<Result<Vec<Donation>, rusqlite::Error>>().map_err(|e| e.to_string())?;
    Ok(donations)
}

#[tauri::command]
async fn clear_all_data(db: State<'_, DbState>) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM incomes", [])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM donations", [])
        .map_err(|e| e.to_string())?;
    // Optionally, reset other data if needed (e.g., VACUUM to shrink DB file)
    // conn.execute("VACUUM", []).map_err(|e| e.to_string())?;
    println!("Cleared all incomes and donations from the database.");
    Ok(())
}

fn main() {
    let conn = Connection::open("tenten.db").expect("Failed to open database");
    
    tauri::Builder::default()
        .manage(DbState(Mutex::new(conn)))
        .invoke_handler(tauri::generate_handler![
            init_db, 
            add_income, 
            add_donation,
            get_incomes,
            get_donations,
            clear_all_data
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}