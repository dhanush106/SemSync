const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const session = require("express-session");
const MongoStore = require("connect-mongo");


// Required env variables check
const requiredEnvVars = [
  'MONGO_URI',
  'GOOGLE_CLIENT_ID',
  'EMAIL_USER',
  'EMAIL_PASS',
  'SESSION_SECRET',
  'OPENROUTER_API_KEY'
];
for (const v of requiredEnvVars) {
  if (!process.env[v]) {
    console.error(`Missing env var ${v}`);
    process.exit(1);
  }
}

const app = express();

// ✅ Add this line
app.set('trust proxy', 1);

app.use(cors({
  origin: 'https://semsync-7pz3.onrender.com',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  keyGenerator: req => req.session.user?.email || req.ip,
  message: 'Too many AI requests, please try again later'
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    require("./login")(app, authLimiter);

    const subjectsRouter = require('./subjects');
    app.use('/api/subjects', subjectsRouter);

    const aiSearchRouter = require('./dou');
    app.use('/api/ai', aiLimiter, aiSearchRouter);
    const calendarRouter = require('./calendar');
    app.use('/api/calendar', calendarRouter);
// In server.js, after other route imports:
const quizRouter = require('./qui');
app.use('/api/quiz', quizRouter);
const gpatrackerRouter = require('./gpa');
app.use('/api',gpatrackerRouter);


// Remove the duplicate QuizHistory model definition if you had it
  })
  .catch(err => console.error("DB connection error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

