import { User } from '../models/User.js';
import { sendEmailNotification } from '../services/notificationService.js';

// OTP storage for registration email verification: email -> { otp, expiresAt, name }
const registrationOTPs = new Map();

// In-Memory User Registry Fallback
const inMemoryUsers = [
  {
    id: 'usr-1',
    name: 'Abhiram Sadgun',
    email: 'abhiram@impactiq.ai',
    password: 'password123',
    role: 'Senior Staff Engineer',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    githubUsername: 'abhiramsadgun94',
    jiraUsername: 'abhiram@impactiq.ai',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr-2',
    name: 'Alex Rivera',
    email: 'developer@impactiq.ai',
    password: 'password123',
    role: 'Full Stack Developer',
    avatar: '',
    githubUsername: 'alexrivera',
    jiraUsername: 'alex@impactiq.ai',
    createdAt: new Date().toISOString(),
  },
];

let currentUser = inMemoryUsers[0];

/**
 * POST /api/auth/send-registration-otp
 * Validates email uniqueness and dispatches a 6-digit verification OTP.
 */
export const handleSendRegistrationOTP = async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if account already exists
    const existingInMemory = inMemoryUsers.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (existingInMemory) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    try {
      const existingInDb = await User.findOne({ email: normalizedEmail });
      if (existingInDb) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }
    } catch {
      // DB check fallback
    }

    // Generate secure 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes TTL

    registrationOTPs.set(normalizedEmail, {
      otp,
      expiresAt,
      name: name || 'Developer',
    });

    console.log(`\n========================================`);
    console.log(`🔑 [ImpactIQ Registration OTP]`);
    console.log(`📧 Recipient: ${normalizedEmail}`);
    console.log(`🔢 Code:      ${otp}`);
    console.log(`⏰ Valid for: 10 minutes`);
    console.log(`========================================\n`);

    // Dispatch branded HTML email via SMTP / Nodemailer
    const emailSubject = `ImpactIQ - Your Verification Code: ${otp}`;
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0F172A; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); padding: 32px; color: #FFFFFF;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 24px;">
          <div style="background: linear-gradient(135deg, #6366F1, #8B5CF6); width: 38px; height: 38px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; color: #FFF; text-align: center; line-height: 38px;">
            IQ
          </div>
          <span style="font-size: 20px; font-weight: 800; color: #FFFFFF; margin-left: 10px;">Impact<span style="color: #818CF8;">IQ</span></span>
        </div>
        <h2 style="font-size: 22px; font-weight: 700; margin: 0 0 12px 0; color: #FFFFFF;">Verify Your Email Address</h2>
        <p style="color: #94A3B8; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
          Hi ${name || 'Developer'}, welcome to ImpactIQ! Enter the 6-digit verification code below to confirm your email and activate your workspace.
        </p>
        <div style="background: #1E293B; border: 1px solid #334155; border-radius: 12px; padding: 18px 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #818CF8; font-family: monospace;">${otp}</span>
        </div>
        <p style="color: #64748B; font-size: 12px; line-height: 1.5; margin: 0;">
          This code expires in 10 minutes. If you did not request this account, you can safely ignore this email.
        </p>
      </div>
    `;

    // Attempt sending email asynchronously
    sendEmailNotification(normalizedEmail, emailSubject, emailHtml).catch((err) => {
      console.warn('[Auth OTP Email Warning]:', err.message);
    });

    return res.status(200).json({
      message: 'Verification code sent to ' + normalizedEmail,
      email: normalizedEmail,
    });
  } catch (error) {
    console.error('Send Registration OTP Error:', error);
    return res.status(500).json({ error: 'Failed to generate registration verification code.' });
  }
};

/**
 * POST /api/auth/verify-and-register
 * Verifies submitted 6-digit OTP and finalizes user account creation.
 */
export const handleVerifyAndRegister = async (req, res) => {
  try {
    const { name, email, password, role, otp } = req.body;

    if (!name || !email || !password || !otp) {
      return res.status(400).json({ error: 'Name, email, password, and verification OTP are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    const storedData = registrationOTPs.get(normalizedEmail);

    if (!storedData) {
      return res.status(400).json({ error: 'No pending OTP verification found for this email. Please request a new code.' });
    }

    if (Date.now() > storedData.expiresAt) {
      registrationOTPs.delete(normalizedEmail);
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    if (storedData.otp !== cleanOtp) {
      return res.status(400).json({ error: 'Invalid verification code. Please check the code and try again.' });
    }

    // OTP Verified! Clear pending record
    registrationOTPs.delete(normalizedEmail);

    // Create User
    const newUser = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: role || 'Software Engineer',
      avatar: '',
      isEmailVerified: true,
      createdAt: new Date().toISOString(),
    };

    inMemoryUsers.push(newUser);
    currentUser = newUser;

    // Persist to MongoDB if connected
    try {
      await User.create({
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
      });
    } catch {
      // In-memory fallback
    }

    return res.status(201).json({
      message: 'Email verified and account registered successfully.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        avatar: newUser.avatar,
      },
      token: `jwt-mock-${newUser.id}`,
    });
  } catch (error) {
    console.error('Verify & Register Error:', error);
    return res.status(500).json({ error: 'Failed to verify OTP and complete registration.' });
  }
};

/**
 * POST /api/auth/forgot-password
 * Dispatches a 6-digit password recovery OTP.
 */
export const handleForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    registrationOTPs.set(`reset_${normalizedEmail}`, {
      otp,
      expiresAt,
    });

    console.log(`\n========================================`);
    console.log(`🔒 [ImpactIQ Password Reset OTP]`);
    console.log(`📧 Recipient: ${normalizedEmail}`);
    console.log(`🔢 Code:      ${otp}`);
    console.log(`⏰ Valid for: 10 minutes`);
    console.log(`========================================\n`);

    const emailSubject = `ImpactIQ - Password Reset Code: ${otp}`;
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0F172A; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); padding: 32px; color: #FFFFFF;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 24px;">
          <div style="background: linear-gradient(135deg, #6366F1, #8B5CF6); width: 38px; height: 38px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; color: #FFF; text-align: center; line-height: 38px;">
            IQ
          </div>
          <span style="font-size: 20px; font-weight: 800; color: #FFFFFF; margin-left: 10px;">Impact<span style="color: #818CF8;">IQ</span></span>
        </div>
        <h2 style="font-size: 22px; font-weight: 700; margin: 0 0 12px 0; color: #FFFFFF;">Password Recovery</h2>
        <p style="color: #94A3B8; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
          We received a request to reset your password. Use the 6-digit recovery code below:
        </p>
        <div style="background: #1E293B; border: 1px solid #334155; border-radius: 12px; padding: 18px 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #818CF8; font-family: monospace;">${otp}</span>
        </div>
        <p style="color: #64748B; font-size: 12px; line-height: 1.5; margin: 0;">
          This code expires in 10 minutes. If you did not request a password reset, please ignore this email.
        </p>
      </div>
    `;

    sendEmailNotification(normalizedEmail, emailSubject, emailHtml).catch((err) => {
      console.warn('[Forgot Password Email Warning]:', err.message);
    });

    return res.status(200).json({
      message: 'Password reset code sent to ' + normalizedEmail,
      email: normalizedEmail,
    });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    return res.status(500).json({ error: 'Failed to process password reset request.' });
  }
};

