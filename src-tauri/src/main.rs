#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")] // Prevent console window in release on Windows

use env_logger;
use rusqlite::Connection;
use std::sync::Mutex;
use tauri::{WebviewUrl, WebviewWindowBuilder};

mod commands;
mod models;

use commands::chart_commands::get_desktop_monthly_financial_summary;
use commands::db_commands::{clear_all_data, init_db};
use commands::donation_commands::{
    get_desktop_overall_tithe_balance, get_desktop_total_donations_in_range,
};
use commands::expense_commands::get_desktop_total_expenses_in_range;
use commands::income_commands::get_desktop_total_income_in_range;
use commands::recurring_transaction_commands::{
    add_recurring_transaction_handler, delete_recurring_transaction_handler,
    execute_due_recurring_transactions_handler, get_recurring_transaction_by_id_handler,
    get_recurring_transactions_handler, update_recurring_transaction_handler,
};
use commands::transaction_commands::{
    add_transaction, delete_transaction_handler, export_transactions_handler,
    get_filtered_transactions_handler, update_transaction_handler,
};

pub struct DbState(Mutex<Connection>);

fn main() {
    env_logger::init();

    let conn = Connection::open("Ten10.db").expect("Failed to open database");

    tauri::Builder::default()
        // plugins
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        // state
        .manage(DbState(Mutex::new(conn)))
        // commands
        .invoke_handler(tauri::generate_handler![
            init_db,
            add_transaction,
            clear_all_data,
            get_desktop_total_income_in_range,
            get_desktop_total_expenses_in_range,
            get_desktop_total_donations_in_range,
            get_desktop_overall_tithe_balance,
            delete_transaction_handler,
            export_transactions_handler,
            get_filtered_transactions_handler,
            update_transaction_handler,
            get_desktop_monthly_financial_summary,
            execute_due_recurring_transactions_handler,
            add_recurring_transaction_handler,
            get_recurring_transactions_handler,
            update_recurring_transaction_handler,
            get_recurring_transaction_by_id_handler,
            delete_recurring_transaction_handler,
        ])
        // create main window with cache-busting index.html?v=<version>
        .setup(|app| {
            let version = app.package_info().version.to_string();

            // dev: Vite server; prod: bundled assets. Both add ?v=<version>.
            #[cfg(debug_assertions)]
            let boot_url = {
                let url = format!("http://localhost:5173/?v={}", version);
                WebviewUrl::External(url.parse().expect("invalid dev URL"))
            };

            #[cfg(not(debug_assertions))]
            let boot_url = {
                let url = format!("/?v={}", version);
                WebviewUrl::App(url.into())
            };

            WebviewWindowBuilder::new(app, "main", boot_url)
                .title("Ten10")
                .maximized(true) 
                .resizable(true)
                .decorations(true)
                .visible(true)
                .build()?;
                

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
