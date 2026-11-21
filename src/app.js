import express from 'express';
import cors from 'cors';

import protectedRoutes from './routes/protectedRoutes.js';
import tuitionRoutes from './routes/tuitionRoutes.js';

const app = express();

// Middlewares
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());

// Routes
app.use('/api/protected', protectedRoutes);
app.use('/api/tuitions', tuitionRoutes);

// Health check
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'MentorLagbe API is running!',
  });
});

export default app;
