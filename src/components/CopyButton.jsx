import { useEffect, useRef, useState } from 'react';
import { copyText } from '../lib/utils.js';

export default function CopyButton({ text, label = 'Copy' }) {
  const [state, setState] = useState('idle'); // idle | ok | fail
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);

  const onClick = async () => {
    setState((await copyText(text)) ? 'ok' : 'fail');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), 1600);
  };

  return (
    <button type="button" className={`btn ghost sm ${state === 'ok' ? 'is-ok' : ''}`} onClick={onClick}>
      <span aria-live="polite">{state === 'ok' ? 'Copied ✓' : state === 'fail' ? 'Copy failed' : label}</span>
    </button>
  );
}
