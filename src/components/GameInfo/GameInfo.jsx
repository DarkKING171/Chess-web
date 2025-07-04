import React, { useMemo } from 'react';

const GameInfo = ({ game, gameStatus, thinking = false, difficulty }) => {
  // Memoización del cálculo de piezas capturadas para evitar recálculos innecesarios
  const capturedPieces = useMemo(() => {
    const pieces = { white: [], black: [] };
    
    if (!game?.history) return pieces;
    
    const history = game.history({ verbose: true });
    
    history.forEach(move => {
      if (move.captured) {
        // Las piezas capturadas van al oponente del que las capturó
        if (move.color === 'w') {
          pieces.white.push(move.captured);
        } else {
          pieces.black.push(move.captured);
        }
      }
    });
    
    return pieces;
  }, [game]);

  // Mapeo de piezas a símbolos Unicode más elegantes
  const pieceSymbols = {
    p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚',
    P: '♙', R: '♖', N: '♘', B: '♗', Q: '♕', K: '♔'
  };

  const formatCapturedPieces = (pieces) => {
    if (!pieces.length) return 'Ninguna';
    
    // Contar piezas del mismo tipo
    const pieceCounts = pieces.reduce((acc, piece) => {
      acc[piece] = (acc[piece] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(pieceCounts)
      .map(([piece, count]) => 
        count > 1 ? `${pieceSymbols[piece] || piece} x${count}` : pieceSymbols[piece] || piece
      )
      .join(' ');
  };

  const getCurrentPlayer = () => {
    if (!game?.turn) return 'Desconocido';
    return game.turn() === 'w' ? 'Blancas ♙' : 'Negras ♟';
  };

  const getStatusText = () => {
    if (thinking) return '🤔 Pensando...';
    return gameStatus || 'En progreso';
  };

  // Estilos mejorados como constantes
  const styles = {
    container: {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: '1rem',
      marginBottom: '2rem',
      maxWidth: '400px'
    },
    card: {
      padding: '1.5rem',
      backgroundColor: '#1a1a1a',
      borderRadius: '16px',
      border: '1px solid #333',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
    },
    title: {
      color: '#4ecdc4',
      margin: '0 0 1rem 0',
      fontSize: '1.2rem',
      fontWeight: '600'
    },
    infoRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      margin: '0.5rem 0',
      padding: '0.25rem 0',
      fontSize: '0.95rem'
    },
    label: {
      color: '#ccc',
      fontWeight: '500'
    },
    value: {
      color: '#fff',
      fontWeight: '400'
    },
    capturedSection: {
      marginTop: '1rem',
      padding: '0.75rem',
      backgroundColor: '#252525',
      borderRadius: '8px',
      border: '1px solid #404040'
    },
    capturedTitle: {
      color: '#4ecdc4',
      fontSize: '0.9rem',
      fontWeight: '600',
      marginBottom: '0.5rem'
    },
    capturedRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      margin: '0.25rem 0',
      fontSize: '0.9rem'
    }
  };

  return (
    <div style={styles.container}>
      <div 
        style={styles.card}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
        }}
      >
        <h3 style={styles.title}>Estado del Juego</h3>
        
        <div style={styles.infoRow}>
          <span style={styles.label}>Turno:</span>
          <span style={styles.value}>{getCurrentPlayer()}</span>
        </div>
        
        <div style={styles.infoRow}>
          <span style={styles.label}>Estado:</span>
          <span style={styles.value}>{getStatusText()}</span>
        </div>
        
        {difficulty && (
          <div style={styles.infoRow}>
            <span style={styles.label}>Dificultad:</span>
            <span style={styles.value}>{difficulty}</span>
          </div>
        )}
        
        <div style={styles.capturedSection}>
          <div style={styles.capturedTitle}>Piezas Capturadas</div>
          
          <div style={styles.capturedRow}>
            <span style={styles.label}>Por Blancas:</span>
            <span style={styles.value}>{formatCapturedPieces(capturedPieces.black)}</span>
          </div>
          
          <div style={styles.capturedRow}>
            <span style={styles.label}>Por Negras:</span>
            <span style={styles.value}>{formatCapturedPieces(capturedPieces.white)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameInfo;