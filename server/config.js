import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const ROOT = path.join(__dirname, '..');
export const STORAGE = process.env.STORAGE_DIR ? path.resolve(process.env.STORAGE_DIR) : path.join(ROOT, 'storage');
export const JOBS = path.join(STORAGE, 'jobs');
fs.mkdirSync(JOBS, { recursive: true });

export const PORT = num(process.env.PORT, 3001);
export const MAX_MB = num(process.env.MAX_UPLOAD_MB, 50);
export const MAX_LOGO_MB = 5;
export const KEY = process.env.GROQ_API_KEY || '';
export const GROQ_CHAT_MODEL = process.env.GROQ_CHAT_MODEL || 'openai/gpt-oss-120b';
export const GROQ_STT_MODEL = process.env.GROQ_STT_MODEL || 'whisper-large-v3-turbo';

// سقف محافظه‌کارانه برای فایل صوتی استخراج‌شده پیش از ارسال به API.
export const MAX_AUDIO_BYTES = 14 * 1024 * 1024;

// فرمت‌های خروجی برای شبکه‌های اجتماعی
export const FORMATS = {
  vertical: [1080, 1920], // ریلز، تیک‌تاک، استوری
  square: [1080, 1080],   // اینستاگرام، فیسبوک
  landscape: [1920, 1080] // یوتیوب، X
};
