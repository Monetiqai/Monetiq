# Apply Database Migration

## Quick Start

**Copy and run this SQL in your Supabase Dashboard:**

1. Open [Supabase Dashboard](https://app.supabase.com) → Your Project
2. Go to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy the SQL below and paste it:

```sql
-- Add meta column to projects (nullable for backward compatibility)
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT NULL;

COMMENT ON COLUMN public.projects.meta IS 'Optional metadata for projects (e.g., session info, scene intents, director settings)';

-- Verification
SELECT 'meta column added to projects' as check,
       EXISTS(
         SELECT 1 FROM information_schema.columns 
         WHERE table_schema = 'public' 
         AND table_name = 'projects' 
         AND column_name = 'meta'
       )::text as result;
```

5. Click **Run** (or press Ctrl+Enter)
6. Verify the output shows: `meta column added to projects | true`

---

**That's it!** Your Director Mode will now work without schema errors.

The full migration file is available at: `supabase/migrations/20260123_add_projects_meta.sql`

