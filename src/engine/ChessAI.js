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

// 🏆 MOTOR DE ANÁLISIS DE APERTURAS DE AJEDREZ PROFESIONAL 🏆
// Sistema completo con más de 500 variantes principales y análisis posicional

// Tabla de aperturas básicas (eco: [jugadas en SAN])
const OPENING_BOOK = {
  // ========== PRIMER MOVIMIENTO ==========
  "": ["e4", "d4", "Nf3", "c4", "g3", "f4"], // Primer movimiento
  
  // ========== RESPUESTAS A 1.e4 ==========
  "e4": ["e5", "c5", "e6", "c6", "d6", "Nf6", "g6", "d5", "Nc6", "f5"], // Respuestas negras a 1.e4
  
  // ========== RESPUESTAS A 1.d4 ==========
  "d4": ["d5", "Nf6", "e6", "g6", "f5", "c5", "Nc6", "e5", "c6", "d6"], // Respuestas negras a 1.d4
  
  // ========== APERTURAS ABIERTAS (1.e4 e5) ==========
  "e4 e5": ["Nf3", "Nc3", "f4", "Bc4", "d4"], // Desarrollo natural, Vienesa, Gambito del Rey
  "e4 e5 Nf3": ["Nc6", "Nf6", "f5", "d6", "Be7"], // Defensa Petrov, Philidor, etc.
  "e4 e5 Nf3 Nc6": ["Bb5", "Bc4", "d4", "Nc3", "Be2"], // Española, Italiana, Centro, Vienesa
  
  // Apertura Española (Ruy López)
  "e4 e5 Nf3 Nc6 Bb5": ["a6", "Nf6", "f5", "g6", "Be7", "d6"], // Defensa Morphy, Berlín, Schliemann
  "e4 e5 Nf3 Nc6 Bb5 a6": ["Ba4", "Bxc6", "Bc4"], // Morphy, Intercambio, Aaplazada
  "e4 e5 Nf3 Nc6 Bb5 a6 Ba4": ["Nf6", "b5", "f5", "d6"], // Defensa Abierta, Cerrada
  "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6": ["O-O", "d3", "Qe2"], // Variante Cerrada
  "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O": ["Be7", "Nxe4", "b5"], // Defensa Cerrada, Abierta
  "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7": ["Re1", "d3", "Bxc6"], // Sistema Breyer, Chigorin
  "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1": ["b5", "d6", "O-O"], // Variante Marshall, Zaitsev
  
  // Defensa Berlín
  "e4 e5 Nf3 Nc6 Bb5 Nf6": ["O-O", "d3", "Qe2"], // Berlín clásico
  "e4 e5 Nf3 Nc6 Bb5 Nf6 O-O": ["Nxe4", "Be7"], // Defensa Berlín
  "e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4": ["d4", "Re1"], // Variante Río de Janeiro
  
  // Apertura Italiana
  "e4 e5 Nf3 Nc6 Bc4": ["Bc5", "f5", "Be7", "Nf6"], // Italiana clásica, Rousseau
  "e4 e5 Nf3 Nc6 Bc4 Bc5": ["c3", "d3", "O-O", "b4"], // Giuoco Piano, Gambito Evans
  "e4 e5 Nf3 Nc6 Bc4 Bc5 c3": ["Nf6", "f5", "d6"], // Giuoco Piano
  "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6": ["d4", "d3", "O-O"], // Centro, Húngara
  "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4": ["exd4", "Bb4+"], // Ataque Max Lange
  
  // Gambito Evans
  "e4 e5 Nf3 Nc6 Bc4 Bc5 b4": ["Bxb4", "Bb6"], // Gambito Evans aceptado/declinado
  "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4": ["c3", "a3"], // Gambito Evans aceptado
  
  // Defensa Petrov
  "e4 e5 Nf3 Nf6": ["Nxe5", "d3", "Nc3"], // Petrov clásico
  "e4 e5 Nf3 Nf6 Nxe5": ["d6", "Nc6"], // Petrov principal
  "e4 e5 Nf3 Nf6 Nxe5 d6": ["Nf3", "Nc4"], // Petrov principal
  "e4 e5 Nf3 Nf6 Nxe5 d6 Nf3": ["Nxe4", "Be7"], // Petrov simétrico
  
  // Gambito del Rey
  "e4 e5 f4": ["exf4", "d5", "Bc5"], // Gambito del Rey aceptado/declinado
  "e4 e5 f4 exf4": ["Nf3", "Bc4", "Kf1"], // Gambito del Rey aceptado
  "e4 e5 f4 exf4 Nf3": ["g5", "d6", "Nf6"], // Defensa Kieseritzky, Cunningham
  "e4 e5 f4 exf4 Nf3 g5": ["h4", "Bc4"], // Gambito Kieseritzky
  
  // Gambito Vienés
  "e4 e5 Nc3": ["Nf6", "Nc6", "f5"], // Vienés clásico
  "e4 e5 Nc3 Nf6": ["f4", "Bc4", "g3"], // Ataque Vienés
  "e4 e5 Nc3 Nf6 f4": ["d5", "exf4"], // Gambito Vienés
  
  // ========== DEFENSAS SEMI-ABIERTAS ==========
  
  // Defensa Siciliana
  "e4 c5": ["Nf3", "Nc3", "d4", "f4", "Bb5+"], // Siciliana
  "e4 c5 Nf3": ["d6", "Nc6", "g6", "e6", "Nf6"], // Siciliana Najdorf, Dragón, Francesa
  "e4 c5 Nf3 d6": ["d4", "Bb5+", "c3"], // Siciliana Najdorf
  "e4 c5 Nf3 d6 d4": ["cxd4", "Nf6"], // Siciliana abierta
  "e4 c5 Nf3 d6 d4 cxd4": ["Nxd4", "Qxd4"], // Siciliana abierta
  "e4 c5 Nf3 d6 d4 cxd4 Nxd4": ["Nf6", "g6", "e6"], // Najdorf, Dragón, Scheveningen
  
  // Siciliana Najdorf
  "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6": ["Nc3", "f3", "Bd3"], // Najdorf
  "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3": ["a6", "g6", "e6"], // Najdorf principal
  "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6": ["Be3", "f3", "Bg5"], // Ataque Inglés, Be3
  "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3": ["e5", "e6", "Ng4"], // Najdorf Be3
  "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 f3": ["e5", "e6"], // Ataque Inglés
  
  // Siciliana Dragón
  "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6": ["Be3", "f3", "Bg5"], // Dragón principal
  "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3": ["Bg7", "Nc6"], // Dragón positional
  "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 f3": ["Bg7", "Nc6"], // Ataque Yugoslavo
  
  // Siciliana Acelerada
  "e4 c5 Nf3 g6": ["d4", "c3", "c4"], // Dragón Acelerado
  "e4 c5 Nf3 g6 d4": ["cxd4", "Bg7"], // Dragón Acelerado
  "e4 c5 Nf3 g6 d4 cxd4": ["Nxd4", "Qxd4"], // Dragón Acelerado
  "e4 c5 Nf3 g6 d4 cxd4 Nxd4": ["Bg7", "Nc6"], // Dragón Acelerado
  
  // Siciliana Cerrada
  "e4 c5 Nc3": ["Nc6", "d6", "g6"], // Siciliana Cerrada
  "e4 c5 Nc3 Nc6": ["g3", "f4", "Nf3"], // Siciliana Cerrada
  "e4 c5 Nc3 Nc6 g3": ["g6", "d6", "e6"], // Sistema Botvinnik
  
  // Defensa Francesa
  "e4 e6": ["d4", "d3", "Nf3"], // Francesa
  "e4 e6 d4": ["d5", "c5", "b6"], // Francesa clásica
  "e4 e6 d4 d5": ["Nc3", "Nd2", "exd5"], // Francesa Winawer, Tarrasch, Intercambio
  "e4 e6 d4 d5 Nc3": ["Bb4", "Nf6", "dxe4"], // Winawer, Clásica
  "e4 e6 d4 d5 Nc3 Bb4": ["e5", "exd5", "a3"], // Winawer principal
  "e4 e6 d4 d5 Nc3 Bb4 e5": ["c5", "Ne7"], // Winawer e5
  "e4 e6 d4 d5 Nc3 Nf6": ["Bg5", "e5"], // Francesa Clásica
  "e4 e6 d4 d5 Nc3 Nf6 Bg5": ["Be7", "dxe4"], // Clásica Bg5
  
  // Defensa Caro-Kann
  "e4 c6": ["d4", "d3", "Nf3"], // Caro-Kann
  "e4 c6 d4": ["d5", "g6", "e6"], // Caro-Kann principal
  "e4 c6 d4 d5": ["Nc3", "Nd2", "exd5"], // Caro-Kann Clásica, Panov
  "e4 c6 d4 d5 Nc3": ["dxe4", "g6", "Nf6"], // Caro-Kann principal
  "e4 c6 d4 d5 Nc3 dxe4": ["Nxe4", "f3"], // Caro-Kann principal
  "e4 c6 d4 d5 Nc3 dxe4 Nxe4": ["Bf5", "Nf6"], // Caro-Kann principal
  
  // Defensa Alekhine
  "e4 Nf6": ["e5", "d3", "Nc3"], // Alekhine
  "e4 Nf6 e5": ["Nd5", "Ng8"], // Alekhine principal
  "e4 Nf6 e5 Nd5": ["d4", "c4"], // Alekhine principal
  "e4 Nf6 e5 Nd5 d4": ["d6", "c6"], // Alekhine Intercambio
  "e4 Nf6 e5 Nd5 c4": ["Nb6", "Nc7"], // Alekhine Cuatro Peones
  
  // Defensa Escandinava
  "e4 d5": ["exd5", "d4"], // Escandinava
  "e4 d5 exd5": ["Qxd5", "Nf6"], // Escandinava principal
  "e4 d5 exd5 Qxd5": ["Nc3", "Nf3"], // Escandinava clásica
  "e4 d5 exd5 Qxd5 Nc3": ["Qa5", "Qd6"], // Escandinava principal
  
  // Defensa Pirc
  "e4 d6": ["d4", "Nf3", "f4"], // Pirc
  "e4 d6 d4": ["Nf6", "g6"], // Pirc principal
  "e4 d6 d4 Nf6": ["Nc3", "f3"], // Pirc clásica
  "e4 d6 d4 Nf6 Nc3": ["g6", "e5"], // Pirc principal
  "e4 d6 d4 Nf6 Nc3 g6": ["f4", "Be2"], // Ataque Austriaco
  
  // Defensa Moderna
  "e4 g6": ["d4", "Nf3", "c4"], // Moderna
  "e4 g6 d4": ["Bg7", "d6"], // Moderna principal
  "e4 g6 d4 Bg7": ["Nc3", "c4"], // Moderna clásica
  
  // ========== APERTURAS CERRADAS (1.d4 d5) ==========
  
  // Gambito de Dama
  "d4 d5": ["c4", "Nf3", "Bf4"], // Gambito de Dama, Londres
  "d4 d5 c4": ["e6", "c6", "dxc4", "Nf6"], // Gambito de Dama aceptado/declinado
  "d4 d5 c4 e6": ["Nc3", "Nf3", "cxd5"], // Gambito de Dama declinado
  "d4 d5 c4 e6 Nc3": ["Nf6", "c6", "Be7"], // Gambito de Dama ortodoxo
  "d4 d5 c4 e6 Nc3 Nf6": ["Bg5", "Nf3", "cxd5"], // Ortodoxo, Variante Tartakower
  "d4 d5 c4 e6 Nc3 Nf6 Bg5": ["Be7", "Nbd7"], // Ortodoxo clásico
  "d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7": ["e3", "Nf3"], // Ortodoxo principal
  "d4 d5 c4 e6 Nc3 Nf6 Nf3": ["Be7", "c6"], // Variante Tartakower
  
  // Defensa Eslava
  "d4 d5 c4 c6": ["Nf3", "Nc3", "cxd5"], // Eslava
  "d4 d5 c4 c6 Nf3": ["Nf6", "e6"], // Eslava principal
  "d4 d5 c4 c6 Nf3 Nf6": ["Nc3", "e3"], // Eslava clásica
  "d4 d5 c4 c6 Nf3 Nf6 Nc3": ["dxc4", "e6"], // Eslava principal
  "d4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4": ["a4", "e3"], // Eslava aceptada
  
  // Semi-Eslava
  "d4 d5 c4 c6 Nf3 Nf6 Nc3 e6": ["Bg5", "e3"], // Semi-Eslava
  "d4 d5 c4 c6 Nf3 Nf6 Nc3 e6 Bg5": ["dxc4", "h6"], // Semi-Eslava principal
  "d4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3": ["Nbd7", "Be7"], // Semi-Eslava Merano
  
  // Gambito de Dama Aceptado
  "d4 d5 c4 dxc4": ["Nf3", "e3", "e4"], // Gambito de Dama aceptado
  "d4 d5 c4 dxc4 Nf3": ["Nf6", "e6"], // GDA clásico
  "d4 d5 c4 dxc4 Nf3 Nf6": ["e3", "Nc3"], // GDA principal
  "d4 d5 c4 dxc4 Nf3 Nf6 e3": ["e6", "Bg4"], // GDA central
  
  // ========== DEFENSAS INDIAS ==========
  
  // Defensa India de Rey
  "d4 Nf6": ["c4", "Nf3", "Bg5"], // India de Rey
  "d4 Nf6 c4": ["e6", "g6", "d5"], // India de Rey, Nimzoindia
  "d4 Nf6 c4 g6": ["Nc3", "Nf3", "g3"], // India de Rey clásica
  "d4 Nf6 c4 g6 Nc3": ["Bg7", "d5"], // India de Rey principal
  "d4 Nf6 c4 g6 Nc3 Bg7": ["e4", "Nf3"], // India de Rey Clásica, Fianchetto
  "d4 Nf6 c4 g6 Nc3 Bg7 e4": ["d6", "O-O"], // Ataque Cuatro Peones
  "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6": ["f4", "Nf3"], // Ataque Cuatro Peones
  "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3": ["O-O", "c5"], // India de Rey Clásica
  "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O": ["Be2", "h3"], // Variante Petrosian
  
  // Sistema Fianchetto
  "d4 Nf6 c4 g6 g3": ["Bg7", "d5"], // Sistema Fianchetto
  "d4 Nf6 c4 g6 g3 Bg7": ["Bg2", "Nc3"], // Fianchetto principal
  "d4 Nf6 c4 g6 g3 Bg7 Bg2": ["O-O", "d6"], // Fianchetto clásico
  
  // Defensa Nimzoindia
  "d4 Nf6 c4 e6": ["Nc3", "Nf3", "g3"], // Nimzoindia
  "d4 Nf6 c4 e6 Nc3": ["Bb4", "d5"], // Nimzoindia clásica
  "d4 Nf6 c4 e6 Nc3 Bb4": ["e3", "Qc2", "a3"], // Nimzoindia principal
  "d4 Nf6 c4 e6 Nc3 Bb4 e3": ["O-O", "c5"], // Nimzoindia Rubinstein
  "d4 Nf6 c4 e6 Nc3 Bb4 Qc2": ["O-O", "d5"], // Nimzoindia Clásica
  "d4 Nf6 c4 e6 Nc3 Bb4 a3": ["Bxc3+", "Be7"], // Nimzoindia Sämisch
  
  // Defensa India de Dama
  "d4 Nf6 c4 e6 Nf3": ["b6", "d5"], // India de Dama
  "d4 Nf6 c4 e6 Nf3 b6": ["g3", "e3"], // India de Dama principal
  "d4 Nf6 c4 e6 Nf3 b6 g3": ["Ba6", "Bb7"], // India de Dama Fianchetto
  "d4 Nf6 c4 e6 Nf3 b6 g3 Ba6": ["b3", "Qa4"], // India de Dama Petrosian
  
  // Defensa Grünfeld
  "d4 Nf6 c4 g6 Nc3 d5": ["cxd5", "Nf3"], // Grünfeld
  "d4 Nf6 c4 g6 Nc3 d5 cxd5": ["Nxd5", "Qxd5"], // Grünfeld Intercambio
  "d4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5": ["e4", "Nf3"], // Grünfeld Intercambio
  "d4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4": ["Nxc3", "Nb6"], // Grünfeld principal
  "d4 Nf6 c4 g6 Nc3 d5 Nf3": ["Bg7", "dxc4"], // Grünfeld Ruso
  
  // Defensa Benko
  "d4 Nf6 c4 c5": ["d5", "dxc5"], // Benko
  "d4 Nf6 c4 c5 d5": ["b5", "e6"], // Benko principal
  "d4 Nf6 c4 c5 d5 b5": ["cxb5", "a4"], // Benko Gambito
  "d4 Nf6 c4 c5 d5 b5 cxb5": ["a6", "g6"], // Benko Gambito aceptado
  
  // ========== APERTURAS HIPERMODERNAS ==========
  
  // Apertura Inglesa
  "c4": ["e5", "Nf6", "c5", "e6", "f5"], // Inglesa
  "c4 e5": ["Nc3", "g3", "Nf3"], // Inglesa Simétrica
  "c4 e5 Nc3": ["Nf6", "f5", "Nc6"], // Inglesa principal
  "c4 e5 Nc3 Nf6": ["g3", "Nf3"], // Inglesa Simétrica
  "c4 e5 Nc3 Nf6 g3": ["Bb4", "d5"], // Inglesa Dragón Invertido
  
  // Apertura Inglesa vs Siciliana
  "c4 c5": ["Nc3", "Nf3", "g3"], // Inglesa Simétrica
  "c4 c5 Nc3": ["Nc6", "Nf6", "g6"], // Inglesa Simétrica
  "c4 c5 Nc3 Nc6": ["g3", "Nf3"], // Inglesa Simétrica
  "c4 c5 Nc3 Nc6 g3": ["g6", "e6"], // Inglesa Simétrica
  
  // Apertura Reti
  "Nf3": ["d5", "Nf6", "f5", "c5"], // Reti
  "Nf3 d5": ["c4", "g3", "d4"], // Reti principal
  "Nf3 d5 c4": ["d4", "e6", "c6"], // Reti clásica
  "Nf3 d5 c4 d4": ["b4", "e3"], // Reti Gambito
  "Nf3 Nf6": ["c4", "g3", "d4"], // Reti vs Nf6
  "Nf3 Nf6 c4": ["c5", "e6", "g6"], // Reti transpone
  "Nf3 Nf6 g3": ["g6", "d5"], // Reti Fianchetto
  
  // Sistema Londres
  "d4 d5 Bf4": ["Nf6", "c5", "e6"], // Sistema Londres
  "d4 Nf6 Bf4": ["c5", "e6", "g6"], // Londres vs Nf6
  "d4 Nf6 Bf4 c5": ["e3", "c3"], // Londres principal
  "d4 Nf6 Bf4 e6": ["e3", "Nf3"], // Londres clásico
  "d4 Nf6 Bf4 g6": ["Nc3", "e3"], // Londres vs Fianchetto
  
  // Sistema Colle
  "d4 d5 Nf3": ["Nf6", "c5", "e6"], // Sistema Colle
  "d4 d5 Nf3 Nf6": ["e3", "c4"], // Colle principal
  "d4 d5 Nf3 Nf6 e3": ["e6", "c5"], // Colle clásico
  "d4 d5 Nf3 Nf6 e3 e6": ["Bd3", "c4"], // Colle System
  "d4 d5 Nf3 Nf6 e3 e6 Bd3": ["c5", "Be7"], // Colle principal
  
  // Apertura Catalán
  "d4 Nf6 c4 e6 g3": ["d5", "Be7"], // Catalán
  "d4 Nf6 c4 e6 g3 d5": ["Bg2", "Nf3"], // Catalán principal
  "d4 Nf6 c4 e6 g3 d5 Bg2": ["Be7", "dxc4"], // Catalán clásico
  "d4 Nf6 c4 e6 g3 d5 Bg2 Be7": ["Nf3", "Nc3"], // Catalán cerrado
  "d4 Nf6 c4 e6 g3 d5 Bg2 dxc4": ["Nf3", "Qa4+"], // Catalán abierto
  
  // ========== GAMBITOS ESPECIALES ==========
  
  // Gambito Blackmar-Diemer
  "d4 d5 e4": ["dxe4", "c6"], // Blackmar-Diemer
  "d4 d5 e4 dxe4": ["Nc3", "f3"], // BDG principal
  "d4 d5 e4 dxe4 Nc3": ["Nf6", "e5"], // BDG aceptado
  "d4 d5 e4 dxe4 f3": ["exf3", "e5"], // BDG Ryder
  
  // Gambito Budapest
  "d4 Nf6 c4 e5": ["dxe5", "d5"], // Budapest
  "d4 Nf6 c4 e5 dxe5": ["Ne4", "Ng4"], // Budapest principal
  "d4 Nf6 c4 e5 dxe5 Ne4": ["Nf3", "a3"], // Budapest Fajarowicz
  "d4 Nf6 c4 e5 dxe5 Ng4": ["Nf3", "e4"], // Budapest Adler
  
  // Gambito Volga (Benko)
  "d4 Nf6 c4 c5 d5 b5": ["cxb5", "a4"], // Volga/Benko
  "d4 Nf6 c4 c5 d5 b5 cxb5": ["a6", "g6"], // Volga aceptado
  "d4 Nf6 c4 c5 d5 b5 cxb5 a6": ["b6", "bxa6"], // Volga principal
  "d4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6": ["Bxa6", "g6"], // Volga compensación
  
  // Gambito Trompowsky
  "d4 Nf6 Bg5": ["e6", "d5", "c5"], // Trompowsky
  "d4 Nf6 Bg5 e6": ["e4", "Nd2"], // Trompowsky principal
  "d4 Nf6 Bg5 d5": ["Bxf6", "e3"], // Trompowsky intercambio
  "d4 Nf6 Bg5 c5": ["Bxf6", "d5"], // Trompowsky c5
  
  // ========== APERTURAS IRREGULARES ==========
  
  // Apertura Bird
  "f4": ["d5", "Nf6", "e5", "c5"], // Bird
  "f4 d5": ["Nf3", "e3", "b3"], // Bird principal
  "f4 d5 Nf3": ["Nf6", "c5"], // Bird clásica
  "f4 d5 Nf3 Nf6": ["e3", "g3"], // Bird simétrica
  "f4 d5 Nf3 Nf6 e3": ["e6", "c5"], // Bird principal
  
  // Apertura Larsen
  "b3": ["e5", "d5", "Nf6"], // Larsen
  "b3 e5": ["Bb2", "e3"], // Larsen principal
  "b3 e5 Bb2": ["Nc6", "d6"], // Larsen vs e5
  "b3 d5": ["Bb2", "Nf3"], // Larsen vs d5
  "b3 Nf6": ["Bb2", "f4"], // Larsen vs Nf6
  
  // Apertura Sokolsky
  "b4": ["e5", "d5", "Nf6"], // Sokolsky (Orangután)
  "b4 e5": ["Bb2", "a3"], // Sokolsky principal
  "b4 e5 Bb2": ["Bxb4", "f6"], // Sokolsky aceptado
  "b4 d5": ["Bb2", "e3"], // Sokolsky vs d5
  "b4 Nf6": ["Bb2", "a3"], // Sokolsky vs Nf6
  
  // Apertura Anderssen
  "a3": ["e5", "d5", "Nf6"], // Anderssen
  "a3 e5": ["c4", "e4"], // Anderssen principal
  "a3 d5": ["d4", "c4"], // Anderssen vs d5
  "a3 Nf6": ["d4", "Nf3"], // Anderssen vs Nf6
  
  // Apertura Nimzowitsch-Larsen
  "b3 e5 Bb2 Nc6": ["e3", "f4"], // Nimzowitsch-Larsen
  "b3 e5 Bb2 Nc6 e3": ["d5", "Nf6"], // N-L principal
  "b3 e5 Bb2 Nc6 f4": ["exf4", "d6"], // N-L ataque
  
  // ========== VARIANTES ESPECIALES Y TRAMPAS ==========
  
  // Trampa Légal
  "e4 e5 Nf3 Nc6 Bc4 d6": ["Nc3", "O-O"], // Preparación trampa
  "e4 e5 Nf3 Nc6 Bc4 d6 Nc3": ["Bg4", "f5"], // Trampa Légal
  "e4 e5 Nf3 Nc6 Bc4 d6 Nc3 Bg4": ["h3", "Nxe5"], // Trampa activada
  
  // Ataque Fried Liver
  "e4 e5 Nf3 Nc6 Bc4 Nf6": ["Ng5", "d3"], // Preparación Fried Liver
  "e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5": ["d5", "Bc5"], // Defensa Two Knights
  "e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5": ["exd5", "Nxd5"], // Fried Liver
  "e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5": ["Nxd5", "Na5"], // Fried Liver variantes
  "e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5": ["Nxf7", "d3"], // Fried Liver sacrificio
  
  // Defensa Philidor
  "e4 e5 Nf3 d6": ["d4", "Bc4"], // Philidor
  "e4 e5 Nf3 d6 d4": ["exd4", "Nf6"], // Philidor principal
  "e4 e5 Nf3 d6 d4 exd4": ["Nxd4", "Qxd4"], // Philidor intercambio
  "e4 e5 Nf3 d6 d4 Nf6": ["Nc3", "dxe5"], // Philidor Hanham
  "e4 e5 Nf3 d6 d4 Nf6 Nc3": ["Nbd7", "Be7"], // Philidor sistema
  
  // Defensa Húngara
  "e4 e5 Nf3 Nc6 Bc4 Be7": ["d3", "Nc3"], // Húngara
  "e4 e5 Nf3 Nc6 Bc4 Be7 d3": ["Nf6", "d6"], // Húngara principal
  "e4 e5 Nf3 Nc6 Bc4 Be7 d3 Nf6": ["Nc3", "Bg5"], // Húngara desarrollo
  
  // Defensa Damiano
  "e4 e5 Nf3 f6": ["Nxe5", "d4"], // Damiano (débil)
  "e4 e5 Nf3 f6 Nxe5": ["fxe5", "Qe7"], // Damiano refutación
  "e4 e5 Nf3 f6 Nxe5 fxe5": ["Qh5+", "d4"], // Damiano ganador
  
  // Defensa Elefante
  "e4 e5 Nf3 Nc6 Bc4 Be7": ["d3", "Nc3"], // Elefante
  "e4 e5 Nf3 Nc6 Bc4 Be7 d3": ["Nf6", "d6"], // Elefante principal
  
  // ========== SISTEMAS ESPECIALES ==========
  
  // Sistema Hedgehog
  "c4 c5 Nf3 Nf6 g3 b6": ["Bg2", "d4"], // Hedgehog setup
  "c4 c5 Nf3 Nf6 g3 b6 Bg2": ["Bb7", "e6"], // Hedgehog principal
  "c4 c5 Nf3 Nf6 g3 b6 Bg2 Bb7": ["O-O", "d4"], // Hedgehog desarrollo
  "c4 c5 Nf3 Nf6 g3 b6 Bg2 Bb7 O-O": ["e6", "Be7"], // Hedgehog completo
  
  // Sistema Maróczy
  "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6": ["c4", "Be3"], // Maróczy bind
  "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6 c4": ["Bg7", "Nf6"], // Maróczy principal
  "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6 c4 Bg7": ["Be3", "Nc3"], // Maróczy setup
  
  // Sistema Stonewall
  "d4 d5 e3 Nf6 Bd3": ["c5", "e6"], // Stonewall
  "d4 d5 e3 Nf6 Bd3 c5": ["c3", "f4"], // Stonewall principal
  "d4 d5 e3 Nf6 Bd3 e6": ["f4", "Nd2"], // Stonewall holandés
  "d4 d5 e3 Nf6 Bd3 e6 f4": ["c5", "Be7"], // Stonewall ataque
  
  // ========== APERTURAS POCO COMUNES ==========
  
  // Apertura Polonesa
  "b4 e5": ["Bb2", "a3"], // Polonesa
  "b4 e5 Bb2": ["Bxb4", "f6"], // Polonesa principal
  "b4 e5 Bb2 Bxb4": ["Bxe5", "c3"], // Polonesa aceptada
  
  // Apertura Grob
  "g4": ["d5", "e5", "c5"], // Grob
  "g4 d5": ["Bg2", "h3"], // Grob principal
  "g4 e5": ["Bg2", "f3"], // Grob vs e5
  "g4 c5": ["Bg2", "f3"], // Grob vs c5
  
  // Apertura Amar
  "Nh3": ["d5", "e5", "Nf6"], // Amar
  "Nh3 d5": ["g3", "f4"], // Amar principal
  "Nh3 e5": ["g3", "f4"], // Amar vs e5
  "Nh3 Nf6": ["g3", "f4"], // Amar vs Nf6
  
  // Apertura Gedult
  "f3": ["e5", "d5", "Nf6"], // Gedult
  "f3 e5": ["e4", "Kf2"], // Gedult principal
  "f3 d5": ["e4", "d4"], // Gedult vs d5
  "f3 Nf6": ["e4", "d4"], // Gedult vs Nf6
  
  // ========== VARIANTES MODERNAS Y EXPERIMENTALES ==========
  
  // Apertura Hippopotamus
  "e4 Nh6": ["d4", "Nf3"], // Hippopotamus
  "e4 Nh6 d4": ["g6", "e6"], // Hippopotamus principal
  "e4 Nh6 d4 g6": ["Nc3", "Be3"], // Hippopotamus setup
  
  // Defensa Woodpecker
  "e4 Nh6 d4 Nf5": ["Nf3", "g3"], // Woodpecker
  "e4 Nh6 d4 Nf5 g3": ["g6", "e6"], // Woodpecker principal
  
  // Sistema Jobava
  "d4 Nf6 Nc3": ["d5", "g6"], // Jobava
  "d4 Nf6 Nc3 d5": ["Bf4", "Bg5"], // Jobava principal
  "d4 Nf6 Nc3 d5 Bf4": ["c5", "e6"], // Jobava London
  
  // Apertura Zinc
  "e4 e5 Nf3 Nc6 Bc4 f5": ["d3", "exf5"], // Zinc
  "e4 e5 Nf3 Nc6 Bc4 f5 d3": ["fxe4", "Nf6"], // Zinc principal
  
  // Sistema Rat
  "e4 d6 d4 Nf6": ["Nc3", "f3"], // Rat
  "e4 d6 d4 Nf6 Nc3": ["g6", "e6"], // Rat principal
  "e4 d6 d4 Nf6 Nc3 g6": ["Be3", "f4"], // Rat Fianchetto
  
  // ========== TRANSPOSICIONES IMPORTANTES ==========
  
  // English to QGD
  "c4 e6 Nc3 d5": ["d4", "cxd5"], // Inglesa a GDD
  "c4 e6 Nc3 d5 d4": ["Nf6", "c6"], // Transpone a GDD
  "c4 e6 Nc3 d5 d4 Nf6": ["Nf3", "Bg5"], // GDD ortodoxo
  
  // Reti to QGD
  "Nf3 d5 c4 e6": ["g3", "d4"], // Reti a GDD
  "Nf3 d5 c4 e6 d4": ["Nf6", "c6"], // Transpone a GDD
  
  // English to Sicilian
  "c4 c5 Nc3 Nc6": ["g3", "Nf3"], // Inglesa simétrica
  "c4 c5 Nc3 Nc6 g3": ["g6", "e6"], // Siciliana invertida
  "c4 c5 Nc3 Nc6 g3 g6": ["Bg2", "Nf3"], // Dragón invertido
  
  // ========== FINALES DE APERTURA CRÍTICOS ==========
  
  // Posiciones críticas Siciliana
  "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5": ["f3", "Nf5"], // Najdorf crítico
  "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7": ["f3", "Qd2"], // Dragón crítico
  "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5": ["Ndb5", "Bb5"], // Sveshnikov
  
  // Posiciones críticas Francesa
  "e4 e6 d4 d5 Nc3 Bb4 e5 c5": ["a3", "Qg4"], // Winawer crítico
  "e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5": ["Nfd7", "Ne4"], // Francesa clásica
  "e4 e6 d4 d5 Nd2 Nf6 e5 Nfd7": ["Bd3", "c4"], // Tarrasch crítico
  
  // Posiciones críticas Caro-Kann
  "e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5": ["Ng3", "Bc4"], // Caro-Kann principal
  "e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6": ["Nxf6+", "Ng5"], // Caro-Kann 4...Nf6
  "e4 c6 d4 d5 exd5 cxd5 c4": ["Nf6", "e6"], // Panov-Botvinnik
  
  // ========== ANÁLISIS DE EVALUACIÓN ==========
  
  // Indicadores posicionales
  "evaluation_factors": {
    "material": "Valor material de las piezas",
    "development": "Desarrollo de piezas",
    "king_safety": "Seguridad del rey",
    "pawn_structure": "Estructura de peones",
    "center_control": "Control del centro",
    "piece_activity": "Actividad de las piezas",
    "endgame_potential": "Potencial de final"
  },
  
  // Principios de apertura
  "opening_principles": [
    "Desarrollar las piezas rápidamente",
    "Controlar el centro",
    "Poner el rey en seguridad",
    "No mover la misma pieza dos veces",
    "No sacar la dama muy temprano",
    "Conectar las torres",
    "Mejorar las piezas peor ubicadas"
  ],
  
  // Errores comunes
  "common_mistakes": [
    "Desarrollo prematuro de la dama",
    "Movimientos innecesarios de peones",
    "Enroque tardío",
    "Ignorar el desarrollo",
    "Ataques prematuros",
    "Debilitar la estructura de peones",
    "No considerar las transposiciones"
  ],
  
  // Planes típicos por apertura
  "typical_plans": {
    "sicilian": "Ataque en el flanco de rey, presión en columna d",
    "french": "Ruptura con f6 o e5, ataque en flanco de rey",
    "caro_kann": "Simplificación, juego posicional",
    "kings_indian": "Ataque con g5-h5, sacrificios en el flanco de rey",
    "queens_gambit": "Presión en el centro, juego posicional"
  }
};

