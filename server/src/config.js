import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '../.env') });

function required(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value.trim();
}

function optional(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === null || String(value).trim() === '') {
    return fallback;
  }
  return String(value).trim();
}

export const config = {
  databaseUrl: required('DATABASE_URL'),
  port: Number(optional('PORT', '3010')),
  host: optional('HOST', '0.0.0.0'),
  corsOrigin: optional('CORS_ORIGIN', 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean),
  maxScore: Number(optional('MAX_SCORE', '50000')),
  desktopArenaWidth: 1280,
  desktopArenaHeight: 720,
};
