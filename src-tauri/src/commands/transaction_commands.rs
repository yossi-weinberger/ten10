// src-tauri/src/commands/transaction_commands.rs

use crate::DbState;
use rusqlite::{params, OptionalExtension, Result, ToSql};
use serde::{Deserialize, Serialize};
use tauri::State; // Assuming DbState is in lib.rs or main.rs and accessible

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Transaction {
    pub id: String,
    pub user_id: Option<String>,
    pub date: String, // ISO 8601 format (e.g., "YYYY-MM-DDTHH:MM:SS.sssZ")
    pub amount: f64,
    pub currency: String,
    pub description: Option<String>,
    #[serde(rename = "type")] // To match the 'type' field from DB/JS
    pub type_str: String, // Renamed from 'type' to avoid Rust keyword clash
    pub category: Option<String>,
    pub is_chomesh: Option<bool>,
    pub is_recurring: Option<bool>,
    pub recurring_day_of_month: Option<i32>,
    pub recipient: Option<String>,
    pub created_at: Option<String>, // ISO 8601 format
    pub updated_at: Option<String>, // ISO 8601 format
}

// Helper to map rusqlite row to Transaction
impl Transaction {
    fn from_row(row: &rusqlite::Row<'_>) -> Result<Self> {
        Ok(Transaction {
            id: row.get("id")?,
            user_id: row
                .get::<_, Option<String>>("user_id")
                .optional()?
                .flatten(),
            date: row.get("date")?,
            amount: row.get("amount")?,
            currency: row.get("currency")?,
            description: row
                .get::<_, Option<String>>("description")
                .optional()?
                .flatten(),
            type_str: row.get("type")?,
            category: row
                .get::<_, Option<String>>("category")
                .optional()?
                .flatten(),
            is_chomesh: row
                .get::<_, Option<i64>>("is_chomesh")
                .optional()?
                .flatten()
                .map(|v| v != 0),
            is_recurring: row
                .get::<_, Option<i64>>("is_recurring")
                .optional()?
                .flatten()
                .map(|v| v != 0),
            recurring_day_of_month: row
                .get::<_, Option<i64>>("recurring_day_of_month")
                .optional()?
                .flatten()
                .map(|v| v as i32),
            recipient: row
                .get::<_, Option<String>>("recipient")
                .optional()?
                .flatten(),
            created_at: row
                .get::<_, Option<String>>("created_at")
                .optional()?
                .flatten(),
            updated_at: row
                .get::<_, Option<String>>("updated_at")
                .optional()?
                .flatten(),
        })
    }
}

#[derive(Deserialize, Debug)]
pub struct TransactionUpdatePayload {
    // Define the fields you expect to receive for an update
    // This should mirror the structure sent from TypeScript,
    // but only include fields that can actually be updated.
    // All fields should be Option<T> because the frontend might only send changed fields.
    pub date: Option<String>,
    pub amount: Option<f64>,
    pub currency: Option<String>,
    pub description: Option<String>,
    #[serde(rename = "type")]
    pub type_str: Option<String>,
    pub category: Option<String>,
    pub is_chomesh: Option<bool>,
    pub is_recurring: Option<bool>,
    pub recurring_day_of_month: Option<i32>,
    pub recipient: Option<String>,
    // user_id is typically not updated by the user directly
    // updated_at should be handled by the database or set here to current time
}

