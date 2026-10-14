import express from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { KEY, MAX_LOGO_MB, MAX_MB, PORT, ROOT, STORAGE } from './config.js';
import { ffmpegAvailable } from './media.js';
import { deleteJob, enqueue, findLogo, isValidId, jobDir, jobExists, jobFile, listJobs, loadJob, recoverOnStartup, saveJob } from './jobs.js';
import { processJob } from './pipeline.js';

const app = express();
app.disable('x-powered-by');

const dist = path.join(ROOT, 'dist');
const hasDist = fs.existsSync(dist);

// هدرهای امنیتی
app.use((_req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer'
  });
  if (hasDist) {
    res.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
    );
  }
  next();
});
app.use(express.json({ limit: '100kb' }));

/* ---------- فایل‌ها: فقط کلیپ‌ها، ویدیوی اصلی و لوگو (نه job.json یا بقیهٔ storage) ---------- */
const PUBLIC_FILE = /^(source\.(mp4|mov|webm)|clip_(vertical|square|landscape)\.mp4)$/;
app.get('/files/:id/:name', (req, res) => {
  const { id, name } = req.params;
  if (!isValidId(id) || !PUBLIC_FILE.test(name)) return res.status(404).end();
  const file = path.join(jobDir(id), name);
  if (!fs.existsSync(file)) return res.status(404).end();
  res.sendFile(file); // از Range پشتیبانی می‌کند (پخش و جلو/عقب‌کردن ویدیو)
});

app.get('/brand/:name', (req, res) => {
  const logo = findLogo();
  if (!logo || req.params.name !== path.basename(logo)) return res.status(404).end();
  res.set('Cache-Control', 'no-cache');
  res.sendFile(logo);
});

/* ---------- تنظیمات و سلامت ---------- */
app.get('/api/config', async (_req, res) => {
  res.json({
    maxUploadMb: MAX_MB,
    maxLogoMb: MAX_LOGO_MB,
    aiConfigured: Boolean(KEY),
    ffmpegAvailable: await ffmpegAvailable()
  });
});

/* ---------- آپلود ویدیو ---------- */
// multer نام فایل را latin1 تحویل می‌دهد؛ نام فارسی/پشتو باید به UTF-8 برگردد.
const fixName = (n) => (/[^\x00-\xff]/.test(n) ? n : Buffer.from(n, 'latin1').toString('utf8'));
const badRequest = (msg) => Object.assign(new Error(msg), { status: 400 });

const upload = multer({
  limits: { fileSize: MAX_MB * 1024 * 1024, files: 1 },
  storage: multer.diskStorage({
    destination: (req, _f, cb) => {
      req.jobId = req.jobId || randomUUID().replace(/-/g, '').slice(0, 12);
      fs.mkdirSync(jobDir(req.jobId), { recursive: true });
      cb(null, jobDir(req.jobId));
    },
    filename: (_req, file, cb) => cb(null, 'source' + path.extname(file.originalname).toLowerCase())
  }),
  fileFilter: (_r, file, cb) =>
    /\.(mp4|mov|webm)$/i.test(file.originalname) ? cb(null, true) : cb(badRequest('Only MP4, MOV or WebM videos are supported.'))
});

app.post('/api/jobs', upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No video file was uploaded.' });
  const job = {
    id: req.jobId,
    title: fixName(req.file.originalname),
    sourceFile: req.file.filename,
    source: `/files/${req.jobId}/${req.file.filename}`,
    status: 'queued',
    createdAt: new Date().toISOString()
  };
  saveJob(job);
  const useLogo = req.body.useLogo !== 'false';
  enqueue(() => processJob(job.id, useLogo));
  res.json(job);
});

app.get('/api/jobs', (_req, res) => res.json(listJobs()));

app.get('/api/jobs/:id', (req, res) => {
  const job = jobExists(req.params.id) ? loadJob(req.params.id) : null;
  if (!job) return res.status(404).json({ error: 'Job not found.' });
  res.json(job);
});

app.delete('/api/jobs/:id', (req, res) => {
  if (isValidId(req.params.id)) deleteJob(req.params.id);
  res.json({ ok: true });
});

/* ---------- لوگوی برند ---------- */
const logoUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_LOGO_MB * 1024 * 1024, files: 1 } });
const logoUrl = (file) => `/brand/${path.basename(file)}?v=${Math.round(fs.statSync(file).mtimeMs)}`;

app.post('/api/logo', logoUpload.single('logo'), (req, res) => {
  if (!req.file || !/\.(png|jpe?g|webp)$/i.test(req.file.originalname))
    return res.status(400).json({ error: 'لوگو باید PNG، JPG یا WebP باشد.' });
  fs.readdirSync(STORAGE).filter((n) => n.startsWith('logo.')).forEach((n) => fs.rmSync(path.join(STORAGE, n)));
  const file = path.join(STORAGE, 'logo' + path.extname(req.file.originalname).toLowerCase());
  fs.writeFileSync(file, req.file.buffer);
  res.json({ url: logoUrl(file) });
});

app.get('/api/logo', (_req, res) => {
  const l = findLogo();
  res.json({ url: l ? logoUrl(l) : null });
});

/* ---------- نمایش build در حالت production ---------- */
if (hasDist) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

/* ---------- خطاها ---------- */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  // آپلود ردشده → پوشهٔ نیمه‌کاره را پاک کن
  if (req.jobId && !fs.existsSync(jobFile(req.jobId))) deleteJob(req.jobId);
  const known = err.code === 'LIMIT_FILE_SIZE' || err.status === 400 || err instanceof multer.MulterError;
  if (!known) console.error('[server]', err);
  const msg = err.code === 'LIMIT_FILE_SIZE' ? `حجم فایل بیشتر از ${err.field === 'logo' ? MAX_LOGO_MB : MAX_MB} مگابایت است.` : known ? err.message : 'خطای داخلی سرور.';
  res.status(known ? 400 : 500).json({ error: msg });
});

process.on('unhandledRejection', (e) => console.error('[unhandledRejection]', e));

recoverOnStartup();
app.listen(PORT, async () => {
  console.log(`NewsFlow AI server → http://localhost:${PORT}`);
  if (!KEY) console.warn('⚠ GROQ_API_KEY در فایل .env تنظیم نشده است.');
  if (!(await ffmpegAvailable())) console.warn('⚠ FFmpeg پیدا نشد؛ ساخت کلیپ کار نمی‌کند.');
});
