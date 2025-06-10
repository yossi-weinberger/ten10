use chrono::{Datelike, Months, NaiveDate};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tauri::State;
// use log::{info, error, warn}; // No longer using log crate macros

use crate::DbState; // Assuming DbState is defined in main.rs or lib.rs

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DesktopMonthlyDataPoint {
    month_label: String, // YYYY-MM
    income: f64,
    donations: f64,
    expenses: f64,
}

#[tauri::command]
pub fn get_desktop_monthly_financial_summary(
    db_state: State<'_, DbState>,
    end_date_str: String, // Expected ISO format 'YYYY-MM-DD'
    num_months: i32,
) -> Result<Vec<DesktopMonthlyDataPoint>, String> {
    println!(
        "[Rust Chart] get_desktop_monthly_financial_summary called with endDateStr: {}, num_months: {}",
        end_date_str,
        num_months
    );

    let conn_guard = db_state.0.lock().map_err(|e| {
        eprintln!("[Rust Chart] Error locking DB: {}", e.to_string());
        e.to_string()
    })?;
    let conn: &Connection = &*conn_guard;

    let end_date_actual = NaiveDate::parse_from_str(&end_date_str, "%Y-%m-%d").map_err(|e| {
        eprintln!(
            "[Rust Chart] Error parsing end_date_str '{}': {}",
            end_date_str, e
        );
        format!("Error parsing end_date '{}': {}", end_date_str, e)
    })?;
    println!("[Rust Chart] Parsed end_date_actual: {}", end_date_actual);

    let end_month_start_date = end_date_actual.with_day(1).unwrap();
    let start_date_actual = end_month_start_date
        .checked_sub_months(Months::new((num_months - 1) as u32))
        .unwrap();

    println!(
        "[Rust Chart] Calculated start_date_actual (first day of period): {}",
        start_date_actual
    );
    println!(
        "[Rust Chart] Calculated end_month_start_date (first day of last month in period): {}",
        end_month_start_date
    );

    let mut results: Vec<DesktopMonthlyDataPoint> = Vec::new();
    let mut current_month_iter = start_date_actual;

    while current_month_iter <= end_month_start_date {
        let month_start_str = current_month_iter.format("%Y-%m-01").to_string();
        let next_month_start = current_month_iter
            .checked_add_months(Months::new(1))
            .unwrap();
        let month_end_str = next_month_start
            .checked_sub_days(chrono::Days::new(1))
            .unwrap()
            .format("%Y-%m-%d")
            .to_string();
        let month_label_str = current_month_iter.format("%Y-%m").to_string();

        println!(
            "[Rust Chart] Querying for month: {}, range: {} to {}",
            month_label_str, month_start_str, month_end_str
        );

        let mut stmt = conn
            .prepare(
                "SELECT 
                    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income, 
                    COALESCE(SUM(CASE WHEN type = 'donation' THEN amount ELSE 0 END), 0) as donations, 
                    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expenses 
                 FROM transactions 
                 WHERE date >= ?1 AND date <= ?2",
            )
            .map_err(|e| {
                eprintln!("[Rust Chart] Error preparing SQL statement for month {}: {}", month_label_str, e);
                e.to_string()
            })?;

        let mut rows = stmt
            .query(params![month_start_str, month_end_str])
            .map_err(|e| {
                eprintln!(
                    "[Rust Chart] Error executing SQL query for month {}: {}",
                    month_label_str, e
                );
                e.to_string()
            })?;

        if let Some(row) = rows.next().map_err(|e| {
            eprintln!(
                "[Rust Chart] Error fetching row for month {}: {}",
                month_label_str, e
            );
            e.to_string()
        })? {
            let income: f64 = row.get(0).unwrap_or(0.0);
            let donations: f64 = row.get(1).unwrap_or(0.0);
            let expenses: f64 = row.get(2).unwrap_or(0.0);
            println!(
                "[Rust Chart] Month {}: Income={}, Donations={}, Expenses={}",
                month_label_str, income, donations, expenses
            );
            results.push(DesktopMonthlyDataPoint {
                month_label: month_label_str.clone(),
                income,
                donations,
                expenses,
            });
        } else {
            eprintln!(
                "[Rust Chart] No row returned from query for month {}, adding zeroed entry.",
                month_label_str
            );
            results.push(DesktopMonthlyDataPoint {
                month_label: month_label_str.clone(),
                income: 0.0,
                donations: 0.0,
                expenses: 0.0,
            });
        }

        current_month_iter = next_month_start;
    }

    println!(
        "[Rust Chart] Final results ({} items): {:?}",
        results.len(),
        results
    );
    Ok(results)
}
