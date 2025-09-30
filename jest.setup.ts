// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Suppress console errors and warnings in tests (they clutter output)
// If you need to see them for debugging, comment these out
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
}
