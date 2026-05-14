import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { exportCSV, exportJSON, exportWord } from '../lib/export';
import { relativeTime } from '../lib/labels';

// ---- Shared section wrapper ----

function Section({ title, children }) {
  return (
    <div className="bg-white border border-light-grey rounded-lg p-6 mb-6">
      <h2 className="text-sm font-semibold text-dark-grey mb-4 pb-3 border-b border-light-grey">
        {title}
      </h2>
      {children}
    </div>
  );
}

// ---- User Management ----

function UserRow({ user, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({ display_name: user.display_name, initials: user.initials });
  const [saving, setSaving]   = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: form.display_name.trim(), initials: form.initials.trim().toUpperCase() })
      .eq('id', user.id);
    setSaving(false);
    if (!error) { setEditing(false); onSaved(); }
  }

  return (
    <tr className="border-b border-light-grey last:border-0">
      <td className="py-3 pr-4">
        {editing ? (
          <input
            type="text"
            value={form.display_name}
            onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            className="border border-light-grey rounded px-2 py-1 text-sm focus:outline-none focus:border-garnet w-full"
          />
        ) : (
          <span className="text-sm text-dark-grey font-medium">{user.display_name}</span>
        )}
      </td>
      <td className="py-3 pr-4">
        {editing ? (
          <input
            type="text"
            value={form.initials}
            onChange={(e) => setForm({ ...form, initials: e.target.value })}
            maxLength={4}
            className="border border-light-grey rounded px-2 py-1 text-sm focus:outline-none focus:border-garnet w-16 uppercase"
          />
        ) : (
          <span className="text-sm text-mid-grey">{user.initials}</span>
        )}
      </td>
      <td className="py-3 pr-4">
        <span className="text-xs text-mid-grey">{user.username}</span>
      </td>
      <td className="py-3 pr-4">
        {user.is_admin ? (
          <span className="text-xs px-2 py-0.5 rounded-full bg-garnet-tint text-garnet border border-garnet/20 font-medium">
            Admin
          </span>
        ) : (
          <span className="text-xs text-light-grey">User</span>
        )}
      </td>
      <td className="py-3 pr-4">
        <span className="text-xs text-mid-grey">
          {user.last_active_at ? relativeTime(user.last_active_at) : 'Never'}
        </span>
      </td>
      <td className="py-3 text-right">
        {editing ? (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => { setEditing(false); setForm({ display_name: user.display_name, initials: user.initials }); }}
              className="text-xs px-2.5 py-1 rounded border border-light-grey text-mid-grey hover:border-mid-grey"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="text-xs px-2.5 py-1 rounded text-white disabled:opacity-60"
              style={{ backgroundColor: '#73000A' }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-xs px-2.5 py-1 rounded border border-light-grey text-mid-grey hover:border-mid-grey"
          >
            Edit
          </button>
        )}
      </td>
    </tr>
  );
}

