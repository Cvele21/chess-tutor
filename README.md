# Chess Tutor

A React-based chess tutoring application with real-time Stockfish engine evaluation and best move visualization.

## Features

- **Stockfish.js Integration**: Web worker-based chess engine for move evaluations
- **Tutor Feedback Component**: Displays current centipawn evaluation in the sidebar
- **Show Best Line**: Hover over evaluation to see top 3 engine moves as arrows on the board
- **Auto-Recalculate**: Automatically re-evaluates position after each move
- **Coach's Comments**: Real-time feedback on move quality based on evaluation changes
- **Threat Mode**: Highlights pieces under attack after opponent's best response

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Deployment

This project is configured for deployment on Vercel:

1. Push your code to GitHub
2. Import the repository in Vercel
3. Vercel will automatically detect the Vite configuration
4. The build will use the settings in `vercel.json`

### Build Configuration

- **Framework**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Node Version**: 18.x or higher (recommended)

## Technologies

- React 18
- Vite 5
- react-chessboard
- chess.js
- Stockfish.js (via CDN)

## Project Structure

```
src/
  ├── components/
  │   ├── TutorFeedback.jsx    # Sidebar component with evaluation display
  │   └── CoachComments.jsx     # Coach feedback component
  ├── hooks/
  │   └── useStockfish.js       # Hook for Stockfish engine integration
  ├── workers/
  │   └── stockfish.worker.js   # Web worker for Stockfish
  ├── utils/
  │   ├── chessUtils.js         # Utility functions for chess moves
  │   ├── coachComments.js      # Coach comment generation logic
  │   └── threatAnalysis.js     # Threat detection utilities
  ├── App.jsx                    # Main application component
  └── main.jsx                   # Application entry point
```

## Notes

- The Stockfish worker loads from CDN for better compatibility across environments
- Web workers are configured to use ES module format for production builds
- The application uses client-side routing, so all routes are handled by the SPA
