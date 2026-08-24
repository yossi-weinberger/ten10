use crate::DbState;
use rusqlite::{Connection, Result};
use tauri::State;

#[tauri::command]
pub async fn init_db(db: State<'_, DbState>) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    // Create transactions table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            date TEXT NOT NULL,
            amount REAL NOT NULL,
            currency TEXT NOT NULL,
            description TEXT,
            type TEXT NOT NULL,
            category TEXT,
            is_chomesh INTEGER,
            recipient TEXT,
            payment_method TEXT,
            created_at TEXT,
            updated_at TEXT,
            original_amount REAL,
            original_currency TEXT,
            conversion_rate REAL,
            conversion_date TEXT,
            rate_source TEXT
        )",
        [],
    )
    .map_err(|e| e.to_string())?;

    // Create recurring_transactions table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS recurring_transactions (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            start_date TEXT NOT NULL,
            next_due_date TEXT NOT NULL,
            frequency TEXT NOT NULL DEFAULT 'monthly',
            day_of_month INTEGER NOT NULL,
            total_occurrences INTEGER,
            execution_count INTEGER NOT NULL DEFAULT 0,
            description TEXT,
            amount REAL NOT NULL,
            currency TEXT NOT NULL,
            type TEXT NOT NULL,
            category TEXT,
            is_chomesh INTEGER,
            recipient TEXT,
            payment_method TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            original_amount REAL,
            original_currency TEXT,
            conversion_rate REAL,
            conversion_date TEXT,
            rate_source TEXT
        )",
        [],
    )
    .map_err(|e| e.to_string())?;

    // --- Add new columns to recurring_transactions if they don't exist ---
    
    if !column_exists(&conn, "recurring_transactions", "original_amount").map_err(|e| e.to_string())? {
        conn.execute(
            "ALTER TABLE recurring_transactions ADD COLUMN original_amount REAL",
            [],
        )
        .map_err(|e| e.to_string())?;
    }

    if !column_exists(&conn, "recurring_transactions", "original_currency").map_err(|e| e.to_string())? {
        conn.execute(
            "ALTER TABLE recurring_transactions ADD COLUMN original_currency TEXT",
            [],
        )
        .map_err(|e| e.to_string())?;
    }

    if !column_exists(&conn, "recurring_transactions", "conversion_rate").map_err(|e| e.to_string())? {
        conn.execute(
            "ALTER TABLE recurring_transactions ADD COLUMN conversion_rate REAL",
            [],
        )
        .map_err(|e| e.to_string())?;
    }

    if !column_exists(&conn, "recurring_transactions", "conversion_date").map_err(|e| e.to_string())? {
        conn.execute(
            "ALTER TABLE recurring_transactions ADD COLUMN conversion_date TEXT",
            [],
        )
        .map_err(|e| e.to_string())?;
    }

    if !column_exists(&conn, "recurring_transactions", "rate_source").map_err(|e| e.to_string())? {
        conn.execute(
            "ALTER TABLE recurring_transactions ADD COLUMN rate_source TEXT",
            [],
        )
        .map_err(|e| e.to_string())?;
    }

    if !column_exists(&conn, "recurring_transactions", "payment_method").map_err(|e| e.to_string())? {
        conn.execute(
            "ALTER TABLE recurring_transactions ADD COLUMN payment_method TEXT",
            [],
        )
        .map_err(|e| e.to_string())?;
    }

    // Add source_recurring_id to transactions table if it doesn't exist
    // Use a helper function to check for column existence to avoid errors on re-runs
    if !column_exists(&conn, "transactions", "source_recurring_id").map_err(|e| e.to_string())? {
        conn.execute(
            "ALTER TABLE transactions ADD COLUMN source_recurring_id TEXT",
            [],
        )
        .map_err(|e| e.to_string())?;
    }
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_transactions_source_recurring_id ON transactions(source_recurring_id)",
        [],
    )
    .map_err(|e| e.to_string())?;

    // Add occurrence_number to transactions table if it doesn't exist
    if !column_exists(&conn, "transactions", "occurrence_number").map_err(|e| e.to_string())? {
        conn.execute(
            "ALTER TABLE transactions ADD COLUMN occurrence_number INTEGER",
            [],
        )
        .map_err(|e| e.to_string())?;
    }

    // --- Currency Conversion Columns ---
    
    if !column_exists(&conn, "transactions", "original_amount").map_err(|e| e.to_string())? {
        conn.execute(
            "ALTER TABLE transactions ADD COLUMN original_amount REAL",
            [],
        )
        .map_err(|e| e.to_string())?;
    }

    if !column_exists(&conn, "transactions", "original_currency").map_err(|e| e.to_string())? {
        conn.execute(
            "ALTER TABLE transactions ADD COLUMN original_currency TEXT",
            [],
        )
        .map_err(|e| e.to_string())?;
    }

    if !column_exists(&conn, "transactions", "conversion_rate").map_err(|e| e.to_string())? {
        conn.execute(
            "ALTER TABLE transactions ADD COLUMN conversion_rate REAL",
            [],
        )
        .map_err(|e| e.to_string())?;
    }

    if !column_exists(&conn, "transactions", "conversion_date").map_err(|e| e.to_string())? {
        conn.execute(
            "ALTER TABLE transactions ADD COLUMN conversion_date TEXT",
            [],
        )
        .map_err(|e| e.to_string())?;
    }

    if !column_exists(&conn, "transactions", "rate_source").map_err(|e| e.to_string())? {
        conn.execute(
            "ALTER TABLE transactions ADD COLUMN rate_source TEXT",
            [],
        )
        .map_err(|e| e.to_string())?;
    }

    if !column_exists(&conn, "transactions", "payment_method").map_err(|e| e.to_string())? {
        conn.execute(
            "ALTER TABLE transactions ADD COLUMN payment_method TEXT",
            [],
        )
        .map_err(|e| e.to_string())?;
    }

    // --- Normalize predefined category labels to stable keys ---
    // Maps known Hebrew and English localized labels to canonical keys
    // (e.g. "מזון" or "Food" → "food"). Unknown values are left unchanged
    // so custom categories survive untouched.
    // Donation transactions do not support categories (they use recipient).
    // Only touch legacy localized labels; stable keys and custom text skip the UPDATE (cheaper on large DBs).
    let normalize_category_sql =
        "UPDATE {} SET category = CASE \
          WHEN category IN ('Salary', 'משכורת')          THEN 'salary' \
          WHEN category IN ('Business', 'עסק')             THEN 'business' \
          WHEN category IN ('Freelance', 'עבודה עצמאית')  THEN 'freelance' \
          WHEN category IN ('Investment', 'השקעות')        THEN 'investment' \
          WHEN category IN ('Allowance', 'קצבאות')         THEN 'allowance' \
          WHEN category IN ('Gift', 'מתנה')               THEN 'gift' \
          WHEN category IN ('Food', 'מזון')               THEN 'food' \
          WHEN category IN ('Transportation', 'תחבורה')   THEN 'transportation' \
          WHEN category IN ('Housing', 'דיור')            THEN 'housing' \
          WHEN category IN ('Utilities', 'שירותים')       THEN 'utilities' \
          WHEN category IN ('Healthcare', 'בריאות')       THEN 'healthcare' \
          WHEN category IN ('Education', 'חינוך')         THEN 'education' \
          WHEN category IN ('Leisure', 'פנאי')            THEN 'leisure' \
          WHEN category IN ('Shopping', 'קניות')          THEN 'shopping' \
          WHEN category IN ('Other', 'אחר')               THEN 'other' \
          ELSE category \
        END \
        WHERE category IN ( \
          'Salary', 'משכורת', 'Business', 'עסק', 'Freelance', 'עבודה עצמאית', \
          'Investment', 'השקעות', 'Allowance', 'קצבאות', 'Gift', 'מתנה', \
          'Food', 'מזון', 'Transportation', 'תחבורה', 'Housing', 'דיור', \
          'Utilities', 'שירותים', 'Healthcare', 'בריאות', 'Education', 'חינוך', \
          'Leisure', 'פנאי', 'Shopping', 'קניות', 'Other', 'אחר' \
        )";
    conn.execute(&normalize_category_sql.replace("{}", "transactions"), [])
        .map_err(|e| e.to_string())?;
    conn.execute(&normalize_category_sql.replace("{}", "recurring_transactions"), [])
        .map_err(|e| e.to_string())?;

    // --- Cleanup: Drop old recurring columns if they exist ---
    let columns_to_drop = vec!["is_recurring", "recurring_day_of_month", "recurring_total_count"];
    for col in columns_to_drop {
        if column_exists(&conn, "transactions", col).map_err(|e| e.to_string())? {
            // Note: DROP COLUMN might not be supported in older SQLite versions,
            // but it's available in recent tauri builds.
            conn.execute(&format!("ALTER TABLE transactions DROP COLUMN {}", col), [])
                .map_err(|e| e.to_string())?;
            println!("[DB Migration] Dropped deprecated column: {}", col);
        }
    }

    // --- App settings table (for default_currency etc.) - survives WebView cache wipe on update ---
    conn.execute(
        "CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )",
        [],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

// Helper function to check if a column exists in a table
fn column_exists(conn: &Connection, table_name: &str, column_name: &str) -> Result<bool> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({})", table_name))?;
    let mut rows = stmt.query([])?;
    while let Some(row) = rows.next()? {
        let name: String = row.get(1)?;
        if name.eq_ignore_ascii_case(column_name) {
            return Ok(true);
        }
    }
    Ok(false)
}

