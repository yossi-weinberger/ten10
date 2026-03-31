use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::DbState;
use crate::transaction_types::{
    donation_types_condition, expense_types_condition, income_types_condition,
};

// ─── Return types ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CategoryBreakdownItem {
    pub category: String,
    pub total_amount: f64,
}


#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PaymentMethodBreakdownItem {
    pub payment_method: String,
    pub total_amount: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecurringVsOnetimeItem {
    pub is_recurring: bool,
    pub total_amount: f64,
    pub tx_count: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DonationRecipientItem {
    pub recipient: String,
    pub total_amount: f64,
    pub last_description: Option<String>,
}

// ─── 1. Category Breakdown ────────────────────────────────────────────────────

#[tauri::command]
pub fn get_desktop_category_breakdown(
    db_state: State<'_, DbState>,
    start_date: String,
    end_date: String,
    transaction_type: String,
) -> Result<Vec<CategoryBreakdownItem>, String> {
    let type_condition = match transaction_type.as_str() {
        "expense"  => expense_types_condition(),
        "income"   => income_types_condition(),
        "donation" => donation_types_condition(),
        other      => return Err(format!("Invalid transaction_type: {}", other)),
    };

    let sql = format!(
        "SELECT COALESCE(category, 'other') AS category, SUM(amount) AS total_amount
         FROM transactions
         WHERE {} AND date >= ?1 AND date <= ?2
         GROUP BY COALESCE(category, 'other')
         ORDER BY total_amount DESC
         LIMIT 10",
        type_condition
    );

    let conn_guard = db_state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn_guard.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![start_date, end_date], |row| {
            Ok(CategoryBreakdownItem {
                category: row.get(0)?,
                total_amount: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

// ─── 3. Payment Method Breakdown ──────────────────────────────────────────────

#[tauri::command]
pub fn get_desktop_payment_method_breakdown(
    db_state: State<'_, DbState>,
    start_date: String,
    end_date: String,
) -> Result<Vec<PaymentMethodBreakdownItem>, String> {
    let expense_cond = expense_types_condition();
    let sql = format!(
        "SELECT COALESCE(payment_method, 'other') AS payment_method, SUM(amount) AS total_amount
         FROM transactions
         WHERE {} AND date >= ?1 AND date <= ?2
         GROUP BY COALESCE(payment_method, 'other')
         ORDER BY total_amount DESC
         LIMIT 20",
        expense_cond
    );

    let conn_guard = db_state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn_guard.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![start_date, end_date], |row| {
            Ok(PaymentMethodBreakdownItem {
                payment_method: row.get(0)?,
                total_amount: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

// ─── 4. Recurring vs One-Time ─────────────────────────────────────────────────

#[tauri::command]
pub fn get_desktop_recurring_vs_onetime(
    db_state: State<'_, DbState>,
    start_date: String,
    end_date: String,
) -> Result<Vec<RecurringVsOnetimeItem>, String> {
    let sql =
        "SELECT (source_recurring_id IS NOT NULL) AS is_recurring,
                SUM(amount) AS total_amount,
                COUNT(*) AS tx_count
         FROM transactions
         WHERE type != 'initial_balance' AND date >= ?1 AND date <= ?2
         GROUP BY (source_recurring_id IS NOT NULL)";

    let conn_guard = db_state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn_guard.prepare(sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![start_date, end_date], |row| {
            let is_rec: i32 = row.get(0)?;
            Ok(RecurringVsOnetimeItem {
                is_recurring: is_rec != 0,
                total_amount: row.get(1)?,
                tx_count: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

// ─── 6. Daily Transaction Heatmap ────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DailyHeatmapItem {
    pub tx_date: String,
    pub tx_count: i32,
    pub total_amount: f64,
}

#[tauri::command]
pub fn get_desktop_daily_heatmap(
    db_state: State<'_, DbState>,
    start_date: String,
    end_date: String,
    type_group: Option<String>,
) -> Result<Vec<DailyHeatmapItem>, String> {
    let group = type_group.as_deref().unwrap_or("all");
    let type_filter = match group {
        "income"   => format!(" AND {}", income_types_condition()),
        "expense"  => format!(" AND {}", expense_types_condition()),
        "donation" => format!(" AND {}", donation_types_condition()),
        _          => String::new(), // "all" — no extra filter
    };
    let sql = format!(
        "SELECT date AS tx_date, COUNT(*) AS tx_count, SUM(amount) AS total_amount
         FROM transactions
         WHERE type != 'initial_balance' AND date >= ?1 AND date <= ?2{}
         GROUP BY date
         ORDER BY date",
        type_filter
    );

    let conn_guard = db_state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn_guard.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(rusqlite::params![start_date, end_date], |row| {
            Ok(DailyHeatmapItem {
                tx_date: row.get(0)?,
                tx_count: row.get::<usize, i64>(1)? as i32,
                total_amount: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

// ─── 7. Combined breakdowns bundle ────────────────────────────────────────────
// Bundles 3 queries into one IPC call (payment methods, recurring-vs-onetime,
// recipients). Reduces round-trips; each query still scans the table separately.

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AnalyticsBreakdownsBundle {
    pub payment_methods: Vec<PaymentMethodBreakdownItem>,
    pub recurring_vs_onetime: Vec<RecurringVsOnetimeItem>,
    pub recipients: Vec<DonationRecipientItem>,
}

#[tauri::command]
pub fn get_desktop_analytics_breakdowns(
    db_state: State<'_, DbState>,
    start_date: String,
    end_date: String,
) -> Result<AnalyticsBreakdownsBundle, String> {
    let conn_guard = db_state.0.lock().map_err(|e| e.to_string())?;
    let expense_cond = expense_types_condition();

    // Payment methods (expenses only)
    let pm_sql = format!(
        "SELECT COALESCE(payment_method, 'other') AS payment_method, SUM(amount) AS total_amount
         FROM transactions
         WHERE {} AND date >= ?1 AND date <= ?2
         GROUP BY COALESCE(payment_method, 'other')
         ORDER BY total_amount DESC
         LIMIT 20",
        expense_cond
    );
    let mut pm_stmt = conn_guard.prepare(&pm_sql).map_err(|e| e.to_string())?;
    let payment_methods: Vec<PaymentMethodBreakdownItem> = pm_stmt
        .query_map(params![start_date, end_date], |row| {
            Ok(PaymentMethodBreakdownItem {
                payment_method: row.get(0)?,
                total_amount: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<_, _>>()
        .map_err(|e| e.to_string())?;

    // Recurring vs one-time
    let rvo_sql =
        "SELECT (source_recurring_id IS NOT NULL) AS is_recurring,
                SUM(amount) AS total_amount,
                COUNT(*) AS tx_count
         FROM transactions
         WHERE type != 'initial_balance' AND date >= ?1 AND date <= ?2
         GROUP BY (source_recurring_id IS NOT NULL)";
    let mut rvo_stmt = conn_guard.prepare(rvo_sql).map_err(|e| e.to_string())?;
    let recurring_vs_onetime: Vec<RecurringVsOnetimeItem> = rvo_stmt
        .query_map(params![start_date, end_date], |row| {
            let is_rec: i32 = row.get(0)?;
            Ok(RecurringVsOnetimeItem {
                is_recurring: is_rec != 0,
                total_amount: row.get(1)?,
                tx_count: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<_, _>>()
        .map_err(|e| e.to_string())?;

    // Donation recipients
    let rec_sql = format!(
        "SELECT display_key AS recipient, total_amount, display_key AS last_description
         FROM (
           SELECT
             COALESCE(NULLIF(TRIM(COALESCE(description,'')), ''),
                      NULLIF(TRIM(COALESCE(recipient,'')), ''),
                      'other') AS display_key,
             SUM(amount) AS total_amount
           FROM transactions
           WHERE {}
             AND date >= ?1 AND date <= ?2
           GROUP BY COALESCE(NULLIF(TRIM(COALESCE(description,'')), ''),
                              NULLIF(TRIM(COALESCE(recipient,'')), ''),
                              'other')
           ORDER BY total_amount DESC
           LIMIT 50
         )
         ORDER BY total_amount DESC",
        donation_types_condition(),
    );
    let mut rec_stmt = conn_guard.prepare(&rec_sql).map_err(|e| e.to_string())?;
    let recipients: Vec<DonationRecipientItem> = rec_stmt
        .query_map(params![start_date, end_date], |row| {
            Ok(DonationRecipientItem {
                recipient: row.get(0)?,
                total_amount: row.get(1)?,
                last_description: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<_, _>>()
        .map_err(|e| e.to_string())?;

    Ok(AnalyticsBreakdownsBundle { payment_methods, recurring_vs_onetime, recipients })
}

// ─── 8. Combined range stats ───────────────────────────────────────────────────
// Single SQL scan replacing 3 separate IPC calls for income/expenses/donations.

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AnalyticsRangeStats {
    pub total_income: f64,
    pub chomesh_amount: f64,
    pub total_expenses: f64,
    pub total_donations: f64,
    pub non_tithe_donation_amount: f64,
}

#[tauri::command]
pub fn get_desktop_analytics_range_stats(
    db_state: State<'_, DbState>,
    start_date: String,
    end_date: String,
) -> Result<AnalyticsRangeStats, String> {
    let sql = format!(
        "SELECT
           COALESCE(SUM(CASE WHEN ({income}) THEN amount ELSE 0 END), 0) AS total_income,
           COALESCE(SUM(CASE WHEN is_chomesh THEN amount ELSE 0 END),  0) AS chomesh_amount,
           COALESCE(SUM(CASE WHEN ({expense}) THEN amount ELSE 0 END), 0) AS total_expenses,
           COALESCE(SUM(CASE WHEN ({donation}) THEN amount ELSE 0 END), 0) AS total_donations,
           COALESCE(SUM(CASE WHEN type = 'non_tithe_donation' THEN amount ELSE 0 END), 0) AS non_tithe_donation_amount
         FROM transactions
         WHERE date >= ?1 AND date <= ?2",
        income = income_types_condition().trim_matches(|c| c == '(' || c == ')'),
        expense = expense_types_condition().trim_matches(|c| c == '(' || c == ')'),
        donation = donation_types_condition().trim_matches(|c| c == '(' || c == ')')
    );

    let conn_guard = db_state.0.lock().map_err(|e| e.to_string())?;
    conn_guard
        .query_row(&sql, params![start_date, end_date], |row| {
            Ok(AnalyticsRangeStats {
                total_income:              row.get(0)?,
                chomesh_amount:            row.get(1)?,
                total_expenses:            row.get(2)?,
                total_donations:           row.get(3)?,
                non_tithe_donation_amount: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())
}

// ─── 5. Donation Recipients Breakdown ─────────────────────────────────────────

#[tauri::command]
pub fn get_desktop_donation_recipients_breakdown(
    db_state: State<'_, DbState>,
    start_date: String,
    end_date: String,
) -> Result<Vec<DonationRecipientItem>, String> {
    // Group by COALESCE(description, recipient, 'other') — uses description first.
    // Order by SUM(amount) DESC (largest first), LIMIT 50.
    let sql = format!(
        "SELECT
           display_key AS recipient,
           total_amount,
           display_key AS last_description
         FROM (
           SELECT
             COALESCE(NULLIF(TRIM(COALESCE(description,'')), ''),
                      NULLIF(TRIM(COALESCE(recipient,'')), ''),
                      'other') AS display_key,
             SUM(amount) AS total_amount
           FROM transactions
           WHERE {}
             AND date >= ?1 AND date <= ?2
           GROUP BY COALESCE(NULLIF(TRIM(COALESCE(description,'')), ''),
                              NULLIF(TRIM(COALESCE(recipient,'')), ''),
                              'other')
           ORDER BY total_amount DESC
           LIMIT 50
         )
         ORDER BY total_amount DESC",
        donation_types_condition(),
    );

    let conn_guard = db_state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn_guard.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![start_date, end_date], |row| {
            Ok(DonationRecipientItem {
                recipient: row.get(0)?,
                total_amount: row.get(1)?,
                last_description: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}
