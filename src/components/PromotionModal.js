import React, { useState, useEffect, useCallback } from "react";
import { GAME_STATUS } from "../constants.js";

export function PromotionModal({
  gameStatus,
  promotionSquare,
  handlePromotion,
  cancelPromotion,
  currentTheme,
  playerColor = "white",
  // Nuevas props del hook avanzado
  promotionAnimation,
  timeoutActive,
  getAvailablePromotions,
  getPromotionStats,
  autoPromote,
  canPromote,
  // Configuración adicional
  showTimer = true,
  showStats = false,
  showHints = true,
  enableKeyboardShortcuts = true,
  promotionTimeout = 30000
}) {
  // Estados locales
  const [timeLeft, setTimeLeft] = useState(promotionTimeout / 1000);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [showTooltip, setShowTooltip] = useState(null);
  const [isClosing, setIsClosing] = useState(false);

  // Obtener piezas disponibles con información extendida
  const availablePieces = getAvailablePromotions ? getAvailablePromotions() : [
    { piece: "q", name: "Dama", symbol: playerColor === "white" ? "♕" : "♛", value: 9 },
    { piece: "r", name: "Torre", symbol: playerColor === "white" ? "♖" : "♜", value: 5 },
    { piece: "b", name: "Alfil", symbol: playerColor === "white" ? "♗" : "♝", value: 3 },
    { piece: "n", name: "Caballo", symbol: playerColor === "white" ? "♘" : "♞", value: 3 }
  ];

  // Estadísticas de promoción
  const stats = getPromotionStats ? getPromotionStats() : null;

  // Timer countdown
  useEffect(() => {
    if (!timeoutActive || gameStatus !== GAME_STATUS.PROMOTION) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeoutActive, gameStatus]);

  // Atajos de teclado
  useEffect(() => {
    if (!enableKeyboardShortcuts || gameStatus !== GAME_STATUS.PROMOTION) return;

    const handleKeyPress = (e) => {
      const keyMap = {
        'q': 'q', 'Q': 'q', '1': 'q',
        'r': 'r', 'R': 'r', '2': 'r', 
        'b': 'b', 'B': 'b', '3': 'b',
        'n': 'n', 'N': 'n', '4': 'n',
        'Escape': 'cancel',
        'Enter': selectedPiece || 'q'
      };

      const action = keyMap[e.key];
      if (action) {
        e.preventDefault();
        if (action === 'cancel') {
          handleCancel();
        } else {
          handlePromotionClick(action);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [enableKeyboardShortcuts, gameStatus, selectedPiece]);

  // Manejador de promoción con animación
  const handlePromotionClick = useCallback((piece) => {
    if (!canPromote) return;
    
    setSelectedPiece(piece);
    setIsClosing(true);
    
    // Delay para animación
    setTimeout(() => {
      handlePromotion(piece);
      setIsClosing(false);
      setSelectedPiece(null);
      setTimeLeft(promotionTimeout / 1000);
    }, 200);
  }, [canPromote, handlePromotion, promotionTimeout]);

  // Manejador de cancelación
  const handleCancel = useCallback(() => {
    if (cancelPromotion) {
      setIsClosing(true);
      setTimeout(() => {
        cancelPromotion();
        setIsClosing(false);
        setSelectedPiece(null);
      }, 200);
    }
  }, [cancelPromotion]);

  // Auto-promoción por timeout
  const handleAutoPromote = useCallback(() => {
    if (autoPromote) {
      autoPromote('q'); // Promoción automática a dama
    }
  }, [autoPromote]);

  if (gameStatus !== GAME_STATUS.PROMOTION || !canPromote) return null;

  // Calcular progreso del timer
  const timerProgress = ((promotionTimeout / 1000) - timeLeft) / (promotionTimeout / 1000) * 100;
  const isUrgent = timeLeft <= 10;

  return (
    <div style={styles.overlay}>
      <div 
        style={{
          ...styles.modal,
          borderColor: currentTheme.accent,
          backgroundColor: currentTheme.card,
          transform: `scale(${isClosing ? 0.95 : 1})`,
          opacity: isClosing ? 0 : 1,
          animation: promotionAnimation ? `${promotionAnimation} 0.3s ease-out` : undefined
        }}
      >
        {/* Header con timer */}
        <div style={styles.header}>
          <h3 style={{ color: currentTheme.accent, margin: 0 }}>
            👑 ¡Promoción de Peón!
          </h3>
          {showTimer && timeoutActive && (
            <div style={styles.timerContainer}>
              <div 
                style={{
                  ...styles.timerBar,
                  backgroundColor: currentTheme.border,
                }}
              >
                <div 
                  style={{
                    ...styles.timerProgress,
                    width: `${timerProgress}%`,
                    backgroundColor: isUrgent ? '#ff4444' : currentTheme.accent
                  }}
                />
              </div>
              <span 
                style={{
                  ...styles.timerText,
                  color: isUrgent ? '#ff4444' : currentTheme.text
                }}
              >
                {timeLeft}s
              </span>
            </div>
          )}
        </div>

        {/* Información del cuadro */}
        <p style={{ color: currentTheme.text, margin: '1rem 0' }}>
          Elige la pieza para promocionar en <strong style={{ color: currentTheme.accent }}>{promotionSquare}</strong>
        </p>

        {/* Grid de piezas */}
        <div style={styles.grid}>
          {availablePieces.map(({ piece, symbol, name, value }) => (
            <div
              key={piece}
              style={styles.pieceContainer}
              onMouseEnter={() => setShowTooltip(piece)}
              onMouseLeave={() => setShowTooltip(null)}
            >
              <button
                onClick={() => handlePromotionClick(piece)}
                style={{
                  ...styles.button,
                  borderColor: selectedPiece === piece ? currentTheme.accent : currentTheme.border,
                  backgroundColor: selectedPiece === piece ? currentTheme.accent + '20' : currentTheme.card,
                  color: currentTheme.text,
                  transform: selectedPiece === piece ? 'scale(1.1)' : 'scale(1)',
                  boxShadow: selectedPiece === piece ? `0 0 20px ${currentTheme.accent}40` : 'none'
                }}
                disabled={!canPromote}
              >
                <div style={styles.pieceSymbol}>{symbol}</div>
                <div style={styles.pieceName}>{name}</div>
                {showHints && (
                  <div style={styles.pieceValue}>Valor: {value}</div>
                )}
              </button>

              {/* Tooltip */}
              {showTooltip === piece && (
                <div 
                  style={{
                    ...styles.tooltip,
                    backgroundColor: currentTheme.card,
                    borderColor: currentTheme.border,
                    color: currentTheme.text
                  }}
                >
                  <strong>{name}</strong>
                  <br />
                  Valor: {value} puntos
                  <br />
                  Tecla: {piece.toUpperCase()}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Estadísticas (si están disponibles) */}
        {showStats && stats && stats.total > 0 && (
          <div style={styles.stats}>
            <h4 style={{ color: currentTheme.accent, margin: '1rem 0 0.5rem' }}>
              Estadísticas de Promoción
            </h4>
            <div style={styles.statsGrid}>
              <div style={{ color: currentTheme.text }}>
                Total: {stats.total}
              </div>
              {Object.entries(stats.byPiece).map(([piece, count]) => (
                <div key={piece} style={{ color: currentTheme.text }}>
                  {availablePieces.find(p => p.piece === piece)?.name}: {count}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Controles adicionales */}
        <div style={styles.controls}>
          {enableKeyboardShortcuts && (
            <div style={{ ...styles.hint, color: currentTheme.text }}>
              💡 Usa las teclas Q, R, B, N o números 1-4
            </div>
          )}
          
          <div style={styles.buttonRow}>
            <button
              onClick={handleAutoPromote}
              style={{
                ...styles.autoButton,
                backgroundColor: currentTheme.accent + '20',
                color: currentTheme.accent,
                borderColor: currentTheme.accent
              }}
              disabled={!canPromote}
            >
              Auto-Dama
            </button>
            
            {cancelPromotion && (
              <button
                onClick={handleCancel}
                style={{
                  ...styles.cancelButton,
                  backgroundColor: '#ff444420',
                  color: '#ff4444',
                  borderColor: '#ff4444'
                }}
                disabled={!canPromote}
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.8)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000,
    backdropFilter: "blur(5px)"
  },
  modal: {
    padding: "2rem",
    border: "2px solid",
    borderRadius: "20px",
    textAlign: "center",
    boxShadow: "0 20px 40px rgba(0,0,0,0.7)",
    maxWidth: "500px",
    width: "90%",
    transition: "all 0.3s ease-out",
    position: "relative"
  },
  header: {
    marginBottom: "1rem"
  },
  timerContainer: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    marginTop: "1rem"
  },
  timerBar: {
    flex: 1,
    height: "8px",
    borderRadius: "4px",
    overflow: "hidden",
    position: "relative"
  },
  timerProgress: {
    height: "100%",
    transition: "width 1s linear",
    borderRadius: "4px"
  },
  timerText: {
    fontSize: "1.2rem",
    fontWeight: "bold",
    minWidth: "40px"
  },
  grid: {
    display: "flex",
    gap: "1rem",
    justifyContent: "center",
    flexWrap: "wrap",
    margin: "1.5rem 0"
  },
  pieceContainer: {
    position: "relative"
  },
  button: {
    padding: "1.5rem 1rem",
    cursor: "pointer",
    border: "2px solid",
    borderRadius: "15px",
    transition: "all 0.2s ease-out",
    minWidth: "80px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.5rem"
  },
  pieceSymbol: {
    fontSize: "2.5rem",
    lineHeight: 1
  },
  pieceName: {
    fontSize: "0.9rem",
    fontWeight: "bold"
  },
  pieceValue: {
    fontSize: "0.7rem",
    opacity: 0.8
  },
  tooltip: {
    position: "absolute",
    bottom: "100%",
    left: "50%",
    transform: "translateX(-50%)",
    padding: "0.5rem",
    border: "1px solid",
    borderRadius: "8px",
    fontSize: "0.8rem",
    marginBottom: "0.5rem",
    zIndex: 10,
    whiteSpace: "nowrap",
    boxShadow: "0 4px 8px rgba(0,0,0,0.3)"
  },
  stats: {
    marginTop: "1rem",
    padding: "1rem",
    borderTop: "1px solid rgba(255,255,255,0.1)"
  },
  statsGrid: {
    display: "flex",
    gap: "1rem",
    justifyContent: "center",
    flexWrap: "wrap",
    fontSize: "0.9rem"
  },
  controls: {
    marginTop: "1.5rem"
  },
  hint: {
    fontSize: "0.8rem",
    opacity: 0.8,
    marginBottom: "1rem"
  },
  buttonRow: {
    display: "flex",
    gap: "1rem",
    justifyContent: "center"
  },
  autoButton: {
    padding: "0.5rem 1rem",
    border: "1px solid",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.9rem",
    transition: "all 0.2s ease-out"
  },
  cancelButton: {
    padding: "0.5rem 1rem",
    border: "1px solid",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.9rem",
    transition: "all 0.2s ease-out"
  }
};

// Keyframes para animaciones (si se requiere CSS personalizado)
const keyframes = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  @keyframes fadeOut {
    from {
      opacity: 1;
      transform: scale(1);
    }
    to {
      opacity: 0;
      transform: scale(0.9);
    }
  }
`;

// Agregar estilos CSS si es necesario
if (typeof document !== 'undefined' && !document.getElementById('promotion-modal-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'promotion-modal-styles';
  styleSheet.textContent = keyframes;
  document.head.appendChild(styleSheet);
}