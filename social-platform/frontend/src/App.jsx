import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { AdminPage } from './pages/AdminPage.jsx';
import { AuthPage } from './pages/AuthPage.jsx';
import { ExplorePage } from './pages/ExplorePage.jsx';
import { FeedPage } from './pages/FeedPage.jsx';
import { NotificationsPage } from './pages/NotificationsPage.jsx';
import { ProfilePage } from './pages/ProfilePage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route
        path="/"
        element={(
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        )}
      >
        <Route index element={<FeedPage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile/:id?" element={<ProfilePage />} />
        <Route path="admin" element={<AdminPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

