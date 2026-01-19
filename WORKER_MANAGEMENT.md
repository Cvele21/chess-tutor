# Worker Memory Management

## Overview

The Stockfish worker is properly managed to prevent memory leaks during long study sessions.

## File Structure

```
public/
  └── stockfish.js          # Worker file (loads Stockfish from CDN)
```

**Note**: This is a **Vite project**, not Next.js, so there is no `next.config.js`. The configuration is in `vite.config.js`.

## Worker Lifecycle

### Initialization
- Worker is created on app mount
- Loads Stockfish from CDN (`https://stockfishchess.org/js/stockfish.js`)
- Initializes UCI protocol
- Sets up message handlers

### Memory Management

1. **Automatic Restart**: Worker is automatically restarted every 30 minutes to prevent memory leaks
2. **Cleanup on Unmount**: Worker is properly terminated when component unmounts
3. **Evaluation Cancellation**: Pending evaluations are cancelled when worker is stopped
4. **Resource Cleanup**: All references are cleared on destroy

### Worker Restart Process

```typescript
// Automatic restart every 30 minutes
setInterval(async () => {
  await restartEngine(); // Destroys old worker and creates new one
}, 30 * 60 * 1000);
```

### Cleanup on Unmount

```typescript
useEffect(() => {
  // ... initialization
  
  return () => {
    destroyEngine(); // Properly terminates worker
  };
}, []);
```

## Memory Leak Prevention

### Issues Addressed

1. **Worker Termination**: Worker is properly terminated on cleanup
2. **Pending Evaluations**: All pending promises are rejected and cleared
3. **Event Handlers**: Event handlers are removed when worker is destroyed
4. **Periodic Restart**: Worker is restarted every 30 minutes to clear accumulated memory

### Best Practices

- ✅ Worker is always terminated before creating a new one
- ✅ Pending evaluations are cancelled on stop
- ✅ All references are nullified on destroy
- ✅ Automatic restart prevents long-term memory accumulation
- ✅ Cleanup happens on component unmount

## Configuration

The worker is configured in:
- `src/lib/chessEngine.ts` - Engine management
- `public/stockfish.js` - Worker implementation
- `vite.config.js` - Build configuration (not next.config.js)

## Notes

- **No stockfish.wasm needed**: The worker loads Stockfish from CDN, which handles WASM internally
- **Vite project**: Uses `vite.config.js`, not `next.config.js`
- **Public folder**: Files in `/public` are served from root URL in both dev and production
