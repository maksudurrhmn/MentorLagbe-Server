import { Router } from 'express';
import verifyToken from '../middlewares/verifyToken.js';
import verifyRole from '../middlewares/verifyRole.js';

const router = Router();

// Any authenticated user
router.get('/', verifyToken, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Authentication successful!',
    user: req.auth,
  });
});

// Student-only route
router.get('/student', verifyToken, verifyRole('student'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome, Student!',
    user: req.user,
  });
});

// Tutor-only route
router.get('/tutor', verifyToken, verifyRole('tutor'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome, Tutor!',
    user: req.user,
  });
});

// Admin-only route
router.get('/admin', verifyToken, verifyRole('admin'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome, Admin!',
    user: req.user,
  });
});

export default router;
