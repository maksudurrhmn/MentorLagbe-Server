import express from 'express';
import verifyToken from '../middlewares/verifyToken.js';
import verifyRole from '../middlewares/verifyRole.js';
import { createApplication } from '../controllers/applicationController.js';

const router = express.Router();

router.post('/', verifyToken, verifyRole('student'), createApplication);

export default router;
