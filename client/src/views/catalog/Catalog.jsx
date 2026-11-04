import { useEffect, useRef, useState } from 'react';
import { getPublications, createPublication, updatePublication, deletePublication } from '../../api/publications';
import { departments, publicationSchema, publicationTypes as types } from '../../models/publicationSchema';

const blank = () => ({ title: '', authors: '', year: new Date().getFullYear(), type: 'Статья', department: 'Информационные системы', owner: 'Иванов И. И.' });
const noFilters = { year: '', author: '', type: '' };

export default function Catalog({ user }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(() => ({ ...blank(), owner: user.username }));
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filters, setFilters] = useState(noFilters);
  const [message, setMessage] = useState('');
  const formRef = useRef(null);
  const change = e => setForm({ ...form, [e.target.name]: e.target.value });
  const filter = e => setFilters({ ...filters, [e.target.name]: e.target.value });
  const reset = () => { setEditing(null); setForm({ ...blank(), owner: user.username }); };
  const load = async () => {
    setLoading(true); setLoadError(false);
    try { const { data } = await getPublications(); setItems(data); }
    catch { setLoadError(true); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const failure = error => {
    const status = error.response?.status;
    setMessage(status === 403 ? 'Нет прав на изменение этой публикации.' : status === 400 ? 'Сервер отклонил данные. Проверьте поля формы.'
      : status === 404 ? 'Публикация больше не существует. Обновите список.' : 'Не удалось выполнить запрос. Проверьте подключение к серверу.');
  };
  const submit = async e => {
    e.preventDefault();
    const result = publicationSchema.safeParse(form);
    if (!result.success) {
      setMessage(result.error.issues.map(issue => issue.message).join(' '));
      const firstField = result.error.issues[0].path[0];
      formRef.current.querySelector(`[name="${firstField}"]`)?.focus();
      return;
    }
    setBusy(true);
    try {
      const { data } = await (editing === null ? createPublication(result.data) : updatePublication(editing, result.data));
      setItems(current => editing === null ? [...current, data] : current.map(p => p.id === editing ? data : p));
      setMessage('Публикация сохранена.'); reset();
    } catch (error) { failure(error); }
    finally { setBusy(false); }
  };
  const edit = item => {
    setEditing(item.id); setForm({ title: item.title, authors: item.authors, year: item.year, type: item.type, department: departments.includes(item.department) ? item.department : '', owner: item.owner }); setMessage('');
    formRef.current.scrollIntoView({ behavior: 'smooth' }); formRef.current.querySelector('input').focus({ preventScroll: true });
  };
  const remove = async item => {
    if (!window.confirm('Удалить публикацию «' + item.title + '»?')) return;
    setBusy(true);
    try {
      await deletePublication(item.id);
      setItems(current => current.filter(p => p.id !== item.id));
      if (editing === item.id) reset();
      setMessage('Публикация удалена.');
    } catch (error) { failure(error); }
    finally { setBusy(false); }
  };
  const visible = items.filter(p => (!filters.year || String(p.year) === filters.year) && p.authors.toLocaleLowerCase().includes(filters.author.trim().toLocaleLowerCase()) && (!filters.type || p.type === filters.type));
  return <main>
    <h1>Каталог публикаций</h1>
    <section className="panel" ref={formRef}>
      <h2>{editing === null ? 'Новая публикация' : 'Редактирование публикации'}</h2>
      <form onSubmit={submit} noValidate>
        <fieldset disabled={busy} className="form-grid">
          <label>Название<input name="title" placeholder="Например, методы анализа данных" value={form.title} onChange={change} required minLength={3} maxLength={200} /></label>
          <label>Авторы<input name="authors" placeholder="Фамилия И. О." value={form.authors} onChange={change} required /></label>
          <label>Год<input name="year" type="number" min="1900" max={new Date().getFullYear() + 1} value={form.year} onChange={change} required /></label>
          <label>Тип<select name="type" value={form.type} onChange={change}>{types.map(t => <option key={t}>{t}</option>)}</select></label>
          <label>Подразделение<select name="department" value={form.department} onChange={change} required><option value="" disabled>Выберите подразделение</option>{departments.map(department => <option key={department}>{department}</option>)}</select></label>
          <label>Сотрудник<input name="owner" value={form.owner} onChange={change} required /></label>
        </fieldset>
        <div className="actions"><button disabled={busy} className="primary" type="submit">{editing === null ? 'Добавить публикацию' : 'Сохранить'}</button>{editing !== null && <button disabled={busy} type="button" onClick={reset}>Отмена</button>}</div>
      </form>
      <p role="status" className="message">{message}</p>
    </section>
    <section className="panel">
      {loading && <p role="status">Загрузка публикаций…</p>}
      {loadError && <p role="alert">Не удалось загрузить публикации. <button type="button" onClick={load}>Повторить</button></p>}
      <div className="section-heading"><div><h2>Фильтрация публикаций</h2><p className="muted">Фильтр по году, автору и типу.</p></div><button type="button" onClick={() => setFilters(noFilters)}>Сбросить</button></div>
      <div className="filters">
        <label>Год<input name="year" type="number" placeholder="Любой год" value={filters.year} onChange={filter} /></label>
        <label>Автор<input name="author" placeholder="Фамилия автора" value={filters.author} onChange={filter} /></label>
        <label>Тип<select name="type" value={filters.type} onChange={filter}><option value="">Все типы</option>{types.map(t => <option key={t}>{t}</option>)}</select></label>
      </div>
      <div className="publication-grid">{visible.map(p => <article className="publication" key={p.id}>
        <div className="badges"><span className="badge">{p.type} · {p.year}</span></div>
        <h3>{p.title}</h3><p>{p.authors}</p><p className="muted">{p.department} · {p.owner}</p>
        {(user.role === 'ADMIN' || p.ownerId === user.id) && <div className="actions"><button disabled={busy} type="button" onClick={() => edit(p)}>Редактировать</button><button disabled={busy} className="danger" type="button" onClick={() => remove(p)}>Удалить</button></div>}
      </article>)}</div>
      {!loading && !loadError && visible.length === 0 && <p className="muted">Публикации не найдены.</p>}
    </section>
  </main>;
}
