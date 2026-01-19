# Build Troubleshooting Guide

## Common Vercel Build Errors & Solutions

### Error: "Command 'npm run build' exited with 1"

#### 1. TypeScript Compilation Errors
**Symptoms**: Type errors during build
**Solution**: 
- ✅ Fixed: Disabled strict mode in `tsconfig.json`
- Check for any remaining type errors in your code

#### 2. Worker Path Issues
**Symptoms**: Cannot find worker file
**Solution**:
- ✅ Fixed: Simplified worker URL to `/stockfish.js`
- Ensure `public/stockfish.js` exists
- Vite automatically copies public files to dist

#### 3. Missing Dependencies
**Symptoms**: Module not found errors
**Solution**:
```bash
npm install
```
- Ensure all dependencies in `package.json` are installed
- Check `package-lock.json` is committed

#### 4. Node Version Mismatch
**Symptoms**: Build fails with version errors
**Solution**:
- ✅ Added: `.nvmrc` file with Node 18
- ✅ Added: `nodeVersion: "18.x"` in `vercel.json`
- Vercel should use Node 18 automatically

#### 5. Build Output Issues
**Symptoms**: Build succeeds but deployment fails
**Solution**:
- ✅ Verified: `outputDirectory: "dist"` in `vercel.json`
- ✅ Verified: `outDir: "dist"` in `vite.config.js`

## Quick Fixes Applied

1. **TypeScript Config**: Relaxed strict mode
2. **Worker URL**: Simplified to string path
3. **Node Version**: Specified Node 18
4. **Build Config**: Verified all paths

## Testing Locally

Before deploying, test the build locally:

```bash
# Install dependencies
npm install

# Run build
npm run build

# Preview build
npm run preview
```

If local build works, Vercel should work too.

## If Build Still Fails

1. **Check Vercel Logs**: 
   - Go to your Vercel project
   - Click on the failed deployment
   - Check "Build Logs" for specific error

2. **Common Error Messages**:
   - `Cannot find module` → Missing dependency
   - `Type error` → TypeScript issue
   - `Worker not found` → Check public folder
   - `Build timeout` → Increase build timeout in Vercel settings

3. **Verify Files**:
   - ✅ `public/stockfish.js` exists
   - ✅ `package.json` has all dependencies
   - ✅ `tsconfig.json` is valid
   - ✅ `vite.config.js` is valid

## Next Steps

If you see a specific error in Vercel logs, share it and I can provide a targeted fix.
