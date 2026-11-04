import { useEffect, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import Catalog from './views/catalog/Catalog';
import Profile from './views/profile/Profile';
import Admin from './views/admin/Admin';
import Auth from './views/auth/Auth';
import http from './api/http';

export default function Router() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const logout = () => { localStorage.removeItem('access_token'); setUser(null); };
  useEffect(() => {
    let active = true;
    const restore = async () => {
      try {
        if (localStorage.getItem('access_token')) {
          const { data } = await http.get('/auth/me');
          if (active) setUser(data);
        }
      } catch (exception) {
        if (exception.response?.status === 401) localStorage.removeItem('access_token');
        else if (active) setError('Не удалось восстановить сессию. Проверьте сервер и обновите страницу.');
      } finally { if (active) setLoading(false); }
    };
    restore();
    const expired = () => { logout(); };
    window.addEventListener('session-expired', expired);
    return () => { active = false; window.removeEventListener('session-expired', expired); };
  }, []);
  return <BrowserRouter>
    <nav>
      <Link to="/">Каталог</Link>
      {user?.role === 'ADMIN' && <Link to="/admin">Администрирование</Link>}
      <div className="nav-account">
        {user ? <><Link className="nav-username" to="/profile">{user.username}</Link><button type="button" onClick={logout}>Выйти</button></> : <Link to="/login">Войти</Link>}
      </div>
    </nav>
    {error && <p role="alert">{error}</p>}
    {loading ? <main><p role="status">Проверка сессии…</p></main> : <Routes>
      <Route path="/" element={user ? <Catalog user={user} /> : <Navigate to="/login" replace />} />
      <Route path="/login" element={user ? <Navigate to="/profile" replace /> : <Auth onAuthenticated={setUser} />} />
      <Route path="/profile" element={user ? <Profile user={user} /> : <Navigate to="/login" replace />} />
      <Route path="/admin" element={!user ? <Navigate to="/login" replace /> : user.role === 'ADMIN' ? <Admin /> : <main><h1>Доступ запрещён</h1></main>} />
    </Routes>}
  </BrowserRouter>;
}
