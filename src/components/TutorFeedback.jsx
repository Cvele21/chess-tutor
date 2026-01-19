import React from 'react';
import './TutorFeedback.css';

const TutorFeedback = ({ evaluation, bestMoves, onHoverMove, onLeaveMove }) => {
  // Convert centipawns to display format
  const formatEvaluation = (cp) => {
    if (cp === null || cp === undefined) return '--';
    
    // Mate detection
    if (Math.abs(cp) >= 10000) {
      return cp > 0 ? 'M+' : 'M-';
    }
    
    // Convert to pawns (divide by 100)
    const pawns = (cp / 100).toFixed(1);
    return cp >= 0 ? `+${pawns}` : pawns;
  };

  // Get evaluation color class
  const getEvaluationClass = (cp) => {
    if (cp === null || cp === undefined) return 'neutral';
    if (Math.abs(cp) >= 10000) return 'mate';
    if (Math.abs(cp) < 30) return 'equal';
    return cp > 0 ? 'positive' : 'negative';
  };

  return (
    <div className="tutor-feedback">
      <h3>Tutor Feedback</h3>
      
      <div className="evaluation-section">
        <div className="evaluation-label">Evaluation</div>
        <div 
          className={`evaluation-value ${getEvaluationClass(evaluation)}`}
          onMouseEnter={() => {
            if (bestMoves && bestMoves.length > 0) {
              onHoverMove(bestMoves);
            }
          }}
          onMouseLeave={onLeaveMove}
        >
          {formatEvaluation(evaluation)}
        </div>
        <div className="evaluation-subtitle">
          {evaluation !== null && evaluation !== undefined
            ? Math.abs(evaluation) >= 10000
              ? 'Checkmate'
              : 'Centipawns'
            : 'Waiting...'}
        </div>
      </div>

      {bestMoves && bestMoves.length > 0 && (
        <div className="best-moves-section">
          <div className="best-moves-label">Top Moves</div>
          <div className="best-moves-list">
            {bestMoves.slice(0, 3).map((moveData, index) => (
              <div 
                key={index} 
                className="best-move-item"
                onMouseEnter={() => onHoverMove([moveData])}
                onMouseLeave={onLeaveMove}
              >
                <span className="move-rank">{index + 1}.</span>
                <span className="move-notation">{moveData.move}</span>
                <span className="move-score">
                  {formatEvaluation(moveData.score)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TutorFeedback;
