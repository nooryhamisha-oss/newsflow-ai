import { useState } from 'react';
import { STATUS_LABEL } from '../lib/constants.js';

const when = (iso) => {
  try {
    return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return '';
  }
};

export default function RecentJobs({ jobs, activeId, onOpen, onRemove }) {
  const [pendingDelete, setPendingDelete] = useState(null);
  return (
    <section aria-labelledby="recent-title">
      <h2 id="recent-title" className="section-title">Recent jobs</h2>
      {jobs.length === 0 ? (
        <p className="muted">No videos processed yet.</p>
      ) : (
        <ul className="plain jobs">
          {jobs.map((j) => (
            <li key={j.id} className={`job ${j.id === activeId ? 'active' : ''}`}>
              <button type="button" className="job-open" onClick={() => onOpen(j.id)} aria-current={j.id === activeId ? 'true' : undefined}>
                <strong dir="auto">{j.headline || j.title}</strong>
                <span className="job-meta">
                  <span className={`badge ${j.status}`}>{j.status === 'done' ? 'Ready' : STATUS_LABEL[j.status] || j.status}</span>
                  {j.status === 'done' && <small className="muted">{when(j.createdAt)}</small>}
                </span>
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Delete ${j.title}`}
                onClick={() => setPendingDelete(j)}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
      {pendingDelete && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setPendingDelete(null); }}>
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-description">
            <div className="dialog-icon" aria-hidden="true">!</div>
            <h3 id="delete-dialog-title">Delete this job?</h3>
            <p id="delete-dialog-description">Permanently delete “{pendingDelete.headline || pendingDelete.title}” and its files? This action cannot be undone.</p>
            <div className="dialog-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setPendingDelete(null)}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={() => { const id = pendingDelete.id; setPendingDelete(null); onRemove(id); }}>Delete permanently</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
