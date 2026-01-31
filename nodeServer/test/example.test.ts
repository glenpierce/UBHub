import { describe, it, expect } from 'vitest'

function addNumbers(firstNumber: number, secondNumber: number) {
  return firstNumber + secondNumber
}

describe('example test suite', () => {
  it('adds two numbers correctly', () => {
    expect(addNumbers(1, 2)).toBe(3)
  })
})
