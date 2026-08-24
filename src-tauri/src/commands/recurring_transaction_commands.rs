// src-tauri/src/commands/recurring_transaction_commands.rs

use crate::models::RecurringTransaction;
use crate::DbState;
use chrono::Local;
use rusqlite::types::ToSql;
use rusqlite::{params, Connection, Result as RusqliteResult};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use tauri::State;

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

/// Shared INSERT for `recurring_transactions` (used by handler and bulk import).
pub(crate) fn insert_recurring_transaction_row(
    conn: &Connection,
    rec_transaction: &RecurringTransaction,
) -> RusqliteResult<()> {
    conn.execute(
        "INSERT INTO recurring_transactions (id, user_id, status, start_date, next_due_date, frequency, day_of_month, total_occurrences, execution_count, description, amount, currency, type, category, is_chomesh, recipient, payment_method, created_at, updated_at, original_amount, original_currency, conversion_rate, conversion_date, rate_source)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24)",
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
            rec_transaction.payment_method,
            rec_transaction.created_at,
            rec_transaction.updated_at,
            rec_transaction.original_amount,
            rec_transaction.original_currency,
            rec_transaction.conversion_rate,
            rec_transaction.conversion_date,
            rec_transaction.rate_source,
        ],
    )?;
    Ok(())
}

#[tauri::command]
pub fn add_recurring_transaction_handler(
    db_state: State<'_, DbState>,
    rec_transaction: RecurringTransaction,
) -> std::result::Result<(), String> {
    println!(
        "[RUST] add_recurring_transaction_handler called with: {:?}",
        rec_transaction
    );
    let conn = db_state
        .0
        .lock()
        .map_err(|e| format!("DB lock error: {}", e))?;

    insert_recurring_transaction_row(&conn, &rec_transaction)
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
        "description" | "amount" | "next_due_date" | "status" | "type" | "frequency"
        | "payment_method" => sorting.field,
        _ => "next_due_date".to_string(),
    };
    let sort_direction = if sorting.direction.to_lowercase() == "desc" {
        "DESC"
    } else {
        "ASC"
    };

    let mut where_clauses: Vec<String> = Vec::new();
    let mut params: Vec<Box<dyn ToSql>> = Vec::new();

    if let Some(search_term) = filters.search {
        let trimmed = search_term.trim();
        if !trimmed.is_empty() {
            where_clauses.push(
                "(description LIKE ? OR recipient LIKE ? OR payment_method LIKE ?)".to_string(),
            );
            let like_val = format!("%{}%", trimmed);
            params.push(Box::new(like_val.clone()));
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
            let placeholders = frequencies
                .iter()
                .map(|_| "?")
                .collect::<Vec<_>>()
                .join(", ");
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
    let rows = stmt
        .query_map(params_slice.as_slice(), |row| {
            RecurringTransaction::from_row(row)
        })
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
        let column = recurring_update_column(key)
            .ok_or_else(|| format!("Unsupported update field: {}", key))?;
        set_clauses.push(format!("{} = ?", column));
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
    let mut stmt = conn
        .prepare("SELECT * FROM recurring_transactions WHERE id = ?1")
        .map_err(|e| e.to_string())?;
    let updated_rec = stmt
        .query_row(params![id], |row| RecurringTransaction::from_row(row))
        .map_err(|e| e.to_string())?;

    Ok(updated_rec)
}

fn recurring_update_column(key: &str) -> Option<&'static str> {
    match key {
        "status" => Some("status"),
        "start_date" | "startDate" => Some("start_date"),
        "next_due_date" | "nextDueDate" => Some("next_due_date"),
        "frequency" => Some("frequency"),
        "day_of_month" | "dayOfMonth" => Some("day_of_month"),
        "total_occurrences" | "totalOccurrences" => Some("total_occurrences"),
        "execution_count" | "executionCount" => Some("execution_count"),
        "description" => Some("description"),
        "amount" => Some("amount"),
        "currency" => Some("currency"),
        "type" => Some("type"),
        "category" => Some("category"),
        "is_chomesh" | "isChomesh" => Some("is_chomesh"),
        "recipient" => Some("recipient"),
        "payment_method" | "paymentMethod" => Some("payment_method"),
        "original_amount" | "originalAmount" => Some("original_amount"),
        "original_currency" | "originalCurrency" => Some("original_currency"),
        "conversion_rate" | "conversionRate" => Some("conversion_rate"),
        "conversion_date" | "conversionDate" => Some("conversion_date"),
        "rate_source" | "rateSource" => Some("rate_source"),
        _ => None,
    }
}

