const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const subjectSchema = new mongoose.Schema({
  userEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Subject name is required'],
    trim: true,
    minlength: [2, 'Subject name must be at least 2 characters'],
    maxlength: [100, 'Subject name cannot exceed 100 characters']
  },
  code: {
    type: String,
    required: [true, 'Subject code is required'],
    uppercase: true,
    trim: true,
    minlength: [2, 'Subject code must be at least 2 characters'],
    maxlength: [20, 'Subject code cannot exceed 20 characters']
  },
  credits: {
    type: Number,
    required: true,
    min: [1, 'Credits cannot be less than 1'],
    max: [10, 'Credits cannot exceed 10'],
    default: 3
  },
  targetGrade: {
    type: String,
    required: true,
    enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'],
    default: 'A'
  },
  currentGrade: {
    type: String,
    enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F', ''],
    default: ''
  },
  color: {
    type: String,
    default: '#E4E1FF',
    validate: {
      validator: function(v) {
        return /^#[0-9A-F]{6}$/i.test(v);
      },
      message: props => `${props.value} is not a valid hex color`
    }
  },
  tasks: [{
    text: {
      type: String,
      required: true,
      trim: true,
      minlength: [2, 'Task text must be at least 2 characters'],
      maxlength: [200, 'Task text cannot exceed 200 characters']
    },
    completed: {
      type: Boolean,
      default: false
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for progress calculation
subjectSchema.virtual('progress').get(function() {
  if (!this.tasks || this.tasks.length === 0) return 0;
  const completed = this.tasks.filter(t => t.completed).length;
  return Math.round((completed / this.tasks.length) * 100);
});

const Subject = mongoose.model('Subject', subjectSchema);

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// Get all subjects for the logged-in user
router.get('/', requireAuth, async (req, res) => {
  try {
    const subjects = await Subject.find({ userEmail: req.session.user.email })
                                .sort({ createdAt: -1 });
    res.json(subjects);
  } catch (err) {
    console.error("Error fetching subjects:", err);
    res.status(500).json({ 
      message: "Failed to fetch subjects",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Create new subject
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, code, credits, targetGrade, currentGrade, color, tasks } = req.body;
    
    if (!name || !code || !credits || !targetGrade) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const subjectData = {
      userEmail: req.session.user.email,
      name,
      code,
      credits,
      targetGrade,
      currentGrade: currentGrade || '',
      color: color || '#E4E1FF',
      tasks: tasks || [{ text: "Topic 1", completed: false }]
    };

    const subject = new Subject(subjectData);
    const savedSubject = await subject.save();
    res.status(201).json(savedSubject);
  } catch (err) {
    console.error("Error creating subject:", err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        message: "Validation failed",
        errors: Object.values(err.errors).map(e => e.message)
      });
    }
    res.status(500).json({ 
      message: "Failed to create subject",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Update subject
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const existingSubject = await Subject.findOne({ 
      _id: id,
      userEmail: req.session.user.email
    });

    if (!existingSubject) {
      return res.status(404).json({ message: "Subject not found or unauthorized" });
    }

    const subject = await Subject.findByIdAndUpdate(id, updates, { 
      new: true,
      runValidators: true
    });
    res.json(subject);
  } catch (err) {
    console.error("Error updating subject:", err);
    res.status(500).json({ 
      message: "Failed to update subject",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Delete subject
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const subject = await Subject.findOneAndDelete({ 
      _id: id,
      userEmail: req.session.user.email
    });
    
    if (!subject) {
      return res.status(404).json({ message: "Subject not found or unauthorized" });
    }

    res.json({ message: "Subject deleted successfully" });
  } catch (err) {
    console.error("Error deleting subject:", err);
    res.status(500).json({ 
      message: "Failed to delete subject",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Add task to subject
router.post('/:id/tasks', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ message: "Task text is required" });
    }

    const subject = await Subject.findOne({ 
      _id: id,
      userEmail: req.session.user.email
    });
    
    if (!subject) {
      return res.status(404).json({ message: "Subject not found or unauthorized" });
    }

    subject.tasks.push({ text, completed: false });
    await subject.save();

    res.status(201).json(subject);
  } catch (err) {
    console.error("Error adding task:", err);
    res.status(500).json({ 
      message: "Failed to add task",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Update task
router.put('/:id/tasks/:taskId', requireAuth, async (req, res) => {
  try {
    const { id, taskId } = req.params;
    const { completed, text } = req.body;

    const subject = await Subject.findOne({ 
      _id: id,
      userEmail: req.session.user.email
    });
    
    if (!subject) {
      return res.status(404).json({ message: "Subject not found or unauthorized" });
    }

    const task = subject.tasks.id(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (typeof completed !== 'undefined') task.completed = completed;
    if (text) task.text = text;

    await subject.save();
    res.json(subject);
  } catch (err) {
    console.error("Error updating task:", err);
    res.status(500).json({ 
      message: "Failed to update task",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Delete task
router.delete('/:id/tasks/:taskId', requireAuth, async (req, res) => {
  try {
    const { id, taskId } = req.params;

    const subject = await Subject.findOne({ 
      _id: id,
      userEmail: req.session.user.email
    });
    
    if (!subject) {
      return res.status(404).json({ message: "Subject not found or unauthorized" });
    }

    const task = subject.tasks.id(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    task.remove();
    await subject.save();
    res.json(subject);
  } catch (err) {
    console.error("Error deleting task:", err);
    res.status(500).json({ 
      message: "Failed to delete task",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;