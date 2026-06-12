const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// ========================================
// FILE-BASED DATABASE (No MySQL needed!)
// ========================================
const USERS_FILE = "users.json";
const HISTORY_FILE = "history.json";

// Load data from files
let users = [];
let examHistory = [];

if (fs.existsSync(USERS_FILE)) {
    users = JSON.parse(fs.readFileSync(USERS_FILE));
}
if (fs.existsSync(HISTORY_FILE)) {
    examHistory = JSON.parse(fs.readFileSync(HISTORY_FILE));
}

function saveData() {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(examHistory, null, 2));
}

// ========================================
// QUESTIONS DATA (Your 6 subjects with levels)
// ========================================
const questionsData = {
    mathematics: {
        easy: require("./questions/mathematics_easy.json"),
        medium: require("./questions/mathematics_medium.json"),
        hard: require("./questions/mathematics_hard.json")
    },
    english: {
        easy: require("./questions/english_easy.json"),
        medium: require("./questions/english_medium.json"),
        hard: require("./questions/english_hard.json")
    },
    physics: {
        easy: require("./questions/physics_easy.json"),
        medium: require("./questions/physics_medium.json"),
        hard: require("./questions/physics_hard.json")
    },
    biology: {
        easy: require("./questions/biology_easy.json"),
        medium: require("./questions/biology_medium.json"),
        hard: require("./questions/biology_hard.json")
    },
    chemistry: {
        easy: require("./questions/chemistry_easy.json"),
        medium: require("./questions/chemistry_medium.json"),
        hard: require("./questions/chemistry_hard.json")
    },
    computerscience: {
        easy: require("./questions/computerscience_easy.json"),
        medium: require("./questions/computerscience_medium.json"),
        hard: require("./questions/computerscience_hard.json")
    }
};

// ========================================
// API ENDPOINTS
// ========================================

// Test endpoint
app.get("/api/test", (req, res) => {
    res.json({ message: "Backend is working!" });
});

// Signup
app.post("/api/signup", async (req, res) => {
    const { fullname, email, password } = req.body;
    
    if (users.find(u => u.email === email)) {
        return res.status(400).json({ error: "Email already registered" });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({
        id: users.length + 1,
        fullname,
        email,
        password: hashedPassword,
        created_at: new Date().toISOString()
    });
    saveData();
    res.json({ message: "Account created successfully!" });
});

// Login
app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);
    
    if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
    }
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
        return res.status(401).json({ error: "Invalid email or password" });
    }
    
    res.json({
        message: "Login successful!",
        user: { fullname: user.fullname, email: user.email }
    });
});

// Get questions
app.get("/questions/:subject/:level", (req, res) => {
    const { subject, level } = req.params;
    
    if (!questionsData[subject] || !questionsData[subject][level]) {
        return res.status(404).json({ error: "Questions not found" });
    }
    
    res.json(questionsData[subject][level]);
});

// Submit exam
app.post("/submit", (req, res) => {
    const { answers, subject, level, userEmail } = req.body;
    
    const questions = questionsData[subject][level];
    
    let score = 0;
    answers.forEach(userAnswer => {
        const q = questions.find(q => q.id === userAnswer.id);
        if (q && q.answer === userAnswer.answer) {
            score++;
        }
    });
    
    const total = questions.length;
    const percent = Math.round((score / total) * 100);
    
    if (userEmail) {
        examHistory.push({
            user_email: userEmail,
            subject,
            level,
            score,
            total,
            percent,
            date: new Date().toISOString()
        });
        saveData();
    }
    
    let message = percent >= 70 ? "Great job!" : "Keep practicing!";
    if (percent === 100) message = "Perfect score! Excellent!";
    
    res.json({ score, total, percent, message });
});

// Get history
app.get("/api/history/:email", (req, res) => {
    const history = examHistory.filter(h => h.user_email === req.params.email);
    res.json(history);
});

// Admin endpoints
app.get("/api/admin/users", (req, res) => {
    const safeUsers = users.map(u => ({
        id: u.id,
        fullname: u.fullname,
        email: u.email,
        created_at: u.created_at
    }));
    res.json(safeUsers);
});

app.get("/api/admin/history", (req, res) => {
    res.json(examHistory);
});

// Root endpoint
app.get("/", (req, res) => {
    res.send("🎉 Exam Pro API is running! Use /api/test to verify.");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📚 Questions loaded for 6 subjects with 3 levels each`);
});