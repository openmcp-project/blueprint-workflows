import { describe, it, expect } from '@jest/globals'
import * as utils from '../src/utils.js'

describe('index', () => {
  it('exports expected utils', () => {
    expect(utils).toBeDefined()
  })
})
