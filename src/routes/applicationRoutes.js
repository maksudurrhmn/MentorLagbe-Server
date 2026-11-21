import express from 'express';
import verifyToken from '../middlewares/verifyToken.js';
import verifyRole from '../middlewares/verifyRole.js';
import { createApplication, getTutorApplications } from '../controllers/applicationController.js';

const router = express.Router();

// Create application
router.post('/', verifyToken, verifyRole('student'), createApplication);

// Get tutor application
router.get('/tutor', verifyToken, verifyRole('tutor'), getTutorApplications);

export default router;
