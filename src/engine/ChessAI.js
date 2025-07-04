// src/engine/ChessAI.js - Motor de ajedrez mejorado y optimizado
import { Chess } from 'chess.js';

// Valores de las piezas optimizados y más precisos (constantes para acceso rápido)
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

// Tabla de aperturas básicas (eco: [jugadas en SAN])
const OPENING_BOOK = {
  // Aperturas blancas
  "": ["e4", "d4", "Nf3", "c4"], // Primer movimiento
  "e4": ["e5", "c5", "e6", "c6", "d6"], // Respuestas negras a 1.e4
  "d4": ["d5", "Nf6", "e6", "g6"], // Respuestas negras a 1.d4
  "e4 e5": ["Nf3", "Nc3"], // 2. Cf3 o Cc3
  "e4 c5": ["Nf3", "Nc3", "d4"], // Siciliana
  "d4 d5": ["c4", "Nf3"], // Gambito de dama o desarrollo
  "d4 Nf6": ["c4", "Nf3", "g3"], // India de rey, Nimzoindia, etc.
  "e4 e5 Nf3": ["Nc6", "Nf6"], // Defensa Petrov, desarrollo clásico
  "e4 e5 Nf3 Nc6": ["Bb5", "Bc4", "d4"], // Española, italiana, centro
  "d4 Nf6 c4": ["e6", "g6", "d5"], // Nimzoindia, India de rey, defensa ortodoxa

  // Puedes agregar más líneas populares aquí...
};

