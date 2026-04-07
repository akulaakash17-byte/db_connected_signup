require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── DB CONNECTION ─────────────────────────────────────────────
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// ─── AUTO CREATE TABLE ─────────────────────────────────────────
pool.query(`
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
    );
`, (err) => {
    if (err) console.error("❌ DB table error:", err.message);
    else console.log("✅ Database table 'users' is ready!");
});

// ─── SERVE PAGES ───────────────────────────────────────────────
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// ─── SIGNUP ROUTE ──────────────────────────────────────────────
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    // Basic validation
    if (!username || !email || !password) {
        return res.redirect('/?error=' + encodeURIComponent('All fields are required.'));
    }

    if (password.length < 6) {
        return res.redirect('/?error=' + encodeURIComponent('Password must be at least 6 characters.'));
    }

    try {
        // Check if username already exists
        const usernameCheck = await pool.query(
            'SELECT id FROM users WHERE username = $1', [username]
        );
        if (usernameCheck.rows.length > 0) {
            return res.redirect('/?error=' + encodeURIComponent('Username already taken. Choose another.'));
        }

        // Check if email already exists
        const emailCheck = await pool.query(
            'SELECT id FROM users WHERE email = $1', [email]
        );
        if (emailCheck.rows.length > 0) {
            return res.redirect('/?error=' + encodeURIComponent('Email already registered. Try logging in.'));
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        await pool.query(
            'INSERT INTO users(username, email, password_hash) VALUES($1, $2, $3)',
            [username, email, hashedPassword]
        );

        // Redirect to login with success message
        res.redirect('/login?success=' + encodeURIComponent('Account created! Please sign in.'));

    } catch (err) {
        console.error(err);
        res.redirect('/?error=' + encodeURIComponent('Server error. Please try again.'));
    }
});

// ─── LOGIN ROUTE ───────────────────────────────────────────────
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.redirect('/login?error=' + encodeURIComponent('Email and password are required.'));
    }

    try {
        // Find user by email
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1', [email]
        );

        if (result.rows.length === 0) {
            return res.redirect('/login?error=' + encodeURIComponent('No account found with this email.'));
        }

        const user = result.rows[0];

        // Compare password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            return res.redirect('/login?error=' + encodeURIComponent('Incorrect password. Try again.'));
        }

        // ✅ Login successful
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Dashboard</title>
                <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;800&display=swap" rel="stylesheet">
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body {
                        font-family: 'Syne', sans-serif;
                        background: #080b12;
                        color: #e2e8f0;
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .card {
                        background: #0e1320;
                        border: 1px solid #1e2a40;
                        border-radius: 20px;
                        padding: 48px 40px;
                        text-align: center;
                        max-width: 420px;
                        width: 100%;
                    }
                    .icon { font-size: 48px; margin-bottom: 16px; }
                    h1 { font-size: 28px; font-weight: 800; margin-bottom: 8px; }
                    p { font-family: 'Space Mono', monospace; font-size: 13px; color: #4a5568; margin-bottom: 24px; }
                    .username { color: #00f0ff; }
                    a {
                        display: inline-block;
                        padding: 12px 24px;
                        background: linear-gradient(135deg, #7b61ff, #00f0ff);
                        color: #fff;
                        border-radius: 10px;
                        text-decoration: none;
                        font-weight: 700;
                        font-size: 14px;
                    }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="icon">✅</div>
                    <h1>Login Successful!</h1>
                    <p>Welcome back, <span class="username">${user.username}</span></p>
                    <a href="/login">Sign Out</a>
                </div>
            </body>
            </html>
        `);

    } catch (err) {
        console.error(err);
        res.redirect('/login?error=' + encodeURIComponent('Server error. Please try again.'));
    }
});

// ─── VIEW USERS (protected in production) ─────────────────────
app.get('/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, email, created_at FROM users');
        res.json(result.rows);
    } catch (err) {
        res.status(500).send("Error: " + err.message);
    }
});

// ─── START SERVER ──────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});