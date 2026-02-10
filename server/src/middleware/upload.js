import multer from 'multer';
import path from 'path';
import fs from 'fs';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const uploadRoot = path.resolve(process.env.UPLOAD_ROOT || process.cwd());

const imagesDir = path.join(uploadRoot, 'uploads', 'images');
const pdfsDir = path.join(uploadRoot, 'uploads', 'pdfs');
const materialsDir = path.join(uploadRoot, 'uploads', 'materials');
const publicPyqsDir = path.join(uploadRoot, 'uploads', 'pyqs');
const pyqsDir = path.join(uploadRoot, 'private_uploads', 'pyqs');
const privateMaterialsDir = path.join(uploadRoot, 'private_uploads', 'materials');

ensureDir(imagesDir);
ensureDir(pdfsDir);
ensureDir(materialsDir);
ensureDir(publicPyqsDir);
ensureDir(pyqsDir);
ensureDir(privateMaterialsDir);

function makeStorage(destDir) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, destDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '');
      const base = path.basename(file.originalname || 'file', ext).replace(/\s+/g, '_');
      const unique = `${Date.now()}_${Math.round(Math.random() * 1e9)}`;
      cb(null, `${base}_${unique}${ext}`);
    },
  });
}

export const uploadImage = multer({
  storage: makeStorage(imagesDir),
  fileFilter: (req, file, cb) => {
    const ok = (file.mimetype || '').startsWith('image/');
    cb(ok ? null : new Error('Only image uploads are allowed'), ok);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const uploadPdf = multer({
  storage: makeStorage(pdfsDir),
  fileFilter: (req, file, cb) => {
    const ok = (file.mimetype || '') === 'application/pdf';
    cb(ok ? null : new Error('Only PDF uploads are allowed'), ok);
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

export const uploadMaterialPrivate = multer({
  storage: makeStorage(privateMaterialsDir),
  fileFilter: (req, file, cb) => {
    const mime = (file.mimetype || '').toLowerCase();
    const ext = path.extname(file.originalname || '').toLowerCase();

    const allowedMimes = new Set([
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'image/gif',
    ]);

    const allowedExts = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif']);
    const ok = allowedMimes.has(mime) || allowedExts.has(ext);
    cb(ok ? null : new Error('Only PDF and image uploads are allowed'), ok);
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

export const uploadPyqPdf = multer({
  storage: makeStorage(pyqsDir),
  fileFilter: (req, file, cb) => {
    const ok = (file.mimetype || '') === 'application/pdf';
    cb(ok ? null : new Error('Only PDF uploads are allowed'), ok);
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

export const uploadPyqPdfPublic = multer({
  storage: makeStorage(publicPyqsDir),
  fileFilter: (req, file, cb) => {
    const ok = (file.mimetype || '') === 'application/pdf';
    cb(ok ? null : new Error('Only PDF uploads are allowed'), ok);
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

export const uploadMaterial = multer({
  storage: makeStorage(materialsDir),
  fileFilter: (req, file, cb) => {
    const mime = (file.mimetype || '').toLowerCase();
    const ext = path.extname(file.originalname || '').toLowerCase();

    const allowedMimes = new Set([
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ]);

    const allowedExts = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.doc', '.docx', '.ppt', '.pptx']);
    const ok = allowedMimes.has(mime) || allowedExts.has(ext);
    cb(ok ? null : new Error('Only PDF, image, Word, and PPT uploads are allowed'), ok);
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

export function makePublicUploadUrl(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const idx = normalized.lastIndexOf('/uploads/');
  if (idx >= 0) {
    return normalized.slice(idx);
  }

  const idx2 = normalized.lastIndexOf('uploads/');
  if (idx2 >= 0) {
    return `/${normalized.slice(idx2)}`;
  }

  return `/uploads/${path.basename(normalized)}`;
}

export function makePrivateUploadRef(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const idx = normalized.lastIndexOf('/private_uploads/');
  if (idx >= 0) {
    return normalized.slice(idx + 1);
  }

  const idx2 = normalized.lastIndexOf('private_uploads/');
  if (idx2 >= 0) {
    return normalized.slice(idx2);
  }

  return `private_uploads/pyqs/${path.basename(normalized)}`;
}

export function makePrivateMaterialRef(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const idx = normalized.lastIndexOf('/private_uploads/');
  if (idx >= 0) {
    return normalized.slice(idx + 1);
  }

  const idx2 = normalized.lastIndexOf('private_uploads/');
  if (idx2 >= 0) {
    return normalized.slice(idx2);
  }

  return `private_uploads/materials/${path.basename(normalized)}`;
}
