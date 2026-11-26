import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './terminal.css';
import { education, Job, jobs, links, profile, projects, stack, YM } from './data';
import { applyTheme, Theme, themes } from './themes';
import HandTracker, { HandStatus } from './HandTracker';

type SectionId = 'home' | 'work' | 'projects' | 'stack' | 'edu' | 'themes' | 'contact';
type Step = { cmd: string; out: React.ReactNode };

const SECTIONS: { id: SectionId; dir: string; glyph: string }[] = [
  { id: 'home', dir: '~', glyph: '  ┌─┐\n  │J│R\n  └─┘' },
  { id: 'work', dir: 'work/', glyph: '* ─┐\n|  *\n* ─┘' },
  { id: 'projects', dir: 'projects/', glyph: '▤ ▤\n▤ ▤\n▤ ▤' },
  { id: 'stack', dir: 'stack/', glyph: '◆ ◇ ◆\n◇ ◆ ◇\n◆ ◇ ◆' },
  { id: 'edu', dir: 'edu/', glyph: ' ▲\n▐█▌\n ▀' },
  { id: 'themes', dir: 'themes/', glyph: '■ ■ ■\n■ ■ ■' },
  { id: 'contact', dir: 'contact/', glyph: '@ ─ ✉\n│\n↗' },
];

const BIG_JR = [
  '     ██ ██████ ',
  '     ██ ██   ██',
  '     ██ ██████ ',
  '██   ██ ██   ██',
  ' █████  ██   ██',
].join('\n');

/* ---------- helpers ---------- */

function shortHash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16).padStart(8, '0').slice(0, 7);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const today = new Date();
const NOW: YM = { y: today.getFullYear(), m: today.getMonth() + 1 };
const mIndex = (d: YM) => d.y * 12 + (d.m - 1);
const fmtYM = (d: YM) => `${MONTHS[d.m - 1]} ${d.y}`;
const fmtRange = (j: Job) => `${fmtYM(j.start)} – ${j.end ? fmtYM(j.end) : 'Present'}`;

// distinct months covered by any job (overlaps counted once)
function tenureMonths() {
  const covered = new Set<number>();
  for (const j of jobs) for (let i = mIndex(j.start); i <= mIndex(j.end ?? NOW); i++) covered.add(i);
  return covered.size;
}

function fmtTenure(m: number) {
  const y = Math.floor(m / 12);
  return y ? `${y}y ${m % 12}m` : `${m}m`;
}

const stackCount = Object.values(stack).reduce((n, a) => n + a.length, 0);

function loadTheme(): Theme {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('theme') : null;
  return themes.find((t) => t.name === saved) ?? themes[0];
}

/* ---------- section scripts ---------- */