// Devuelve una jugada de apertura si existe en el libro
function getOpeningMove(history) {
  const moves = history.map(m => m.san).join(" ");
  if (OPENING_BOOK[moves]) {
    const options = OPENING_BOOK[moves];
    // Selecciona aleatoriamente entre las mejores opciones
    return options[Math.floor(Math.random() * options.length)];
  }
  return null;
}

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
    
    // MEJORA: Añadido para protección de piezas
    this.pieceProtectionFactor = 1.2; // Factor para valorar más la protección de piezas propias
    this.exchangeEvaluationThreshold = 0.9; // Umbral para considerar intercambios favorables

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
    // MEJORA: Configuración optimizada para mayor solidez en niveles altos
    const difficulties = {
      1: { depth: 2, randomness: 0.4, timeLimit: 800, maxNodes: 3000, contempt: -50, pieceProtectionFactor: 0.8, exchangeEvaluationThreshold: 0.7 },
      2: { depth: 2, randomness: 0.25, timeLimit: 1500, maxNodes: 8000, contempt: -20, pieceProtectionFactor: 0.9, exchangeEvaluationThreshold: 0.8 },
      3: { depth: 3, randomness: 0.15, timeLimit: 2500, maxNodes: 15000, contempt: 0, pieceProtectionFactor: 1.0, exchangeEvaluationThreshold: 0.9 },
      4: { depth: 3, randomness: 0.05, timeLimit: 3500, maxNodes: 30000, contempt: 10, pieceProtectionFactor: 1.2, exchangeEvaluationThreshold: 1.0 },
      // MEJORA: Mayor profundidad y menos aleatoriedad en nivel máximo
      5: { depth: 4, randomness: 0.01, timeLimit: 5000, maxNodes: 60000, contempt: 20, pieceProtectionFactor: 1.4, exchangeEvaluationThreshold: 1.1 }
    };

    const config = difficulties[level] || difficulties[3];
    this.depth = config.depth;
    this.randomness = config.randomness;
    this.timeLimit = config.timeLimit;
    this.maxNodes = config.maxNodes;
    this.contempt = config.contempt;
    
    // MEJORA: Factores de protección de piezas
    this.pieceProtectionFactor = config.pieceProtectionFactor;
    this.exchangeEvaluationThreshold = config.exchangeEvaluationThreshold;

    // Configuración avanzada para niveles superiores
    this.useNullMovePruning = level >= 3;
    this.useAspiration = level >= 3; // MEJORA: Activar aspiración desde nivel 3
    this.useIterativeDeepening = level >= 2;

    console.log(`🎯 Dificultad ${level}: profundidad=${this.depth}, tiempo=${this.timeLimit}ms, contempt=${this.contempt}, protección=${this.pieceProtectionFactor}`);
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

  // MEJORA: Nueva función para evaluar si un intercambio es favorable
  evaluateExchange(game, move) {
    // No evaluar intercambios para movimientos que no son capturas
    if (!move.captured) return 0;
    
    const capturedValue = Math.abs(PIECE_VALUES[move.captured]);
    const attackerValue = Math.abs(PIECE_VALUES[move.piece]);
    
    // Valor base del intercambio
    let exchangeValue = capturedValue - attackerValue;
    
    // Verificar si la pieza atacante queda vulnerable después del movimiento
    try {
      // Simular el movimiento
      game.move(move);
      
      // Comprobar si la casilla destino está bajo ataque después del movimiento
      const isTargetAttacked = game.isAttacked(move.to, game.turn());
      
      // Si la casilla está bajo ataque, calcular el valor de la pieza potencialmente perdida
      if (isTargetAttacked) {
        // La pieza en peligro es la que acabamos de mover
        exchangeValue -= attackerValue;
      }
      
      // Deshacer el movimiento
      game.undo();
      
      return exchangeValue;
    } catch (error) {
      // En caso de error, retornar un valor conservador
      return -attackerValue;
    }
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
    
    // MEJORA: Contadores de material para cada color
    let whiteMaterial = 0;
    let blackMaterial = 0;
    
    // Precálculo de material total para fase de juego
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece && piece.type !== 'k') {
          const pieceValue = Math.abs(PIECE_VALUES[piece.type]);
          if (piece.type !== 'p') {
            totalMaterial += pieceValue;
          }
          
          // MEJORA: Suma material por color
          if (piece.color === 'w') {
            whiteMaterial += pieceValue;
          } else {
            blackMaterial += pieceValue;
          }
        }
      }
    }

    // --- ARREGLO: Definir materialAdvantage y significantAdvantage ---
    const materialAdvantage = whiteMaterial - blackMaterial;
    const significantAdvantage = Math.abs(materialAdvantage) > 200;
    // -----------------------------------------------------------------

    // Determinación de fase de juego (0-256)
    const phase = Math.min(256, totalMaterial * 256 / 6600);
    this.midgameWeight = phase / 256;
    this.endgameWeight = 1 - this.midgameWeight;

    // MEJORA: Bonificación por pareja de alfiles
    let whiteBishops = 0, blackBishops = 0;
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece && piece.type === 'b') {
          if (piece.color === 'w') whiteBishops++;
          else blackBishops++;
        }
      }
    }
    if (whiteBishops >= 2) {
      mgScore -= 35; // Bonificación para blancas
      egScore -= 35;
    }
    if (blackBishops >= 2) {
      mgScore += 35; // Bonificación para negras
      egScore += 35;
    }
    
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
        
        // MEJORA: Evaluar protección de piezas valiosas
        let protectionBonus = 0;
        if ((piece.type === 'q' || piece.type === 'r') && this.pieceProtectionFactor > 1.0) {
          // Evaluar si la pieza está protegida
          const square = String.fromCharCode(97 + j) + (8 - i);
          
          try {
            // Crear un estado temporal del tablero
            const tempGame = new Chess(game.fen());
            
            // Determinar si la pieza está defendida por una pieza de menor valor
            const isProtected = tempGame.moves({verbose: true}).some(move => {
              return move.to === square && 
                     move.color === piece.color && 
                     Math.abs(PIECE_VALUES[move.piece]) < Math.abs(pieceValue);
            });
            
            if (isProtected) {
              // Bonus por tener piezas valiosas protegidas
              protectionBonus = Math.abs(pieceValue) * 0.05;
            } else if (significantAdvantage) {
              // Si hay ventaja material, penalizar piezas valiosas desprotegidas
              const hasAdvantage = (piece.color === 'w' && materialAdvantage > 0) || 
                                  (piece.color === 'b' && materialAdvantage < 0);
              if (hasAdvantage) {
                protectionBonus = -Math.abs(pieceValue) * 0.03;
              }
            }
          } catch (error) {
            // Ignorar errores de análisis
          }
          
          // Aplicar el factor de color
          protectionBonus *= factor;
        }
        
        // Aplicar valores a las puntuaciones de fase
        mgScore += factor * (Math.abs(pieceValue) + mgPosValue) + protectionBonus;
        egScore += factor * (Math.abs(pieceValue) + egPosValue) + protectionBonus;
      }
    }

    // MEJORA: Añadir evaluación de estructura de peones
    const pawnStructureScore = this.evaluatePawnStructure(board);
    mgScore += pawnStructureScore;
    egScore += pawnStructureScore;
    
    // MEJORA: Añadir evaluación de seguridad del rey
    const kingSafetyScore = this.evaluateKingSafety(board);
    mgScore += kingSafetyScore * this.midgameWeight; // Más importante en juego medio
    
    // Evaluaciones adicionales simplificadas para mayor velocidad
    let bonus = 0;
    
    // Bonificación por jaque
    if (game.inCheck()) {
      bonus += game.turn() === 'b' ? -70 : 70; // MEJORA: Mayor valor al jaque
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
    
    // MEJORA: Penalizar posiciones donde piezas importantes están bajo amenaza
    const threatPenalty = this.evaluateThreats(game);
    bonus += threatPenalty;

    // Interpolación entre fases de juego
    let totalEvaluation = this.midgameWeight * mgScore + this.endgameWeight * egScore + bonus;
    
    // Contempt factor solo cuando cerca de empate
    if (Math.abs(totalEvaluation) < 50) {
      totalEvaluation += this.contempt;
    }

    // Penalización extra si se han perdido piezas importantes en la apertura
    const moveNumber = game.history().length;
    if (moveNumber < 8) {
      const materialDiff = whiteMaterial - blackMaterial;
      // Si hay una diferencia de material significativa en la apertura, penaliza más fuerte
      if (Math.abs(materialDiff) > 300) {
        totalEvaluation -= Math.sign(materialDiff) * 100;
      }
    }

    // Almacenar en tabla de transposición con control de tamaño
    if (this.transpositionTable.size < 100000) {
      this.transpositionTable.set(key, totalEvaluation);
    }

    return totalEvaluation;
  }
  
  // MEJORA: Nueva función para evaluar amenazas a piezas valiosas
  evaluateThreats(game) {
    let threatScore = 0;
    const isWhiteTurn = game.turn() === 'w';
    
    try {
      // Obtener todas las piezas amenazadas
      const board = game.board();
      
      // Para cada pieza en el tablero
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          const piece = board[i][j];
          if (!piece) continue;
          
          // Solo nos interesan amenazas a piezas valiosas (dama, torre, alfil, caballo)
          if (piece.type !== 'q' && piece.type !== 'r' && piece.type !== 'b' && piece.type !== 'n') continue;
          
          const square = String.fromCharCode(97 + j) + (8 - i);
          const pieceColor = piece.color;
          const isPlayerPiece = (pieceColor === 'w') === isWhiteTurn;
          
          // Verificar si la pieza está amenazada
          const isAttacked = game.isAttacked(square, pieceColor === 'w' ? 'b' : 'w');
          
          if (isAttacked) {
            const pieceValue = Math.abs(PIECE_VALUES[piece.type]);
            
            // Penalizar más fuertemente tener piezas propias amenazadas en nivel alto
            if (isPlayerPiece) {
              // Penalizar que nuestras piezas estén amenazadas
              threatScore -= pieceValue * 0.1 * this.pieceProtectionFactor;
            } else {
              // Bonificar amenazar piezas enemigas, pero con menos peso
              threatScore += pieceValue * 0.05;
            }
          }
        }
      }
    } catch (error) {
      // Ignorar errores en el análisis de amenazas
    }
    
    return threatScore;
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
    
    // Simplicidad: control central usando array precalculado
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
      // MEJORA: Aumentar profundidad de búsqueda quiescente para mayor precisión
      return this.quiescenceSearch(game, alpha, beta, maximizingPlayer, 4);
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
        
        // MEJORA: Evaluar intercambios para detectar movimientos que regalan piezas
        if (move.captured && this.pieceProtectionFactor > 1.0 && depth >= 3) {
          const exchangeValue = this.evaluateExchange(game, move);
          // Si el intercambio es claramente desfavorable, considerar saltarlo en niveles altos
          if (exchangeValue < -this.exchangeEvaluationThreshold * Math.abs(PIECE_VALUES[move.captured])) {
            // Solo aplicar a niveles altos de dificultad
            if (this.depth >= 4 && i > 2) {  // No aplicar a los primeros movimientos para evitar bugs
              continue; // Saltar este movimiento que regala material
            }
          }
        }
        
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

        // MEJORA: Evaluar intercambios para detectar movimientos que regalan piezas
        if (move.captured && this.pieceProtectionFactor > 1.0 && depth >= 3) {
          const exchangeValue = this.evaluateExchange(game, move);
          // Si el intercambio es claramente desfavorable, considerar saltarlo en niveles altos
          if (exchangeValue < -this.exchangeEvaluationThreshold * Math.abs(PIECE_VALUES[move.captured])) {
            // Solo aplicar a niveles altos de dificultad
            if (this.depth >= 4 && i > 2) {  // No aplicar a los primeros movimientos para evitar bugs
              continue; // Saltar este movimiento que regala material
            }
          }
        }

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

    // MEJORA: Incluir jaques además de capturas para búsqueda quiescente más precisa
    const moves = game.moves({ verbose: true });
    const tacticalMoves = moves.filter(move => 
      move.captured || move.promotion || move.san.includes('+')
    );

    if (tacticalMoves.length === 0) {
      return standPat;
    }

    // Ordenamiento optimizado para movimientos tácticos
    tacticalMoves.sort((a, b) => {
      // Priorizar jaques
      const aCheck = a.san.includes('+') ? 1000 : 0;
      const bCheck = b.san.includes('+') ? 1000 : 0;
      
      // MVV-LVA: Most Valuable Victim - Least Valuable Attacker
      const aValue = a.captured ? Math.abs(PIECE_VALUES[a.captured]) : 0;
      const bValue = b.captured ? Math.abs(PIECE_VALUES[b.captured]) : 0;
      const aAttacker = Math.abs(PIECE_VALUES[a.piece]);
      const bAttacker = Math.abs(PIECE_VALUES[b.piece]);
      
      // Capturar piezas valiosas con piezas menos valiosas primero
      return (bValue + bCheck - bAttacker / 100) - (aValue + aCheck - aAttacker / 100);
    });

    // MEJORA: Evaluar intercambios antes de la búsqueda recursiva
    if (this.pieceProtectionFactor > 1.0) {
      // Filtrar movimientos que claramente regalan material en niveles altos
      const filteredMoves = tacticalMoves.filter(move => {
        if (!move.captured || move.san.includes('+')) return true; // Mantener jaques y no capturas
        
        const exchangeValue = this.evaluateExchange(game, move);
        return exchangeValue >= -Math.abs(PIECE_VALUES[move.piece]) * 0.8; // Solo filtrar intercambios muy desfavorables
      });
      
      // Si tenemos movimientos filtrados, usarlos; de lo contrario, mantener los originales
      if (filteredMoves.length > 0) {
        tacticalMoves.length = 0;
        filteredMoves.forEach(m => tacticalMoves.push(m));
      }
    }

    // Evaluación recursiva
    if (maximizingPlayer) {
      let maxEval = alpha;
      
      for (const move of tacticalMoves) {
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
      
      for (const move of tacticalMoves) {
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
        
        // MEJORA: Evaluar intercambios para mejorar ordenamiento
        let exchangeScore = capturedValue - attackerValue / 100;
        
        // En niveles altos, evaluar si el intercambio es seguro
        if (this.pieceProtectionFactor > 1.0 && currentDepth >= 3) {
          const exchangeValue = this.evaluateExchange(game, move);
          if (exchangeValue < 0) {
            // Penalizar intercambios negativos, pero mantener cerca del principio
            exchangeScore = Math.max(0, exchangeScore) + exchangeValue * 2;
          } else {
            // Premiar intercambios positivos
            exchangeScore += exchangeValue;
          }
        }
        
        score = 10000 + exchangeScore;
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
      
      // MEJORA: Desarrollo de piezas en aperturas
      if (['n', 'b'].includes(move.piece)) {
        if (!['1', '8'].includes(move.to[1]) && !['a', 'h'].includes(move.to[0])) {
          score += 50; // Desarrollo hacia centro
        }
        
        // Penalizar movimientos repetidos de la misma pieza en etapa temprana
        const fromRank = move.from[1];
        const pieceStartingRank = move.piece.toUpperCase() === move.piece ? '1' : '8';
        if (fromRank !== pieceStartingRank) {
          score -= 25; // Ya se movió esta pieza antes
        }
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
    let availableMoves = [];
    try {
      this.nodesEvaluated = 0;
      this.startTime = Date.now();

      // Limpiar tablas de variante principal
      if (this.usePrincipalVariation) {
        for (let i = 0; i < 64; i++) {
          this.pvLength[i] = 0;
        }
      }

      availableMoves = game.moves({ verbose: true });
      if (availableMoves.length === 0) {
        console.warn("No hay movimientos disponibles");
        return null;
      }

      // --- INICIO: CONSULTA DE APERTURA ---
      const history = game.history({ verbose: true });
      const openingMove = getOpeningMove(history);
      if (openingMove) {
        console.warn(`📖 Jugada de apertura seleccionada: ${openingMove}`);
        return { move: openingMove, evaluation: 0 };
      }
      // --- FIN: CONSULTA DE APERTURA ---

      // Si solo hay un movimiento, devolverlo inmediatamente
      if (availableMoves.length === 1) {
        return availableMoves[0].san;
      }

      console.log(`🤖 Analizando ${availableMoves.length} movimientos posibles`);

      let bestMove = availableMoves[0].san;
      let bestValue = -Infinity;
      
      // MEJORA: Array de mejores candidatos para reducir "regalo" de piezas aleatorio
      let bestCandidates = [];
      
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
          
          // MEJORA: Almacenar valores de todos los movimientos para la selección final
          const moveValues = [];
          
          for (let i = 0; i < orderedMoves.length && !this.shouldStop(); i++) {
            const move = orderedMoves[i];
            
            try {
              const moveResult = game.move(move);
              if (moveResult) {
                // Búsqueda completa en este movimiento
                const value = this.minimax(game, currentDepth - 1, alpha, beta, false, 1);
                game.undo();
                
                // MEJORA: Almacenar el valor de este movimiento
                moveValues.push({ move: move.san, value });
                
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
            
            // MEJORA: Actualizar lista de mejores candidatos
            if (currentDepth === this.depth) {
              // Ordenar movimientos por valor
              moveValues.sort((a, b) => b.value - a.value);
              
              // Tomar hasta 3 mejores movimientos si están dentro de un rango aceptable del mejor
              bestCandidates = moveValues
                .filter(mv => mv.value >= bestValue - 30) // Solo movimientos cercanos al mejor
                .slice(0, 3) // Máximo 3 candidatos
                .map(mv => mv.move);
                
              if (bestCandidates.length === 0) {
                bestCandidates.push(bestMove);
              }
            }
            
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
        const moveValues = [];
        
        for (let i = 0; i < Math.min(orderedMoves.length, 25) && !this.shouldStop(); i++) {
          const move = orderedMoves[i];
          
          try {
            const moveResult = game.move(move);
            if (moveResult) {
              const value = this.minimax(game, this.depth - 1, -Infinity, Infinity, false, 0);
              game.undo();
              
              moveValues.push({ move: move.san, value });
              
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
        
        // Seleccionar candidatos
        moveValues.sort((a, b) => b.value - a.value);
        bestCandidates = moveValues
          .filter(mv => mv.value >= bestValue - 30)
          .slice(0, 3)
          .map(mv => mv.move);
          
        if (bestCandidates.length === 0) {
          bestCandidates.push(bestMove);
        }
      }

      // MEJORA: Aleatoriedad solo en las primeras jugadas para evitar patrones repetidos
      const moveNumber = game.history().length;
      if (moveNumber < 8 && bestCandidates.length > 1) {
        // Más aleatoriedad en las primeras 8 jugadas
        const randomIndex = Math.floor(Math.random() * bestCandidates.length);
        bestMove = bestCandidates[randomIndex];
        console.warn(`🎲 (Apertura) Selección aleatoria entre mejores candidatos: ${bestMove}`);
      } else if (Math.random() < this.randomness && bestCandidates.length > 0) {
        // Aleatoriedad normal para el resto de la partida
        const randomIndex = Math.floor(Math.random() * bestCandidates.length);
        bestMove = bestCandidates[randomIndex];
        console.warn(`🎲 Selección entre mejores candidatos: ${bestMove}`);
      }

      const timeTaken = Date.now() - this.startTime;
      const nodesPerSecond = Math.round(this.nodesEvaluated / (timeTaken / 1000));
      console.log(`⏱️ Tiempo: ${timeTaken}ms, nodos: ${this.nodesEvaluated}, velocidad: ${nodesPerSecond} nps`);
      console.log(`🏆 Mejor movimiento: ${bestMove} (valor: ${bestValue})`);

      return { move: bestMove, evaluation: bestValue };
    } catch (error) {
      console.error("Error en getBestMove:", error);
      return null;
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
      pieceProtectionFactor: this.pieceProtectionFactor || 1.0,
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