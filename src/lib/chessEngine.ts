/**
 * Chess Engine Module
 * Initializes Stockfish as a Web Worker and provides evaluation functions
 */

interface EvaluationResult {
  score: number; // in centipawns
  bestMove: string | null; // UCI format (e.g., "e2e4")
}

class ChessEngine {
  private worker: Worker | null = null;
  private isReady: boolean = false;
  private pendingEvaluations: Map<number, {
    resolve: (result: EvaluationResult) => void;
    reject: (error: Error) => void;
    evaluation: EvaluationResult | null;
  }> = new Map();
  private evaluationId: number = 0;
  private currentSearchId: number = 0;
  private searchIdToEvalId: Map<number, number> = new Map();

  /**
   * Initialize the Stockfish worker
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create worker from public folder
        // In Vite, files in public are served from root
        // Use new URL() with window.location.href for proper URL resolution in all environments
        // This ensures the worker path resolves correctly regardless of base path or deployment location
        // Use classic worker (not module) because importScripts() is only available in classic workers
        const workerUrl = new URL('/stockfish.js', window.location.href);
        
        this.worker = new Worker(workerUrl, { type: 'classic' });

        this.worker.onmessage = (event) => {
          const { type, data, searchId } = event.data;

          if (type === 'ready') {
            this.isReady = true;
            resolve();
          } else if (type === 'message') {
            this.handleStockfishMessage(data, searchId);
          } else if (type === 'error') {
            console.error('Stockfish worker error:', data);
            reject(new Error(data));
          }
        };

        this.worker.onerror = (error) => {
          console.error('Worker error:', error);
          reject(error);
        };

        // Initialize Stockfish
        this.worker.postMessage({ type: 'init' });
      } catch (error) {
        console.error('Failed to initialize Stockfish worker:', error);
        reject(error);
      }
    });
  }

  /**
   * Handle messages from Stockfish worker
   * @param message - UCI message from Stockfish
   * @param searchId - Search ID from worker (to match with evalId)
   */
  private handleStockfishMessage(message: string, searchId?: number): void {
    // Parse UCI info messages
    if (message.startsWith('info') && message.includes('score')) {
      const scoreMatch = message.match(/score (cp|mate) (-?\d+)/);
      const pvMatch = message.match(/pv ([a-h][1-8][a-h][1-8][qrbn]?)/);
      
      if (scoreMatch && searchId !== undefined) {
        // Find the evalId for this searchId, or use the oldest pending evaluation if not mapped yet
        let evalId = this.searchIdToEvalId.get(searchId);
        
        // If this searchId isn't mapped yet, map it to the oldest pending evaluation
        // This handles the case where we receive info before we've explicitly mapped it
        if (evalId === undefined && this.pendingEvaluations.size > 0) {
          // Find an unmapped evalId (one that doesn't have a searchId yet)
          for (const [eid, pending] of this.pendingEvaluations.entries()) {
            let isMapped = false;
            for (const mappedEid of this.searchIdToEvalId.values()) {
              if (mappedEid === eid) {
                isMapped = true;
                break;
              }
            }
            if (!isMapped) {
              evalId = eid;
              this.searchIdToEvalId.set(searchId, evalId);
              break;
            }
          }
        }
        
        if (evalId !== undefined) {
          let score = 0;
          if (scoreMatch[1] === 'cp') {
            score = parseInt(scoreMatch[2], 10);
          } else if (scoreMatch[1] === 'mate') {
            const mateIn = parseInt(scoreMatch[2], 10);
            score = mateIn > 0 ? 10000 : -10000;
          }

          const bestMove = pvMatch ? pvMatch[1] : null;
          
          // Update the evaluation for this specific evalId
          const pending = this.pendingEvaluations.get(evalId);
          if (pending) {
            pending.evaluation = { score, bestMove };
          }
        }
      }
    }

    // Parse bestmove (evaluation complete)
    if (message.startsWith('bestmove')) {
      const bestMoveMatch = message.match(/bestmove ([a-h][1-8][a-h][1-8][qrbn]?)/);
      
      if (searchId !== undefined) {
        // Find the evalId for this searchId
        let evalId = this.searchIdToEvalId.get(searchId);
        
        // If not mapped yet, try to map it to an unmapped evaluation
        // This handles edge cases where bestmove arrives before info messages
        if (evalId === undefined && this.pendingEvaluations.size > 0) {
          for (const [eid, pending] of this.pendingEvaluations.entries()) {
            let isMapped = false;
            for (const mappedEid of this.searchIdToEvalId.values()) {
              if (mappedEid === eid) {
                isMapped = true;
                break;
              }
            }
            if (!isMapped) {
              evalId = eid;
              this.searchIdToEvalId.set(searchId, evalId);
              break;
            }
          }
        }
        
        if (evalId !== undefined) {
          const pending = this.pendingEvaluations.get(evalId);
          
          if (pending) {
            // Update best move if found
            if (bestMoveMatch) {
              if (pending.evaluation) {
                pending.evaluation.bestMove = bestMoveMatch[1];
              } else {
                // Create evaluation if it doesn't exist (edge case)
                pending.evaluation = { score: 0, bestMove: bestMoveMatch[1] };
              }
            }
            
            // Resolve the correct evaluation
            if (pending.evaluation) {
              pending.resolve({ ...pending.evaluation });
            } else {
              // Fallback if no evaluation was captured
              pending.reject(new Error('Evaluation incomplete'));
            }
            
            // Clean up: remove this specific evaluation
            this.pendingEvaluations.delete(evalId);
            this.searchIdToEvalId.delete(searchId);
          }
        }
      }
    }
  }

