import '@testing-library/jest-dom'
import { beforeEach, vi } from 'vitest'

// Create a real localStorage implementation for tests
const createLocalStorageMock = () => {
  let store: Record<string, string> = {}
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    get length() {
      return Object.keys(store).length
    },
    key: (index: number) => {
      const keys = Object.keys(store)
      return keys[index] || null
    }
  }
}

// Set up localStorage mock
Object.defineProperty(window, 'localStorage', {
  value: createLocalStorageMock()
})

// Reset localStorage before each test
beforeEach(() => {
  window.localStorage.clear()
})

// Mock crypto.randomUUID for ID generation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9)
  }
})
