const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2");

const app = express();
app.use(cors());
app.use(express.json());

console.log("🚀 Starting backend...");

// MySQL Connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "exam_db"
});

db.connect((err) => {
    if (err) {
        console.error("❌ MySQL Error:", err.message);
        console.log("💡 Make sure XAMPP MySQL is running!");
        return;
    }
    console.log("✅ MySQL Connected!");
    
    // Create tables if not exists
    db.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INT PRIMARY KEY AUTO_INCREMENT,
            fullname VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    db.query(`
        CREATE TABLE IF NOT EXISTS mathematics_questions (
            id INT PRIMARY KEY AUTO_INCREMENT,
            level VARCHAR(20) NOT NULL,
            question TEXT NOT NULL,
            option_a VARCHAR(255) NOT NULL,
            option_b VARCHAR(255) NOT NULL,
            option_c VARCHAR(255) NOT NULL,
            option_d VARCHAR(255) NOT NULL,
            answer CHAR(1) NOT NULL
        )
    `);
    
    db.query(`
        CREATE TABLE IF NOT EXISTS english_questions (
            id INT PRIMARY KEY AUTO_INCREMENT,
            level VARCHAR(20) NOT NULL,
            question TEXT NOT NULL,
            option_a VARCHAR(255) NOT NULL,
            option_b VARCHAR(255) NOT NULL,
            option_c VARCHAR(255) NOT NULL,
            option_d VARCHAR(255) NOT NULL,
            answer CHAR(1) NOT NULL
        )
    `);
    
    db.query(`
        CREATE TABLE IF NOT EXISTS cs_questions (
            id INT PRIMARY KEY AUTO_INCREMENT,
            level VARCHAR(20) NOT NULL,
            question TEXT NOT NULL,
            option_a VARCHAR(255) NOT NULL,
            option_b VARCHAR(255) NOT NULL,
            option_c VARCHAR(255) NOT NULL,
            option_d VARCHAR(255) NOT NULL,
            answer CHAR(1) NOT NULL
        )
    `);
    
    db.query(`
        CREATE TABLE IF NOT EXISTS exam_history (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_email VARCHAR(255) NOT NULL,
            subject VARCHAR(50) NOT NULL,
            level VARCHAR(20) NOT NULL,
            score INT NOT NULL,
            total INT NOT NULL,
            percent INT NOT NULL,
            date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    console.log("✅ Tables ready");
});

// ========================================
// TEST ENDPOINT
// ========================================
app.get("/api/test", (req, res) => {
    res.json({ message: "Backend is working!" });
});

// ========================================
// SIGNUP
// ========================================
app.post("/api/signup", async (req, res) => {
    console.log("📝 Signup:", req.body);
    const { fullname, email, password } = req.body;
    
    if (!fullname || !email || !password) {
        return res.status(400).json({ error: "All fields required" });
    }
    
    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });
        
        if (results.length > 0) {
            return res.status(400).json({ error: "Email already exists" });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.query(
            "INSERT INTO users (fullname, email, password) VALUES (?, ?, ?)",
            [fullname, email, hashedPassword],
            (err, result) => {
                if (err) return res.status(500).json({ error: "Database error" });
                console.log("✅ User created:", email);
                res.json({ message: "Account created successfully!" });
            }
        );
    });
});

// ========================================
// LOGIN
// ========================================
app.post("/api/login", (req, res) => {
    console.log("🔐 Login:", req.body);
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
    }
    
    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });
        
        if (results.length === 0) {
            return res.status(401).json({ error: "Invalid email or password" });
        }
        
        const user = results[0];
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            return res.status(401).json({ error: "Invalid email or password" });
        }
        
        console.log("✅ User logged in:", email);
        res.json({
            message: "Login successful!",
            user: { fullname: user.fullname, email: user.email }
        });
    });
});

// ========================================
// GET QUESTIONS - FIXED ENDPOINT
// ========================================
app.get("/questions/:subject/:level", (req, res) => {
    const subject = req.params.subject;
    const level = req.params.level;
    
    console.log(`📥 GET /questions/${subject}/${level}`);
    
    let tableName = "";
    if (subject === "mathematics") tableName = "mathematics_questions";
    else if (subject === "english") tableName = "english_questions";
    else if (subject === "computerscience") tableName = "cs_questions";
    else if (subject === "physics") tableName = "physics_questions";
else if (subject === "biology") tableName = "biology_questions";
else if (subject === "chemistry") tableName = "chemistry_questions";
    else {
        return res.status(400).json({ error: "Invalid subject" });
    }
    
    const query = `SELECT * FROM ${tableName} WHERE level = ?`;
    
    db.query(query, [level], (err, results) => {
        if (err) {
            console.error("❌ DB Error:", err);
            return res.status(500).json({ error: "Database error", details: err.message });
        }
        
        console.log(`📤 Found ${results.length} questions for ${subject}/${level}`);
        
        if (results.length === 0) {
            return res.json([]);
        }
        
        // Format for frontend
        const formatted = results.map(q => ({
            id: q.id,
            subject: subject,
            question: q.question,
            options: {
                A: q.option_a,
                B: q.option_b,
                C: q.option_c,
                D: q.option_d
            },
            answer: q.answer
        }));
        
        res.json(formatted);
    });
});

// ========================================
// SUBMIT EXAM
// ========================================
// SUBMIT EXAM
app.post("/submit", (req, res) => {
    console.log("📥 Submit received:", req.body);
    
    const { answers, subject, level, userEmail } = req.body;
    
    // Check if answers is empty
    if (!answers || answers.length === 0) {
        console.log("❌ No answers provided!");
        return res.status(400).json({ error: "No answers provided" });
    }
    
    let tableName = "";
    if (subject === "mathematics") tableName = "mathematics_questions";
    else if (subject === "english") tableName = "english_questions";
    else if (subject === "computerscience") tableName = "cs_questions";
    else if (subject === "physics") tableName = "physics_questions";
else if (subject === "biology") tableName = "biology_questions";
else if (subject === "chemistry") tableName = "chemistry_questions";
    else {
        return res.status(400).json({ error: "Invalid subject" });
    }
    
    const questionIds = answers.map(a => a.id);
    
    // Check if questionIds is empty
    if (questionIds.length === 0) {
        console.log("❌ No question IDs found!");
        return res.status(400).json({ error: "No question IDs" });
    }
    
    const placeholders = questionIds.map(() => '?').join(',');
    const query = `SELECT id, answer FROM ${tableName} WHERE id IN (${placeholders})`;
    
    console.log("Query:", query);
    console.log("Question IDs:", questionIds);
    
    db.query(query, questionIds, (err, results) => {
        if (err) {
            console.error("❌ Submit error:", err);
            return res.status(500).json({ error: "Database error", details: err.message });
        }
        
        let score = 0;
        answers.forEach(userAnswer => {
            const correct = results.find(r => r.id === userAnswer.id);
            if (correct && correct.answer === userAnswer.answer) {
                score++;
            }
        });
        
        const total = answers.length;
        const percent = Math.round((score / total) * 100);
        
        console.log(`Score: ${score}/${total} (${percent}%)`);
        
        // Save to exam history
        if (userEmail) {
            const historyQuery = "INSERT INTO exam_history (user_email, subject, level, score, total, percent) VALUES (?, ?, ?, ?, ?, ?)";
            db.query(historyQuery, [userEmail, subject, level, score, total, percent], (err, result) => {
                if (err) {
                    console.error("❌ Error saving history:", err);
                } else {
                    console.log("✅ History saved for:", userEmail);
                }
            });
        }
        
        let message = percent >= 70 ? "Great job!" : "Keep practicing!";
        if (percent === 100) message = "Perfect score! Excellent!";
        
        res.json({ score, total, percent, message });
    });
});
// ========================================
// GET HISTORY
// ========================================
app.get("/api/history/:email", (req, res) => {
    const email = req.params.email;
    db.query(
        "SELECT * FROM exam_history WHERE user_email = ? ORDER BY date DESC",
        [email],
        (err, results) => {
            if (err) return res.status(500).json({ error: "Database error" });
            res.json(results || []);
        }
    );
});

// ========================================
// ADMIN ENDPOINTS
// ========================================

// Get all users (Admin)
app.get("/api/admin/users", (req, res) => {
    db.query("SELECT id, fullname, email, created_at FROM users ORDER BY id DESC", (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });
        res.json(results);
    });
});

// Get all exam history (Admin)
app.get("/api/admin/history", (req, res) => {
    db.query("SELECT * FROM exam_history ORDER BY date DESC", (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });
        res.json(results);
    });
});

// Get leaderboard (Admin)
app.get("/api/admin/leaderboard", (req, res) => {
    db.query(`
        SELECT user_email, MAX(percent) as best_score, subject, level, date 
        FROM exam_history 
        GROUP BY user_email 
        ORDER BY best_score DESC 
        LIMIT 10
    `, (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });
        res.json(results);
    });
});
// ========================================
// START SERVER
// ========================================
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`\n✅ Server running on http://localhost:${PORT}`);
    console.log(`📝 Test: http://localhost:${PORT}/api/test`);
    console.log(`📝 Questions: http://localhost:${PORT}/questions/mathematics/easy`);
    console.log(`\n`);
});