// login.js
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const { OAuth2Client } = require("google-auth-library");

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    unique: true,
    required: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    minlength: 8,
    select: false
  },
  googleId: String,
  username: { 
    type: String, 
    unique: true,
    required: true,
    trim: true,
    minlength: 3
  },
}, { 
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.googleId;
      return ret;
    }
  }
});

const User = mongoose.model("User", userSchema);

const userActivitySchema = new mongoose.Schema({
  userEmail: { 
    type: String, 
    required: true,
    trim: true,
    lowercase: true,
    index: true
  },
  action: { 
    type: String, 
    enum: ['signup', 'login', 'google-login', 'logout'], 
    required: true 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
});

const UserActivity = mongoose.model("UserActivity", userActivitySchema);

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendWelcomeEmail(toEmail) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject: "Welcome to Semester Planner App!",
      html: `
        <h1>Welcome to Semester Planner!</h1>
        <p>Thank you for registering. We're excited to help you organize your academic journey.</p>
        <p>Get started by adding your first subject to track your progress.</p>
      `
    });
  } catch (err) {
    console.error("Error sending email:", err);
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

module.exports = function(app, authLimiter) {
  app.post("/signup", authLimiter, async (req, res) => {
    try {
      const { email, password, confirmPassword, username } = req.body;

      if (!email || !password || !confirmPassword || !username) {
        return res.status(400).json({ 
          message: "All fields are required",
          fields: { email: !email, password: !password, confirmPassword: !confirmPassword, username: !username }
        });
      }

      if (!isValidEmail(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match" });
      }

      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      const existingUser = await User.findOne({ 
        $or: [
          { email: email.toLowerCase() }, 
          { username: username.toLowerCase() }
        ] 
      });

      if (existingUser) {
        const errors = {};
        if (existingUser.email === email.toLowerCase()) errors.email = "Email already in use";
        if (existingUser.username === username.toLowerCase()) errors.username = "Username already taken";
        return res.status(400).json({ 
          message: "User already exists",
          errors
        });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const newUser = new User({ 
        email: email.toLowerCase(),
        password: hashedPassword,
        username: username.toLowerCase()
      });

      await newUser.save();
      await UserActivity.create({ userEmail: email.toLowerCase(), action: 'signup' });
      await sendWelcomeEmail(email);

      // Set session after successful signup
      req.session.user = {
  _id: newUser._id,  // ✅ Important for `req.userId`
  email: newUser.email,
  username: newUser.username
};


      res.status(201).json({ 
        message: "User registered successfully",
        user: {
          email: newUser.email,
          username: newUser.username
        }
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ 
        message: "An error occurred during registration",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  app.post("/login", authLimiter, async (req, res) => {
    try {
      const { identifier, password } = req.body;

      if (!identifier || !password) {
        return res.status(400).json({ 
          message: "Email/username and password are required"
        });
      }

      const user = await User.findOne({
        $or: [
          { email: identifier.toLowerCase() },
          { username: identifier.toLowerCase() }
        ]
      }).select('+password');

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!user.password) {
        return res.status(400).json({ 
          message: "Account uses Google login",
          suggestion: "Please sign in with Google"
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      await UserActivity.create({ userEmail: user.email, action: 'login' });

      // Set session after successful login
req.session.user = {
  _id: user._id,  // ✅ Needed
  email: user.email,
  username: user.username
};


      res.json({ 
        message: "Login successful",
        user: {
          email: user.email,
          username: user.username
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ 
        message: "An error occurred during login",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  app.post("/google-login", authLimiter, async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ message: "Google token is required" });
      }

      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const { email, sub: googleId, name } = ticket.getPayload();
      if (!email) {
        return res.status(400).json({ message: "Email not found in Google token" });
      }

      let user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        user = new User({
          email: email.toLowerCase(),
          googleId,
          username: email.split('@')[0].toLowerCase()
        });
        await user.save();
        await sendWelcomeEmail(email);
      }

      await UserActivity.create({ userEmail: email.toLowerCase(), action: 'google-login' });

      // Set session after successful Google login
req.session.user = {
  _id: user._id,  // ✅ Needed
  email: user.email,
  username: user.username
};

      res.json({ 
        message: "Google login successful",
        user: {
          email: user.email,
          username: user.username
        }
      });
    } catch (error) {
      console.error("Google login error:", error);
      res.status(401).json({ 
        message: "Invalid Google token",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  app.post("/logout", authLimiter, async (req, res) => {
    try {
      if (req.session.user) {
        await UserActivity.create({ 
          userEmail: req.session.user.email, 
          action: 'logout' 
        });
      }

      req.session.destroy(err => {
        if (err) {
          console.error("Error destroying session:", err);
          return res.status(500).json({ message: "Logout failed" });
        }
        res.clearCookie('connect.sid');
        res.json({ message: "Logout successful" });
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ 
        message: "An error occurred during logout",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  app.get("/check-auth", (req, res) => {
    if (req.session.user) {
      res.json({ 
        isAuthenticated: true,
        user: req.session.user
      });
    } else {
      res.json({ isAuthenticated: false });
    }
  });
};