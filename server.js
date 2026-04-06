require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. Connect to Render Postgres
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for Render
});

// --- NEW: AUTOMATIC TABLE CREATION ---
// This runs as soon as the server starts
pool.query(`
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        email VARCHAR(100) NOT NULL,
        password_hash TEXT NOT NULL
    );
`, (err, res) => {
    if (err) {
        console.error("❌ Database table error:", err.message);
    } else {
        console.log("✅ Database table 'users' is ready!");
    }
});
// -------------------------------------

// 2. Serve the HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 3. The SIGNUP Route
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const queryText = 'INSERT INTO users(username, email, password_hash) VALUES($1, $2, $3) RETURNING id';
        const values = [username, email, password]; 
        
        const result = await pool.query(queryText, values);
        
        res.send(`<h1>Success!</h1><p>User created with ID: ${result.rows[0].id}</p><a href="/">Go Back</a>`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Database Error: " + err.message);
    }
});
// Add this to see your database content in the browser
app.get('/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users');
        res.json(result.rows);
    } catch (err) {
        res.status(500).send("Error fetching users: " + err.message);
    }
});

// 4. Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    
});