# Cart Sync Implementation

## Overview

The cart sync system automatically synchronizes the client-side cart state with the server (Redis/PostgreSQL) using debounced API calls.

## Endpoint

**URL**: `/api/cart/validate` (relative, resolves to `http://localhost:3000/api/cart/validate` in browser)

**Method**: POST

**Request Body**:
```json
{
  "deliverySlot": null,
  "items": [
    { "offerId": 1, "quantity": 2 }
  ]
}
```

## Error Handling

### Network Errors ("Failed to fetch")

The cart sync gracefully handles network errors:

1. **During app startup**: Network errors are expected and logged once in dev mode
2. **During normal use**: Errors are caught and the cart continues with local state
3. **No console spam**: Errors are only logged in development mode

### Behavior

- ✅ Cart works offline with local state
- ✅ Sync retries automatically on next cart change (debounced)
- ✅ No uncaught errors - all network failures are handled gracefully
- ✅ Debug logging shows the full URL in development mode

## Debugging

### Check Network Tab

1. Open DevTools → Network tab
2. Filter by "cart"
3. Look for requests to `/api/cart/validate`
4. Check the request URL (should be relative: `/api/cart/validate`)

### Console Logs (Development Only)

In development mode, you'll see:
- `[CartProvider] Syncing cart to: http://localhost:3000/api/cart/validate`
- `[CartProvider] Cart synced successfully { itemsCount: X }`
- Warnings for network errors (only once, not spammed)

### Common Issues

1. **"Failed to fetch" during startup**: Normal - server might not be ready yet
2. **Persistent "Failed to fetch"**: Check that:
   - Next.js dev server is running
   - API route `/api/cart/validate` exists
   - No CORS issues (shouldn't happen with relative URLs)

## Implementation Details

- **Debounce**: 500ms delay before syncing
- **Relative URLs**: Uses `/api/...` (not hardcoded localhost)
- **Browser-only**: Skips sync during SSR
- **Resilient**: Continues with local state on errors

