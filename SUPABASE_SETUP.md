# CareFlow Supabase Setup

CareFlow now requires Supabase for shared queue state across reception, patient phones, and the waiting room display. There is no fake queue fallback.

1. Create a Supabase project.
2. Open the Supabase SQL editor and run `supabase/schema.sql`.
3. In Supabase Project Settings > API, copy:
   - Project URL
   - anon public key
4. Add these variables locally in `.env.local`:

```bash
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

5. Add the same variables in Vercel Project Settings > Environment Variables for Production.
6. Redeploy Vercel.

For this clinic demo, the SQL policies allow public browser read/insert/update access to the queue table so patient phones can read their queue code and reception can update queue status. Before real production, replace this with authenticated staff access, stricter row-level security, and protected write operations.