function UserManagement() {
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, initials, username, is_admin, last_active_at')
      .order('display_name');
    setUsers(data ?? []);
    setLoading(false);
  }

  return (
    <Section title="Users">
      {loading ? (
        <p className="text-sm text-mid-grey">Loading...</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-light-grey">
                  {['Name', 'Initials', 'Username', 'Role', 'Last active', ''].map((h) => (
                    <th key={h} className="pb-2 pr-4 text-xs font-semibold text-mid-grey uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <UserRow key={u.id} user={u} onSaved={fetchUsers} />
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-light-grey mt-4">
            To change a user's password, go to Supabase Dashboard: Authentication: Users, select the user, and use "Send password reset" or update manually.
          </p>
        </>
      )}
    </Section>
  );
}

// ---- Export Panel ----

function ExportPanel() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState('');

  async function fetchAllEntries() {
    const { data, error } = await supabase
      .from('entries')
      .select(`
        id, category, title, context, priority, status,
        next_step, tags, occurred_on, created_at, updated_at,
        profiles:contributor_id(display_name),
        last_editor:profiles!last_edited_by(display_name)
      `)
      .order('category')
      .order('created_at');
    if (error) throw error;
    // Normalize joined fields for export helpers
    return (data ?? []).map((e) => ({
      ...e,
      contributor: e.profiles,
    }));
  }

  async function handle(fn, label) {
    setLoading(true);
    setStatus(`Preparing ${label}...`);
    try {
      const entries = await fetchAllEntries();
      await fn(entries);
      setStatus(`${label} downloaded.`);
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
      setTimeout(() => setStatus(''), 3000);
    }
  }

  const exports = [
    { label: 'CSV',      fn: exportCSV,  desc: 'Spreadsheet-ready, all fields' },
    { label: 'JSON',     fn: exportJSON, desc: 'Raw data, all fields' },
    { label: 'Word doc', fn: exportWord, desc: 'Retrospective-ready, grouped by category' },
  ];

  return (
    <Section title="Export">
      <div className="grid grid-cols-3 gap-4 mb-3">
        {exports.map(({ label, fn, desc }) => (
          <button
            key={label}
            onClick={() => handle(fn, label)}
            disabled={loading}
            className="flex flex-col items-start p-4 rounded-lg border border-light-grey hover:border-garnet hover:bg-garnet-tint transition-colors disabled:opacity-50 text-left"
          >
            <span className="text-sm font-semibold text-dark-grey mb-1">{label}</span>
            <span className="text-xs text-mid-grey">{desc}</span>
          </button>
        ))}
      </div>
      {status && <p className="text-xs text-mid-grey">{status}</p>}
    </Section>
  );
}

// ---- Tag Cleanup ----

function TagCleanup() {
  const { profile } = useAuth();
  const [tagMap, setTagMap]       = useState({});  // tag -> count
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState('');
  const [replacement, setReplacement] = useState('');
  const [working, setWorking]     = useState(false);
  const [message, setMessage]     = useState('');

  useEffect(() => { buildTagMap(); }, []);

  async function buildTagMap() {
    setLoading(true);
    const { data } = await supabase.from('entries').select('tags');
    const counts = {};
    for (const row of data ?? []) {
      for (const tag of row.tags ?? []) {
        counts[tag] = (counts[tag] ?? 0) + 1;
      }
    }
    setTagMap(counts);
    setLoading(false);
  }

  async function renameTag() {
    const oldTag = selected.trim();
    const newTag = replacement.trim().toLowerCase().replace(/\s+/g, '-');
    if (!oldTag || !newTag || oldTag === newTag) return;

    setWorking(true);
    setMessage('');

    // Fetch all entries with the old tag
    const { data: entries } = await supabase
      .from('entries')
      .select('id, tags')
      .contains('tags', [oldTag]);

    let updated = 0;
    for (const entry of entries ?? []) {
      const newTags = entry.tags.map((t) => (t === oldTag ? newTag : t));
      const { error } = await supabase
        .from('entries')
        .update({ tags: newTags, last_edited_by: profile.id })
        .eq('id', entry.id);
      if (!error) updated++;
    }

    setMessage(`Renamed "${oldTag}" to "${newTag}" across ${updated} entries.`);
    setSelected('');
    setReplacement('');
    await buildTagMap();
    setWorking(false);
  }

  const sorted = Object.entries(tagMap).sort((a, b) => b[1] - a[1]);

  return (
    <Section title="Tag cleanup">
      {loading ? (
        <p className="text-sm text-mid-grey">Loading tags...</p>
      ) : !sorted.length ? (
        <p className="text-sm text-mid-grey">No tags in use yet.</p>
      ) : (
        <div className="flex gap-6">
          {/* Tag list */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-mid-grey mb-2">Click a tag to select it for renaming.</p>
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
              {sorted.map(([tag, count]) => (
                <button
                  key={tag}
                  onClick={() => { setSelected(tag); setReplacement(tag); }}
                  className={[
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors',
                    selected === tag
                      ? 'bg-garnet text-white border-garnet'
                      : 'bg-gray-100 text-mid-grey border-light-grey hover:border-garnet hover:text-garnet',
                  ].join(' ')}
                >
                  {tag}
                  <span className={selected === tag ? 'text-white/70' : 'text-light-grey'}>
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Rename panel */}
          <div className="w-64 shrink-0">
            <p className="text-xs font-semibold text-mid-grey uppercase tracking-wide mb-2">
              Rename / merge
            </p>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-mid-grey block mb-1">From</label>
                <input
                  type="text"
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  placeholder="Select a tag from the list"
                  className="w-full border border-light-grey rounded px-2 py-1.5 text-sm text-dark-grey focus:outline-none focus:border-garnet"
                />
              </div>
              <div>
                <label className="text-xs text-mid-grey block mb-1">To</label>
                <input
                  type="text"
                  value={replacement}
                  onChange={(e) => setReplacement(e.target.value)}
                  placeholder="New tag name"
                  className="w-full border border-light-grey rounded px-2 py-1.5 text-sm text-dark-grey focus:outline-none focus:border-garnet"
                />
              </div>
              <button
                onClick={renameTag}
                disabled={working || !selected || !replacement || selected === replacement}
                className="w-full text-sm py-2 rounded text-white font-medium disabled:opacity-50"
                style={{ backgroundColor: '#73000A' }}
              >
                {working ? 'Updating...' : 'Rename tag'}
              </button>
              {message && <p className="text-xs text-mid-grey">{message}</p>}
            </div>
          </div>
        </div>
      )}
    </Section>
  );
}

// ---- Admin page ----

export default function Admin() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-lg font-semibold text-dark-grey mb-6">Admin</h1>
      <UserManagement />
      <ExportPanel />
      <TagCleanup />
    </div>
  );
}
