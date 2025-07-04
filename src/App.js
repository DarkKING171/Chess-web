import GameInfo from "./components/GameInfo/GameInfo";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import ChessAI from "./engine/ChessAI"; // Importar tu motor de ajedrez

// Constantes de configuración
const AI_CONFIG = {
  MOVE_DELAY: 500, // Delay antes de que la IA mueva
  THINKING_TIME: 1000, // Tiempo mínimo de "pensamiento" para UX
  DEFAULT_DIFFICULTY: 3
};

const GAME_STATUS = {
  WAITING: 'waiting',
  THINKING: 'thinking',
  PLAYING: 'playing',
  GAME_OVER: 'game_over'
};

// Función auxiliar para evaluar valor de piezas
const getPieceValue = (piece) => {
  const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  return values[piece?.toLowerCase()] || 0;
};

function App() {
  const [game, setGame] = useState(new Chess());
  const [gameStatus, setGameStatus] = useState(GAME_STATUS.PLAYING);
  const [moveHistory, setMoveHistory] = useState([]);
  const [capturedPieces, setCapturedPieces] = useState({ white: [], black: [] });
  const [difficulty, setDifficulty] = useState(AI_CONFIG.DEFAULT_DIFFICULTY);
  const [error, setError] = useState(null);
  const [aiStats, setAiStats] = useState(null);
  
  const gameRef = useRef(new Chess());
  const chessAI = useRef(new ChessAI(AI_CONFIG.DEFAULT_DIFFICULTY));

  // Función inteligente para movimiento de emergencia
  const makeEmergencyMove = useCallback(() => {
    const currentGame = new Chess(gameRef.current.fen());
    const legalMoves = currentGame.moves({ verbose: true });

    if (legalMoves.length === 0) {
      console.warn("⛔ No hay movimientos legales disponibles");
      setGameStatus(GAME_STATUS.GAME_OVER);
      return false;
    }

    // Estrategia de priorización mejorada
    const prioritizeMoves = (moves) => {
      const captures = moves.filter(m => m.captured);
      const checks = moves.filter(m => m.san.includes('+'));
      const centerMoves = moves.filter(m => ['d4', 'd5', 'e4', 'e5', 'c4', 'c5', 'f4', 'f5'].includes(m.to));
      const castling = moves.filter(m => m.san.includes('O'));
      const development = moves.filter(m => 
        ['N', 'B'].includes(m.piece) && 
        !['a', 'h'].includes(m.to[0]) &&
        !['1', '8'].includes(m.to[1])
      );

      // Prioridad: jaque mate > capturas > jaques > enroque > desarrollo > centro > otros
      return [
        ...checks.filter(m => m.san.includes('#')), // Jaque mate
        ...captures.sort((a, b) => getPieceValue(b.captured) - getPieceValue(a.captured)),
        ...checks,
        ...castling,
        ...development,
        ...centerMoves,
        ...moves
      ][0];
    };

    const emergencyMove = prioritizeMoves(legalMoves);
    
    const moveObj = {
      from: emergencyMove.from,
      to: emergencyMove.to
    };
    
    if (emergencyMove.promotion) {
      moveObj.promotion = emergencyMove.promotion;
    }

    return makeMove(moveObj);
  }, []);

  // Función para mover piezas con validación completa
  const makeMove = useCallback((move) => {
    try {
      const newGame = new Chess(gameRef.current.fen());
      const result = newGame.move(move);

      if (result === null) {
        console.warn("❌ Movimiento inválido:", move);
        return false;
      }

      // Actualizar historial de movimientos
      setMoveHistory(prev => [...prev, {
        move: result.san,
        fen: newGame.fen(),
        captured: result.captured,
        timestamp: Date.now()
      }]);

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

      setGame(newGame);
      gameRef.current = newGame;

      // Verificar si el juego terminó
      if (newGame.isGameOver()) {
        setGameStatus(GAME_STATUS.GAME_OVER);
        return true;
      }

      // Si es turno de la IA (negras), iniciar pensamiento
      if (newGame.turn() === "b") {
        setGameStatus(GAME_STATUS.THINKING);
        setTimeout(() => {
          requestAIMove(newGame);
        }, AI_CONFIG.MOVE_DELAY);
      } else {
        setGameStatus(GAME_STATUS.PLAYING);
      }

      return true;
    } catch (error) {
      console.error("Error al hacer movimiento:", error);
      setError("Error al procesar el movimiento");
      return false;
    }
  }, []);

 // Actualización para la función requestAIMove en app.js
// Reemplaza la función requestAIMove existente con esta versión:

const requestAIMove = useCallback(async (currentGame) => {
  try {
    console.log("🤖 IA calculando movimiento...");
    setError(null); // Limpiar errores previos
    
    const startTime = Date.now();
    
    // Usar Promise.race para implementar timeout
    const aiMovePromise = new Promise((resolve, reject) => {
      try {
        const bestMove = chessAI.current.getBestMove(currentGame);
        resolve(bestMove);
      } catch (error) {
        reject(error);
      }
    });
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), 10000); // 10 segundos máximo
    });
    
    const bestMove = await Promise.race([aiMovePromise, timeoutPromise]);
    
    if (!bestMove) {
      console.warn("⚠️ IA no encontró movimiento válido");
      if (!makeEmergencyMove()) {
        setGameStatus(GAME_STATUS.GAME_OVER);
      }
      return;
    }

    // Asegurar tiempo mínimo de "pensamiento" para UX
    const thinkingTime = Date.now() - startTime;
    const remainingTime = Math.max(0, AI_CONFIG.THINKING_TIME - thinkingTime);

    setTimeout(() => {
      console.log(`🎯 IA eligió: ${bestMove}`);
      
      // Obtener estadísticas del motor
      const stats = chessAI.current.getStats();
      setAiStats(stats);
      
      // Ejecutar movimiento
      const success = makeMove(bestMove);
      if (!success) {
        console.error("❌ Movimiento de IA falló, usando emergencia");
        makeEmergencyMove();
      }
      
      // Limpiar caché si es necesario
      chessAI.current.clearCache();
    }, remainingTime);

  } catch (error) {
    console.error("Error en IA:", error);
    
    if (error.message === 'Timeout') {
      setError("La IA tardó demasiado en responder");
    } else {
      setError("Error del motor de ajedrez");
    }
    
    // Reiniciar el motor en caso de error crítico
    chessAI.current.reset();
    
    // Usar movimiento de emergencia
    if (!makeEmergencyMove()) {
      setGameStatus(GAME_STATUS.GAME_OVER);
    }
  }
}, [makeEmergencyMove, makeMove]);

  // Inicialización del motor de IA
  useEffect(() => {
    console.log("🚀 Inicializando motor de ajedrez...");
    chessAI.current.setDifficulty(difficulty);
    setError(null);
  }, [difficulty]);

  // Sincronizar referencia del juego
  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  // Función para manejar drop de piezas
  const onDrop = useCallback((sourceSquare, targetSquare, piece) => {
    if (gameStatus !== GAME_STATUS.PLAYING) {
      return false;
    }

    if (game.turn() !== 'w') {
      console.log("⚠️ No es tu turno");
      return false;
    }

    // Detectar promoción automáticamente
    const moveObj = { from: sourceSquare, to: targetSquare };
    
    // Si es un peón llegando a la última fila, promover a dama
    if (piece[1] === 'P' && (targetSquare[1] === '8' || targetSquare[1] === '1')) {
      moveObj.promotion = 'q';
    }

    return makeMove(moveObj);
  }, [gameStatus, game, makeMove]);

  // Función para reiniciar juego
  const restartGame = useCallback(() => {
    const newGame = new Chess();
    setGame(newGame);
    gameRef.current = newGame;
    setGameStatus(GAME_STATUS.PLAYING);
    setMoveHistory([]);
    setCapturedPieces({ white: [], black: [] });
    setError(null);
    setAiStats(null);
    chessAI.current.clearCache();
    console.log("🔄 Juego reiniciado");
  }, []);

  // Función para deshacer último movimiento
  const undoMove = useCallback(() => {
    if (moveHistory.length < 2 || gameStatus !== GAME_STATUS.PLAYING) return;
    
    // Retroceder 2 movimientos (jugador + IA)
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
          // Determinar qué color capturó basándose en el movimiento
          const capturedBy = entry.move.match(/^[NBRQK]?[a-h]?[1-8]?x/) ? 'current_player' : 'opponent';
          // Simplificación: necesitarías más lógica para determinar correctamente
          newCaptured.white.push(entry.captured);
        }
      });
      setCapturedPieces(newCaptured);
    } else {
      // Si no hay estado anterior, reiniciar
      restartGame();
    }
  }, [moveHistory, gameStatus, restartGame]);

  // Función para cambiar dificultad
  const changeDifficulty = useCallback((newDifficulty) => {
    setDifficulty(newDifficulty);
    chessAI.current.setDifficulty(newDifficulty);
    console.log(`🎯 Dificultad cambiada a: ${newDifficulty}`);
  }, []);

  // Información del estado del juego
  const gameInfo = useMemo(() => {
    if (game.isCheckmate()) {
      return {
        status: 'Jaque Mate',
        winner: game.turn() === 'w' ? 'Negras (IA)' : 'Blancas (Tú)',
        icon: '👑'
      };
    }
    if (game.isStalemate()) {
      return { status: 'Ahogado', winner: 'Empate', icon: '🤝' };
    }
    if (game.isDraw()) {
      return { status: 'Empate', winner: 'Empate', icon: '🤝' };
    }
    if (game.inCheck()) {
      return { 
        status: 'Jaque', 
        winner: game.turn() === 'w' ? 'Blancas en jaque' : 'Negras en jaque',
        icon: '⚠️'
      };
    }
    
    return {
      status: gameStatus === GAME_STATUS.THINKING ? 'IA pensando...' : 'En juego',
      winner: game.turn() === 'w' ? 'Turno de Blancas' : 'Turno de Negras',
      icon: gameStatus === GAME_STATUS.THINKING ? '🤔' : '♟️'
    };
  }, [game, gameStatus]);

  const difficultyNames = {
    1: 'Muy Fácil',
    2: 'Fácil', 
    3: 'Normal',
    4: 'Difícil',
    5: 'Muy Difícil'
  };

  return (
    <div style={{
      padding: "2rem",
      backgroundColor: "#0f0f0f",
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #0f0f0f 100%)",
      color: "#ffffff"
    }}>
      {/* Encabezado */}
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <h1 style={{
          fontSize: "3rem",
          fontWeight: "bold",
          background: "linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1)",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          color: "transparent",
          margin: "0",
          textShadow: "0 0 30px rgba(255, 255, 255, 0.1)"
        }}>
          ♟️ Ajedrez vs IA
        </h1>
        <p style={{
          color: "#888",
          fontSize: "1.1rem",
          marginTop: "0.5rem"
        }}>
          Desafía a tu motor de ajedrez personalizado
        </p>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div style={{
          backgroundColor: "#ff6b6b",
          color: "white",
          padding: "1rem",
          borderRadius: "10px",
          marginBottom: "1rem",
          textAlign: "center"
        }}>
          ⚠️ {error}
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
          
          {/* Estadísticas de la IA */}
          {aiStats && (
            <div style={{
              padding: "1rem",
              backgroundColor: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: "15px",
              marginTop: "1rem",
              maxWidth: "400px"
            }}>
              <h4 style={{ color: "#4ecdc4", margin: "0 0 0.5rem 0" }}>
                🧠 Estadísticas IA
              </h4>
              <div style={{ fontSize: "0.9rem", color: "#ccc" }}>
                <div>Nodos evaluados: {aiStats.nodesEvaluated?.toLocaleString()}</div>
                <div>Profundidad: {aiStats.depth}</div>
                <div>Caché: {aiStats.cacheSize} posiciones</div>
              </div>
            </div>
          )}
        </div>

        {/* Tablero de ajedrez */}
        <div style={{ order: window.innerWidth <= 768 ? 1 : 2 }}>
          <div style={{
            padding: "1.5rem",
            backgroundColor: "#1a1a1a",
            borderRadius: "20px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5), 0 0 50px rgba(255, 255, 255, 0.05)",
            border: "1px solid #333"
          }}>
            <Chessboard
              position={game.fen()}
              onPieceDrop={onDrop}
              boardWidth={Math.min(500, window.innerWidth - 100)}
              customBoardStyle={{
                borderRadius: '10px',
                boxShadow: '0 5px 15px rgba(0, 0, 0, 0.8)'
              }}
              arePiecesDraggable={gameStatus === GAME_STATUS.PLAYING && game.turn() === 'w'}
            />
          </div>
          
          {/* Panel de información del estado */}
          <div style={{
            display: "flex",
            justifyContent: "center",
            margin: "1.5rem 0"
          }}>
            <div style={{
              padding: "1rem 2rem",
              backgroundColor: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: "15px",
              textAlign: "center",
              boxShadow: "0 5px 15px rgba(0, 0, 0, 0.3)"
            }}>
              <div style={{
                fontSize: "1.2rem",
                marginBottom: "0.5rem",
                color: "#4ecdc4"
              }}>
                {gameInfo.icon} {gameInfo.status}
              </div>
              <div style={{
                color: "#ccc",
                fontSize: "0.9rem"
              }}>
                {gameInfo.winner}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controles */}
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
            backgroundColor: "#2a2a2a",
            color: "#ffffff",
            border: "2px solid #444",
            borderRadius: "12px",
            cursor: "pointer",
            transition: "all 0.3s ease",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)"
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
            backgroundColor: moveHistory.length >= 2 && gameStatus === GAME_STATUS.PLAYING ? "#2a2a2a" : "#1a1a1a",
            color: moveHistory.length >= 2 && gameStatus === GAME_STATUS.PLAYING ? "#ffffff" : "#666",
            border: "2px solid #444",
            borderRadius: "12px",
            cursor: moveHistory.length >= 2 && gameStatus === GAME_STATUS.PLAYING ? "pointer" : "not-allowed",
            transition: "all 0.3s ease",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)"
          }}
        >
          ↩️ Deshacer
        </button>

        {/* Selector de dificultad */}
        <select
          value={difficulty}
          onChange={(e) => changeDifficulty(parseInt(e.target.value))}
          disabled={gameStatus === GAME_STATUS.THINKING}
          style={{
            padding: "12px 20px",
            fontSize: "16px",
            backgroundColor: "#2a2a2a",
            color: "#ffffff",
            border: "2px solid #444",
            borderRadius: "12px",
            cursor: "pointer",
            transition: "all 0.3s ease"
          }}
        >
          {Object.entries(difficultyNames).map(([level, name]) => (
            <option key={level} value={level}>{name}</option>
          ))}
        </select>

        <div style={{
          padding: "12px 20px",
          backgroundColor: "#1a1a1a",
          border: "1px solid #333",
          borderRadius: "12px",
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
      </div>

      {/* Panel de resultado del juego */}
      {game.isGameOver() && (
        <div style={{
          marginTop: "2rem",
          textAlign: "center",
          padding: "2rem",
          backgroundColor: "#1a1a1a",
          borderRadius: "20px",
          border: "2px solid #333",
          maxWidth: "600px",
          margin: "2rem auto 0",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)"
        }}>
          <h2 style={{
            color: "#ff6b6b",
            margin: "0 0 1rem 0",
            fontSize: "2rem"
          }}>
            {gameInfo.icon} ¡Juego Terminado!
          </h2>
          <p style={{
            color: "#ccc",
            margin: "0 0 1.5rem 0",
            fontSize: "1.2rem"
          }}>
            {gameInfo.winner === 'Blancas (Tú)' ? '🎉 ¡Felicitaciones! ¡Has ganado!' :
             gameInfo.winner === 'Negras (IA)' ? '🤖 La IA ha ganado esta vez' :
             '🤝 ¡Buen juego! Empate'}
          </p>
          <div style={{
            color: "#888",
            fontSize: "1rem"
          }}>
            Movimientos totales: {moveHistory.length} | 
            Duración: {moveHistory.length > 0 ? 
              Math.round((moveHistory[moveHistory.length - 1]?.timestamp - moveHistory[0]?.timestamp) / 60000) 
              : 0} min
          </div>
        </div>
      )}

      {/* Estilos CSS para animación */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.2); }
          }
        `}
      </style>
    </div>
  );
}

export default App;