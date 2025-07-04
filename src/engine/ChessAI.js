// src/engine/ChessAI.js - Motor de ajedrez mejorado y optimizado
import { Chess } from 'chess.js';

// Valores de las piezas optimizados (constantes para acceso rápido)
const PIECE_VALUES = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000,
  P: -100, N: -320, B: -330, R: -500, Q: -900, K: -20000
};

// Tablas de posición precalculadas para evaluación más rápida
const POSITION_TABLES = {
  p: [ // Peones negros
    [0, 0, 0, 0, 0, 0, 0, 0],
    [78, 83, 86, 73, 102, 82, 85, 90],
    [7, 29, 21, 44, 40, 31, 44, 7],
    [-17, 16, -2, 15, 14, 0, 15, -13],
    [-26, 3, 10, 9, 6, 1, 0, -23],
    [-22, 9, 5, -11, -10, -2, 3, -19],
    [-31, 8, -7, -37, -36, -14, 3, -31],
    [0, 0, 0, 0, 0, 0, 0, 0]
  ],
  n: [ // Caballos
    [-66, -53, -75, -75, -10, -55, -58, -70],
    [-3, -6, 100, -36, 4, 62, -4, -14],
    [10, 67, 1, 74, 73, 27, 62, -2],
    [24, 24, 45, 37, 33, 41, 25, 17],
    [-1, 5, 31, 21, 22, 35, 2, 0],
    [-18, 10, 13, 22, 18, 15, 11, -14],
    [-23, -15, 2, 0, 2, 0, -23, -20],
    [-74, -23, -26, -24, -19, -35, -22, -69]
  ],
  b: [ // Alfiles
    [-59, -78, -82, -76, -23, -107, -37, -50],
    [-11, 20, 35, -42, -39, 31, 2, -22],
    [-9, 39, -32, 41, 52, -10, 28, -14],
    [25, 17, 20, 34, 26, 25, 15, 10],
    [13, 10, 17, 23, 17, 16, 0, 7],
    [14, 25, 24, 15, 8, 25, 20, 15],
    [19, 20, 11, 6, 7, 6, 20, 16],
    [-7, 2, -15, -12, -14, -15, -10, -10]
  ],
  r: [ // Torres
    [35, 29, 33, 4, 37, 33, 56, 50],
    [55, 29, 56, 67, 55, 62, 34, 60],
    [19, 35, 28, 33, 45, 27, 25, 15],
    [0, 5, 16, 13, 18, -4, -9, -6],
    [-28, -35, -16, -21, -13, -29, -46, -30],
    [-42, -28, -42, -25, -25, -35, -26, -46],
    [-53, -38, -31, -26, -29, -43, -44, -53],
    [-30, -24, -18, 5, -2, -18, -31, -32]
  ],
  q: [ // Reina
    [6, 1, -8, -104, 69, 24, 88, 26],
    [14, 32, 60, -10, 20, 76, 57, 24],
    [-2, 43, 32, 60, 72, 63, 43, 2],
    [1, -16, 22, 17, 25, 20, -13, -6],
    [-14, -15, -2, -5, -1, -10, -20, -22],
    [-30, -6, -13, -11, -16, -11, -16, -27],
    [-36, -18, 0, -19, -15, -15, -21, -38],
    [-39, -30, -31, -13, -31, -36, -34, -42]
  ],
  k: [ // Rey (juego medio)
    [4, 54, 47, -99, -99, 60, 83, -62],
    [-32, 10, 55, 56, 56, 55, 10, 3],
    [-62, 12, -57, 44, -67, 28, 37, -31],
    [-55, 50, 11, -4, -19, 13, 0, -49],
    [-55, -43, -52, -28, -51, -47, -8, -50],
    [-47, -42, -43, -79, -64, -32, -29, -32],
    [-4, 3, -14, -50, -57, -18, 13, 4],
    [17, 30, -3, -14, 6, -1, 40, 18]
  ],
  k_endgame: [ // Rey (final)
    [-50, -40, -30, -20, -20, -30, -40, -50],
    [-30, -20, -10, 0, 0, -10, -20, -30],
    [-30, -10, 20, 30, 30, 20, -10, -30],
    [-30, -10, 30, 40, 40, 30, -10, -30],
    [-30, -10, 30, 40, 40, 30, -10, -30],
    [-30, -10, 20, 30, 30, 20, -10, -30],
    [-30, -30, 0, 0, 0, 0, -30, -30],
    [-50, -30, -30, -30, -30, -30, -30, -50]
  ]
};

