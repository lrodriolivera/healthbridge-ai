/**
 * Tests for API client
 */
import { api } from '@/lib/api'

const mockFetch = global.fetch as jest.Mock

describe('API Client', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    localStorage.clear()
  })

  test('login sends correct request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'jwt-token', token_type: 'bearer' }),
    })

    const result = await api.login('test@test.com', 'Password1')
    expect(result.access_token).toBe('jwt-token')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'test@test.com', password: 'Password1' }),
      }),
    )
  })

  test('register sends correct request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'new-jwt', token_type: 'bearer' }),
    })

    const result = await api.register('new@test.com', 'Password1', 'My Org')
    expect(result.access_token).toBe('new-jwt')
  })

  test('includes auth header when token exists', async () => {
    localStorage.setItem('token', 'my-jwt-token')
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ items: [], total: 0 }),
    })

    await api.listProjects()
    const headers = mockFetch.mock.calls[0][1].headers
    expect(headers.Authorization).toBe('Bearer my-jwt-token')
  })

  test('does not include auth header without token', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ items: [], total: 0 }),
    })

    await api.listProjects()
    const headers = mockFetch.mock.calls[0][1].headers
    expect(headers.Authorization).toBeUndefined()
  })

  test('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ detail: 'Bad request' }),
    })

    await expect(api.login('bad', 'bad')).rejects.toThrow('Bad request')
  })

  test('redirects to login on 401', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Unauthorized' }),
    })

    // Mock window.location
    delete (window as any).location
    window.location = { href: '', pathname: '/projects' } as any

    await expect(api.listProjects()).rejects.toThrow('Unauthorized')
    expect(localStorage.getItem('token')).toBeNull()
  })

  test('returns null for 204 responses', async () => {
    localStorage.setItem('token', 'jwt')
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
    })

    const result = await api.deleteProject('some-id')
    expect(result).toBeNull()
  })

  test('createProject sends correct body', async () => {
    localStorage.setItem('token', 'jwt')
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ id: 'new-id', name: 'Test' }),
    })

    await api.createProject({ name: 'Test', source_platforms: ['mirth_connect', 'oracle_soa'] })
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.source_platforms).toEqual(['mirth_connect', 'oracle_soa'])
  })
})
