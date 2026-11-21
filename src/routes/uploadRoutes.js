import express from 'express';
import verifyToken from '../middlewares/verifyToken.js';
import upload from '../middlewares/upload.js';
import { uploadImage } from '../controllers/uploadController.js';

const router = express.Router();

router.post('/image', verifyToken, upload.single('image'), uploadImage);

export default router;
