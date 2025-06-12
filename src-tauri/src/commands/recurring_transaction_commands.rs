// src-tauri/src/commands/recurring_transaction_commands.rs

// TODO: Refactor by moving shared structs like Transaction to a central models.rs file
// For now, defining it locally to avoid complex module dependencies.
// This definition should be kept in sync with other Transaction structs.
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Transaction {
    pub id: String,
    pub user_id: Option<String>,
    pub date: String,
    pub amount: f64,
    pub currency: String,
    pub description: Option<String>,
    #[serde(rename = "type")]
    pub type_str: String,
    pub category: Option<String>,
    pub is_chomesh: Option<bool>,
    pub is_recurring: Option<bool>,
    pub recurring_day_of_month: Option<i32>,
    pub recipient: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub source_recurring_id: Option<String>,
}

// use crate::commands::transaction_commands::Transaction; // This was causing a conflict, using local definition for now.
use crate::DbState;
use chrono::{Local, Months, NaiveDate};
use rusqlite::{params, Connection, Result as RusqliteResult};
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct RecurringTransaction {
    pub id: String,
    pub user_id: Option<String>,
    pub status: String,
    pub start_date: String,
    pub next_due_date: String,
    pub frequency: String,
    pub day_of_month: i32,
    pub total_occurrences: Option<i32>,
    pub execution_count: i32,
    pub description: Option<String>,
    pub amount: f64,
    pub currency: String,
    #[serde(rename = "type")]
    pub type_str: String,
    pub category: Option<String>,
    pub is_chomesh: Option<bool>,
    pub recipient: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl RecurringTransaction {
    fn from_row(row: &rusqlite::Row<'_>) -> RusqliteResult<Self> {
        Ok(RecurringTransaction {
            id: row.get("id")?,
            user_id: row.get("user_id")?,
            status: row.get("status")?,
            start_date: row.get("start_date")?,
            next_due_date: row.get("next_due_date")?,
            frequency: row.get("frequency")?,
            day_of_month: row.get("day_of_month")?,
            total_occurrences: row.get("total_occurrences")?,
            execution_count: row.get("execution_count")?,
            description: row.get("description")?,
            amount: row.get("amount")?,
            currency: row.get("currency")?,
            type_str: row.get("type")?,
            category: row.get("category")?,
            is_chomesh: row.get::<_, Option<i32>>("is_chomesh")?.map(|v| v != 0),
            recipient: row.get("recipient")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }
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
    let rows = stmt.query_map(params![today], RecurringTransaction::from_row)?;
    rows.collect()
}

#[tauri::command]
pub fn execute_due_recurring_transactions_handler(
    db_state: State<'_, DbState>,
) -> std::result::Result<String, String> {
    let start_time = std::time::Instant::now();
    println!("[RUST] Starting optimized recurring transactions execution.");

    let mut conn = db_state
        .0
        .lock()
        .map_err(|e| format!("DB lock error: {}", e))?;

    let today_str = Local::now().format("%Y-%m-%d").to_string();
    let today_date = NaiveDate::parse_from_str(&today_str, "%Y-%m-%d")
        .expect("Could not parse today's date. This should not happen.");

    let due_transactions = match get_due_recurring_transactions(&conn, &today_str) {
        Ok(trans) => trans,
        Err(e) => return Err(format!("Failed to query due transactions: {}", e)),
    };

    if due_transactions.is_empty() {
        return Ok("No recurring transactions were due. Execution finished.".to_string());
    }

    let num_due_definitions = due_transactions.len();
    println!("[RUST] Found {} due recurring transaction definition(s). Processing...", num_due_definitions);
    let mut total_processed_occurrences = 0;

    'processing_loop: for mut rec in due_transactions {
        let tx = match conn.transaction() {
            Ok(tx) => tx,
            Err(e) => return Err(format!("Failed to start DB transaction: {}", e)),
        };

        let mut occurrences_in_batch = 0;
        let original_rec_id = rec.id.clone();

        let mut current_due_date = match NaiveDate::parse_from_str(&rec.next_due_date, "%Y-%m-%d") {
            Ok(date) => date,
            Err(e) => {
                eprintln!("[RUST ERROR] Could not parse date for recurring transaction {}: {}. Skipping.", original_rec_id, e);
                continue; // Skip this recurring transaction
            }
        };

        // Inner loop to process all past-due occurrences for this one recurring transaction
        while current_due_date <= today_date {
            if let Some(total) = rec.total_occurrences {
                if rec.execution_count >= total {
                    rec.status = "completed".to_string();
                    break;
                }
            }

            let new_transaction_id = Uuid::new_v4().to_string();
            let now_iso = Local::now().to_rfc3339();
            if let Err(e) = tx.execute(
                "INSERT INTO transactions (id, user_id, date, amount, currency, description, type, category, is_chomesh, recipient, source_recurring_id, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
                params![
                    new_transaction_id, rec.user_id, current_due_date.format("%Y-%m-%d").to_string(),
                    rec.amount, rec.currency, rec.description, rec.type_str, rec.category,
                    rec.is_chomesh.map(|b| b as i32), rec.recipient, rec.id, now_iso, now_iso,
                ],
            ) {
                eprintln!("[RUST ERROR] Failed to insert new transaction for {}: {}. Rolling back this batch.", original_rec_id, e);
                if let Err(rb_err) = tx.rollback() {
                     eprintln!("[RUST ERROR] Failed to rollback transaction: {}", rb_err);
                }
                continue 'processing_loop; // Error in this batch, rollback and move to the next recurring transaction.
            }

            total_processed_occurrences += 1;
            occurrences_in_batch += 1;
            rec.execution_count += 1;

            // Calculate the next due date for the next iteration
            match calculate_next_due_date(&current_due_date.format("%Y-%m-%d").to_string(), &rec.frequency) {
                Ok(next_date_str) => {
                    current_due_date = NaiveDate::parse_from_str(&next_date_str, "%Y-%m-%d")
                        .expect("calculate_next_due_date returned an invalid date format");
                }
                Err(e) => {
                     eprintln!("[RUST ERROR] Could not calculate next due date for {}: {}. Stopping processing for this item.", original_rec_id, e);
                     break;
                }
            }
        }

        // Update the recurring transaction definition with its new state
        rec.next_due_date = current_due_date.format("%Y-%m-%d").to_string();
        
        if let Err(e) = tx.execute(
            "UPDATE recurring_transactions SET execution_count = ?1, next_due_date = ?2, status = ?3, updated_at = ?4 WHERE id = ?5",
            params![rec.execution_count, rec.next_due_date, rec.status, Local::now().to_rfc3339(), rec.id],
        ) {
            eprintln!("[RUST ERROR] Failed to update recurring transaction {}: {}. Rolling back.", original_rec_id, e);
            if let Err(rb_err) = tx.rollback() {
                eprintln!("[RUST ERROR] Failed to rollback transaction: {}", rb_err);
            }
            continue; // Move to the next recurring transaction
        }

        if let Err(e) = tx.commit() {
            eprintln!("[RUST ERROR] Failed to commit transaction for {}: {}.", original_rec_id, e);
        } else {
            println!("[RUST] Successfully processed {} occurrence(s) for recurring ID: {}", occurrences_in_batch, original_rec_id);
        }
    }

    let duration = start_time.elapsed();
    let result_message = format!(
        "Execution finished in {:?}. Processed {} transaction occurrence(s) from {} definition(s).",
        duration, total_processed_occurrences, num_due_definitions
    );

    println!("[RUST] {}", result_message);
    Ok(result_message)
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
        "INSERT INTO recurring_transactions (id, user_id, status, start_date, next_due_date, frequency, day_of_month, total_occurrences, execution_count, description, amount, currency, type, category, is_chomesh, recipient, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)",
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
            rec_transaction.type_str,
            rec_transaction.category,
            rec_transaction.is_chomesh.map(|b| b as i32),
            rec_transaction.recipient,
            rec_transaction.created_at,
            rec_transaction.updated_at,
        ],
    )
    .map_err(|e| format!("Failed to insert recurring transaction: {}", e))?;
    
    Ok(())
} 