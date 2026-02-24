# BD Portal Application

This is a Business Development Portal application built with React, Express, and SQLite.

## Prerequisites

- Node.js (v18 or higher recommended)
- npm (Node Package Manager)

## Docker Installation (Recommended for Mac/Windows)

Running with Docker ensures the application runs in a consistent environment and makes it easy to manage.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### Steps

1.  **Open Terminal** and navigate to the project directory.

2.  **Build and Start** the container:

    ```bash
    docker compose up --build
    ```

    *Note: If you are using an older version of Docker, you might need to use `docker-compose up --build` instead.*

3.  **Access the App**:
    Open your browser and go to `http://localhost:3001`.

    *Note: The default port is set to 3001 to avoid conflicts with other applications running on port 3000.*

    **Changing the Port:**
    If you want to use a different port (e.g., 8080), open `docker-compose.yml` and change the ports section:
    ```yaml
    ports:
      - "8080:3000" # Maps host port 8080 to container port 3000
    ```

4.  **Stop the App**:
    Press `Ctrl+C` in the terminal, or run:
    ```bash
    docker compose down
    ```

### Data Persistence

The database file `bd-portal.db` is mounted from your local machine to the container. This means:
- Your data is saved locally in the project folder.
- If you delete the container, your data persists.
- You can back up `bd-portal.db` just like any other file.

### Troubleshooting

**Error: `zsh: command not found: docker`**
1.  **Install Docker:** Ensure you have installed [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/).
2.  **Start Docker:** Open the "Docker" application in your Applications folder. It must be running in the background for the commands to work. You should see the whale icon in your menu bar.
3.  **Check PATH:** If it's running but still not found, try restarting your terminal.

**Error: `zsh: command not found: docker-compose`**
- Use `docker compose` (with a space) instead of `docker-compose`.

**Error: `failed to solve: failed to read dockerfile: open Dockerfile: no such file or directory`**
- This means you are running the command from the wrong directory.
- Make sure you are in the root folder of the project (where `package.json` and `Dockerfile` are located).
- Run `ls` (Mac/Linux) or `dir` (Windows) to check if `Dockerfile` is in the current folder.

## Manual Installation (Without Docker)

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
