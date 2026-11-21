import express from 'express';
import cors from 'cors';

import protectedRoutes from './routes/protectedRoutes.js';
import tuitionRoutes from './routes/tuitionRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import userRoutes from './routes/userRoutes.js';

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
app.use('/api/applications', applicationRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'MentorLagbe API is running!',
  });
});

export default app;
