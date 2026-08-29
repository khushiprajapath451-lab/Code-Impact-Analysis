// This is the main server ser.
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { connectDB } from './config/db.js';
import apiRoutes from './routes/apiRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import { initSocketIO } from './services/notificationService.js';

const app = express();

// ── HTTP Server + Socket.io ───────────────────────────────────────────────────
// We wrap Express in a native http.Server so Socket.io can share the same port.
const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Pass the io instance to the notification service so it can emit real-time events
initSocketIO(io);

// ── Socket.io connection handling ─────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  // Allow frontend to join a personal room (e.g. socket.emit('join', userId))
  socket.on('join', (userId) => {
    if (userId) {
      socket.join(userId);
      console.log(`[Socket.io] Socket ${socket.id} joined room: ${userId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// ── Connect to MongoDB ────────────────────────────────────────────────────────
connectDB();

// ── CORS Middleware ───────────────────────────────────────────────────────────
app.use(cors());

// ── Webhook Routes ────────────────────────────────────────────────────────────
// ⚠️  MUST be registered BEFORE express.json() so the raw body is preserved
//     for HMAC signature verification (GitHub X-Hub-Signature-256, Stripe-Signature).
app.use('/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

// ── Standard JSON Middleware (all other routes) ───────────────────────────────
app.use(express.json());

// ── Root Health & Info Route ──────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Code Impact Analysis Backend API is running',
    endpoints: {
      impactAnalysis: 'POST /api/impact-analysis',
      preReview:      'POST /api/pre-review',
      webhooks: {
        github: 'POST /webhooks/github',
        gitlab: 'POST /webhooks/gitlab',
        jira:   'POST /webhooks/jira',
        stripe: 'POST /webhooks/stripe',
      },
    },
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api', apiRoutes);

// ── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Backend Server running on http://localhost:${PORT}`);
  console.log(`Socket.io  listening on  http://localhost:${PORT}`);
  console.log(`Webhooks   available at  http://localhost:${PORT}/webhooks/health`);
});
