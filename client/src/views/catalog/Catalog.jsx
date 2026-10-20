import { useRef, useState } from 'react';
import { readItems, saveItems } from '../../api/prototypeStore';
import { departments, publicationSchema, publicationTypes as types } from '../../models/publicationSchema';

const blank = () => ({ title: '', authors: '', year: new Date().getFullYear(), type: 'Статья', department: 'Информационные системы', owner: 'Иванов И. И.' });
const noFilters = { year: '', author: '', type: '' };

export default function Catalog() {
  const [items, setItems] = useState(readItems);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [filters, setFilters] = useState(noFilters);
  const [message, setMessage] = useState('');
  const formRef = useRef(null);
  const change = e => setForm({ ...form, [e.target.name]: e.target.value });
  const filter = e => setFilters({ ...filters, [e.target.name]: e.target.value });
  const reset = () => { setEditing(null); setForm(blank()); };
  const persist = next => {
    try { saveItems(next); setItems(next); return true; }
    catch { setMessage('Не удалось сохранить данные в браузере. Проверьте доступность localStorage.'); return false; }
  };
  const submit = e => {
    e.preventDefault();
    const result = publicationSchema.safeParse(form);
    if (!result.success) {
      setMessage(result.error.issues.map(issue => issue.message).join(' '));
      const firstField = result.error.issues[0].path[0];
      formRef.current.querySelector(`[name="${firstField}"]`)?.focus();
      return;
    }
    const record = { ...result.data, id: editing ?? crypto.randomUUID(), status: editing === null ? 'На проверке' : items.find(p => p.id === editing).status };
    if (persist(editing === null ? [...items, record] : items.map(p => p.id === editing ? record : p))) { setMessage('Публикация сохранена.'); reset(); }
  };
  const edit = item => {
    setEditing(item.id); setForm({ title: item.title, authors: item.authors, year: item.year, type: item.type, department: departments.includes(item.department) ? item.department : '', owner: item.owner }); setMessage('');
    formRef.current.scrollIntoView({ behavior: 'smooth' }); formRef.current.querySelector('input').focus({ preventScroll: true });
  };
  const remove = item => {
    if (window.confirm('Удалить публикацию «' + item.title + '»?') && persist(items.filter(p => p.id !== item.id))) {
      if (editing === item.id) reset();
      setMessage('Публикация удалена.');
    }
  };
  const visible = items.filter(p => (!filters.year || String(p.year) === filters.year) && p.authors.toLocaleLowerCase().includes(filters.author.trim().toLocaleLowerCase()) && (!filters.type || p.type === filters.type));
  return <main>
    <h1>Каталог публикаций</h1>
    <section className="panel" ref={formRef}>
      <h2>{editing === null ? 'Новая публикация' : 'Редактирование публикации'}</h2>
      <form onSubmit={submit} noValidate>
        <div className="form-grid">
          <label>Название<input name="title" placeholder="Например, методы анализа данных" value={form.title} onChange={change} required minLength={3} maxLength={200} /></label>
          <label>Авторы<input name="authors" placeholder="Фамилия И. О." value={form.authors} onChange={change} required /></label>
          <label>Год<input name="year" type="number" min="1900" max={new Date().getFullYear() + 1} value={form.year} onChange={change} required /></label>
          <label>Тип<select name="type" value={form.type} onChange={change}>{types.map(t => <option key={t}>{t}</option>)}</select></label>
          <label>Подразделение<select name="department" value={form.department} onChange={change} required><option value="" disabled>Выберите подразделение</option>{departments.map(department => <option key={department}>{department}</option>)}</select></label>
          <label>Сотрудник<input name="owner" value={form.owner} onChange={change} required /></label>
        </div>
        <div className="actions"><button className="primary" type="submit">{editing === null ? 'Добавить публикацию' : 'Сохранить'}</button>{editing !== null && <button type="button" onClick={reset}>Отмена</button>}</div>
      </form>
      <p role="status" className="message">{message}</p>
    </section>
    <section className="panel">
      <div className="section-heading"><div><h2>Фильтрация публикаций</h2><p className="muted">Фильтр по году, автору и типу.</p></div><button type="button" onClick={() => setFilters(noFilters)}>Сбросить</button></div>
      <div className="filters">
        <label>Год<input name="year" type="number" placeholder="Любой год" value={filters.year} onChange={filter} /></label>
        <label>Автор<input name="author" placeholder="Фамилия автора" value={filters.author} onChange={filter} /></label>
        <label>Тип<select name="type" value={filters.type} onChange={filter}><option value="">Все типы</option>{types.map(t => <option key={t}>{t}</option>)}</select></label>
      </div>
      <div className="publication-grid">{visible.map(p => <article className="publication" key={p.id}>
        <div className="badges"><span className="badge">{p.type} · {p.year}</span></div>
        <h3>{p.title}</h3><p>{p.authors}</p><p className="muted">{p.department} · {p.owner}</p>
        <div className="actions"><button type="button" onClick={() => edit(p)}>Редактировать</button><button className="danger" type="button" onClick={() => remove(p)}>Удалить</button></div>
      </article>)}</div>
      {visible.length === 0 && <p className="muted">Публикации не найдены.</p>}
    </section>
  </main>;
}
