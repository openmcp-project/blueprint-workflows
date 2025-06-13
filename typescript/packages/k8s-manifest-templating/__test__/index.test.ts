//import * as main from '../src/main'
let main: any
let core: any
//let yaml: any
let utils: any

describe('index', () => {
  let runMock: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()

    jest.doMock('../src/main', () => ({
      run: jest.fn()
    }))

    main = require('../src/main')
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
  })

  it('calls run when imported', () => {
    const main = require('../src/main')
    runMock = main.run
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../src/index')
    expect(runMock).toHaveBeenCalled()
  })
})
