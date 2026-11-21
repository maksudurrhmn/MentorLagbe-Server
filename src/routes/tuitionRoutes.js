import express from 'express';
import verifyToken from '../middlewares/verifyToken.js';
import verifyRole from '../middlewares/verifyRole.js';
import {
  createTuition,
  getPublicTuitions,
  getPublicTuitionById,
  getMyTuitions,
} from '../controllers/tuitionController.js';

const router = express.Router();

// Get all tuition post
router.get('/', getPublicTuitions);
// Get my tuition post only
router.get('/my', verifyToken, verifyRole('tutor'), getMyTuitions);
// Get tuition post by id
router.get('/:id', getPublicTuitionById);
// Create tuition post
router.post('/', verifyToken, verifyRole('tutor'), createTuition);

export default router;
