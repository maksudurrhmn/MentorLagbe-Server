import express from 'express';
import verifyToken from '../middlewares/verifyToken.js';
import verifyRole from '../middlewares/verifyRole.js';
import {
  createApplication,
  getTutorApplications,
  updateApplicationStatus,
  getMyApplications,
  cancelApplication,
} from '../controllers/applicationController.js';

const router = express.Router();

// Create application
router.post('/', verifyToken, verifyRole('student'), createApplication);

// Get tutor application
router.get('/tutor', verifyToken, verifyRole('tutor'), getTutorApplications);

// Get my application
router.get('/my', verifyToken, verifyRole('student'), getMyApplications);

// Update application status
router.patch('/:id/status', verifyToken, verifyRole('tutor'), updateApplicationStatus);

// Delete application
router.delete('/:id', verifyToken, verifyRole('student'), cancelApplication);

export default router;
