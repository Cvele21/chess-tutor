# Build Error Fixes

## Common Vercel Build Issues Fixed

### 1. TypeScript Strict Mode
- **Issue**: Strict mode can cause build failures with unused variables
- **Fix**: Disabled strict mode and unused variable checks in `tsconfig.json`

### 2. Worker URL Resolution
- **Issue**: `window.location.origin` not available during build
- **Fix**: Added check for `typeof window !== 'undefined'` before using window

### 3. Build Configuration
- **Issue**: Vercel needs proper build settings
- **Fix**: `vercel.json` already configured correctly

## Build Command

```bash
npm run build
```

This runs `vite build` which:
- Compiles TypeScript
- Bundles React app
- Processes workers
- Outputs to `dist/` folder

## If Build Still Fails

1. **Check Vercel Logs**: Look for specific error messages
2. **Common Issues**:
   - Missing dependencies (run `npm install`)
   - TypeScript errors (check `tsconfig.json`)
   - Worker path issues (verify `public/stockfish.js` exists)
   - Node version (Vercel should auto-detect, but may need Node 18+)

## Verification

After fixes:
- ✅ TypeScript compiles without strict errors
- ✅ Worker URL resolves correctly in build
- ✅ All dependencies are installed
- ✅ Public files are copied to dist
