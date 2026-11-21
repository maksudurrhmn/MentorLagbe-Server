import express from 'express';
import verifyToken from '../middlewares/verifyToken.js';
import verifyRole from '../middlewares/verifyRole.js';
import {
  createApplication,
  getTutorApplications,
  updateApplicationStatus,
  getMyApplications,
} from '../controllers/applicationController.js';

const router = express.Router();

// Create application
router.post('/', verifyToken, verifyRole('student'), createApplication);

// Get tutor application
router.get('/tutor', verifyToken, verifyRole('tutor'), getTutorApplications);

// Update application status
router.patch('/:id/status', verifyToken, verifyRole('tutor'), updateApplicationStatus);

// Get my application
router.get('/my', verifyToken, verifyRole('student'), getMyApplications);

export default router;
