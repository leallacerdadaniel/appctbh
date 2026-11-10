import { AppApiError, assistantApi, communityApi, houseApi } from '@/lib/app-api';

/** The API client is the first of the three barriers against links: nothing may leave the phone. */
const fetchMock = jest.fn();
const answer = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body });

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

const code = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return e instanceof AppApiError ? e.code : `not an AppApiError: ${String(e)}`;
  }
  return 'no error';
};

describe('a link in what the student wrote', () => {
  it('is refused before any request is sent', async () => {
    expect(await code(communityApi('post-save', { token: 't', body: { scope: 'all', kind: 'post', body: 'promo : bit.ly/3xYz' } }))).toBe('links');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('is allowed in a question to Charlotte, which nobody else reads', async () => {
    fetchMock.mockResolvedValue(answer(200, { answer: 'ok' }));
    await assistantApi('ask', { token: 't', body: { messages: [{ role: 'user', content: 'C’est quoi exemple.com ?' }] } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not block the usage counter, which is not student text', async () => {
    fetchMock.mockResolvedValue(answer(200, {}));
    await houseApi('track', { token: 't', body: { screen: 'exemple.com' } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('a request', () => {
  it('goes as a POST with the session token and the body as JSON', async () => {
    fetchMock.mockResolvedValue(answer(200, { posts: [] }));
    await expect(communityApi('wall', { token: 'session-token', body: { scope: 'all' } })).resolves.toEqual({ posts: [] });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/wall$/);
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer session-token');
    expect(JSON.parse(init.body)).toEqual({ scope: 'all' });
  });

  it('sends no Authorization header without a token', async () => {
    fetchMock.mockResolvedValue(answer(200, {}));
    await communityApi('wall', {});
    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
  });

  it('turns the server’s answer into the error the screens know', async () => {
    fetchMock.mockResolvedValue(answer(401, { error: 'unauthorized' }));
    expect(await code(communityApi('wall', { token: 'old' }))).toBe('unauthorized');
    fetchMock.mockResolvedValue({ ok: false, status: 502, json: async () => Promise.reject(new Error('not JSON')) });
    expect(await code(communityApi('wall', { token: 't' }))).toBe('server');
  });

  it('says "network" when the phone is offline', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    expect(await code(communityApi('wall', { token: 't' }))).toBe('network');
  });
});
