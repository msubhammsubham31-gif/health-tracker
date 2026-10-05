import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { Activity, ArrowRight, Check, CheckCircle2, ChevronLeft, ChevronRight, Droplets, Heart, LockKeyhole, Moon, Pencil, ShieldCheck, Sparkles, Trash2, Waves } from 'lucide-react';
import NotFound from '@/pages/not-found';

type HealthEntry = {
  date: string;
  sleepHours: number;
  mood: number;
  energy: number;
  waterGlasses: number;
  activityMinutes: number;
  note: string;
};

const STORAGE_KEY = 'daily-health-tracker.entries.v1';
const moods = [
  { value: 1, face: '−', label: 'Low' },
  { value: 2, face: '·', label: 'A little low' },
  { value: 3, face: '◡', label: 'Steady' },
  { value: 4, face: '⌣', label: 'Good' },
  { value: 5, face: '✦', label: 'Bright' },
];
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const todayKey = () => dateKey(new Date());
function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
function parseDate(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}
function prettyDate(key: string, options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' }) {
  return parseDate(key).toLocaleDateString(undefined, options);
}
function blankEntry(date: string): HealthEntry {
  return { date, sleepHours: 8, mood: 3, energy: 3, waterGlasses: 0, activityMinutes: 0, note: '' };
}
function useEntries() {
  const [entries, setEntries] = useState<HealthEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setEntries(parsed.filter((item): item is HealthEntry =>
            !!item &&
            typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date) &&
            typeof item.sleepHours === 'number' && typeof item.mood === 'number' &&
            typeof item.energy === 'number' && typeof item.waterGlasses === 'number' &&
            typeof item.activityMinutes === 'number' && typeof item.note === 'string'
          ));
        }
      }
    } catch {
      setStorageError(true);
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [entries, loaded]);
  const saveEntry = (entry: HealthEntry) => {
    setEntries(current => [...current.filter(item => item.date !== entry.date), entry].sort((a, b) => b.date.localeCompare(a.date)));
  };
  const deleteEntry = (date: string) => setEntries(current => current.filter(entry => entry.date !== date));
  return { entries, loaded, storageError, saveEntry, deleteEntry };
}

function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link href="/" className="brand" data-testid="link-brand-home">
          <span className="brand-mark"><Heart size={21} strokeWidth={1.8} /></span>
          <span><span className="brand-name">Daywell</span><span className="brand-note">A little check-in with yourself</span></span>
        </Link>
        <nav className="nav-links" aria-label="Main navigation">
          <Link href="/" className={`nav-link ${location === '/' ? 'active' : ''}`} aria-current={location === '/' ? 'page' : undefined} data-testid="link-today">Today</Link>
          <Link href="/history" className={`nav-link ${location === '/history' ? 'active' : ''}`} aria-current={location === '/history' ? 'page' : undefined} data-testid="link-history">History</Link>
        </nav>
      </header>
      {children}
    </div>
  );
}