function scriptFor(id: SectionId, setTheme: (t: Theme) => void, current: Theme): Step[] {
  switch (id) {
    case 'home':
      return [
        { cmd: 'whoami', out: <p className="prose">{profile.bio}</p> },
        {
          cmd: `fetch ${profile.handle}`,
          out: (
            <div className="fetch">
              <pre className="big">{BIG_JR}</pre>
              <dl>
                <dt>name</dt><dd>{profile.name}</dd>
                <dt>role</dt><dd>{profile.role}</dd>
                <dt>exp</dt><dd className="hl">{fmtTenure(tenureMonths())}</dd>
                <dt>projects</dt><dd className="hl">{projects.length}</dd>
                <dt>stack</dt><dd className="hl">{stackCount} tools</dd>
                <dt>base</dt><dd>{profile.location}</dd>
              </dl>
            </div>
          ),
        },
        { cmd: 'ls links/', out: <LinkRow /> },
      ];
    case 'work': {
      const first = Math.min(...jobs.map((j) => mIndex(j.start)));
      const span = mIndex(NOW) - first + 1;
      return [
        {
          cmd: 'fetch work/',
          out: (
            <dl className="kv">
              <dt>now</dt><dd className="hl">{jobs[0].title} @ {jobs[0].company}</dd>
              <dt>roles</dt><dd>{jobs.length}</dd>
              <dt>tenure</dt><dd className="hl">{fmtTenure(tenureMonths())}</dd>
              <dt>commits</dt><dd>{jobs.reduce((n, j) => n + j.commits.length, 0)}</dd>
            </dl>
          ),
        },
        {
          cmd: 'git log --graph --all work/',
          out: (
            <div className="graph">
              {jobs.map((j, ji) => (
                <div className="job" key={j.branch}>
                  <div className="commit branch">
                    <span className="rail">*</span>
                    <span className="hash">{shortHash(j.company)}</span>
                    <span className="ref">({ji === 0 ? 'HEAD -> ' : ''}{j.branch})</span>
                    <span className="msg"><b>{j.title}</b> · {j.company} <span className="dim">{fmtRange(j)}</span></span>
                  </div>
                  {j.commits.map((c, i) => (
                    <div className="commit" key={c.tag + i}>
                      <span className="rail">|</span>
                      <span className="hash">{shortHash(c.msg)}</span>
                      <span className="tag">[{c.tag}]</span>
                      <span className="msg">{c.msg}</span>
                    </div>
                  ))}
                  <div className="commit techline">
                    <span className="rail">|</span>
                    <span className="msg">{j.tech.map((t) => <span key={t} className="chip">{t}</span>)}</span>
                  </div>
                </div>
              ))}
            </div>
          ),
        },
        {
          cmd: 'tenure --months',
          out: (
            <div className="tenure">
              <div className="cells">
                {Array.from({ length: span }, (_, i) => {
                  const idx = first + i;
                  const ym = { y: Math.floor(idx / 12), m: (idx % 12) + 1 };
                  const ji = jobs.findIndex((j) => idx >= mIndex(j.start) && idx <= mIndex(j.end ?? NOW));
                  const job = ji >= 0 ? jobs[ji] : null;
                  return (
                    <span
                      key={i}
                      className={'cell' + (job ? '' : ' gap')}
                      title={`${fmtYM(ym)}${job ? ' · ' + job.company : ' · gap'}`}
                      style={{ animationDelay: `${i * 25}ms`, background: job ? (ji % 2 ? 'var(--accent2)' : 'var(--accent)') : undefined }}
                    />
                  );
                })}
              </div>
              <div className="dim">{fmtYM(jobs[jobs.length - 1].start)} – now · {tenureMonths()} months worked · hover a cell</div>
            </div>
          ),
        },
      ];
    }
    case 'projects':
      return [
        {
          cmd: 'ls projects/',
          out: (
            <div className="ls">
              {projects.map((p) => <span key={p.name} className="dir">{p.name}/</span>)}
            </div>
          ),
        },
        {
          cmd: 'cat projects/*/README.md',
          out: (
            <div className="cards">
              {projects.map((p) => (
                <article className="card" key={p.name}>
                  <header><span className="hl">{p.title}</span><span className="dim">{p.kind}</span></header>
                  <p>{p.desc}</p>
                  <footer>{p.stack.map((s) => <span key={s} className="chip">{s}</span>)}</footer>
                </article>
              ))}
            </div>
          ),
        },
      ];
    case 'stack':
      return [
        {
          cmd: 'stack --tools',
          out: (
            <div className="stack">
              {Object.entries(stack).map(([group, items]) => (
                <div className="col" key={group}>
                  <div className="hl">{group}</div>
                  {items.map((s, i) => (
                    <div key={s} className="row"><span className="dim">{String(i + 1).padStart(2, '0')}</span> {s}</div>
                  ))}
                </div>
              ))}
            </div>
          ),
        },
        { cmd: 'echo $FOCUS', out: <p className="prose">full stack · real-time systems · AI pipelines · reliability</p> },
      ];
    case 'edu':
      return [
        {
          cmd: 'cat edu/*.txt',
          out: (
            <div className="edu">
              {education.map((e) => (
                <dl className="kv" key={e.institution}>
                  <dt>degree</dt><dd className="hl">{e.degree}</dd>
                  <dt>school</dt><dd>{e.institution}</dd>
                  <dt>when</dt><dd>{e.duration}</dd>
                </dl>
              ))}
            </div>
          ),
        },
      ];
    case 'themes':
      return [
        { cmd: 'fetch themes/', out: <p className="dim">palettes {themes.length} · click one to recolor the terminal, or type <span className="hl">theme &lt;name&gt;</span></p> },
        {
          cmd: 'git log --graph themes/',
          out: (
            <div className="themes">
              {themes.map((t) => (
                <button
                  key={t.name}
                  className={'swatch' + (t.name === current.name ? ' on' : '')}
                  style={{ background: t.bg, borderColor: t.name === current.name ? t.accent : t.line }}
                  onClick={() => setTheme(t)}
                >
                  <span className="bars">
                    <i style={{ background: t.accent, width: '70%' }} />
                    <i style={{ background: t.fg, width: '50%', opacity: 0.8 }} />
                    <i style={{ background: t.accent2, width: '85%' }} />
                    <i style={{ background: t.dim, width: '40%' }} />
                  </span>
                  <span className="label" style={{ color: t.fg }}>{t.name}{t.name === current.name ? ' ✓' : ''}</span>
                </button>
              ))}
            </div>
          ),
        },
      ];
    case 'contact':
      return [
        { cmd: 'ls links/', out: <LinkRow /> },
        { cmd: 'cat contact/now.txt', out: <p className="prose">Open to backend and platform roles. The fastest way to reach me is email.</p> },
      ];
  }
}

