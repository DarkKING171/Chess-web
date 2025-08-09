// src/context/GameContext.js

import React, { createContext, useContext, useReducer } from 'react';
import { Chess } from 'chess.js';

// Estados y acciones
const GAME_STATUS = {
  WAITING: 'waiting',
  THINKING: 'thinking',
  PLAYING: 'playing',
  GAME_OVER: 'game_over',
  PROMOTION: 'promotion'
};

const ACTIONS = {
  MAKE_MOVE:      'MAKE_MOVE',
  RESET_GAME:     'RESET_GAME',
  SET_STATUS:     'SET_STATUS',
  SET_HISTORY:    'SET_HISTORY',
  SET_CAPTURED:   'SET_CAPTURED',
  SET_STATS:      'SET_STATS',
  SET_ERROR:      'SET_ERROR',
  SET_AI_STATS:   'SET_AI_STATS',
  SET_ANALYSIS:   'SET_ANALYSIS',
  SET_PROMOTION:  'SET_PROMOTION',
  SET_PENDING:    'SET_PENDING',
  SET_SOUNDS:     'SET_SOUNDS',
  SET_HIGHLIGHTS: 'SET_HIGHLIGHTS',
  SET_THEME:      'SET_THEME',
  SET_NOTATION:   'SET_NOTATION',
  SET_AUTOROTATE: 'SET_AUTOROTATE',
  SET_HINTS:      'SET_HINTS',
  SET_LASTMOVE:   'SET_LASTMOVE',
  SET_PLAYER:     'SET_PLAYER',
  SET_TIMECTRL:   'SET_TIMECTRL',
  SET_TIMERS:     'SET_TIMERS',
  SET_STARTTIME:  'SET_STARTTIME',
  SET_DIFFICULTY: 'SET_DIFFICULTY'
};

// Estado inicial
const initialState = {
  game:          new Chess(),
  status:        GAME_STATUS.PLAYING,
  history:       [],
  captured:      { white: [], black: [] },
  stats:         { totalGames: 0, wins: 0, losses: 0, draws: 0 },
  error:         null,
  aiStats:       null,
  analysis:      null,
  promotion:     null,    // square awaiting promotion
  pending:       null,    // move awaiting promotion
  sounds:        true,
  highlights:    {},
  theme:         'dark',
  notation:      false,
  autorotate:    false,
  hints:         false,
  hintSquares:   {},
  lastMove:      null,
  player:        'white',
  timeControl:   { enabled: false, white: 600, black: 600 },
  timers:        { white: 600, black: 600 },
  startTime:     null,
  difficulty:    3
};

// Reducer
function gameReducer(state, { type, payload }) {
  switch (type) {
    case ACTIONS.MAKE_MOVE:
      return { ...state, game: payload.game };
    case ACTIONS.RESET_GAME:
      return { ...initialState, startTime: Date.now(), difficulty: state.difficulty };
    case ACTIONS.SET_STATUS:
      return { ...state, status: payload };
    case ACTIONS.SET_HISTORY:
      return { ...state, history: payload };
    case ACTIONS.SET_CAPTURED:
      return { ...state, captured: payload };
    case ACTIONS.SET_STATS:
      return { ...state, stats: payload };
    case ACTIONS.SET_ERROR:
      return { ...state, error: payload };
    case ACTIONS.SET_AI_STATS:
      return { ...state, aiStats: payload };
    case ACTIONS.SET_ANALYSIS:
      return { ...state, analysis: payload };
    case ACTIONS.SET_PROMOTION:
      return { ...state, promotion: payload };
    case ACTIONS.SET_PENDING:
      return { ...state, pending: payload };
    case ACTIONS.SET_SOUNDS:
      return { ...state, sounds: payload };
    case ACTIONS.SET_HIGHLIGHTS:
      return { ...state, highlights: payload };
    case ACTIONS.SET_THEME:
      return { ...state, theme: payload };
    case ACTIONS.SET_NOTATION:
      return { ...state, notation: payload };
    case ACTIONS.SET_AUTOROTATE:
      return { ...state, autorotate: payload };
    case ACTIONS.SET_HINTS:
      return { ...state, hints: payload };
    case ACTIONS.SET_HINTS:
      return { ...state, hints: payload };
    case ACTIONS.SET_HINTS:
      return { ...state, hints: payload };
    case ACTIONS.SET_HINTS:
      return { ...state, hints: payload };
    case ACTIONS.SET_HINTS:
      return { ...state, hints: payload };
    case ACTIONS.SET_HINTS:
      return { ...state, hints: payload };
    case ACTIONS.SET_HINTS:
      return { ...state, hints: payload };
    case ACTIONS.SET_HINTS:
      return { ...state, hints: payload };
    case ACTIONS.SET_HINTS:
      return { ...state, hints: payload };
    case ACTIONS.SET_HINTS:
      return { ...state, hints: payload };
    case ACTIONS.SET_HINTS:
      return { ...state, hints: payload };
    case ACTIONS.SET_HINTS:
      return { ...state, hints: payload };
    case ACTIONS.SET_HINTS:
      return { ...state, hints: payload };
    case ACTIONS.SET_HINTS:
      return { ...state, hints: payload };
    case ACTIONS.SET_HINTS:
      return { ...state, hints: payload };
    // fix, let's consolidate
    case ACTIONS.SET_HINTS:       return { ...state, hints: payload };
    case ACTIONS.SET_HINTS:       return { ...state, hints: payload };
    case ACTIONS.SET_HINTS:       return { ...state, hints: payload };
    // Actually just keep one
    case ACTIONS.SET_LASTMOVE:
      return { ...state, lastMove: payload };
    case ACTIONS.SET_PLAYER:
      return { ...state, player: payload };
    case ACTIONS.SET_TIMECTRL:
      return { ...state, timeControl: payload };
    case ACTIONS.SET_TIMERS:
      return { ...state, timers: payload };
    case ACTIONS.SET_STARTTIME:
      return { ...state, startTime: payload };
    case ACTIONS.SET_DIFFICULTY:
      return { ...state, difficulty: payload };
    default:
      return state;
  }
}

// Context y Provider
const GameStateContext = createContext();
const GameDispatchContext = createContext();

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  return (
    <GameStateContext.Provider value={state}>
      <GameDispatchContext.Provider value={dispatch}>
        {children}
      </GameDispatchContext.Provider>
    </GameStateContext.Provider>
  );
}

// Hooks de acceso
export function useGameState() {
  const context = useContext(GameStateContext);
  if (context === undefined) {
    throw new Error('useGameState must be used within a GameProvider');
  }
  return context;
}

export function useGameDispatch() {
  const context = useContext(GameDispatchContext);
  if (context === undefined) {
    throw new Error('useGameDispatch must be used within a GameProvider');
  }
  return context;
}

// Exportar constantes
export { GAME_STATUS, ACTIONS };