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

// 2. Serve the HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 3. The SIGNUP Route
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const queryText = 'INSERT INTO users(username, email, password_hash) VALUES($1, $2, $3) RETURNING id';
        const values = [username, email, password]; // Note: Use bcrypt to hash passwords in production!
        
        const result = await pool.query(queryText, values);
        
        res.send(`<h1>Success!</h1><p>User created with ID: ${result.rows[0].id}</p><a href="/">Go Back</a>`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Database Error: " + err.message);
    }
});

// 4. Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});