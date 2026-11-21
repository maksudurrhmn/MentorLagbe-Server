import express from 'express';
import verifyToken from '../middlewares/verifyToken.js';
import verifyRole from '../middlewares/verifyRole.js';
import { createTuition, getPublicTuitions } from '../controllers/tuitionController.js';

const router = express.Router();

router.get('/', getPublicTuitions);

router.post('/', verifyToken, verifyRole('tutor'), createTuition);

export default router;
