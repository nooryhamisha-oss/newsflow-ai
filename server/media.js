import { spawn } from 'node:child_process';

/** اجرای یک فرمان و برگرداندن stdout. در صورت خطا پیام فارسی و قابل‌فهم می‌دهد. */
export const run = (cmd, args) =>
  new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err = (err + d).slice(-2000)));
    p.on('error', () => reject(new Error(`${cmd} is not installed. Please install FFmpeg.`)));
    p.on('close', (code) =>
      code === 0 ? resolve(out) : reject(new Error(`${cmd} failed: ${err.slice(-400).trim()}`))
    );
  });

export const ffmpegAvailable = () =>
  run('ffmpeg', ['-hide_banner', '-version']).then(() => true, () => false);

export const probeDuration = async (file) =>
  parseFloat(
    (await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file])).trim()
  ) || 0;

export const hasAudio = async (file) =>
  (await run('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', file]))
    .trim()
    .includes('audio');

/** استخراج صدای سبک (mono، 16kHz) برای ارسال به AI */
export const extractAudio = (src, out) =>
  run('ffmpeg', ['-y', '-nostdin', '-i', src, '-vn', '-ac', '1', '-ar', '16000', '-b:a', '24k', out]);

/** ساخت کلیپ با پس‌زمینهٔ محو، لوگو و صدای اصلی */
export async function renderClip({ src, logo, start, end, w, h, out }) {
  const margin = Math.round(w * 0.04);
  const topMargin = h > w ? Math.round(h * 0.08) : margin; // فاصلهٔ امن بالای قالب عمودی
  const sw = Math.round(w / 16) * 2; // ۱/۸ اندازه، همیشه زوج
  const sh = Math.round(h / 16) * 2;
  const f = [
    '[0:v:0]split=2[a][b]',
    // پس‌زمینه: کوچک → محو → بزرگ (چند برابر سریع‌تر از محو کردن در رزولوشن کامل)
    `[a]scale=${sw}:${sh}:force_original_aspect_ratio=increase,crop=${sw}:${sh},boxblur=4:2,scale=${w}:${h}:flags=bilinear[bg]`,
    `[b]scale=${w}:${h}:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2[fg]`,
    `[bg][fg]overlay=(W-w)/2:(H-h)/2${logo ? '[base]' : ',format=yuv420p[vout]'}`
  ];
  if (logo) {
    f.push(`[1:v]scale=${Math.round(Math.min(w, h) * 0.16)}:-1[lg]`);
    f.push(`[base][lg]overlay=W-w-${margin}:${topMargin},format=yuv420p[vout]`);
  }
  await run('ffmpeg', [
    '-y', '-nostdin', '-ss', String(start), '-t', String(end - start), '-i', src,
    ...(logo ? ['-i', logo] : []),
    '-filter_complex', f.join(';'),
    '-map', '[vout]', '-map', '0:a:0?',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
    '-c:a', 'aac', '-b:a', '160k',
    '-movflags', '+faststart', out
  ]);
}
