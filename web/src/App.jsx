import { Routes, Route, Navigate } from 'react-router-dom';
import DocumentHead from './components/DocumentHead.jsx';
import Home from './pages/Home.jsx';
import Play from './pages/Play.jsx';
import Result from './pages/Result.jsx';
import Leaderboard from './pages/Leaderboard.jsx';

export default function App() {
  return (
    <div className="app-shell">
      <DocumentHead />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/play" element={<Play />} />
        <Route path="/result" element={<Result />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