const LinkRow = () => (
  <div className="ls">
    {links.map((l) => (
      <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" className="link">{l.label}</a>
    ))}
  </div>
);

/* ---------- user commands ---------- */

const HELP = (
  <div className="help">
    {[
      ['help', 'this list'],
      ['ls', 'list sections'],
      ['cd <section>', 'open a section (work, projects, stack, edu, themes, contact)'],
      ['whoami', 'go home'],
      ['theme <name>', themes.map((t) => t.name).join(' | ')],
      ['open <link>', links.map((l) => l.label).join(' | ')],
      ['hands [on|off]', 'webcam hand tracking: point to move, pinch to click'],
      ['clear', 'clear typed commands'],
    ].map(([c, d]) => (
      <div key={c}><span className="hl">{c.padEnd(14, ' ')}</span><span className="dim">{d}</span></div>
    ))}
  </div>
);

function runCommand(
  raw: string,
  go: (id: SectionId) => void,
  setTheme: (t: Theme) => void,
  setHands: (on: boolean | ((v: boolean) => boolean)) => void,
): React.ReactNode | 'clear' | null {
  const [cmd, ...rest] = raw.trim().split(/\s+/);
  const arg = rest.join(' ').replace(/\/$/, '').toLowerCase();
  const sectionIds = SECTIONS.map((s) => s.id) as string[];
  switch ((cmd || '').toLowerCase()) {
    case '':
      return null;
    case 'help':
    case '?':
      return HELP;
    case 'ls':
      return <div className="ls">{SECTIONS.filter((s) => s.id !== 'home').map((s) => <span key={s.id} className="dir">{s.dir}</span>)}</div>;
    case 'cd':
      if (!arg || arg === '~' || arg === '..') { go('home'); return null; }
      if (sectionIds.includes(arg)) { go(arg as SectionId); return null; }
      return <span className="err">cd: no such directory: {arg}</span>;
    case 'whoami':
    case 'home':
      go('home');
      return null;
    case 'theme': {
      const t = themes.find((x) => x.name === arg);
      if (!t) return <span className="err">theme: unknown palette "{arg}". try: {themes.map((x) => x.name).join(', ')}</span>;
      setTheme(t);
      return <span className="dim">colorscheme → <span className="hl">{t.name}</span></span>;
    }
    case 'open': {
      const l = links.find((x) => x.label === arg);
      if (!l) return <span className="err">open: unknown link "{arg}"</span>;
      window.open(l.url, '_blank', 'noopener');
      return <span className="dim">opening {l.label}…</span>;
    }
    case 'hands':
      if (arg === 'off') { setHands(false); return <span className="dim">hand tracking off · camera released</span>; }
      if (arg && arg !== 'on') return <span className="err">usage: hands [on|off]</span>;
      setHands(arg === 'on' ? true : (v) => !v);
      return <span className="dim">hand tracking toggled · allow camera access when asked · <span className="hl">pinch</span> to click</span>;
    case 'clear':
      return 'clear';
    case 'date':
      return <span>{new Date().toString()}</span>;
    case 'echo':
      return <span>{rest.join(' ')}</span>;
    case 'sudo':
      return <span className="err">nice try. this incident will be reported.</span>;
    default:
      if (sectionIds.includes(cmd.toLowerCase())) { go(cmd.toLowerCase() as SectionId); return null; }
      return <span className="err">command not found: {cmd} — type <span className="hl">help</span></span>;
  }
}

/* ---------- terminal ---------- */

