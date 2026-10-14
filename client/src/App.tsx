import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import { WebSocketProvider } from './context/WebSocketContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import LobbyPage from './pages/LobbyPage';
import RoomPage from './pages/RoomPage';

function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  const spinner = (
    <div className="flex h-screen items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
    </div>
  );

  return (
    <WebSocketProvider>
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<LandingPage user={user ?? null} />}
        />
        <Route
          path="/login"
          element={user === undefined ? spinner : user ? <Navigate to="/lobby" replace /> : <LoginPage />}
        />
        <Route
          path="/lobby"
          element={user === undefined ? spinner : user ? <LobbyPage user={user} /> : <Navigate to="/" replace />}
        />
        <Route
          path="/room/:roomId"
          element={user === undefined ? spinner : user ? <RoomPage user={user} /> : <Navigate to="/login" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </WebSocketProvider>
  );
}

export default App;
