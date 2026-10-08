/// Inclusive date-range predicate. A NULL start parameter is unbounded.
pub fn sql_optional_start_date_predicate(start_idx: usize, end_idx: usize) -> String {
    format!(
        "(?{start} IS NULL OR date >= ?{start}) AND date <= ?{end}",
        start = start_idx,
        end = end_idx
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn predicate_skips_null_start() {
        assert_eq!(
            sql_optional_start_date_predicate(1, 2),
            "(?1 IS NULL OR date >= ?1) AND date <= ?2"
        );
    }
}
