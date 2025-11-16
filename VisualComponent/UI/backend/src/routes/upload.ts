import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import fs from 'fs';

const router = Router();

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uploadId = randomUUID();
    const ext = path.extname(file.originalname);
    cb(null, `${uploadId}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept video files only
    const allowedMimeTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'));
    }
  }
});

// POST /api/upload/reference - Upload reference tyre video
router.post('/reference', upload.single('video'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const uploadId = path.parse(req.file.filename).name;
    const videoUrl = `/uploads/${req.file.filename}`;

    // Store metadata if provided
    const metadata = {
      tyreType: req.body.tyreType || '',
      compound: req.body.compound || '',
      lapsUsed: req.body.lapsUsed ? parseInt(req.body.lapsUsed) : 0
    };

    res.status(200).json({
      uploadId,
      videoUrl,
      metadata,
      message: 'Reference video uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading reference video:', error);
    res.status(500).json({ error: 'Failed to upload reference video' });
  }
});

// POST /api/upload/damaged - Upload damaged tyre video
router.post('/damaged', upload.single('video'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const uploadId = path.parse(req.file.filename).name;
    const videoUrl = `/uploads/${req.file.filename}`;

    // Store metadata if provided
    const metadata = {
      tyreType: req.body.tyreType || '',
      compound: req.body.compound || '',
      lapsUsed: req.body.lapsUsed ? parseInt(req.body.lapsUsed) : 0
    };

    res.status(200).json({
      uploadId,
      videoUrl,
      metadata,
      message: 'Damaged video uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading damaged video:', error);
    res.status(500).json({ error: 'Failed to upload damaged video' });
  }
});

export default router;
