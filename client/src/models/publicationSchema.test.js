import { describe, expect, it } from 'vitest';
import { publicationSchema } from './publicationSchema';

const valid = { title: '  Методы анализа данных  ', authors: ' Иванов И. И. ', year: '2025', type: 'Статья', department: 'Информационные системы', owner: 'Иванов И. И.' };

describe('publication validation', () => {
  it('trims text and converts the year for storage', () => {
    expect(publicationSchema.parse(valid)).toMatchObject({ title: 'Методы анализа данных', authors: 'Иванов И. И.', year: 2025 });
  });
  it.each(['', ' ', 'аб', 'а'.repeat(201)])('rejects invalid titles: %s', title => {
    expect(publicationSchema.safeParse({ ...valid, title }).success).toBe(false);
  });
  it.each(['', 'abc', '2025.5', '1899', String(new Date().getFullYear() + 2)])('rejects invalid years: %s', year => {
    expect(publicationSchema.safeParse({ ...valid, year }).success).toBe(false);
  });
  it.each(['authors', 'department', 'owner'])('rejects whitespace in %s', field => {
    expect(publicationSchema.safeParse({ ...valid, [field]: '  ' }).success).toBe(false);
  });
  it('rejects unknown publication types', () => {
    expect(publicationSchema.safeParse({ ...valid, type: 'Другое' }).success).toBe(false);
  });
});
