const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Define the Task schema
const taskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  task: { type: String, required: true, trim: true },
  date: { type: String, required: true, index: true },
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Define the Journal schema
const journalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  date: { type: String, required: true, index: true },
  feeling: { type: String, enum: ['Good', 'Okay', 'Bad'], default: 'Good' },
  productivity: { type: Number, min: 1, max: 10, default: 5 },
  studyHours: { type: Number, min: 0, default: 0 },
  content: { type: String, default: '', trim: true },
  updatedAt: { type: Date, default: Date.now }
});

// Create models
const Task = mongoose.model('Task', taskSchema);
const Journal = mongoose.model('Journal', journalSchema);

// Middleware to check if user is authenticated
const authenticate = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.userId = req.session.user._id; // Attach userId to request
  next();
};

// API routes with consistent prefix
const API_PREFIX = '';

// Get all tasks for a specific date
router.get(`${API_PREFIX}/tasks/:date`, authenticate, async (req, res) => {
  try {
    const dateStr = new Date(req.params.date).toDateString();
    if (isNaN(new Date(dateStr).getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const tasks = await Task.find({
      userId: req.userId,
      date: dateStr
    }).sort({ createdAt: 1 });
    
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Create a new task
router.post(`${API_PREFIX}/tasks`, authenticate, async (req, res) => {
  try {
    const { task, date } = req.body;
    
    if (!task || !task.trim()) {
      return res.status(400).json({ error: 'Task is required' });
    }

    const dateStr = new Date(date).toDateString();
    if (isNaN(new Date(dateStr).getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    
    const newTask = new Task({
      userId: req.userId,
      task: task.trim(),
      date: dateStr,
      completed: false
    });
    
    await newTask.save();
    res.status(201).json(newTask);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task completion status
router.put(`${API_PREFIX}/tasks/:id/complete`, authenticate, async (req, res) => {
  try {
    const { completed } = req.body;
    if (typeof completed !== 'boolean') {
      return res.status(400).json({ error: 'Invalid completion status' });
    }

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { completed },
      { new: true }
    );
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete a task
router.delete(`${API_PREFIX}/tasks/:id`, authenticate, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Get journal entry for a specific date
router.get(`${API_PREFIX}/journal/:date`, authenticate, async (req, res) => {
  try {
    const dateStr = new Date(req.params.date).toDateString();
    if (isNaN(new Date(dateStr).getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const journal = await Journal.findOne({
      userId: req.userId,
      date: dateStr
    });
    
    if (!journal) {
      return res.json({
        feeling: 'Good',
        productivity: 5,
        studyHours: 0,
        content: ''
      });
    }
    
    res.json(journal);
  } catch (error) {
    console.error('Error fetching journal:', error);
    res.status(500).json({ error: 'Failed to fetch journal' });
  }
});

// Save or update journal entry
router.post(`${API_PREFIX}/journal`, authenticate, async (req, res) => {
  try {
    const { date, feeling, productivity, studyHours, content } = req.body;
    
    const dateStr = new Date(date).toDateString();
    if (isNaN(new Date(dateStr).getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    if (!['Good', 'Okay', 'Bad'].includes(feeling)) {
      return res.status(400).json({ error: 'Invalid feeling value' });
    }

    const prodNum = Number(productivity);
    if (isNaN(prodNum) || prodNum < 1 || prodNum > 10) {
      return res.status(400).json({ error: 'Productivity must be between 1-10' });
    }

    const hoursNum = Number(studyHours);
    if (isNaN(hoursNum) || hoursNum < 0) {
      return res.status(400).json({ error: 'Study hours must be a positive number' });
    }

    const journal = await Journal.findOneAndUpdate(
      { userId: req.userId, date: dateStr },
      { 
        feeling,
        productivity: prodNum,
        studyHours: hoursNum,
        content: content?.trim() || '',
        updatedAt: Date.now() 
      },
      { new: true, upsert: true }
    );
    
    res.json(journal);
  } catch (error) {
    console.error('Error saving journal:', error);
    res.status(500).json({ error: 'Failed to save journal' });
  }
});

// Get calendar data for a month
router.get(`${API_PREFIX}/month/:year/:month`, authenticate, async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    
    if (isNaN(year) || isNaN(month) || month < 0 || month > 11) {
      return res.status(400).json({ error: 'Invalid year or month' });
    }
    
    const startDate = new Date(year, month, 1).toDateString();
    const endDate = new Date(year, month + 1, 0).toDateString();
    
    const [tasks, journals] = await Promise.all([
      Task.find({
        userId: req.userId,
        date: { $gte: startDate, $lte: endDate }
      }),
      Journal.find({
        userId: req.userId,
        date: { $gte: startDate, $lte: endDate }
      })
    ]);
    
    const response = {
      tasks: tasks.reduce((acc, task) => {
        if (!acc[task.date]) acc[task.date] = [];
        acc[task.date].push(task);
        return acc;
      }, {}),
      journals: journals.reduce((acc, journal) => {
        acc[journal.date] = journal;
        return acc;
      }, {})
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching month data:', error);
    res.status(500).json({ error: 'Failed to fetch calendar data' });
  }
});

module.exports = router;