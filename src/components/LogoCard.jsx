import { useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { validateLogo } from '../lib/utils.js';

export default function LogoCard({ logo, setLogo, useLogo, setUseLogo, maxMb }) {
  const inputRef = useRef();
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async (file) => {
    if (!file) return;
    const problem = validateLogo(file, maxMb);
    if (problem) return setErr(problem);
    const fd = new FormData();
    fd.append('logo', file);
    setBusy(true);
    try {
      const d = await api('/api/logo', { method: 'POST', body: fd });
      setLogo(d.url);
      setErr('');
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card logo-card" aria-labelledby="logo-title">
      <div className="logo-preview">{logo ? <img src={logo} alt="Current brand logo" /> : <span>No logo</span>}</div>
      <div className="grow">
        <h2 id="logo-title" className="card-title sm">Brand logo</h2>
        <p className="muted small">Applied to all three clip formats. Upload once and reuse it.</p>
        <div className="row">
          <button type="button" className="btn ghost sm" disabled={busy} onClick={() => inputRef.current.click()}>
            {busy ? 'Uploading…' : logo ? 'Change logo' : 'Upload logo'}
          </button>
          {logo && (
            <label className="check">
              <input type="checkbox" checked={useLogo} onChange={(e) => setUseLogo(e.target.checked)} />
              Show on clips
            </label>
          )}
        </div>
        {err && <p className="error small" role="alert">{err}</p>}
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { send(e.target.files[0]); e.target.value = ''; }} />
      </div>
    </section>
  );
}