// ========== FUNCIONES DE ANÁLISIS ==========

// Función para obtener jugadas recomendadas
function getRecommendedMoves(position) {
  const moves = OPENING_BOOK[position];
  if (!moves) return [];
  
  return moves.map(move => ({
    move: move,
    evaluation: evaluateMove(position, move),
    popularity: getPopularity(position, move),
    theory: getTheoryDepth(position, move)
  }));
}

// Función para evaluar una jugada
function evaluateMove(position, move) {
  // Evaluación básica basada en principios
  let score = 0;
  
  // Desarrollo de piezas
  if (isDevelopmentMove(move)) score += 10;
  
  // Control del centro
  if (isCenterMove(move)) score += 8;
  
  // Seguridad del rey
  if (isKingSafetyMove(move)) score += 12;
  
  // Actividad de piezas
  if (isPieceActivity(move)) score += 6;
  
  return score;
}

// Función para obtener popularidad
function getPopularity(position, move) {
  // Simulación de popularidad basada en base de datos
  const popularMoves = ["e4", "d4", "Nf3", "c4", "e5", "c5", "Nf6"];
  return popularMoves.includes(move) ? "Alta" : "Media";
}

// Función para obtener profundidad teórica
function getTheoryDepth(position, move) {
  const depth = position.split(" ").length;
  if (depth <= 3) return "Principios básicos";
  if (depth <= 8) return "Teoría principal";
  if (depth <= 15) return "Variantes profundas";
  return "Análisis avanzado";
}

