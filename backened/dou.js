// const express = require('express');
// const router = express.Router();
// const mongoose = require('mongoose');
// const axios = require('axios');

// const requireAuth = (req, res, next) => {
//   if (!req.session.user) return res.status(401).json({ message: "Unauthorized" });
//   next();
// };

// const searchHistorySchema = new mongoose.Schema({
//   userEmail: { type: String, required: true, index: true },
//   query: { type: String, required: true },
//   createdAt: { type: Date, default: Date.now }
// });
// const SearchHistory = mongoose.model('SearchHistory', searchHistorySchema);

// router.post('/search', requireAuth, async (req, res) => {
//   try {
//     let { query } = req.body;
//     query = query?.trim();
//     if (!query || query.length < 2) {
//       return res.status(400).json({ message: "Query must be at least 2 characters" });
//     }
//     if (query.length > 300) {
//       return res.status(400).json({ message: "Query must be under 300 characters" });
//     }

//     const normQuery = query.toLowerCase();
//     await new SearchHistory({
//       userEmail: req.session.user.email,
//       query: normQuery
//     }).save();

//     const completion = await axios.post(
//       'https://openrouter.ai/api/v1/chat/completions',
//       {
//         model: "openai/gpt-3.5-turbo",
//         messages: [
//           { role: "system", content: "You are a study assistant." },
//           { role: "user", content: `Provide concise information about: ${normQuery}` }
//         ],
//         max_tokens: 500
//       },
//       {
//         headers: {
//           'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
//           'Content-Type': 'application/json'
//         }
//       }
//     );

//     const response = completion.data.choices[0].message.content;
//     res.json({ query: normQuery, response });
//   } catch (err) {
//     console.error("AI search error:", {
//       message: err.message,
//       stack: err.stack,
//       requestBody: req.body
//     });
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

// router.get('/history', requireAuth, async (req, res) => {
//   try {
//     const history = await SearchHistory.find({ userEmail: req.session.user.email })
//       .sort({ createdAt: -1 })
//       .limit(20)
//       .select('query createdAt -_id');
//     res.json(history);
//   } catch (err) {
//     console.error("Error fetching history:", err);
//     res.status(500).json({ message: "Failed to fetch history" });
//   }
// });

// module.exports = router;

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const axios = require('axios');

const requireAuth = (req, res, next) => {
  if (!req.session.user) return res.status(401).json({ message: "Unauthorized" });
  next();
};

const searchHistorySchema = new mongoose.Schema({
  userEmail: { type: String, required: true, index: true },
  query: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const SearchHistory = mongoose.model('SearchHistory', searchHistorySchema);

// SEARCH
router.post('/search', requireAuth, async (req, res) => {
  try {
    let { query } = req.body;
    query = query?.trim();
    if (!query || query.length < 2) return res.status(400).json({ message: "Query too short" });
    if (query.length > 300) return res.status(400).json({ message: "Query too long" });

    const normQuery = query.toLowerCase();
    await new SearchHistory({ userEmail: req.session.user.email, query: normQuery }).save();

    const completion = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: "deepseek/deepseek-r1-0528:free",
        messages: [
          { role: "system", content: "You are a study assistant." },
          { role: "user", content: `Provide concise information about: ${normQuery}` }
        ],
        max_tokens: 500
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const response = completion.data.choices[0].message.content;
    res.json({ query: normQuery, response });
  } catch (err) {
    console.error("AI search error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET HISTORY
router.get('/history', requireAuth, async (req, res) => {
  try {
    const history = await SearchHistory.find({ userEmail: req.session.user.email })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('_id query createdAt');
    res.json(history);
  } catch (err) {
    console.error("Fetch history error:", err);
    res.status(500).json({ message: "Failed to fetch history" });
  }
});

// DELETE ONE
router.delete('/history/:id', requireAuth, async (req, res) => {
  try {
    const result = await SearchHistory.deleteOne({ _id: req.params.id, userEmail: req.session.user.email });
    if (result.deletedCount === 0) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Failed to delete" });
  }
});

// DELETE ALL
router.delete('/history', requireAuth, async (req, res) => {
  try {
    await SearchHistory.deleteMany({ userEmail: req.session.user.email });
    res.json({ message: "All history deleted" });
  } catch (err) {
    console.error("Delete all error:", err);
    res.status(500).json({ message: "Failed to delete all history" });
  }
});

module.exports = router;
