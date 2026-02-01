// src-tauri/src/commands/recurring_transaction_commands.rs

use crate::models::RecurringTransaction;
use crate::DbState;
use chrono::{Local, Months, NaiveDate};
use rusqlite::{params, Connection, Result as RusqliteResult};
use tauri::State;
use uuid::Uuid;
use serde::{Deserialize, Serialize};
use rusqlite::types::ToSql;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TableSortingPayload {
    pub field: String,
    pub direction: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TableFiltersPayload {
    pub search: Option<String>,
    pub statuses: Option<Vec<String>>,
    pub types: Option<Vec<String>>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub frequencies: Option<Vec<String>>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GetRecurringTransactionsArgs {
    pub sorting: TableSortingPayload,
    pub filters: TableFiltersPayload,
}

fn calculate_next_due_date(current_due_date_str: &str, frequency: &str) -> Result<String, String> {
    let current_date = NaiveDate::parse_from_str(current_due_date_str, "%Y-%m-%d")
        .map_err(|e| format!("Failed to parse date: {}", e))?;

    // TODO: Implement logic for other frequencies (weekly, yearly)
    let next_date = match frequency {
        "monthly" => current_date.checked_add_months(Months::new(1))
            .ok_or_else(|| "Failed to add one month to the date.".to_string())?,
        _ => return Err(format!("Unsupported frequency: {}", frequency)),
    };

    Ok(next_date.format("%Y-%m-%d").to_string())
}

fn get_due_recurring_transactions(
    conn: &Connection,
    today: &str,
) -> RusqliteResult<Vec<RecurringTransaction>> {
    let mut stmt = conn.prepare(
        "SELECT * FROM recurring_transactions WHERE status = 'active' AND next_due_date <= ?1",
    )?;
    let rows = stmt.query_map(params![today], |row| RecurringTransaction::from_row(row))?;
    rows.collect()
}

#[tauri::command]
pub fn get_due_recurring_transactions_handler(
    db_state: State<'_, DbState>,
) -> std::result::Result<Vec<RecurringTransaction>, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    let today_str = Local::now().format("%Y-%m-%d").to_string();
    
    get_due_recurring_transactions(&conn, &today_str)
        .map_err(|e| format!("Failed to query due transactions: {}", e))
}

#[tauri::command]
pub fn add_recurring_transaction_handler(
    db_state: State<'_, DbState>,
    rec_transaction: RecurringTransaction,
) -> std::result::Result<(), String> {
    println!("[RUST] add_recurring_transaction_handler called with: {:?}", rec_transaction);
    let conn = db_state
        .0
        .lock()
        .map_err(|e| format!("DB lock error: {}", e))?;

    conn.execute(
        "INSERT INTO recurring_transactions (id, user_id, status, start_date, next_due_date, frequency, day_of_month, total_occurrences, execution_count, description, amount, currency, type, category, is_chomesh, recipient, created_at, updated_at, original_amount, original_currency, conversion_rate, conversion_date, rate_source)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23)",
        params![
            rec_transaction.id,
            rec_transaction.user_id,
            rec_transaction.status,
            rec_transaction.start_date,
            rec_transaction.next_due_date,
            rec_transaction.frequency,
            rec_transaction.day_of_month,
            rec_transaction.total_occurrences,
            rec_transaction.execution_count,
            rec_transaction.description,
            rec_transaction.amount,
            rec_transaction.currency,
            rec_transaction.transaction_type,
            rec_transaction.category,
            rec_transaction.is_chomesh,
            rec_transaction.recipient,
            rec_transaction.created_at,
            rec_transaction.updated_at,
            rec_transaction.original_amount,
            rec_transaction.original_currency,
            rec_transaction.conversion_rate,
            rec_transaction.conversion_date,
            rec_transaction.rate_source,
        ],
    )
    .map_err(|e| format!("Failed to insert recurring transaction: {}", e))?;
    
    Ok(())
} 

#[tauri::command]
pub fn get_recurring_transactions_handler(
    db_state: State<'_, DbState>,
    args: GetRecurringTransactionsArgs,
) -> std::result::Result<Vec<RecurringTransaction>, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    let sorting = args.sorting;
    let filters = args.filters;

    let sort_field = match sorting.field.as_str() {
        "description" | "amount" | "next_due_date" | "status" | "type" | "frequency" => sorting.field,
        _ => "next_due_date".to_string(),
    };
    let sort_direction = if sorting.direction.to_lowercase() == "desc" { "DESC" } else { "ASC" };

    let mut where_clauses: Vec<String> = Vec::new();
    let mut params: Vec<Box<dyn ToSql>> = Vec::new();

    if let Some(search_term) = filters.search {
        let trimmed = search_term.trim();
        if !trimmed.is_empty() {
            where_clauses.push("(description LIKE ? OR recipient LIKE ?)".to_string());
            let like_val = format!("%{}%", trimmed);
            params.push(Box::new(like_val.clone()));
            params.push(Box::new(like_val));
        }
    }

    if let Some(statuses) = filters.statuses {
        if !statuses.is_empty() {
            let placeholders = statuses.iter().map(|_| "?").collect::<Vec<_>>().join(", ");
            where_clauses.push(format!("status IN ({})", placeholders));
            for status in statuses {
                params.push(Box::new(status));
            }
        }
    }

    if let Some(types) = filters.types {
        if !types.is_empty() {
            let placeholders = types.iter().map(|_| "?").collect::<Vec<_>>().join(", ");
            where_clauses.push(format!("type IN ({})", placeholders));
            for t in types {
                params.push(Box::new(t));
            }
        }
    }

    if let Some(date_from) = filters.date_from {
        if !date_from.is_empty() {
            where_clauses.push("next_due_date >= ?".to_string());
            params.push(Box::new(date_from));
        }
    }

    if let Some(date_to) = filters.date_to {
        if !date_to.is_empty() {
            where_clauses.push("next_due_date <= ?".to_string());
            params.push(Box::new(date_to));
        }
    }

    if let Some(frequencies) = filters.frequencies {
        if !frequencies.is_empty() {
            let placeholders = frequencies.iter().map(|_| "?").collect::<Vec<_>>().join(", ");
            where_clauses.push(format!("frequency IN ({})", placeholders));
            for f in frequencies {
                params.push(Box::new(f));
            }
        }
    }

    let where_sql = if where_clauses.is_empty() {
        "".to_string()
    } else {
        format!("WHERE {}", where_clauses.join(" AND "))
    };

    let query = format!(
        "SELECT * FROM recurring_transactions {} ORDER BY {} {}",
        where_sql, sort_field, sort_direction
    );

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let params_slice: Vec<&dyn ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let rows = stmt.query_map(params_slice.as_slice(), |row| RecurringTransaction::from_row(row))
        .map_err(|e| e.to_string())?;

    let mut recurring = Vec::new();
    for row in rows {
        recurring.push(row.map_err(|e| e.to_string())?);
    }
    Ok(recurring)
}

