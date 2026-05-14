import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { FilterRail } from '../components/FilterRail';
import { EntryCard } from '../components/EntryCard';
import { EntryForm } from '../components/EntryForm';
import { CATEGORY_ORDER, CATEGORY_LABELS } from '../lib/labels';

const DEFAULT_FILTERS = {
  categories:      [],
  priorities:      [],
  statuses:        [],
  needsNextStep:   false,
  mine:            false,
  updatedThisWeek: false,
  tag:             '',
};

const ENTRY_SELECT = `
  id, category, title, context, priority, status,
  next_step, tags, occurred_on, created_at, updated_at,
  contributor:profiles!contributor_id(display_name, initials),
  last_editor:profiles!last_edited_by(display_name, initials)
`;

export default function Feed() {
  const { profile } = useAuth();
  const [entries, setEntries]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [filters, setFilters]   = useState(DEFAULT_FILTERS);
  const [showNewEntry, setShowNewEntry] = useState(false);

  // Initial fetch
  useEffect(() => {
    fetchEntries();
  }, []);

  async function fetchEntries() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('entries')
      .select(ENTRY_SELECT)
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setEntries(data ?? []);
    }
    setLoading(false);
  }

  // Realtime subscription -- keeps the feed live without refresh
  useEffect(() => {
    const channel = supabase
      .channel('feed-entries')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'entries' },
        () => fetchEntries()  // re-fetch so we get the joined profile data
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'entries' },
        (payload) => {
          // Optimistic update for edits -- re-fetch to get fresh joins
          fetchEntries();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // All unique tags across entries (for FilterRail autocomplete)
  const allTags = useMemo(() => {
    const set = new Set(entries.flatMap((e) => e.tags ?? []));
    return Array.from(set).sort();
  }, [entries]);

  // Client-side filtering
  const filtered = useMemo(() => {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return entries.filter((e) => {
      if (filters.categories.length && !filters.categories.includes(e.category)) return false;
      if (filters.priorities.length && !filters.priorities.includes(e.priority)) return false;
      if (filters.statuses.length   && !filters.statuses.includes(e.status))     return false;
      if (filters.needsNextStep && e.next_step?.trim())                           return false;
      if (filters.mine && e.contributor?.display_name !== profile?.display_name)  return false;
      if (filters.updatedThisWeek && new Date(e.updated_at).getTime() < oneWeekAgo) return false;
      if (filters.tag && !(e.tags ?? []).some((t) =>
        t.toLowerCase().includes(filters.tag.toLowerCase())
      )) return false;
      return true;
    });
  }, [entries, filters, profile]);

  // Group by category in spec order
  const grouped = useMemo(() => {
    const map = {};
    for (const cat of CATEGORY_ORDER) {
      const group = filtered.filter((e) => e.category === cat);
      if (group.length) map[cat] = group;
    }
    return map;
  }, [filtered]);

  return (
    <>
    {showNewEntry && (
      <EntryForm
        onClose={() => setShowNewEntry(false)}
        existingTags={allTags}
      />
    )}
    <div className="flex gap-6">
      {/* Filter rail */}
      <FilterRail filters={filters} onChange={setFilters} allTags={allTags} />

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-mid-grey">
            {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
            {filtered.length !== entries.length && ` of ${entries.length}`}
          </p>
          <button
            className="px-4 py-2 rounded text-sm font-medium text-white"
            style={{ backgroundColor: '#73000A' }}
            onClick={() => setShowNewEntry(true)}
          >
            + New entry
          </button>
        </div>

        {/* States */}
        {loading && (
          <p className="text-sm text-mid-grey">Loading...</p>
        )}

        {error && (
          <p className="text-sm text-garnet">Error loading entries: {error}</p>
        )}

        {!loading && !error && !filtered.length && (
          <p className="text-sm text-mid-grey">
            {entries.length ? 'No entries match the current filters.' : 'No entries yet. Add the first one.'}
          </p>
        )}

        {/* Grouped entry cards */}
        {!loading && !error && Object.entries(grouped).map(([cat, catEntries]) => (
          <div key={cat} className="mb-8">
            <h2 className="text-xs font-semibold text-mid-grey uppercase tracking-wider mb-3 pb-1 border-b border-light-grey">
              {CATEGORY_LABELS[cat]}
              <span className="ml-2 font-normal">({catEntries.length})</span>
            </h2>
            <div className="grid gap-3">
              {catEntries.map((entry) => (
                <EntryCard key={entry.id} entry={entry} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
    </>
  );
}
