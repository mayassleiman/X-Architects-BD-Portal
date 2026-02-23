import Database from 'better-sqlite3';
import path from 'path';

// Use a local file for the database
const dbPath = path.resolve(process.cwd(), 'bd-portal.db');
const db = new Database(dbPath);

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    due_date TEXT,
    status TEXT DEFAULT 'pending',
    responsible TEXT
  );

  CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client TEXT, -- Company Name
    contact_name TEXT,
    registration_date TEXT,
    portal_link TEXT,
    status TEXT DEFAULT 'pending', -- pending, ongoing, completed
    due_date TEXT,
    follow_up_log TEXT,
    last_week_follow_up TEXT
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    level INTEGER DEFAULT 1, -- 1: Lead, 2: Prospect, 3: Proposal, 4: Negotiation
    status TEXT DEFAULT 'pending',
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS meetings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    date TEXT,
    time TEXT,
    attendees TEXT, -- JSON string
    level INTEGER DEFAULT 1 -- 1: Lead, 2: Prospect, 3: Proposal, 4: Negotiation
  );

  CREATE TABLE IF NOT EXISTS pipeline_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    client TEXT,
    type TEXT NOT NULL, -- 'RFP' or 'VO'
    sector TEXT NOT NULL,
    disciplines TEXT, -- JSON string
    item_values TEXT, -- JSON string for { architecture, interior, cs, vo }
    status TEXT DEFAULT 'Pending',
    submission_date TEXT,
    probability TEXT, -- 'High', 'Medium', 'Low'
    rfp_number TEXT
  );
`);

// Migration: Add rfp_number column if it doesn't exist (for existing databases)
try {
  db.exec("ALTER TABLE pipeline_items ADD COLUMN rfp_number TEXT");
} catch (error) {
  // Column likely already exists, ignore
}

export default db;
