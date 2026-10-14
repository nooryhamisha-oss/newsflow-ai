const ITEMS = [
  ['01', 'Upload your footage', 'Drop in a news report. We handle the audio analysis automatically.'],
  ['02', 'Shape the story', 'Get headlines, social captions and hashtags in three languages.'],
  ['03', 'Publish everywhere', 'Download the strongest moment as a branded, ready-to-share clip.']
];
export default function Placeholder() {
  return <section className="card placeholder">
    <div className="section-kicker">YOUR WORKSPACE</div>
    <h2 className="card-title">Your next story starts here.</h2>
    <p className="muted intro-copy">Everything you need to move from footage to publishing, in one focused workspace.</p>
    <ol className="how">{ITEMS.map(([n,t,d])=><li key={n}><span className="how-no">{n}</span><div><strong>{t}</strong><p className="muted">{d}</p></div></li>)}</ol>
    <div className="placeholder-foot"><span className="mini-spark">✳</span><span>Built for fast, thoughtful newsroom workflows.</span></div>
  </section>;
}
