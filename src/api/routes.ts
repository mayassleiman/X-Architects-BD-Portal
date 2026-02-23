import express from 'express';
import db from '../db/index.ts';
import path from 'path';
import multer from 'multer';
import fs from 'fs';

const router = express.Router();

// Configure multer for file upload
const upload = multer({ dest: 'uploads/' });

// Health Check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Download Database
router.get('/download-db', (req, res) => {
  const dbPath = path.resolve(process.cwd(), 'bd-portal.db');
  if (fs.existsSync(dbPath)) {
    res.download(dbPath);
  } else {
    res.status(404).send('Database file not found');
  }
});

// Upload Database
router.post('/upload-db', upload.single('database'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded');
  }

  const tempPath = req.file.path;
  const targetPath = path.resolve(process.cwd(), 'bd-portal.db');

  try {
    // Overwrite the existing database file
    fs.copyFileSync(tempPath, targetPath);
    fs.unlinkSync(tempPath); // Remove temp file

    res.json({ success: true, message: 'Database uploaded successfully. The server will restart to apply changes.' });
    
    // Trigger server restart after a short delay to allow response to be sent
    setTimeout(() => {
      console.log('Restarting server to apply database changes...');
      process.exit(0); 
    }, 1000);

  } catch (error) {
    console.error('Error uploading database:', error);
    res.status(500).send('Failed to upload database');
  }
});

// Get Actions
router.get('/actions', (req, res) => {
  const stmt = db.prepare('SELECT * FROM actions ORDER BY due_date ASC');
  const actions = stmt.all();
  res.json(actions);
});

// Create Action
router.post('/actions', (req, res) => {
  const { title, description, due_date, responsible, status } = req.body;
  const stmt = db.prepare('INSERT INTO actions (title, description, due_date, responsible, status) VALUES (?, ?, ?, ?, ?)');
  const info = stmt.run(title, description, due_date, responsible, status || 'pending');
  res.json({ id: info.lastInsertRowid });
});

// Update Action
router.put('/actions/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, due_date, responsible, status } = req.body;
  const stmt = db.prepare('UPDATE actions SET title = ?, description = ?, due_date = ?, responsible = ?, status = ? WHERE id = ?');
  stmt.run(title, description, due_date, responsible, status, id);
  res.json({ success: true });
});

// Delete Action
router.delete('/actions/:id', (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('DELETE FROM actions WHERE id = ?');
  stmt.run(id);
  res.json({ success: true });
});

// Get Registrations
router.get('/registrations', (req, res) => {
  const stmt = db.prepare('SELECT * FROM registrations ORDER BY registration_date DESC');
  const regs = stmt.all();
  res.json(regs);
});

// Create Registration
router.post('/registrations', (req, res) => {
  const { client, contact_name, registration_date, portal_link, status, due_date, follow_up_log, last_week_follow_up } = req.body;
  const stmt = db.prepare('INSERT INTO registrations (client, contact_name, registration_date, portal_link, status, due_date, follow_up_log, last_week_follow_up) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const info = stmt.run(client, contact_name, registration_date, portal_link, status || 'pending', due_date, follow_up_log, last_week_follow_up);
  res.json({ id: info.lastInsertRowid });
});

// Update Registration
router.put('/registrations/:id', (req, res) => {
  const { id } = req.params;
  const { client, contact_name, registration_date, portal_link, status, due_date, follow_up_log, last_week_follow_up } = req.body;
  const stmt = db.prepare('UPDATE registrations SET client = ?, contact_name = ?, registration_date = ?, portal_link = ?, status = ?, due_date = ?, follow_up_log = ?, last_week_follow_up = ? WHERE id = ?');
  stmt.run(client, contact_name, registration_date, portal_link, status, due_date, follow_up_log, last_week_follow_up, id);
  res.json({ success: true });
});

// Delete Registration
router.delete('/registrations/:id', (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('DELETE FROM registrations WHERE id = ?');
  stmt.run(id);
  res.json({ success: true });
});

// Get Tasks
router.get('/tasks', (req, res) => {
  const stmt = db.prepare('SELECT * FROM tasks ORDER BY level ASC');
  const tasks = stmt.all();
  res.json(tasks);
});

// Create Task
router.post('/tasks', (req, res) => {
  const { title, level, status, description } = req.body;
  const stmt = db.prepare('INSERT INTO tasks (title, level, status, description) VALUES (?, ?, ?, ?)');
  const info = stmt.run(title, level, status || 'pending', description);
  res.json({ id: info.lastInsertRowid });
});

// Update Task
router.put('/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { title, level, status, description } = req.body;
  const stmt = db.prepare('UPDATE tasks SET title = ?, level = ?, status = ?, description = ? WHERE id = ?');
  stmt.run(title, level, status, description, id);
  res.json({ success: true });
});

