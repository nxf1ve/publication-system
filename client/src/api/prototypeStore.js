const KEY = 'publication-prototype-data';
const initial = [
  { id: 1, title: 'Цифровая трансформация университета', authors: 'Иванов И. И., Петрова А. С.', year: 2025, type: 'Статья', department: 'Информационные системы', owner: 'Иванов И. И.', status: 'На проверке' },
  { id: 2, title: 'Методы анализа данных', authors: 'Сидоров П. А.', year: 2024, type: 'Монография', department: 'Прикладная математика', owner: 'Сидоров П. А.', status: 'Одобрена' },
  { id: 3, title: 'Облачные платформы в образовании', authors: 'Иванов И. И.', year: 2026, type: 'Доклад', department: 'Информационные системы', owner: 'Иванов И. И.', status: 'Одобрена' },
];

export function readItems() {
  try {
    const saved = localStorage.getItem(KEY);
    if (!saved) return initial;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.every(item => item &&
      ['title', 'authors', 'type', 'department', 'owner', 'status'].every(key => typeof item[key] === 'string') &&
      (typeof item.id === 'number' || typeof item.id === 'string') && Number.isInteger(item.year)) ? parsed : initial;
  } catch {
    return initial;
  }
}

export function saveItems(items) {
  localStorage.setItem(KEY, JSON.stringify(items));
}