function WeeklySummary({ entries }: { entries: HealthEntry[] }) {
  const today = parseDate(todayKey());
  const week = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    const key = dateKey(date);
    return { date, key, entry: entries.find(item => item.date === key) };
  }), [entries]);
  const saved = week.filter(day => day.entry);
  const meanMood = saved.length ? saved.reduce((sum, day) => sum + (day.entry?.mood ?? 0), 0) / saved.length : 0;
  const avgSleep = saved.length ? saved.reduce((sum, day) => sum + (day.entry?.sleepHours ?? 0), 0) / saved.length : 0;
  let insight = 'Your week is a fresh page. A few check-ins will help patterns take shape.';
  if (saved.length === 1) insight = 'One check-in is a lovely start. Keep noticing what supports you.';
  else if (saved.length >= 2 && meanMood >= 4) insight = 'You have been feeling good on most logged days. Notice what those days had in common.';
  else if (saved.length >= 2 && meanMood <= 2.5) insight = 'It sounds like this week has asked a lot of you. Be gentle with your energy.';
  else if (saved.length >= 2 && avgSleep < 7) insight = 'Sleep has been a little short on your logged days. Rest might be worth making room for.';
  else if (saved.length >= 2) insight = 'Your check-ins are building a picture of the little things that shape your days.';
  return (
    <>
      <section className="panel week-panel" aria-labelledby="week-heading" data-testid="section-weekly-summary">
        <div className="week-title-row">
          <div><div className="eyebrow">The last seven days</div><h2 className="panel-title" id="week-heading" style={{ marginTop: 5 }}>A small look back</h2></div>
          <span className="legend-metric" data-testid="text-week-logged">{saved.length}/7 logged</span>
        </div>
        <div className="week-bars" aria-label={`${saved.length} daily check-ins over the last seven days`}>
          {week.map(({ date, key, entry }) => {
            const isToday = key === todayKey();
            return <div className="day-col" key={key} data-testid={`day-summary-${key}`}>
              <div className="day-bar-slot" title={entry ? `${entry.sleepHours} hours sleep` : 'No check-in'}>
                <div className={`day-bar ${isToday ? 'today' : ''} ${entry ? '' : 'empty'}`} style={{ height: entry ? `${Math.max(14, entry.sleepHours / 10 * 73)}px` : '4px' }} />
              </div>
              <span className="day-label">{weekdays[date.getDay()]}</span>
              {entry ? <span className="day-dot" aria-label="Check-in saved" /> : <span style={{ height: 5 }} />}
            </div>;
          })}
        </div>
        <div className="week-legend">
          <span className="legend-label">Sleep, in hours</span>
          <span className="legend-metric" data-testid="text-week-average">{saved.length ? `${avgSleep.toFixed(1)} hr average` : 'No entries yet'}</span>
        </div>
        {saved.length === 0 && <p className="empty-week" data-testid="empty-week-message">Your week starts here. Check in whenever it feels useful.</p>}
      </section>
      <section className="panel pattern-card" aria-labelledby="pattern-title" data-testid="card-weekly-pattern">
        <div className="pattern-heading"><Sparkles size={14} /> A gentle observation</div>
        <p className="pattern-text" id="pattern-title" data-testid="text-pattern-insight">{insight}</p>
        <div className="pattern-foot">{saved.length ? `Based on ${saved.length} ${saved.length === 1 ? 'check-in' : 'check-ins'} this week` : 'No data is ever filled in for you'}</div>
      </section>
      <section className="panel privacy-card" data-testid="card-local-privacy">
        <LockKeyhole size={17} />
        <div><strong>Your check-ins stay on this device</strong><p>Saved privately in this browser's local storage. Nothing is sent to a server or shared elsewhere.</p></div>
      </section>
    </>
  );
}

function Counter({ label, value, unit, onChange, testId }: { label: string; value: number; unit: string; onChange: (value: number) => void; testId: string }) {
  return <div className="field-block">
    <div className="field-label"><span>{label}</span></div>
    <div className="number-control">
      <button type="button" className="number-button" aria-label={`Decrease ${label.toLowerCase()}`} onClick={() => onChange(Math.max(0, value - 1))} data-testid={`${testId}-decrease`}><ChevronLeft size={17} /></button>
      <span className="number-readout" data-testid={`${testId}-value`}>{value}</span>
      <button type="button" className="number-button" aria-label={`Increase ${label.toLowerCase()}`} onClick={() => onChange(value + 1)} data-testid={`${testId}-increase`}><ChevronRight size={17} /></button>
      <span className="count-unit">{unit}</span>
    </div>
  </div>;
}

