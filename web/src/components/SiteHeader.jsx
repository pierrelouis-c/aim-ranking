import { Link, useLocation } from 'react-router-dom';

export default function SiteHeader() {
  const { pathname } = useLocation();
  const onLeaderboard = pathname.startsWith('/leaderboard');

  return (
    <header className="site-header">
      <Link to="/" className="site-brand">
        <span className="site-brand-dot" aria-hidden="true" />
        AIM RANKING
      </Link>
      <nav className="site-nav" aria-label="Main">
        {!onLeaderboard && (
          <Link to="/leaderboard" className="btn btn-ghost btn-sm">
            Leaderboard
          </Link>
        )}
        {onLeaderboard && (
          <Link to="/" className="btn btn-ghost btn-sm">
            Home
          </Link>
        )}
        <Link to="/" className="btn btn-primary btn-sm">
          Play
        </Link>
      </nav>
    </header>
  );
}
