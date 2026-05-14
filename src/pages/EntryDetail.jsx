import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { CommentThread } from '../components/CommentThread';
import { TagChips } from '../components/TagChips';
import { joinNamedPresence } from '../lib/presence';
import {
  CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS,
  PRIORITY_COLORS, STATUS_COLORS, relativeTime,
} from '../lib/labels';

// Shows other users currently viewing this entry.
function EntryViewers({ entryId }) {
  const { profile } = useAuth();
  const [viewers, setViewers] = useState([]);

  useEffect(() => {
    if (!entryId || !profile) return;
    const leave = joinNamedPresence(
      `entry-${entryId}`,
      { id: profile.id, display_name: profile.display_name, initials: profile.initials },
      (users) => {
        // Exclude the current user from the displayed list
        setViewers(users.filter((u) => u.id !== profile.id));
      }
    );
    return leave;
  }, [entryId, profile]);

  if (!viewers.length) return null;

  const names = viewers.map((v) => v.display_name.split(' ')[0]);
  const label = names.length === 1
    ? `${names[0]} is viewing this entry`
    : `${names.slice(0, -1).join(', ')} and ${names.at(-1)} are viewing this entry`;

  return (
    <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-garnet-tint border border-garnet/20">
      <div className="flex -space-x-1">
        {viewers.map((v) => (
          <span
            key={v.id}
            title={v.display_name}
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white ring-2 ring-white"
            style={{ backgroundColor: '#73000A' }}
          >
            {v.initials}
          </span>
        ))}
      </div>
      <span className="text-xs text-garnet">{label}</span>
    </div>
  );
}

const ENTRY_SELECT = `
  id, category, title, context, priority, status,
  next_step, tags, occurred_on, created_at, updated_at,
  contributor:profiles!contributor_id(id, display_name, initials),
  last_editor:profiles!last_edited_by(id, display_name, initials)
`;

const EDIT_LOG_SELECT = `
  id, field_name, old_value, new_value, edited_at,
  editor:profiles!editor_id(display_name, initials)
`;

function Chip({ label, colorClass }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      {label}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-mid-grey uppercase tracking-wide mb-1">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

// Inline tag editor: existing chips + "+ Add tag" input
function TagEditor({ tags, onChange }) {
  const [input, setInput] = useState('');

  function addTag() {
    const t = input.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setInput('');
  }

  function removeTag(tag) {
    onChange(tags.filter((t) => t !== tag));
  }

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-mid-grey border border-light-grey"
        >
          {tag}
          <button onClick={() => removeTag(tag)} className="hover:text-garnet leading-none">&times;</button>
        </span>
      ))}
      <span className="flex items-center gap-1">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); }
          }}
          placeholder="+ Add tag"
          className="text-xs border-0 border-b border-light-grey focus:outline-none focus:border-garnet px-1 py-0.5 w-24 bg-transparent text-dark-grey"
        />
      </span>
    </div>
  );
}

