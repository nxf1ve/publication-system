import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readItems, saveItems } from './prototypeStore';

describe('prototype storage', () => {
  let data;
  beforeEach(() => {
    data = new Map();
    vi.stubGlobal('localStorage', {
      getItem: key => data.get(key) ?? null,
      setItem: (key, value) => data.set(key, value),
    });
  });
  afterEach(() => vi.unstubAllGlobals());
  it('preserves additions, edits and deletions across reads', () => {
    const initial = readItems();
    const added = { ...initial[0], id: 'new', title: 'Новая публикация' };
    saveItems([...initial, added]);
    expect(readItems()).toHaveLength(initial.length + 1);
    saveItems(readItems().map(item => item.id === 'new' ? { ...item, title: 'Изменено' } : item));
    expect(readItems().find(item => item.id === 'new').title).toBe('Изменено');
    saveItems(readItems().filter(item => item.id !== 'new'));
    expect(readItems()).toEqual(initial);
    saveItems([]);
    expect(readItems()).toEqual([]);
  });
  it('recovers from malformed stored data', () => {
    ['{', 'null', '{}', '[{}]'].forEach(value => {
      data.set('publication-prototype-data', value);
      expect(readItems()).toHaveLength(3);
    });
  });
  it('uses initial records when reading storage fails', () => {
    localStorage.getItem = () => { throw new Error('Access denied'); };
    expect(readItems()).toHaveLength(3);
  });
  it('propagates write failures so the caller can report unsaved changes', () => {
    localStorage.setItem = () => { throw new Error('Quota exceeded'); };
    expect(() => saveItems([])).toThrow('Quota exceeded');
  });
});
