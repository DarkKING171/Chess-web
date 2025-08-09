import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { usePromotion } from "./hooks/usePromotion.js";
import { PromotionModal } from "./components/PromotionModal.js";
import { GAME_STATUS } from "./constants.js";
import { useGameState, useGameDispatch, ACTIONS } from './context/GameContext.js';
import GameInfo from "./components/GameInfo/GameInfo.jsx";
import ChessAI from "./engine/ChessAI.js";

// Constantes de configuración mejoradas
const AI_CONFIG = {
  MOVE_DELAY: 300,
  THINKING_TIME: 800,
  DEFAULT_DIFFICULTY: 3,
  ANIMATION_DURATION: 300
};

const SOUND_EFFECTS = {
  MOVE: 'move',
  CAPTURE: 'capture',
  CHECK: 'check',
  CHECKMATE: 'checkmate',
  CASTLE: 'castle',
  PROMOTION: 'promotion'
};

// Función auxiliar para evaluar valor de piezas
const getPieceValue = (piece) => {
  const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  return values[piece?.toLowerCase()] || 0;
};

// Función para reproducir sonidos (simulado)
const playSound = (soundType) => {
  console.log(`🔊 Reproduciendo sonido: ${soundType}`);
  // Aquí podrías integrar Web Audio API o una librería de sonidos
};

// Función para generar partículas de celebración
const createParticles = (container, color = '#ffff00') => {
  for (let i = 0; i < 20; i++) {
    const particle = document.createElement('div');
    particle.style.cssText = `
      position: absolute;
      width: 8px;
      height: 8px;
      background: ${color};
      border-radius: 50%;
      pointer-events: none;
      animation: particle-explosion 2s ease-out forwards;
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      z-index: 1000;
    `;
    container.appendChild(particle);
    setTimeout(() => particle.remove(), 2000);
  }
};

