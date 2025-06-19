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
            created_at TEXT,
            updated_at TEXT
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
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        [],
    )
    .map_err(|e| e.to_string())?;

    // Add source_recurring_id to transactions table if it doesn't exist
    // Use a helper function to check for column existence to avoid errors on re-runs
    if !column_exists(&conn, "transactions", "source_recurring_id").map_err(|e| e.to_string())? {
        conn.execute(
            "ALTER TABLE transactions ADD COLUMN source_recurring_id TEXT",
            [],
        )
        .map_err(|e| e.to_string())?;
    }

    // Add occurrence_number to transactions table if it doesn't exist
    if !column_exists(&conn, "transactions", "occurrence_number").map_err(|e| e.to_string())? {
        conn.execute(
            "ALTER TABLE transactions ADD COLUMN occurrence_number INTEGER",
            [],
        )
        .map_err(|e| e.to_string())?;
    }

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