export default function EntryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [entry, setEntry]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [editing, setEditing]   = useState(false);
  const [form, setForm]         = useState({});
  const [saving, setSaving]     = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editLog, setEditLog]   = useState([]);
  const [logLoading, setLogLoading] = useState(false);

  useEffect(() => {
    fetchEntry();
  }, [id]);

  async function fetchEntry() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('entries')
      .select(ENTRY_SELECT)
      .eq('id', id)
      .single();

    if (error) {
      setError(error.message);
    } else {
      setEntry(data);
      setForm(entryToForm(data));
    }
    setLoading(false);
  }

  function entryToForm(e) {
    return {
      category:   e.category,
      title:      e.title,
      context:    e.context ?? '',
      priority:   e.priority,
      status:     e.status,
      next_step:  e.next_step ?? '',
      tags:       e.tags ?? [],
      occurred_on: e.occurred_on,
    };
  }

  async function saveEdit() {
    setSaving(true);
    const { error } = await supabase
      .from('entries')
      .update({ ...form, last_edited_by: profile.id })
      .eq('id', id);

    if (error) {
      alert(`Save failed: ${error.message}`);
    } else {
      await fetchEntry();
      setEditing(false);
    }
    setSaving(false);
  }

  function cancelEdit() {
    setForm(entryToForm(entry));
    setEditing(false);
  }

  async function loadHistory() {
    if (editLog.length) { setShowHistory((v) => !v); return; }
    setLogLoading(true);
    const { data } = await supabase
      .from('edit_log')
      .select(EDIT_LOG_SELECT)
      .eq('parent_type', 'entry')
      .eq('parent_id', id)
      .order('edited_at', { ascending: false });
    setEditLog(data ?? []);
    setLogLoading(false);
    setShowHistory(true);
  }

  if (loading) return <p className="text-sm text-mid-grey">Loading...</p>;
  if (error)   return <p className="text-sm text-garnet">Error: {error}</p>;
  if (!entry)  return <p className="text-sm text-mid-grey">Entry not found.</p>;

  const f = form;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back link */}
      <Link to="/" className="text-xs text-mid-grey hover:text-garnet mb-4 inline-block">
        &larr; Back to Feed
      </Link>

      {/* Per-entry viewer indicator */}
      <EntryViewers entryId={id} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              type="text"
              value={f.title}
              onChange={(e) => setForm({ ...f, title: e.target.value })}
              className="w-full text-xl font-bold text-dark-grey border-b border-garnet focus:outline-none pb-1 bg-transparent"
            />
          ) : (
            <h1 className="text-xl font-bold text-dark-grey leading-snug">{entry.title}</h1>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={loadHistory}
            className="text-xs px-3 py-1.5 rounded border border-light-grey text-mid-grey hover:border-mid-grey"
          >
            {showHistory ? 'Hide history' : 'History'}
          </button>
          {editing ? (
            <>
              <button
                onClick={cancelEdit}
                className="text-xs px-3 py-1.5 rounded border border-light-grey text-mid-grey hover:border-mid-grey"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
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

      {/* Edit log (reveal on demand) */}
      {showHistory && (
        <div className="mb-6 bg-gray-50 rounded-lg border border-light-grey p-4">
          <h3 className="text-xs font-semibold text-mid-grey uppercase tracking-wide mb-3">Edit history</h3>
          {logLoading && <p className="text-xs text-mid-grey">Loading...</p>}
          {!logLoading && !editLog.length && (
            <p className="text-xs text-light-grey">No edits recorded yet.</p>
          )}
          <div className="space-y-2">
            {editLog.map((log) => (
              <div key={log.id} className="text-xs text-mid-grey flex gap-2">
                <span className="font-semibold shrink-0">{log.editor?.initials}</span>
                <span>
                  changed <span className="font-medium text-dark-grey">{log.field_name}</span>
                  {log.old_value ? (
                    <> from <span className="line-through text-light-grey">{log.old_value}</span> to <span className="text-dark-grey">{log.new_value}</span></>
                  ) : (
                    <> to <span className="text-dark-grey">{log.new_value}</span></>
                  )}
                </span>
                <span className="ml-auto shrink-0 text-light-grey">{relativeTime(log.edited_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata grid */}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 mb-6 bg-garnet-tint rounded-lg p-4">
        <Field label="Category">
          {editing ? (
            <select
              value={f.category}
              onChange={(e) => setForm({ ...f, category: e.target.value })}
              className="text-sm border border-light-grey rounded px-2 py-1 focus:outline-none focus:border-garnet"
            >
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          ) : (
            <span className="text-sm text-dark-grey">{CATEGORY_LABELS[entry.category]}</span>
          )}
        </Field>

        <Field label="Occurred on">
          {editing ? (
            <input
              type="date"
              value={f.occurred_on}
              onChange={(e) => setForm({ ...f, occurred_on: e.target.value })}
              className="text-sm border border-light-grey rounded px-2 py-1 focus:outline-none focus:border-garnet"
            />
          ) : (
            <span className="text-sm text-dark-grey">{entry.occurred_on}</span>
          )}
        </Field>

        <Field label="Priority">
          {editing ? (
            <select
              value={f.priority}
              onChange={(e) => setForm({ ...f, priority: e.target.value })}
              className="text-sm border border-light-grey rounded px-2 py-1 focus:outline-none focus:border-garnet"
            >
              {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          ) : (
            <Chip label={PRIORITY_LABELS[entry.priority]} colorClass={PRIORITY_COLORS[entry.priority]} />
          )}
        </Field>

        <Field label="Status">
          {editing ? (
            <select
              value={f.status}
              onChange={(e) => setForm({ ...f, status: e.target.value })}
              className="text-sm border border-light-grey rounded px-2 py-1 focus:outline-none focus:border-garnet"
            >
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          ) : (
            <Chip label={STATUS_LABELS[entry.status]} colorClass={STATUS_COLORS[entry.status]} />
          )}
        </Field>

        <Field label="Created by">
          <span className="text-sm text-dark-grey">
            {entry.contributor?.display_name ?? 'Unknown'} {relativeTime(entry.created_at)}
          </span>
        </Field>

        <Field label="Last edited by">
          <span className="text-sm text-dark-grey">
            {entry.last_editor
              ? `${entry.last_editor.display_name} ${relativeTime(entry.updated_at)}`
              : 'Not yet edited'}
          </span>
        </Field>
      </dl>

      {/* Context */}
      <div className="mb-5">
        <h2 className="text-xs font-semibold text-mid-grey uppercase tracking-wide mb-2">Context</h2>
        {editing ? (
          <textarea
            value={f.context}
            onChange={(e) => setForm({ ...f, context: e.target.value })}
            rows={4}
            className="w-full border border-light-grey rounded px-3 py-2 text-sm text-dark-grey focus:outline-none focus:border-garnet resize-y"
          />
        ) : (
          <p className="text-sm text-dark-grey leading-relaxed whitespace-pre-wrap">
            {entry.context || <span className="text-light-grey">No context added.</span>}
          </p>
        )}
      </div>

      {/* Next step */}
      <div className="mb-5">
        <h2 className="text-xs font-semibold text-mid-grey uppercase tracking-wide mb-2">Next step</h2>
        {editing ? (
          <textarea
            value={f.next_step}
            onChange={(e) => setForm({ ...f, next_step: e.target.value })}
            rows={2}
            className="w-full border border-light-grey rounded px-3 py-2 text-sm text-dark-grey focus:outline-none focus:border-garnet resize-y"
            placeholder="What needs to happen next?"
          />
        ) : entry.next_step ? (
          <p className="text-sm text-dark-grey leading-relaxed whitespace-pre-wrap">{entry.next_step}</p>
        ) : (
          <p className="text-sm text-amber-600 font-medium">No next step defined.</p>
        )}
      </div>

      {/* Tags */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold text-mid-grey uppercase tracking-wide mb-2">Tags</h2>
        {editing ? (
          <TagEditor tags={f.tags} onChange={(tags) => setForm({ ...f, tags })} />
        ) : (
          <TagChips tags={entry.tags} />
        )}
        {!editing && !entry.tags?.length && (
          <span className="text-sm text-light-grey">No tags.</span>
        )}
      </div>

      {/* Divider */}
      <hr className="border-light-grey mb-6" />

      {/* Comment thread */}
      <CommentThread parentType="entry" parentId={id} />
    </div>
  );
}
