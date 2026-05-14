# Supabase Setup

## Step 1: Disable email confirmation

Dashboard -> Authentication -> Providers -> Email -> turn OFF "Confirm email".
(Without this, Supabase tries to send confirmation emails to real addresses on every login.)

## Step 2: Run migrations in order

Go to Dashboard -> SQL Editor -> New query. Paste and run each file in order:

1. `migrations/001_schema.sql`  -- five tables (profiles, entries, pulse_logs, comments, edit_log)
2. `migrations/002_rls.sql`     -- RLS policies + get_email_for_username function
3. `migrations/003_realtime.sql` -- Realtime on entries, pulse_logs, comments
4. `migrations/004_triggers.sql` -- edit_log triggers on update (uses row_to_json; safe to re-run)
5. `migrations/005_admin_policy.sql` -- allows admins to update any profile row

If you previously ran an older version of 004_triggers.sql (before the row_to_json rewrite),
re-run the updated file -- it drops and recreates the triggers automatically.

To verify triggers are working after running migrations, run `verify_triggers.sql` in the
SQL Editor and check the NOTICE output. You should see two log rows for the test entry
(priority: low -> high, status: open -> in_progress).

## Step 3: Create users and profiles

Get your service_role key: Dashboard -> Project Settings -> API -> service_role (secret).

Open `scripts/setup-users.js`, paste your service_role key where indicated, then run:

```
node scripts/setup-users.js
```

This creates all five auth users with their real USC emails and username-based passwords,
inserts their profile rows, and prints seed entry SQL for you to paste into the SQL editor.

## Step 4: Insert seed entries

Copy the SQL printed by setup-users.js and run it in Dashboard -> SQL Editor.

## Step 5: Enable Realtime

Dashboard -> Database -> Replication -> confirm entries, pulse_logs, and comments
are listed under supabase_realtime. If not, run 003_realtime.sql again.

## Step 6 (later): Database Webhooks for Power Automate

Dashboard -> Database -> Webhooks:
- INSERT on `entries` -> POST to VITE_POWER_AUTOMATE_WEBHOOK
- INSERT on `comments` -> POST to the same URL

See `powerautomate/README.md` for flow setup.

## Users

| Username  | Email                      | Display Name       | Admin |
|-----------|----------------------------|--------------------|-------|
| jarrows   | jane.bouknight@sc.edu      | Jane Bouknight     | No    |
| mdial     | mdial@mailbox.sc.edu       | Mike Dial          | Yes   |
| duselb    | duselb@mailbox.sc.edu      | Brian Dusel        | No    |
| amathwig  | amathwig@mailbox.sc.edu    | Alexandra Mathwig  | No    |
| aenglish  | alucas@sc.edu              | Amanda Shores      | No    |

Passwords are set to each user's username at setup. Change via Supabase Dashboard
-> Authentication -> Users if needed.
