# Vitest Test Setup

## Configuration Files

### `package.json`
- ✅ `vitest` in devDependencies (v2.1.4)
- ✅ Test scripts:
  - `npm test` - Run tests once
  - `npm run test:watch` - Watch mode
  - `npm run test:ui` - UI mode (requires `@vitest/ui` if you want to use it)

### `vitest.config.ts`
- ✅ Path alias `@` configured to point to `src/`
- ✅ Test environment: `node` (no DOM needed for current tests)
- ✅ Globals enabled (describe, it, expect available without imports)
- ✅ Test file patterns: `src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}`
- ✅ Excludes: `node_modules`, `dist`, `.next`

### `tsconfig.json`
- ✅ Includes `vitest.config.ts`
- ✅ Path alias `@/*` configured
- ✅ All test files included via `**/*.ts` pattern

## Running Tests

### Local Development
```bash
# Install dependencies (if not already done)
npm install

# Run tests once
npm test

# Watch mode (re-runs on file changes)
npm run test:watch

# UI mode (optional, requires @vitest/ui)
npm run test:ui
```

### Docker
```bash
# Build and start container
docker compose up --build

# Run tests inside container
docker compose exec <service-name> npm test
```

## Test Files

Tests are located in `src/**/__tests__/**/*.test.ts` or `src/**/*.test.ts`

Example: `src/lib/search/__tests__/menuSearch.test.ts`

## Troubleshooting

### "Cannot find module 'vitest'"
- Ensure `npm install` has been run
- Check that `vitest` is in `devDependencies` in `package.json`

### Path alias `@` not resolving
- Verify `vitest.config.ts` has the alias configured
- Check that `tsconfig.json` includes the test files

### Type errors in tests
- Ensure `tsconfig.json` includes test files (via `**/*.ts` pattern)
- Verify `vitest.config.ts` is included in `tsconfig.json`

## Optional: UI Mode

To use the UI mode (`npm run test:ui`), install:
```bash
npm install -D @vitest/ui
```

This provides a web-based UI for running and debugging tests.