#[tauri::command]
pub fn update_transaction_handler(
    db_state: State<'_, DbState>,
    id: String,
    payload: TransactionUpdatePayload,
) -> std::result::Result<(), String> {
    println!(
        "[Rust DEBUG] update_transaction_handler called for ID: {} with payload: {:?}",
        id, payload
    );
    let conn_guard = db_state
        .0
        .lock()
        .map_err(|e| format!("DB lock error: {}", e))?;
    let conn = &*conn_guard;

    let mut set_clauses: Vec<String> = Vec::new();
    let mut params_dynamic: Vec<Box<dyn ToSql>> = Vec::new();

    if let Some(date) = &payload.date {
        set_clauses.push("date = ?".to_string());
        params_dynamic.push(Box::new(date.clone()));
    }
    if let Some(amount) = payload.amount {
        set_clauses.push("amount = ?".to_string());
        params_dynamic.push(Box::new(amount));
    }
    if let Some(currency) = &payload.currency {
        set_clauses.push("currency = ?".to_string());
        params_dynamic.push(Box::new(currency.clone()));
    }
    // For Option<String> fields like description, category, recipient:
    // We want to set them to NULL if an explicit null is passed,
    // or update them if a string is passed.
    // If the key is not in the payload, we don't touch the field.
    if payload.description.is_some() {
        set_clauses.push("description = ?".to_string());
        params_dynamic.push(Box::new(payload.description.clone()));
    }
    if let Some(type_str) = &payload.type_str {
        set_clauses.push("type = ?".to_string());
        params_dynamic.push(Box::new(type_str.clone()));
    }
    if payload.category.is_some() {
        set_clauses.push("category = ?".to_string());
        params_dynamic.push(Box::new(payload.category.clone()));
    }
    if let Some(is_chomesh) = payload.is_chomesh {
        set_clauses.push("is_chomesh = ?".to_string());
        params_dynamic.push(Box::new(is_chomesh as i32));
    }

    if let Some(is_recurring_val) = payload.is_recurring {
        set_clauses.push("is_recurring = ?".to_string());
        params_dynamic.push(Box::new(is_recurring_val as i32));
        if !is_recurring_val {
            set_clauses.push("recurring_day_of_month = ?".to_string());
            params_dynamic.push(Box::new(Option::<i32>::None)); // Explicitly set to NULL
        } else {
            // If is_recurring is true, only update recurring_day_of_month if it's provided
            if let Some(day) = payload.recurring_day_of_month {
                set_clauses.push("recurring_day_of_month = ?".to_string());
                params_dynamic.push(Box::new(day));
            }
        }
    } else {
        // is_recurring was not in payload, but maybe recurring_day_of_month was?
        // This logic ensures recurring_day_of_month is only set if is_recurring is true (or also being set to true).
        // If is_recurring is not changing, we might still want to change the day.
        // However, to prevent setting a day without is_recurring being true,
        // we should be careful. The current logic: if is_recurring is not provided,
        // we only set recurring_day_of_month if it IS provided.
        // This might need refinement based on exact desired behavior if is_recurring is absent from payload.
        if let Some(day) = payload.recurring_day_of_month {
            // Consider fetching current is_recurring state if we want to be super safe
            set_clauses.push("recurring_day_of_month = ?".to_string());
            params_dynamic.push(Box::new(day));
        }
    }

    if payload.recipient.is_some() {
        set_clauses.push("recipient = ?".to_string());
        params_dynamic.push(Box::new(payload.recipient.clone()));
    }

    set_clauses.push("updated_at = CURRENT_TIMESTAMP".to_string());

    if set_clauses.is_empty() {
        // Or, if only updated_at is present, perhaps return Ok(()) if that's considered a valid no-op update.
        return Err("No updatable fields provided.".to_string());
    }

    params_dynamic.push(Box::new(id.clone()));

    let query = format!(
        "UPDATE transactions SET {} WHERE id = ?{}",
        set_clauses.join(", "),
        params_dynamic.len()
    );

    println!("[Rust DEBUG] Update query: {}", query);
    let params_for_rusqlite: Vec<&dyn ToSql> = params_dynamic.iter().map(|p| p.as_ref()).collect();

    match conn.execute(&query, params_for_rusqlite.as_slice()) {
        Ok(0) => Err(format!("Transaction with ID {} not found.", id)), // Changed message
        Ok(affected_rows) => {
            println!(
                "[Rust DEBUG] Successfully updated {} row(s) for ID: {}",
                affected_rows, id
            );
            Ok(())
        }
        Err(e) => {
            let err_msg = format!(
                "[Rust ERROR] Failed to update transaction: {}. Query: {}",
                e, query
            );
            println!("{}", err_msg);
            Err(err_msg)
        }
    }
}

