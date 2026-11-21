import express from 'express';
import verifyToken from '../middlewares/verifyToken.js';
import verifyRole from '../middlewares/verifyRole.js';
import {
  createTuition,
  getPublicTuitions,
  getPublicTuitionById,
  getMyTuitions,
  updateTuition,
  deleteTuition,
  updateTuitionStatus,
} from '../controllers/tuitionController.js';

const router = express.Router();

// Get all tuition post
router.get('/', getPublicTuitions);

// Get my tuition post only
router.get('/my', verifyToken, verifyRole('tutor'), getMyTuitions);

// Update tuition status
router.patch('/:id/status', verifyToken, verifyRole('tutor'), updateTuitionStatus);

// Get tuition post by id
router.get('/:id', getPublicTuitionById);

// Create tuition post
router.post('/', verifyToken, verifyRole('tutor'), createTuition);

// Update tuition post
router.patch('/:id', verifyToken, verifyRole('tutor'), updateTuition);

// Delete tuition post
router.delete('/:id', verifyToken, verifyRole('tutor'), deleteTuition);

export default router;
