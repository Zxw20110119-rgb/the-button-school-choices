# The Button

The Button is an anonymous ethical dilemma game for students aged 13–18. A round contains ten category-varied questions. Players press the button or walk away, then see real group results and a neutral reflection on their choice.

## What is included

- Responsive player experience for phones, tablets and desktops
- CSS-built tactile 3D button with keyboard, touch and reduced-motion support
- Ten-question sessions without repeats
- 100-question starter bank across ten categories
- Anonymous browser ID with no player account
- Real vote totals, percentages, majority position and controversy score
- Honest local demo mode when Supabase is not configured
- Secure Supabase functions, duplicate-vote constraint and Row Level Security
- Authenticated admin dashboard for question editing and quality review
- Installable PWA metadata and offline fallback

## Project map

```text
dist/                    Public website
  index.html             Player app
  app.js                 Game, voting and summary logic
  questions.js           Local demo question bank
  config.js              Public Supabase project settings
  styles.css             Responsive visual system
  admin/                 Authenticated admin dashboard
  manifest.webmanifest   PWA metadata
  service-worker.js      App shell cache and offline fallback
data/questions.json      Import-friendly question data
supabase/schema.sql      Tables, indexes, RLS, functions and admin view
supabase/seed.sql        100-question database seed
SPEC_OPTIMIZED.md        Reviewed implementation specification
```

## Run locally

Serve `dist` through any static web server. For example:

```bash
python3 -m http.server 4173 --directory dist
```

Open `http://localhost:4173`. Without Supabase settings the app clearly displays **DEMO MODE · LOCAL RESULTS**. No local totals are presented as real votes.

## Connect Supabase

1. Create a Supabase project.
2. Open its SQL Editor and run `supabase/schema.sql`.
3. Run `supabase/seed.sql`.
4. Copy the project URL and public anon key into `dist/config.js`. The anon key is intended for browser use; never put the service-role key in this file.
5. In Supabase Authentication, enable email sign-in and add the deployed `/admin/` URL to allowed redirect URLs.
6. Sign in once, find that account's UUID in Authentication → Users, then add it with:

```sql
insert into public.admin_users(user_id) values ('AUTH-USER-UUID');
```

The public browser cannot read the questions or votes tables directly. It can only call two limited database functions: one returns active questions and one records or retrieves a single device vote. The database unique constraint protects `anonymous_user_id + question_id` even if frontend checks are bypassed.

## Import or revise questions

Edit `dist/questions.js`, then run:

```bash
node scripts/build-seed.mjs
```

This rebuilds `data/questions.json` and `supabase/seed.sql`. Existing database IDs are updated without deleting vote history. Use `active = false` to retire a question.

## Controversy score

```text
100 - 2 × |PRESS percentage - 50|
```

A 50/50 result scores 100; 60/40 scores 80; 75/25 scores 50. The admin dashboard uses this signal to identify promising questions and questions that need revision. Low-vote questions should not be judged from the score alone.

## Privacy

The player ID is a random UUID stored in the current browser. The app does not request names, player emails, school IDs, precise location, camera, microphone or contacts. Clearing storage or changing devices creates a new anonymous identity. Admin email addresses are handled separately by Supabase Authentication and are never attached to player votes.

## Deployment

The contents of `dist` can be deployed to any static host. Configure the same Supabase URL and anon key before the production build. Add the final `/admin/` URL to Supabase Authentication redirect URLs and keep admin membership restricted in `admin_users`.

### GitHub Pages

- Website: https://zxw20110119-rgb.github.io/the-button-school-choices/
- Repository: https://github.com/Zxw20110119-rgb/the-button-school-choices
- Publishing source: **Settings → Pages → Source → GitHub Actions**.

The workflow in `.github/workflows/pages.yml` publishes `dist/` whenever a commit is pushed to `main`. It can also be started manually from the Actions tab. The project is already a static website and requires no dependency installation or build step.

This deployment uses **DEMO MODE · LOCAL RESULTS** because `dist/config.js` has empty Supabase settings. Shared voting and the admin dashboard require the Supabase setup above. For this deployment, allow `https://zxw20110119-rgb.github.io/the-button-school-choices/admin/` as an authentication redirect URL when enabling Supabase.
