/**
 * Hunyuan 3D Studio — Node.js / Express Server
 * ─────────────────────────────────────────────
 * Wraps the Tencent Hunyuan 3D API with a clean REST interface.
 *
 * Usage:
 *   1. Copy .env.example → .env and fill your credentials
 *   2. npm install
 *   3. npm start   (or npm run dev for watch mode)
 *
 * Endpoints:
 *   POST   /api/generate          Submit image → 3D job (pro or rapid)
 *   GET    /api/job/:jobId        Poll job status + get result files
 *   POST   /api/texture-edit      Apply texture/prompt to existing model
 *   POST   /api/uv-unfold         UV unwrap a model
 *   POST   /api/convert           Convert 3D file format
 *   POST   /api/part-split        Split model into components
 *   GET    /api/health            Server health check
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { createApiRoutes } from './routes/api.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-secret-id',
      'x-secret-key',
    ],
  }),
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Multer for multipart file uploads (images sent as base64 in JSON is preferred)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else
      cb(
        new Error(
          `File type ${file.mimetype} not allowed. Use jpg, png, webp.`,
        ),
      );
  },
});

// Convert uploaded file → base64, inject into req.body
app.use('/api/generate', upload.single('image'), (req, res, next) => {
  if (req.file) {
    req.body.imageBase64 = req.file.buffer.toString('base64');
  }
  next();
});

app.use(
  '/api/texture-edit',
  upload.single('textureImage'),
  (req, res, next) => {
    if (req.file) {
      req.body.textureImageBase64 = req.file.buffer.toString('base64');
    }
    next();
  },
);

// ── Credentials ───────────────────────────────────────────────────────────
// Credentials can come from .env (server-wide) or per-request headers
function getEnvCredentials() {
  return {
    secretId: process.env.TENCENT_SECRET_ID || '',
    secretKey: process.env.TENCENT_SECRET_KEY || '',
  };
}

// ── Routes ────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Hunyuan 3D Studio API',
    docs: '/api/health',
  });
});

app.use('/api', createApiRoutes(getEnvCredentials));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(err.status || 500).json({ error: err.message });
});

// ── Start ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  const creds = getEnvCredentials();
  console.log(`
╔═══════════════════════════════════════════╗
║      Hunyuan 3D Studio — Server           ║
╠═══════════════════════════════════════════╣
║  Running at  http://localhost:${PORT}        ║
║  Credentials ${creds.secretId ? '✓ Configured (env)  ' : '✗ Not in env (use headers)'}  ║
╚═══════════════════════════════════════════╝
`);
});
