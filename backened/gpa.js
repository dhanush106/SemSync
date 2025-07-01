const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// Rename Subject model to GPA
const GPA = mongoose.model("GPA", new mongoose.Schema({
  userEmail: { type: String, required: true },
  name: { type: String, required: true },
  grade: { type: String, required: true },
  credits: { type: Number, required: true }
}));

const GPALog = mongoose.model("GPALog", new mongoose.Schema({
  userEmail: { type: String, required: true },
  gpa: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}));

const requireAuth = (req, res, next) => {
  if (!req.session?.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
};

// Fetch GPA entries
router.get('/get-subjects', requireAuth, async (req, res) => {
  const subjects = await GPA.find({ userEmail: req.session.user.email });
  res.json({ subjects });
});

// Save/update GPA subjects and GPA value
router.post('/save-subjects', requireAuth, async (req, res) => {
  const { subjects, gpa } = req.body;
  await GPA.deleteMany({ userEmail: req.session.user.email });
  await GPA.insertMany(subjects.map(sub => ({ ...sub, userEmail: req.session.user.email })));
  if (gpa) {
    await GPALog.create({ userEmail: req.session.user.email, gpa });
  }
  res.json({ message: "Saved" });
});

module.exports = router;
