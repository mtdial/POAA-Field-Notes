---
name: poaa-process-tracker
description: >
  Use this skill when building, extending, or debugging the POAA Field Notes
  application. Covers the full stack: React 18 + Vite frontend, Supabase Postgres
  + Auth + Realtime + Presence, Cloudflare Pages deployment, Power Automate Teams
  notifications, and client-side Word export via the docx package. Trigger on any
  request mentioning the POAA tracker, process tracker, field notes app, or any
  of its pages (Feed, Pulse Log, Admin, Entry Detail).
---

# POAA Field Notes -- Claude Skill

## Project summary

Internal web app for the USC University Advising Center's Pre-Orientation Academic
Advising (POAA) program. Five UAC administrative leaders capture issues, ideas,
tech enhancements, and data needs during the Summer 2026 POAA cycle and export
the results for the August retrospective.

Owner: Mike Dial. Users: Mike + four other UAC admin leaders. No students.

---

## Stack

| Layer | Tool |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS v3 + React Router v7 |
| Backend / DB | Supabase (Postgres + Auth + Realtime + Presence) |
| Notifications | Power Automate webhook (Teams message) |
| Export | `docx` npm package (client-side Word generation) |
| Hosting | Cloudflare Pages |

---

## Visual identity

- Primary: USC Garnet `#73000A`
- Text: Dark grey `#2B2B2B`, mid grey `#595959`, light grey `#BFBFBF`
- Accent background: Soft garnet tint `#F4ECEC`
- Font: Arial (set in tailwind.config.js and body CSS)
- No emoji. No em dashes anywhere in copy.

Tailwind custom colors (from tailwind.config.js):
```
garnet: '#73000A'
garnet-tint: '#F4ECEC'
dark-grey: '#2B2B2B'
mid-grey: '#595959'
light-grey: '#BFBFBF'
```

---

## File structure

```
poaa-process-tracker/
├── README.md
├── SKILL.md
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── .env.example
├── .gitignore
├── public/
│   └── _redirects          # Cloudflare SPA rule: /*  /index.html  200
├── supabase/
│   ├── migrations/
│   │   ├── 001_schema.sql  -- all five tables
│   │   ├── 002_rls.sql     -- RLS policies
│   │   ├── 003_realtime.sql -- Realtime publication
│   │   └── 004_triggers.sql -- edit_log triggers
│   ├── seed.sql            -- 5 profiles + 2 seed entries (update UUIDs before running)
│   └── README.md           -- Supabase setup instructions
├── powerautomate/
│   └── README.md           -- Power Automate flow setup
└── src/
    ├── main.jsx
    ├── App.jsx             -- BrowserRouter + all routes
    ├── styles/
    │   └── index.css       -- @tailwind directives
    ├── lib/
    │   ├── supabase.js     -- createClient (reads env vars)
    │   ├── auth.js         -- signIn, signOut, getProfile, touchLastActive
    │   ├── presence.js     -- joinPresence (Supabase Presence channel)
    │   └── export.js       -- exportCSV, exportJSON, exportWord (docx)
    ├── hooks/
    │   └── useAuth.jsx     -- AuthContext + AuthProvider + useAuth hook
    ├── components/
    │   ├── ProtectedRoute.jsx  -- redirects to /login if no session
    │   ├── Layout.jsx          -- garnet header, nav, PresenceCluster, sign out
    │   ├── PresenceCluster.jsx -- garnet avatar chips showing who is online
    │   ├── FilterRail.jsx      -- (step 6) category/priority/status filters
    │   ├── EntryCard.jsx       -- (step 6) card with attribution, chips, comment count
    │   ├── EntryForm.jsx       -- (step 9) new entry modal form
    │   ├── CommentThread.jsx   -- (step 8) flat comment thread
    │   └── TagChips.jsx        -- (step 6/9) freeform tag input with autocomplete
    └── pages/
        ├── Login.jsx       -- email + password form, client-side throttle
        ├── Feed.jsx        -- (step 6) main view with filter rail + entry cards
        ├── EntryDetail.jsx -- (step 8) full entry + comments + edit log
        ├── PulseLog.jsx    -- (step 10) weekly pulse cards
        └── Admin.jsx       -- (step 11) user mgmt, exports, tag cleanup
```

---

## Data model (all five tables)

```sql
profiles    -- extends auth.users 1:1, pre-seeded, is_admin flag
entries     -- category, title, context, priority, status, next_step, tags, occurred_on
pulse_logs  -- week_start, this_week, watch_next_week
comments    -- polymorphic (parent_type IN ('entry','pulse_log')), flat
edit_log    -- wiki-style history, populated by Postgres triggers only
```

