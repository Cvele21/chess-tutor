# Deployment Checklist

## Pre-Deployment

✅ **Configuration Files**
- [x] `package.json` - Dependencies and scripts configured
- [x] `vite.config.js` - Build configuration with worker support
- [x] `vercel.json` - Vercel deployment configuration
- [x] `.gitignore` - Proper exclusions for node_modules, dist, etc.

✅ **Worker Configuration**
- [x] Stockfish worker uses CDN (`https://stockfishchess.org/js/stockfish.js`)
- [x] Worker import uses Vite's `?worker` syntax (works in production)
- [x] Worker format set to ES modules in `vite.config.js`

✅ **Build Configuration**
- [x] Output directory: `dist`
- [x] Source maps disabled for production
- [x] Code splitting configured for better performance
- [x] SPA routing handled with Vercel rewrites

## Vercel Deployment Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Vite configuration

3. **Verify Build Settings**
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Environment Variables**
   - None required for this project (Stockfish loads from CDN)

## Production Considerations

### Worker Path
The Stockfish worker uses:
- **Import**: `import StockfishWorker from '../workers/stockfish.worker.js?worker'`
- **Vite handles**: The `?worker` suffix automatically bundles the worker correctly
- **CDN**: Stockfish loads from `https://stockfishchess.org/js/stockfish.js` (works in all environments)

### Potential Issues

1. **CORS**: The Stockfish CDN should allow cross-origin requests, but if issues occur:
   - Check browser console for CORS errors
   - Consider hosting Stockfish.js locally if needed

2. **Worker Loading**: If workers fail to load:
   - Verify the worker file is included in the build
   - Check browser console for worker initialization errors
   - Ensure HTTPS is enabled (workers require secure context)

3. **Build Size**: The build should be optimized with:
   - Code splitting (configured in vite.config.js)
   - Tree shaking (automatic with Vite)
   - Minification (automatic in production builds)

## Testing Production Build Locally

```bash
npm run build
npm run preview
```

This will build and serve the production version locally for testing.

## Troubleshooting

### Worker Not Loading
- Check browser console for errors
- Verify `?worker` syntax is preserved in build
- Check network tab for worker file requests

### Stockfish Not Initializing
- Verify CDN is accessible
- Check for CORS errors in console
- Verify worker is receiving messages correctly

### Build Fails
- Check Node.js version (18.x or higher recommended)
- Verify all dependencies are installed
- Check for TypeScript errors (if applicable)