function Terminal({
  section,
  script,
  go,
  setTheme,
  setHands,
  onTyping,
}: {
  section: SectionId;
  script: Step[];
  go: (id: SectionId) => void;
  setTheme: (t: Theme) => void;
  setHands: (on: boolean | ((v: boolean) => boolean)) => void;
  onTyping: () => void;
}) {
  const [step, setStep] = useState(0);
  const [chars, setChars] = useState(0);
  const [extra, setExtra] = useState<Step[]>([]);
  const [input, setInput] = useState('');
  const [hist, setHist] = useState<string[]>([]);
  const [hIdx, setHIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const dir = SECTIONS.find((s) => s.id === section)!.dir;
  const prompt = `${profile.handle}@${profile.host} ${dir === '~' ? '~' : '~/' + dir.replace(/\/$/, '')}`;

  useEffect(() => {
    setStep(0);
    setChars(0);
    setExtra([]);
  }, [section]);

  useEffect(() => {
    if (step >= script.length) return;
    const cmd = script[step].cmd;
    const t =
      chars < cmd.length
        ? setTimeout(() => setChars((c) => c + 1), 22 + Math.random() * 30)
        : setTimeout(() => { setStep((s) => s + 1); setChars(0); }, 260);
    return () => clearTimeout(t);
  }, [step, chars, script]);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [step, chars, extra]);

  const done = step >= script.length;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = input;
    setInput('');
    setHIdx(-1);
    if (value.trim()) setHist((h) => [value, ...h].slice(0, 50));
    const out = runCommand(value, go, setTheme, setHands);
    if (out === 'clear') { setExtra([]); return; }
    setExtra((x) => [...x, { cmd: value, out }]);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp' && hist.length) {
      e.preventDefault();
      const i = Math.min(hIdx + 1, hist.length - 1);
      setHIdx(i);
      setInput(hist[i]);
    } else if (e.key === 'ArrowDown' && hIdx >= 0) {
      e.preventDefault();
      const i = hIdx - 1;
      setHIdx(i);
      setInput(i >= 0 ? hist[i] : '');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const [c, a = ''] = input.split(/\s+/);
      if (c === 'cd' || c === 'theme') {
        const pool = c === 'cd' ? SECTIONS.map((s) => s.id as string) : themes.map((t) => t.name);
        const hit = pool.find((p) => p.startsWith(a.toLowerCase()));
        if (hit) setInput(`${c} ${hit}`);
      }
    }
    onTyping();
  };

  // focus the prompt when the visitor starts typing anywhere
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.length === 1) inputRef.current?.focus();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  return (
    <section className="term" onClick={() => window.getSelection()?.toString() || inputRef.current?.focus()}>
      <div className="term-title">
        <span>{dir === '~' ? 'home' : dir} — {profile.handle}@{profile.host}</span>
        <span className="dim">{script.length} cmds · zsh</span>
      </div>
      <div className="term-body" ref={bodyRef}>
        {script.slice(0, step).map((s, i) => (
          <Block key={section + i} prompt={prompt} cmd={s.cmd}>{s.out}</Block>
        ))}
        {!done && (
          <div className="block">
            <div className="prompt">{prompt}</div>
            <div className="cmdline"><span className="caret">›</span> {script[step].cmd.slice(0, chars)}<span className="cursor" /></div>
          </div>
        )}
        {done && extra.map((s, i) => (
          <Block key={'x' + i} prompt={prompt} cmd={s.cmd}>{s.out}</Block>
        ))}
        {done && (
          <form className="block" onSubmit={submit}>
            <div className="prompt">{prompt}</div>
            <div className="cmdline">
              <span className="caret">›</span>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                spellCheck={false}
                autoComplete="off"
                aria-label="terminal command"
                placeholder={extra.length ? '' : 'type help'}
              />
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

const Block = ({ prompt, cmd, children }: { prompt: string; cmd: string; children: React.ReactNode }) => (
  <div className="block">
    <div className="prompt">{prompt}</div>
    <div className="cmdline"><span className="caret">›</span> {cmd}</div>
    {children && <div className="out">{children}</div>}
  </div>
);

/* ---------- section wheel ---------- */

function Wheel({ active, setActive }: { active: number; setActive: (i: number) => void }) {
  const acc = useRef(0);
  const lock = useRef(0);
  const onWheel = (e: React.WheelEvent) => {
    acc.current += e.deltaY;
    const now = Date.now();
    if (Math.abs(acc.current) > 40 && now - lock.current > 220) {
      const dirn = Math.sign(acc.current);
      acc.current = 0;
      lock.current = now;
      setActive(Math.max(0, Math.min(SECTIONS.length - 1, active + dirn)));
    }
  };
  return (
    <nav className="wheel" onWheel={onWheel} aria-label="sections">
      {SECTIONS.map((s, i) => {
        const off = i - active;
        const a = Math.abs(off);
        return (
          <button
            key={s.id}
            className={'wcard' + (off === 0 ? ' on' : '')}
            onClick={() => setActive(i)}
            style={{
              transform: `translateY(calc(-50% + ${off * 92}px)) perspective(600px) rotateX(${off * -22}deg) rotateY(18deg) scale(${1 - a * 0.1})`,
              opacity: a > 3 ? 0 : 1 - a * 0.25,
              zIndex: 10 - a,
            }}
          >
            <pre>{s.glyph}</pre>
            <span>{s.dir === '~' ? 'home/' : s.dir}</span>
          </button>
        );
      })}
      <div className="wheel-hint">scroll · drag the wheel</div>
    </nav>
  );
}

/* ---------- ascii eye (follows the cursor) ---------- */

const RAMP = ' .:-=+*#%@';

function AsciiEye({ mouse, tracking, children }: { mouse: { x: number; y: number }; tracking: boolean; children?: React.ReactNode }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const target = useRef(mouse);
  target.current = mouse;

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d')!;
    const COLS = 36, ROWS = 20, CW = 7, CH = 11;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = COLS * CW * dpr;
    cv.height = ROWS * CH * dpr;
    cv.style.width = COLS * CW + 'px';
    cv.style.height = ROWS * CH + 'px';
    ctx.scale(dpr, dpr);
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textBaseline = 'top';
    let gx = 0, gy = 0, raf = 0, last = 0;
    let blinkUntil = 0, nextBlink = performance.now() + 2500;

    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (t - last < 45) return;
      last = t;
      const tx = (target.current.x - 0.5) * 2, ty = (target.current.y - 0.5) * 2;
      gx += (tx - gx) * 0.15;
      gy += (ty - gy) * 0.15;
      if (t > nextBlink) { blinkUntil = t + 140; nextBlink = t + 2500 + Math.random() * 3500; }
      const lid = t < blinkUntil ? 0.08 : 1;
      const css = getComputedStyle(document.documentElement);
      const fg = css.getPropertyValue('--fg').trim() || '#ddd';
      const acc = css.getPropertyValue('--accent').trim() || '#fc0';
      ctx.clearRect(0, 0, COLS * CW, ROWS * CH);
      const L = [gx * 0.8, gy * 0.8, 0.7];
      const ln = Math.hypot(L[0], L[1], L[2]);
      const ix = gx * 0.42, iy = gy * 0.42;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const nx = (c - COLS / 2 + 0.5) / (COLS / 2);
          const ny = ((r - ROWS / 2 + 0.5) / (ROWS / 2)) / lid;
          const d = nx * nx + ny * ny;
          if (d > 1) continue;
          const nz = Math.sqrt(1 - d);
          let b = Math.max(0, (nx * L[0] + ny * L[1] + nz * L[2]) / ln) * 0.85 + 0.1;
          const di = Math.hypot(nx - ix, ny - iy);
          let color = fg;
          if (di < 0.14) { continue; }
          if (di < 0.36) { b = 0.95 - di; color = acc; }
          const ch = RAMP[Math.max(1, Math.min(RAMP.length - 1, Math.round(b * (RAMP.length - 1))))];
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.35 + b * 0.65;
          ctx.fillText(ch, c * CW, r * CH);
        }
      }
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <aside className="eye">
      <canvas ref={ref} aria-hidden="true" />
      <pre className="readout">
        {`['eye:u'] ${mouse.x.toFixed(4)}\n          ${mouse.y.toFixed(4)}\n${tracking ? 'tracking' : 'idle'}`}
      </pre>
      {children}
    </aside>
  );
}

