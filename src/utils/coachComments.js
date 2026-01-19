// Generate coach comments based on evaluation change
export const generateCoachComment = (evaluationChange, previousEval, currentEval, game) => {
  // evaluationChange = currentEval - previousEval
  // Stockfish always evaluates from white's perspective
  // So positive eval = white better, negative eval = black better
  
  // Since we're checking after a move, the turn has changed
  // If it's now white's turn, black just moved
  // If it's now black's turn, white just moved
  
  const isWhiteTurn = game.turn() === 'w';
  const justMoved = isWhiteTurn ? 'black' : 'white';
  
  // For the player who just moved:
  // - If white moved: positive change = good, negative change = bad
  // - If black moved: positive change = bad (white improved), negative change = good (black improved)
  // So we need to flip the sign when black moved
  
  const perspective = justMoved === 'white' ? 1 : -1;
  
  // Adjust evaluation change based on perspective
  // This gives us the change from the perspective of the player who just moved
  const adjustedChange = evaluationChange * perspective;
  
  // Convert to pawns for easier thresholds
  const changeInPawns = Math.abs(adjustedChange) / 100;
  
  // Determine severity
  if (adjustedChange < -300) {
    // Very bad move (>3 pawns lost)
    return {
      type: 'error',
      message: getSevereComment(changeInPawns, justMoved, game)
    };
  } else if (adjustedChange < -200) {
    // Bad move (2-3 pawns lost)
    return {
      type: 'warning',
      message: getBadMoveComment(changeInPawns, justMoved, game)
    };
  } else if (adjustedChange < -100) {
    // Questionable move (1-2 pawns lost)
    return {
      type: 'caution',
      message: getQuestionableComment(changeInPawns, justMoved, game)
    };
  } else if (adjustedChange > 200) {
    // Good move (>2 pawns gained)
    return {
      type: 'success',
      message: getGoodMoveComment(changeInPawns, justMoved, game)
    };
  } else if (adjustedChange > 100) {
    // Decent move (1-2 pawns gained)
    return {
      type: 'info',
      message: getDecentMoveComment(justMoved, game)
    };
  }
  
  // Neutral or small change
  return null;
};

const getSevereComment = (changeInPawns, color, game) => {
  const comments = [
    `That move loses significant material! (${changeInPawns.toFixed(1)} pawns)`,
    `You left a piece hanging!`,
    `This move loses control of the center.`,
    `You're giving away too much material.`,
    `That piece is now undefended!`,
    `You're allowing a strong attack.`,
    `This move weakens your position significantly.`,
    `You're losing a piece for nothing.`
  ];
  
  // Check if there's a hanging piece
  if (hasHangingPiece(game, color)) {
    return `You left a piece hanging!`;
  }
  
  return comments[Math.floor(Math.random() * comments.length)];
};

const getBadMoveComment = (changeInPawns, color, game) => {
  const comments = [
    `That move loses material (${changeInPawns.toFixed(1)} pawns).`,
    `You're weakening your position.`,
    `This move loses control of key squares.`,
    `You're giving your opponent an advantage.`,
    `This move creates weaknesses in your position.`,
    `You're allowing your opponent to gain space.`
  ];
  
  return comments[Math.floor(Math.random() * comments.length)];
};

const getQuestionableComment = (changeInPawns, color, game) => {
  const comments = [
    `That move is questionable.`,
    `You might want to reconsider that move.`,
    `This move slightly weakens your position.`,
    `There might be better options available.`,
    `This move gives your opponent a small advantage.`
  ];
  
  return comments[Math.floor(Math.random() * comments.length)];
};

const getGoodMoveComment = (changeInPawns, color, game) => {
  const comments = [
    `Excellent move!`,
    `That's a strong move.`,
    `Good choice!`,
    `You're improving your position.`,
    `That move gains you an advantage.`
  ];
  
  return comments[Math.floor(Math.random() * comments.length)];
};

const getDecentMoveComment = (color, game) => {
  const comments = [
    `That's a solid move.`,
    `Good move.`,
    `You're maintaining a good position.`
  ];
  
  return comments[Math.floor(Math.random() * comments.length)];
};

// Simple check for hanging pieces (pieces that can be captured)
const hasHangingPiece = (game, color) => {
  // This is a simplified check - in a real implementation,
  // you'd check if any piece can be captured for free
  // For now, we'll use a heuristic based on the evaluation drop
  return false; // Simplified - could be enhanced
};