// Cachés precalculadas para mejorar rendimiento
const CENTRAL_SQUARES = ['d4', 'd5', 'e4', 'e5'];
const FILE_MAP = {a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7};
const RANK_MAP = {1: 7, 2: 6, 3: 5, 4: 4, 5: 3, 6: 2, 7: 1, 8: 0};

class ChessAI {
  constructor(depth = 3) {
    // Valores núcleo para el algoritmo
    this.depth = depth;
    this.nodesEvaluated = 0;
    this.transpositionTable = new Map();
    this.timeLimit = 5000;
    this.startTime = 0;
    this.maxNodes = 50000;
    this.killerMoves = [];
    this.historyTable = new Map();
    this.randomness = 0.1;
    this.contempt = 0;
    this.futilityMargin = 150;
    
    // Optimizaciones para mejorar velocidad
    this.useNullMovePruning = true;
    this.useAspiration = true;
    this.useIterativeDeepening = true;
    this.usePrincipalVariation = true;
    this.aspirationWindow = 50;
    this.pvTable = [];
    this.pvLength = [];

    // Evaluación en dos fases para mayor eficiencia
    this.midgameWeight = 1;
    this.endgameWeight = 0;

    // Inicialización de tablas para movimiento
    for (let i = 0; i < 10; i++) {
      this.killerMoves[i] = [];
    }
    
    for (let i = 0; i < 64; i++) {
      this.pvTable[i] = [];
      for (let j = 0; j < 64; j++) {
        this.pvTable[i][j] = null;
      }
      this.pvLength[i] = 0;
    }

    // Bind de métodos para asegurar el contexto correcto
    this.getStats = this.getStats.bind(this);
    this.clearCache = this.clearCache.bind(this);
    this.reset = this.reset.bind(this);
    this.getBestMove = this.getBestMove.bind(this);
    this.setDifficulty = this.setDifficulty.bind(this);
  }

  // Configurar dificultad con parámetros más balanceados
  setDifficulty(level) {
    // Configuración optimizada para cada nivel
    const difficulties = {
      1: { depth: 2, randomness: 0.4, timeLimit: 800, maxNodes: 3000, contempt: -50 },
      2: { depth: 2, randomness: 0.25, timeLimit: 1500, maxNodes: 8000, contempt: -20 },
      3: { depth: 3, randomness: 0.15, timeLimit: 2500, maxNodes: 15000, contempt: 0 },
      4: { depth: 3, randomness: 0.08, timeLimit: 3500, maxNodes: 25000, contempt: 10 },
      5: { depth: 4, randomness: 0.03, timeLimit: 5000, maxNodes: 50000, contempt: 20 }
    };

    const config = difficulties[level] || difficulties[3];
    this.depth = config.depth;
    this.randomness = config.randomness;
    this.timeLimit = config.timeLimit;
    this.maxNodes = config.maxNodes;
    this.contempt = config.contempt;

    // Configuración avanzada para niveles superiores
    this.useNullMovePruning = level >= 3;
    this.useAspiration = level >= 4;
    this.useIterativeDeepening = level >= 2;

    console.log(`🎯 Dificultad ${level}: profundidad=${this.depth}, tiempo=${this.timeLimit}ms, contempt=${this.contempt}`);
  }

  // Verificar condiciones de parada optimizadas (se llama menos veces)
  shouldStop() {
    if (this.nodesEvaluated % 1000 !== 0) {
      return false; // Evita comprobaciones innecesarias
    }
    
    const timeExceeded = Date.now() - this.startTime > this.timeLimit;
    const nodesExceeded = this.nodesEvaluated > this.maxNodes;
    
    return timeExceeded || nodesExceeded;
  }

