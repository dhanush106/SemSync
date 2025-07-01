const express = require('express');
const router = express.Router();
const axios = require('axios');
const mongoose = require('mongoose');

// Quiz History Model
const QuizHistory = mongoose.model('QuizHistory', new mongoose.Schema({
   user: { type: String, required: true },
  topic: { type: String, required: true },
  score: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  timeTaken: { type: Number, required: true },
  totalTime: { type: Number, required: true },
  date: { type: Date, default: Date.now },
}));

// Auth Middleware
const requireAuth = (req, res, next) => {
  if (!req.session?.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
};

// 🐱 Route: Generate Quiz Questions
router.post('/generate', requireAuth, async (req, res) => {
  try {
    const { topic, numQuestions } = req.body;

    const completion = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: "deepseek/deepseek-r1-0528:free",
        messages: [
          {
            role: "system",
            content: "You are a quiz generator. Provide questions with 4 options and the correct answer."
          },
          {
            role: "user",
            content: `Generate ${numQuestions} multiple choice questions about ${topic}. Format each question like this:
Q: [question]
A) [option1]
B) [option2]
C) [option3]
D) [option4]
Correct: [letter]`
          }
        ],
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const quizContent = completion.data.choices[0]?.message?.content;
    const questions = parseQuizQuestions(quizContent);

    res.json({ success: true, questions });
  } catch (error) {
    console.error('Error generating quiz:', error?.response?.data || error.message);
    res.status(500).json({ success: false, error: 'Failed to generate quiz' });
  }
});

// 🐱 Route: Save Quiz History
router.post('/save-history', requireAuth, async (req, res) => {
  try {
    const { topic, score, totalQuestions, timeTaken, totalTime } = req.body;

    if (
      typeof topic !== 'string' ||
      typeof score !== 'number' ||
      typeof totalQuestions !== 'number' ||
      typeof timeTaken !== 'number' ||
      typeof totalTime !== 'number'
    ) {
      return res.status(400).json({ success: false, error: 'Invalid request data' });
    }

    const history = new QuizHistory({
      user:  req.session.user.email,
      topic,
      score,
      totalQuestions,
      timeTaken,
      totalTime,
    });

    await history.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving history:', error);
    res.status(500).json({ success: false, error: 'Failed to save history' });
  }
});

// 🐱 Route: Get Quiz History
router.get('/history', requireAuth, async (req, res) => {
  try {
    const history = await QuizHistory.find({ user: req.session.user.email, })
      .sort({ date: -1 })
      .limit(5);
    res.json({ success: true, history });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
});

// 🐱 Helper: Parse Quiz Questions
function parseQuizQuestions(content) {
  const questionBlocks = content.split('\n\n').filter(block => block.trim() !== '');
  const questions = [];

  for (const block of questionBlocks) {
    const lines = block.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 6) continue;

    const answerLetter = lines[5].split(': ')[1]?.trim();
    const index = answerLetter.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);

    const question = {
      text: lines[0].replace('Q: ', ''),
      options: [
        lines[1].substring(3), // A
        lines[2].substring(3), // B
        lines[3].substring(3), // C
        lines[4].substring(3), // D
      ],
      correctAnswer: index, // 👉 Store as number (0–3) for easy comparison
    };
    questions.push(question);
  }

  return questions;
}

module.exports = router;

