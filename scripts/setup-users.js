/**
 * setup-users.js
 *
 * One-time script: creates all POAA app users in Supabase Auth
 * and inserts their profile rows. Also prints the seed entry SQL
 * with Mike Dial's real UUID so you can paste it into the SQL editor.
 *
 * Before running:
 *   1. Supabase Dashboard -> Authentication -> Providers -> Email
 *      DISABLE "Confirm email" (so Supabase doesn't send a confirmation email).
 *   2. Get your service_role key: Dashboard -> Project Settings -> API -> service_role.
 *      Paste it below. Keep this key out of git.
 *   3. From the project root: node scripts/setup-users.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nmtifjczetqemgfktnrr.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'YOUR_SERVICE_ROLE_KEY_HERE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Passwords = usernames (can be changed per user later).
const USERS = [
  {
    email:        'jane.bouknight@sc.edu',
    username:     'jarrows',
    password:     'jarrows',
    display_name: 'Jane Bouknight',
    initials:     'JB',
    is_admin:     false,
  },
  {
    email:        'mdial@mailbox.sc.edu',
    username:     'mdial',
    password:     'mdial',
    display_name: 'Mike Dial',
    initials:     'MTD',
    is_admin:     true,
  },
  {
    email:        'duselb@mailbox.sc.edu',
    username:     'duselb',
    password:     'duselb',
    display_name: 'Brian Dusel',
    initials:     'BD',
    is_admin:     false,
  },
  {
    email:        'amathwig@mailbox.sc.edu',
    username:     'amathwig',
    password:     'amathwig',
    display_name: 'Alexandra Mathwig',
    initials:     'AM',
    is_admin:     false,
  },
  {
    email:        'alucas@sc.edu',
    username:     'aenglish',
    password:     'aenglish',
    display_name: 'Amanda Shores',
    initials:     'AS',
    is_admin:     false,
  },
];

async function main() {
  console.log('Creating users...\n');

  let mikeId = null;

  for (const user of USERS) {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email:         user.email,
      password:      user.password,
      email_confirm: true,
    });

    if (authError) {
      console.error(`  [FAIL] ${user.username}: ${authError.message}`);
      continue;
    }

    const userId = authData.user.id;
    if (user.username === 'mdial') mikeId = userId;

    // Insert profile row
    const { error: profileError } = await supabase.from('profiles').insert({
      id:           userId,
      email:        user.email,
      username:     user.username,
      display_name: user.display_name,
      initials:     user.initials,
      is_admin:     user.is_admin,
    });

    if (profileError) {
      console.error(`  [FAIL] ${user.username} profile: ${profileError.message}`);
    } else {
      console.log(`  [OK]   ${user.username} (${user.display_name}) -- id: ${userId}`);
    }
  }

  // Print seed entry SQL with real Mike UUID
  if (mikeId) {
    console.log('\n-- Paste this in the Supabase SQL editor to add the two seed entries:\n');
    console.log(`INSERT INTO public.entries
  (category, title, context, priority, status, next_step, tags, contributor_id, occurred_on)
VALUES
(
  'issue',
  'CRM Advise overwriting manual advisor assignments on individual student sync',
  'When an individual student record syncs from Banner to CRM Advise, any manually-assigned POAA advisor in CRM Advise is overwritten by the Banner value. This affects POAA assignment integrity for students whose records get touched mid-cycle.',
  'high', 'in_progress',
  'Workaround in place: move POAA assignments into Banner SGAADVR so the sync respects them. Longer-term, open ticket with Ellucian and decide on permanent source of truth for advisor of record.',
  array['banner','crm-advise','advisor-assignment'],
  '${mikeId}', current_date
),
(
  'data',
  'Power BI to CRM Advise via OData feed',
  'Active work to stand up Power BI connectivity to CRM Advise via OData. Need to confirm refresh cadence, document the connection for the team, and identify which POAA-specific reports we want as our first dashboards.',
  'medium', 'in_progress',
  'Document the OData connection. Draft first dashboard list: advisor caseload by college, assignment completeness, appointment scheduling rates.',
  array['power-bi','crm-advise','odata'],
  '${mikeId}', current_date
);`);
  }

  console.log('\nDone.');
}

main().catch(console.error);
