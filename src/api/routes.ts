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

// Upload Logo
router.post('/upload-logo', upload.single('logo'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded');
  }

  const tempPath = req.file.path;
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  const targetPath = path.join(uploadsDir, 'company-logo.png');

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
  }

  try {
    // Overwrite the existing logo file
    fs.copyFileSync(tempPath, targetPath);
    fs.unlinkSync(tempPath); // Remove temp file

    res.json({ success: true, message: 'Logo uploaded successfully' });
  } catch (error) {
    console.error('Error uploading logo:', error);
    res.status(500).send('Failed to upload logo');
  }
});

// Get Logo
router.get('/logo', (req, res) => {
  const logoPath = path.resolve(process.cwd(), 'uploads', 'company-logo.png');
  if (fs.existsSync(logoPath)) {
    res.sendFile(logoPath);
  } else {
    res.status(404).send('Logo not found');
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
  const stmt = db.prepare('SELECT * FROM pipeline_items ORDER BY sort_order ASC');
  const items = stmt.all();
  const parsedItems = items.map((i: any) => {
    const parsedDisciplines = i.disciplines ? JSON.parse(i.disciplines) : [];
    return {
      id: String(i.id),
      name: i.name,
      client: i.client,
      type: i.type,
      sector: i.sector,
      disciplines: Array.isArray(parsedDisciplines) ? parsedDisciplines : [],
      values: i.item_values ? JSON.parse(i.item_values) : {},
      status: i.status,
      submissionDate: i.submission_date,
      probability: i.probability,
      rfpNumber: i.rfp_number,
      achievedDate: i.achieved_date,
      sortOrder: i.sort_order
    };
  });
  res.json(parsedItems);
});

// Create Pipeline Item
router.post('/pipeline', (req, res) => {
  const { name, client, type, sector, disciplines, values, status, submissionDate, probability, rfpNumber, achievedDate, sortOrder } = req.body;
  const stmt = db.prepare('INSERT INTO pipeline_items (name, client, type, sector, disciplines, item_values, status, submission_date, probability, rfp_number, achieved_date, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const info = stmt.run(name, client, type, sector, JSON.stringify(disciplines || []), JSON.stringify(values || {}), status || 'Pending', submissionDate, probability, rfpNumber, achievedDate, sortOrder || 0);
  res.json({ id: String(info.lastInsertRowid) });
});

// Update Pipeline Item
router.put('/pipeline/:id', (req, res) => {
  const { id } = req.params;
  const { name, client, type, sector, disciplines, values, status, submissionDate, probability, rfpNumber, achievedDate, sortOrder } = req.body;
  const stmt = db.prepare('UPDATE pipeline_items SET name = ?, client = ?, type = ?, sector = ?, disciplines = ?, item_values = ?, status = ?, submission_date = ?, probability = ?, rfp_number = ?, achieved_date = ?, sort_order = ? WHERE id = ?');
  stmt.run(name, client, type, sector, JSON.stringify(disciplines || []), JSON.stringify(values || {}), status, submissionDate, probability, rfpNumber, achievedDate, sortOrder || 0, id);
  res.json({ success: true });
});

// Delete Pipeline Item
router.delete('/pipeline/:id', (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('DELETE FROM pipeline_items WHERE id = ?');
  stmt.run(id);
  res.json({ success: true });
});

// ... existing imports

// --- Contacts API ---

// Get Contacts
router.get('/contacts', (req, res) => {
  const stmt = db.prepare('SELECT * FROM contacts ORDER BY client_organization ASC');
  const contacts = stmt.all();
  res.json(contacts);
});

// Create Contact
router.post('/contacts', (req, res) => {
  const { client_organization, location, client_contact, position, phone, email, category } = req.body;
  const stmt = db.prepare('INSERT INTO contacts (client_organization, location, client_contact, position, phone, email, category) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const info = stmt.run(client_organization, location, client_contact, position, phone, email, category);
  res.json({ id: info.lastInsertRowid });
});

// Update Contact
router.put('/contacts/:id', (req, res) => {
  const { id } = req.params;
  const { client_organization, location, client_contact, position, phone, email, category } = req.body;
  const stmt = db.prepare('UPDATE contacts SET client_organization = ?, location = ?, client_contact = ?, position = ?, phone = ?, email = ?, category = ? WHERE id = ?');
  stmt.run(client_organization, location, client_contact, position, phone, email, category, id);
  res.json({ success: true });
});

// Delete Contact
router.delete('/contacts/:id', (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('DELETE FROM contacts WHERE id = ?');
  stmt.run(id);
  res.json({ success: true });
});

// --- Engagements API ---

// Get Engagements for Contact
router.get('/contacts/:id/engagements', (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('SELECT * FROM engagements WHERE contact_id = ? ORDER BY date DESC');
  const engagements = stmt.all(id);
  res.json(engagements);
});

// Add Engagement
router.post('/contacts/:id/engagements', (req, res) => {
  const { id } = req.params;
  const { date, discussion } = req.body;
  const stmt = db.prepare('INSERT INTO engagements (contact_id, date, discussion) VALUES (?, ?, ?)');
  const info = stmt.run(id, date, discussion);
  res.json({ id: info.lastInsertRowid });
});

// Update Engagement
router.put('/engagements/:id', (req, res) => {
  const { id } = req.params;
  const { date, discussion } = req.body;
  const stmt = db.prepare('UPDATE engagements SET date = ?, discussion = ? WHERE id = ?');
  stmt.run(date, discussion, id);
  res.json({ success: true });
});

// Delete Engagement
router.delete('/engagements/:id', (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('DELETE FROM engagements WHERE id = ?');
  stmt.run(id);
  res.json({ success: true });
});

// Get Recent or Searched Engagements (Global)
router.get('/engagements/search', (req, res) => {
  const { q, startDate, endDate, organization } = req.query;
  
  let query = `
    SELECT e.*, c.client_contact, c.client_organization 
    FROM engagements e 
    JOIN contacts c ON e.contact_id = c.id 
    WHERE 1=1
  `;
  const params = [];

  if (q) {
    query += ` AND e.discussion LIKE ?`;
    params.push(`%${q}%`);
  }

  if (startDate) {
    query += ` AND e.date >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND e.date <= ?`;
    params.push(endDate);
  }

  if (organization) {
    query += ` AND c.client_organization = ?`;
    params.push(organization);
  }

  query += ` ORDER BY e.date DESC`;
  
  // If no filters and not requesting all, limit to 50
  if (!q && !startDate && !endDate && !organization && req.query.all !== 'true') {
    query += ` LIMIT 50`;
  }

  const stmt = db.prepare(query);
  const results = stmt.all(...params);
  res.json(results);
});

// --- Follow-ups API ---

// Get Follow-ups for Contact
router.get('/contacts/:id/follow-ups', (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('SELECT * FROM follow_ups WHERE contact_id = ? ORDER BY date ASC');
  const followUps = stmt.all(id);
  res.json(followUps);
});

// Add Follow-up
router.post('/contacts/:id/follow-ups', (req, res) => {
  const { id } = req.params;
  const { date, description, status } = req.body;
  const stmt = db.prepare('INSERT INTO follow_ups (contact_id, date, description, status) VALUES (?, ?, ?, ?)');
  const info = stmt.run(id, date, description, status || 'Pending');
  res.json({ id: info.lastInsertRowid });
});

// Update Follow-up
router.put('/follow-ups/:id', (req, res) => {
  const { id } = req.params;
  const { date, description, status } = req.body;
  
  // Build query dynamically based on provided fields
  const updates = [];
  const params = [];
  
  if (date) { updates.push('date = ?'); params.push(date); }
  if (description) { updates.push('description = ?'); params.push(description); }
  if (status) { updates.push('status = ?'); params.push(status); }
  
  if (updates.length === 0) return res.json({ success: true });
  
  params.push(id);
  const stmt = db.prepare(`UPDATE follow_ups SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...params);
  res.json({ success: true });
});

// Delete Follow-up
router.delete('/follow-ups/:id', (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('DELETE FROM follow_ups WHERE id = ?');
  stmt.run(id);
  res.json({ success: true });
});

// Get Due Follow-ups (Global)
router.get('/follow-ups/due', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const stmt = db.prepare(`
    SELECT f.*, c.client_contact, c.client_organization 
    FROM follow_ups f 
    JOIN contacts c ON f.contact_id = c.id 
    WHERE f.status = 'Pending' AND f.date <= ?
    ORDER BY f.date ASC
  `);
  const dueFollowUps = stmt.all(today);
  res.json(dueFollowUps);
});

// Get All Targets
router.get('/targets', (req, res) => {
  const stmt = db.prepare('SELECT * FROM targets ORDER BY year DESC');
  const targets = stmt.all();
  res.json(targets);
});

// Get Target for Year
router.get('/targets/:year', (req, res) => {
  const { year } = req.params;
  const stmt = db.prepare('SELECT * FROM targets WHERE year = ?');
  const target = stmt.get(year);
  res.json(target || { year: parseInt(year), amount: 0 });
});

// Set Target for Year
router.post('/targets', (req, res) => {
  const { year, amount } = req.body;
  const stmt = db.prepare('INSERT OR REPLACE INTO targets (year, amount) VALUES (?, ?)');
  stmt.run(year, amount);
  res.json({ success: true });
});

// Get Achieved Targets Data
router.get('/achieved-targets', (req, res) => {
  const { year } = req.query;
  const currentYear = year ? parseInt(year as string) : new Date().getFullYear();

  // Get Target
  const targetStmt = db.prepare('SELECT amount FROM targets WHERE year = ?');
  const target = targetStmt.get(currentYear);
  const yearlyTarget = target ? target.amount : 0;

  // Get Won/Approved Items for the year
  // Use achieved_date if available (and not empty), otherwise submission_date
  const itemsStmt = db.prepare(`
    SELECT * FROM pipeline_items 
    WHERE (status = 'Achieved' OR status = 'Approved') 
    AND strftime('%Y', CASE WHEN achieved_date IS NULL OR achieved_date = '' THEN submission_date ELSE achieved_date END) = ?
  `);
  const items = itemsStmt.all(String(currentYear));

  const parsedItems = items.map((i: any) => {
    const parsedDisciplines = i.disciplines ? JSON.parse(i.disciplines) : [];
    return {
      id: String(i.id),
      name: i.name,
      client: i.client,
      type: i.type,
      sector: i.sector,
      disciplines: Array.isArray(parsedDisciplines) ? parsedDisciplines : [],
      values: i.item_values ? JSON.parse(i.item_values) : {},
      status: i.status,
      submissionDate: i.submission_date,
      probability: i.probability,
      rfpNumber: i.rfp_number,
      achievedDate: i.achieved_date
    };
  });

  res.json({
    year: currentYear,
    target: yearlyTarget,
    items: parsedItems
  });
});

// --- Market Sectors API ---

// Get Market Sectors
router.get('/market-sectors', (req, res) => {
  const stmt = db.prepare('SELECT * FROM market_sectors ORDER BY name ASC');
  const sectors = stmt.all();
  res.json(sectors);
});

// Create Market Sector
router.post('/market-sectors', (req, res) => {
  const { name, color } = req.body;
  try {
    const stmt = db.prepare('INSERT INTO market_sectors (name, color) VALUES (?, ?)');
    const info = stmt.run(name, color);
    res.json({ id: info.lastInsertRowid, name, color });
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Market sector already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create market sector' });
    }
  }
});

// Update Market Sector
router.put('/market-sectors/:id', (req, res) => {
  const { id } = req.params;
  const { name, color } = req.body;
  try {
    const stmt = db.prepare('UPDATE market_sectors SET name = ?, color = ? WHERE id = ?');
    stmt.run(name, color, id);
    res.json({ success: true });
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Market sector name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update market sector' });
    }
  }
});

// Delete Market Sector
router.delete('/market-sectors/:id', (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('DELETE FROM market_sectors WHERE id = ?');
  stmt.run(id);
  res.json({ success: true });
});

// --- Company Types API ---

// Get Company Types
router.get('/company-types', (req, res) => {
  const stmt = db.prepare('SELECT * FROM company_types ORDER BY name ASC');
  const types = stmt.all();
  res.json(types);
});

// Create Company Type
router.post('/company-types', (req, res) => {
  const { name, color } = req.body;
  try {
    const stmt = db.prepare('INSERT INTO company_types (name, color) VALUES (?, ?)');
    const info = stmt.run(name, color || '#000000');
    res.json({ id: info.lastInsertRowid, name, color: color || '#000000' });
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Company type already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create company type' });
    }
  }
});

// Update Company Type
router.put('/company-types/:id', (req, res) => {
  const { id } = req.params;
  const { name, color } = req.body;
  try {
    const stmt = db.prepare('UPDATE company_types SET name = ?, color = ? WHERE id = ?');
    stmt.run(name, color, id);
    res.json({ success: true });
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Company type name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update company type' });
    }
  }
});

// Delete Company Type
router.delete('/company-types/:id', (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('DELETE FROM company_types WHERE id = ?');
  stmt.run(id);
  res.json({ success: true });
});

export default router;
