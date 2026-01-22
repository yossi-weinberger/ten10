// src-tauri/src/commands/transaction_commands.rs

use crate::DbState;
use crate::models::{RecurringInfo, Transaction, TransactionForTable};
use rusqlite::{params, Result, ToSql};
use serde::{Deserialize, Serialize};
use tauri::State; // Assuming DbState is in lib.rs or main.rs and accessible

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
    pub transaction_type: Option<String>,
    pub category: Option<String>,
    pub is_chomesh: Option<bool>,
    pub recipient: Option<String>,
    pub original_amount: Option<f64>,
    pub original_currency: Option<String>,
    pub conversion_rate: Option<f64>,
    pub conversion_date: Option<String>,
    pub rate_source: Option<String>,
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
    if let Some(type_str) = &payload.transaction_type {
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

    if payload.recipient.is_some() {
        set_clauses.push("recipient = ?".to_string());
        params_dynamic.push(Box::new(payload.recipient.clone()));
    }
    if let Some(original_amount) = payload.original_amount {
        set_clauses.push("original_amount = ?".to_string());
        params_dynamic.push(Box::new(original_amount));
    }
    if let Some(original_currency) = &payload.original_currency {
        set_clauses.push("original_currency = ?".to_string());
        params_dynamic.push(Box::new(original_currency.clone()));
    }
    if let Some(conversion_rate) = payload.conversion_rate {
        set_clauses.push("conversion_rate = ?".to_string());
        params_dynamic.push(Box::new(conversion_rate));
    }
    if let Some(conversion_date) = &payload.conversion_date {
        set_clauses.push("conversion_date = ?".to_string());
        params_dynamic.push(Box::new(conversion_date.clone()));
    }
    if let Some(rate_source) = &payload.rate_source {
        set_clauses.push("rate_source = ?".to_string());
        params_dynamic.push(Box::new(rate_source.clone()));
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
#[serde(rename_all = "camelCase")]
pub struct ExportFiltersPayload {
    search: Option<String>,
    date_from: Option<String>,
    date_to: Option<String>,
    types: Option<Vec<String>>,
    show_only: Option<String>,
    recurring_statuses: Option<Vec<String>>,
    recurring_frequencies: Option<Vec<String>>,
}

#[tauri::command]
pub fn export_transactions_handler(
    db_state: State<'_, DbState>,
    filters: ExportFiltersPayload,
) -> std::result::Result<Vec<TransactionForTable>, String> {
    println!("[Rust DEBUG] export_transactions_handler called with filters: {:?}", filters);

    let conn_guard = db_state
        .0
        .lock()
        .map_err(|e| format!("[Rust ERROR] DB lock error: {}", e))?;
    let conn = &*conn_guard;

    let base_query = "
        SELECT 
            t.id, t.user_id, t.date, t.amount, t.currency, t.description, 
            t.type, t.category, t.is_chomesh, 
            t.recipient, t.created_at, t.updated_at, t.source_recurring_id,
            t.occurrence_number,
            t.original_amount, t.original_currency, t.conversion_rate, t.conversion_date, t.rate_source,
            rt.status as recurring_status,
            rt.frequency as recurring_frequency,
            rt.execution_count as recurring_execution_count,
            rt.total_occurrences as recurring_total_occurrences,
            rt.day_of_month as recurring_day_of_month_def,
            rt.start_date as recurring_start_date,
            rt.next_due_date as recurring_next_due_date
        FROM transactions t
        LEFT JOIN recurring_transactions rt ON t.source_recurring_id = rt.id
    ";

    let mut where_clauses: Vec<String> = Vec::new();
    let mut sql_params_dynamic: Vec<Box<dyn ToSql>> = Vec::new();
    let mut current_param_idx = 1;

    if let Some(search_term) = &filters.search {
        if !search_term.is_empty() {
            where_clauses.push(format!("(LOWER(t.description) LIKE LOWER(?{0}) OR LOWER(t.category) LIKE LOWER(?{0}) OR LOWER(t.recipient) LIKE LOWER(?{0}))", current_param_idx));
            sql_params_dynamic.push(Box::new(format!("%{}%", search_term)));
            current_param_idx += 1;
        }
    }

    if let Some(date_from) = &filters.date_from {
        if !date_from.is_empty() {
            where_clauses.push(format!("t.date >= ?{}", current_param_idx));
            sql_params_dynamic.push(Box::new(date_from.clone()));
            current_param_idx += 1;
        }
    }
    if let Some(date_to) = &filters.date_to {
        if !date_to.is_empty() {
            where_clauses.push(format!("t.date <= ?{}", current_param_idx));
            sql_params_dynamic.push(Box::new(date_to.clone()));
            current_param_idx += 1;
        }
    }

    if let Some(types) = &filters.types {
        if !types.is_empty() {
            let placeholders: Vec<String> = (0..types.len())
                .map(|i| format!("?{}", current_param_idx + i))
                .collect();
            where_clauses.push(format!("t.type IN ({})", placeholders.join(", ")));
            for t_type in types {
                sql_params_dynamic.push(Box::new(t_type.clone()));
            }
            current_param_idx += types.len();
        }
    }

    // --- Apply Recurring Transaction Filters for Export ---
    if let Some(show_only) = &filters.show_only {
        match show_only.as_str() {
            "recurring" => {
                where_clauses.push("t.source_recurring_id IS NOT NULL".to_string());
            }
            "regular" => {
                where_clauses.push("t.source_recurring_id IS NULL".to_string());
            }
            _ => {} // "all" or any other value means no filter on this
        }
    }

    if let Some(statuses) = &filters.recurring_statuses {
        if !statuses.is_empty() {
            let placeholders: Vec<String> = (0..statuses.len())
                .map(|i| format!("?{}", current_param_idx + i))
                .collect();
            where_clauses.push(format!("rt.status IN ({})", placeholders.join(", ")));
            for status in statuses {
                sql_params_dynamic.push(Box::new(status.clone()));
            }
            current_param_idx += statuses.len();
        }
    }

    if let Some(frequencies) = &filters.recurring_frequencies {
        if !frequencies.is_empty() {
            let placeholders: Vec<String> = (0..frequencies.len())
                .map(|i| format!("?{}", current_param_idx + i))
                .collect();
            where_clauses.push(format!("rt.frequency IN ({})", placeholders.join(", ")));
            for freq in frequencies {
                sql_params_dynamic.push(Box::new(freq.clone()));
            }
        }
    }

    let mut final_query = base_query.to_string();
    if !where_clauses.is_empty() {
        final_query.push_str(" WHERE ");
        final_query.push_str(&where_clauses.join(" AND "));
    }

    final_query.push_str(" ORDER BY t.date DESC, t.created_at DESC");

    println!("[Rust DEBUG] Export query: {}", final_query);

    let params_for_rusqlite: Vec<&dyn ToSql> = sql_params_dynamic.iter().map(|p| p.as_ref()).collect();

    let mut stmt = conn
        .prepare(&final_query)
        .map_err(|e| format!("[Rust ERROR] Failed to prepare statement: {}", e))?;
    
    let transactions_iter = stmt
        .query_map(params_for_rusqlite.as_slice(), |row| {
            let transaction = crate::models::Transaction::from_row(row)?;
            let recurring_info = match row.get::<_, Option<String>>("recurring_status")? {
                Some(status) => Some(RecurringInfo {
                    status,
                    frequency: row.get("recurring_frequency")?,
                    execution_count: row.get("recurring_execution_count")?,
                    total_occurrences: row.get("recurring_total_occurrences").ok(),
                    day_of_month: row.get("recurring_day_of_month_def")?,
                    start_date: row.get("recurring_start_date")?,
                    next_due_date: row.get("recurring_next_due_date")?,
                }),
                None => None,
            };
            Ok(TransactionForTable {
                transaction,
                recurring_info,
            })
        })
        .map_err(|e| format!("[Rust ERROR] Failed to query transactions for export: {}", e))?;

    let mut transactions_vec = Vec::new();
    for transaction_result in transactions_iter {
        transactions_vec.push(
            transaction_result
                .map_err(|e| format!("[Rust ERROR] Failed to map transaction row for export: {}", e))?,
        );
    }

    println!("[Rust DEBUG] Export successful. Found {} transactions.", transactions_vec.len());
    Ok(transactions_vec)
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TableFiltersPayload {
    search: Option<String>,
    date_from: Option<String>,
    date_to: Option<String>,
    types: Option<Vec<String>>,
    // Filters for recurring transactions
    show_only: Option<String>,
    recurring_statuses: Option<Vec<String>>,
    recurring_frequencies: Option<Vec<String>>,
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
#[serde(rename_all = "camelCase")]
pub struct PaginatedTransactionsResponse {
    transactions: Vec<TransactionForTable>,
    total_count: i64,
}

#[tauri::command]
pub fn get_filtered_transactions_handler(
    db_state: State<'_, DbState>,
    args: GetFilteredTransactionsArgs,
) -> std::result::Result<PaginatedTransactionsResponse, String> {
    let filters = args.filters;
    let pagination = args.pagination;
    let sorting = args.sorting;

    println!("[Rust DEBUG] get_filtered_transactions_handler called with filters: {:?}, pagination: {:?}, sorting: {:?}", filters, pagination, sorting);

    let conn_guard = db_state
        .0
        .lock()
        .map_err(|e| format!("[Rust ERROR] DB lock error: {}", e))?;
    let conn = &*conn_guard;

    let base_select = "
        SELECT 
            t.id, t.user_id, t.date, t.amount, t.currency, t.description, 
            t.type, t.category, t.is_chomesh, 
            t.recipient, t.created_at, t.updated_at, t.source_recurring_id,
            t.occurrence_number,
            t.original_amount, t.original_currency, t.conversion_rate, t.conversion_date, t.rate_source,
            rt.status as recurring_status,
            rt.frequency as recurring_frequency,
            rt.execution_count as recurring_execution_count,
            rt.total_occurrences as recurring_total_occurrences,
            rt.day_of_month as recurring_day_of_month_def,
            rt.start_date as recurring_start_date,
            rt.next_due_date as recurring_next_due_date
    ";
    let base_from = "
        FROM transactions t
        LEFT JOIN recurring_transactions rt ON t.source_recurring_id = rt.id
    ";

    let mut where_clauses: Vec<String> = Vec::new();
    let mut sql_params_dynamic: Vec<Box<dyn ToSql>> = Vec::new();
    let mut current_param_idx = 1;

    if let Some(search_term) = &filters.search {
        if !search_term.is_empty() {
            where_clauses.push(format!("(LOWER(t.description) LIKE LOWER(?{0}) OR LOWER(t.category) LIKE LOWER(?{0}) OR LOWER(t.recipient) LIKE LOWER(?{0}))", current_param_idx));
            sql_params_dynamic.push(Box::new(format!("%{}%", search_term)));
            current_param_idx += 1;
        }
    }

    if let Some(date_from) = &filters.date_from {
        if !date_from.is_empty() {
            where_clauses.push(format!("t.date >= ?{}", current_param_idx));
            sql_params_dynamic.push(Box::new(date_from.clone()));
            current_param_idx += 1;
        }
    }
    if let Some(date_to) = &filters.date_to {
        if !date_to.is_empty() {
            where_clauses.push(format!("t.date <= ?{}", current_param_idx));
            sql_params_dynamic.push(Box::new(date_to.clone()));
            current_param_idx += 1;
        }
    }

    if let Some(types) = &filters.types {
        if !types.is_empty() {
            let placeholders: Vec<String> = (0..types.len())
                .map(|i| format!("?{}", current_param_idx + i))
                .collect();
            where_clauses.push(format!("t.type IN ({})", placeholders.join(", ")));
            for t_type in types {
                sql_params_dynamic.push(Box::new(t_type.clone()));
            }
            current_param_idx += types.len();
        }
    }

    // --- New Recurring Transaction Filters ---
    if let Some(show_only) = &filters.show_only {
        match show_only.as_str() {
            "recurring" => {
                where_clauses.push("t.source_recurring_id IS NOT NULL".to_string());
            }
            "regular" => {
                where_clauses.push("t.source_recurring_id IS NULL".to_string());
            }
            _ => {} // "all" or any other value means no filter
        }
    }
    
    if let Some(statuses) = &filters.recurring_statuses {
        if !statuses.is_empty() {
            let placeholders: Vec<String> = (0..statuses.len())
                .map(|i| format!("?{}", current_param_idx + i))
                .collect();
            where_clauses.push(format!("rt.status IN ({})", placeholders.join(", ")));
            for status in statuses {
                sql_params_dynamic.push(Box::new(status.clone()));
            }
            current_param_idx += statuses.len();
        }
    }

    if let Some(frequencies) = &filters.recurring_frequencies {
        if !frequencies.is_empty() {
            let placeholders: Vec<String> = (0..frequencies.len())
                .map(|i| format!("?{}", current_param_idx + i))
                .collect();
            where_clauses.push(format!("rt.frequency IN ({})", placeholders.join(", ")));
            for frequency in frequencies {
                sql_params_dynamic.push(Box::new(frequency.clone()));
            }
            current_param_idx += frequencies.len();
        }
    }

    let where_clause_str = if !where_clauses.is_empty() {
        format!(" WHERE {}", where_clauses.join(" AND "))
    } else {
        "".to_string()
    };

    let query_string_for_count = format!(
        "SELECT COUNT(t.id) {} {}",
        base_from, where_clause_str
    );

    println!("[Rust DEBUG] Count Query: {}", query_string_for_count);
    let params_for_rusqlite: Vec<&dyn ToSql> = sql_params_dynamic.iter().map(|p| p.as_ref()).collect();

    let total_count: i64 = conn
        .query_row(
            &query_string_for_count,
            params_for_rusqlite.as_slice(),
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    println!("[Rust DEBUG] Total count: {}", total_count);

    sql_params_dynamic.push(Box::new(pagination.limit));
    sql_params_dynamic.push(Box::new((pagination.page - 1) * pagination.limit));

    // Map frontend field names to proper table-qualified column names
    let sort_field = match sorting.field.as_str() {
        "date" => "t.date",
        "amount" => "t.amount",
        "description" => "t.description",
        "currency" => "t.currency",
        "type" => "t.type",
        "category" => "t.category",
        "recipient" => "t.recipient",
        "is_chomesh" => "t.is_chomesh",
        "created_at" => "t.created_at",
        "updated_at" => "t.updated_at",
        _ => "t.created_at", // Default fallback
    };

    let query_string_for_data = format!(
        "{} {} {} ORDER BY {} {} LIMIT ?{} OFFSET ?{}",
        base_select,
        base_from,
        where_clause_str,
        sort_field,
        sorting.direction,
        current_param_idx,
        current_param_idx + 1
    );

    println!("[Rust DEBUG] Data Query: {}", query_string_for_data);
    let params_for_rusqlite: Vec<&dyn ToSql> = sql_params_dynamic.iter().map(|p| p.as_ref()).collect();

    let mut stmt = conn.prepare(&query_string_for_data).map_err(|e| e.to_string())?;
    let transactions_iter = stmt
        .query_map(params_for_rusqlite.as_slice(), |row| {
            let recurring_status: Option<String> = row.get("recurring_status")?;
            
            let recurring_info = if recurring_status.is_some() {
                Some(RecurringInfo {
                    status: recurring_status.unwrap(),
                    frequency: row.get("recurring_frequency")?,
                    execution_count: row.get("recurring_execution_count")?,
                    total_occurrences: row.get("recurring_total_occurrences")?,
                    day_of_month: row.get("recurring_day_of_month_def")?,
                    start_date: row.get("recurring_start_date")?,
                    next_due_date: row.get("recurring_next_due_date")?,
                })
            } else {
                None
            };

            Ok(TransactionForTable {
                transaction: Transaction::from_row(row)?,
                recurring_info,
            })
        })
    .map_err(|e| e.to_string())?;

    let mut transactions = Vec::new();
    for tr in transactions_iter {
        transactions.push(tr.map_err(|e| e.to_string())?);
    }

    println!("[Rust DEBUG] Number of transactions fetched: {}", transactions.len());
    println!("[Rust DEBUG] Returning PaginatedTransactionsResponse: total_count: {}, transactions_count: {}", total_count, transactions.len());

    Ok(PaginatedTransactionsResponse {
        transactions,
        total_count,
    })
}

#[tauri::command]
pub async fn add_transaction(db: State<'_, DbState>, transaction: Transaction) -> Result<(), String> {
    // DEBUG: Print the received transaction struct
    println!("Received transaction in Rust: {:?}", transaction);

    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO transactions (id, user_id, date, amount, currency, description, type, category, is_chomesh, recipient, created_at, updated_at, source_recurring_id, original_amount, original_currency, conversion_rate, conversion_date, rate_source)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)",
        params![
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
            &transaction.original_amount,
            &transaction.original_currency,
            &transaction.conversion_rate,
            &transaction.conversion_date,
            &transaction.rate_source,
        ],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_last_known_rate(
    db_state: State<'_, DbState>,
    from_currency: String,
    to_currency: String,
) -> std::result::Result<Option<f64>, String> {
    let conn_guard = db_state.0.lock().map_err(|e| e.to_string())?;
    let conn = &*conn_guard;

    // We want the latest transaction that has a conversion rate for this pair.
    // The `transactions` table has `original_currency` and `currency` (which is the target, usually default).
    // So we look for `original_currency = from` and `currency = to`.
    // And `conversion_rate` IS NOT NULL.
    
    let query = "
        SELECT conversion_rate 
        FROM transactions 
        WHERE original_currency = ?1 AND currency = ?2 AND conversion_rate IS NOT NULL
        ORDER BY date DESC, created_at DESC 
        LIMIT 1
    ";

    let mut stmt = conn.prepare(query).map_err(|e| e.to_string())?;
    let mut rows = stmt.query(params![from_currency, to_currency]).map_err(|e| e.to_string())?;

    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let rate: f64 = row.get(0).map_err(|e| e.to_string())?;
        Ok(Some(rate))
    } else {
        Ok(None)
    }
}
