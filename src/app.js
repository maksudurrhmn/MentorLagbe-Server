import express from 'express';
import cors from 'cors';

import protectedRoutes from './routes/protectedRoutes.js';
import tuitionRoutes from './routes/tuitionRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import userRoutes from './routes/userRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import { handleStripeWebhook } from './controllers/paymentController.js';

const app = express();

// Middlewares
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

// Stripe webhook
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

// Express json
app.use(express.json());

// Routes
app.use('/api/protected', protectedRoutes);
app.use('/api/tuitions', tuitionRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);

// Health check
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'MentorLagbe API is running!',
  });
});

export default app;