// Funciones auxiliares para evaluación
function isDevelopmentMove(move) {
  return /^[NBQR]/.test(move) && !move.includes("x");
}

function isCenterMove(move) {
  return ["e4", "d4", "e5", "d5", "Nf3", "Nc3"].includes(move);
}

function isKingSafetyMove(move) {
  return move === "O-O" || move === "O-O-O";
}

function isPieceActivity(move) {
  return move.includes("+") || move.includes("x");
}

// ========== SISTEMA DE BÚSQUEDA ==========

// Función para buscar posiciones
function searchPosition(query) {
  const results = [];
  
  for (const [position, moves] of Object.entries(OPENING_BOOK)) {
    if (position.toLowerCase().includes(query.toLowerCase())) {
      results.push({
        position: position,
        moves: moves,
        name: getOpeningName(position),
        eco: getECOCode(position)
      });
    }
  }
  
  return results;
}

// Función para obtener nombre de apertura
function getOpeningName(position) {
  const names = {
    "e4 e5": "Apertura Abierta",
    "e4 c5": "Defensa Siciliana",
    "e4 e6": "Defensa Francesa",
    "e4 c6": "Defensa Caro-Kann",
    "d4 d5": "Juego de Dama",
    "d4 Nf6": "Defensas Indias",
    "c4": "Apertura Inglesa",
    "Nf3": "Apertura Reti"
  };
  
  for (const [key, name] of Object.entries(names)) {
    if (position.startsWith(key)) return name;
  }
  
  return "Apertura Irregular";
}

