import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import Catalog from './views/catalog/Catalog'
import Profile from './views/profile/Profile'
import Admin from './views/admin/Admin'

export default function Router() {
  return <BrowserRouter>
    <nav>
      <Link to="/">Каталог</Link>
      <Link to="/profile">Профиль</Link>
      <Link to="/admin">Администрирование</Link>
    </nav>
    <Routes>
      <Route path="/" element={<Catalog />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
  </BrowserRouter>
}
