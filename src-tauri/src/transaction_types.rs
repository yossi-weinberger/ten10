// src-tauri/src/transaction_types.rs
// Centralized definition of transaction type groupings for use across all database queries

/// Transaction types that should be included when calculating total income
pub const INCOME_TYPES: &[&str] = &["income", "exempt-income"];

/// Transaction types that should be included when calculating total donations
pub const DONATION_TYPES: &[&str] = &["donation", "non_tithe_donation"];

/// Transaction types that should be included when calculating total expenses
pub const EXPENSE_TYPES: &[&str] = &["expense", "recognized-expense"];

/// Returns SQL WHERE condition for income types (e.g., "type = 'income' OR type = 'exempt-income'")
pub fn income_types_condition() -> String {
    let conditions: Vec<String> = INCOME_TYPES
        .iter()
        .map(|t| format!("type = '{}'", t))
        .collect();
    format!("({})", conditions.join(" OR "))
}

/// Returns SQL CASE condition for income types in SUM aggregation
pub fn income_types_case_condition() -> String {
    let conditions: Vec<String> = INCOME_TYPES
        .iter()
        .map(|t| format!("type = '{}'", t))
        .collect();
    format!("CASE WHEN {} THEN amount ELSE 0 END", conditions.join(" OR "))
}

/// Returns SQL WHERE condition for donation types
pub fn donation_types_condition() -> String {
    let conditions: Vec<String> = DONATION_TYPES
        .iter()
        .map(|t| format!("type = '{}'", t))
        .collect();
    format!("({})", conditions.join(" OR "))
}

/// Returns SQL CASE condition for donation types in SUM aggregation
pub fn donation_types_case_condition() -> String {
    let conditions: Vec<String> = DONATION_TYPES
        .iter()
        .map(|t| format!("type = '{}'", t))
        .collect();
    format!("CASE WHEN {} THEN amount ELSE 0 END", conditions.join(" OR "))
}

/// Returns SQL WHERE condition for expense types
pub fn expense_types_condition() -> String {
    let conditions: Vec<String> = EXPENSE_TYPES
        .iter()
        .map(|t| format!("type = '{}'", t))
        .collect();
    format!("({})", conditions.join(" OR "))
}

/// Returns SQL CASE condition for expense types in SUM aggregation
pub fn expense_types_case_condition() -> String {
    let conditions: Vec<String> = EXPENSE_TYPES
        .iter()
        .map(|t| format!("type = '{}'", t))
        .collect();
    format!("CASE WHEN {} THEN amount ELSE 0 END", conditions.join(" OR "))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_income_types_condition() {
        let condition = income_types_condition();
        assert!(condition.contains("income"));
        assert!(condition.contains("exempt-income"));
    }

    #[test]
    fn test_donation_types_condition() {
        let condition = donation_types_condition();
        assert!(condition.contains("donation"));
        assert!(condition.contains("non_tithe_donation"));
    }

    #[test]
    fn test_expense_types_condition() {
        let condition = expense_types_condition();
        assert!(condition.contains("expense"));
        assert!(condition.contains("recognized-expense"));
    }
}