#[tauri::command]
pub fn update_recurring_transaction_handler(
    db_state: State<'_, DbState>,
    id: String,
    updates: serde_json::Value,
) -> std::result::Result<RecurringTransaction, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    
    let mut set_clauses = Vec::new();
    let mut params: Vec<Box<dyn ToSql>> = Vec::new();
    let updates_map = updates.as_object().ok_or("Invalid updates format")?;

    for (key, value) in updates_map {
        set_clauses.push(format!("{} = ?", key));
        match value {
            serde_json::Value::Number(n) => {
                if n.is_f64() {
                    params.push(Box::new(n.as_f64().unwrap()));
                } else {
                    params.push(Box::new(n.as_i64().unwrap()));
                }
            }
            serde_json::Value::String(s) => params.push(Box::new(s.clone())),
            serde_json::Value::Bool(b) => params.push(Box::new(*b)),
            serde_json::Value::Null => params.push(Box::new(rusqlite::types::Null)),
            _ => return Err(format!("Unsupported value type for key: {}", key)),
        }
    }
    
    if set_clauses.is_empty() {
        return Err("No fields to update".to_string());
    }

    set_clauses.push("updated_at = ?".to_string());
    params.push(Box::new(Local::now().to_rfc3339()));

    let query = format!(
        "UPDATE recurring_transactions SET {} WHERE id = ?",
        set_clauses.join(", ")
    );

    let mut final_params = params;
    final_params.push(Box::new(id.clone()));

    let params_slice: Vec<&dyn ToSql> = final_params.iter().map(|p| p.as_ref()).collect();

    conn.execute(&query, params_slice.as_slice())
        .map_err(|e| format!("DB execute error: {}", e))?;

    // Fetch and return the updated transaction
    let mut stmt = conn.prepare("SELECT * FROM recurring_transactions WHERE id = ?1")
        .map_err(|e| e.to_string())?;
    let updated_rec = stmt.query_row(params![id], |row| RecurringTransaction::from_row(row))
        .map_err(|e| e.to_string())?;

    Ok(updated_rec)
} 

#[tauri::command]
pub fn get_recurring_transaction_by_id_handler(
    db_state: State<'_, DbState>,
    id: String,
) -> std::result::Result<RecurringTransaction, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare("SELECT * FROM recurring_transactions WHERE id = ?1")
        .map_err(|e| e.to_string())?;
        
    let rec = stmt.query_row(params![id], |row| RecurringTransaction::from_row(row))
        .map_err(|e| e.to_string())?;

    Ok(rec)
} 

#[tauri::command]
pub fn delete_recurring_transaction_handler(
    db_state: State<'_, DbState>,
    id: String,
) -> std::result::Result<(), String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    
    conn.execute("DELETE FROM recurring_transactions WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    
    Ok(())
} 