export const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // clipboard API در http غیر localhost (مثلاً باز کردن از روی IP شبکه) کار نمی‌کند
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;inset-block-start:0;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* ignore */ }
    ta.remove();
    return ok;
  }
}

export const hashtagLine = (tags) =>
  (Array.isArray(tags) ? tags : [])
    .map((t) => String(t).replace(/^#+/, '').trim().replace(/\s+/g, '_'))
    .filter(Boolean)
    .map((t) => `#${t}`)
    .join(' ');

const VIDEO_RE = /\.(mp4|mov|webm)$/i;
export function validateVideo(file, maxMb) {
  if (!VIDEO_RE.test(file.name)) return 'Only MP4, MOV or WebM videos are supported.';
  if (file.size > maxMb * 1024 * 1024) return `Video exceeds the ${maxMb} MB limit.`;
  return '';
}
const LOGO_RE = /\.(png|jpe?g|webp)$/i;
export function validateLogo(file, maxMb) {
  if (!LOGO_RE.test(file.name)) return 'Logo must be a PNG, JPG or WebP image.';
  if (file.size > maxMb * 1024 * 1024) return `Logo exceeds the ${maxMb} MB limit.`;
  return '';
}
