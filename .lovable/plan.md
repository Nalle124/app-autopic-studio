

## Pre-Launch Audit: Issues Found

After reviewing the codebase, here are the issues to fix before sending real traffic, ordered by severity.

---

### 1. Credits silently fail on client-side (Critical)

`DemoContext.decrementCredits()` does a direct `.update()` on `user_credits` — but the RLS policy **blocks UPDATE** for that table. The same function also tries `.insert()` into `credit_transactions`, which also has **no INSERT policy**. Both operations silently fail.

**Impact**: In the old Demo flow (`Demo.tsx`), credits are never actually deducted. The V2 flow is fine because it uses server-side edge functions with `decrement_credits` RPC.

**Fix**: Replace client-side update with an RPC call to `decrement_credits` (which already exists and is SECURITY DEFINER). Remove the client-side `credit_transactions` insert since the RPC doesn't log it either (or add logging inside the RPC).

---

### 2. ErrorBoundary defeats Sentry lazy loading (Medium)

`ErrorBoundary.tsx` has `import * as Sentry from "@sentry/react"` at the top — a static import. Since ErrorBoundary wraps the entire app in `App.tsx`, Sentry gets pulled into the main bundle despite the lazy loading in `main.tsx`.

**Fix**: Use dynamic `import('@sentry/react')` inside `componentDidCatch` instead of the static top-level import.

---

### 3. Dark class flash on page load (Medium)

`index.html` has `<html lang="sv" class="dark">` but the ThemeProvider defaults to `"light"`. This causes a brief dark-mode flash before React hydrates and switches to light.

**Fix**: Change `class="dark"` to `class="light"` (or remove it entirely since ThemeProvider sets it).

---

### 4. OG image points to lovable.dev (Low - branding)

The OpenGraph and Twitter image meta tags point to `https://lovable.dev/opengraph-image-p98pqg.png` — a generic Lovable image, not AutoPic branding.

**Fix**: Replace with an AutoPic-branded OG image URL (or host one in the public folder).

---

### 5. DemoPaywall uses `window.location.href` for internal route (Low)

When an unauthenticated user clicks a plan in the paywall, it does `window.location.href = '/guest-checkout?plan=...'` — a full page reload that loses all React state. 

**Fix**: Use React Router `navigate()` instead (the component already has access via the parent context).

---

### Summary of files to edit

| File | Change |
|------|--------|
| `src/contexts/DemoContext.tsx` | Replace `.update()` with RPC call `decrement_credits` |
| `src/components/ErrorBoundary.tsx` | Dynamic Sentry import in `componentDidCatch` |
| `index.html` | Change `class="dark"` to `class="light"` |
| `index.html` | Update OG/Twitter image URLs |
| `src/components/DemoPaywall.tsx` | Replace `window.location.href` with `navigate()` for internal routes |

