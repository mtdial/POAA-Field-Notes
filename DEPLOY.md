# Deployment Guide -- Cloudflare Pages

The POAA Field Notes is a static React SPA deployed to Cloudflare Pages.
Supabase handles all data, auth, and Realtime -- no server required.


## Prerequisites

- GitHub account (or GitLab/Bitbucket -- same flow)
- Cloudflare account (free tier is fine)
- Supabase project fully configured (see supabase/README.md)
- Power Automate webhook URL ready (see powerautomate/README.md)


## Step 1: Push the project to GitHub

If you haven't already created a repo for this project:

```bash
cd "poaa-field-notes"
git init
git add .
git commit -m "Initial commit"
```

Then create a new repository on github.com (private is fine) and push:

```bash
git remote add origin https://github.com/YOUR_USERNAME/poaa-field-notes.git
git branch -M main
git push -u origin main
```

The `.gitignore` already excludes `node_modules/` and `.env.local`.


## Step 2: Connect to Cloudflare Pages

1. Go to dash.cloudflare.com -> Workers & Pages -> Create application -> Pages.
2. Click **Connect to Git** and authorize Cloudflare to access your GitHub account.
3. Select the `poaa-field-notes` repository.
4. Configure the build:
   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: leave blank (the repo root is the project root)
5. Do NOT click Deploy yet -- add env vars first (next step).


## Step 3: Add environment variables

In the same setup screen, expand **Environment variables** and add:

| Variable | Value | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Dashboard -> Project Settings -> API |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key | Same location |
| `VITE_POWER_AUTOMATE_WEBHOOK` | Your Power Automate HTTP trigger URL | From Flow 1 setup |

Add these to **both Production and Preview** environments.

The `VITE_` prefix is required -- Vite only exposes env vars with this prefix to
the browser bundle at build time.


## Step 4: Deploy

Click **Save and Deploy**. Cloudflare will:
1. Clone your repo
2. Run `npm ci` + `npm run build`
3. Publish the `dist/` folder to its edge CDN

First deploy takes about 60-90 seconds. You'll get a URL like
`https://poaa-field-notes.pages.dev` (or a random subdomain -- you can
customize it in Pages -> your project -> Custom domains).


## Step 5: Verify the SPA redirect rule

The file `public/_redirects` must contain:
```
/*    /index.html   200
```

This file is already in the repo. Cloudflare Pages reads it automatically from
the `dist/` output and sets up the rewrite rule so that deep links
(`/entries/some-uuid`, `/pulse`, `/admin`) work on browser refresh.

If you ever get 404s on page refresh, confirm this file made it into `dist/`:

```bash
npm run build
cat dist/_redirects
```


## Step 6: Custom domain (optional)

1. Pages -> your project -> Custom domains -> Set up a custom domain.
2. Enter the domain (e.g. `poaa-tracker.advising.sc.edu`).
3. Add the DNS records Cloudflare shows you to your DNS provider.
4. SSL is automatic.

If you use a custom domain, update the URL in:
- `powerautomate/README.md` (the entry/comment link templates)
- Anywhere in the codebase that references `poaa-field-notes.pages.dev`


## Ongoing deployments

Every push to `main` triggers an automatic redeploy. No manual action needed.

If you need to update an environment variable:
1. Pages -> your project -> Settings -> Environment variables -> Edit.
2. Update the value and save.
3. Trigger a new deploy (Pages -> Deployments -> Retry last deployment) so the
   build picks up the new value.


## Build locally before pushing

Always do a local build check before pushing if you've made significant changes:

```bash
npm run build
```

If it exits without errors and `dist/` is populated, the Cloudflare build will pass.


## Rollback

If a bad deploy goes out:
1. Pages -> your project -> Deployments.
2. Find the last known-good deployment.
3. Click the three-dot menu -> **Rollback to this deployment**.

Cloudflare rolls back the CDN instantly -- Supabase data is unaffected.


## Environment summary

| Environment | URL | Triggers on |
|---|---|---|
| Production | `https://poaa-field-notes.pages.dev` | Push to `main` |
| Preview | Unique per-branch URL | Push to any other branch |

Use Preview environments to test changes before merging to main.