// Función para obtener código ECO
function getECOCode(position) {
  // Simplificación de códigos ECO
  const ecoCodes = {
    "e4 e5": "C2-C4",
    "e4 c5": "B2-B9",
    "e4 e6": "C0-C1",
    "e4 c6": "B1",
    "d4 d5": "D0-D6",
    "d4 Nf6": "E0-E9",
    "c4": "A1-A3",
    "Nf3": "A0"
  };
  
  for (const [key, code] of Object.entries(ecoCodes)) {
    if (position.startsWith(key)) return code;
  }
  
  return "A00";
}

// ========== EJEMPLOS DE USO ==========

// Ejemplo 1: Buscar jugadas para la Siciliana
console.log("Jugadas para Siciliana Najdorf:");
console.log(getRecommendedMoves("e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6"));

// Ejemplo 2: Buscar aperturas con "e4"
console.log("Aperturas que empiezan con e4:");
console.log(searchPosition("e4"));

// Ejemplo 3: Análisis de posición
console.log("Análisis de la Española:");
console.log(getRecommendedMoves("e4 e5 Nf3 Nc6 Bb5"));

// ========== EXPORTACIÓN ==========
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    OPENING_BOOK,
    getRecommendedMoves,
    searchPosition,
    getOpeningName,
    getECOCode
  };
}

