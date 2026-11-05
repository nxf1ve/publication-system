import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import http from './http';

describe('HTTP authentication and session expiration', () => {
  let data;
  beforeEach(() => {
    data = new Map();
    vi.stubGlobal('localStorage', {
      getItem: key => data.get(key) ?? null,
      removeItem: key => data.delete(key),
    });
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each([null, 'session-token'])('sends the current bearer token: %s', async token => {
    if (token) data.set('access_token', token);
    const adapter = vi.fn(async config => ({ data: [], status: 200, headers: {}, config }));
    await http.get('/publications', { adapter });
    expect(adapter.mock.calls[0][0].headers.Authorization).toBe(token ? `Bearer ${token}` : undefined);
  });

  it.each([
    ['/publications', 401, true],
    ['/auth/me', 401, true],
    ['/auth/login', 401, false],
    ['/auth/register', 401, false],
    ['/publications', 403, false],
    ['/publications', 503, false],
    ['/publications', undefined, false],
  ])('handles %s with status %s without swallowing errors', async (url, status, expired) => {
    data.set('access_token', 'session-token');
    const failure = new Error('Request failed');
    const adapter = async config => {
      failure.config = config;
      if (status) failure.response = { status };
      throw failure;
    };
    await expect(http.get(url, { adapter })).rejects.toBe(failure);
    expect(data.has('access_token')).toBe(!expired);
    expect(window.dispatchEvent).toHaveBeenCalledTimes(expired ? 1 : 0);
    if (expired) expect(window.dispatchEvent.mock.calls[0][0].type).toBe('session-expired');
  });
});
