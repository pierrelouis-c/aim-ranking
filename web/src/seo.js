export const SITE_URL = (
  import.meta.env.VITE_SITE_URL || 'https://www.aim-ranking.com'
).replace(/\/$/, '');

export const SITE_NAME = 'AIM RANKING';

export const DEFAULT_DESCRIPTION =
  'Free 60-second online aim trainer. Click targets, build streaks, hit gold targets, and climb the global leaderboard. No download — play in your browser.';

export const ROUTE_SEO = {
  '/': {
    title: 'AIM RANKING — Free 60s Online Aim Trainer',
    description: DEFAULT_DESCRIPTION,
    path: '/',
  },
  '/leaderboard': {
    title: 'Leaderboard — AIM RANKING Aim Trainer',
    description:
      'Global AIM RANKING leaderboard. See top aim trainer scores for all time and the last 24 hours.',
    path: '/leaderboard',
  },
  '/play': {
    title: 'Play — AIM RANKING',
    description: 'Play a 60-second aim trainer round on AIM RANKING.',
    path: '/play',
    noindex: true,
  },
  '/result': {
    title: 'Round Result — AIM RANKING',
    description: 'Your AIM RANKING round results and rank.',
    path: '/result',
    noindex: true,
  },
};
