export default function Header() {
  return (
    <header className="site-header">
      <div className="page header-row">
        <a className="brand" href="#main" aria-label="NewsFlow AI home">
          <svg className="brand-mark" viewBox="0 0 40 40" aria-hidden="true">
            <rect width="40" height="40" rx="12" fill="currentColor" />
            <path d="M10 29V11h4l12 12.5V11h4v18h-4L14 16.5V29z" fill="#fff" />
            <circle cx="32" cy="9" r="3" fill="#4cdc80" />
          </svg>
          <span className="brand-name">NewsFlow <span>AI</span></span>
        </a>
        <div className="header-right"><span className="status-dot" /> <span>AI newsroom workspace</span><span className="header-version">STUDIO / 01</span></div>
      </div>
    </header>
  );
}
