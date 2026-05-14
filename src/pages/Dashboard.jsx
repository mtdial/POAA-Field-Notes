import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  CATEGORY_LABELS, CATEGORY_ORDER,
  PRIORITY_LABELS, STATUS_LABELS,
} from '../lib/labels';

const PRIORITY_ORDER = ['high', 'medium', 'low', 'investigate'];
const STATUS_ORDER   = ['open', 'in_progress', 'resolved', 'wont_do', 'parked'];

// Dimension configs
const DIMS = {
  category: { order: CATEGORY_ORDER, labels: CATEGORY_LABELS, title: 'By Category' },
  priority: { order: PRIORITY_ORDER, labels: PRIORITY_LABELS, title: 'By Priority' },
  status:   { order: STATUS_ORDER,   labels: STATUS_LABELS,   title: 'By Status'   },
};

// Bar accent colors per dimension value (lighter palette for non-garnet dims)
const BAR_COLORS = {
  // categories -- garnet family
  issue:         '#73000A',
  tech:          '#73000A',
  data:          '#73000A',
  process:       '#73000A',
  win:           '#73000A',
  open_question: '#73000A',
  // priorities
  high:          '#B91C1C',
  medium:        '#D97706',
  low:           '#15803D',
  investigate:   '#7C3AED',
  // statuses
  open:          '#4B5563',
  in_progress:   '#1D4ED8',
  resolved:      '#15803D',
  wont_do:       '#9CA3AF',
  parked:        '#B45309',
};

function countBy(arr, key, order) {
  return order.map((v) => ({ value: v, count: arr.filter((e) => e[key] === v).length }));
}

// ─── BarChart ──────────────────────────────────────────────────────────────────
function BarChart({ dimension, data, labels, allData, activeFilter, onBarClick }) {
  const isSource  = activeFilter?.dimension === dimension;
  const isFiltered = activeFilter && !isSource;

  // Max for bar scaling: scale to the largest bar in this chart's current data
  const max = Math.max(...data.map((d) => d.count), 1);

  // Total shown vs total all
  const shownTotal = data.reduce((s, d) => s + d.count, 0);
  const allTotal   = allData.reduce((s, d) => s + d.count, 0);

  const { title } = DIMS[dimension];

  return (
    <div className="bg-white rounded-xl border border-light-grey p-5 flex flex-col gap-4">
      {/* Chart header */}
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-xs font-semibold text-mid-grey uppercase tracking-widest">{title}</h2>
        {isFiltered && (
          <span className="text-xs text-mid-grey shrink-0">
            {shownTotal} of {allTotal}
          </span>
        )}
        {isSource && (
          <span className="text-xs font-medium shrink-0" style={{ color: '#73000A' }}>
            {DIMS[dimension].labels[activeFilter.value]} selected
          </span>
        )}
      </div>

      {/* Bars */}
      <div className="space-y-3">
        {data.map(({ value, count }) => {
          const isSelected = isSource && activeFilter.value === value;
          const isDimmed   = isSource && !isSelected;
          const pct        = max > 0 ? (count / max) * 100 : 0;
          const color      = BAR_COLORS[value] ?? '#73000A';

          return (
            <button
              key={value}
              onClick={() => onBarClick(dimension, value)}
              className="w-full text-left focus:outline-none group"
              aria-pressed={isSelected}
            >
              <div className="flex items-center gap-3">
                {/* Label */}
                <span
                  className="text-xs leading-tight text-right shrink-0 transition-colors"
                  style={{
                    width: '108px',
                    color: isDimmed ? '#BFBFBF' : '#595959',
                  }}
                >
                  {labels[value]}
                </span>

                {/* Track + fill */}
                <div className="flex-1 h-6 rounded bg-gray-100 overflow-hidden relative">
                  <div
                    className="h-full rounded transition-all duration-300"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: color,
                      opacity: isDimmed ? 0.2 : isSelected ? 1 : 0.75,
                    }}
                  />
                  {/* Selected ring */}
                  {isSelected && (
                    <div
                      className="absolute inset-0 rounded ring-2 pointer-events-none"
                      style={{ ringColor: color, boxShadow: `0 0 0 2px ${color}` }}
                    />
                  )}
                </div>

                {/* Count */}
                <span
                  className="text-xs font-semibold w-6 shrink-0 transition-colors tabular-nums"
                  style={{
                    color: isDimmed ? '#BFBFBF' : isSelected ? color : '#2B2B2B',
                  }}
                >
                  {count}
                </span>
              </div>

              {/* "Click to clear" hint under selected bar */}
              {isSelected && (
                <p
                  className="text-xs mt-0.5 pl-28 transition-all"
                  style={{ color: color, paddingLeft: '132px' }}
                >
                  Click to clear filter
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [entries, setEntries]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeFilter, setActive] = useState(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('entries')
        .select('id, category, priority, status');
      setEntries(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  function handleBarClick(dimension, value) {
    setActive((prev) =>
      prev?.dimension === dimension && prev?.value === value
        ? null
        : { dimension, value }
    );
  }

  // Filtered subset used by non-source charts
  const filtered = activeFilter
    ? entries.filter((e) => e[activeFilter.dimension] === activeFilter.value)
    : entries;

  // Each chart gets: its own dimension's data (always full for source, filtered otherwise)
  function chartData(dimension) {
    const { order } = DIMS[dimension];
    const source = activeFilter?.dimension === dimension ? entries : filtered;
    return countBy(source, dimension, order);
  }

  // All-data counts (for "X of Y" label on filtered charts)
  function allChartData(dimension) {
    return countBy(entries, dimension, DIMS[dimension].order);
  }

  const activeName = activeFilter
    ? DIMS[activeFilter.dimension].labels[activeFilter.value]
    : null;

  const filteredCount  = filtered.length;
  const totalCount     = entries.length;

  return (
    <div className="max-w-screen-xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-dark-grey">Dashboard</h1>
          <p className="text-xs text-mid-grey mt-0.5">
            {totalCount} {totalCount === 1 ? 'entry' : 'entries'} total
          </p>
        </div>

        {/* Active filter badge */}
        {activeFilter && (
          <div
            className="flex items-center gap-3 px-4 py-2 rounded-lg border text-sm font-medium"
            style={{
              backgroundColor: '#F4ECEC',
              borderColor: '#73000A33',
              color: '#73000A',
            }}
          >
            <span>
              Showing <strong>{filteredCount}</strong> {filteredCount === 1 ? 'entry' : 'entries'} for{' '}
              <strong>{activeName}</strong>
            </span>
            <button
              onClick={() => setActive(null)}
              className="ml-1 text-xs underline underline-offset-2 hover:no-underline"
              style={{ color: '#73000A' }}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-mid-grey">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {(['category', 'priority', 'status']).map((dim) => (
            <BarChart
              key={dim}
              dimension={dim}
              data={chartData(dim)}
              labels={DIMS[dim].labels}
              allData={allChartData(dim)}
              activeFilter={activeFilter}
              onBarClick={handleBarClick}
            />
          ))}
        </div>
      )}

      {/* Empty state when filter yields nothing */}
      {!loading && activeFilter && filteredCount === 0 && (
        <p className="text-sm text-mid-grey text-center mt-8">
          No entries match this filter.
        </p>
      )}
    </div>
  );
}
