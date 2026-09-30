import { describe, expect, it, vi } from 'vitest';
import http from './http';
import { createPublication, deletePublication, getPublication, getPublications } from './publications';

vi.mock('./http', () => ({ default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));

describe('publication API', () => {
  it('calls the expected endpoints', async () => {
    await getPublications();
    await getPublication(4);
    await createPublication({ title: 'Test' });
    await deletePublication(4);
    expect(http.get).toHaveBeenNthCalledWith(1, '/publications');
    expect(http.get).toHaveBeenNthCalledWith(2, '/publications/4');
    expect(http.post).toHaveBeenCalledWith('/publications', { title: 'Test' });
    expect(http.delete).toHaveBeenCalledWith('/publications/4');
  });
});