#[tauri::command]
pub fn get_recurring_transaction_by_id_handler(
    db_state: State<'_, DbState>,
    id: String,
) -> std::result::Result<RecurringTransaction, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT * FROM recurring_transactions WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    let rec = stmt
        .query_row(params![id], |row| RecurringTransaction::from_row(row))
        .map_err(|e| e.to_string())?;

    Ok(rec)
}

#[tauri::command]
pub fn delete_recurring_transaction_handler(
    db_state: State<'_, DbState>,
    id: String,
) -> std::result::Result<(), String> {
    let mut conn = db_state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn
        .transaction()
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    tx.execute(
        "UPDATE transactions SET source_recurring_id = NULL WHERE source_recurring_id = ?1",
        params![&id],
    )
    .map_err(|e| format!("Failed to clear recurring transaction sources: {}", e))?;

    let affected = tx
        .execute(
            "DELETE FROM recurring_transactions WHERE id = ?1",
            params![&id],
        )
        .map_err(|e| format!("Failed to delete recurring transaction: {}", e))?;
    if affected != 1 {
        return Err(format!("Recurring transaction with ID {} not found.", id));
    }

    tx.commit()
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;
    Ok(())
}

fn validate_bulk_ids(ids: &[String]) -> std::result::Result<(), String> {
    if ids.is_empty() {
        return Err("ids must not be empty".to_string());
    }

    let mut seen = HashSet::new();
    for id in ids {
        let normalized = id.trim();
        if normalized.is_empty()
            || normalized.eq_ignore_ascii_case("null")
            || normalized.eq_ignore_ascii_case("undefined")
        {
            return Err("ids must not contain empty or null-like values".to_string());
        }
        if !seen.insert(normalized.to_string()) {
            return Err(format!("duplicate id: {}", normalized));
        }
    }

    Ok(())
}

fn placeholders(count: usize) -> String {
    std::iter::repeat("?")
        .take(count)
        .collect::<Vec<_>>()
        .join(", ")
}

fn id_params(ids: &[String]) -> Vec<&dyn ToSql> {
    ids.iter().map(|id| id as &dyn ToSql).collect()
}

fn recurring_category_family(transaction_type: &str) -> Option<&'static str> {
    match transaction_type {
        "income" | "exempt-income" => Some("income"),
        "expense" | "recognized-expense" => Some("expense"),
        _ => None,
    }
}

