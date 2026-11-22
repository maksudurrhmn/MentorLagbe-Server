import express from 'express';
import verifyToken from '../middlewares/verifyToken.js';
import verifyRole from '../middlewares/verifyRole.js';

import {
  createCheckoutSession,
  getAdminPayments,
  getMyPayments,
} from '../controllers/paymentController.js';

const router = express.Router();

// Create Stripe Checkout Session
router.post('/create-checkout-session', verifyToken, createCheckoutSession);

// Get all payments (Admin only)
router.get('/admin/all', verifyToken, verifyRole('admin'), getAdminPayments);

// Get payment history for the authenticated user
router.get('/my', verifyToken, getMyPayments);

export default router;
