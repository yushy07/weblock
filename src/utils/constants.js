export const MESSAGE_TYPES = {
  GET_STATE: 'GET_STATE',
  VERIFY_PASSWORD: 'VERIFY_PASSWORD',
  SET_PASSWORD: 'SET_PASSWORD',
  CHANGE_PASSWORD: 'CHANGE_PASSWORD',
  UNLOCK_TAB: 'UNLOCK_TAB',
  ADD_SITE: 'ADD_SITE',
  REMOVE_SITE: 'REMOVE_SITE',
  TOGGLE_SITE: 'TOGGLE_SITE',
  CLEAR_ALL_SESSIONS: 'CLEAR_ALL_SESSIONS',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  CHECK_INCOGNITO: 'CHECK_INCOGNITO',
  // Recovery & Password Modes
  SETUP_RECOVERY: 'SETUP_RECOVERY',
  VERIFY_RECOVERY_ANSWER: 'VERIFY_RECOVERY_ANSWER',
  RESET_PASSWORD_WITH_RECOVERY: 'RESET_PASSWORD_WITH_RECOVERY',
  CHANGE_RECOVERY_QUESTIONS: 'CHANGE_RECOVERY_QUESTIONS',
  SET_SITE_PASSWORD_MODE: 'SET_SITE_PASSWORD_MODE',
  RESET_SITE_PASSWORD: 'RESET_SITE_PASSWORD',
  RESOLVE_FAVICON: 'RESOLVE_FAVICON',
  GET_SITE_DETAILS: 'GET_SITE_DETAILS',
  UPDATE_SITE_PROTECTION: 'UPDATE_SITE_PROTECTION',
};

export const PASSWORD_MODES = {
  UNIVERSAL: 'universal',
  SEPARATE: 'separate',
};

export const PROTECTION_MODES = {
  EVERY_TAB: 'every-tab',
  RANDOM: 'random',
};

export const CHALLENGE_INTERVALS = {
  WEEKLY: '7d',
  TWO_WEEKS: '14d',
  MONTHLY: '30d',
};

export const MIN_RANDOM_CHALLENGE_WAIT_MS = 4 * 24 * 60 * 60 * 1000; // 4 days

export const ALARM_PREFIX = 'weblock_challenge_';

export const QUESTION_BANK = [
  { id: 'q_school', question: 'What was the name of your first school?' },
  { id: 'q_teacher', question: 'What is the name of your favorite teacher?' },
  { id: 'q_nickname', question: 'What was your childhood nickname?' },
  { id: 'q_pet', question: 'What was the name of your first pet?' },
  { id: 'q_game', question: 'What was your favorite childhood game?' },
  { id: 'q_fictional', question: 'What is the name of your favorite fictional character?' },
  { id: 'q_subject', question: 'What was your favorite subject in school?' },
  { id: 'q_city', question: 'What city did you first visit outside your hometown?' },
  { id: 'q_food', question: 'What was your favorite food as a child?' },
  { id: 'q_best_friend', question: 'What was the name of your first best friend?' },
];

export const DEFAULT_SETTINGS = {
  enabled: true,
  incognitoEnabled: true,
  authMode: 'per-tab', // 'per-tab' | 'every-navigation' | '5-min' | '30-min'
  theme: 'dark',
};

export const CRYPTO_CONFIG = {
  algorithm: 'PBKDF2-SHA256',
  iterations: 310000,
  hashBytes: 32,
  saltBytes: 16,
};

export const RATE_LIMIT = {
  maxAttempts: 5,
  cooldownSeconds: 15,
};

export const DNR_RULE_ID_OFFSET = {
  DYNAMIC: 1000,
  SESSION: 20000,
};

export const POPULAR_SITES = [
  { domain: 'youtube.com', name: 'YouTube', icon: 'youtube', color: '#FF0000' },
  { domain: 'instagram.com', name: 'Instagram', icon: 'instagram', color: '#E1306C' },
  { domain: 'reddit.com', name: 'Reddit', icon: 'reddit', color: '#FF4500' },
  { domain: 'discord.com', name: 'Discord', icon: 'discord', color: '#5865F2' },
  { domain: 'twitter.com', name: 'Twitter/X', icon: 'twitter', color: '#1DA1F2' },
  { domain: 'x.com', name: 'X', icon: 'twitter', color: '#FFFFFF' },
  { domain: 'facebook.com', name: 'Facebook', icon: 'facebook', color: '#1877F2' },
  { domain: 'netflix.com', name: 'Netflix', icon: 'netflix', color: '#E50914' },
  { domain: 'tiktok.com', name: 'TikTok', icon: 'tiktok', color: '#00F2FE' },
  { domain: 'twitch.tv', name: 'Twitch', icon: 'twitch', color: '#9146FF' }
];