#[tauri::command]
pub fn bulk_delete_recurring_transactions_handler(
    db_state: State<'_, DbState>,
    ids: Vec<String>,
) -> std::result::Result<usize, String> {
    validate_bulk_ids(&ids)?;

    let mut conn = db_state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn
        .transaction()
        .map_err(|e| format!("Failed to start transaction: {}", e))?;
    let in_clause = placeholders(ids.len());

    let matched: usize = tx
        .query_row(
            &format!(
                "SELECT COUNT(*) FROM recurring_transactions WHERE id IN ({})",
                in_clause
            ),
            id_params(&ids).as_slice(),
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to count recurring transactions: {}", e))?;
    if matched != ids.len() {
        return Err("One or more recurring transactions were not found".to_string());
    }

    tx.execute(
        &format!(
            "UPDATE transactions SET source_recurring_id = NULL WHERE source_recurring_id IN ({})",
            in_clause
        ),
        id_params(&ids).as_slice(),
    )
    .map_err(|e| format!("Failed to clear recurring transaction sources: {}", e))?;

    let affected = tx
        .execute(
            &format!(
                "DELETE FROM recurring_transactions WHERE id IN ({})",
                in_clause
            ),
            id_params(&ids).as_slice(),
        )
        .map_err(|e| format!("Failed to delete recurring transactions: {}", e))?;
    if affected != ids.len() {
        return Err(format!(
            "Expected to delete {} recurring transactions, deleted {}",
            ids.len(),
            affected
        ));
    }

    tx.commit()
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;
    Ok(affected)
}

#[tauri::command]
pub fn bulk_update_recurring_transactions_handler(
    db_state: State<'_, DbState>,
    ids: Vec<String>,
    field: String,
    value: Option<String>,
) -> std::result::Result<usize, String> {
    validate_bulk_ids(&ids)?;

    let column = match field.as_str() {
        "payment_method" => "payment_method",
        "category" => "category",
        _ => return Err(format!("Unsupported bulk update field: {}", field)),
    };

    let mut conn = db_state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn
        .transaction()
        .map_err(|e| format!("Failed to start transaction: {}", e))?;
    let in_clause = placeholders(ids.len());

    let matched: usize = tx
        .query_row(
            &format!(
                "SELECT COUNT(*) FROM recurring_transactions WHERE id IN ({})",
                in_clause
            ),
            id_params(&ids).as_slice(),
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to count recurring transactions: {}", e))?;
    if matched != ids.len() {
        return Err("One or more recurring transactions were not found".to_string());
    }

    let completed_count: usize = tx
        .query_row(
            &format!(
                "SELECT COUNT(*) FROM recurring_transactions WHERE id IN ({}) AND status = 'completed'",
                in_clause
            ),
            id_params(&ids).as_slice(),
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to validate recurring status: {}", e))?;
    if completed_count > 0 {
        return Err("completed recurring transactions cannot be bulk updated".to_string());
    }

    if column == "category" {
        let mut stmt = tx
            .prepare(&format!(
                "SELECT DISTINCT type FROM recurring_transactions WHERE id IN ({})",
                in_clause
            ))
            .map_err(|e| format!("Failed to prepare category validation: {}", e))?;
        let families = stmt
            .query_map(id_params(&ids).as_slice(), |row| {
                let transaction_type: String = row.get(0)?;
                Ok(recurring_category_family(&transaction_type))
            })
            .map_err(|e| format!("Failed to validate category family: {}", e))?
            .collect::<RusqliteResult<Vec<_>>>()
            .map_err(|e| format!("Failed to read category family: {}", e))?;
        if families.iter().any(Option::is_none) {
            return Err(
                "Bulk category update requires one income or expense category family".to_string(),
            );
        }
        let unique_families: HashSet<&str> = families.into_iter().flatten().collect();
        if unique_families.len() != 1 {
            return Err(
                "Bulk category update requires one income or expense category family".to_string(),
            );
        }
    }

    let now = Local::now().to_rfc3339();
    let mut update_params: Vec<&dyn ToSql> = Vec::with_capacity(ids.len() + 2);
    update_params.push(&value);
    update_params.push(&now);
    for id in &ids {
        update_params.push(id);
    }

    let affected = tx
        .execute(
            &format!(
                "UPDATE recurring_transactions SET {} = ?, updated_at = ? WHERE id IN ({})",
                column, in_clause
            ),
            update_params.as_slice(),
        )
        .map_err(|e| format!("Failed to update recurring transactions: {}", e))?;
    if affected != ids.len() {
        return Err(format!(
            "Expected to update {} recurring transactions, updated {}",
            ids.len(),
            affected
        ));
    }

    tx.commit()
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;
    Ok(affected)
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;
    use serde_json::json;
    use std::sync::Mutex;
    use tauri::Manager;

    fn test_db() -> Connection {
        let conn = Connection::open_in_memory().expect("in-memory db");
        conn.execute_batch(
            "CREATE TABLE transactions (
                id TEXT PRIMARY KEY, user_id TEXT, date TEXT NOT NULL, amount REAL NOT NULL,
                currency TEXT NOT NULL, description TEXT, type TEXT NOT NULL, category TEXT,
                is_chomesh INTEGER, recipient TEXT, payment_method TEXT, created_at TEXT,
                updated_at TEXT, source_recurring_id TEXT, occurrence_number INTEGER,
                original_amount REAL, original_currency TEXT, conversion_rate REAL,
                conversion_date TEXT, rate_source TEXT
            );
            CREATE TABLE recurring_transactions (
                id TEXT PRIMARY KEY, user_id TEXT, status TEXT NOT NULL DEFAULT 'active',
                start_date TEXT NOT NULL, next_due_date TEXT NOT NULL,
                frequency TEXT NOT NULL DEFAULT 'monthly', day_of_month INTEGER NOT NULL,
                total_occurrences INTEGER, execution_count INTEGER NOT NULL DEFAULT 0,
                description TEXT, amount REAL NOT NULL, currency TEXT NOT NULL,
                type TEXT NOT NULL, category TEXT, is_chomesh INTEGER, recipient TEXT,
                payment_method TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
                original_amount REAL, original_currency TEXT, conversion_rate REAL,
                conversion_date TEXT, rate_source TEXT
            );

            INSERT INTO recurring_transactions
                (id, status, start_date, next_due_date, frequency, day_of_month,
                 execution_count, amount, currency, type, category, payment_method,
                 created_at, updated_at)
            VALUES
                ('r1', 'active', '2024-01-01', '2024-02-01', 'monthly', 1,
                 0, 100.0, 'ILS', 'income', 'salary', 'cash',
                 '2024-01-01', '2024-01-01'),
                ('r2', 'paused', '2024-01-01', '2024-02-01', 'monthly', 1,
                 0, 50.0, 'ILS', 'exempt-income', 'gift', 'cash',
                 '2024-01-01', '2024-01-01'),
                ('r3', 'active', '2024-01-01', '2024-02-01', 'monthly', 1,
                 0, 25.0, 'ILS', 'expense', 'food', 'card',
                 '2024-01-01', '2024-01-01'),
                ('r4', 'completed', '2024-01-01', '2024-02-01', 'monthly', 1,
                 1, 10.0, 'ILS', 'expense', 'done', 'card',
                 '2024-01-01', '2024-01-01'),
                ('r5', 'active', '2024-01-01', '2024-02-01', 'monthly', 1,
                 0, 18.0, 'ILS', 'donation', 'charity', 'cash',
                 '2024-01-01', '2024-01-01');

            INSERT INTO transactions
                (id, date, amount, currency, type, created_at, updated_at, source_recurring_id)
            VALUES
                ('t1', '2024-01-01', 100.0, 'ILS', 'income', '2024-01-01', 'kept-t1', 'r1'),
                ('t2', '2024-01-02', 50.0, 'ILS', 'income', '2024-01-02', 'kept-t2', 'r2'),
                ('t3', '2024-01-03', 25.0, 'ILS', 'expense', '2024-01-03', 'kept-t3', 'r3');",
        )
        .expect("schema and seed");
        conn
    }

    fn mock_app() -> tauri::App<tauri::test::MockRuntime> {
        let app = tauri::test::mock_app();
        app.manage(crate::DbState(Mutex::new(test_db())));
        app
    }

    fn scalar_i64(app: &tauri::App<tauri::test::MockRuntime>, sql: &str) -> i64 {
        let db_state = app.state::<crate::DbState>();
        let conn = db_state.0.lock().expect("db lock");
        conn.query_row(sql, [], |row| row.get(0)).expect("scalar")
    }

    fn optional_text(app: &tauri::App<tauri::test::MockRuntime>, sql: &str) -> Option<String> {
        let db_state = app.state::<crate::DbState>();
        let conn = db_state.0.lock().expect("db lock");
        conn.query_row(sql, [], |row| row.get(0)).expect("text")
    }

    #[test]
    fn delete_recurring_transaction_nulls_source_recurring_id_before_delete() {
        let app = mock_app();

        delete_recurring_transaction_handler(app.state::<crate::DbState>(), "r1".to_string())
            .expect("delete recurring");

        assert_eq!(
            scalar_i64(
                &app,
                "SELECT COUNT(*) FROM recurring_transactions WHERE id = 'r1'"
            ),
            0
        );
        assert_eq!(
            optional_text(
                &app,
                "SELECT source_recurring_id FROM transactions WHERE id = 't1'"
            ),
            None
        );
        assert_eq!(
            optional_text(&app, "SELECT updated_at FROM transactions WHERE id = 't1'"),
            Some("kept-t1".to_string())
        );
    }

    #[test]
    fn bulk_delete_recurring_transactions_nulls_sources_and_deletes_definitions() {
        let app = mock_app();

        let deleted = bulk_delete_recurring_transactions_handler(
            app.state::<crate::DbState>(),
            vec!["r1".to_string(), "r2".to_string()],
        )
        .expect("bulk delete recurring");

        assert_eq!(deleted, 2);
        assert_eq!(
            scalar_i64(
                &app,
                "SELECT COUNT(*) FROM recurring_transactions WHERE id IN ('r1', 'r2')"
            ),
            0
        );
        assert_eq!(
            scalar_i64(
                &app,
                "SELECT COUNT(*) FROM transactions WHERE id IN ('t1', 't2') AND source_recurring_id IS NULL"
            ),
            2
        );
        assert_eq!(
            optional_text(&app, "SELECT updated_at FROM transactions WHERE id = 't1'"),
            Some("kept-t1".to_string())
        );
        assert_eq!(
            optional_text(&app, "SELECT updated_at FROM transactions WHERE id = 't2'"),
            Some("kept-t2".to_string())
        );
    }

    #[test]
    fn bulk_update_recurring_transactions_updates_nullable_payment_method() {
        let app = mock_app();

        let updated = bulk_update_recurring_transactions_handler(
            app.state::<crate::DbState>(),
            vec!["r1".to_string(), "r2".to_string()],
            "payment_method".to_string(),
            None,
        )
        .expect("bulk update recurring");

        assert_eq!(updated, 2);
        assert_eq!(
            scalar_i64(
                &app,
                "SELECT COUNT(*) FROM recurring_transactions WHERE id IN ('r1', 'r2') AND payment_method IS NULL"
            ),
            2
        );
    }

    #[test]
    fn bulk_update_recurring_transactions_rejects_completed_recurring() {
        let app = mock_app();
        let err = bulk_update_recurring_transactions_handler(
            app.state::<crate::DbState>(),
            vec!["r4".to_string()],
            "payment_method".to_string(),
            Some("bank".to_string()),
        )
        .expect_err("completed recurring should fail");

        assert!(err.contains("completed"), "unexpected error: {err}");
    }

    #[test]
    fn bulk_update_recurring_transactions_rejects_status_field() {
        let app = mock_app();

        let err = bulk_update_recurring_transactions_handler(
            app.state::<crate::DbState>(),
            vec!["r1".to_string()],
            "status".to_string(),
            Some("paused".to_string()),
        )
        .expect_err("status bulk update should fail");
        assert!(
            err.contains("Unsupported bulk update field"),
            "unexpected error: {err}"
        );
    }

    #[test]
    fn bulk_update_recurring_transactions_rejects_mixed_category_families() {
        let app = mock_app();
        let err = bulk_update_recurring_transactions_handler(
            app.state::<crate::DbState>(),
            vec!["r1".to_string(), "r3".to_string()],
            "category".to_string(),
            Some("shared".to_string()),
        )
        .expect_err("mixed category families should fail");

        assert!(err.contains("category family"), "unexpected error: {err}");
    }

    #[test]
    fn bulk_update_recurring_transactions_rejects_non_applicable_category_family_with_rollback() {
        let app = mock_app();
        let err = bulk_update_recurring_transactions_handler(
            app.state::<crate::DbState>(),
            vec!["r1".to_string(), "r5".to_string()],
            "category".to_string(),
            Some("shared".to_string()),
        )
        .expect_err("donation is not an applicable recurring category family");

        assert!(err.contains("category family"), "unexpected error: {err}");
        assert_eq!(
            optional_text(
                &app,
                "SELECT category FROM recurring_transactions WHERE id = 'r1'"
            ),
            Some("salary".to_string())
        );
        assert_eq!(
            optional_text(
                &app,
                "SELECT category FROM recurring_transactions WHERE id = 'r5'"
            ),
            Some("charity".to_string())
        );
    }

    #[test]
    fn update_recurring_transaction_handler_rejects_unknown_json_keys() {
        let app = mock_app();
        let err = update_recurring_transaction_handler(
            app.state::<crate::DbState>(),
            "r1".to_string(),
            json!({ "status = 'cancelled' WHERE id = 'r2'; --": "active" }),
        )
        .expect_err("unknown key should fail");

        assert!(
            err.contains("Unsupported update field"),
            "unexpected error: {err}"
        );
        assert_eq!(
            optional_text(
                &app,
                "SELECT status FROM recurring_transactions WHERE id = 'r2'"
            ),
            Some("paused".to_string())
        );
    }
}