function HomePage({ entries, loaded, storageError, saveEntry, initialDate }: { entries: HealthEntry[]; loaded: boolean; storageError: boolean; saveEntry: (entry: HealthEntry) => void; initialDate?: string | null }) {
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState(initialDate ?? todayKey());
  const existing = entries.find(entry => entry.date === selectedDate);
  const [form, setForm] = useState<HealthEntry>(() => blankEntry(todayKey()));
  const [savedNotice, setSavedNotice] = useState(false);
  const today = selectedDate === todayKey();
  useEffect(() => {
    if (initialDate) setSelectedDate(initialDate);
  }, [initialDate]);
  useEffect(() => {
    setForm(existing ? { ...existing } : blankEntry(selectedDate));
  }, [selectedDate, existing?.date]);
  const update = (patch: Partial<HealthEntry>) => setForm(current => ({ ...current, ...patch }));
  const handleSave = (event: FormEvent) => {
    event.preventDefault();
    saveEntry({ ...form, date: selectedDate });
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2800);
  };
  if (!loaded) return <AppShell><main className="page-wrap"><div className="panel" style={{ padding: 30, minHeight: 440 }} aria-label="Loading check-in"><div className="eyebrow">Getting your space ready</div><div style={{ height: 18, width: '45%', marginTop: 22, borderRadius: 20, background: 'hsl(var(--muted))' }} /><div style={{ height: 150, marginTop: 25, borderRadius: 18, background: 'hsl(var(--muted))', opacity: .6 }} /></div></main></AppShell>;
  return <AppShell>
    <main className="page-wrap">
      <div className="today-head">
        <div><div className="eyebrow">{today ? 'A moment for you' : 'Looking back with care'}</div>
          <h1 className="page-title" data-testid="text-page-title">{today ? 'How are you, really?' : 'Your check-in'}</h1>
          <p className="page-subtitle">No perfect days required. Just notice what is here.</p>
        </div>
        <label className="date-stamp" htmlFor="checkin-date"><span>{today ? 'Today · ' : ''}</span>
          <input id="checkin-date" aria-label="Check-in date" type="date" value={selectedDate} max={todayKey()} onChange={event => { setSavedNotice(false); setSelectedDate(event.target.value || todayKey()); }} data-testid="input-checkin-date" style={{ border: 0, background: 'transparent', color: 'inherit', fontSize: 12, outline: 'none', maxWidth: 135 }} />
        </label>
      </div>
      {storageError && <div className="panel" role="alert" data-testid="status-storage-error" style={{ padding: 14, marginBottom: 15, color: '#9a4036', fontSize: 12 }}>This browser could not access local storage. Your latest changes may not be saved. Try again after checking browser storage settings.</div>}
      <div className="layout-grid">
        <form className="panel checkin-panel" onSubmit={handleSave} data-testid="form-daily-checkin">
          <div className="panel-heading">
            <div><h2 className="panel-title">{existing ? 'Your notes for the day' : 'A few things about today'}</h2><p className="panel-copy">Answer what you like. There is no score.</p></div>
            {existing && <span className="saved-pill" data-testid="status-entry-saved"><Check size={13} /> Saved</span>}
          </div>
          <div className="field-block">
            <div className="field-label"><span>How has your mood been?</span><span className="field-hint">Choose what feels closest</span></div>
            <div className="mood-options" role="radiogroup" aria-label="Mood" data-testid="group-mood">
              {moods.map(mood => <button type="button" role="radio" aria-checked={form.mood === mood.value} aria-label={mood.label} key={mood.value} className={`mood-option ${form.mood === mood.value ? 'selected' : ''}`} onClick={() => update({ mood: mood.value })} data-testid={`button-mood-${mood.value}`}><span className="mood-face" aria-hidden="true">{mood.face}</span><span>{mood.label}</span></button>)}
            </div>
          </div>
          <div className="field-block">
            <div className="field-label"><label htmlFor="energy-range">Energy</label><span className="field-hint">A little or a lot?</span></div>
            <div className="range-wrap"><span className="field-hint">Low</span><input className="range-input" id="energy-range" type="range" min="1" max="5" step="1" value={form.energy} onChange={event => update({ energy: Number(event.target.value) })} aria-label="Energy level" data-testid="input-energy" /><span className="field-hint">High</span><span className="range-value" data-testid="text-energy-value">{form.energy} / 5</span></div>
          </div>
          <div className="field-block">
            <div className="field-label"><label htmlFor="sleep-range">Sleep</label><span className="field-hint">About how long did you sleep?</span></div>
            <div className="range-wrap"><Moon size={15} color="hsl(var(--primary))" /><input className="range-input" id="sleep-range" type="range" min="0" max="14" step="0.5" value={form.sleepHours} onChange={event => update({ sleepHours: Number(event.target.value) })} aria-label="Hours of sleep" data-testid="input-sleep-hours" /><span className="range-value" data-testid="text-sleep-value">{form.sleepHours} hr</span></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <Counter label="Water" value={form.waterGlasses} unit="glasses" onChange={value => update({ waterGlasses: value })} testId="water" />
            <Counter label="Movement" value={form.activityMinutes} unit="minutes" onChange={value => update({ activityMinutes: value })} testId="activity" />
          </div>
          <div className="field-block" style={{ marginBottom: 18 }}>
            <label className="field-label" htmlFor="note-input">Anything else you want to remember?</label>
            <textarea id="note-input" className="note-input" maxLength={600} value={form.note} onChange={event => update({ note: event.target.value })} placeholder="A quiet win, a hard moment, something that helped…" data-testid="input-daily-note" />
          </div>
          <div className="form-footer">
            <div className="privacy-line"><ShieldCheck size={16} /><span>Just for you. Stored on this device.</span></div>
            <button className="primary-button" type="submit" data-testid="button-save-checkin">{savedNotice ? <><CheckCircle2 size={15} /> Saved {today ? 'for today' : 'for this day'}</> : <>{existing ? 'Update check-in' : 'Save check-in'} <ArrowRight size={15} /></>}</button>
          </div>
        </form>
        <aside className="side-stack" aria-label="Your weekly overview">
          <WeeklySummary entries={entries} />
          {entries.length > 0 && <button type="button" className="quiet-button" onClick={() => setLocation('/history')} data-testid="button-view-history">Browse your past check-ins <ArrowRight size={14} style={{ verticalAlign: 'middle', marginLeft: 5 }} /></button>}
        </aside>
      </div>
      <div className="footer-note">A private ritual, at your own pace.</div>
    </main>
  </AppShell>;
}

