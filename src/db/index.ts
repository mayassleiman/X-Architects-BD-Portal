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

  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_organization TEXT,
    location TEXT,
    client_contact TEXT,
    position TEXT,
    phone TEXT,
    email TEXT,
    category TEXT -- Consultant, Developer, etc.
  );

  CREATE TABLE IF NOT EXISTS engagements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER,
    date TEXT,
    discussion TEXT,
    FOREIGN KEY(contact_id) REFERENCES contacts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS follow_ups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER,
    date TEXT,
    description TEXT,
    status TEXT DEFAULT 'Pending',
    FOREIGN KEY(contact_id) REFERENCES contacts(id) ON DELETE CASCADE
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
    rfp_number TEXT,
    achieved_date TEXT
  );

  CREATE TABLE IF NOT EXISTS targets (
    year INTEGER PRIMARY KEY,
    amount REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS market_sectors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    color TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS company_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT '#000000'
  );
`);

// Seed default market sectors if empty
const sectorsCount = db.prepare('SELECT count(*) as count FROM market_sectors').get() as { count: number };
if (sectorsCount.count === 0) {
  const defaultSectors = [
    { name: "Commercial", color: "#10b981" },
    { name: "Residential", color: "#3b82f6" },
    { name: "Cultural", color: "#f59e0b" },
    { name: "Religious", color: "#ef4444" },
    { name: "Hospitality", color: "#8b5cf6" },
    { name: "Mixed Use", color: "#ec4899" },
    { name: "Entertainment", color: "#6366f1" },
    { name: "Master Planning", color: "#14b8a6" },
    { name: "Retail", color: "#f97316" }
  ];
  const insertSector = db.prepare('INSERT INTO market_sectors (name, color) VALUES (@name, @color)');
  defaultSectors.forEach(sector => insertSector.run(sector));
}

// Seed default company types if empty
const typesCount = db.prepare('SELECT count(*) as count FROM company_types').get() as { count: number };
if (typesCount.count === 0) {
  const defaultTypes = [
    { name: "Client", color: "#3b82f6" },
    { name: "Contractor", color: "#ef4444" },
    { name: "Consultant", color: "#10b981" },
    { name: "Developer", color: "#f59e0b" },
    { name: "Government", color: "#8b5cf6" }
  ];
  const insertType = db.prepare('INSERT INTO company_types (name, color) VALUES (@name, @color)');
  defaultTypes.forEach(type => insertType.run(type));
}

// Migration: Add category column to contacts if it doesn't exist
try {
  db.exec("ALTER TABLE contacts ADD COLUMN category TEXT");
} catch (error) {
  // Column likely already exists, ignore
}

// Migration: Add color column to company_types if it doesn't exist
try {
  db.exec("ALTER TABLE company_types ADD COLUMN color TEXT DEFAULT '#000000'");
} catch (error) {
  // Column likely already exists, ignore
}

// Migration: Add rfp_number column if it doesn't exist (for existing databases)
try {
  db.exec("ALTER TABLE pipeline_items ADD COLUMN rfp_number TEXT");
} catch (error) {
  // Column likely already exists, ignore
}

// Migration: Add achieved_date column if it doesn't exist
try {
  db.exec("ALTER TABLE pipeline_items ADD COLUMN achieved_date TEXT");
} catch (error) {
  // Column likely already exists, ignore
}

export default db;