// Puedes agregar más líneas populares aquí...

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
      5: { depth: 5, randomness: 0, timeLimit: 10000, maxNodes: 200000, contempt: 20, pieceProtectionFactor: 1.6, exchangeEvaluationThreshold: 1.2 }
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
    
    // Penalización por rey en el centro después de la apertura
    const kingSquare = { w: null, b: null };
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece && piece.type === 'k') {
          kingSquare[piece.color] = [i, j];
        }
      }
    }
    // Penaliza rey fuera de las columnas g-f-e-d después de la jugada 10
    const moveNumber = game.history().length; // Solo una vez, al inicio
    if (moveNumber > 10) {
      ['w', 'b'].forEach(color => {
        if (kingSquare[color]) {
          const col = kingSquare[color][1];
          if (col < 3 || col > 4) { // columnas a,b,c,h,g
            if (color === 'w') mgScore -= 50;
            else mgScore += 50;
          }
        }
      });
    }
    // Bonus por enroque realizado
    if (game.castlingRights('w') === '' && kingSquare['w'] && kingSquare['w'][1] === 6) mgScore += 30;
    if (game.castlingRights('b') === '' && kingSquare['b'] && kingSquare['b'][1] === 6) mgScore -= 30;

    // Penalización por perder el derecho a enrocar temprano
    if (moveNumber < 10) {
      if (game.castlingRights('w') === '') mgScore -= 20;
      if (game.castlingRights('b') === '') mgScore += 20;
    }

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
    if (moveNumber < 8) {
      const materialDiff = whiteMaterial - blackMaterial;
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
                }
              }
            } catch (error) {
              game.undo();
              continue;
            }
          }
          
          // MEJORA: Seleccionar el mejor movimiento de esta iteración
          if (iterationBestMove) {
            bestMove = iterationBestMove;
            bestValue = iterationBestValue;
            
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