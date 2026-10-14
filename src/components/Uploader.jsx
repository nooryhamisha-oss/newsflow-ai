import { useEffect, useRef, useState } from 'react';
import { upload } from '../lib/api.js';
import { validateVideo } from '../lib/utils.js';

export default function Uploader({ useLogo, maxMb, onCreated }) {
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState(null); // null = بیکار، عدد = درصد
  const [err, setErr] = useState('');
  const abortRef = useRef(null);
  const busy = progress !== null;

  useEffect(() => () => abortRef.current?.abort(), []);

  const send = async (file) => {
    if (!file || busy) return;
    const problem = validateVideo(file, maxMb);
    if (problem) return setErr(problem);

    setErr('');
    setProgress(0);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const fd = new FormData();
    fd.append('video', file);
    fd.append('useLogo', String(useLogo));
    try {
      onCreated(await upload('/api/jobs', fd, setProgress, ctrl.signal));
    } catch (e) {
      if (e.name !== 'AbortError') setErr(e.message);
    } finally {
      abortRef.current = null;
      setProgress(null);
    }
  };

  return (
    <section className="card" aria-labelledby="upload-title">
      <h2 id="upload-title" className="card-title">Upload a news video</h2>
      <p className="muted">No prompts or extra instructions needed.</p>

      <label
        className={`drop ${drag ? 'over' : ''} ${busy ? 'busy' : ''}`}
        onDragOver={(e) => { e.preventDefault(); if (!busy) setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); send(e.dataTransfer.files[0]); }}
      >
        <input
          type="file"
          className="sr-only"
          accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
          disabled={busy}
          onChange={(e) => { send(e.target.files[0]); e.target.value = ''; }}
        />
        <svg className="drop-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
        </svg>
        <strong>{busy ? (progress < 100 ? `Uploading… ${progress}٪` : 'Saving your video…') : 'Choose a video'}</strong>
        <span className="muted">{busy ? 'Please keep this page open' : 'or drag and drop your file here'}</span>
        <small>MP4, MOV or WebM · up to {maxMb} MB</small>
        {busy && (
          <span className="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}>
            <span style={{ inlineSize: `${progress}%` }} />
          </span>
        )}
      </label>

      {busy && (
        <button type="button" className="btn ghost sm cancel" onClick={() => abortRef.current?.abort()}>
          Cancel upload
        </button>
      )}
      {err && <p className="error" role="alert">{err}</p>}
    </section>
  );
}
