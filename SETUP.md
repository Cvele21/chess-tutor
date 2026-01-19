# Chess Engine Setup

## Overview

The chess engine has been refactored to use a centralized `lib/chessEngine.ts` module that:
- Initializes Stockfish as a Web Worker from `/public/stockfish.js`
- Provides a `getEvaluation(fen)` function that returns score and best move
- Automatically evaluates positions when pieces are moved

## File Structure

```
src/
  └── lib/
      └── chessEngine.ts    # Main engine module with getEvaluation() function

public/
  └── stockfish.js          # Stockfish worker (loads from CDN internally)
```

## Usage

The engine is automatically initialized when the app loads and evaluates positions automatically:

```typescript
import { initializeEngine, getEvaluation } from './lib/chessEngine';

// Initialize (called automatically in App.jsx)
await initializeEngine();

// Get evaluation (called automatically on each move)
const result = await getEvaluation('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
// Returns: { score: 20, bestMove: 'e2e4' }
```

## How It Works

1. **Initialization**: On app mount, `initializeEngine()` is called
2. **Worker Creation**: Creates a Web Worker from `/public/stockfish.js`
3. **Stockfish Setup**: Worker loads Stockfish from CDN and initializes UCI
4. **Auto-Evaluation**: When a piece is moved, `getEvaluation()` is automatically called
5. **Result Handling**: Score and best move are parsed from Stockfish UCI output

## Worker Path

The worker is loaded from `/public/stockfish.js` which:
- Is served from the public folder (accessible at root URL)
- Works in both development and production
- Uses `new URL('/stockfish.js', window.location.origin)` for proper path resolution

## TypeScript Support

TypeScript has been added to the project:
- `tsconfig.json` - Main TypeScript configuration
- `tsconfig.node.json` - Node/Vite configuration
- Type definitions for the engine module

## Migration Notes

The old `useStockfish` hook has been replaced with the new `chessEngine` module:
- More centralized and reusable
- Better TypeScript support
- Cleaner API with `getEvaluation(fen)` function
- Automatic evaluation on move (no manual hook calls needed)
