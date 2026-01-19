import { useState, useEffect, useRef, useCallback } from 'react';
import StockfishWorker from '../workers/stockfish.worker.js?worker';

export const useStockfish = () => {
  const [evaluation, setEvaluation] = useState(null); // in centipawns
  const [bestMoves, setBestMoves] = useState([]); // top 3 moves
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const workerRef = useRef(null);

  useEffect(() => {
    // Initialize worker
    workerRef.current = new StockfishWorker();
    const worker = workerRef.current;

    worker.postMessage({ type: 'init' });

    worker.onmessage = (event) => {
      const { type, data, searchId } = event.data;

      if (type === 'ready') {
        // Worker is ready
      } else if (type === 'message') {
        const message = data;

        // Parse info lines with MultiPV
        if (message.startsWith('info') && message.includes('multipv')) {
          const parts = message.split(' ');
          const multipvIndex = parts.indexOf('multipv');
          const scoreIndex = parts.indexOf('score');
          const pvIndex = parts.indexOf('pv');

          if (multipvIndex !== -1 && scoreIndex !== -1 && pvIndex !== -1) {
            const moveIndex = parseInt(parts[multipvIndex + 1], 10) - 1;
            let score = 0;
            let move = null;

            // Parse score
            if (parts[scoreIndex + 1] === 'cp') {
              score = parseInt(parts[scoreIndex + 2], 10);
            } else if (parts[scoreIndex + 1] === 'mate') {
              const mateIn = parseInt(parts[scoreIndex + 2], 10);
              score = mateIn > 0 ? 10000 : -10000;
            }

            // Parse PV line (first move)
            if (pvIndex + 1 < parts.length) {
              const firstMove = parts[pvIndex + 1];
              // UCI move format: e2e4 or e7e8q
              if (/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(firstMove)) {
                move = firstMove;
              }
            }

            if (move && moveIndex >= 0 && moveIndex < 3) {
              setBestMoves(prev => {
                const newMoves = [...prev];
                newMoves[moveIndex] = { move, score, index: moveIndex };
                // Update evaluation with best move (multipv 1)
                if (moveIndex === 0) {
                  setEvaluation(score);
                }
                return newMoves.filter(m => m !== undefined).sort((a, b) => a.index - b.index);
              });
            }
          }
        }

        // Parse evaluation from non-MultiPV lines (fallback)
        if (message.includes('score cp') && !message.includes('multipv')) {
          const match = message.match(/score cp (-?\d+)/);
          if (match) {
            const centipawns = parseInt(match[1], 10);
            // Only update if we don't have MultiPV data
            setEvaluation(prev => prev === null ? centipawns : prev);
          }
        }

        // Parse mate (non-MultiPV fallback)
        if (message.includes('score mate') && !message.includes('multipv')) {
          const match = message.match(/score mate (-?\d+)/);
          if (match) {
            const mateIn = parseInt(match[1], 10);
            const score = mateIn > 0 ? 10000 : -10000;
            setEvaluation(prev => prev === null ? score : prev);
          }
        }

        // Parse best move (search complete)
        if (message.startsWith('bestmove')) {
          setIsAnalyzing(false);
        }
      } else if (type === 'error') {
        console.error('Stockfish error:', data);
        setIsAnalyzing(false);
      }
    };

    return () => {
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'stop' });
        workerRef.current.terminate();
      }
    };
  }, []);

  const evaluatePosition = useCallback((fen, depth = 15) => {
    if (!workerRef.current) return;

    setIsAnalyzing(true);
    setBestMoves([]);
    workerRef.current.postMessage({
      type: 'evaluate',
      position: `fen ${fen}`,
      depth
    });
  }, []);

  const stopAnalysis = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'stop' });
      setIsAnalyzing(false);
    }
  }, []);

  return {
    evaluation,
    bestMoves,
    isAnalyzing,
    evaluatePosition,
    stopAnalysis
  };
};
