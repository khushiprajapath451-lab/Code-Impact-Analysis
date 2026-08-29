import { User } from '../models/User.js';

// In-Memory User Registry Fallback
const inMemoryUsers = [
  {
    id: 'usr-1',
    name: 'Abhiram Sadgun',
    email: 'abhiram@impactiq.ai',
    password: 'password123',
    role: 'Senior Staff Engineer',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr-2',
    name: 'Alex Rivera',
    email: 'developer@impactiq.ai',
    password: 'password123',
    role: 'Full Stack Developer',
    avatar: '',
    createdAt: new Date().toISOString(),
  },
];

let currentUser = inMemoryUsers[0];

export const handleRegister = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const existingInMemory = inMemoryUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existingInMemory) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const newUser = {
      id: `usr-${Date.now()}`,
      name,
      email,
      password,
      role: role || 'Software Engineer',
      avatar: '',
      createdAt: new Date().toISOString(),
    };

    inMemoryUsers.push(newUser);
    currentUser = newUser;

    // Try saving to DB if connected
    try {
      await User.create({ name, email, password, role: newUser.role });
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

    // Try finding in in-memory first
    const user = inMemoryUsers.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    currentUser = user;

    return res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
      token: `jwt-mock-${user.id}`,
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

