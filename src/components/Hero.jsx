export default function Hero() {
  return (
    <section className="hero">
      <div className="page hero-inner">
        <div className="hero-copy">
          <p className="eyebrow"><span>01</span> VIDEO → STORY → PUBLISH</p>
          <h1>From raw footage<br />to <em>ready-to-publish.</em></h1>
          <p className="lead">Turn a news video into sharp headlines, social captions and branded clips in Dari, Pashto and English — without writing a single prompt.</p>
          <div className="hero-points"><span><b>✳</b> Multilingual by design</span><span><b>↗</b> Three export formats</span><span><b>◉</b> Original audio preserved</span></div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
          <div className="art-card art-card-back"><span className="art-label">OUTPUT / 03</span><div className="art-bars"><i/><i/><i/><i/></div></div>
          <div className="art-card art-card-front"><div className="play-mark">▶</div><span className="art-label">YOUR STORY, IN MOTION</span><div className="waveform">{Array.from({length:24},(_,i)=><i key={i} style={{height:`${12+((i*17+9)%34)}px`}} />)}</div></div>
          <span className="art-stamp">NF<br/>AI</span>
        </div>
      </div>
    </section>
  );
}
