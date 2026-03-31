/**
 * Tests for auth utilities
 */
import { setToken, getToken, removeToken, isAuthenticated } from '@/lib/auth'

describe('Auth utilities', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('setToken stores token in localStorage', () => {
    setToken('test-token-123')
    expect(localStorage.getItem('token')).toBe('test-token-123')
  })

  test('getToken retrieves stored token', () => {
    localStorage.setItem('token', 'my-token')
    expect(getToken()).toBe('my-token')
  })

  test('getToken returns null when no token', () => {
    expect(getToken()).toBeNull()
  })

  test('removeToken clears token', () => {
    localStorage.setItem('token', 'to-remove')
    removeToken()
    expect(localStorage.getItem('token')).toBeNull()
  })

  test('isAuthenticated returns true when token exists', () => {
    localStorage.setItem('token', 'valid')
    expect(isAuthenticated()).toBe(true)
  })

  test('isAuthenticated returns false when no token', () => {
    expect(isAuthenticated()).toBe(false)
  })
})
