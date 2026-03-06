

## Analysis

**Would credits fix themselves without changes?** No. Here's why:

The current code (line 182-190) checks for any `subscription_renewal` transaction created within the last 28 days. The previous renewal was created ~28 days ago (Feb 6). Depending on exact timing, the 28-day window may or may not still catch it. But even if it eventually "expires" out of the window, credits would only reset the next time `check-subscription` runs AND the old renewal falls outside 28 days. This is fragile and timing-dependent -- it could work hours or days late, or not at all if billing cycles are slightly shorter than 28 days.

**The real problem:** The system uses a time-based rolling window instead of checking the actual Stripe billing period. It should use `periodKey` (which contains the subscription ID + current_period_end) to determine if THIS specific period has already been processed.

## Plan

### 1. Fix idempotency in `check-subscription/index.ts`

Replace lines 180-190 (the 28-day rolling window check) with a `periodKey`-based check:

```typescript
// BEFORE (broken):
const twentyEightDaysAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();
const { data: existingResetRows } = await supabaseClient
  .from('credit_transactions')
  .select('id')
  .eq('user_id', user.id)
  .eq('transaction_type', 'subscription_renewal')
  .gte('created_at', twentyEightDaysAgo)
  .limit(1);

// AFTER (correct):
const { data: existingResetRows } = await supabaseClient
  .from('credit_transactions')
  .select('id')
  .eq('user_id', user.id)
  .eq('transaction_type', 'subscription_renewal')
  .like('description', `%${periodKey}%`)
  .limit(1);
```

This ties the idempotency check to the actual Stripe billing period. Each period has a unique `current_period_end` timestamp, so a new period = new `periodKey` = credits get reset. No more timing issues.

### 2. Manually fix credits for the two affected users

Use the database insert tool to:
- Find user IDs for erik@bilnet.se and robert@almevik.se from profiles
- UPDATE `user_credits` to 800 and 100 respectively
- INSERT `subscription_renewal` transactions with the current periodKey so they don't get double-reset