#[tauri::command]
pub fn delete_transaction_handler(
    db_state: State<'_, DbState>,
    transaction_id: String,
) -> std::result::Result<(), String> {
    let conn_guard = db_state
        .0
        .lock()
        .map_err(|e| format!("DB lock error: {}", e))?;
    let conn = &*conn_guard;

    match conn.execute(
        "DELETE FROM transactions WHERE id = ?1",
        params![transaction_id],
    ) {
        Ok(0) => Err(format!(
            "Transaction with ID {} not found or not deleted.",
            transaction_id
        )), // No rows affected
        Ok(_) => Ok(()), // Successfully deleted
        Err(e) => Err(format!("Failed to delete transaction: {}", e)),
    }
}

#[derive(Deserialize, Debug)]
pub struct ExportFiltersPayload {
    search: Option<String>,
    date_from: Option<String>, // ISO date string "YYYY-MM-DD"
    date_to: Option<String>,   // ISO date string "YYYY-MM-DD"
    types: Option<Vec<String>>,
}

#[tauri::command]
pub fn export_transactions_handler(
    db_state: State<'_, DbState>,
    filters: ExportFiltersPayload,
) -> std::result::Result<Vec<Transaction>, String> {
    let conn_guard = db_state
        .0
        .lock()
        .map_err(|e| format!("DB lock error: {}", e))?;
    let conn = &*conn_guard;

    let mut query = "SELECT id, user_id, date, amount, currency, description, type, category, is_chomesh, is_recurring, recurring_day_of_month, recipient, created_at, updated_at FROM transactions".to_string();
    let mut where_clauses: Vec<String> = Vec::new();
    let mut sql_params: Vec<Box<dyn ToSql>> = Vec::new();
    let mut param_idx = 1;

    if let Some(search_term) = &filters.search {
        if !search_term.is_empty() {
            where_clauses.push(format!("(LOWER(description) LIKE LOWER(?{0}) OR LOWER(category) LIKE LOWER(?{0}) OR LOWER(recipient) LIKE LOWER(?{0}))", param_idx));
            sql_params.push(Box::new(format!("%{}%", search_term)));
            param_idx += 1;
        }
    }

    if let Some(date_from) = &filters.date_from {
        if !date_from.is_empty() {
            where_clauses.push(format!("date >= ?{}", param_idx));
            sql_params.push(Box::new(date_from.clone()));
            param_idx += 1;
        }
    }
    if let Some(date_to) = &filters.date_to {
        if !date_to.is_empty() {
            where_clauses.push(format!("date <= ?{}", param_idx));
            sql_params.push(Box::new(date_to.clone()));
            param_idx += 1;
        }
    }

    if let Some(types) = &filters.types {
        if !types.is_empty() {
            let placeholders: Vec<String> = (0..types.len())
                .map(|i| format!("?{}", param_idx + i))
                .collect();
            where_clauses.push(format!("type IN ({})", placeholders.join(", ")));
            for t_type in types {
                sql_params.push(Box::new(t_type.clone()));
            }
            // param_idx would need to be incremented by types.len() here if more params followed
            // current_param_idx += types.len(); // This line seems to cause the warning, let's comment it out for now if it's the one for export_transactions_handler
        }
    }

    let params_for_rusqlite: Vec<&dyn ToSql> = sql_params.iter().map(|p| p.as_ref()).collect();

    if !where_clauses.is_empty() {
        query.push_str(" WHERE ");
        query.push_str(&where_clauses.join(" AND "));
    }

    query.push_str(" ORDER BY date DESC, created_at DESC");

    let mut stmt = conn
        .prepare(&query)
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;
    let transactions_iter = stmt
        .query_map(params_for_rusqlite.as_slice(), |row| {
            Transaction::from_row(row)
        })
        .map_err(|e| format!("Failed to query transactions for export: {}", e))?;

    let mut transactions_vec = Vec::new();
    for transaction_result in transactions_iter {
        transactions_vec.push(
            transaction_result
                .map_err(|e| format!("Failed to map transaction row for export: {}", e))?,
        );
    }

    Ok(transactions_vec)
}

