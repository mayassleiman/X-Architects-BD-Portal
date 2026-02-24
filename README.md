# BD Portal Application

This is a Business Development Portal application built with React, Express, and SQLite.

## Prerequisites

- Node.js (v18 or higher recommended)
- npm (Node Package Manager)

## Installation

1.  Clone the repository or download the source code.
2.  Navigate to the project directory in your terminal.
3.  Install all dependencies:

    ```bash
    npm install
    ```

## Running Locally (Development Mode)

To run the application in development mode with hot-reloading (for editing code):

1.  Start the development server:

    ```bash
    npm run dev
    ```

2.  Open your browser and navigate to `http://localhost:1111`.

    *Note: The default port is 1111. You can change this by creating a `.env` file and setting `APP_PORT=3000` (or any other port).*

## Publishing & Running (Production Mode)

To "publish" the application (build it for optimized performance) and run it locally:

1.  **Build the frontend (Publish):**

    This compiles the React application into optimized static files in the `dist` directory.

    ```bash
    npm run build
    ```

2.  **Start the production server:**

    You need to set the environment variable `NODE_ENV` to `production` to serve the built files instead of using the Vite development server.

    **On Linux/macOS:**
    ```bash
    NODE_ENV=production npm start
    ```

    **On Windows (Command Prompt):**
    ```cmd
    set NODE_ENV=production && npm start
    ```

    **On Windows (PowerShell):**
    ```powershell
    $env:NODE_ENV="production"; npm start
    ```

3.  Open your browser and navigate to `http://localhost:1111`.

## Database

The application uses a local SQLite database file named `bd-portal.db`.
- This file is automatically created in the project root directory when you start the server.
- **Persistence:** Your data is saved in this file. Do not delete it unless you want to reset the application.
- **Backup:** You can download a backup of your database from the **Settings** page in the application.

## Troubleshooting

- **Port in use:** If port 1111 is already in use, you can change the port by setting the `APP_PORT` environment variable in a `.env` file.
- **Database errors:** If you encounter database issues, ensure the application has write permissions to the project directory to create/update `bd-portal.db`.
- **Missing dependencies:** If `npm start` fails, try running `npm install` again to ensure all packages are installed.
