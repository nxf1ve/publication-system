import { useEffect, useState } from 'react'
import { getPublications } from '../../api/publications'

export default function Catalog() {
  const [items, setItems] = useState([]); const [query, setQuery] = useState(''); const [error, setError] = useState('')
  useEffect(() => { getPublications().then(r => setItems(r.data)).catch(() => setError('Не удалось загрузить публикации')) }, [])
  const visible = items.filter(p => p.title?.toLowerCase().includes(query.toLowerCase()))
  return <main><h1>Каталог публикаций</h1><input aria-label="Поиск" placeholder="Поиск" value={query} onChange={e => setQuery(e.target.value)} />{error && <p>{error}</p>}<ul>{visible.map(p => <li key={p.id}><h2>{p.title}</h2><p>{p.content}</p></li>)}</ul></main>
}
