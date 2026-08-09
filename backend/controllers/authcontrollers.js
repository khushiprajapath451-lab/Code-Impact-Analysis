import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.js';
import { sendPasswordResetEmail } from '../Services/emailService.js';

// In-memory fallback user store for development when MongoDB is not connected
const memoryUserStore = new Map();
// Reset code store: email -> { code, expiresAt }
const resetCodeStore = new Map();

export const registerUser = async (req, res) => {
  try {
    const { username, name, email, password } = req.body;
    const finalUsername = username || name;

    if (!finalUsername || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    if (mongoose.connection.readyState === 1) {
      const existingUser = await User.findOne({ email: cleanEmail });
      if (existingUser) return res.status(400).json({ error: 'User with this email already exists' });
    } else if (memoryUserStore.has(cleanEmail)) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let userId = 'user_' + Date.now();

    if (mongoose.connection.readyState === 1) {
      const user = new User({ username: finalUsername, email: cleanEmail, password: hashedPassword });
      await user.save();
      userId = user._id;
    } else {
      memoryUserStore.set(cleanEmail, { id: userId, username: finalUsername, email: cleanEmail, password: hashedPassword });
    }

    const jwtSecret = process.env.JWT_SECRET || 'default_jwt_secret_dev';
    const token = jwt.sign({ id: userId }, jwtSecret, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: userId, username: finalUsername, email: cleanEmail } });
  } catch (err) {
    console.error('Error in registerUser:', err);
    res.status(500).json({ error: err.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    let user = null;

    if (mongoose.connection.readyState === 1) {
      user = await User.findOne({ email: cleanEmail });
    } else {
      user = memoryUserStore.get(cleanEmail);
    }

    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const jwtSecret = process.env.JWT_SECRET || 'default_jwt_secret_dev';
    const token = jwt.sign({ id: user._id || user.id }, jwtSecret, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id || user.id, username: user.username || user.name, email: user.email } });
  } catch (err) {
    console.error('Error in loginUser:', err);
    res.status(500).json({ error: err.message });
  }
};

export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    
    // Generate a secure 6-digit OTP reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000;
    resetCodeStore.set(cleanEmail, { code: resetCode, expiresAt });

    // Send the code via email (nodemailer)
    const emailResult = await sendPasswordResetEmail(cleanEmail, resetCode);

    const isDevMode = !process.env.EMAIL_USER;
    if (isDevMode) {
      console.log(`\n========================================`);
      console.log(`🔑 [DEV MODE] PASSWORD RESET OTP:`);
      console.log(`📧 User: ${cleanEmail}`);
      console.log(`🔢 OTP Code: ${resetCode}`);
      console.log(`========================================\n`);
    }

    res.json({
      message: `A 6-digit password reset verification code has been sent to ${cleanEmail}. Please check your email inbox.`,
      email: cleanEmail,
      expiresInMinutes: 15,
      devOtp: isDevMode ? resetCode : undefined
    });
  } catch (err) {
    console.error('Error in requestPasswordReset:', err);
    res.status(500).json({ error: err.message || 'Failed to dispatch password reset email.' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, resetCode, newPassword } = req.body;
    if (!email || !resetCode || !newPassword) {
      return res.status(400).json({ error: 'Email, verification code, and new password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const storedReset = resetCodeStore.get(cleanEmail);

    if (!storedReset || storedReset.code !== resetCode.trim()) {
      return res.status(400).json({ error: 'Invalid verification code. Please check the code sent to your email.' });
    }

    if (Date.now() > storedReset.expiresAt) {
      resetCodeStore.delete(cleanEmail);
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    if (mongoose.connection.readyState === 1) {
      let user = await User.findOne({ email: cleanEmail });
      if (user) {
        user.password = hashedPassword;
        await user.save();
      } else {
        user = new User({ username: cleanEmail.split('@')[0], email: cleanEmail, password: hashedPassword });
        await user.save();
      }
    } else {
      let memoryUser = memoryUserStore.get(cleanEmail);
      if (memoryUser) {
        memoryUser.password = hashedPassword;
        memoryUserStore.set(cleanEmail, memoryUser);
      } else {
        memoryUserStore.set(cleanEmail, {
          id: 'user_' + Date.now(),
          username: cleanEmail.split('@')[0],
          email: cleanEmail,
          password: hashedPassword
        });
      }
    }

    // Clean up reset code after successful reset
    resetCodeStore.delete(cleanEmail);

    res.json({ message: 'Password has been reset successfully! You can now log in.' });
  } catch (err) {
    console.error('Error in resetPassword:', err);
    res.status(500).json({ error: err.message });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    let totalUsers = 0;
    if (mongoose.connection.readyState === 1) {
      totalUsers = await User.countDocuments();
    } else {
      totalUsers = memoryUserStore.size;
    }
    res.json({ totalUsers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};