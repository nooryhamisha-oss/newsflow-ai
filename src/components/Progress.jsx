import { STEPS } from '../lib/constants.js';

export default function Progress({ job }) {
  const queued = job.status === 'queued';
  const idx = STEPS.findIndex(([k]) => k === job.status);
  return (
    <section className="card" aria-labelledby="progress-title">
      <h2 id="progress-title" className="card-title">Processing your video</h2>
      <p className="muted file-name" dir="auto">{job.title}</p>
      <p className="muted small" role="status" aria-live="polite">
        {queued ? 'Queued — another job is still running.' : `Step ${idx + 1} of ${STEPS.length}`}
      </p>
      <ol className="steps">
        {STEPS.map(([k, label], i) => (
          <li key={k} className={i < idx ? 'done' : i === idx ? 'now' : ''} aria-current={i === idx ? 'step' : undefined}>
            <span className="step-no" aria-hidden="true">{i < idx ? '✓' : i + 1}</span>
            {label}
          </li>
        ))}
      </ol>
    </section>
  );
}
