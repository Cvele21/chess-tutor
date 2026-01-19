import React from 'react';
import './EvaluationBar.css';

const EvaluationBar = ({ evaluation }) => {
  // Convert centipawns to a percentage for the bar
  // Evaluation ranges from -10000 (black winning) to +10000 (white winning)
  // For display, we'll cap at ±500 centipawns (±5 pawns) for better visualization
  const normalizeEvaluation = (cp) => {
    if (cp === null || cp === undefined) return 50; // Neutral
    
    // Handle mate
    if (Math.abs(cp) >= 10000) {
      return cp > 0 ? 100 : 0;
    }
    
    // Clamp to ±500 centipawns for better visualization
    const clamped = Math.max(-500, Math.min(500, cp));
    
    // Convert to percentage (0-100)
    // -500 = 0% (black winning), 0 = 50% (equal), +500 = 100% (white winning)
    return ((clamped + 500) / 1000) * 100;
  };

  const percentage = normalizeEvaluation(evaluation);
  const isWhiteWinning = evaluation !== null && evaluation > 0;
  const isBlackWinning = evaluation !== null && evaluation < 0;
  const isEqual = evaluation !== null && Math.abs(evaluation) < 30;

  // Format evaluation text
  const formatEval = (cp) => {
    if (cp === null || cp === undefined) return '--';
    if (Math.abs(cp) >= 10000) {
      return cp > 0 ? 'M+' : 'M-';
    }
    const pawns = (Math.abs(cp) / 100).toFixed(1);
    return cp >= 0 ? `+${pawns}` : `-${pawns}`;
  };

  return (
    <div className="evaluation-bar-container">
      <div className="evaluation-bar-label">White</div>
      <div className="evaluation-bar-wrapper">
        <div 
          className={`evaluation-bar ${isEqual ? 'equal' : isWhiteWinning ? 'white-winning' : 'black-winning'}`}
          style={{ height: `${percentage}%` }}
        >
          {evaluation !== null && (
            <div className="evaluation-bar-value">
              {formatEval(evaluation)}
            </div>
          )}
        </div>
      </div>
      <div className="evaluation-bar-label">Black</div>
    </div>
  );
};

export default EvaluationBar;
