// src-tauri/src/models.rs
use rusqlite::Result as RusqliteResult;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Transaction {
    pub id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user_id: Option<String>,
    pub date: String,
    pub amount: f64,
    pub currency: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(rename = "type")]
    pub transaction_type: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub category: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub is_chomesh: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub recipient: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source_recurring_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub occurrence_number: Option<i32>,
}

impl Transaction {
    pub fn from_row(row: &rusqlite::Row<'_>) -> RusqliteResult<Self> {
        Ok(Transaction {
            id: row.get("id")?,
            user_id: row.get("user_id")?,
            date: row.get("date")?,
            amount: row.get("amount")?,
            currency: row.get("currency")?,
            description: row.get("description")?,
            transaction_type: row.get("type")?,
            category: row.get("category")?,
            is_chomesh: row.get::<_, Option<i64>>("is_chomesh")?.map(|v| v != 0),
            recipient: row.get("recipient")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
            source_recurring_id: row.get("source_recurring_id")?,
            occurrence_number: row.get("occurrence_number")?,
        })
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct RecurringTransaction {
    pub id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user_id: Option<String>,
    pub status: String,
    pub start_date: String,
    pub next_due_date: String,
    pub frequency: String,
    pub day_of_month: i32,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub total_occurrences: Option<i32>,
    pub execution_count: i32,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub amount: f64,
    pub currency: String,
    #[serde(rename = "type")]
    pub transaction_type: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub category: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub is_chomesh: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub recipient: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl RecurringTransaction {
    pub fn from_row(row: &rusqlite::Row<'_>) -> RusqliteResult<Self> {
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
            transaction_type: row.get("type")?,
            category: row.get("category")?,
            is_chomesh: row.get::<_, Option<i32>>("is_chomesh")?.map(|v| v != 0),
            recipient: row.get("recipient")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct RecurringInfo {
    pub status: String,
    pub frequency: String,
    pub execution_count: i32,
    pub total_occurrences: Option<i32>,
    pub day_of_month: i32,
    pub start_date: String,
    pub next_due_date: String,
}

#[derive(Serialize, Debug, Clone)]
pub struct TransactionForTable {
    #[serde(flatten)]
    pub transaction: Transaction,
    pub recurring_info: Option<RecurringInfo>,
} 