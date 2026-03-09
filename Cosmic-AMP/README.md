# Aether Music Vault

Cyberpunk music web app with:

- Admin login (Supabase Auth)
- Admin-only upload for `.mp3` and `.wav`
- One-time token generation for track access/download
- Cloud storage using Supabase Storage
- Ready for Vercel, Railway, and Fly.io static deployments

## 1. Supabase Setup

Create a Supabase project and run this SQL:

```sql
create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  file_path text not null unique,
  duration numeric,
  mime_type text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now()
);

create table if not exists public.access_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  track_id uuid not null references public.tracks(id) on delete cascade,
  max_uses int not null default 1,
  used_count int not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
```

Create a storage bucket named `tracks`.

Recommended minimum policies:

- `tracks` table: `select` for anon, `insert/delete` for authenticated.
- `access_tokens`: `select/update` for anon (needed for token redeem), `insert` for authenticated.
- storage bucket `tracks`: public read, authenticated write/delete.

Create one user in Supabase Auth (email/password) and set the email as `VITE_ADMIN_EMAIL`.

## 2. Environment Variables

Copy `.env.example` to `.env` and fill values.

## 3. Run

```bash
npm install
npm run dev
```

## 4. Deploy

### Vercel

- Import the repo in Vercel.
- Add all `VITE_*` variables in Project Settings -> Environment Variables.
- Build command: `npm run build`
- Output directory: `dist`

### Railway

- Create a new Static Site service from this repo.
- Set `VITE_*` variables.
- Build command: `npm run build`
- Publish directory: `dist`

### Fly.io

- Use `fly launch` and deploy as static app (or simple Node static server).
- Provide `VITE_*` variables as Fly secrets before build.
- Serve the `dist` output.

## Security Note

Token validation is implemented in the frontend and database tables. For strict zero-trust security, move token redemption to a server/edge function and keep content in private storage with signed URLs generated server-side.
