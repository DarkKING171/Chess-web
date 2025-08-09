// src/constants.js

export const GAME_STATUS = {
  WAITING: 'waiting',
  THINKING: 'thinking',
  PLAYING: 'playing',
  GAME_OVER: 'game_over',
  PROMOTION: 'promotion'
};

export const SOUND_EFFECTS = {
  MOVE: 'move',
  CAPTURE: 'capture',
  CHECK: 'check',
  CHECKMATE: 'checkmate',
  CASTLE: 'castle',
  PROMOTION: 'promotion'
};

export const THEME_COLORS = {
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