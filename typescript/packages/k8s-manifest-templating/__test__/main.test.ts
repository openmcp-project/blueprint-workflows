import { describe, it, expect } from '@jest/globals'
import * as main from '../src/main.js'

describe('main', () => {
  it('exports a run function', () => {
    expect(typeof main.run).toBe('function')
  })
})
