# Monetiq.ai Deployment Guide

## Prerequisites

- Supabase CLI installed: `npm install -g supabase`
- Supabase project linked: `supabase link --project-ref dxerwqcmgmwhunglbkln`
- Git repository with latest changes
- Access to Supabase dashboard

---

## Step 1: Apply Database Migrations

### 1.1 Review Migrations
```bash
cd c:\Users\merza\ecommerce-ai-v1
ls supabase\migrations
```

You should see:
- `20260119_worker_webhook.sql` - Database webhook for Edge Function
- `20260119_enable_rls.sql` - RLS policies for generations table
- `20260119_storage_security.sql` - Storage buckets and policies
- `20260119_user_quotas.sql` - Quota system

### 1.2 Apply Migrations
```bash
# Push all migrations to Supabase
supabase db push

# Verify in dashboard
# Go to: https://supabase.com/dashboard/project/dxerwqcmgmwhunglbkln/editor
```

**Expected result:** All tables, policies, and functions created successfully.

---

## Step 2: Deploy Edge Function

### 2.1 Deploy Function
```bash
# Deploy process-generation Edge Function
supabase functions deploy process-generation

# Expected output:
# Deployed Function process-generation with version <version-id>
```

### 2.2 Set Environment Secrets
```bash
# Set Gemini API key
supabase secrets set GEMINI_API_KEY=AIzaSyDSnxdZlPMK_6HOUvU5CGYXADz6p_BVBH0

# Verify secrets
supabase secrets list
```

### 2.3 Test Edge Function
```bash
# Get your anon key from .env.local
$ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Test function (replace <generation-id> with a real queued job ID)
curl -X POST https://dxerwqcmgmwhunglbkln.supabase.co/functions/v1/process-generation `
  -H "Authorization: Bearer $ANON_KEY" `
  -H "Content-Type: application/json" `
  -d '{"generation_id": "<generation-id>"}'
```

**Expected:** Function processes job and returns `{ "ok": true, "job_id": "...", "output_url": "..." }`

---

## Step 3: Configure Database Webhook

### 3.1 Enable pg_net Extension
1. Go to Supabase Dashboard → Database → Extensions
2. Search for `pg_net`
3. Enable it

### 3.2 Configure Webhook Settings
```sql
-- Run this in SQL Editor
ALTER DATABASE postgres SET app.settings.edge_function_url = 'https://dxerwqcmgmwhunglbkln.supabase.co/functions/v1/process-generation';
ALTER DATABASE postgres SET app.settings.service_role_key = '<your-service-role-key>';
```

**Get service role key from:** `.env.local` → `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 4: Verify Automation

### 4.1 Test End-to-End
1. Navigate to `http://localhost:3000` (or production URL)
2. Sign in with your account
3. Go to `/tool/mixed-media?preset=neon-tech-outline`
4. Click "Generate ✦"
5. **Expected:** Job appears with `status=queued`
6. **Wait 2-3 minutes**
7. **Expected:** Status changes to `processing`, then `ready`
8. **Expected:** "View result →" link appears

### 4.2 Check Edge Function Logs
```bash
# View real-time logs
supabase functions logs process-generation --follow

# Or in dashboard:
# https://supabase.com/dashboard/project/dxerwqcmgmwhunglbkln/functions/process-generation/logs
```

**Look for:**
- `Processing job <id> for user <user_id>`
- `Job <id> completed successfully`

---

## Step 5: Deploy Next.js App

### 5.1 Commit Changes
```bash
git add .
git commit -m "feat: production readiness - worker automation + security + quotas"
git push origin main
```

### 5.2 Deploy to Vercel (or your hosting)
```bash
# If using Vercel
vercel --prod

# Or push to main branch if auto-deploy is configured
```

### 5.3 Set Environment Variables
In Vercel dashboard (or your hosting), set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`

---

## Step 6: Enable Production Security

### 6.1 Make Outputs Bucket Private
```sql
-- Run in SQL Editor
UPDATE storage.buckets SET public = false WHERE id = 'outputs';
```

### 6.2 Update Edge Function for Signed URLs
Edit `supabase/functions/process-generation/index.ts`:

```typescript
// Replace this line:
const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(storagePath);

// With signed URL (1 hour expiry):
const { data: urlData, error: signError } = await supabase.storage
  .from(bucket)
  .createSignedUrl(storagePath, 3600);

if (signError) throw new Error(`Failed to create signed URL: ${signError.message}`);
```

Redeploy:
```bash
supabase functions deploy process-generation
```

---

## Step 7: Set Up Daily Quota Reset

### 7.1 Create Supabase Cron Job
```sql
-- Run in SQL Editor
SELECT cron.schedule(
  'reset-daily-quotas',
  '0 0 * * *', -- Every day at midnight UTC
  $$SELECT reset_daily_quotas()$$
);
```

### 7.2 Verify Cron Job
```sql
SELECT * FROM cron.job;
```

**Expected:** Job named `reset-daily-quotas` with schedule `0 0 * * *`

---

## Step 8: Backfill Existing Data (Optional)

### 8.1 Assign user_id to Existing Generations
```sql
-- Option 1: Assign to a test user
UPDATE public.generations
SET user_id = '<your-test-user-id>'
WHERE user_id IS NULL;

-- Option 2: Delete test data
DELETE FROM public.generations WHERE user_id IS NULL;
```

### 8.2 Create Quota Rows for Existing Users
```sql
-- Auto-create quotas for all existing users
INSERT INTO public.user_quotas (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
```

---

## Verification Checklist

- [ ] All migrations applied successfully
- [ ] Edge Function deployed and accessible
- [ ] pg_net extension enabled
- [ ] Database webhook configured
- [ ] End-to-end generation works (queued → processing → ready)
- [ ] Edge Function logs show successful processing
- [ ] Next.js app deployed to production
- [ ] RLS policies active (users only see their own jobs)
- [ ] Outputs bucket private (if enabled)
- [ ] Daily quota reset cron job scheduled
- [ ] Existing data backfilled or cleaned

---

## Troubleshooting

### Issue: Edge Function not triggering
**Solution:**
1. Check pg_net is enabled
2. Verify webhook settings in database
3. Check Edge Function logs for errors
4. Test function manually with curl

### Issue: RLS blocking legitimate requests
**Solution:**
1. Check user is authenticated (`supabase.auth.getUser()`)
2. Verify user_id is set correctly in generations
3. Check RLS policies in dashboard

### Issue: Veo API timeout
**Solution:**
1. Increase timeout in Edge Function (currently 7 min)
2. Check Gemini API quota/limits
3. Verify API key is correct

### Issue: Storage upload fails
**Solution:**
1. Check bucket exists and is accessible
2. Verify RLS policies allow upload
3. Check file size limits (50MB for inputs)

---

## Rollback Plan

If something goes wrong:

### 1. Disable RLS
```sql
ALTER TABLE public.generations DISABLE ROW LEVEL SECURITY;
```

### 2. Revert to Manual Worker
Restore `app/api/generate/process-one/route.ts` from git history

### 3. Revert Migrations
```bash
# Reset to specific migration
supabase db reset --version <previous-version>
```

---

## Next Steps

After successful deployment:

1. **Monitor Edge Function logs** for first 24 hours
2. **Test with real users** (invite beta testers)
3. **Implement video upload** (Priority B)
4. **Add quota UI** to show users their limits
5. **Set up monitoring** (Sentry, LogRocket)
6. **Plan Vertex AI migration** for better pricing

---

## Support

If you encounter issues:
- Check Supabase Dashboard → Logs
- Review Edge Function logs
- Check Next.js deployment logs
- Verify environment variables are set correctly
