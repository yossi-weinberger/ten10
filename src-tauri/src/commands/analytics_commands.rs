use rusqlite::{params, Connection};
use serde::Serialize;
use tauri::State;

use crate::DbState;
use crate::transaction_types::{expense_types_condition, income_types_condition};

#[derive(Serialize)]
pub struct CategoryBreakdown {
    pub category: String,
    pub total_amount: f64,
}

#[derive(Serialize)]
pub struct PaymentMethodBreakdown {
    pub payment_method: String,
    pub total_amount: f64,
}

#[derive(Serialize)]
pub struct DailyExpense {
    pub expense_date: String,
    pub total_amount: f64,
}

#[tauri::command]
pub async fn get_desktop_expenses_by_category(
    db_state: State<'_, DbState>,
    start_date: String,
    end_date: String,
) -> Result<Vec<CategoryBreakdown>, String> {
    let query_sql = format!(
        "SELECT
            COALESCE(category, 'uncategorized') AS category,
            COALESCE(SUM(amount), 0) AS total_amount
        FROM transactions
        WHERE {} AND date >= ?1 AND date <= ?2
        GROUP BY category
        ORDER BY total_amount DESC",
        expense_types_condition()
    );

    let conn_guard = db_state.0.lock().map_err(|e| e.to_string())?;
    let conn: &Connection = &*conn_guard;

    let mut stmt = conn.prepare(&query_sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![start_date, end_date], |row| {
            Ok(CategoryBreakdown {
                category: row.get(0)?,
                total_amount: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for row in rows {
        results.push(row.map_err(|e| e.to_string())?);
    }
    Ok(results)
}

#[tauri::command]
pub async fn get_desktop_income_by_category(
    db_state: State<'_, DbState>,
    start_date: String,
    end_date: String,
) -> Result<Vec<CategoryBreakdown>, String> {
    let query_sql = format!(
        "SELECT
            COALESCE(category, 'uncategorized') AS category,
            COALESCE(SUM(amount), 0) AS total_amount
        FROM transactions
        WHERE {} AND date >= ?1 AND date <= ?2
        GROUP BY category
        ORDER BY total_amount DESC",
        income_types_condition()
    );

    let conn_guard = db_state.0.lock().map_err(|e| e.to_string())?;
    let conn: &Connection = &*conn_guard;

    let mut stmt = conn.prepare(&query_sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![start_date, end_date], |row| {
            Ok(CategoryBreakdown {
                category: row.get(0)?,
                total_amount: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for row in rows {
        results.push(row.map_err(|e| e.to_string())?);
    }
    Ok(results)
}

#[tauri::command]
pub async fn get_desktop_expenses_by_payment_method(
    db_state: State<'_, DbState>,
    start_date: String,
    end_date: String,
) -> Result<Vec<PaymentMethodBreakdown>, String> {
    let query_sql = format!(
        "SELECT
            COALESCE(payment_method, 'unknown') AS payment_method,
            COALESCE(SUM(amount), 0) AS total_amount
        FROM transactions
        WHERE {} AND date >= ?1 AND date <= ?2
        GROUP BY payment_method
        ORDER BY total_amount DESC",
        expense_types_condition()
    );

    let conn_guard = db_state.0.lock().map_err(|e| e.to_string())?;
    let conn: &Connection = &*conn_guard;

    let mut stmt = conn.prepare(&query_sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![start_date, end_date], |row| {
            Ok(PaymentMethodBreakdown {
                payment_method: row.get(0)?,
                total_amount: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for row in rows {
        results.push(row.map_err(|e| e.to_string())?);
    }
    Ok(results)
}

#[tauri::command]
pub async fn get_desktop_daily_expenses(
    db_state: State<'_, DbState>,
    start_date: String,
    end_date: String,
) -> Result<Vec<DailyExpense>, String> {
    let query_sql = format!(
        "SELECT
            date AS expense_date,
            COALESCE(SUM(amount), 0) AS total_amount
        FROM transactions
        WHERE {} AND date >= ?1 AND date <= ?2
        GROUP BY date
        ORDER BY date",
        expense_types_condition()
    );

    let conn_guard = db_state.0.lock().map_err(|e| e.to_string())?;
    let conn: &Connection = &*conn_guard;

    let mut stmt = conn.prepare(&query_sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![start_date, end_date], |row| {
            Ok(DailyExpense {
                expense_date: row.get(0)?,
                total_amount: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for row in rows {
        results.push(row.map_err(|e| e.to_string())?);
    }
    Ok(results)
}
