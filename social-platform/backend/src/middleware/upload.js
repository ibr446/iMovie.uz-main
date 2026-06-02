import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { env } from '../config/env.js';

fs.mkdirSync(env.uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, env.uploadDir),
  filename: (req, file, cb) => {
    const safeExt = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }
});
