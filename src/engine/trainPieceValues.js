import { Chess } from 'chess.js';
import ChessAI from './ChessAI.js';

// Rango de valores a probar para el alfil
const bishopValues = [300, 310, 320, 330, 340, 350];

async function playGame(ai1, ai2) {
  const game = new Chess();
  let turn = 0;
  while (!game.game_over() && turn < 100) {
    const ai = game.turn() === 'w' ? ai1 : ai2;
    const { move } = ai.getBestMove(game);
    if (!move) break;
    game.move(move);
    turn++;
  }
  if (game.in_draw() || game.in_stalemate() || game.in_threefold_repetition()) return 0.5;
  if (game.in_checkmate()) return game.turn() === 'w' ? 0 : 1; // Si es turno de blancas y mate, negras ganan
  return 0.5; // Empate por otro motivo
}

async function train() {
  let bestScore = -Infinity;
  let bestValue = 330;

  for (const value of bishopValues) {
    let score = 0;
    for (let i = 0; i < 10; i++) {
      // Blancas con valor actual, negras con valor base
      const aiWhite = new ChessAI(3);
      const aiBlack = new ChessAI(3);
      aiWhite.setDifficulty(3);
      aiBlack.setDifficulty(3);
      aiWhite.PIECE_VALUES = { ...aiWhite.PIECE_VALUES, b: value, B: -value };
      aiBlack.PIECE_VALUES = { ...aiBlack.PIECE_VALUES, b: 330, B: -330 };
      score += await playGame(aiWhite, aiBlack);

      // Ahora al revés
      const aiWhite2 = new ChessAI(3);
      const aiBlack2 = new ChessAI(3);
      aiWhite2.setDifficulty(3);
      aiBlack2.setDifficulty(3);
      aiWhite2.PIECE_VALUES = { ...aiWhite2.PIECE_VALUES, b: 330, B: -330 };
      aiBlack2.PIECE_VALUES = { ...aiBlack2.PIECE_VALUES, b: value, B: -value };
      score += 1 - await playGame(aiWhite2, aiBlack2);
    }
    console.log(`Valor alfil: ${value}, score: ${score}`);
    if (score > bestScore) {
      bestScore = score;
      bestValue = value;
    }
  }
  console.log(`Mejor valor para el alfil: ${bestValue} (score: ${bestScore})`);
}

train();