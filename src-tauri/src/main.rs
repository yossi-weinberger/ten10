#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")] // Prevent console window in release on Windows

use env_logger;
use rusqlite::Connection;
use std::sync::Mutex;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_clipboard_manager;

mod commands;
mod models;
mod transaction_types;

use commands::chart_commands::get_desktop_monthly_financial_summary;
use commands::db_commands::{clear_all_data, get_app_version, init_db};
use commands::donation_commands::{
    get_desktop_overall_tithe_balance, get_desktop_total_donations_in_range,
};
use commands::expense_commands::get_desktop_total_expenses_in_range;
use commands::income_commands::get_desktop_total_income_in_range;
use commands::recurring_transaction_commands::{
    add_recurring_transaction_handler, delete_recurring_transaction_handler,
    get_due_recurring_transactions_handler, get_recurring_transaction_by_id_handler,
    get_recurring_transactions_handler, update_recurring_transaction_handler,
};
use commands::transaction_commands::{
    add_transaction, delete_transaction_handler, export_transactions_handler,
    get_filtered_transactions_handler, get_last_known_rate, update_transaction_handler,
    get_transactions_count,
};
use commands::platform_commands::{get_platform_info, copy_to_clipboard};

pub struct DbState(Mutex<Connection>);

fn main() {
    env_logger::init();

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
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        // commands
        .invoke_handler(tauri::generate_handler![
            init_db,
            add_transaction,
            clear_all_data,
            get_app_version,
            get_desktop_total_income_in_range,
            get_desktop_total_expenses_in_range,
            get_desktop_total_donations_in_range,
            get_desktop_overall_tithe_balance,
            delete_transaction_handler,
            export_transactions_handler,
            get_filtered_transactions_handler,
            update_transaction_handler,
            get_last_known_rate,
            get_transactions_count,
            get_desktop_monthly_financial_summary,
            get_due_recurring_transactions_handler,
            add_recurring_transaction_handler,
            get_recurring_transactions_handler,
            update_recurring_transaction_handler,
            get_recurring_transaction_by_id_handler,
            delete_recurring_transaction_handler,
            get_platform_info,
            copy_to_clipboard,
        ])
        // create main window with cache-busting index.html?v=<version>
        .setup(|app| {
            // Move database to proper app data directory
            let app_data_dir = app.path().app_data_dir()
                .expect("Failed to get app data directory");
            
            // Create the directory if it doesn't exist
            std::fs::create_dir_all(&app_data_dir)
                .expect("Failed to create app data directory");
            
            let db_path = app_data_dir.join("Ten10.db");
            
            // If the old database exists, move it to the new location
            if std::path::Path::new("Ten10.db").exists() && !db_path.exists() {
                std::fs::rename("Ten10.db", &db_path)
                    .expect("Failed to move database to app data directory");
            }
            
            // Update the database connection to use the new path
            let conn = Connection::open(&db_path).expect("Failed to open database");
            app.manage(DbState(Mutex::new(conn)));

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
