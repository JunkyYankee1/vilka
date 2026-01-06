# Cart Sync "Failed to fetch" - Root Cause Analysis

## Original Issue

**Error**: `TypeError: Failed to fetch` in `CartProvider.syncWithServer`

**Symptoms**:
- Console error appears during app startup
- Cart continues to work with local state
- Error sometimes resolves after a few seconds

## Root Cause

**Primary Cause: Startup Timing**

The "Failed to fetch" error occurs because:

1. **Next.js Server Not Ready**: When the app first loads, React components mount and immediately attempt to sync the cart. However, the Next.js dev server (or production server) may not be fully ready to handle API requests yet.

2. **Race Condition**: The cart sync happens in a `useEffect` that runs on mount, but the API route handler (`/api/cart/validate`) might not be registered or the server might still be initializing database connections.

3. **Network Layer**: The browser's `fetch` API throws `TypeError: Failed to fetch` when:
   - The server is not listening on the expected port
   - The connection is refused (server not ready)
   - The request is aborted before completion
   - DNS resolution fails (not applicable here since we use relative URLs)

## Why It Happens in Docker

In Docker environments, this is more common because:

1. **Service Startup Order**: Even with `depends_on` and healthchecks, there's a brief window where the Next.js app container is "running" but the HTTP server hasn't fully initialized.

2. **Database Connection Pool**: The API route connects to PostgreSQL, which might still be establishing the connection pool on first request.

3. **Turbopack/Next.js Compilation**: In dev mode, Next.js might still be compiling API routes when the first request arrives.

## Solution Implemented

### 1. Retry Logic with Exponential Backoff

Added automatic retry (3 attempts) with increasing delays:
- Retry 1: 300ms delay
- Retry 2: 500ms delay  
- Retry 3: 800ms delay

This gives the server time to become ready while maintaining responsiveness.

### 2. Once-Per-Page-Load Warning

Using `useRef` flag (`didWarnNetworkErrorRef`) to ensure network error warnings only appear once per page load, preventing console spam.

### 3. Graceful Degradation

- Cart continues to work with local state if sync fails
- No uncaught errors crash the app
- Sync retries automatically on next cart change

### 4. Improved Server-Side Logging

Added timing and request tracking in the API route to help diagnose issues:
- Request duration logging
- Dev-only detailed logging
- Error details in development mode

## Verification

### Network Tab Check

1. Open DevTools → Network tab
2. Filter by "cart"
3. Look for `/api/cart/validate` requests
4. **Expected**: Requests show HTTP status (200, 4xx, 5xx) - not "(failed)" or "net::ERR_*"
5. **If failed**: Check server logs for exceptions in `/api/cart/validate` route

### Docker Clean Start Test

```bash
docker compose down -v
docker compose up --build
```

**Expected Behavior**:
- App loads successfully
- First cart sync may retry 1-2 times (normal during startup)
- After retries, sync succeeds or logs warning once
- No uncaught errors in console
- Cart works with local state even if sync fails

## Code Changes

### Client-Side (`src/modules/cart/cartContext.tsx`)

- Added `didWarnNetworkErrorRef` for once-per-page-load warnings
- Added retry logic to `syncWithServer` (3 retries with backoff)
- Added retry logic to `loadCartFromServer` (3 retries with backoff)
- Improved error handling to prevent console spam

### Server-Side (`src/app/api/cart/validate/route.ts`)

- Added request timing (duration logging)
- Improved dev-only logging (reduced production noise)
- Better error details in development mode

## Acceptance Criteria Met

✅ **No uncaught "Failed to fetch" errors** - All network errors are caught and handled gracefully

✅ **Cart works offline** - Continues with local state when backend is unavailable

✅ **Correct endpoint in Docker** - Relative URLs work correctly in `docker compose up --build`

✅ **No console spam** - Errors logged once per page load (dev mode only)

✅ **Retry logic** - Automatic retries with backoff handle startup timing issues

✅ **Debug info available** - Full URL and timing logged in development mode

