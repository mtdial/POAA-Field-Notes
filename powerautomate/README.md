# Power Automate Setup

Two flows are needed: one for real-time Teams notifications (triggered by Supabase
Database Webhooks) and one for the weekly Friday reminder.


## Flow 1: New entry / new comment notifications

### A. Create the flow in Power Automate

1. Go to make.powerautomate.com and create a new Automated cloud flow.
2. Search for trigger: **"When an HTTP request is received"** (HTTP connector).
3. Set Method to POST. Leave the URL blank for now -- it generates after you save.
4. Paste this JSON schema into the "Request Body JSON Schema" field so Power Automate
   can parse the Supabase payload:

```json
{
  "type": "object",
  "properties": {
    "type":   { "type": "string" },
    "table":  { "type": "string" },
    "record": {
      "type": "object",
      "properties": {
        "id":             { "type": "string" },
        "title":          { "type": "string" },
        "category":       { "type": "string" },
        "priority":       { "type": "string" },
        "status":         { "type": "string" },
        "contributor_id": { "type": "string" },
        "body":           { "type": "string" },
        "parent_type":    { "type": "string" },
        "parent_id":      { "type": "string" }
      }
    }
  }
}
```

5. Add a **Condition** action: check `triggerBody()?['table']`
   - If equal to `entries`  -> post an "entry" message (see below)
   - If equal to `comments` -> post a "comment" message (see below)

6. In the true/false branches, add **"Post message in a chat or channel"** (Teams).
   - Choose your POAA Working Group meeting chat or a dedicated channel.
   - Post as: Flow bot.

   **Entry message template:**
   ```
   New entry added to POAA Field Notes

   @{triggerBody()?['record']?['category']} -- @{triggerBody()?['record']?['priority']} priority
   @{triggerBody()?['record']?['title']}

   View: https://poaa-field-notes.pages.dev/entries/@{triggerBody()?['record']?['id']}
   ```

   **Comment message template:**
   ```
   New comment on a POAA entry

   View: https://poaa-field-notes.pages.dev/entries/@{triggerBody()?['record']?['parent_id']}
   ```

7. Save the flow. Power Automate will generate the HTTP POST URL.
8. Copy the URL -- you will need it in the next two steps.


### B. Create the Supabase Database Webhooks

1. Supabase Dashboard -> Database -> Webhooks -> Create a new webhook.

   **Webhook 1: new entries**
   - Name: `notify-new-entry`
   - Table: `entries`
   - Events: INSERT only
   - Type: HTTP Request
   - Method: POST
   - URL: paste the Power Automate HTTP trigger URL
   - HTTP Headers: `Content-Type: application/json`

   **Webhook 2: new comments**
   - Name: `notify-new-comment`
   - Table: `comments`
   - Events: INSERT only
   - Type: HTTP Request
   - Method: POST
   - URL: same Power Automate HTTP trigger URL
   - HTTP Headers: `Content-Type: application/json`

2. Save both webhooks.


### C. Store the URL in Cloudflare Pages

Add the URL as an environment variable:
- Key: `VITE_POWER_AUTOMATE_WEBHOOK`
- Value: the Power Automate HTTP trigger URL

Do this in Cloudflare Pages -> your project -> Settings -> Environment variables.
Add it to both Production and Preview environments. Redeploy after adding it.

(The app uses this env var for future direct calls. Right now all notifications go
through the Supabase DB Webhooks, so this is a belt-and-suspenders backup.)


## Flow 2: Friday reminder (scheduled, no app involvement)

1. Create a new Scheduled cloud flow in Power Automate.
2. Set recurrence: every Friday at 8:00 AM Eastern.
3. Add action: **"Post message in a chat or channel"** (Teams).
   - Post to the POAA Working Group meeting chat.
   - Message:
     ```
     POAA Field Notes reminder: take a few minutes before end of day to log
     any issues, wins, or open questions from this week.

     https://poaa-field-notes.pages.dev
     ```
4. Save. No webhook URL needed -- this runs entirely on the Power Automate schedule.


## Supabase webhook payload shape (for reference)

Supabase sends a POST with this shape on INSERT:

```json
{
  "type": "INSERT",
  "table": "entries",
  "schema": "public",
  "record": {
    "id": "uuid",
    "category": "issue",
    "title": "Something went wrong with X",
    "context": "...",
    "priority": "high",
    "status": "open",
    "next_step": null,
    "tags": [],
    "occurred_on": "2026-06-01",
    "contributor_id": "uuid",
    "last_edited_by": null,
    "created_at": "2026-06-01T14:00:00Z",
    "updated_at": "2026-06-01T14:00:00Z"
  },
  "old_record": null
}
```

Note: `contributor_id` is a UUID, not a display name. The Teams message uses
the entry title and category, which are human-readable without a join.
