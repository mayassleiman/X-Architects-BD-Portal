# X Architects BD Portal - Technical Architecture

## 1. Recommended Tech Stack

### Frontend (User Interface)
- **Framework**: React 19 (via Vite) - For a responsive, component-based UI.
- **Styling**: Tailwind CSS v4 - For rapid, consistent styling with a custom "Architectural" theme.
- **Icons**: Lucide React - Clean, vector-based icons.
- **State Management**: React Context / Hooks (initially), TanStack Query (for data fetching later).

### Backend (API & Logic)
- **Runtime**: Node.js - Unified JavaScript/TypeScript environment.
- **Framework**: Express.js - Robust, standard server framework.
- **Language**: TypeScript - For type safety across the full stack.

### Database (Data Storage)
- **Local (Current)**: SQLite (via `better-sqlite3`) - Zero-configuration, file-based database perfect for local deployment. It supports SQL, making migration to PostgreSQL easy.
- **Cloud (Future)**: PostgreSQL - The industry standard for relational data, easily hosted on AWS RDS, Google Cloud SQL, or Supabase.

### Authentication
- **Local**: Simple Session/Token-based auth (JWT) stored in HTTP-only cookies.
- **Cloud**: OAuth2 (Google Workspace integration) or Auth0 for enterprise-grade security.

---

## 2. Folder Structure

```
/
├── src/
│   ├── api/            # Backend API routes (when running full-stack)
│   ├── components/     # Reusable UI components
│   │   ├── layout/     # Sidebar, Header, etc.
│   │   └── ui/         # Buttons, Inputs, Cards
│   ├── db/             # Database connection and schema
│   ├── lib/            # Utilities and helper functions
│   ├── pages/          # Main application views
│   └── types/          # TypeScript definitions
├── server.ts           # Express server entry point
├── vite.config.ts      # Build configuration
└── package.json        # Dependencies
```

---

## 3. Database Choice: SQLite (Local) -> PostgreSQL (Cloud)

**Why SQLite now?**
- **Zero Setup**: No need to install a database server. It's just a file (`bd-portal.db`).
- **Portable**: The database file can be backed up by simply copying it.
- **Fast**: Extremely low latency for local apps.

**Why PostgreSQL later?**
- **Concurrency**: Handles multiple users writing simultaneously better than SQLite.
- **Features**: Advanced JSON support, Row Level Security.
- **Migration**: Since both use SQL, moving data is straightforward.

---

## 4. Local Deployment Setup

1.  **Install Node.js**: Ensure Node.js (v18+) is installed.
2.  **Clone Repository**: Download the code.
3.  **Install Dependencies**: Run `npm install`.
4.  **Start Server**: Run `npm run dev` (starts both frontend and backend).
5.  **Access**: Open `http://localhost:3000`.

---

## 5. Cloud Migration Strategy

1.  **Containerization**: Wrap the application in a Docker container.
2.  **Database Migration**:
    - Export SQLite data to SQL dump.
    - Import into managed PostgreSQL instance.
    - Update `DATABASE_URL` environment variable.
3.  **Hosting**: Deploy to a platform like Google Cloud Run, Vercel (Frontend) + Render (Backend), or a VPS (DigitalOcean).

---

## 6. Security Best Practices

-   **Input Validation**: Sanitize all user inputs to prevent SQL Injection (handled by parameterized queries).
-   **Authentication**: Use HTTP-Only cookies to prevent XSS attacks on tokens.
-   **Rate Limiting**: Prevent brute-force attacks on login endpoints.
-   **Backups**: Automated daily backups of the SQLite file (or SQL dump).

---

## 7. Backup & Recovery

**Strategy**:
-   **Automated**: A cron job (scheduled task) copies the `bd-portal.db` file to a `backups/` folder daily with a timestamp.
-   **Manual**: A "Download Backup" button in the Settings panel for the admin.
-   **Recovery**: Simply replace the active `.db` file with a backup file and restart the server.

## 8. Performance Considerations

-   **Code Splitting**: Vite automatically splits code to load only what's needed.
-   **Asset Optimization**: Images and fonts are optimized at build time.
-   **Caching**: API responses can be cached for static data (like list of architects).