/**
 * POST /api/auth/reset-password
 * Verifies recovery OTP and updates password.
 */
export const handleResetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP code, and new password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const stored = registrationOTPs.get(`reset_${normalizedEmail}`);

    if (!stored) {
      return res.status(400).json({ error: 'No active password reset request found. Please request a new code.' });
    }

    if (Date.now() > stored.expiresAt) {
      registrationOTPs.delete(`reset_${normalizedEmail}`);
      return res.status(400).json({ error: 'Reset code has expired. Please request a new code.' });
    }

    if (stored.otp !== String(otp).trim()) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    // OTP Verified
    registrationOTPs.delete(`reset_${normalizedEmail}`);

    // Update in MongoDB
    try {
      const updated = await User.findOneAndUpdate(
        { email: normalizedEmail },
        { $set: { password: newPassword } },
        { new: true, upsert: true }
      );
      if (updated && !inMemoryUsers.some((u) => u.email.toLowerCase() === normalizedEmail)) {
        inMemoryUsers.push({
          id: updated._id.toString(),
          name: updated.name || 'Developer',
          email: normalizedEmail,
          password: newPassword,
          role: updated.role || 'Senior Developer',
          avatar: '',
        });
      }
    } catch {
      // fallback
    }

    // Update in-memory user
    const memUser = inMemoryUsers.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (memUser) {
      memUser.password = newPassword;
    } else {
      inMemoryUsers.push({
        id: `usr-${Date.now()}`,
        name: 'Developer',
        email: normalizedEmail,
        password: newPassword,
        role: 'Senior Developer',
        avatar: '',
      });
    }

    return res.status(200).json({ message: 'Password has been successfully updated.' });
  } catch (error) {
    console.error('Reset Password Error:', error);
    return res.status(500).json({ error: 'Failed to reset password.' });
  }
};

