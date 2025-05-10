# Ten10 Project

This is a [Tauri](https://tauri.app/) application using React and Vite for the frontend.

## Getting Started

Follow these instructions to set up the development environment and run the project.

### Prerequisites

Before you begin, ensure you have the following installed:

1.  **Node.js and npm:** Required for managing frontend dependencies and running scripts. You can download them from [nodejs.org](https://nodejs.org/).
2.  **Rust and Cargo:** Required by Tauri for building the application backend. The recommended way to install Rust is using `rustup`.
    - **Windows:** Open PowerShell and run:
      ```powershell
      winget install --id Rustlang.Rustup
      ```
      Or download `rustup-init.exe` from [rustup.rs](https://rustup.rs) and follow the instructions.
    - **macOS/Linux:** Open your terminal and run:
      ```bash
      curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
      ```
    - After installation, restart your terminal or run the command provided by `rustup` to configure the current shell.
    - Verify the installation by running `cargo --version`.

### Installation

1.  Clone the repository (if you haven't already):
    ```bash
    git clone <repository-url>
    cd Ten10
    ```
2.  Install Node.js dependencies:
    ```bash
    npm install
    ```

### Running the Application

- **Development Mode (Tauri window):**
  This command will build the frontend and backend, and launch the Tauri application. **Requires Rust/Cargo to be installed.**
  ```bash
  npm run tauri dev
  ```
- **Development Mode (Frontend only in browser):**
  Runs only the Vite development server for the frontend. Access it via the URL provided by Vite (e.g., `http://localhost:5173`). Note that features relying on the Tauri backend will not work.
  ```bash
  npm run dev
  ```

### Building the Application

To build the application for your platform (including the installer):

```bash
npm run tauri build
```

The output files will be located in `src-tauri/target/release/bundle/`.