function EntryCard({ entry, onEdit, onDelete }: { entry: HealthEntry; onEdit: (entry: HealthEntry) => void; onDelete: (entry: HealthEntry) => void }) {
  return <article className="panel entry-card" data-testid={`card-entry-${entry.date}`}>
    <div className="entry-date" data-testid={`text-entry-date-${entry.date}`}>{prettyDate(entry.date)}<small>{entry.date === todayKey() ? 'Today' : entry.date}</small></div>
    <div className="entry-metrics" data-testid={`metrics-entry-${entry.date}`}>
      <span className="metric-chip"><Moon size={12} /> <strong>{entry.sleepHours} hr</strong> sleep</span>
      <span className="metric-chip"><Heart size={12} /> <strong>{moods[entry.mood - 1]?.label ?? 'Steady'}</strong></span>
      <span className="metric-chip"><Waves size={12} /> <strong>{entry.energy}/5</strong> energy</span>
      <span className="metric-chip"><Droplets size={12} /> <strong>{entry.waterGlasses}</strong> water</span>
      <span className="metric-chip"><Activity size={12} /> <strong>{entry.activityMinutes}</strong> min</span>
    </div>
    <div className="entry-actions">
      <button type="button" className="icon-button" aria-label={`Edit check-in for ${prettyDate(entry.date)}`} onClick={() => onEdit(entry)} data-testid={`button-edit-entry-${entry.date}`}><Pencil size={15} /></button>
      <button type="button" className="icon-button delete" aria-label={`Delete check-in for ${prettyDate(entry.date)}`} onClick={() => onDelete(entry)} data-testid={`button-delete-entry-${entry.date}`}><Trash2 size={15} /></button>
    </div>
    {entry.note && <p className="entry-note" data-testid={`text-entry-note-${entry.date}`}>{entry.note}</p>}
  </article>;
}

