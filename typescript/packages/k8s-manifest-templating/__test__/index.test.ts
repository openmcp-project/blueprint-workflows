import { describe, it, expect } from '@jest/globals'
import * as index from '../src/index.js'

describe('index', () => {
  it('exports expected interface', () => {
    expect(index).toBeDefined()
  })
})
