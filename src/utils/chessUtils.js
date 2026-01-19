import { Chess } from 'chess.js';

// Convert UCI move to react-chessboard format (e.g., "e2e4" -> { from: "e2", to: "e4" })
export const uciToMove = (uciMove) => {
  if (!uciMove || uciMove.length < 4) return null;
  
  const from = uciMove.substring(0, 2);
  const to = uciMove.substring(2, 4);
  
  return { from, to };
};

// Convert react-chessboard move to UCI format (e.g., { from: "e2", to: "e4" } -> "e2e4")
export const moveToUci = (move) => {
  if (!move || !move.from || !move.to) return null;
  
  let uci = move.from + move.to;
  
  // Add promotion piece if present
  if (move.promotion) {
    uci += move.promotion.toLowerCase();
  }
  
  return uci;
};

// Convert move to square indices for arrow drawing
export const moveToSquare = (square) => {
  if (!square || square.length !== 2) return null;
  
  const file = square.charCodeAt(0) - 97; // a-h -> 0-7
  const rank = parseInt(square.charAt(1), 10) - 1; // 1-8 -> 0-7
  
  return { file, rank };
};

// Get arrow color based on move rank
export const getArrowColor = (index) => {
  const colors = ['#4ade80', '#60a5fa', '#fbbf24']; // Green, Blue, Yellow
  return colors[index] || '#94a3b8';
};