export const handleRegister = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingInMemory = inMemoryUsers.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (existingInMemory) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const newUser = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: role || 'Software Engineer',
      avatar: '',
      createdAt: new Date().toISOString(),
    };

    inMemoryUsers.push(newUser);
    currentUser = newUser;

    // Try saving to DB if connected
    try {
      const dbDoc = await User.create({ name: newUser.name, email: newUser.email, password: newUser.password, role: newUser.role });
      if (dbDoc && dbDoc._id) {
        newUser.id = dbDoc._id.toString();
      }
    } catch {
      // Fall back safely to in-memory user
    }

    return res.status(201).json({
      message: 'Registration successful',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        avatar: newUser.avatar,
      },
      token: `jwt-mock-${newUser.id}`,
    });
  } catch (error) {
    console.error('Register Error:', error);
    return res.status(500).json({ error: 'Failed to register account.' });
  }
};

export const handleLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Try finding in MongoDB first
    let matchedUser = null;
    try {
      const dbUser = await User.findOne({ email: normalizedEmail });
      if (dbUser && dbUser.password === password) {
        matchedUser = {
          id: dbUser._id.toString(),
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role || 'Senior Developer',
          avatar: dbUser.avatar || '',
          githubUsername: dbUser.githubUsername || '',
          jiraUsername: dbUser.jiraUsername || '',
        };
      }
    } catch (dbErr) {
      console.warn('[Auth Login] DB lookup warning:', dbErr.message);
    }

    // 2. Try in-memory fallback
    if (!matchedUser) {
      const memUser = inMemoryUsers.find(
        (u) => u.email.toLowerCase() === normalizedEmail && u.password === password
      );
      if (memUser) {
        matchedUser = memUser;
      }
    }

    if (!matchedUser) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    currentUser = matchedUser;

    return res.status(200).json({
      message: 'Login successful',
      user: {
        id: matchedUser.id || matchedUser._id,
        name: matchedUser.name,
        email: matchedUser.email,
        role: matchedUser.role,
        avatar: matchedUser.avatar || '',
      },
      token: `jwt-mock-${matchedUser.id || matchedUser._id}`,
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ error: 'Failed to authenticate user.' });
  }
};

export const handleGetMe = async (req, res) => {
  return res.status(200).json({
    user: {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      role: currentUser.role,
      avatar: currentUser.avatar,
      githubUsername: currentUser.githubUsername || '',
      jiraUsername:   currentUser.jiraUsername   || '',
    },
  });
};

/**
 * PATCH /api/me/integrations
 * Saves the user's GitHub and Jira usernames.
 * These are used by webhook handlers to route notifications to the correct user.
 */
export const handleUpdateIntegrations = async (req, res) => {
  try {
    const { githubUsername, jiraUsername } = req.body;

    // Update in-memory current user
    currentUser.githubUsername = (githubUsername || '').trim();
    currentUser.jiraUsername   = (jiraUsername   || '').trim();

    const memIdx = inMemoryUsers.findIndex((u) => u.email.toLowerCase() === currentUser.email.toLowerCase());
    if (memIdx >= 0) {
      inMemoryUsers[memIdx] = { ...inMemoryUsers[memIdx], githubUsername: currentUser.githubUsername, jiraUsername: currentUser.jiraUsername };
    } else {
      inMemoryUsers.push({ ...currentUser });
    }

    // Also persist to MongoDB if available
    try {
      await User.updateOne(
        { email: currentUser.email },
        { $set: { githubUsername: currentUser.githubUsername, jiraUsername: currentUser.jiraUsername } }
      );
    } catch {
      // MongoDB may not have this user yet — in-memory update is sufficient
    }

    console.log(`[Auth] Updated integrations for ${currentUser.email}: GitHub=@${currentUser.githubUsername}, Jira=${currentUser.jiraUsername}`);

    return res.status(200).json({
      message: 'Integration usernames updated successfully',
      user: {
        email:          currentUser.email,
        githubUsername: currentUser.githubUsername,
        jiraUsername:   currentUser.jiraUsername,
      },
    });
  } catch (error) {
    console.error('Update Integrations Error:', error);
    return res.status(500).json({ error: 'Failed to update integration settings.' });
  }
};

export const getCurrentUser = () => currentUser;

export const findUserByGithubUsername = (username) => {
  if (!username) return null;
  const clean = String(username).replace(/^@/, '').toLowerCase().trim();
  return (
    inMemoryUsers.find(
      (u) => (u.githubUsername || '').replace(/^@/, '').toLowerCase() === clean
    ) || null
  );
};