  // Evaluación de la posición optimizada para mayor velocidad
  evaluateBoard(game) {
    // Uso de tabla de transposición para evitar cálculos repetidos
    const key = game.fen();
    if (this.transpositionTable.has(key)) {
      return this.transpositionTable.get(key);
    }

    // Casos especiales - comprobación rápida para finales de juego
    if (game.isCheckmate()) {
      return game.turn() === 'b' ? -50000 : 50000;
    }
    if (game.isStalemate() || game.isDraw()) {
      return this.contempt;
    }

    // Evaluación de material y posición optimizada
    const board = game.board();
    let mgScore = 0;  // Puntuación de juego medio
    let egScore = 0;  // Puntuación de final de juego
    let totalMaterial = 0;
    
    // Precálculo de material total para fase de juego
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece && piece.type !== 'k' && piece.type !== 'p') {
          totalMaterial += Math.abs(PIECE_VALUES[piece.type]);
        }
      }
    }
    
    // Determinación de fase de juego (0-256)
    const phase = Math.min(256, totalMaterial * 256 / 6600);
    this.midgameWeight = phase / 256;
    this.endgameWeight = 1 - this.midgameWeight;
    
    // Evaluación de material y posición en una sola pasada
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (!piece) continue; // Saltarse casillas vacías
        
        // Valor de la pieza
        const pieceValue = PIECE_VALUES[piece.type];
        
        // Valor posicional según fase de juego
        const actualRow = piece.color === 'w' ? 7 - i : i;
        let mgPosValue = 0;
        let egPosValue = 0;
        
        if (POSITION_TABLES[piece.type]) {
          mgPosValue = POSITION_TABLES[piece.type][actualRow][j];
          
          if (piece.type === 'k') {
            egPosValue = POSITION_TABLES.k_endgame[actualRow][j];
          } else {
            egPosValue = mgPosValue;
          }
        }
        
        // Factor según color
        const factor = piece.color === 'b' ? 1 : -1;
        
        // Aplicar valores a las puntuaciones de fase
        mgScore += factor * (Math.abs(pieceValue) + mgPosValue);
        egScore += factor * (Math.abs(pieceValue) + egPosValue);
      }
    }

    // Evaluaciones adicionales simplificadas para mayor velocidad
    let bonus = 0;
    
    // Bonificación por jaque
    if (game.inCheck()) {
      bonus += game.turn() === 'b' ? -50 : 50;
    }
    
    // Movilidad - cálculo optimizado
    const moves = game.moves();
    const mobilityBonus = moves.length * (this.midgameWeight < 0.5 ? 3 : 2);
    bonus += game.turn() === 'b' ? mobilityBonus : -mobilityBonus;
    
    // Control central - optimizado con array precalculado
    const centralControl = moves.filter(move => 
      CENTRAL_SQUARES.some(square => move.includes(square))
    ).length;
    bonus += game.turn() === 'b' ? centralControl * 5 : -centralControl * 5;

    // Interpolación entre fases de juego
    let totalEvaluation = this.midgameWeight * mgScore + this.endgameWeight * egScore + bonus;
    
    // Contempt factor solo cuando cerca de empate
    if (Math.abs(totalEvaluation) < 50) {
      totalEvaluation += this.contempt;
    }

    // Almacenar en tabla de transposición con control de tamaño
    if (this.transpositionTable.size < 100000) {  // Incrementado para mejor rendimiento
      this.transpositionTable.set(key, totalEvaluation);
    }

    return totalEvaluation;
  }

  // Detección de fase de juego optimizada
  isEndgame(board) {
    // Optimización: contador rápido con límite temprano
    let totalMaterial = 0;
    const materialLimit = 1300; // Umbral de material para considerar final
    
    for (let i = 0; i < 8 && totalMaterial < materialLimit; i++) {
      for (let j = 0; j < 8 && totalMaterial < materialLimit; j++) {
        const piece = board[i][j];
        if (piece && piece.type !== 'k' && piece.type !== 'p') {
          totalMaterial += Math.abs(PIECE_VALUES[piece.type]);
        }
      }
    }
    return totalMaterial < materialLimit;
  }

  // Evaluación simplificada del estado del juego
  evaluateGameState(game, isEndgame) {
    // Casos extremos (optimizados)
    if (game.isCheckmate()) {
      return game.turn() === 'b' ? -50000 : 50000;
    }
    if (game.isStalemate() || game.isDraw()) {
      return this.contempt;
    }

    let bonus = 0;
    
    // Bono por jaque
    if (game.inCheck()) {
      bonus += game.turn() === 'b' ? -50 : 50;
    }
    
    // Movilidad
    const moves = game.moves();
    const mobilityBonus = moves.length * (isEndgame ? 3 : 2);
    bonus += game.turn() === 'b' ? mobilityBonus : -mobilityBonus;
    
    // Simplicación: control central usando array precalculado
    const centralControl = moves.filter(move => 
      CENTRAL_SQUARES.some(square => move.includes(square))
    ).length;
    bonus += game.turn() === 'b' ? centralControl * 5 : -centralControl * 5;

    return bonus;
  }

  // Evaluación de peones optimizada
  evaluatePawnStructure(board) {
    // Uso de mapeo directo para archivos por rendimiento
    const whiteFileCount = new Array(8).fill(0);
    const blackFileCount = new Array(8).fill(0);
    const whitePawns = [];
    const blackPawns = [];

    // Una sola pasada para recopilar datos
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece && piece.type === 'p') {
          if (piece.color === 'w') {
            whiteFileCount[j]++;
            whitePawns.push({ row: i, col: j });
          } else {
            blackFileCount[j]++;
            blackPawns.push({ row: i, col: j });
          }
        }
      }
    }

    let penalty = 0;
    
    // Peones doblados
    for (let file = 0; file < 8; file++) {
      if (whiteFileCount[file] > 1) {
        penalty -= (whiteFileCount[file] - 1) * 20;
      }
      if (blackFileCount[file] > 1) {
        penalty += (blackFileCount[file] - 1) * 20;
      }
    }

    // Optimización: Cálculo único de soporte para peones
    const whiteSupport = new Array(8).fill(false);
    const blackSupport = new Array(8).fill(false);

    for (let file = 0; file < 8; file++) {
      if (whiteFileCount[file] > 0) {
        if (file > 0) whiteSupport[file-1] = true;
        if (file < 7) whiteSupport[file+1] = true;
      }
      if (blackFileCount[file] > 0) {
        if (file > 0) blackSupport[file-1] = true;
        if (file < 7) blackSupport[file+1] = true;
      }
    }

    // Peones aislados (cálculo optimizado)
    for (let file = 0; file < 8; file++) {
      if (whiteFileCount[file] > 0 && !whiteSupport[file]) {
        penalty -= 15;
      }
      if (blackFileCount[file] > 0 && !blackSupport[file]) {
        penalty += 15;
      }
    }

    // Evaluación de peones pasados (optimizada)
    for (const pawn of whitePawns) {
      let isPassed = true;
      const leftFile = Math.max(0, pawn.col - 1);
      const rightFile = Math.min(7, pawn.col + 1);
      
      // Comprobación rápida usando arrays precalculados
      for (const bp of blackPawns) {
        if (bp.col >= leftFile && bp.col <= rightFile && bp.row > pawn.row) {
          isPassed = false;
          break;
        }
      }
      
      if (isPassed) {
        const rank = 7 - pawn.row;
        penalty -= rank * rank * 10;
      }
    }

    for (const pawn of blackPawns) {
      let isPassed = true;
      const leftFile = Math.max(0, pawn.col - 1);
      const rightFile = Math.min(7, pawn.col + 1);
      
      for (const wp of whitePawns) {
        if (wp.col >= leftFile && wp.col <= rightFile && wp.row < pawn.row) {
          isPassed = false;
          break;
        }
      }
      
      if (isPassed) {
        const rank = pawn.row;
        penalty += rank * rank * 10;
      }
    }

    return penalty;
  }

  // Evaluación de seguridad del rey optimizada
  evaluateKingSafety(board) {
    let whiteKing = null, blackKing = null;

    // Búsqueda rápida de reyes
    kingSearch:
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece && piece.type === 'k') {
          if (piece.color === 'w') {
            whiteKing = { row: i, col: j };
          } else {
            blackKing = { row: i, col: j };
          }
          if (whiteKing && blackKing) break kingSearch;
        }
      }
    }

    let bonus = 0;
    
    // Evaluación simplificada para mayor velocidad
    if (whiteKing) {
      bonus -= this.evaluateKingPawnShield(board, whiteKing, 'w');
    }
    if (blackKing) {
      bonus += this.evaluateKingPawnShield(board, blackKing, 'b');
    }

    return bonus;
  }

  // Optimizada para velocidad
  evaluateKingPawnShield(board, king, color) {
    let shieldPenalty = 0;
    const direction = color === 'w' ? -1 : 1;
    
    // Comprobación optimizada - no necesita verificar cada casilla
    const colStart = Math.max(0, king.col - 1);
    const colEnd = Math.min(7, king.col + 1);
    
    for (let file = colStart; file <= colEnd; file++) {
      let foundPawn = false;
      
      // Comprobar dos filas adelante en la dirección correcta
      for (let rankOffset = 1; rankOffset <= 2; rankOffset++) {
        const rank = king.row + (direction * rankOffset);
        if (rank >= 0 && rank < 8) {
          const piece = board[rank][file];
          if (piece && piece.type === 'p' && piece.color === color) {
            foundPawn = true;
            break;
          }
        }
      }
      
      if (!foundPawn) {
        shieldPenalty += 20;
      }
    }

    return shieldPenalty;
  }

  // Minimax con optimizaciones significativas
  minimax(game, depth, alpha, beta, maximizingPlayer, ply = 0) {
    this.nodesEvaluated++;
    
    // Almacenamiento de la variante principal
    if (this.usePrincipalVariation) {
      this.pvLength[ply] = ply;
    }
    
    // Comprobaciones rápidas para detener la búsqueda
    if (this.shouldStop()) {
      return this.evaluateBoard(game);
    }

    // Verificación de tabla de transposición
    const key = game.fen();
    if (this.transpositionTable.has(key)) {
      return this.transpositionTable.get(key);
    }
    
    if (game.isGameOver()) {
      return this.evaluateBoard(game);
    }

    // Comprobación de profundidad cero
    if (depth <= 0) {
      return this.quiescenceSearch(game, alpha, beta, maximizingPlayer, 3);
    }
    
    // Movimiento nulo - poderosa técnica de poda
    if (this.useNullMovePruning && depth >= 3 && !game.inCheck() && ply > 0) {
      // Solo si no estamos en jaque y no en la raíz
      const R = depth > 6 ? 3 : 2; // Reducción más agresiva a mayor profundidad
      
      // Realizar "movimiento nulo" (cambiar turno)
      const isWhite = game.turn() === 'w';
      let nullMoveScore;
      
      try {
        const boardFEN = game.fen();
        const parts = boardFEN.split(' ');
        
        // Modificar FEN para simular un paso de turno
        parts[1] = isWhite ? 'b' : 'w';
        parts[3] = '-'; // No hay capturas al paso
        const newFEN = parts.join(' ');
        
        const tempGame = new Chess(newFEN);
        
        // Búsqueda con profundidad reducida
        nullMoveScore = -this.minimax(tempGame, depth - 1 - R, -beta, -beta + 1, !maximizingPlayer, ply + 1);
        
        // Poda si el resultado indica que esta posición es muy buena
        if (nullMoveScore >= beta) {
          return beta;
        }
      } catch (e) {
        // Si hay un error, continuar con la búsqueda normal
      }
    }

    // Generación de movimientos y ordenamiento
    const moves = game.moves({ verbose: true });
    if (moves.length === 0) {
      return this.evaluateBoard(game);
    }

    // Ordenamiento optimizado
    const orderedMoves = this.orderMoves(game, moves, ply, depth);
    let bestMove = null;
    
    if (maximizingPlayer) {
      let maxEval = -Infinity;
      
      // Búsqueda de la ventana de aspiración
      if (this.useAspiration && ply === 0 && depth > 3) {
        const estimate = this.transpositionTable.get(key) || 0;
        alpha = estimate - this.aspirationWindow;
        beta = estimate + this.aspirationWindow;
      }

      for (let i = 0; i < orderedMoves.length && !this.shouldStop(); i++) {
        const move = orderedMoves[i];
        
        try {
          const moveResult = game.move(move);
          if (moveResult) {
            let evaluation;

            // Reducción de búsqueda en movimientos tardíos
            if (i > 3 && depth > 2 && !move.captured && !move.san.includes('+')) {
              // Búsqueda inicial con ventana mínima
              evaluation = this.minimax(game, depth - 2, alpha, alpha + 1, false, ply + 1);
              
              // Si la evaluación es buena, hacer búsqueda completa
              if (evaluation > alpha) {
                evaluation = this.minimax(game, depth - 1, alpha, beta, false, ply + 1);
              }
            } else {
              evaluation = this.minimax(game, depth - 1, alpha, beta, false, ply + 1);
            }

            game.undo();

            if (evaluation > maxEval) {
              maxEval = evaluation;
              bestMove = move;
              
              // Actualizar tabla de variante principal
              if (this.usePrincipalVariation) {
                this.pvTable[ply][ply] = move;
                for (let nextPly = ply + 1; nextPly < this.pvLength[ply + 1]; nextPly++) {
                  this.pvTable[ply][nextPly] = this.pvTable[ply + 1][nextPly];
                }
                this.pvLength[ply] = this.pvLength[ply + 1];
              }
              
              // Actualizar killer moves
              if (!move.captured && ply < this.killerMoves.length) {
                this.killerMoves[ply].unshift(move.san);
                this.killerMoves[ply] = this.killerMoves[ply].slice(0, 2);
              }
              
              // Actualizar historia para este movimiento
              const historyKey = `${move.from}-${move.to}`;
              const currentHistory = this.historyTable.get(historyKey) || 0;
              this.historyTable.set(historyKey, currentHistory + depth * depth);
            }

            alpha = Math.max(alpha, evaluation);
            if (beta <= alpha) {
              // Poda beta - este es un buen movimiento
              const historyKey = `${move.from}-${move.to}`;
              const currentHistory = this.historyTable.get(historyKey) || 0;
              this.historyTable.set(historyKey, currentHistory + depth * depth);
              break;
            }
          }
        } catch (error) {
          // Ignorar errores de movimientos inválidos
          continue;
        }
      }

      // Guardar el resultado en la tabla de transposición
      if (!this.shouldStop() && bestMove) {
        this.transpositionTable.set(key, maxEval);
      }
      
      return maxEval;
    } else {
      let minEval = Infinity;
      
      for (let i = 0; i < orderedMoves.length && !this.shouldStop(); i++) {
        const move = orderedMoves[i];

        try {
          const moveResult = game.move(move);
          if (moveResult) {
            let evaluation;

            // Reducción de búsqueda en movimientos tardíos
            if (i > 3 && depth > 2 && !move.captured && !move.san.includes('+')) {
              // Búsqueda inicial con ventana mínima
              evaluation = this.minimax(game, depth - 2, beta - 1, beta, true, ply + 1);
              
              // Si la evaluación es buena, hacer búsqueda completa
              if (evaluation < beta) {
                evaluation = this.minimax(game, depth - 1, alpha, beta, true, ply + 1);
              }
            } else {
              evaluation = this.minimax(game, depth - 1, alpha, beta, true, ply + 1);
            }

            game.undo();

            if (evaluation < minEval) {
              minEval = evaluation;
              bestMove = move;
              
              // Actualizar tabla de variante principal
              if (this.usePrincipalVariation) {
                this.pvTable[ply][ply] = move;
                for (let nextPly = ply + 1; nextPly < this.pvLength[ply + 1]; nextPly++) {
                  this.pvTable[ply][nextPly] = this.pvTable[ply + 1][nextPly];
                }
                this.pvLength[ply] = this.pvLength[ply + 1];
              }
              
              // Actualizar killer moves
              if (!move.captured && ply < this.killerMoves.length) {
                this.killerMoves[ply].unshift(move.san);
                this.killerMoves[ply] = this.killerMoves[ply].slice(0, 2);
              }
            }

            beta = Math.min(beta, evaluation);
            if (beta <= alpha) {
              // Poda alfa - este es un buen movimiento defensivo
              const historyKey = `${move.from}-${move.to}`;
              const currentHistory = this.historyTable.get(historyKey) || 0;
              this.historyTable.set(historyKey, currentHistory + depth * depth);
              break;
            }
          }
        } catch (error) {
          // Ignorar errores de movimientos inválidos
          continue;
        }
      }

      // Guardar el resultado en la tabla de transposición
      if (!this.shouldStop() && bestMove) {
        this.transpositionTable.set(key, minEval);
      }
      
      return minEval;
    }
  }

  // Búsqueda quiescente optimizada
  quiescenceSearch(game, alpha, beta, maximizingPlayer, depth) {
    this.nodesEvaluated++;
    
    if (depth === 0 || this.shouldStop()) {
      return this.evaluateBoard(game);
    }

    // Evaluación estática para comprobar si podemos podar
    const standPat = this.evaluateBoard(game);

    if (maximizingPlayer) {
      if (standPat >= beta) return beta;
      alpha = Math.max(alpha, standPat);
    } else {
      if (standPat <= alpha) return alpha;
      beta = Math.min(beta, standPat);
    }

    // Solo evaluar capturas para estabilidad
    const moves = game.moves({ verbose: true });
    const captures = moves.filter(move => move.captured || move.promotion);

    if (captures.length === 0) {
      return standPat;
    }

    // Ordenamiento optimizado solo para capturas
    captures.sort((a, b) => {
      // MVV-LVA: Most Valuable Victim - Least Valuable Attacker
      const aValue = a.captured ? Math.abs(PIECE_VALUES[a.captured]) : 0;
      const bValue = b.captured ? Math.abs(PIECE_VALUES[b.captured]) : 0;
      const aAttacker = Math.abs(PIECE_VALUES[a.piece]);
      const bAttacker = Math.abs(PIECE_VALUES[b.piece]);
      
      // Capturar piezas valiosas con piezas menos valiosas primero
      return (bValue - bAttacker) - (aValue - aAttacker);
    });

    // Evaluación recursiva
    if (maximizingPlayer) {
      let maxEval = alpha;
      
      for (const move of captures) {
        if (this.shouldStop()) break;
        
        try {
          game.move(move);
          const evaluation = this.quiescenceSearch(game, maxEval, beta, false, depth - 1);
          game.undo();
          
          maxEval = Math.max(maxEval, evaluation);
          if (maxEval >= beta) return beta;
        } catch (error) {
          game.undo();
          continue;
        }
      }
      
      return maxEval;
    } else {
      let minEval = beta;
      
      for (const move of captures) {
        if (this.shouldStop()) break;
        
        try {
          game.move(move);
          const evaluation = this.quiescenceSearch(game, alpha, minEval, true, depth - 1);
          game.undo();
          
          minEval = Math.min(minEval, evaluation);
          if (minEval <= alpha) return alpha;
        } catch (error) {
          game.undo();
          continue;
        }
      }
      
      return minEval;
    }
  }

  // Ordenamiento de movimientos optimizado
  orderMoves(game, moves, ply = 0, currentDepth = 1) {
    // Mejora de rendimiento: inicializar array con tamaño adecuado
    const scoredMoves = new Array(moves.length);
    
    // Obtener el mejor movimiento de PV si existe
    const pvMove = this.usePrincipalVariation && this.pvTable[0][ply] ? 
                   this.pvTable[0][ply].san : null;
    
    // Asignar puntuaciones con una sola pasada
    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      let score = 0;
      
      // PV move obtiene prioridad máxima
      if (pvMove && move.san === pvMove) {
        score = 20000;
      }
      // MVV-LVA: Most Valuable Victim - Least Valuable Attacker
      else if (move.captured) {
        const capturedValue = Math.abs(PIECE_VALUES[move.captured]);
        const attackerValue = Math.abs(PIECE_VALUES[move.piece]);
        score = 10000 + capturedValue - attackerValue / 100;
      }
      // Promociones
      else if (move.promotion) {
        score = 9000 + Math.abs(PIECE_VALUES[move.promotion]);
      }
      // Jaques
      else if (move.san.includes('+')) {
        score = 8000;
      }
      // Killer moves
      else if (ply < this.killerMoves.length && this.killerMoves[ply].includes(move.san)) {
        score = 7000 + (this.killerMoves[ply][0] === move.san ? 100 : 0);
      }
      
      // Historia
      const historyKey = `${move.from}-${move.to}`;
      if (this.historyTable.has(historyKey)) {
        score += Math.min(1000, this.historyTable.get(historyKey));
      }
      
      // Control central y desarrollo
      if (CENTRAL_SQUARES.includes(move.to)) {
        score += 100;
      }
      
      if (['n', 'b'].includes(move.piece) && !['1', '8'].includes(move.to[1]) && !['a', 'h'].includes(move.to[0])) {
        score += 50;
      }
      
      scoredMoves[i] = { move, score };
    }
    
    // Ordenamiento rápido
    scoredMoves.sort((a, b) => b.score - a.score);
    
    // Limitar número de movimientos para considerar en búsquedas profundas
    const maxMovesToConsider = currentDepth > 3 ? Math.min(moves.length, 20) : moves.length;
    return scoredMoves.slice(0, maxMovesToConsider).map(sm => sm.move);
  }

  // Búsqueda del mejor movimiento optimizada
  getBestMove(game) {
    try {
      this.nodesEvaluated = 0;
      this.startTime = Date.now();
      
      // Limpiar tablas de variante principal
      if (this.usePrincipalVariation) {
        for (let i = 0; i < 64; i++) {
          this.pvLength[i] = 0;
        }
      }

      const availableMoves = game.moves({ verbose: true });
      if (availableMoves.length === 0) {
        console.warn("No hay movimientos disponibles");
        return null;
      }
      
      // Si solo hay un movimiento, devolverlo inmediatamente
      if (availableMoves.length === 1) {
        return availableMoves[0].san;
      }

      console.log(`🤖 Analizando ${availableMoves.length} movimientos posibles`);

      let bestMove = availableMoves[0].san;
      let bestValue = -Infinity;
      
      // Profundización iterativa para mayor eficiencia
      if (this.useIterativeDeepening) {
        for (let currentDepth = 1; currentDepth <= this.depth && !this.shouldStop(); currentDepth++) {
          console.log(`📊 Profundidad ${currentDepth}/${this.depth}`);
          
          let iterationBestMove = null;
          let iterationBestValue = -Infinity;
          let alpha = -Infinity;
          let beta = Infinity;
          
          // Aspiración windows para búsquedas más eficientes
          if (this.useAspiration && currentDepth > 1) {
            alpha = bestValue - this.aspirationWindow;
            beta = bestValue + this.aspirationWindow;
          }
          
          // Ordenamiento optimizado para esta iteración
          const orderedMoves = this.orderMoves(game, availableMoves, 0, currentDepth);
          
          for (let i = 0; i < orderedMoves.length && !this.shouldStop(); i++) {
            const move = orderedMoves[i];
            
            try {
              const moveResult = game.move(move);
              if (moveResult) {
                // Búsqueda completa en este movimiento
                const value = this.minimax(game, currentDepth - 1, alpha, beta, false, 1);
                game.undo();
                
                if (value > iterationBestValue) {
                  iterationBestValue = value;
                  iterationBestMove = move.san;
                  
                  // Ajustar ventana alfa-beta
                  alpha = Math.max(alpha, value);
                }
                
                // Actualizar tabla de historia
                const historyKey = `${move.from}-${move.to}`;
                const currentHistory = this.historyTable.get(historyKey) || 0;
                this.historyTable.set(historyKey, currentHistory + currentDepth * currentDepth);
              }
            } catch (error) {
              console.warn("Error evaluando movimiento:", move.san, error);
              continue;
            }
          }
          
          if (iterationBestMove && !this.shouldStop()) {
            bestMove = iterationBestMove;
            bestValue = iterationBestValue;
            
            // Actualizar la mejor línea para mostrar
            if (this.usePrincipalVariation) {
              let pvLine = bestMove;
              for (let i = 1; i < this.pvLength[0]; i++) {
                if (this.pvTable[0][i]) {
                  pvLine += " " + this.pvTable[0][i].san;
                }
              }
              console.log(`✓ Línea principal: ${pvLine}`);
            }
            
            console.log(`✅ Profundidad ${currentDepth} completada. Mejor: ${bestMove} (valor: ${bestValue})`);
          } else {
            console.warn(`❌ Búsqueda en profundidad ${currentDepth} interrumpida.`);
            break;
          }
        }
      } else {
        // Búsqueda directa a la profundidad máxima (para niveles más bajos)
        const orderedMoves = this.orderMoves(game, availableMoves, 0, this.depth);
        
        for (let i = 0; i < Math.min(orderedMoves.length, 25) && !this.shouldStop(); i++) {
          const move = orderedMoves[i];
          
          try {
            const moveResult = game.move(move);
            if (moveResult) {
              const value = this.minimax(game, this.depth - 1, -Infinity, Infinity, false, 0);
              game.undo();
              
              if (value > bestValue) {
                bestValue = value;
                bestMove = move.san;
              }
            }
          } catch (error) {
            console.warn("Error evaluando movimiento:", move.san, error);
            continue;
          }
        }
      }

      // Aleatoriedad para los niveles más bajos
      if (Math.random() < this.randomness) {
        const randomIndex = Math.floor(Math.random() * availableMoves.length);
        bestMove = availableMoves[randomIndex].san;
        console.warn(`🎲 Movimiento aleatorio: ${bestMove}`);
      }

      const timeTaken = Date.now() - this.startTime;
      const nodesPerSecond = Math.round(this.nodesEvaluated / (timeTaken / 1000));
      console.log(`⏱️ Tiempo: ${timeTaken}ms, nodos: ${this.nodesEvaluated}, velocidad: ${nodesPerSecond} nps`);
      console.log(`🏆 Mejor movimiento: ${bestMove} (valor: ${bestValue})`);

      return bestMove;
    } catch (error) {
      console.error("Error en getBestMove:", error);
      // Aquí está el problema corregido: usar la variable "availableMoves" que está definida en este método
      // en lugar de "possibleMoves" que no está definida.
      return this.availableMoves && this.availableMoves.length > 0 ? this.availableMoves[0].san : null;
    }
  }

  // Métodos auxiliares mejorados
  getStats() {
    const timeTaken = Date.now() - this.startTime;
    const nodesPerSecond = timeTaken > 0 ? Math.round(this.nodesEvaluated / (timeTaken / 1000)) : 0;
    
    return {
      nodesEvaluated: this.nodesEvaluated || 0,
      depth: this.depth || 3,
      cacheSize: this.transpositionTable ? this.transpositionTable.size : 0,
      timeLimit: this.timeLimit || 5000,
      randomness: this.randomness || 0.1,
      contempt: this.contempt || 0,
      nodesPerSecond: nodesPerSecond
    };
  }

  clearCache() {
    if (this.transpositionTable) {
      this.transpositionTable.clear();
    }
    if (this.historyTable) {
      this.historyTable.clear();
    }
    console.log("✅ Cache limpiado");
  }

  reset() {
    this.nodesEvaluated = 0;
    
    if (this.transpositionTable) {
      this.transpositionTable.clear();
    }
    if (this.historyTable) {
      this.historyTable.clear();
    }
    
    this.killerMoves = [];
    for (let i = 0; i < 10; i++) {
      this.killerMoves[i] = [];
    }
    
    if (this.usePrincipalVariation) {
      for (let i = 0; i < 64; i++) {
        this.pvLength[i] = 0;
      }
    }
    
    console.log("🔄 Motor de ajedrez reiniciado");
  }

  // Método para verificar si la instancia está correctamente inicializada
  isReady() {
    return this.depth !== undefined && this.transpositionTable !== undefined;
  }
}

export default ChessAI;