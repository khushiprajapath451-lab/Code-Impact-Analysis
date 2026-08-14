// This is the main server ser.
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import apiRoutes from './routes/apiRoutes.js';

const app = express();

// Connect to Mongo-db lordling
connectDB();

// Middleware-> with help of it components can communicate with each other maester 
app.use(cors());
app.use(express.json());

// Root Health & Info Route
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Code Impact Analysis Backend API is running',
    endpoints: {
      impactAnalysis: 'POST /api/impact-analysis',
      preReview: 'POST /api/pre-review'
    }
  });
});

// API Routes -> we are just redirecting our incoming requests to the routes folder commander
app.use('/api', apiRoutes);

// create a port for running our application lord-parmount.
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend Server running on http://localhost:${PORT}`);
});
