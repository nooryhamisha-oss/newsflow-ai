import { useRef, useState } from 'react';
import CopyButton from './CopyButton.jsx';
import { FORMATS, LANGS, PLATFORMS, X_LIMIT } from '../lib/constants.js';
import { fmtTime, hashtagLine } from '../lib/utils.js';

/* ---------- بهترین بخش + کلیپ‌ها ---------- */
function Clips({ job }) {
  const available = Object.keys(FORMATS).filter((k) => job.clips?.[k]);
  const [fmt, setFmt] = useState(available[0]);
  const seg = job.analysis.best_segment;
  const current = available.includes(fmt) ? fmt : available[0];

  return (
    <section className="card" aria-labelledby="clips-title">
      <h2 id="clips-title" className="card-title">Best moment</h2>
      {seg && (
        <p className="muted">
          <span className="time-chip" dir="ltr">{fmtTime(seg.start)} – {fmtTime(seg.end)}</span>
          {seg.reason}
        </p>
      )}

      {available.length === 0 ? (
        <p className="muted">No clips were generated.</p>
      ) : (
        <>
          <div className="seg" role="group" aria-label="Clip format">
            {available.map((k) => (
              <button key={k} type="button" aria-pressed={k === current} className={k === current ? 'on' : ''} onClick={() => setFmt(k)}>
                <strong>{FORMATS[k].short}</strong>
                <span>{FORMATS[k].name}</span>
              </button>
            ))}
          </div>

          <div className={`stage ${current}`}>
            <video key={job.clips[current]} src={job.clips[current]} controls playsInline preload="metadata" />
          </div>
          <p className="muted small center">Best for: {FORMATS[current].use}</p>

          <ul className="plain dl-list">
            {available.map((k) => (
              <li key={k}>
                <span>
                  <strong>{FORMATS[k].short}</strong> {FORMATS[k].name}
                </span>
                <a className="btn primary sm" href={job.clips[k]} download={`newsflow_${job.id}_${k}.mp4`}>
                  Download
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/* ---------- تب‌های زبان ---------- */
function LangTabs({ lang, setLang }) {
  const refs = useRef({});
  const onKeyDown = (e, i) => {
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = LANGS[(i + (rtl ? -step : step) + LANGS.length) % LANGS.length];
    setLang(next.k);
    refs.current[next.k]?.focus();
  };
  return (
    <div className="tabs" role="tablist" aria-label="Content language">
      {LANGS.map((l, i) => (
        <button
          key={l.k}
          ref={(el) => (refs.current[l.k] = el)}
          id={`tab-${l.k}`}
          role="tab"
          type="button"
          aria-selected={lang === l.k}
          aria-controls={`panel-${l.k}`}
          tabIndex={lang === l.k ? 0 : -1}
          className={lang === l.k ? 'on' : ''}
          onClick={() => setLang(l.k)}
          onKeyDown={(e) => onKeyDown(e, i)}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

function LangPanel({ analysis, L }) {
  const headlines = analysis.headlines?.[L.k] ?? [];
  const captions = analysis.captions?.[L.k] ?? {};
  const tags = hashtagLine(analysis.hashtags?.[L.k]);
  const hasCaptions = Object.keys(PLATFORMS).some((p) => captions[p]);

  return (
    <div id={`panel-${L.k}`} role="tabpanel" aria-labelledby={`tab-${L.k}`} className="stack" dir={L.dir} lang={L.lang}>
      <section className="card">
        <h3 className="card-title sm">Suggested headlines</h3>
        {headlines.length === 0 ? (
          <p className="muted">No headlines were generated for this language.</p>
        ) : (
          <ul className="plain">
            {headlines.map((h, i) => (
              <li key={i} className="headline-row">
                <span className="headline">{h}</span>
                <CopyButton text={h} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h3 className="card-title sm">Social captions</h3>
        {!hasCaptions && <p className="muted">No captions were generated for this language.</p>}
        {Object.entries(PLATFORMS).map(([p, name]) => {
          const text = captions[p];
          if (!text) return null;
          const full = tags ? `${text}\n\n${tags}` : text;
          const over = p === 'x' && full.length > X_LIMIT;
          return (
            <article key={p} className="caption">
              <div className="caption-head">
                <strong dir="ltr">{name}</strong>
                <span className="grow" />
                {p === 'x' && (
                  <span className={`counter ${over ? 'over' : ''}`} dir="ltr" title="Including hashtags">
                    {full.length}/{X_LIMIT}
                  </span>
                )}
                <CopyButton text={full} label="Copy with hashtags" />
              </div>
              <p className="pre">{text}</p>
            </article>
          );
        })}
        {tags && <p className="tags" dir="auto">{tags}</p>}
      </section>
    </div>
  );
}

export default function Result({ job }) {
  const [lang, setLang] = useState('da');
  const L = LANGS.find((l) => l.k === lang);
  return (
    <div className="stack">
      <Clips job={job} />
      <LangTabs lang={lang} setLang={setLang} />
      <LangPanel analysis={job.analysis} L={L} />
    </div>
  );
}
