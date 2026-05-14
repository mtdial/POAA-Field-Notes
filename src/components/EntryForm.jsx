import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { CATEGORY_LABELS, CATEGORY_ORDER, PRIORITY_LABELS, STATUS_LABELS } from '../lib/labels';

const today = () => new Date().toISOString().split('T')[0];

const EMPTY_FORM = {
  category:    'issue',
  title:       '',
  context:     '',
  priority:    'medium',
  status:      'open',
  next_step:   '',
  tags:        [],
  occurred_on: today(),
};

// Auto-growing textarea: expands as the user types.
function AutoTextarea({ value, onChange, placeholder, rows = 2, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className={`w-full border border-light-grey rounded px-3 py-2 text-sm text-dark-grey focus:outline-none focus:border-garnet resize-none overflow-hidden ${className}`}
    />
  );
}

// Tag chip input with autocomplete against existing tags.
function TagInput({ tags, onChange, existingTags = [] }) {
  const [input, setInput]   = useState('');
  const [showSug, setShowSug] = useState(false);

  const suggestions = input.trim()
    ? existingTags.filter(
        (t) => t.toLowerCase().includes(input.toLowerCase()) && !tags.includes(t)
      ).slice(0, 6)
    : [];

  function addTag(raw) {
    const t = raw.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setInput('');
    setShowSug(false);
  }

  function removeTag(tag) {
    onChange(tags.filter((t) => t !== tag));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-mid-grey border border-light-grey"
          >
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="hover:text-garnet leading-none">&times;</button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowSug(true); }}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
              e.preventDefault();
              addTag(input);
            }
            if (e.key === 'Backspace' && !input && tags.length) {
              onChange(tags.slice(0, -1));
            }
          }}
          onBlur={() => setTimeout(() => setShowSug(false), 150)}
          placeholder="Type a tag and press Enter..."
          className="w-full border border-light-grey rounded px-3 py-2 text-sm text-dark-grey focus:outline-none focus:border-garnet"
        />
        {showSug && suggestions.length > 0 && (
          <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-light-grey rounded shadow-sm max-h-32 overflow-y-auto">
            {suggestions.map((t) => (
              <li key={t}>
                <button
                  type="button"
                  onMouseDown={() => addTag(t)}
                  className="w-full text-left px-3 py-1.5 text-xs text-dark-grey hover:bg-garnet-tint"
                >
                  {t}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function EntryForm({ onClose, existingTags = [] }) {
  const { profile } = useAuth();
  const navigate    = useNavigate();
  const [form, setForm]   = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const backdropRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setError('');
    setSaving(true);

    const { data, error } = await supabase
      .from('entries')
      .insert({
        category:      form.category,
        title:         form.title.trim(),
        context:       form.context.trim() || null,
        priority:      form.priority,
        status:        form.status,
        next_step:     form.next_step.trim() || null,
        tags:          form.tags,
        occurred_on:   form.occurred_on,
        contributor_id: profile.id,
        last_edited_by: profile.id,
      })
      .select('id')
      .single();

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    onClose();
    navigate(`/entries/${data.id}`);
  }

  return (
    // Backdrop
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      {/* Modal */}
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-5 py-4 rounded-t-xl"
          style={{ backgroundColor: '#73000A' }}
        >
          <h2 className="text-base font-semibold text-white">New entry</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white text-lg leading-none">&times;</button>
        </div>

        {/* Scrollable form body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-mid-grey uppercase tracking-wide mb-1">
              Category
            </label>
            <select
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              className="w-full border border-light-grey rounded px-3 py-2 text-sm text-dark-grey focus:outline-none focus:border-garnet"
            >
              {CATEGORY_ORDER.map((v) => (
                <option key={v} value={v}>{CATEGORY_LABELS[v]}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-mid-grey uppercase tracking-wide mb-1">
              Title <span className="text-garnet">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Brief description of the issue, idea, or note"
              className="w-full border border-light-grey rounded px-3 py-2 text-sm text-dark-grey focus:outline-none focus:border-garnet"
              autoFocus
            />
          </div>

          {/* Context */}
          <div>
            <label className="block text-xs font-semibold text-mid-grey uppercase tracking-wide mb-1">
              Context
            </label>
            <AutoTextarea
              value={form.context}
              onChange={(e) => set('context', e.target.value)}
              placeholder="What happened? What's the background?"
              rows={3}
            />
          </div>

          {/* Priority + Status side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-mid-grey uppercase tracking-wide mb-1">
                Priority
              </label>
              <select
                value={form.priority}
                onChange={(e) => set('priority', e.target.value)}
                className="w-full border border-light-grey rounded px-3 py-2 text-sm text-dark-grey focus:outline-none focus:border-garnet"
              >
                {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-mid-grey uppercase tracking-wide mb-1">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                className="w-full border border-light-grey rounded px-3 py-2 text-sm text-dark-grey focus:outline-none focus:border-garnet"
              >
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Next step */}
          <div>
            <label className="block text-xs font-semibold text-mid-grey uppercase tracking-wide mb-1">
              Next step
            </label>
            <AutoTextarea
              value={form.next_step}
              onChange={(e) => set('next_step', e.target.value)}
              placeholder="What needs to happen next?"
              rows={2}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-mid-grey uppercase tracking-wide mb-1">
              Tags
            </label>
            <TagInput
              tags={form.tags}
              onChange={(tags) => set('tags', tags)}
              existingTags={existingTags}
            />
          </div>

          {/* Occurred on */}
          <div>
            <label className="block text-xs font-semibold text-mid-grey uppercase tracking-wide mb-1">
              Occurred on
            </label>
            <input
              type="date"
              value={form.occurred_on}
              onChange={(e) => set('occurred_on', e.target.value)}
              className="border border-light-grey rounded px-3 py-2 text-sm text-dark-grey focus:outline-none focus:border-garnet"
            />
          </div>

          {error && <p className="text-sm text-garnet">{error}</p>}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-light-grey">
          <button
            type="button"
            onClick={onClose}
            className="text-sm px-4 py-2 rounded border border-light-grey text-mid-grey hover:border-mid-grey"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="text-sm px-5 py-2 rounded text-white font-medium disabled:opacity-60"
            style={{ backgroundColor: '#73000A' }}
          >
            {saving ? 'Saving...' : 'Save entry'}
          </button>
        </div>
      </div>
    </div>
  );
}