#[derive(Deserialize, Debug)]
pub struct TableFiltersPayload {
    search: Option<String>,
    date_from: Option<String>, // ISO date string "YYYY-MM-DD"
    date_to: Option<String>,   // ISO date string "YYYY-MM-DD"
    types: Option<Vec<String>>,
}

#[derive(Deserialize, Debug)]
pub struct TablePaginationPayload {
    page: usize,  // Current page number (1-indexed from frontend)
    limit: usize, // Items per page
}

#[derive(Deserialize, Debug)]
pub struct TableSortingPayload {
    field: String,     // Field to sort by (e.g., "date", "amount")
    direction: String, // "asc" or "desc"
}

#[derive(Deserialize, Debug)]
pub struct GetFilteredTransactionsArgs {
    filters: TableFiltersPayload,
    pagination: TablePaginationPayload,
    sorting: TableSortingPayload,
}

#[derive(Serialize, Debug)]
pub struct PaginatedTransactionsResponse {
    transactions: Vec<Transaction>,
    total_count: i64,
}

#[tauri::command]
pub fn get_filtered_transactions_handler(
    db_state: State<'_, DbState>,
    args: GetFilteredTransactionsArgs,
) -> std::result::Result<PaginatedTransactionsResponse, String> {
    println!(
        "[Rust DEBUG] get_filtered_transactions_handler called with args: {:?}",
        args
    );

    let conn_guard = db_state.0.lock().map_err(|e| {
        let err_msg = format!("[Rust ERROR] DB lock error: {}", e);
        println!("{}", err_msg);
        err_msg
    })?;
    let conn = &*conn_guard;

    let base_query_select = "SELECT id, user_id, date, amount, currency, description, type, category, is_chomesh, is_recurring, recurring_day_of_month, recipient, created_at, updated_at FROM transactions".to_string();
    let count_query_select = "SELECT COUNT(*) FROM transactions".to_string();

    let mut where_clauses: Vec<String> = Vec::new();
    let mut sql_params_dynamic: Vec<Box<dyn ToSql>> = Vec::new();
    let mut current_param_idx = 1;
    let mut params_debug_strings: Vec<String> = Vec::new();

    if let Some(search_term) = &args.filters.search {
        if !search_term.is_empty() {
            let actual_search_term = format!("%{}%", search_term);
            println!(
                "[Rust DEBUG] Applying search filter: {}",
                actual_search_term
            );
            where_clauses.push(format!("(LOWER(description) LIKE LOWER(?{0}) OR LOWER(category) LIKE LOWER(?{0}) OR LOWER(recipient) LIKE LOWER(?{0}))", current_param_idx));
            sql_params_dynamic.push(Box::new(actual_search_term.clone()));
            params_debug_strings.push(actual_search_term);
            current_param_idx += 1;
        }
    }

    if let Some(date_from) = &args.filters.date_from {
        if !date_from.is_empty() {
            println!("[Rust DEBUG] Applying date_from filter: {}", date_from);
            where_clauses.push(format!("date >= ?{}", current_param_idx));
            sql_params_dynamic.push(Box::new(date_from.clone()));
            params_debug_strings.push(date_from.clone());
            current_param_idx += 1;
        }
    }
    if let Some(date_to) = &args.filters.date_to {
        if !date_to.is_empty() {
            println!("[Rust DEBUG] Applying date_to filter: {}", date_to);
            where_clauses.push(format!("date <= ?{}", current_param_idx));
            sql_params_dynamic.push(Box::new(date_to.clone()));
            params_debug_strings.push(date_to.clone());
            current_param_idx += 1;
        }
    }

    if let Some(types) = &args.filters.types {
        if !types.is_empty() {
            println!("[Rust DEBUG] Applying types filter: {:?}", types);
            let placeholders: Vec<String> = (0..types.len())
                .map(|i| format!("?{}", current_param_idx + i))
                .collect();
            where_clauses.push(format!("type IN ({})", placeholders.join(", ")));
            for t_type in types {
                sql_params_dynamic.push(Box::new(t_type.clone()));
                params_debug_strings.push(t_type.clone());
            }
            // current_param_idx += types.len(); // This is for get_filtered_transactions_handler, comment out if unused after this block
        }
    }

    let params_for_rusqlite: Vec<&dyn ToSql> =
        sql_params_dynamic.iter().map(|p| p.as_ref()).collect();

    let mut where_suffix = String::new();
    if !where_clauses.is_empty() {
        where_suffix = format!(" WHERE {}", where_clauses.join(" AND "));
    }
    println!("[Rust DEBUG] Constructed WHERE clause: {}", where_suffix);
    println!(
        "[Rust DEBUG] Parameters for WHERE (debug strings): {:?}",
        params_debug_strings
    );

    let final_count_query = format!("{}{}", count_query_select, where_suffix);
    println!("[Rust DEBUG] Final COUNT query: {}", final_count_query);

    let total_count: i64 =
        match conn.query_row(&final_count_query, params_for_rusqlite.as_slice(), |row| {
            row.get(0)
        }) {
            Ok(count) => {
                println!("[Rust DEBUG] Total count from DB: {}", count);
                count
            }
            Err(e) => {
                let err_msg = format!(
                "[Rust ERROR] Failed to count transactions: {}. Query: {}, Params (debug): {:?}",
                e, final_count_query, params_debug_strings
            );
                println!("{}", err_msg);
                return Err(err_msg);
            }
        };

    let sort_field = match args.sorting.field.to_lowercase().as_str() {
        "date" => "date",
        "amount" => "amount",
        "description" => "description",
        "currency" => "currency",
        "type" => "type",
        "category" => "category",
        "recipient" => "recipient",
        _ => "created_at",
    };
    let sort_direction = if args.sorting.direction.to_lowercase() == "asc" {
        "ASC"
    } else {
        "DESC"
    };
    let order_by_clause = format!(" ORDER BY {} {} ", sort_field, sort_direction);
    println!("[Rust DEBUG] ORDER BY clause: {}", order_by_clause);

    let limit_clause = format!(" LIMIT {} ", args.pagination.limit);
    let offset_value = (args.pagination.page.saturating_sub(1)) * args.pagination.limit;
    let offset_clause = format!(" OFFSET {} ", offset_value);

    println!(
        "[Rust DEBUG] LIMIT clause: {}, OFFSET clause: {}",
        limit_clause, offset_clause
    );

    let final_select_query = format!(
        "{}{}{}{}{}",
        base_query_select, where_suffix, order_by_clause, limit_clause, offset_clause
    );
    println!("[Rust DEBUG] Final SELECT query: {}", final_select_query);
    println!(
        "[Rust DEBUG] Parameters for SELECT (debug strings): {:?}",
        params_debug_strings
    );

    let mut stmt = match conn.prepare(&final_select_query) {
        Ok(s) => s,
        Err(e) => {
            let err_msg = format!(
                "[Rust ERROR] Failed to prepare select statement: {}. Query: {}",
                e, final_select_query
            );
            println!("{}", err_msg);
            return Err(err_msg);
        }
    };

    let transactions_iter = match stmt.query_map(params_for_rusqlite.as_slice(), |row| {
        Transaction::from_row(row)
    }) {
        Ok(iter) => iter,
        Err(e) => {
            let err_msg = format!(
                "[Rust ERROR] Failed to query transactions: {}. Query: {}, Params (debug): {:?}",
                e, final_select_query, params_debug_strings
            );
            println!("{}", err_msg);
            return Err(err_msg);
        }
    };

    let mut transactions = Vec::new();
    for transaction_result in transactions_iter {
        match transaction_result {
            Ok(transaction) => transactions.push(transaction),
            Err(e) => {
                let err_msg = format!("[Rust ERROR] Failed to map transaction row: {}", e);
                println!("{}", err_msg);
                return Err(err_msg);
            }
        }
    }
    println!(
        "[Rust DEBUG] Number of transactions fetched: {}",
        transactions.len()
    );
    println!("[Rust DEBUG] Returning PaginatedTransactionsResponse: total_count: {}, transactions_count: {}", total_count, transactions.len());

    Ok(PaginatedTransactionsResponse {
        transactions,
        total_count,
    })
}
