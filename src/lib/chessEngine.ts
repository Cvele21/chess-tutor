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
  }> = new Map();
  private evaluationId: number = 0;
  private currentEvaluation: EvaluationResult | null = null;

  /**
   * Initialize the Stockfish worker
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create worker from public folder
        // In Vite, files in public are served from root
        // Use simple string path - Vite handles this correctly in both dev and production
        const workerUrl = '/stockfish.js';
        
        this.worker = new Worker(workerUrl, { type: 'module' });

        this.worker.onmessage = (event) => {
          const { type, data } = event.data;

          if (type === 'ready') {
            this.isReady = true;
            resolve();
          } else if (type === 'message') {
            this.handleStockfishMessage(data);
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
   */
  private handleStockfishMessage(message: string): void {
    // Parse UCI info messages
    if (message.startsWith('info') && message.includes('score')) {
      const scoreMatch = message.match(/score (cp|mate) (-?\d+)/);
      const pvMatch = message.match(/pv ([a-h][1-8][a-h][1-8][qrbn]?)/);
      
      if (scoreMatch) {
        let score = 0;
        if (scoreMatch[1] === 'cp') {
          score = parseInt(scoreMatch[2], 10);
        } else if (scoreMatch[1] === 'mate') {
          const mateIn = parseInt(scoreMatch[2], 10);
          score = mateIn > 0 ? 10000 : -10000;
        }

        const bestMove = pvMatch ? pvMatch[1] : null;
        
        this.currentEvaluation = { score, bestMove };
      }
    }

    // Parse bestmove (evaluation complete)
    if (message.startsWith('bestmove')) {
      const bestMoveMatch = message.match(/bestmove ([a-h][1-8][a-h][1-8][qrbn]?)/);
      if (bestMoveMatch && this.currentEvaluation) {
        this.currentEvaluation.bestMove = bestMoveMatch[1];
      }

      // Resolve pending evaluation
      const pending = Array.from(this.pendingEvaluations.values())[0];
      if (pending && this.currentEvaluation) {
        pending.resolve({ ...this.currentEvaluation });
        this.pendingEvaluations.clear();
        this.currentEvaluation = null;
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
        resolve(result);
      };

      const wrappedReject = (error: Error) => {
        if (timeout) clearTimeout(timeout);
        this.pendingEvaluations.delete(evalId);
        reject(error);
      };

      // Store the promise resolvers
      this.pendingEvaluations.set(evalId, {
        resolve: wrappedResolve,
        reject: wrappedReject
      });

      // Set timeout for evaluation
      timeout = setTimeout(() => {
        this.pendingEvaluations.delete(evalId);
        wrappedReject(new Error('Evaluation timeout'));
      }, 30000); // 30 second timeout

      // Send evaluation request
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
      this.currentEvaluation = null;
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
      this.currentEvaluation = null;
      
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
