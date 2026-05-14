// Shared label maps used across components.

export const CATEGORY_LABELS = {
  issue:         'Issues',
  tech:          'Tech Enhancements',
  data:          'Data Needs',
  process:       'Process Notes',
  win:           'Wins',
  open_question: 'Open Questions',
};

export const CATEGORY_ORDER = ['issue', 'tech', 'data', 'process', 'win', 'open_question'];

export const PRIORITY_LABELS = {
  high:        'High',
  medium:      'Medium',
  low:         'Low',
  investigate: 'Investigate',
};

export const STATUS_LABELS = {
  open:        'Open',
  in_progress: 'In Progress',
  resolved:    'Resolved',
  wont_do:     "Won't Do",
  parked:      'Parked',
};

// Tailwind color classes for priority chips
export const PRIORITY_COLORS = {
  high:        'bg-red-100 text-red-800 border-red-200',
  medium:      'bg-amber-100 text-amber-800 border-amber-200',
  low:         'bg-green-100 text-green-700 border-green-200',
  investigate: 'bg-purple-100 text-purple-800 border-purple-200',
};

// Tailwind color classes for status chips
export const STATUS_COLORS = {
  open:        'bg-gray-100 text-gray-600 border-gray-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  resolved:    'bg-green-100 text-green-700 border-green-200',
  wont_do:     'bg-gray-100 text-gray-400 border-gray-200',
  parked:      'bg-yellow-100 text-yellow-700 border-yellow-200',
};

// Relative time formatter
export function relativeTime(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
