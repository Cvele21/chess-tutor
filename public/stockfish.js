// Stockfish Web Worker
// This file will be served from the public folder and loaded as a worker

importScripts('https://stockfishchess.org/js/stockfish.js');

let stockfish = null;
let isReady = false;
let currentSearchId = 0;

// Initialize Stockfish
try {
  if (typeof Stockfish !== 'undefined') {
    stockfish = new Stockfish();
    
    stockfish.onmessage = (event) => {
      const message = event.data || event;
      
      if (typeof message === 'string') {
        // Forward all messages to main thread with current searchId
        // Note: searchId is set when evaluate request is received
        self.postMessage({ 
          type: 'message', 
          data: message, 
          searchId: currentSearchId 
        });

        // Handle UCI initialization
        if (message === 'uciok') {
          isReady = true;
          self.postMessage({ type: 'ready' });
          
          // Configure Stockfish
          stockfish.postMessage('setoption name Skill Level value 20');
          stockfish.postMessage('setoption name MultiPV value 1'); // Get best move
        }
      }
    };
    
    // Initialize UCI
    stockfish.postMessage('uci');
  }
} catch (error) {
  self.postMessage({ type: 'error', data: error.message });
}

// Handle messages from main thread
self.onmessage = (event) => {
  const { type, position, depth } = event.data;

  if (!stockfish) {
    self.postMessage({ type: 'error', data: 'Stockfish not loaded' });
    return;
  }

  switch (type) {
    case 'init':
      if (!isReady) {
        stockfish.postMessage('uci');
      }
      break;

    case 'evaluate':
      if (isReady) {
        // Increment searchId BEFORE starting search so all messages from this search have the same ID
        currentSearchId++;
        const thisSearchId = currentSearchId;
        
        // Stop any previous search
        stockfish.postMessage('stop');
        
        // Set position
        const posCommand = position || 'startpos';
        stockfish.postMessage(`position ${posCommand}`);
        
        // Start search - all messages from this search will have thisSearchId
        const depthValue = depth || 15;
        stockfish.postMessage(`go depth ${depthValue}`);
      } else {
        self.postMessage({ type: 'error', data: 'Stockfish not ready' });
      }
      break;

    case 'stop':
      if (isReady) {
        stockfish.postMessage('stop');
        currentSearchId++;
      }
      break;

    default:
      break;
  }
};
