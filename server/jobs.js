import fs from 'node:fs';
import path from 'node:path';
import { JOBS, STORAGE } from './config.js';

export const ID_RE = /^[a-f0-9]{8,16}$/;
export const isValidId = (id) => ID_RE.test(String(id));
export const jobDir = (id) => path.join(JOBS, id);
export const jobFile = (id) => path.join(jobDir(id), 'job.json');
export const jobExists = (id) => isValidId(id) && fs.existsSync(jobFile(id));

/** خواندن امن کار؛ اگر فایل نیمه‌نوشته یا خراب باشد null برمی‌گرداند */
export function loadJob(id) {
  try {
    return JSON.parse(fs.readFileSync(jobFile(id), 'utf8'));
  } catch {
    return null;
  }
}

/** نوشتن اتمی: ابتدا فایل موقت، سپس rename — خواننده هرگز JSON ناقص نمی‌بیند */
export function saveJob(job) {
  const file = jobFile(job.id);
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(job, null, 2));
  fs.renameSync(tmp, file);
}

export function listJobs() {
  return fs
    .readdirSync(JOBS)
    .filter(jobExists)
    .map(loadJob)
    .filter(Boolean)
    .map((j) => ({ id: j.id, title: j.title, status: j.status, createdAt: j.createdAt, headline: j.analysis?.headlines?.da?.[0] || j.analysis?.headlines?.en?.[0] }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const deleteJob = (id) => fs.rmSync(jobDir(id), { recursive: true, force: true });

/* ---------- لوگو ---------- */
export const findLogo = () => {
  const f = fs.readdirSync(STORAGE).find((n) => /^logo\.(png|jpe?g|webp)$/.test(n));
  return f ? path.join(STORAGE, f) : null;
};

/* ---------- صف: کارها یکی‌یکی پردازش می‌شوند تا سرور زیر بار FFmpeg نیفتد ---------- */
let chain = Promise.resolve();
export const enqueue = (task) => {
  chain = chain.then(task).catch((e) => console.error('[queue]', e));
};

/** پس از راه‌اندازی مجدد سرور: کارهای نیمه‌تمام را خطادار کن و پوشه‌های یتیم را پاک کن */
export function recoverOnStartup() {
  const now = Date.now();
  for (const id of fs.readdirSync(JOBS)) {
    if (!isValidId(id)) continue;
    const dir = jobDir(id);
    if (!fs.existsSync(jobFile(id))) {
      // آپلود نیمه‌تمام (قطع اتصال و…)
      try { if (now - fs.statSync(dir).mtimeMs > 3600_000) fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
      continue;
    }
    const j = loadJob(id);
    if (j && !['done', 'error'].includes(j.status)) {
      saveJob({ ...j, status: 'error', error: 'پردازش با راه‌اندازی مجدد سرور قطع شد. ویدیو را دوباره آپلود کنید.' });
    }
  }
}
