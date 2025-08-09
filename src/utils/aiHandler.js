import { ACTIONS } from '../context/GameContext';

export async function requestAIMove({ game, chessAI, dispatch, makeMove, makeEmergencyMove }) {
  try {
    dispatch({ type: ACTIONS.SET_ERROR, payload: null });

    const startTime = Date.now();
    const bestMoveObj = await Promise.race([
      new Promise((resolve, reject) => {
        try {
          const move = chessAI.getBestMove(game);
          resolve(move);
        } catch (err) {
          reject(err);
        }
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
    ]);

    if (!bestMoveObj || !bestMoveObj.move) {
      if (!makeEmergencyMove()) dispatch({ type: ACTIONS.SET_STATUS, payload: 'game_over' });
      return;
    }

    dispatch({
      type: ACTIONS.SET_ANALYSIS,
      payload: {
        move: bestMoveObj.move.san || bestMoveObj.move,
        evaluation: bestMoveObj.evaluation
      }
    });

    const thinkingTime = Date.now() - startTime;
    const remainingTime = Math.max(0, 800 - thinkingTime);

    setTimeout(() => {
      const success = makeMove(bestMoveObj.move);
      if (!success) makeEmergencyMove();

      dispatch({
        type: ACTIONS.SET_AI_STATS,
        payload: chessAI.getStats()
      });

      chessAI.clearCache();
    }, remainingTime);

  } catch (error) {
    dispatch({ type: ACTIONS.SET_ERROR, payload: error.message === 'Timeout'
      ? 'La IA tardó demasiado en responder'
      : 'Error del motor de ajedrez'
    });

    chessAI.reset();

    if (!makeEmergencyMove()) dispatch({ type: ACTIONS.SET_STATUS, payload: 'game_over' });
  }
}