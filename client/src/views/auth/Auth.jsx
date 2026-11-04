import { useState } from 'react';
import http from '../../api/http';

export default function Auth({ onAuthenticated }) {
  const [register, setRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async event => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await http.post(`/auth/${register ? 'register' : 'login'}`, { username, password });
      localStorage.setItem('access_token', data.accessToken);
      onAuthenticated(data.user);
    } catch (exception) {
      const status = exception.response?.status;
      setError(status === 409 ? 'Этот логин уже занят.' : status === 401 ? 'Неверный логин или пароль.'
        : status === 400 ? 'Проверьте логин и пароль.' : 'Не удалось войти. Проверьте доступность сервера.');
    } finally { setBusy(false); }
  };
  return <main><section className="panel">
    <h1>{register ? 'Регистрация' : 'Вход в систему'}</h1>
    <form onSubmit={submit}>
      <div className="auth-fields">
        <label htmlFor="username">Логин
          <input id="username" autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} required pattern={'[a-zA-Z0-9_.@+\\-]{3,50}'} maxLength={50} />
        </label>
        <label htmlFor="password">Пароль
          <input id="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={8} maxLength={72} />
        </label>
      </div>
      <div className="actions">
        <button className="primary" type="submit" disabled={busy}>{busy ? 'Подождите…' : register ? 'Зарегистрироваться' : 'Войти'}</button>
        <button type="button" disabled={busy} onClick={() => { setRegister(!register); setError(''); setPassword(''); }}>{register ? 'Уже есть аккаунт' : 'Создать аккаунт'}</button>
      </div>
      {error && <p role="alert">{error}</p>}
    </form>
  </section></main>;
}
