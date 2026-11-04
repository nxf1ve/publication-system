export default function Profile({ user }) {
  return <main><h1>Профиль</h1><section className="panel">
    <p>Логин: {user.username}</p><p>Роль: {user.role === 'ADMIN' ? 'Администратор' : 'Сотрудник'}</p>
  </section></main>;
}
