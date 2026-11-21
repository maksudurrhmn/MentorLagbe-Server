import express from 'express';
import verifyToken from '../middlewares/verifyToken.js';
import verifyRole from '../middlewares/verifyRole.js';
import { getUserProfile, updateUserProfile, getAllUsers } from '../controllers/userController.js';

const router = express.Router();

router.get('/admin/all', verifyToken, verifyRole('admin'), getAllUsers);

router.get('/profile', verifyToken, getUserProfile);

router.patch('/profile', verifyToken, updateUserProfile);

export default router;