#[tauri::command]
pub async fn clear_all_data(db: State<'_, DbState>) -> Result<(), String> {
    let mut conn = db.0.lock().map_err(|e| e.to_string())?;
    
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute("DELETE FROM recurring_transactions", [])
        .map_err(|e| e.to_string())?;
    println!("Cleared all recurring_transactions from the database.");

    tx.execute("DELETE FROM transactions", [])
        .map_err(|e| e.to_string())?;
    println!("Cleared all transactions from the database.");

    tx.commit().map_err(|e| e.to_string())?;
    
    Ok(())
}

/**
 * Get the current application version from Cargo.toml
 * 
 * This returns the version at compile time, which is defined in Cargo.toml.
 * It's used by the frontend to display the current version in the UI.
 */
#[tauri::command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/**
 * Get the default currency from app_settings (SQLite).
 * Used on desktop to restore currency after WebView cache wipe during app update.
 * Returns None if not set.
 */
#[tauri::command]
pub fn get_default_currency(db: State<'_, DbState>) -> Result<Option<String>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT value FROM app_settings WHERE key = 'default_currency'")
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let value: String = row.get(0).map_err(|e| e.to_string())?;
        Ok(Some(value))
    } else {
        Ok(None)
    }
}

/**
 * Set the default currency in app_settings (SQLite).
 * Used on desktop to persist currency so it survives WebView cache wipe.
 */