function App() {
  const { aiStats, analysis: aiAnalysis } = useGameState();
  const dispatch = useGameDispatch();
  const [game, setGame] = useState(new Chess());
  const { status: gameStatus } = useGameState();
  const [moveHistory, setMoveHistory] = useState([]);
  const [capturedPieces, setCapturedPieces] = useState({ white: [], black: [] });
  const [difficulty, setDifficulty] = useState(AI_CONFIG.DEFAULT_DIFFICULTY);
  const [error, setError] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [highlightedSquares, setHighlightedSquares] = useState({});
  const [moveArrows, setMoveArrows] = useState([]);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [gameStats, setGameStats] = useState({
    totalGames: 0,
    wins: 0,
    losses: 0,
    draws: 0
  });
  const [theme, setTheme] = useState('dark');
  const [showNotation, setShowNotation] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [hintSquares, setHintSquares] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [playerColor, setPlayerColor] = useState('white');
  const [timeControl, setTimeControl] = useState({ enabled: false, white: 600, black: 600 });
  const [timers, setTimers] = useState({ white: 600, black: 600 });
  const [gameStartTime, setGameStartTime] = useState(null);
  const [pendingMove, setPendingMove] = useState(null);
  const [promotionSquare, setPromotionSquare] = useState(null);
  
  const gameRef = useRef(new Chess());
  const chessAI = useRef(new ChessAI(AI_CONFIG.DEFAULT_DIFFICULTY));
  const timerRef = useRef(null);
  const boardRef = useRef(null);

  // Función para mostrar hints de movimientos legales
  const showLegalMoves = useCallback((square) => {
    if (!showHints || game.turn() !== 'w') return;
    
    const moves = game.moves({ square, verbose: true });
    const hints = moves.reduce((acc, move) => {
      acc[move.to] = {
        background: move.captured ? 
          'radial-gradient(circle, rgba(255,0,0,0.4) 20%, transparent 20%)' :
          'radial-gradient(circle, rgba(0,255,0,0.4) 20%, transparent 20%)',
        borderRadius: '50%'
      };
      return acc;
    }, {});
    
    setHintSquares(hints);
  }, [game, showHints]);

  // Función para limpiar hints
  const clearHints = useCallback(() => {
    setHintSquares({});
  }, []);

  // Timer para partidas cronometradas
  useEffect(() => {
    if (!timeControl.enabled || gameStatus !== GAME_STATUS.PLAYING) return;

    timerRef.current = setInterval(() => {
      setTimers(prev => {
        const newTimers = { ...prev };
        const currentPlayer = game.turn() === 'w' ? 'white' : 'black';
        
        if (newTimers[currentPlayer] > 0) {
          newTimers[currentPlayer]--;
        } else {
          // Tiempo agotado
          dispatch({
  type: ACTIONS.SET_STATUS,
  payload: GAME_STATUS.GAME_OVER
});
          dispatch({
  type: ACTIONS.SET_ERROR,
  payload: `¡Tiempo agotado! ${currentPlayer === 'white' ? 'Negras' : 'Blancas'} ganan`
});
          clearInterval(timerRef.current);
        }
        
        return newTimers;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [game, timeControl.enabled, gameStatus]);

  // Función mejorada para movimiento de emergencia
  const makeEmergencyMove = useCallback(() => {
    const currentGame = new Chess(gameRef.current.fen());
    const legalMoves = currentGame.moves({ verbose: true });

    if (legalMoves.length === 0) {
      console.warn("⛔ No hay movimientos legales disponibles");
      dispatch({
  type: ACTIONS.SET_STATUS,
  payload: GAME_STATUS.GAME_OVER});
      return false;
    }

    const prioritizeMoves = (moves) => {
      const mates = moves.filter(m => m.san.includes('#'));
      const checks = moves.filter(m => m.san.includes('+'));
      const captures = moves.filter(m => m.captured);
      const castling = moves.filter(m => m.san.includes('O'));
      const development = moves.filter(m => 
        ['N', 'B'].includes(m.piece) && 
        !['a', 'h'].includes(m.to[0]) &&
        !['1', '8'].includes(m.to[1])
      );

      return [
        ...mates,
        ...captures.sort((a, b) => getPieceValue(b.captured) - getPieceValue(a.captured)),
        ...checks,
        ...castling,
        ...development,
        ...moves
      ][0];
    };

    const emergencyMove = prioritizeMoves(legalMoves);
    
    const moveObj = {
      from: emergencyMove.from,
      to: emergencyMove.to
    };
    
    if (emergencyMove.promotion) {
  moveObj.promotion = emergencyMove.promotion || 'q';
}


    return makeMove(moveObj);
  }, []);

  // Función mejorada para mover piezas
  const makeMove = useCallback((move, playSoundEnabled = true) => {
  try {
    // Protección: si no hay promotion y es un peón que llega a la última fila,
    // interceptamos y abrimos el modal de promoción en lugar de intentar el move inválido.
    const pieceAtFrom = gameRef.current.get(move.from);
    if (pieceAtFrom && pieceAtFrom.type === 'p') {
      const finalRank = pieceAtFrom.color === 'w' ? '8' : '1';
      if (move.to && move.to[1] === finalRank && !move.promotion) {
        // Guardamos la jugada pendiente y forzamos que el jugador elija la pieza
        setPendingMove({ ...move });
        setPromotionSquare(move.to);
        dispatch({ type: ACTIONS.SET_STATUS, payload: GAME_STATUS.PROMOTION });
        console.log('🔔 makeMove interceptó promoción faltante, mostrando modal', move);
        return true;
      }
    }

    const newGame = new Chess(gameRef.current.fen());
    let result;
    try {
      console.log('🔄 makeMove va a ejecutar con:', move);
      result = newGame.move(move);
    } catch (error) {
      console.error("Error en movimiento:", error);
      return false;
    }

    if (result === null) {
      console.warn("❌ Movimiento inválido:", move);
      return false;
    }

    // ... resto del makeMove (sin cambios) ...


      // Reproducir sonido apropiado
      if (playSoundEnabled && soundEnabled) {
        if (result.san.includes('#')) {
          playSound(SOUND_EFFECTS.CHECKMATE);
        } else if (result.san.includes('+')) {
          playSound(SOUND_EFFECTS.CHECK);
        } else if (result.captured) {
          playSound(SOUND_EFFECTS.CAPTURE);
        } else if (result.san.includes('O')) {
          playSound(SOUND_EFFECTS.CASTLE);
        } else if (result.promotion) {
          playSound(SOUND_EFFECTS.PROMOTION);
        } else {
          playSound(SOUND_EFFECTS.MOVE);
        }
      }

      // Actualizar historial con información detallada
      const moveEntry = {
        move: result.san,
        fen: newGame.fen(),
        captured: result.captured,
        timestamp: Date.now(),
        from: result.from,
        to: result.to,
        piece: result.piece,
        color: result.color,
        evaluation: null // Se puede agregar evaluación del motor
      };

      setMoveHistory(prev => [...prev, moveEntry]);
      setLastMove({ from: result.from, to: result.to });

      // Actualizar piezas capturadas
      if (result.captured) {
        setCapturedPieces(prev => ({
          ...prev,
          [result.color === 'w' ? 'white' : 'black']: [
            ...prev[result.color === 'w' ? 'white' : 'black'],
            result.captured
          ]
        }));
      }

      // Resaltar último movimiento
      setHighlightedSquares({
        [result.from]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' },
        [result.to]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' }
      });

      setGame(newGame);
      gameRef.current = newGame;

      // Verificar si el juego terminó
      if (newGame.isGameOver()) {
       dispatch({
  type: ACTIONS.SET_STATUS,
  payload: GAME_STATUS.GAME_OVER });


        updateGameStats(newGame);
        
        // Efecto de celebración si el jugador gana
        if (newGame.isCheckmate() && newGame.turn() === 'b') {
          setTimeout(() => {
            if (boardRef.current) {
              createParticles(boardRef.current, '#4ecdc4');
            }
          }, 500);
        }
        
        return true;
      }

      // Lógica de turnos mejorada
      const isPlayerTurn = (playerColor === 'white' && newGame.turn() === 'w') ||
                          (playerColor === 'black' && newGame.turn() === 'b');
      
      if (!isPlayerTurn) {
        dispatch({ type: ACTIONS.SET_STATUS, payload: GAME_STATUS.THINKING });
        setTimeout(() => {
          requestAIMove(newGame);
        }, AI_CONFIG.MOVE_DELAY);
      } else {
        dispatch({ type: ACTIONS.SET_STATUS, payload: GAME_STATUS.PLAYING });
      }

      return true;
    } catch (error) {
      console.error("Error al hacer movimiento:", error);
      dispatch({
  type: ACTIONS.SET_ERROR,
  payload: "Error al procesar el movimiento"});

      return false;
    }
  }, [soundEnabled, playerColor]);

  // Función mejorada para solicitar movimiento de IA
  const requestAIMove = useCallback(async (currentGame) => {
  dispatch({ type: ACTIONS.SET_ERROR, payload: null });
  dispatch({ type: ACTIONS.SET_STATUS, payload: GAME_STATUS.THINKING });

  try {
    const start = Date.now();
    const bestMoveObj = await Promise.race([
      new Promise((res, rej) => {
        try {
          const mv = chessAI.current.getBestMove(currentGame);
          res(mv);
        } catch (e) {
          rej(e);
        }
      }),
      new Promise((_, rej) =>
        setTimeout(() => rej(new Error('Timeout')), 15000)
      )
    ]);

    if (!bestMoveObj || !bestMoveObj.move) {
      if (!makeEmergencyMove()) {
        dispatch({ type: ACTIONS.SET_STATUS, payload: GAME_STATUS.GAME_OVER });
      }
      return;
    }

    // 1) Guardamos análisis en contexto
    dispatch({
      type: ACTIONS.SET_ANALYSIS,
      payload: {
        move: bestMoveObj.move.san || bestMoveObj.move,
        evaluation: bestMoveObj.evaluation
      }
    });

    // 2) Esperamos un rato para simular THINKING_TIME
    const thinkTime = Date.now() - start;
    const delay = Math.max(0, AI_CONFIG.THINKING_TIME - thinkTime);
    setTimeout(() => {
      // Ejecutamos el movimiento
      const success = makeMove(bestMoveObj.move);
      if (!success) makeEmergencyMove();

      // 3) Guardamos estadísticas en contexto
      dispatch({
        type: ACTIONS.SET_AI_STATS,
        payload: chessAI.current.getStats()
      });

      // 4) Limpiamos cache del motor
      chessAI.current.clearCache();

      // 5) Volvemos a estado PLAYING
      dispatch({ type: ACTIONS.SET_STATUS, payload: GAME_STATUS.PLAYING });
    }, delay);

  } catch (err) {
    // Error o Timeout
    const msg = err.message === 'Timeout'
      ? 'La IA tardó demasiado en responder'
      : 'Error del motor de ajedrez';
    dispatch({ type: ACTIONS.SET_ERROR, payload: msg });
    chessAI.current.reset();
    if (!makeEmergencyMove()) {
      dispatch({ type: ACTIONS.SET_STATUS, payload: GAME_STATUS.GAME_OVER });
    }
  }
}, [dispatch, makeEmergencyMove, makeMove]);

  // Función para actualizar estadísticas del juego
  const updateGameStats = useCallback((endGame) => {
    setGameStats(prev => {
      const newStats = { ...prev, totalGames: prev.totalGames + 1 };
      
      if (endGame.isCheckmate()) {
        const winner = endGame.turn() === 'w' ? 'black' : 'white';
        if (winner === playerColor) {
          newStats.wins++;
        } else {
          newStats.losses++;
        }
      } else {
        newStats.draws++;
      }
      
      return newStats;
    });
  }, [playerColor]);

  // Función para manejar promoción de peones
  const handlePromotion = useCallback((piece) => {
  if (!pendingMove) return;
  const moveObj = { ...pendingMove, promotion: piece };
  setPromotionSquare(null);
  setPendingMove(null);
  dispatch({ type: ACTIONS.SET_STATUS, payload: GAME_STATUS.PLAYING });
  console.log('👑 handlePromotion va a ejecutar:', moveObj);
  makeMove(moveObj);
}, [pendingMove, makeMove, dispatch]);

  // Función para manejar el “drop” de piezas, detectando promoción
const onDrop = useCallback((from, to, pieceDropped) => {
  // Si estamos en PROMOTION, no permitir drops
  if (gameStatus === GAME_STATUS.PROMOTION) return false;

  // Solo turno del jugador
  const isPlayerTurn =
    (playerColor === 'white' && game.turn() === 'w') ||
    (playerColor === 'black' && game.turn() === 'b');
  if (!isPlayerTurn || gameStatus !== GAME_STATUS.PLAYING) return false;

  // Detectar que es un peón y llega a la última fila
  const isPawn = pieceDropped.toLowerCase().endsWith('p');
  const promotionRank = pieceDropped.startsWith('w') ? '8' : '1';

  if (isPawn && to[1] === promotionRank) {
    console.log('💥 onDrop → PROMOTION branch', { from, to, pieceDropped });
    setPromotionSquare(to);
    setPendingMove({ from, to });
    dispatch({ type: ACTIONS.SET_STATUS, payload: GAME_STATUS.PROMOTION });
    return true;      // solo efecto visual
  }

  clearHints();
  return makeMove({ from, to });
}, [gameStatus, game, playerColor, makeMove, dispatch, clearHints]);

  // Función para obtener movimientos posibles (para hints)
  const onSquareClick = useCallback((square) => {
    if (showHints && game.turn() === 'w') {
      showLegalMoves(square);
    }
  }, [showHints, game, showLegalMoves]);

  // Función para reiniciar juego
  const restartGame = useCallback(() => {
    const newGame = new Chess();
    setGame(newGame);
    gameRef.current = newGame;
  dispatch({ type: ACTIONS.SET_STATUS, payload: GAME_STATUS.PLAYING });
    setMoveHistory([]);
    setCapturedPieces({ white: [], black: [] });
    dispatch({ type: ACTIONS.SET_ERROR, payload: null });
    dispatch({ type: ACTIONS.SET_AI_STATS, payload: null });
    dispatch({ type: ACTIONS.SET_ANALYSIS, payload: null });
    dispatch({ type: ACTIONS.SET_PROMOTION, payload: null });
    // etc.
    setHighlightedSquares({});
    setMoveArrows([]);
    setLastMove(null);
    setHintSquares([]);
    setGameStartTime(Date.now());
    
    // Reiniciar timers
    setTimers({
      white: timeControl.enabled ? timeControl.white : 600,
      black: timeControl.enabled ? timeControl.black : 600
    });
    
    chessAI.current.clearCache();
    console.log("🔄 Juego reiniciado");
  }, [timeControl]);

  // Función para deshacer movimiento
  const undoMove = useCallback(() => {
    if (moveHistory.length < 2 || gameStatus !== GAME_STATUS.PLAYING) return;
    
    const targetMoves = Math.max(0, moveHistory.length - 2);
    const targetState = moveHistory[targetMoves - 1];
    
    if (targetState) {
      const newGame = new Chess(targetState.fen);
      setGame(newGame);
      gameRef.current = newGame;
      setMoveHistory(prev => prev.slice(0, targetMoves));
      
      // Recalcular piezas capturadas
      const newCaptured = { white: [], black: [] };
      moveHistory.slice(0, targetMoves).forEach(entry => {
        if (entry.captured) {
          newCaptured[entry.color === 'w' ? 'white' : 'black'].push(entry.captured);
        }
      });
      setCapturedPieces(newCaptured);
      
      // Actualizar highlights
      if (targetMoves > 0) {
        const lastMove = moveHistory[targetMoves - 1];
        setHighlightedSquares({
          [lastMove.from]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' },
          [lastMove.to]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' }
        });
      } else {
        setHighlightedSquares({});
      }
    } else {
      restartGame();
    }
  }, [moveHistory, gameStatus, restartGame]);

  // Función para cambiar color del jugador
  const switchPlayerColor = useCallback(() => {
    const newColor = playerColor === 'white' ? 'black' : 'white';
    setPlayerColor(newColor);
    restartGame();
  }, [playerColor, restartGame]);

  // Función para formatear tiempo
  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Información del estado del juego
  const gameInfo = useMemo(() => {
    if (game.isCheckmate()) {
      const winner = game.turn() === 'w' ? 'Negras (IA)' : 'Blancas (Tú)';
      return {
        status: 'Jaque Mate',
        winner: winner,
        icon: '👑',
        color: winner.includes('Tú') ? '#4ecdc4' : '#ff6b6b'
      };
    }
    if (game.isStalemate()) {
      return { status: 'Ahogado', winner: 'Empate', icon: '🤝', color: '#ffd700' };
    }
    if (game.isDraw()) {
      return { status: 'Empate', winner: 'Empate', icon: '🤝', color: '#ffd700' };
    }
    if (game.inCheck()) {
      return { 
        status: 'Jaque', 
        winner: game.turn() === 'w' ? 'Blancas en jaque' : 'Negras en jaque',
        icon: '⚠️',
        color: '#ff9500'
      };
    }
    
    return {
      status: gameStatus === GAME_STATUS.THINKING ? 'IA pensando...' : 
              gameStatus === GAME_STATUS.PROMOTION ? 'Promoción de peón' : 'En juego',
      winner: game.turn() === 'w' ? 'Turno de Blancas' : 'Turno de Negras',
      icon: gameStatus === GAME_STATUS.THINKING ? '🤔' : 
            gameStatus === GAME_STATUS.PROMOTION ? '👑' : '♟️',
      color: '#4ecdc4'
    };
  }, [game, gameStatus]);

  const difficultyNames = {
    1: 'Principiante',
    2: 'Fácil', 
    3: 'Normal',
    4: 'Difícil',
    5: 'Experto'
  };

  const promotionPieces = [
    { piece: 'q', symbol: '♕', name: 'Dama' },
    { piece: 'r', symbol: '♖', name: 'Torre' },
    { piece: 'b', symbol: '♗', name: 'Alfil' },
    { piece: 'n', symbol: '♘', name: 'Caballo' }
  ];

  // Configuración de tema
  const themeColors = {
    dark: {
      bg: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #0f0f0f 100%)',
      card: '#1a1a1a',
      border: '#333',
      text: '#ffffff',
      accent: '#4ecdc4'
    },
    light: {
      bg: 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 50%, #f5f5f5 100%)',
      card: '#ffffff',
      border: '#ddd',
      text: '#333333',
      accent: '#2196f3'
    }
  };

  const currentTheme = themeColors[theme];

  useEffect(() => {
    chessAI.current.depth = difficulty;
  }, [difficulty]);

  return (
    <div style={{
      padding: "2rem",
      backgroundColor: "#0f0f0f",
      minHeight: "100vh",
      background: currentTheme.bg,
      color: currentTheme.text,
      transition: "all 0.3s ease"
    }}>
      {/* Encabezado mejorado */}
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <h1 style={{
          fontSize: "3rem",
          fontWeight: "bold",
          background: "linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1)",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          color: "transparent",
          margin: "0",
          textShadow: "0 0 30px rgba(255, 255, 255, 0.1)",
          animation: "glow 2s ease-in-out infinite alternate"
        }}>
          ♟️ Ajedrez Maestro vs IA
        </h1>
        <p style={{
          color: "#888",
          fontSize: "1.1rem",
          marginTop: "0.5rem"
        }}>
          Desafía a tu motor de ajedrez con funciones avanzadas
        </p>
        
        {/* Estadísticas del jugador */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: "1rem",
          marginTop: "1rem",
          flexWrap: "wrap"
        }}>
          <div style={{
            padding: "0.5rem 1rem",
            backgroundColor: currentTheme.card,
            border: `1px solid ${currentTheme.border}`,
            borderRadius: "10px",
            fontSize: "0.9rem"
          }}>
            🏆 Victorias: {gameStats.wins}
          </div>
          <div style={{
            padding: "0.5rem 1rem",
            backgroundColor: currentTheme.card,
            border: `1px solid ${currentTheme.border}`,
            borderRadius: "10px",
            fontSize: "0.9rem"
          }}>
            💔 Derrotas: {gameStats.losses}
          </div>
          <div style={{
            padding: "0.5rem 1rem",
            backgroundColor: currentTheme.card,
            border: `1px solid ${currentTheme.border}`,
            borderRadius: "10px",
            fontSize: "0.9rem"
          }}>
            🤝 Empates: {gameStats.draws}
          </div>
        </div>
      </div>

      {/* Mensaje de error mejorado */}
      {error && (
        <div style={{
          backgroundColor: "#ff6b6b",
          color: "white",
          padding: "1rem",
          borderRadius: "10px",
          marginBottom: "1rem",
          textAlign: "center",
          boxShadow: "0 5px 15px rgba(255, 107, 107, 0.3)",
          animation: "shake 0.5s ease-in-out"
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Timers (si están habilitados) */}
      {timeControl.enabled && (
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: "2rem",
          marginBottom: "1rem"
        }}>
          <div style={{
            padding: "1rem",
            backgroundColor: currentTheme.card,
            border: `2px solid ${game.turn() === 'w' ? currentTheme.accent : currentTheme.border}`,
            borderRadius: "10px",
            textAlign: "center",
            boxShadow: game.turn() === 'w' ? `0 0 20px ${currentTheme.accent}` : 'none'
          }}>
            <div style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>⚪ Blancas</div>
            <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
              {formatTime(timers.white)}
            </div>
          </div>
          <div style={{
            padding: "1rem",
            backgroundColor: currentTheme.card,
            border: `2px solid ${game.turn() === 'b' ? currentTheme.accent : currentTheme.border}`,
            borderRadius: "10px",
            textAlign: "center",
            boxShadow: game.turn() === 'b' ? `0 0 20px ${currentTheme.accent}` : 'none'
          }}>
            <div style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>⚫ Negras</div>
            <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
              {formatTime(timers.black)}
            </div>
          </div>
        </div>
      )}

      {/* Contenedor principal */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: "2rem",
        flexWrap: "wrap",
        alignItems: "flex-start"
      }}>
        {/* Panel lateral de información */}
        <div style={{ order: window.innerWidth <= 768 ? 2 : 1 }}>
          <GameInfo 
            game={game} 
            gameStatus={gameInfo.status}
            thinking={gameStatus === GAME_STATUS.THINKING}
            difficulty={difficultyNames[difficulty]}
          />
          
          {/* Piezas capturadas */}
          <div style={{
            padding: "1rem",
            backgroundColor: currentTheme.card,
            border: `1px solid ${currentTheme.border}`,
            borderRadius: "15px",
            marginTop: "1rem",
            maxWidth: "400px"
          }}>
            <h4 style={{ color: currentTheme.accent, margin: "0 0 0.5rem 0" }}>
              🏴‍☠️ Piezas Capturadas
            </h4>
            <div style={{ marginBottom: "0.5rem" }}>
              <strong>Por Blancas:</strong> 
              {capturedPieces.white.map((piece, i) => (
                <span key={i} style={{ fontSize: "1.2rem", margin: "0 2px" }}>
                  {piece === 'p' ? '♟' : piece === 'r' ? '♜' : 
                   piece === 'n' ? '♞' : piece === 'b' ? '♝' : 
                   piece === 'q' ? '♛' : '♚'}
                </span>
              ))}
            </div>
            <div>
              <strong>Por Negras:</strong> 
              {capturedPieces.black.map((piece, i) => (
                <span key={i} style={{ fontSize: "1.2rem", margin: "0 2px" }}>
                  {piece === 'p' ? '♙' : piece === 'r' ? '♖' : 
                   piece === 'n' ? '♘' : piece === 'b' ? '♗' : 
                   piece === 'q' ? '♕' : '♔'}
                </span>
              ))}
            </div>
          </div>
          
          {/* Estadísticas de la IA */}
          {aiStats && (
            <div style={{
              padding: "1rem",
              backgroundColor: currentTheme.card,
              border: `1px solid ${currentTheme.border}`,
              borderRadius: "15px",
              marginTop: "1rem",
              maxWidth: "400px"
            }}>
              <h4 style={{ color: currentTheme.accent, margin: "0 0 0.5rem 0" }}>
                🧠 Estadísticas IA
              </h4>
              <div style={{ fontSize: "0.9rem", color: "#ccc" }}>
                <div>⚡ Nodos: {aiStats.nodesEvaluated?.toLocaleString()}</div>
                <div>🎯 Profundidad: {aiStats.depth}</div>
                <div>💾 Caché: {aiStats.cacheSize} posiciones</div>
                <div>⏱️ Tiempo: {aiStats.timeElapsed}ms</div>
              </div>
            </div>
          )}

          {/* Historial de movimientos */}
          {showNotation && (
            <div style={{
              padding: "1rem",
              backgroundColor: currentTheme.card,
              border: `1px solid ${currentTheme.border}`,
              borderRadius: "15px",
              marginTop: "1rem",
              maxWidth: "400px",
              maxHeight: "300px",
              overflowY: "auto"
            }}>
              <h4 style={{ color: currentTheme.accent, margin: "0 0 0.5rem 0" }}>
                📝 Notación del Juego
              </h4>
              <div style={{ fontSize: "0.9rem", fontFamily: "monospace" }}>
                {moveHistory.map((move, index) => (
                  <div key={index} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "2px 0",
                    backgroundColor: index % 4 < 2 ? 'rgba(255,255,255,0.05)' : 'transparent'
                  }}>
                    <span style={{ width: "30px" }}>
                      {Math.floor(index / 2) + 1}{index % 2 === 0 ? '.' : '...'}
                    </span>
                    <span style={{ flex: 1 }}>{move.move}</span>
                    <span style={{ fontSize: "0.8rem", color: "#666" }}>
                      {new Date(move.timestamp).toLocaleTimeString().slice(0, 5)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {aiAnalysis && (
  <div style={{
    margin: "1rem 0",
    padding: "1rem",
    backgroundColor: currentTheme.card,
    border: `1px solid ${currentTheme.border}`,
    borderRadius: "12px",
    color: currentTheme.text,
    maxWidth: "400px"
  }}>
    <h4 style={{ color: currentTheme.accent, margin: "0 0 0.5rem 0" }}>
      📊 Análisis de la IA
    </h4>
    <div>
      <strong>Mejor jugada sugerida:</strong> <span style={{ color: "#4ecdc4" }}>{aiAnalysis.move}</span>
    </div>
    <div>
      <strong>Evaluación:</strong> <span style={{ color: aiAnalysis.evaluation > 0 ? "#4ecdc4" : "#ff6b6b" }}>
        {aiAnalysis.evaluation > 9000 ? "# Mate" : aiAnalysis.evaluation}
      </span>
    </div>
  </div>
)}

        </div>

        {/* Tablero de ajedrez */}
        <div style={{ order: window.innerWidth <= 768 ? 1 : 2 }}>
          <div ref={boardRef} style={{
            padding: "1.5rem",
            backgroundColor: currentTheme.card,
            borderRadius: "20px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5), 0 0 50px rgba(255, 255, 255, 0.05)",
            border: `1px solid ${currentTheme.border}`,
            position: "relative"
          }}>
            <Chessboard
              position={game.fen()}
              onPieceDrop={onDrop}
              onSquareClick={onSquareClick}
              onSquareRightClick={clearHints}
              boardWidth={Math.min(500, window.innerWidth - 100)}
              customBoardStyle={{
                borderRadius: '10px',
                boxShadow: '0 5px 15px rgba(0, 0, 0, 0.8)'
              }}
              customSquareStyles={{
                ...highlightedSquares,
                ...hintSquares,
                ...(lastMove && {
                  [lastMove.from]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' },
                  [lastMove.to]: { backgroundColor: 'rgba(255, 255, 0, 0.6)' }
                })
              }}
              arePiecesDraggable={
                gameStatus === GAME_STATUS.PLAYING && 
                ((playerColor === 'white' && game.turn() === 'w') ||
                 (playerColor === 'black' && game.turn() === 'b'))
              }
              boardOrientation={autoRotate ? 
                (game.turn() === 'w' ? 'white' : 'black') : 
                playerColor
              }
            />
            
            {/* Overlay de estado de juego */}
            {gameStatus === GAME_STATUS.THINKING && (
              <div style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                color: "white",
                padding: "1rem 2rem",
                borderRadius: "10px",
                fontSize: "1.2rem",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                zIndex: 1000
              }}>
                <div className="thinking-animation">🤔</div>
                IA pensando...
              </div>
            )}
          </div>
          
          {/* Panel de información del estado */}
          <div style={{
            display: "flex",
            justifyContent: "center",
            margin: "1.5rem 0"
          }}>
            <div style={{
              padding: "1rem 2rem",
              backgroundColor: currentTheme.card,
              border: `1px solid ${currentTheme.border}`,
              borderRadius: "15px",
              textAlign: "center",
              boxShadow: "0 5px 15px rgba(0, 0, 0, 0.3)"
            }}>
              <div style={{
                fontSize: "1.2rem",
                marginBottom: "0.5rem",
                color: gameInfo.color
              }}>
                {gameInfo.icon} {gameInfo.status}
              </div>
              <div style={{
                color: "#ccc",
                fontSize: "0.9rem"
              }}>
                {gameInfo.winner}
              </div>
              {gameStatus === GAME_STATUS.PLAYING && (
                <div style={{
                  fontSize: "0.8rem",
                  color: "#666",
                  marginTop: "0.5rem"
                }}>
                  Juegas como: {playerColor === 'white' ? '⚪ Blancas' : '⚫ Negras'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de promoción */}
      {gameStatus === GAME_STATUS.PROMOTION && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: currentTheme.card,
            padding: "2rem",
            borderRadius: "20px",
            textAlign: "center",
            border: `2px solid ${currentTheme.accent}`,
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.7)"
          }}>
            <h3 style={{
              color: currentTheme.accent,
              marginBottom: "1.5rem",
              fontSize: "1.5rem"
            }}>
              👑 ¡Promoción de Peón!
            </h3>
            <p style={{
              color: "#ccc",
              marginBottom: "1.5rem"
            }}>
              Elige la pieza para promocionar:
            </p>
            <div style={{
              display: "flex",
              gap: "1rem",
              justifyContent: "center",
              flexWrap: "wrap"
            }}>
              {promotionPieces.map(({ piece, symbol, name }) => (
                <button
                  key={piece}
                  onClick={() => handlePromotion(piece)}
                  style={{
                    padding: "1rem",
                    fontSize: "3rem",
                    backgroundColor: currentTheme.card,
                    border: `2px solid ${currentTheme.border}`,
                    borderRadius: "10px",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    color: currentTheme.text,
                    minWidth: "80px"
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = currentTheme.accent;
                    e.target.style.transform = "scale(1.1)";
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = currentTheme.card;
                    e.target.style.transform = "scale(1)";
                  }}
                >
                  <div>{symbol}</div>
                  <div style={{ fontSize: "0.7rem", marginTop: "0.5rem" }}>
                    {name}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Controles principales */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: "1rem",
        flexWrap: "wrap",
        marginTop: "2rem"
      }}>
        <button
          onClick={restartGame}
          style={{
            padding: "12px 24px",
            fontSize: "16px",
            fontWeight: "600",
            backgroundColor: currentTheme.card,
            color: currentTheme.text,
            border: `2px solid ${currentTheme.border}`,
            borderRadius: "12px",
            cursor: "pointer",
            transition: "all 0.3s ease",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)"
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = currentTheme.accent;
            e.target.style.transform = "translateY(-2px)";
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = currentTheme.card;
            e.target.style.transform = "translateY(0)";
          }}
        >
          🔁 Reiniciar
        </button>

        <button
          onClick={undoMove}
          disabled={moveHistory.length < 2 || gameStatus !== GAME_STATUS.PLAYING}
          style={{
            padding: "12px 24px",
            fontSize: "16px",
            fontWeight: "600",
            backgroundColor: moveHistory.length >= 2 && gameStatus === GAME_STATUS.PLAYING ? currentTheme.card : "#1a1a1a",
            color: moveHistory.length >= 2 && gameStatus === GAME_STATUS.PLAYING ? currentTheme.text : "#666",
            border: `2px solid ${currentTheme.border}`,
            borderRadius: "12px",
            cursor: moveHistory.length >= 2 && gameStatus === GAME_STATUS.PLAYING ? "pointer" : "not-allowed",
            transition: "all 0.3s ease",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)"
          }}
        >
          ↩️ Deshacer
        </button>

        <button
          onClick={switchPlayerColor}
          disabled={gameStatus === GAME_STATUS.THINKING}
          style={{
            padding: "12px 24px",
            fontSize: "16px",
            fontWeight: "600",
            backgroundColor: currentTheme.card,
            color: currentTheme.text,
            border: `2px solid ${currentTheme.border}`,
            borderRadius: "12px",
            cursor: "pointer",
            transition: "all 0.3s ease",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)"
          }}
        >
          🔄 Cambiar Color
        </button>

        {/* Selector de dificultad */}
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(parseInt(e.target.value))}
          disabled={gameStatus === GAME_STATUS.THINKING}
          style={{
            padding: "12px 20px",
            fontSize: "16px",
            backgroundColor: currentTheme.card,
            color: currentTheme.text,
            border: `2px solid ${currentTheme.border}`,
            borderRadius: "12px",
            cursor: "pointer",
            transition: "all 0.3s ease"
          }}
        >
          {Object.entries(difficultyNames).map(([level, name]) => (
            <option key={level} value={level}>{name}</option>
          ))}
        </select>
      </div>

      {/* Controles adicionales */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: "1rem",
        flexWrap: "wrap",
        marginTop: "1rem"
      }}>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          style={{
            padding: "10px 20px",
            fontSize: "14px",
            backgroundColor: soundEnabled ? currentTheme.accent : currentTheme.card,
            color: soundEnabled ? "white" : currentTheme.text,
            border: `2px solid ${currentTheme.border}`,
            borderRadius: "10px",
            cursor: "pointer",
            transition: "all 0.3s ease"
          }}
        >
          {soundEnabled ? "🔊" : "🔇"} Sonido
        </button>

        <button
          onClick={() => setShowHints(!showHints)}
          style={{
            padding: "10px 20px",
            fontSize: "14px",
            backgroundColor: showHints ? currentTheme.accent : currentTheme.card,
            color: showHints ? "white" : currentTheme.text,
            border: `2px solid ${currentTheme.border}`,
            borderRadius: "10px",
            cursor: "pointer",
            transition: "all 0.3s ease"
          }}
        >
          💡 Ayudas
        </button>

        <button
          onClick={() => setShowNotation(!showNotation)}
          style={{
            padding: "10px 20px",
            fontSize: "14px",
            backgroundColor: showNotation ? currentTheme.accent : currentTheme.card,
            color: showNotation ? "white" : currentTheme.text,
            border: `2px solid ${currentTheme.border}`,
            borderRadius: "10px",
            cursor: "pointer",
            transition: "all 0.3s ease"
          }}
        >
          📝 Notación
        </button>

        <button
          onClick={() => setAutoRotate(!autoRotate)}
          style={{
            padding: "10px 20px",
            fontSize: "14px",
            backgroundColor: autoRotate ? currentTheme.accent : currentTheme.card,
            color: autoRotate ? "white" : currentTheme.text,
            border: `2px solid ${currentTheme.border}`,
            borderRadius: "10px",
            cursor: "pointer",
            transition: "all 0.3s ease"
          }}
        >
          🔄 Auto-Rotar
        </button>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          style={{
            padding: "10px 20px",
            fontSize: "14px",
            backgroundColor: currentTheme.card,
            color: currentTheme.text,
            border: `2px solid ${currentTheme.border}`,
            borderRadius: "10px",
            cursor: "pointer",
            transition: "all 0.3s ease"
          }}
        >
          {theme === 'dark' ? '☀️' : '🌙'} Tema
        </button>
      </div>

      {/* Información del juego */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: "2rem",
        marginTop: "1rem",
        flexWrap: "wrap"
      }}>
        <div style={{
          padding: "10px 20px",
          backgroundColor: currentTheme.card,
          border: `1px solid ${currentTheme.border}`,
          borderRadius: "10px",
          color: "#888",
          fontSize: "14px",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <span style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: game.turn() === 'w' ? "#4ecdc4" : "#ff6b6b",
            boxShadow: `0 0 10px ${game.turn() === 'w' ? "#4ecdc4" : "#ff6b6b"}`,
            animation: gameStatus === GAME_STATUS.THINKING ? "pulse 1.5s infinite" : "none"
          }}></span>
          Movimientos: {moveHistory.length}
        </div>

        <div style={{
          padding: "10px 20px",
          backgroundColor: currentTheme.card,
          border: `1px solid ${currentTheme.border}`,
          borderRadius: "10px",
          color: "#888",
          fontSize: "14px",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          ⏱️ Duración: {moveHistory.length > 0 && gameStartTime ? 
            Math.round((Date.now() - gameStartTime) / 60000) : 0} min
        </div>

        <div style={{
          padding: "10px 20px",
          backgroundColor: currentTheme.card,
          border: `1px solid ${currentTheme.border}`,
          borderRadius: "10px",
          color: "#888",
          fontSize: "14px",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          🎯 Dificultad: {difficultyNames[difficulty]}
        </div>
      </div>

      {/* Panel de resultado del juego mejorado */}
      {game.isGameOver() && (
        <div style={{
          marginTop: "2rem",
          textAlign: "center",
          padding: "2rem",
          backgroundColor: currentTheme.card,
          borderRadius: "20px",
          border: `2px solid ${gameInfo.color}`,
          maxWidth: "600px",
          margin: "2rem auto 0",
          boxShadow: `0 10px 30px rgba(0, 0, 0, 0.4), 0 0 20px ${gameInfo.color}40`,
          animation: "gameOver 1s ease-in-out"
        }}>
          <h2 style={{
            color: gameInfo.color,
            margin: "0 0 1rem 0",
            fontSize: "2.5rem",
            animation: "bounce 2s ease-in-out infinite"
          }}>
            {gameInfo.icon} ¡Juego Terminado!
          </h2>
          <p style={{
            color: "#ccc",
            margin: "0 0 1.5rem 0",
            fontSize: "1.2rem"
          }}>
            {gameInfo.winner === 'Blancas (Tú)' ? '🎉 ¡Felicitaciones! ¡Has vencido a la IA!' :
             gameInfo.winner === 'Negras (IA)' ? '🤖 La IA ha demostrado su superioridad' :
             '🤝 ¡Excelente partida! Un empate honorable'}
          </p>
          <div style={{
            display: "flex",
            justifyContent: "center",
            gap: "2rem",
            flexWrap: "wrap",
            marginTop: "1rem"
          }}>
            <div style={{
              padding: "1rem",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              borderRadius: "10px",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "1.5rem", color: gameInfo.color }}>
                {moveHistory.length}
              </div>
              <div style={{ fontSize: "0.9rem", color: "#888" }}>
                Movimientos
              </div>
            </div>
            <div style={{
              padding: "1rem",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              borderRadius: "10px",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "1.5rem", color: gameInfo.color }}>
                {moveHistory.length > 0 && gameStartTime ? 
                  Math.round((moveHistory[moveHistory.length - 1]?.timestamp - gameStartTime) / 60000) : 0}
              </div>
              <div style={{ fontSize: "0.9rem", color: "#888" }}>
                Minutos
              </div>
            </div>
            <div style={{
              padding: "1rem",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              borderRadius: "10px",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "1.5rem", color: gameInfo.color }}>
                {capturedPieces.white.length + capturedPieces.black.length}
              </div>
              <div style={{ fontSize: "0.9rem", color: "#888" }}>
                Capturas
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Estilos CSS mejorados */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.2); }
          }
          
          @keyframes glow {
            0%, 100% { text-shadow: 0 0 30px rgba(255, 255, 255, 0.1); }
            50% { text-shadow: 0 0 40px rgba(255, 255, 255, 0.3); }
          }
          
          @keyframes thinking-animation {
            0%, 100% { transform: rotate(0deg); }
            75% { transform: rotate(10deg); }
          }
          
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
          }
          
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          
          @keyframes gameOver {
            0% { transform: scale(0.8); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
          
          @keyframes particle-explosion {
            0% { transform: scale(1) translate(0, 0); opacity: 1; }
            100% { transform: scale(0) translate(${Math.random() * 200 - 100}px, ${Math.random() * 200 - 100}px); opacity: 0; }
          }
          
          .thinking-animation {
            animation: thinking-animation 2s ease-in-out infinite;
            display: inline-block;
          }
          
          button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
          }
          
          select:hover {
            border-color: #4ecdc4;
            box-shadow: 0 0 10px rgba(78, 205, 196, 0.3);
          }
          
          /* Scrollbar personalizada */
          ::-webkit-scrollbar {
            width: 8px;
          }
          
          ::-webkit-scrollbar-track {
            background: #1a1a1a;
            border-radius: 10px;
          }
          
          ::-webkit-scrollbar-thumb {
            background: #4ecdc4;
            border-radius: 10px;
          }
          
          ::-webkit-scrollbar-thumb:hover {
            background: #45b7d1;
          }
        `}
      </style>
    </div>
  );
}

export default App;