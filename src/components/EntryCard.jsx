import { Link } from 'react-router-dom';
import { TagChips } from './TagChips';
import {
  PRIORITY_LABELS, STATUS_LABELS,
  PRIORITY_COLORS, STATUS_COLORS,
  relativeTime,
} from '../lib/labels';

function Chip({ label, colorClass }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      {label}
    </span>
  );
}

export function EntryCard({ entry }) {
  const {
    id, title, category, priority, status,
    context, next_step, tags,
    contributor, last_editor,
    created_at, updated_at,
    comment_count = 0,
  } = entry;

  const needsNextStep = !next_step?.trim();

  // Attribution: "MTD created · JB edited 2h ago" or "MTD created 3d ago"
  const createdBy = contributor?.initials ?? '?';
  const editedBy  = last_editor?.initials;
  const attribution = editedBy && editedBy !== createdBy
    ? `${createdBy} created · ${editedBy} edited ${relativeTime(updated_at)}`
    : `${createdBy} created ${relativeTime(created_at)}`;

  return (
    <Link
      to={`/entries/${id}`}
      className="block bg-white border border-light-grey rounded-lg p-4 hover:border-garnet hover:shadow-sm transition-all"
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-dark-grey leading-snug flex-1">
          {title}
        </h3>
        {needsNextStep && (
          <span className="shrink-0 inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            needs next step
          </span>
        )}
      </div>

      {/* Status + priority chips */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        <Chip label={PRIORITY_LABELS[priority]} colorClass={PRIORITY_COLORS[priority]} />
        <Chip label={STATUS_LABELS[status]}     colorClass={STATUS_COLORS[status]} />
      </div>

      {/* Context preview */}
      {context && (
        <p className="text-xs text-mid-grey leading-relaxed mb-2 line-clamp-2">
          {context}
        </p>
      )}

      {/* Tags */}
      <div className="mb-3">
        <TagChips tags={tags} />
      </div>

      {/* Footer: attribution + comment count */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-light-grey">{attribution}</span>
        {comment_count > 0 && (
          <span className="text-xs text-mid-grey">
            {comment_count} {comment_count === 1 ? 'comment' : 'comments'}
          </span>
        )}
      </div>
    </Link>
  );
}
