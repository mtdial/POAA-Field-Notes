import {
  CATEGORY_LABELS, CATEGORY_ORDER,
  PRIORITY_LABELS, STATUS_LABELS,
  PRIORITY_COLORS, STATUS_COLORS,
} from '../lib/labels';

function SectionLabel({ children }) {
  return (
    <p className="text-xs font-semibold text-mid-grey uppercase tracking-wide mb-1.5">
      {children}
    </p>
  );
}

function FilterChip({ label, active, colorClass = '', onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
        active
          ? colorClass || 'bg-garnet text-white border-garnet'
          : 'bg-white text-mid-grey border-light-grey hover:border-mid-grey',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

export function FilterRail({ filters, onChange, allTags = [] }) {
  function toggle(key, value) {
    const current = filters[key];
    if (Array.isArray(current)) {
      onChange({
        ...filters,
        [key]: current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value],
      });
    } else {
      onChange({ ...filters, [key]: !current });
    }
  }

  const hasAnyFilter =
    filters.categories.length ||
    filters.priorities.length ||
    filters.statuses.length ||
    filters.needsNextStep ||
    filters.mine ||
    filters.updatedThisWeek ||
    filters.tag;

  return (
    <aside className="w-52 shrink-0 space-y-5">
      {/* Quick filters */}
      <div>
        <SectionLabel>Quick filters</SectionLabel>
        <div className="flex flex-col gap-1.5">
          <FilterChip
            label="Needs next step"
            active={filters.needsNextStep}
            onClick={() => toggle('needsNextStep')}
          />
          <FilterChip
            label="Mine"
            active={filters.mine}
            onClick={() => toggle('mine')}
          />
          <FilterChip
            label="Updated this week"
            active={filters.updatedThisWeek}
            onClick={() => toggle('updatedThisWeek')}
          />
        </div>
      </div>

      {/* Category */}
      <div>
        <SectionLabel>Category</SectionLabel>
        <div className="flex flex-col gap-1">
          {CATEGORY_ORDER.map((cat) => (
            <label key={cat} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.categories.includes(cat)}
                onChange={() => toggle('categories', cat)}
                className="accent-garnet"
              />
              <span className="text-xs text-dark-grey group-hover:text-garnet">
                {CATEGORY_LABELS[cat]}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Priority */}
      <div>
        <SectionLabel>Priority</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(PRIORITY_LABELS).map(([val, label]) => (
            <FilterChip
              key={val}
              label={label}
              active={filters.priorities.includes(val)}
              colorClass={filters.priorities.includes(val) ? PRIORITY_COLORS[val] : ''}
              onClick={() => toggle('priorities', val)}
            />
          ))}
        </div>
      </div>

      {/* Status */}
      <div>
        <SectionLabel>Status</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <FilterChip
              key={val}
              label={label}
              active={filters.statuses.includes(val)}
              colorClass={filters.statuses.includes(val) ? STATUS_COLORS[val] : ''}
              onClick={() => toggle('statuses', val)}
            />
          ))}
        </div>
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div>
          <SectionLabel>Tag</SectionLabel>
          <input
            type="text"
            value={filters.tag}
            onChange={(e) => onChange({ ...filters, tag: e.target.value })}
            placeholder="Filter by tag..."
            className="w-full border border-light-grey rounded px-2 py-1 text-xs text-dark-grey focus:outline-none focus:border-garnet"
          />
          {filters.tag && (
            <div className="mt-1 flex flex-wrap gap-1">
              {allTags
                .filter((t) => t.toLowerCase().includes(filters.tag.toLowerCase()))
                .slice(0, 8)
                .map((t) => (
                  <button
                    key={t}
                    onClick={() => onChange({ ...filters, tag: t })}
                    className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-mid-grey hover:bg-garnet-tint hover:text-garnet border border-light-grey"
                  >
                    {t}
                  </button>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Clear all */}
      {hasAnyFilter && (
        <button
          onClick={() =>
            onChange({
              categories: [], priorities: [], statuses: [],
              needsNextStep: false, mine: false, updatedThisWeek: false, tag: '',
            })
          }
          className="text-xs text-garnet underline underline-offset-2"
        >
          Clear all filters
        </button>
      )}
    </aside>
  );
}
