import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { initializeEngine, getEvaluation, destroyEngine, restartEngine } from './lib/chessEngine';
import TutorFeedback from './components/TutorFeedback';
import CoachComments from './components/CoachComments';
import BlunderPopup from './components/BlunderPopup';
import EvaluationBar from './components/EvaluationBar';
import { uciToMove, moveToUci, getArrowColor } from './utils/chessUtils';
import { generateCoachComment } from './utils/coachComments';
import { findAttackedPieces } from './utils/threatAnalysis';
import './App.css';

function App() {
  const [game, setGame] = useState(new Chess());
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [arrows, setArrows] = useState([]);
  const [hintArrow, setHintArrow] = useState(null);
  const [customSquareStyles, setCustomSquareStyles] = useState({});
  const [coachComment, setCoachComment] = useState(null);
  const [threatMode, setThreatMode] = useState(false);
  const [showBlunderPopup, setShowBlunderPopup] = useState(false);
  
  const [evaluation, setEvaluation] = useState(null);
  const [bestMoves, setBestMoves] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  
  const previousEvalRef = useRef(null);
  const previousGameRef = useRef(null);

  // Initialize engine on mount
  useEffect(() => {
    let mounted = true;
    let restartInterval = null;

    initializeEngine()
      .then(() => {
        if (mounted) {
          setEngineReady(true);
          console.log('Chess engine initialized');
          
          // Restart worker every 30 minutes to prevent memory leaks in long sessions
          restartInterval = setInterval(async () => {
            try {
              console.log('Restarting chess engine to prevent memory leaks...');
              await restartEngine();
              console.log('Chess engine restarted successfully');
            } catch (error) {
              console.error('Failed to restart chess engine:', error);
            }
          }, 30 * 60 * 1000); // 30 minutes
        }
      })
      .catch((error) => {
        if (mounted) {
          console.error('Failed to initialize chess engine:', error);
        }
      });

    return () => {
      mounted = false;
      if (restartInterval) {
        clearInterval(restartInterval);
      }
      // Cleanup worker on unmount
      destroyEngine();
    };
  }, []);

  // Automatically evaluate position whenever game state changes
  useEffect(() => {
    if (!engineReady) return;

    const fen = game.fen();
    setIsAnalyzing(true);
    setBestMoves([]);

    let cancelled = false;

    getEvaluation(fen, 15)
      .then((result) => {
        if (!cancelled) {
          setEvaluation(result.score);
          if (result.bestMove) {
            setBestMoves([{ move: result.bestMove, score: result.score, index: 0 }]);
          }
          setIsAnalyzing(false);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Evaluation error:', error);
          setIsAnalyzing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [game, engineReady]);

  // Track evaluation changes and generate coach comments + blunder detection
  useEffect(() => {
    // Only process when evaluation is stable (not analyzing)
    if (!isAnalyzing && evaluation !== null) {
      // Check if game state has changed (a move was made)
      const gameChanged = previousGameRef.current === null || 
                         previousGameRef.current.fen() !== game.fen();
      
      // If game changed and we have a previous evaluation, generate comment
      if (gameChanged && previousEvalRef.current !== null) {
        const evaluationChange = evaluation - previousEvalRef.current;
        
        // Blunder detection: Check if score dropped by more than 1.5 pawns (150 centipawns)
        const isWhiteTurn = previousGameRef.current.turn() === 'w';
        const justMoved = isWhiteTurn ? 'white' : 'black';
        const perspective = justMoved === 'white' ? 1 : -1;
        const adjustedChange = evaluationChange * perspective;
        
        // If score dropped by more than 1.5 pawns (150 centipawns), show blunder popup
        if (adjustedChange < -150) {
          setShowBlunderPopup(true);
        }
        
        const comment = generateCoachComment(
          evaluationChange,
          previousEvalRef.current,
          evaluation,
          game
        );
        
        if (comment) {
          setCoachComment(comment);
        } else {
          // Clear comment if move is neutral
          setCoachComment(null);
        }
      }
      
      // Update previous evaluation and game state for next comparison
      // This happens after we've used the previous values
      previousEvalRef.current = evaluation;
      previousGameRef.current = new Chess(game.fen());
    }
  }, [evaluation, game, isAnalyzing]);

  // Threat Mode: Highlight pieces under attack after opponent's best move
  useEffect(() => {
    if (!threatMode || !bestMoves || bestMoves.length === 0 || isAnalyzing) {
      setCustomSquareStyles({});
      return;
    }

    // Get opponent's best move (first best move from current position)
    const opponentBestMove = bestMoves[0]?.move;
    
    if (!opponentBestMove) {
      setCustomSquareStyles({});
      return;
    }

    // Find pieces that would be under attack after opponent's best move
    const attackedSquares = findAttackedPieces(game, opponentBestMove);
    
    // Create square styles for attacked pieces
    const styles = {};
    attackedSquares.forEach(square => {
      styles[square] = {
        backgroundColor: 'rgba(248, 113, 113, 0.4)', // Red tint for attacked pieces
        borderRadius: '50%',
        boxShadow: 'inset 0 0 10px rgba(248, 113, 113, 0.6)'
      };
    });

    setCustomSquareStyles(styles);
  }, [threatMode, bestMoves, game, isAnalyzing]);

  // Handle move made on board
  const onDrop = useCallback((sourceSquare, targetSquare) => {
    try {
      const gameCopy = new Chess(game.fen());
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q'
      });

      if (move === null) return false;

      setGame(gameCopy);
      setArrows([]); // Clear arrows after move
      setHintArrow(null); // Clear hint arrow after move
      return true;
    } catch (error) {
      console.error('Move error:', error);
      return false;
    }
  }, [game]);

  // Handle hover over evaluation/best moves
  const handleHoverMove = useCallback((moves) => {
    if (!moves || moves.length === 0) {
      setArrows([]);
      return;
    }

    const arrowArray = moves.map((moveData, index) => {
      const uciMove = moveData.move;
      if (uciMove.length < 4) return null;

      const from = uciMove.substring(0, 2);
      const to = uciMove.substring(2, 4);

      return {
        from,
        to,
        color: getArrowColor(index)
      };
    }).filter(Boolean);

    setArrows(arrowArray);
  }, []);

  // Handle mouse leave
  const handleLeaveMove = useCallback(() => {
    setArrows([]);
  }, []);

  // Show hint (best move arrow)
  const showHint = useCallback(() => {
    if (bestMoves && bestMoves.length > 0 && bestMoves[0]?.move) {
      const bestMove = bestMoves[0].move;
      if (bestMove.length >= 4) {
        const from = bestMove.substring(0, 2);
        const to = bestMove.substring(2, 4);
        
        setHintArrow({
          from,
          to,
          color: 'rgba(74, 222, 128, 0.6)' // Semi-transparent green
        });
        
        // Clear hint after 5 seconds
        setTimeout(() => {
          setHintArrow(null);
        }, 5000);
      }
    }
  }, [bestMoves]);

  // Reset game
  const resetGame = () => {
    setGame(new Chess());
    setArrows([]);
    setHintArrow(null);
    setCoachComment(null);
    setCustomSquareStyles({});
    setShowBlunderPopup(false);
    previousEvalRef.current = null;
    previousGameRef.current = null;
  };

  return (
    <div className="app">
      <div className="app-container">
        {/* Main Board Area */}
        <div className="board-container">
          <div className="board-layout">
            <EvaluationBar evaluation={evaluation} />
            <div className="board-wrapper">
              <Chessboard
                position={game.fen()}
                onPieceDrop={onDrop}
                boardOrientation={boardOrientation}
                customArrows={hintArrow ? [...arrows, hintArrow] : arrows}
                customSquareStyles={customSquareStyles}
                boardWidth={600}
              />
            </div>
          </div>
          
          <div className="board-controls">
            <button onClick={resetGame} className="control-button">
              Reset Game
            </button>
            <button 
              onClick={() => setBoardOrientation(prev => prev === 'white' ? 'black' : 'white')}
              className="control-button"
            >
              Flip Board
            </button>
            <button 
              onClick={() => setThreatMode(prev => !prev)}
              className={`control-button ${threatMode ? 'active' : ''}`}
            >
              {threatMode ? '🔴 Threat Mode ON' : '⚪ Threat Mode OFF'}
            </button>
            <button 
              onClick={showHint}
              className="control-button hint-button"
              disabled={!bestMoves || bestMoves.length === 0 || isAnalyzing}
            >
              💡 Show Hint
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="sidebar">
          <TutorFeedback
            evaluation={evaluation}
            bestMoves={bestMoves}
            onHoverMove={handleHoverMove}
            onLeaveMove={handleLeaveMove}
          />

          <CoachComments comment={coachComment} />

          {threatMode && bestMoves && bestMoves.length > 0 && (
            <div className="threat-mode-info">
              <h3>Threat Analysis</h3>
              <p className="threat-description">
                After opponent's best move ({bestMoves[0]?.move || 'N/A'}), 
                {Object.keys(customSquareStyles).length > 0 
                  ? ` ${Object.keys(customSquareStyles).length} piece(s) will be under attack.`
                  : ' no pieces are under immediate threat.'}
              </p>
            </div>
          )}

          {isAnalyzing && (
            <div className="analyzing-indicator">
              <div className="spinner"></div>
              <span>Analyzing position...</span>
            </div>
          )}

          <div className="game-info">
            <h3>Game Info</h3>
            <div className="info-item">
              <span>Turn:</span>
              <span>{game.turn() === 'w' ? 'White' : 'Black'}</span>
            </div>
            <div className="info-item">
              <span>Move Count:</span>
              <span>{game.moveNumber()}</span>
            </div>
            <div className="info-item">
              <span>Status:</span>
              <span>
                {game.isCheckmate() 
                  ? 'Checkmate' 
                  : game.isCheck() 
                  ? 'Check' 
                  : game.isDraw() 
                  ? 'Draw' 
                  : 'In Progress'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Blunder Popup */}
      {showBlunderPopup && (
        <BlunderPopup onClose={() => setShowBlunderPopup(false)} />
      )}
    </div>
  );
}

export default App;
