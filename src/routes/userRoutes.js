import express from 'express';
import verifyToken from '../middlewares/verifyToken.js';
import verifyRole from '../middlewares/verifyRole.js';
import {
  getUserProfile,
  updateUserProfile,
  getAllUsers,
  updateUserRole,
  getAdminDashboardStats,
} from '../controllers/userController.js';

const router = express.Router();

router.get('/admin/all', verifyToken, verifyRole('admin'), getAllUsers);

// Get admin dashboard stats
router.get('/admin/stats', verifyToken, verifyRole('admin'), getAdminDashboardStats);

router.patch('/admin/:id/role', verifyToken, verifyRole('admin'), updateUserRole);

router.get('/profile', verifyToken, getUserProfile);

router.patch('/profile', verifyToken, updateUserProfile);

export default router;