  /**
   * Get evaluation for a given FEN position
   * @param fen - Forsyth-Edwards Notation string
   * @param depth - Search depth (default: 15)
   * @returns Promise with evaluation result
   */
  async getEvaluation(fen: string, depth: number = 15): Promise<EvaluationResult> {
    if (!this.worker || !this.isReady) {
      throw new Error('Chess engine not initialized. Call initialize() first.');
    }

    return new Promise((resolve, reject) => {
      const evalId = ++this.evaluationId;
      let timeout: NodeJS.Timeout | null = null;

      // Wrapper functions that clear timeout
      const wrappedResolve = (result: EvaluationResult) => {
        if (timeout) clearTimeout(timeout);
        this.pendingEvaluations.delete(evalId);
        // Clean up searchId mapping
        for (const [sid, eid] of this.searchIdToEvalId.entries()) {
          if (eid === evalId) {
            this.searchIdToEvalId.delete(sid);
            break;
          }
        }
        resolve(result);
      };

      const wrappedReject = (error: Error) => {
        if (timeout) clearTimeout(timeout);
        this.pendingEvaluations.delete(evalId);
        // Clean up searchId mapping
        for (const [sid, eid] of this.searchIdToEvalId.entries()) {
          if (eid === evalId) {
            this.searchIdToEvalId.delete(sid);
            break;
          }
        }
        reject(error);
      };

      // When a new evaluation starts, the worker stops the previous search
      // So we should reject any previous pending evaluations that don't have a searchId yet
      // (they were just queued but the search was stopped before it started)
      const previousUnmappedEvaluations: number[] = [];
      for (const [eid, pending] of this.pendingEvaluations.entries()) {
        let isMapped = false;
        for (const mappedEid of this.searchIdToEvalId.values()) {
          if (mappedEid === eid) {
            isMapped = true;
            break;
          }
        }
        if (!isMapped) {
          previousUnmappedEvaluations.push(eid);
        }
      }
      
      // Reject previous unmapped evaluations (they were stopped before starting)
      previousUnmappedEvaluations.forEach(eid => {
        const pending = this.pendingEvaluations.get(eid);
        if (pending) {
          pending.reject(new Error('Evaluation cancelled by new request'));
          this.pendingEvaluations.delete(eid);
        }
      });

      // Store the promise resolvers
      this.pendingEvaluations.set(evalId, {
        resolve: wrappedResolve,
        reject: wrappedReject,
        evaluation: null
      });

      // Set timeout for evaluation
      timeout = setTimeout(() => {
        wrappedReject(new Error('Evaluation timeout'));
      }, 30000); // 30 second timeout

      // Send evaluation request
      // The worker will increment searchId and we'll track it when we receive the first message
      this.worker!.postMessage({
        type: 'evaluate',
        position: `fen ${fen}`,
        depth
      });
    });
  }

  /**
   * Stop current evaluation
   */
  stopEvaluation(): void {
    if (this.worker && this.isReady) {
      this.worker.postMessage({ type: 'stop' });
      // Reject all pending evaluations
      this.pendingEvaluations.forEach(({ reject }) => {
        reject(new Error('Evaluation stopped'));
      });
      this.pendingEvaluations.clear();
      this.searchIdToEvalId.clear();
    }
  }

  /**
   * Cleanup and terminate worker
   */
  destroy(): void {
    if (this.worker) {
      this.stopEvaluation();
      // Clear all pending evaluations
      this.pendingEvaluations.forEach(({ reject }) => {
        reject(new Error('Worker terminated'));
      });
      this.pendingEvaluations.clear();
      this.searchIdToEvalId.clear();
      
      // Terminate worker
      this.worker.terminate();
      this.worker = null;
      this.isReady = false;
      this.evaluationId = 0;
    }
  }

  /**
   * Restart the worker (useful for memory management in long sessions)
   */
  async restart(): Promise<void> {
    this.destroy();
    await this.initialize();
  }

  /**
   * Get worker status
   */
  getStatus(): { isReady: boolean; hasWorker: boolean; pendingCount: number } {
    return {
      isReady: this.isReady,
      hasWorker: this.worker !== null,
      pendingCount: this.pendingEvaluations.size
    };
  }
}

// Export singleton instance
let engineInstance: ChessEngine | null = null;

/**
 * Get or create the chess engine instance
 */
export function getChessEngine(): ChessEngine {
  if (!engineInstance) {
    engineInstance = new ChessEngine();
  }
  return engineInstance;
}

/**
 * Initialize the chess engine
 */
export async function initializeEngine(): Promise<void> {
  const engine = getChessEngine();
  await engine.initialize();
}

/**
 * Get evaluation for a position
 */
export async function getEvaluation(fen: string, depth?: number): Promise<EvaluationResult> {
  const engine = getChessEngine();
  return engine.getEvaluation(fen, depth);
}

/**
 * Destroy and cleanup the engine
 */
export function destroyEngine(): void {
  const engine = getChessEngine();
  engine.destroy();
  // Clear singleton instance
  engineInstance = null;
}

/**
 * Restart the engine (for memory management)
 */
export async function restartEngine(): Promise<void> {
  const engine = getChessEngine();
  await engine.restart();
}

export type { EvaluationResult };
