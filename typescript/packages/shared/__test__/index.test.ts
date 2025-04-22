/**
 * Unit tests for the action's entrypoint, src/utils.ts
 */

import * as utils from '../src/utils'

// Mock the action's entrypoint
const runMock = jest.spyOn(utils, 'assertNullOrEmpty').mockImplementation()

describe('index', () => {
  it('calls run when imported', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../src/utils')
    // TODO: change this, when unit test is avaiable!
    expect(runMock).toHaveBeenCalledTimes(0)
  })
})