Key constraints:
- `category IN ('issue','tech','data','process','win','open_question')`
- `priority IN ('high','medium','low','investigate')` default 'medium'
- `status IN ('open','in_progress','resolved','wont_do','parked')` default 'open'

---

## Auth pattern

```javascript
// src/lib/auth.js
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}
```

```javascript
// src/hooks/useAuth.jsx
// AuthProvider wraps the app; exposes { session, profile, loading }
// profile is the row from public.profiles -- null means email not whitelisted
```

Email whitelist is enforced by RLS on profiles: only rows in profiles can query
or mutate app data. If a Supabase auth user has no profiles row, ProtectedRoute
shows an "unauthorized" message.

---

## Realtime subscriptions (step 7)

Pattern for subscribing to entries + pulse_logs + comments:

```javascript
const channel = supabase
  .channel('feed')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'entries' }, handler)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, handler)
  .subscribe();

return () => supabase.removeChannel(channel);
```

---

## Presence pattern

Two functions in `src/lib/presence.js`:

```javascript
// Global header presence (who is online anywhere in the app)
joinPresence(userState, onChange)

// Per-entry viewer presence (who is viewing this specific entry)
joinNamedPresence(`entry-${entryId}`, userState, onChange)
```

Both take `userState: { id, display_name, initials }` and return an unsubscribe
function for useEffect cleanup.

`PresenceCluster.jsx` (in Layout.jsx header) uses `joinPresence`.
`EntryViewers` (inlined in EntryDetail.jsx) uses `joinNamedPresence` -- shows
a garnet banner "Jane is viewing this entry" when another user is on the same entry.

---

## Export pattern (Admin page, step 11)

```javascript
import { exportCSV, exportJSON, exportWord } from '../lib/export';
// Each function downloads a file immediately -- no server needed.
// exportWord uses docx package to generate a grouped retrospective document.
```

---

## Power Automate webhook

```javascript
// Called on new entry or new comment (currently also wired via Supabase DB Webhook,
// so app does not need to call this directly for DB events).
// VITE_POWER_AUTOMATE_WEBHOOK in env vars.
const payload = {
  event: 'new_entry',
  actor: profile.display_name,
  title: entry.title,
  url: `https://poaa-field-notes.pages.dev/entries/${entry.id}`,
};
await fetch(import.meta.env.VITE_POWER_AUTOMATE_WEBHOOK, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
```

---

## Build progress

| Step | Description | Status |
|---|---|---|
| 1 | Vite scaffold + all deps installed | Done |
| 2 | Supabase client, lib files, env files | Done |
| 3 | SQL migrations + seed.sql | Done |
| 4 | Auth flow (Login, useAuth, ProtectedRoute) | Done |
| 5 | Layout shell (header, nav, presence placeholder) | Done |
| 6 | Feed page (FilterRail, EntryCard, Supabase query) | Done |
| 7 | Realtime subscriptions (Feed + comments) | Done |
| 8 | Entry Detail (metadata, inline edit, comments, edit log) | Done |
| 9 | New Entry modal (EntryForm with tag autocomplete) | Done |
| 10 | Pulse Log page (cards, new pulse form, comments) | Done |
| 11 | Admin page (user mgmt, exports, tag cleanup) | Done |
| 12 | Presence wired end-to-end (global + per-entry) | Done |
| 13 | Edit log triggers verified in Postgres | Done |
| 14 | DB Webhooks for Power Automate | Done |
| 15 | Deploy to Cloudflare Pages | Done |

---

## Resuming in a new session

1. Read this SKILL.md first.
2. Check build progress table above to know where to start.
3. Read PROJECT_BRIEF.md in the parent folder for full UX and data model spec.
4. Run `npm install` on your local machine (node_modules are gitignored).
5. `.env.local` already exists with Supabase URL and anon key filled in.
6. Supabase migrations 001-005 should all be applied. Run any missing ones.
7. Users are provisioned -- run `node scripts/setup-users.js` only if starting fresh.

---

## Common pitfalls

| Problem | Fix |
|---|---|
| Realtime not firing | Run 003_realtime.sql; confirm table is in supabase_realtime publication |
| 404 on page refresh (Cloudflare) | Confirm `public/_redirects` has `/*    /index.html   200` |
| RLS blocks reads | Confirm user has a profiles row; check is_app_user() function |
| Presence not updating | Confirm Supabase Realtime is enabled in Dashboard; check joinPresence cleanup |
| Tags array comparison | Use Postgres `@>` or `&&` operators, not `=`, for array filters |
| edit_log not populating | Verify 004_triggers.sql ran; check that last_edited_by is set before update |
