import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { User } from 'firebase/auth';

const UPDATES = [
  { icon: '🎞️', text: 'Strip 3×1 — a three-shot burst on one frame', fresh: true },
  { icon: '👯', text: 'Duo mode — shoot together in real time over WebRTC', fresh: true },
  { icon: '🖼️', text: 'New frames: polaroid, neon and film strip' },
  { icon: '⏱️', text: 'Synced countdown so everyone strikes the pose together' },
  { icon: '⬇️', text: 'One-tap download of the finished strip' },
];

const STEPS = [
  { icon: '📸', title: 'Welcome to the booth', body: 'Make a photo strip with a friend, from anywhere, in five quick steps.' },
  { icon: '🚪', title: 'Step 1 · Sign in', body: 'Use your Google account. No extra sign-up needed.' },
  { icon: '🧩', title: 'Step 2 · Pick a frame', body: 'Choose the layout that fits your mood in the lobby.' },
  { icon: '🔗', title: 'Step 3 · Share a room', body: 'Create a room and send the code to your friend, or join theirs.' },
  { icon: '🎬', title: 'Step 4 · Strike a pose', body: 'Hit capture. A shared countdown fires for both of you.' },
  { icon: '💾', title: 'Step 5 · Save it', body: 'Download your strip and share it wherever you like.' },
];

const LAUNCH = new Date('2025-02-09T00:00:00Z').getTime();

function useElapsed() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((now - LAUNCH) / 1000));
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    mins: Math.floor((s % 3600) / 60),
    secs: s % 60,
  };
}

function seen(key: string) {
  try { return localStorage.getItem(key) === '1'; } catch { return false; }
}
function remember(key: string) {
  try { localStorage.setItem(key, '1'); } catch { /* storage unavailable */ }
}

export default function LandingPage({ user }: { user: User | null }) {
  const navigate = useNavigate();
  const [showNews, setShowNews] = useState(() => !seen('pb-news-v1'));
  const [guideStep, setGuideStep] = useState<number | null>(null);
  const elapsed = useElapsed();

  const closeNews = () => { remember('pb-news-v1'); setShowNews(false); };
  const start = () => navigate(user ? '/lobby' : '/login');

  return (
    <div className="landing min-h-screen overflow-y-auto">
      <div className="landing-announce">Say cheese 🧀 — a new 3-shot strip just dropped</div>

      <header className="landing-nav">
        <Link to="/" className="landing-logo">snap<span>·</span>booth</Link>
        <nav className="landing-links">
          <a href="#how">how it works</a>
          <a href="#frames">frames</a>
          <a href="#about">about</a>
        </nav>
        <button className="landing-pill" onClick={start}>
          {user ? 'open lobby' : 'sign in'}
        </button>
      </header>

      <main>
        <section className="landing-hero">
          <Strip tone="peach" tilt={-7} />
          <div className="landing-hero-center">
            <p className="landing-eyebrow">live photobooth · since 2025</p>
            <h1>
              Two people.<br />
              <em>Three frames.</em><br />
              One strip.
            </h1>
            <p className="landing-sub">
              Jump into a room with a friend, count down together and walk away with a
              keepsake — no matter how far apart you are.
            </p>
            <button className="landing-cta" onClick={start}>
              <span aria-hidden>●</span> Start the booth
            </button>
            <div className="landing-clock" aria-label="Time since launch">
              {[
                ['days', elapsed.days],
                ['hrs', elapsed.hours],
                ['min', elapsed.mins],
                ['sec', elapsed.secs],
              ].map(([label, v]) => (
                <div key={label as string}>
                  <b>{String(v).padStart(2, '0')}</b>
                  <small>{label}</small>
                </div>
              ))}
            </div>
            <p className="landing-clock-note">of strips made since launch day</p>
          </div>
          <Strip tone="lilac" tilt={6} />
        </section>

        <section id="how" className="landing-section">
          <h2>How it works</h2>
          <ol className="landing-steps">
            {STEPS.slice(1).map((s, i) => (
              <li key={s.title}>
                <span className="landing-step-n">{i + 1}</span>
                <div>
                  <h3>{s.title.replace(/^Step \d · /, '')}</h3>
                  <p>{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section id="frames" className="landing-section">
          <h2>Pick your frame</h2>
          <div className="landing-frames">
            {[
              ['Polaroid', 'peach'],
              ['Neon', 'lilac'],
              ['Film strip', 'mint'],
              ['Strip 3×1', 'butter'],
            ].map(([name, tone]) => (
              <div key={name} className={`landing-frame tone-${tone}`}>
                <div className="landing-frame-art" />
                <span>{name}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="about" className="landing-section landing-about">
          <h2>About</h2>
          <p>
            Snapbooth is a tiny real-time photobooth. Cameras stay in your browser, video
            travels peer-to-peer, and the strip is composed locally, so your photos stay yours.
          </p>
        </section>
      </main>

      <footer className="landing-footer">
        <span>© {new Date().getFullYear()} snap·booth</span>
        <button onClick={() => setShowNews(true)}>what's new</button>
      </footer>

      <button className="landing-help" aria-label="Open guide" onClick={() => setGuideStep(0)}>?</button>

      {showNews && (
        <Modal onClose={closeNews} label="What's new">
          <span className="landing-badge">FRESH</span>
          <h2 className="landing-modal-title">What's new</h2>
          <p className="landing-modal-sub">The latest tweaks to make your booth better.</p>
          <ul className="landing-updates">
            {UPDATES.map((u) => (
              <li key={u.text} className={u.fresh ? 'fresh' : ''}>{u.icon} {u.text}</li>
            ))}
          </ul>
          <button className="landing-cta wide" onClick={closeNews}>Sounds good</button>
        </Modal>
      )}

      {guideStep !== null && (
        <Modal onClose={() => setGuideStep(null)} label="Guide">
          <div className="landing-guide">
            <div className="landing-guide-icon">{STEPS[guideStep].icon}</div>
            <h2 className="landing-modal-title">{STEPS[guideStep].title}</h2>
            <p className="landing-modal-sub">{STEPS[guideStep].body}</p>
            <div className="landing-dots">
              {STEPS.map((_, i) => <i key={i} className={i === guideStep ? 'on' : ''} />)}
            </div>
            <div className="landing-guide-nav">
              <button disabled={guideStep === 0} onClick={() => setGuideStep(guideStep - 1)}>Back</button>
              {guideStep < STEPS.length - 1 ? (
                <button className="primary" onClick={() => setGuideStep(guideStep + 1)}>Next</button>
              ) : (
                <button className="primary" onClick={() => { setGuideStep(null); start(); }}>Let's go</button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose, label }: { children: React.ReactNode; onClose: () => void; label: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="landing-modal" role="dialog" aria-modal="true" aria-label={label}>
      <div className="landing-modal-overlay" onClick={onClose} />
      <div className="landing-modal-card">
        <button className="landing-modal-close" aria-label="Close" onClick={onClose}>×</button>
        {children}
      </div>
    </div>
  );
}

function Strip({ tone, tilt }: { tone: string; tilt: number }) {
  return (
    <div className={`landing-strip tone-${tone}`} style={{ transform: `rotate(${tilt}deg)` }} aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="landing-strip-shot">
          <svg viewBox="0 0 48 48" width="42%" fill="currentColor" opacity=".55">
            <circle cx="24" cy="17" r="8" />
            <path d="M8 44c0-9 7-15 16-15s16 6 16 15z" />
          </svg>
        </div>
      ))}
    </div>
  );
}