/* ---------- on-screen keyboard ---------- */

const KEY_ROWS = ['`1234567890-=', 'qwertyuiop[]', "asdfghjkl;'", 'zxcvbnm,./'];

function Keys({ down }: { down: Set<string> }) {
  return (
    <div className="keys" aria-hidden="true">
      {KEY_ROWS.map((row, i) => (
        <div className="krow" key={i} style={{ paddingLeft: i * 9 }}>
          {row.split('').map((k) => <span key={k} className={down.has(k) ? 'k on' : 'k'}>{k}</span>)}
        </div>
      ))}
      <div className="krow"><span className={down.has(' ') ? 'k space on' : 'k space'}>space</span><span className={down.has('enter') ? 'k on' : 'k'}>⏎</span></div>
    </div>
  );
}

/* ---------- app ---------- */

const App: React.FC = () => {
  const [active, setActive] = useState(0);
  const [theme, setThemeState] = useState<Theme>(loadTheme);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
  const [lastMove, setLastMove] = useState(0);
  const [lastKey, setLastKey] = useState(0);
  const [down, setDown] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(() => new Date());
  const [hands, setHands] = useState(false);
  const [handStatus, setHandStatus] = useState<HandStatus>('off');
  const [handCount, setHandCount] = useState(0);
  const onHandStatus = useCallback((s: HandStatus, n: number) => {
    setHandStatus(s);
    setHandCount(n);
    if (s === 'denied' || s === 'error') setHands(false);
  }, []);
  const onHandPointer = useCallback((x: number, y: number) => { setMouse({ x, y }); setLastMove(Date.now()); }, []);

  const section = SECTIONS[active].id;

  useEffect(() => { applyTheme(theme); localStorage.setItem('theme', theme.name); }, [theme]);
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  useEffect(() => {
    const mm = (e: MouseEvent) => { setMouse({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight }); setLastMove(Date.now()); };
    const kd = (e: KeyboardEvent) => {
      const k = e.key === 'Enter' ? 'enter' : e.key.toLowerCase();
      setDown((s) => new Set(s).add(k));
      setLastKey(Date.now());
    };
    const ku = (e: KeyboardEvent) => {
      const k = e.key === 'Enter' ? 'enter' : e.key.toLowerCase();
      setDown((s) => { const n = new Set(s); n.delete(k); return n; });
    };
    const blur = () => setDown(new Set());
    window.addEventListener('mousemove', mm);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('mousemove', mm);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      window.removeEventListener('blur', blur);
    };
  }, []);

  const go = useCallback((id: SectionId) => setActive(SECTIONS.findIndex((s) => s.id === id)), []);
  const script = useMemo(() => scriptFor(section, setThemeState, theme), [section, theme]);

  const tracking = now.getTime() - lastMove < 3000;
  const typing = now.getTime() - lastKey < 2000;

  return (
    <div className="shell">
      <header className="top">
        <span className="brand"><b>JR</b> {profile.domain}</span>
        <nav className="mnav">
          {SECTIONS.map((s, i) => (
            <button key={s.id} className={i === active ? 'on' : ''} onClick={() => setActive(i)}>{s.id}</button>
          ))}
        </nav>
        <a href={links[0].url} target="_blank" rel="noopener noreferrer">github</a>
      </header>

      <main className="stage">
        <Wheel active={active} setActive={setActive} />
        <Terminal section={section} script={script} go={go} setTheme={setThemeState} setHands={setHands} onTyping={() => setLastKey(Date.now())} />
        <AsciiEye mouse={mouse} tracking={tracking}>
          <button className="hands-toggle" onClick={() => setHands((v) => !v)}>
            {hands ? '◉ hands on · disable' : '○ enable hand tracking'}
          </button>
          {handStatus === 'denied' && <div className="err small">camera blocked · allow it in the browser and retry</div>}
          {handStatus === 'error' && <div className="err small">hand model failed to load</div>}
          {handStatus === 'loading' && <div className="dim small">loading hand model…</div>}
          {hands && <HandTracker enabled onStatus={onHandStatus} onPointer={onHandPointer} />}
        </AsciiEye>
      </main>

      <footer className="status">
        <div className="who">
          <span className="dim">{now.toISOString().slice(0, 10)}</span>
          <b>{profile.name.toUpperCase()}</b>
          <span className="dim">scroll · wheel &nbsp; ↵ · cmd &nbsp; tab · complete</span>
        </div>
        <Stat k="exp" v={fmtTenure(tenureMonths())} />
        <Stat k="projects" v={String(projects.length)} />
        <Stat k="stack" v={String(stackCount)} />
        <Stat k="theme" v={theme.name} />
        <Stat k="eye" v={tracking ? 'tracking' : 'idle'} live={tracking} />
        <Stat k="keys" v={typing ? 'typing' : 'idle'} live={typing} />
        <Stat k="hands" v={handStatus === 'on' ? `${handCount} in frame` : handStatus} live={handStatus === 'on' && handCount > 0} />
        <Stat k="local" v={now.toLocaleTimeString([], { hour12: false })} />
        <Keys down={down} />
      </footer>
    </div>
  );
};

const Stat = ({ k, v, live }: { k: string; v: string; live?: boolean }) => (
  <div className="stat">
    <span className="dim">{k}</span>
    <span className={live ? 'hl' : ''}>{v}</span>
  </div>
);

export default App;
