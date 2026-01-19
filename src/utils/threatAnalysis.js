import { Chess } from 'chess.js';

/**
 * Find pieces that are under attack after the opponent's best move
 * @param {Chess} game - Current game state
 * @param {string} opponentBestMove - UCI format move (e.g., "e2e4")
 * @returns {Array<string>} - Array of square names that are under attack
 */
export const findAttackedPieces = (game, opponentBestMove) => {
  if (!opponentBestMove || opponentBestMove.length < 4) {
    return [];
  }

  try {
    // Create a copy of the game
    const gameCopy = new Chess(game.fen());
    
    // Extract move squares
    const from = opponentBestMove.substring(0, 2);
    const to = opponentBestMove.substring(2, 4);
    const promotion = opponentBestMove.length > 4 ? opponentBestMove[4] : null;
    
    // Make the opponent's best move
    const move = gameCopy.move({
      from,
      to,
      promotion: promotion || 'q'
    });

    if (!move) {
      return [];
    }

    // After opponent's move, it's now the current player's turn
    const currentPlayer = gameCopy.turn();
    const opponentColor = currentPlayer === 'w' ? 'b' : 'w';
    
    // Find all squares with pieces of the current player
    const attackedSquares = [];
    
    // Get all squares on the board
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = [1, 2, 3, 4, 5, 6, 7, 8];
    
    // Check all squares on the board
    for (const file of files) {
      for (const rank of ranks) {
        const square = file + rank;
        const piece = gameCopy.get(square);
        
        // If this square has a piece of the current player
        if (piece && piece.color === currentPlayer) {
          // Check if this square is attacked by the opponent
          // We need to check from opponent's perspective
          if (isSquareAttacked(gameCopy, square, opponentColor)) {
            attackedSquares.push(square);
          }
        }
      }
    }
    
    return attackedSquares;
  } catch (error) {
    console.error('Error finding attacked pieces:', error);
    return [];
  }
};

/**
 * Check if a square is attacked by a specific color
 * Since chess.js only returns moves for the current player,
 * we create a temporary game where it's the attacker's turn
 * @param {Chess} game - Game state
 * @param {string} square - Square to check (e.g., "e4")
 * @param {string} attackerColor - Color of the attacking side ('w' or 'b')
 * @returns {boolean}
 */
const isSquareAttacked = (game, square, attackerColor) => {
  try {
    // If it's already the attacker's turn, we can check directly
    if (game.turn() === attackerColor) {
      const allMoves = game.moves({ verbose: true });
      return allMoves.some(move => move.to === square);
    }
    
    // Otherwise, we need to check from the attacker's perspective
    // We'll do this by creating a game state where it's the attacker's turn
    // We can do this by making a temporary move that switches turns
    // or by manipulating the FEN
    
    // Get all squares on the board
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = [1, 2, 3, 4, 5, 6, 7, 8];
    
    // Check each square for attacker's pieces
    for (const file of files) {
      for (const rank of ranks) {
        const fromSquare = file + rank;
        const piece = game.get(fromSquare);
        
        if (piece && piece.color === attackerColor) {
          // Try to make a move from this piece to the target square
          // We'll test this by creating a game where it's the attacker's turn
          // and see if the move is legal
          
          // Create a test game
          const testGame = new Chess(game.fen());
          
          // Try to make it the attacker's turn by making a temporary move
          // that we'll undo, or by checking if the move pattern is valid
          // For simplicity, let's check if the piece can theoretically reach the square
          // and then verify the path is clear
          
          if (canPieceReachSquare(testGame, fromSquare, square, piece.type, attackerColor)) {
            return true;
          }
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking if square is attacked:', error);
    return false;
  }
};

/**
 * Check if a piece can reach a square (simplified path checking)
 * This checks basic movement patterns and path clearance
 */
const canPieceReachSquare = (game, fromSquare, toSquare, pieceType, color) => {
  const fromFile = fromSquare.charCodeAt(0) - 97;
  const fromRank = parseInt(fromSquare[1]);
  const toFile = toSquare.charCodeAt(0) - 97;
  const toRank = parseInt(toSquare[1]);
  
  const fileDiff = toFile - fromFile;
  const rankDiff = toRank - fromRank;
  const absFileDiff = Math.abs(fileDiff);
  const absRankDiff = Math.abs(rankDiff);
  
  // Check basic movement patterns
  let canReach = false;
  
  switch (pieceType) {
    case 'p': // Pawn - attacks diagonally
      canReach = absFileDiff === 1 && absRankDiff === 1 && 
                 (color === 'w' ? rankDiff === 1 : rankDiff === -1);
      break;
    case 'n': // Knight
      canReach = (absFileDiff === 2 && absRankDiff === 1) || 
                 (absFileDiff === 1 && absRankDiff === 2);
      break;
    case 'b': // Bishop - diagonal
      canReach = absFileDiff === absRankDiff && absFileDiff > 0;
      if (canReach) {
        // Check if path is clear
        canReach = isPathClear(game, fromSquare, toSquare, 'diagonal');
      }
      break;
    case 'r': // Rook - horizontal/vertical
      canReach = (absFileDiff === 0 || absRankDiff === 0) && 
                 (absFileDiff > 0 || absRankDiff > 0);
      if (canReach) {
        // Check if path is clear
        canReach = isPathClear(game, fromSquare, toSquare, 'straight');
      }
      break;
    case 'q': // Queen - any direction
      canReach = (absFileDiff === absRankDiff || absFileDiff === 0 || absRankDiff === 0) && 
                 (absFileDiff > 0 || absRankDiff > 0);
      if (canReach) {
        // Check if path is clear
        const direction = absFileDiff === absRankDiff ? 'diagonal' : 'straight';
        canReach = isPathClear(game, fromSquare, toSquare, direction);
      }
      break;
    case 'k': // King - one square any direction
      canReach = absFileDiff <= 1 && absRankDiff <= 1 && 
                 (absFileDiff > 0 || absRankDiff > 0);
      break;
    default:
      return false;
  }
  
  return canReach;
};

/**
 * Check if the path between two squares is clear (for sliding pieces)
 */
const isPathClear = (game, fromSquare, toSquare, direction) => {
  const fromFile = fromSquare.charCodeAt(0) - 97;
  const fromRank = parseInt(fromSquare[1]);
  const toFile = toSquare.charCodeAt(0) - 97;
  const toRank = parseInt(toSquare[1]);
  
  const fileStep = toFile > fromFile ? 1 : toFile < fromFile ? -1 : 0;
  const rankStep = toRank > fromRank ? 1 : toRank < fromRank ? -1 : 0;
  
  let currentFile = fromFile + fileStep;
  let currentRank = fromRank + rankStep;
  
  // Check each square along the path (excluding start and end)
  while (currentFile !== toFile || currentRank !== toRank) {
    const square = String.fromCharCode(97 + currentFile) + currentRank;
    if (game.get(square)) {
      // Path is blocked
      return false;
    }
    currentFile += fileStep;
    currentRank += rankStep;
  }
  
  return true;
};
