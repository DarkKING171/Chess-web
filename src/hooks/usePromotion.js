import { useState, useCallback, useRef, useEffect } from "react";
import { useGameDispatch, ACTIONS } from "../context/GameContext.js";
import { GAME_STATUS } from "../constants.js";

/**
 * Hook avanzado para manejar promociones de peones con funcionalidades extendidas
 * @param {Object} config - Configuración del hook
 * @param {string} config.gameStatus - Estado actual del juego
 * @param {Object} config.game - Instancia del juego de ajedrez
 * @param {string} config.playerColor - Color del jugador ("white" | "black")
 * @param {Function} config.makeMove - Función para realizar movimientos
 * @param {Function} config.clearHints - Función para limpiar pistas visuales
 * @param {Object} config.options - Opciones adicionales
 */
export function usePromotion({ 
  gameStatus, 
  game, 
  playerColor, 
  makeMove, 
  clearHints,
  options = {}
}) {
  const dispatch = useGameDispatch();
  
  // Estado principal
  const [pendingMove, setPendingMove] = useState(null);
  const [promotionSquare, setPromotionSquare] = useState(null);
  const [promotionHistory, setPromotionHistory] = useState([]);
  const [isPromoting, setIsPromoting] = useState(false);
  const [promotionAnimation, setPromotionAnimation] = useState(null);
  
  // Referencias para optimización
  const promotionTimeoutRef = useRef(null);
  const lastPromotionRef = useRef(null);
  
  // Configuración extendida
  const {
    autoPromotionPiece = null, // 'q', 'r', 'b', 'n' para promoción automática
    enablePromotionHistory = true,
    promotionTimeout = 30000, // 30 segundos timeout
    enableAnimation = true,
    onPromotionStart = null,
    onPromotionComplete = null,
    onPromotionTimeout = null
  } = options;

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (promotionTimeoutRef.current) {
        clearTimeout(promotionTimeoutRef.current);
      }
    };
  }, []);

  // Detector de promociones disponibles
  const getAvailablePromotions = useCallback(() => {
    const pieces = ['q', 'r', 'b', 'n']; // Dama, Torre, Alfil, Caballo
    return pieces.map(piece => ({
      piece,
      name: {
        q: 'Dama',
        r: 'Torre', 
        b: 'Alfil',
        n: 'Caballo'
      }[piece],
      symbol: playerColor === 'white' ? piece.toUpperCase() : piece,
      value: { q: 9, r: 5, b: 3, n: 3 }[piece] // Valor aproximado
    }));
  }, [playerColor]);

  // Validador de movimiento de promoción mejorado
  const validatePromotionMove = useCallback((from, to, pieceDropped) => {
    if (!pieceDropped || !game) return false;
    
    const isPawn = pieceDropped.toLowerCase().endsWith("p");
    if (!isPawn) return false;
    
    const pieceColor = pieceDropped.startsWith("w") ? "white" : "black";
    const promotionRank = pieceColor === "white" ? "8" : "1";
    
    // Verificar que el peón llegue a la fila de promoción
    if (to[1] !== promotionRank) return false;
    
    // Verificar que el movimiento sea válido según las reglas
    try {
      const tempMove = game.move({ from, to, promotion: 'q' });
      if (tempMove) {
        game.undo(); // Deshacer el movimiento temporal
        return true;
      }
    } catch (error) {
      return false;
    }
    
    return false;
  }, [game]);

  // Función para iniciar el timeout de promoción
  const startPromotionTimeout = useCallback(() => {
    if (promotionTimeoutRef.current) {
      clearTimeout(promotionTimeoutRef.current);
    }
    
    promotionTimeoutRef.current = setTimeout(() => {
      // Auto-promoción a dama si hay timeout
      const defaultPiece = autoPromotionPiece || 'q';
      handlePromotion(defaultPiece);
      onPromotionTimeout?.();
    }, promotionTimeout);
  }, [autoPromotionPiece, promotionTimeout, onPromotionTimeout]);

  // Manejador de drop mejorado
  const onDrop = useCallback((from, to, pieceDropped) => {
    // Prevenir movimientos durante promoción activa
    if (gameStatus === GAME_STATUS.PROMOTION || isPromoting) {
      return false;
    }
    
    // Validar turno del jugador
    const isPlayerTurn =
      (playerColor === "white" && game.turn() === "w") ||
      (playerColor === "black" && game.turn() === "b");
    
    if (!isPlayerTurn || gameStatus !== GAME_STATUS.PLAYING) {
      return false;
    }
    
    // Detectar y validar promoción
    if (validatePromotionMove(from, to, pieceDropped)) {
      // Configurar estado de promoción
      setPromotionSquare(to);
      setPendingMove({ from, to, piece: pieceDropped });
      setIsPromoting(true);
      
      // Animación de entrada
      if (enableAnimation) {
        setPromotionAnimation('fadeIn');
        setTimeout(() => setPromotionAnimation(null), 300);
      }
      
      // Cambiar estado del juego
      dispatch({ type: ACTIONS.SET_STATUS, payload: GAME_STATUS.PROMOTION });
      
      // Iniciar timeout y callback
      startPromotionTimeout();
      onPromotionStart?.({ from, to, square: to });
      
      return true;
    }
    
    // Movimiento normal
    clearHints();
    return makeMove({ from, to });
  }, [
    gameStatus, 
    isPromoting, 
    game, 
    playerColor, 
    validatePromotionMove,
    makeMove, 
    clearHints, 
    dispatch,
    enableAnimation,
    startPromotionTimeout,
    onPromotionStart
  ]);

  // Manejador de promoción mejorado
  const handlePromotion = useCallback((piece) => {
    if (!pendingMove || !piece) return;
    
    // Limpiar timeout
    if (promotionTimeoutRef.current) {
      clearTimeout(promotionTimeoutRef.current);
      promotionTimeoutRef.current = null;
    }
    
    // Crear objeto de movimiento
    const moveObj = { 
      from: pendingMove.from, 
      to: pendingMove.to, 
      promotion: piece 
    };
    
    // Guardar en historial si está habilitado
    if (enablePromotionHistory) {
      const promotionRecord = {
        move: moveObj,
        timestamp: Date.now(),
        square: promotionSquare,
        piece: piece,
        gameMove: game.history().length + 1
      };
      
      setPromotionHistory(prev => [...prev, promotionRecord]);
      lastPromotionRef.current = promotionRecord;
    }
    
    // Animación de salida
    if (enableAnimation) {
      setPromotionAnimation('fadeOut');
      setTimeout(() => {
        setPromotionAnimation(null);
        resetPromotionState();
      }, 300);
    } else {
      resetPromotionState();
    }
    
    // Realizar movimiento
    const moveResult = makeMove(moveObj);
    
    // Callback de finalización
    onPromotionComplete?.({ 
      move: moveObj, 
      result: moveResult, 
      history: promotionHistory 
    });
    
    return moveResult;
  }, [
    pendingMove, 
    promotionSquare, 
    game, 
    makeMove, 
    dispatch, 
    enablePromotionHistory,
    enableAnimation,
    promotionHistory,
    onPromotionComplete
  ]);

  // Función para resetear estado de promoción
  const resetPromotionState = useCallback(() => {
    setPromotionSquare(null);
    setPendingMove(null);
    setIsPromoting(false);
    dispatch({ type: ACTIONS.SET_STATUS, payload: GAME_STATUS.PLAYING });
  }, [dispatch]);

  // Función para cancelar promoción
  const cancelPromotion = useCallback(() => {
    if (promotionTimeoutRef.current) {
      clearTimeout(promotionTimeoutRef.current);
      promotionTimeoutRef.current = null;
    }
    
    if (enableAnimation) {
      setPromotionAnimation('fadeOut');
      setTimeout(resetPromotionState, 300);
    } else {
      resetPromotionState();
    }
  }, [enableAnimation, resetPromotionState]);

  // Función para obtener estadísticas de promoción
  const getPromotionStats = useCallback(() => {
    if (!enablePromotionHistory) return null;
    
    const stats = promotionHistory.reduce((acc, promo) => {
      acc[promo.piece] = (acc[promo.piece] || 0) + 1;
      return acc;
    }, {});
    
    return {
      total: promotionHistory.length,
      byPiece: stats,
      lastPromotion: lastPromotionRef.current,
      averageTime: promotionHistory.length > 0 
        ? promotionHistory.reduce((sum, p) => sum + (p.timestamp - (p.gameStart || 0)), 0) / promotionHistory.length
        : 0
    };
  }, [enablePromotionHistory, promotionHistory]);

  // Función para promoción automática
  const autoPromote = useCallback((piece = 'q') => {
    if (gameStatus === GAME_STATUS.PROMOTION && pendingMove) {
      handlePromotion(piece);
    }
  }, [gameStatus, pendingMove, handlePromotion]);

  return {
    // Estado principal
    promotionSquare,
    pendingMove,
    isPromoting,
    promotionAnimation,
    
    // Funciones principales
    onDrop,
    handlePromotion,
    cancelPromotion,
    autoPromote,
    
    // Utilidades
    getAvailablePromotions,
    getPromotionStats,
    
    // Historial (si está habilitado)
    promotionHistory: enablePromotionHistory ? promotionHistory : null,
    
    // Estados computados
    canPromote: gameStatus === GAME_STATUS.PROMOTION && !!pendingMove,
    timeoutActive: !!promotionTimeoutRef.current,
    
    // Metadatos
    lastPromotion: lastPromotionRef.current
  };
}