// Delete Task
router.delete('/tasks/:id', (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('DELETE FROM tasks WHERE id = ?');
  stmt.run(id);
  res.json({ success: true });
});

// Get Meetings
router.get('/meetings', (req, res) => {
  const stmt = db.prepare('SELECT * FROM meetings ORDER BY date ASC, time ASC');
  const meetings = stmt.all();
  // Parse attendees JSON
  const parsedMeetings = meetings.map((m: any) => ({
    ...m,
    attendees: m.attendees ? JSON.parse(m.attendees) : []
  }));
  res.json(parsedMeetings);
});

// Create Meeting
router.post('/meetings', (req, res) => {
  const { title, date, time, attendees, level } = req.body;
  const stmt = db.prepare('INSERT INTO meetings (title, date, time, attendees, level) VALUES (?, ?, ?, ?, ?)');
  const info = stmt.run(title, date, time, JSON.stringify(attendees || []), level || 1);
  res.json({ id: info.lastInsertRowid });
});

// Update Meeting
router.put('/meetings/:id', (req, res) => {
  const { id } = req.params;
  const { title, date, time, attendees, level } = req.body;
  const stmt = db.prepare('UPDATE meetings SET title = ?, date = ?, time = ?, attendees = ?, level = ? WHERE id = ?');
  stmt.run(title, date, time, JSON.stringify(attendees || []), level, id);
  res.json({ success: true });
});

// Delete Meeting
router.delete('/meetings/:id', (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('DELETE FROM meetings WHERE id = ?');
  stmt.run(id);
  res.json({ success: true });
});

// Get Pipeline Items
router.get('/pipeline', (req, res) => {
  const stmt = db.prepare('SELECT * FROM pipeline_items');
  const items = stmt.all();
  const parsedItems = items.map((i: any) => ({
    id: String(i.id),
    name: i.name,
    client: i.client,
    type: i.type,
    sector: i.sector,
    disciplines: i.disciplines ? JSON.parse(i.disciplines) : [],
    values: i.item_values ? JSON.parse(i.item_values) : {},
    status: i.status,
    submissionDate: i.submission_date,
    probability: i.probability,
    rfpNumber: i.rfp_number
  }));
  res.json(parsedItems);
});

// Create Pipeline Item
router.post('/pipeline', (req, res) => {
  const { name, client, type, sector, disciplines, values, status, submissionDate, probability, rfpNumber } = req.body;
  const stmt = db.prepare('INSERT INTO pipeline_items (name, client, type, sector, disciplines, item_values, status, submission_date, probability, rfp_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const info = stmt.run(name, client, type, sector, JSON.stringify(disciplines || []), JSON.stringify(values || {}), status || 'Pending', submissionDate, probability, rfpNumber);
  res.json({ id: String(info.lastInsertRowid) });
});

// Update Pipeline Item
router.put('/pipeline/:id', (req, res) => {
  const { id } = req.params;
  const { name, client, type, sector, disciplines, values, status, submissionDate, probability, rfpNumber } = req.body;
  const stmt = db.prepare('UPDATE pipeline_items SET name = ?, client = ?, type = ?, sector = ?, disciplines = ?, item_values = ?, status = ?, submission_date = ?, probability = ?, rfp_number = ? WHERE id = ?');
  stmt.run(name, client, type, sector, JSON.stringify(disciplines || []), JSON.stringify(values || {}), status, submissionDate, probability, rfpNumber, id);
  res.json({ success: true });
});

// Delete Pipeline Item
router.delete('/pipeline/:id', (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('DELETE FROM pipeline_items WHERE id = ?');
  stmt.run(id);
  res.json({ success: true });
});

export default router;
