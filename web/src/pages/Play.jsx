import { useCallback } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import AimCanvas from '../game/AimCanvas.jsx';
import { detectDevice, getStoredNickname } from '../api/client.js';

export default function Play() {
  const location = useLocation();
  const navigate = useNavigate();
  const nickname = location.state?.nickname || getStoredNickname();
  const desktop = detectDevice() === 'desktop';

  const onFinish = useCallback(
    (result) => {
      navigate('/result', { state: { result }, replace: true });
    },
    [navigate]
  );

  if (!nickname) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className={`page play-page ${desktop ? 'play-desktop' : 'play-mobile'}`}>
      <AimCanvas nickname={nickname} onFinish={onFinish} />
    </main>
  );
}
