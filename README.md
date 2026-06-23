# Referral Desk — HR Referral System

A 3-role web app where **Branch Leaders (BL)** refer candidates, **HR** screens them through a hiring pipeline, and an **Admin** oversees everything. Built with React + Vite, Supabase (Postgres + Auth + Storage + Realtime), deployable on Vercel.

## What each role does

**Branch Leader**
- Dashboard: referred / in-progress / accepted / rejected counts
- Refer page: candidate form + CV upload → sent to HR
- My referrals: track status of everything they sent

**HR**
- Dashboard: total referred by BLs, total accepted, total rejected, accept-to-reject ratio, accept:reject **per BL**, and a pipeline **timeline** chart
- Pipeline board with sections: **Inbox → In process → Background check → Decision pending → Accepted / Rejected**
- Click any application to see every field the BL filled, the CV, and full timeline
- **Claiming**: when one HR claims an Inbox item it atomically moves to *In process* and **disappears from every other HR's inbox** (enforced in the database, not just the UI)

**Admin**
- Full overview + user/role management (promote/demote BL ↔ HR ↔ Admin)
- Can access HR and BL views

## The "claim" guarantee
Claiming uses a Postgres function `claim_referral()` with an atomic conditional update (`where stage='inbox' and claimed_by is null`). Two HRs clicking at the same time → exactly one wins, the other gets "already claimed". Realtime subscriptions refresh all open inboxes instantly.

---

## Custom refer form (admin-built)

The branch leader's refer form is **built by the admin**, like a mini Microsoft Forms. Only **candidate name** and **CV upload** are fixed; every other question is a custom field you define.

In the Admin panel → **Referral form fields** you can:
- Add fields with 7 types: short text, long text, number, dropdown, checkboxes, date, yes/no
- Mark fields required, reorder them (up/down), hide/show, edit, or delete
- Dropdown/checkbox fields take one option per line

Answers are stored per-referral in a JSON column, with a label snapshot so the HR view stays correct even if a field is later renamed or removed. The schema seeds the original fields (email, phone, position, experience, company, notes) so nothing is lost — edit or delete them as you like.

## Your logo
Drop a file named **`logo.png`** into the **`public/`** folder. It appears on the login page automatically. Transparent PNG works best (the panel is dark). If absent, the app just shows the text title — no broken image. See `public/README-LOGO.txt`.

## How users are created (no public signup)

There is **no signup page**. Accounts are created only by an admin from the Admin panel. Each new user gets a temporary password and is **forced to change it on first login**. User creation runs in a secure Supabase **Edge Function** (`admin-create-user`) that holds the service-role key server-side and verifies the caller is an admin.

### Bootstrapping the very first admin
Since there's no signup, create the first admin manually one time:
1. In Supabase → **Authentication → Users → Add user**, create a user with an email + password (tick "Auto confirm").
2. In **Table Editor → profiles**, find that user's row and set `role` to `admin` and `must_change_password` to `false`.
3. Sign in to the app with that account. From the Admin panel you can now create everyone else (BL, HR, more admins).

---

## Setup

### 1. Supabase database
1. Create a project at https://supabase.com
2. Open **SQL Editor → New query**, paste all of `supabase/schema.sql`, run it.
3. **Settings → API**: copy the **Project URL** and **anon public key**.

### 2. Deploy the Edge Function (required for admin user creation)
Install the Supabase CLI (https://supabase.com/docs/guides/cli), then from the project folder:
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF      # ref is in your project URL/settings
supabase functions deploy admin-create-user
```
The function automatically has access to `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` — these are provided by Supabase, you don't set them yourself. **Never put the service-role key in the frontend or in Vercel.**

### 3. Local dev
```bash
npm install
cp .env.example .env.local   # paste your URL + anon key
npm run dev
```

### 4. Deploy to Vercel
1. Push this folder to a GitHub repo.
2. On https://vercel.com **Add New → Project**, import the repo.
3. Framework preset: **Vite**. Add env vars **VITE_SUPABASE_URL** and **VITE_SUPABASE_ANON_KEY**.
4. Deploy. `vercel.json` already handles SPA routing.

### 4. Point Supabase at your deployed URL
In Supabase **Authentication → URL Configuration**, add your Vercel domain to **Site URL** / redirect allow-list.

---

## Project structure
```
supabase/schema.sql        full DB: tables, RLS, claim/move RPCs, storage
src/
  context/AuthContext.jsx  session + profile + role
  components/
    Layout.jsx             role-based sidebar
    ReferralDrawer.jsx     detail panel: fields, CV, timeline, claim/move
    ui.jsx                 shared primitives
  hooks/useReferrals.js    realtime referral list + signed CV URLs
  pages/
    Login.jsx
    bl/                    BLDashboard, ReferForm, MyReferrals
    hr/                    HRDashboard, HRBoard
    admin/                 AdminPanel
```

## CV handling
- Accepts **PDF, DOC, and DOCX** (validated by extension + MIME), max 10 MB — change `MAX_CV_MB` in `src/lib/cv.js`.
- Every CV is **gzip-compressed in the browser before upload** using the native `CompressionStream` API — lossless, so it never corrupts a Word/PDF file. DOCX typically shrinks a lot; PDFs (already compressed) shrink modestly.
- On view, the file is downloaded, **decompressed transparently**, and opened under its **original filename** (`cv_name`) with the correct type (`cv_mime`). Both are stored on the referral row.
- If a browser lacks `CompressionStream`, it falls back to storing the file uncompressed — no breakage.

## Notes
- CVs live in a **private** storage bucket; the app fetches them through the authenticated Supabase client (RLS-protected), not public URLs.
- All cross-role data access is enforced by **Row Level Security**, so a BL can never read another BL's or HR's data even via the API.
