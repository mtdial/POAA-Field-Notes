import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { CommentThread } from '../components/CommentThread';
import { relativeTime } from '../lib/labels';

const PULSE_SELECT = `
  id, week_start, this_week, watch_next_week, created_at, updated_at,
  contributor:profiles!contributor_id(id, display_name, initials),
  last_editor:profiles!last_edited_by(id, display_name, initials)
`;

// Returns the ISO date string for the Monday of the current week.
function thisMonday() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff)
    .toISOString().split('T')[0];
}

// Formats a week_start date as "Week of May 12, 2026"
function formatWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return 'Week of ' + d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// Inline editable pulse card
function PulseCard({ log, onSaved }) {
  const { profile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({ this_week: log.this_week, watch_next_week: log.watch_next_week ?? '' });
  const [saving, setSaving]   = useState(false);
  const [showComments, setShowComments] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from('pulse_logs')
      .update({
        this_week:       form.this_week.trim(),
        watch_next_week: form.watch_next_week.trim() || null,
        last_edited_by:  profile.id,
      })
      .eq('id', log.id);

    setSaving(false);
    if (!error) {
      setEditing(false);
      onSaved();
    }
  }

  const editedBy = log.last_editor?.initials;
  const createdBy = log.contributor?.initials ?? '?';
  const attribution = editedBy && editedBy !== createdBy
    ? `${createdBy} logged · ${editedBy} edited ${relativeTime(log.updated_at)}`
    : `${createdBy} logged ${relativeTime(log.created_at)}`;

  return (
    <div className="bg-white border border-light-grey rounded-lg p-5">
      {/* Card header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-dark-grey">{formatWeek(log.week_start)}</h3>
          <p className="text-xs text-light-grey mt-0.5">{attribution}</p>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button
                onClick={() => { setEditing(false); setForm({ this_week: log.this_week, watch_next_week: log.watch_next_week ?? '' }); }}
                className="text-xs px-3 py-1.5 rounded border border-light-grey text-mid-grey hover:border-mid-grey"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="text-xs px-3 py-1.5 rounded text-white font-medium disabled:opacity-60"
                style={{ backgroundColor: '#73000A' }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="text-xs px-3 py-1.5 rounded border border-light-grey text-mid-grey hover:border-mid-grey"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {/* This week */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-mid-grey uppercase tracking-wide mb-1.5">This week</p>
        {editing ? (
          <textarea
            value={form.this_week}
            onChange={(e) => setForm({ ...form, this_week: e.target.value })}
            rows={4}
            className="w-full border border-light-grey rounded px-3 py-2 text-sm text-dark-grey focus:outline-none focus:border-garnet resize-y"
          />
        ) : (
          <p className="text-sm text-dark-grey leading-relaxed whitespace-pre-wrap">{log.this_week}</p>
        )}
      </div>

      {/* Watch next week */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-mid-grey uppercase tracking-wide mb-1.5">Watch next week</p>
        {editing ? (
          <textarea
            value={form.watch_next_week}
            onChange={(e) => setForm({ ...form, watch_next_week: e.target.value })}
            rows={2}
            placeholder="Anything to keep an eye on?"
            className="w-full border border-light-grey rounded px-3 py-2 text-sm text-dark-grey focus:outline-none focus:border-garnet resize-y"
          />
        ) : log.watch_next_week ? (
          <p className="text-sm text-dark-grey leading-relaxed whitespace-pre-wrap">{log.watch_next_week}</p>
        ) : (
          <p className="text-sm text-light-grey">Nothing flagged.</p>
        )}
      </div>

      {/* Comments toggle */}
      <div className="border-t border-light-grey pt-3">
        <button
          onClick={() => setShowComments((v) => !v)}
          className="text-xs text-mid-grey hover:text-garnet"
        >
          {showComments ? 'Hide comments' : 'Comments'}
        </button>
        {showComments && (
          <div className="mt-4">
            <CommentThread parentType="pulse_log" parentId={log.id} />
          </div>
        )}
      </div>
    </div>
  );
}

// Inline new pulse form (expands under the button)
function NewPulseForm({ onSaved, onCancel, existingWeeks }) {
  const { profile } = useAuth();
  const [form, setForm]   = useState({ week_start: thisMonday(), this_week: '', watch_next_week: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const weekAlreadyLogged = existingWeeks.includes(form.week_start);

  async function submit(e) {
    e.preventDefault();
    if (!form.this_week.trim()) { setError('This week field is required.'); return; }
    if (weekAlreadyLogged) { setError('A pulse log for this week already exists.'); return; }
    setError('');
    setSaving(true);

    const { error } = await supabase.from('pulse_logs').insert({
      week_start:      form.week_start,
      this_week:       form.this_week.trim(),
      watch_next_week: form.watch_next_week.trim() || null,
      contributor_id:  profile.id,
      last_edited_by:  profile.id,
    });

    setSaving(false);
    if (error) { setError(error.message); return; }
    onSaved();
  }

  return (
    <form
      onSubmit={submit}
      className="bg-garnet-tint border border-light-grey rounded-lg p-5 mb-6 space-y-4"
    >
      <h3 className="text-sm font-semibold text-dark-grey">Log this week's pulse</h3>

      {/* Week start */}
      <div>
        <label className="block text-xs font-semibold text-mid-grey uppercase tracking-wide mb-1">
          Week of (Monday)
        </label>
        <input
          type="date"
          value={form.week_start}
          onChange={(e) => setForm({ ...form, week_start: e.target.value })}
          className="border border-light-grey rounded px-3 py-2 text-sm text-dark-grey focus:outline-none focus:border-garnet"
        />
        {weekAlreadyLogged && (
          <p className="text-xs text-amber-600 mt-1">A pulse log for this week already exists.</p>
        )}
      </div>

      {/* This week */}
      <div>
        <label className="block text-xs font-semibold text-mid-grey uppercase tracking-wide mb-1">
          This week <span className="text-garnet">*</span>
        </label>
        <textarea
          value={form.this_week}
          onChange={(e) => setForm({ ...form, this_week: e.target.value })}
          rows={4}
          placeholder="What happened this week? Key issues, progress, observations."
          className="w-full border border-light-grey rounded px-3 py-2 text-sm text-dark-grey focus:outline-none focus:border-garnet resize-y"
          autoFocus
        />
      </div>

      {/* Watch next week */}
      <div>
        <label className="block text-xs font-semibold text-mid-grey uppercase tracking-wide mb-1">
          Watch next week
        </label>
        <textarea
          value={form.watch_next_week}
          onChange={(e) => setForm({ ...form, watch_next_week: e.target.value })}
          rows={2}
          placeholder="Anything to keep an eye on next week?"
          className="w-full border border-light-grey rounded px-3 py-2 text-sm text-dark-grey focus:outline-none focus:border-garnet resize-y"
        />
      </div>

      {error && <p className="text-sm text-garnet">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving || weekAlreadyLogged}
          className="text-sm px-5 py-2 rounded text-white font-medium disabled:opacity-60"
          style={{ backgroundColor: '#73000A' }}
        >
          {saving ? 'Saving...' : 'Save pulse'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm px-4 py-2 rounded border border-light-grey text-mid-grey hover:border-mid-grey"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function PulseLog() {
  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel('pulse-logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pulse_logs' }, fetchLogs)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  async function fetchLogs() {
    const { data } = await supabase
      .from('pulse_logs')
      .select(PULSE_SELECT)
      .order('week_start', { ascending: false });
    setLogs(data ?? []);
    setLoading(false);
  }

  const existingWeeks = logs.map((l) => l.week_start);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-dark-grey">Pulse Log</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 rounded text-sm font-medium text-white"
            style={{ backgroundColor: '#73000A' }}
          >
            + Log this week's pulse
          </button>
        )}
      </div>

      {/* New pulse form */}
      {showForm && (
        <NewPulseForm
          onSaved={() => { setShowForm(false); fetchLogs(); }}
          onCancel={() => setShowForm(false)}
          existingWeeks={existingWeeks}
        />
      )}

      {/* Log list */}
      {loading && <p className="text-sm text-mid-grey">Loading...</p>}

      {!loading && !logs.length && (
        <p className="text-sm text-mid-grey">No pulse logs yet. Log this week's pulse to get started.</p>
      )}

      <div className="space-y-4">
        {logs.map((log) => (
          <PulseCard key={log.id} log={log} onSaved={fetchLogs} />
        ))}
      </div>
    </div>
  );
}