function HistoryPage({ entries, loaded, onEdit, onDelete }: { entries: HealthEntry[]; loaded: boolean; onEdit: (entry: HealthEntry) => void; onDelete: (entry: HealthEntry) => void }) {
  const [month, setMonth] = useState(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  });
  const filtered = entries.filter(entry => entry.date.startsWith(month));
  const monthDate = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1);
  const shiftMonth = (delta: number) => {
    const next = new Date(monthDate.getFullYear(), monthDate.getMonth() + delta, 1);
    setMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  };
  return <AppShell><main className="page-wrap">
    <div className="history-heading">
      <div><div className="eyebrow">Your own little archive</div><h1 className="page-title" data-testid="text-history-title">Days, as they were.</h1><p className="page-subtitle">A place to notice, not to judge.</p></div>
      <div className="date-stamp" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button type="button" className="icon-button" aria-label="Previous month" onClick={() => shiftMonth(-1)} data-testid="button-previous-month"><ChevronLeft size={16} /></button>
        <span data-testid="text-history-month" style={{ minWidth: 100, textAlign: 'center', color: 'hsl(var(--foreground))' }}>{monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
        <button type="button" className="icon-button" aria-label="Next month" disabled={month >= `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`} onClick={() => shiftMonth(1)} data-testid="button-next-month"><ChevronRight size={16} /></button>
      </div>
    </div>
    {!loaded ? <div className="panel" style={{ minHeight: 240, opacity: .6 }} aria-label="Loading saved entries" /> : filtered.length ? <div className="history-list" data-testid="list-history-entries">
      {filtered.map(entry => <EntryCard key={entry.date} entry={entry} onEdit={onEdit} onDelete={onDelete} />)}
    </div> : <section className="panel history-empty" data-testid="empty-history">
      <div className="empty-art"><Heart size={30} strokeWidth={1.5} /></div>
      <h2>{entries.length ? 'A quiet month.' : 'Your story starts here.'}</h2>
      <p>{entries.length ? 'There are no check-ins for this month. Try another month, or start a fresh check-in whenever you like.' : 'Your saved days will find a home here. Start with today, or simply come back when you are ready.'}</p>
      <Link className="primary-button" href="/" data-testid="link-start-checkin">Go to today <ArrowRight size={15} /></Link>
    </section>}
    <div className="footer-note"><LockKeyhole size={12} style={{ verticalAlign: 'middle', marginRight: 5 }} />Only you, on this device.</div>
  </main></AppShell>;
}

function DeleteDialog({ entry, onCancel, onConfirm }: { entry: HealthEntry; onCancel: () => void; onConfirm: () => void }) {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [onCancel]);
  return <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onCancel(); }}>
    <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-copy" data-testid="dialog-confirm-delete">
      <div className="confirm-icon"><Trash2 size={19} /></div>
      <h2 id="delete-title">Let this day go?</h2>
      <p id="delete-copy">Your check-in from {prettyDate(entry.date)} will be removed from this device. This cannot be undone.</p>
      <div className="dialog-actions"><button type="button" className="secondary-button" onClick={onCancel} data-testid="button-cancel-delete">Keep it</button><button type="button" className="danger-button" onClick={onConfirm} data-testid="button-confirm-delete">Delete check-in</button></div>
    </section>
  </div>;
}

function RouterContent({ entries, loaded, storageError, saveEntry, deleteEntry }: { entries: HealthEntry[]; loaded: boolean; storageError: boolean; saveEntry: (entry: HealthEntry) => void; deleteEntry: (date: string) => void }) {
  const [, setLocation] = useLocation();
  const [pendingDelete, setPendingDelete] = useState<HealthEntry | null>(null);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const edit = (entry: HealthEntry) => {
    setEditingDate(entry.date);
    setLocation('/');
  };
  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteEntry(pendingDelete.date);
    setPendingDelete(null);
    setToast('Check-in removed from this device');
    window.setTimeout(() => setToast(''), 2600);
  };
  return <>
    <Switch>
      <Route path="/" component={() => <HomePage entries={entries} loaded={loaded} storageError={storageError} saveEntry={saveEntry} initialDate={editingDate} />} />
      <Route path="/history" component={() => <HistoryPage entries={entries} loaded={loaded} onEdit={edit} onDelete={setPendingDelete} />} />
      <Route component={NotFound} />
    </Switch>
    {pendingDelete && <DeleteDialog entry={pendingDelete} onCancel={() => setPendingDelete(null)} onConfirm={confirmDelete} />}
    {toast && <div className="toast-message" role="status" data-testid="status-delete-success"><CheckCircle2 size={15} />{toast}</div>}
  </>;
}

function App() {
  const { entries, loaded, storageError, saveEntry, deleteEntry } = useEntries();
  return <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
    <RouterContent entries={entries} loaded={loaded} storageError={storageError} saveEntry={saveEntry} deleteEntry={deleteEntry} />
  </WouterRouter>;
}

export default App;