#[tauri::command]
pub fn set_default_currency(db: State<'_, DbState>, currency: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO app_settings (key, value) VALUES ('default_currency', ?1) ON CONFLICT(key) DO UPDATE SET value = ?1",
        [&currency],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/**
 * Generic get/set for app_settings. Used for language, theme, autoLockTimeoutMinutes.
 */
#[tauri::command]
pub fn get_app_setting(db: State<'_, DbState>, key: String) -> Result<Option<String>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT value FROM app_settings WHERE key = ?1")
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query([&key]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let value: String = row.get(0).map_err(|e| e.to_string())?;
        Ok(Some(value))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn set_app_setting(db: State<'_, DbState>, key: String, value: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO app_settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?2",
        rusqlite::params![&key, &value],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_app_setting(db: State<'_, DbState>, key: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM app_settings WHERE key = ?1",
        rusqlite::params![&key],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/**
 * Infer default currency from existing transactions when app_settings has no value.
 * Uses the most common (original_currency ?? currency) across transactions.
 * Returns None if no transactions.
 */
#[tauri::command]
pub fn infer_default_currency_from_transactions(db: State<'_, DbState>) -> Result<Option<String>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    // COALESCE(original_currency, currency) - for legacy tx without original_currency, use currency
    let mut stmt = conn
        .prepare(
            "SELECT COALESCE(original_currency, currency) as c, COUNT(*) as cnt
             FROM transactions
             WHERE COALESCE(original_currency, currency) IS NOT NULL AND COALESCE(original_currency, currency) != ''
             GROUP BY c
             ORDER BY cnt DESC
             LIMIT 1",
        )
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let value: String = row.get(0).map_err(|e| e.to_string())?;
        Ok(Some(value))
    } else {
        Ok(None)
    }
} 

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;
    use tauri::Manager;

    fn mock_app() -> tauri::App<tauri::test::MockRuntime> {
        let app = tauri::test::mock_app();
        let conn = Connection::open_in_memory().expect("in-memory db");
        app.manage(crate::DbState(Mutex::new(conn)));
        app
    }

    fn assert_source_recurring_id_index(app: &tauri::App<tauri::test::MockRuntime>) {
        tauri::async_runtime::block_on(init_db(app.state::<crate::DbState>()))
            .expect("initialize database");

        let db_state = app.state::<crate::DbState>();
        let conn = db_state.0.lock().expect("db lock");
        let index_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_schema
                 WHERE type = 'index'
                   AND name = 'idx_transactions_source_recurring_id'
                   AND tbl_name = 'transactions'",
                [],
                |row| row.get(0),
            )
            .expect("index lookup");
        assert_eq!(index_count, 1);

        let query_plan: String = conn
            .query_row(
                "EXPLAIN QUERY PLAN
                 SELECT id FROM transactions
                 WHERE source_recurring_id IN ('r1', 'r2')",
                [],
                |row| row.get(3),
            )
            .expect("query plan");
        assert!(
            query_plan.contains("idx_transactions_source_recurring_id"),
            "expected source_recurring_id index in query plan, got: {query_plan}"
        );
    }

    #[test]
    fn init_db_indexes_source_recurring_id_for_new_and_existing_databases() {
        let app = mock_app();

        assert_source_recurring_id_index(&app);

        {
            let db_state = app.state::<crate::DbState>();
            let conn = db_state.0.lock().expect("db lock");
            conn.execute("DROP INDEX idx_transactions_source_recurring_id", [])
                .expect("drop index to simulate an existing database");
        }

        assert_source_recurring_id_index(&app);
    }
}
