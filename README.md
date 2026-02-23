# X Architects BD Portal

A production-ready, locally hosted Business Development portal for X Architects.

## Prerequisites

- **Node.js**: Version 18 or higher.
- **Git**: To clone the repository (optional if downloading zip).

## Installation & Setup

1.  **Download/Clone the Repository**
    ```bash
    git clone <repository-url>
    cd x-architects-bd-portal
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Start the Application**
    This command starts both the backend API and the frontend interface concurrently.
    ```bash
    npm run dev
    ```

4.  **Access the Portal**
    Open your browser and navigate to:
    [http://localhost:3000](http://localhost:3000)

## Features

-   **Dashboard**: Overview of actions, registrations, and meetings.
-   **Action List**: Track tasks with due dates and responsible persons.
-   **Architecture View**: Technical documentation and roadmap.
-   **Local Database**: Uses SQLite (`bd-portal.db`) for zero-config data storage.

## Project Structure

-   `server.ts`: Main entry point for the Express backend.
-   `src/api/`: API route handlers.
-   `src/db/`: Database connection and schema setup.
-   `src/pages/`: Frontend React pages.
-   `src/components/`: Reusable UI components.

## Troubleshooting

-   **Port in use**: If port 3000 is busy, the application will fail to start. Ensure no other service is running on port 3000.
-   **Database errors**: If `bd-portal.db` is corrupted, delete it and restart the server to regenerate a fresh one.
