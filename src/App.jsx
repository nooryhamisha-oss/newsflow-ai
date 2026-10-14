import { useCallback, useEffect, useRef, useState } from 'react';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import Uploader from './components/Uploader.jsx';
import LogoCard from './components/LogoCard.jsx';
import Progress from './components/Progress.jsx';
import Result from './components/Result.jsx';
import Placeholder from './components/Placeholder.jsx';
import RecentJobs from './components/RecentJobs.jsx';
import { api } from './lib/api.js';
import { isFinal } from './lib/constants.js';

const DEFAULT_CONFIG = { maxUploadMb: 50, maxLogoMb: 5, aiConfigured: true, ffmpegAvailable: true };

export default function App() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [serverDown, setServerDown] = useState(false);
  const [logo, setLogo] = useState(null);
  const [useLogo, setUseLogo] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [job, setJob] = useState(null);
  const workRef = useRef(null);

  const refresh = useCallback(() => api('/api/jobs').then(setJobs).catch(() => {}), []);

  useEffect(() => {
    api('/api/config').then((c) => { setConfig(c); setServerDown(false); }).catch(() => setServerDown(true));
    api('/api/logo').then((d) => setLogo(d.url)).catch(() => {});
    refresh();
  }, [refresh]);

  // روی موبایل، پس از آپلود/باز کردن یک کار، صفحه به بخش نتیجه می‌رود
  const showWorkspace = () => {
    if (!window.matchMedia('(max-width: 959px)').matches) return;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() => workRef.current?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' }));
  };

  // پیگیری وضعیت کار باز
  const active = Boolean(job) && !isFinal(job.status);
  useEffect(() => {
    if (!active) return undefined;
    let stop = false;
    const t = setInterval(async () => {
      try {
        const j = await api(`/api/jobs/${job.id}`);
        if (stop) return;
        setJob(j);
        if (isFinal(j.status)) refresh();
      } catch (e) {
        if (!stop && e.status === 404) { setJob(null); refresh(); }
      }
    }, 2000);
    return () => { stop = true; clearInterval(t); };
  }, [active, job?.id, refresh]);

  // تا وقتی کاری در حال پردازش است، فهرست کارها هم به‌روز بماند
  const anyActive = jobs.some((j) => !isFinal(j.status));
  useEffect(() => {
    if (!anyActive) return undefined;
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, [anyActive, refresh]);

  const open = (id) =>
    api(`/api/jobs/${id}`).then((j) => { setJob(j); showWorkspace(); }).catch(() => refresh());

  const remove = async (id) => {
    try { await api(`/api/jobs/${id}`, { method: 'DELETE' }); } catch { /* فهرست دوباره خوانده می‌شود */ }
    if (job?.id === id) setJob(null);
    refresh();
  };

  const onCreated = (j) => { setJob(j); refresh(); showWorkspace(); };

  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>
      <Header />
      <Hero />

      <main id="main" className="page main">
        {(serverDown || !config.ffmpegAvailable || !config.aiConfigured) && (
          <div className="notice" role="alert">
            {serverDown && <p>Server is unavailable. Start it with <code dir="ltr">npm run dev</code> to run the server.</p>}
            {!serverDown && !config.ffmpegAvailable && <p>FFmpeg is not installed on the server; clip rendering is unavailable.</p>}
            {!serverDown && !config.aiConfigured && <p>The key <code dir="ltr">GROQ_API_KEY</code> in the <code dir="ltr">.env</code> has not been configured.</p>}
          </div>
        )}

        <div className="layout">
          <div className="area-upload">
            <Uploader useLogo={useLogo && !!logo} maxMb={config.maxUploadMb} onCreated={onCreated} />
          </div>

          <div className="area-work" ref={workRef}>
            {!job && <Placeholder />}
            {active && <Progress job={job} />}
            {job?.status === 'error' && (
              <section className="card" role="alert">
                <h2 className="card-title">Processing failed</h2>
                <p className="error">{job.error}</p>
              </section>
            )}
            {job?.status === 'done' && job.analysis && <Result key={job.id} job={job} />}
          </div>

          <div className="area-logo">
            <LogoCard logo={logo} setLogo={setLogo} useLogo={useLogo} setUseLogo={setUseLogo} maxMb={config.maxLogoMb} />
          </div>

          <div className="area-recent">
            <RecentJobs jobs={jobs} activeId={job?.id} onOpen={open} onRemove={remove} />
          </div>
        </div>
      </main>
      <footer className="site-footer"><div className="page footer-inner"><span>NEWSFLOW <b>AI</b></span><span>Less busywork. More journalism.</span><span className="footer-mark">BUILT FOR THE NEWSROOM ↗</span></div></footer>
    </>
  );
}
