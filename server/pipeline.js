import fs from 'node:fs';
import path from 'node:path';
import { FORMATS, MAX_AUDIO_BYTES } from './config.js';
import { analyzeAudio } from './ai.js';
import { extractAudio, hasAudio, probeDuration, renderClip } from './media.js';
import { findLogo, jobDir, loadJob, saveJob } from './jobs.js';

class Cancelled extends Error {}

/** پردازش یک کار: استخراج صدا → تحلیل → ساخت کلیپ‌ها. هیچ‌وقت exception بیرون نمی‌دهد. */
export async function processJob(id, useLogo) {
  const dir = jobDir(id);
  let job = loadJob(id);
  if (!job) return;

  const set = (patch) => {
    if (!fs.existsSync(dir)) throw new Cancelled(); // کار در حین پردازش حذف شده
    job = { ...job, ...patch };
    saveJob(job);
  };

  try {
    const src = path.join(dir, job.sourceFile);
    set({ status: 'extracting' });
    if (!(await hasAudio(src))) throw new Error('This video has no audio; audio analysis is not possible.');
    const duration = await probeDuration(src);
    if (!duration) throw new Error('The video file is damaged or could not be read.');

    const audio = path.join(dir, 'audio.mp3');
    await extractAudio(src, audio);
    if (fs.statSync(audio).size > MAX_AUDIO_BYTES)
      throw new Error('This video is too long to analyze. Please upload a video shorter than 75 minutes.');

    set({ duration, status: 'analyzing' });
    const analysis = await analyzeAudio(audio, duration);
    fs.rmSync(audio, { force: true });

    set({ analysis, status: 'rendering' });
    const logo = useLogo ? findLogo() : null;
    const { start, end } = analysis.best_segment;
    const clips = {};
    for (const [name, [w, h]] of Object.entries(FORMATS)) {
      const file = `clip_${name}.mp4`;
      await renderClip({ src, logo, start, end, w, h, out: path.join(dir, file) });
      clips[name] = `/files/${id}/${file}`;
      set({ clips: { ...clips } });
    }
    set({ status: 'done' });
  } catch (e) {
    if (e instanceof Cancelled || !fs.existsSync(dir)) return; // کار حذف شده است
    console.error(`[job ${id}]`, e);
    try { set({ status: 'error', error: e.message }); } catch { /* کار حذف شده */ }
  }
}
