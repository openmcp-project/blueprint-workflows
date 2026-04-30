//import * as main from '../src/main'
import { parseDocument } from 'yaml'

let main: any
let core: any
//let yaml: any
let utils: any

describe('main.run manifest templating scenarios', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()

    process.env = { ...OLD_ENV }

    jest.doMock('@actions/core', () => ({
      startGroup: jest.fn(),
      endGroup: jest.fn(),
      summary: {
        addHeading: jest.fn().mockReturnThis(),
        addRaw: jest.fn().mockReturnThis(),
        addTable: jest.fn().mockReturnThis(),
        addBreak: jest.fn().mockReturnThis(),
        addDetails: jest.fn().mockReturnThis(),
        write: jest.fn().mockResolvedValue(undefined)
      },
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      setFailed: jest.fn()
    }))
    jest.doMock('fs', () => ({
      existsSync: jest.fn(() => false),
      mkdirSync: jest.fn(),
      rmSync: jest.fn(),
      constants: {
        O_RDONLY: 0
      },
      promises: {
        access: jest.fn(),
        appendFile: jest.fn(),
        writeFile: jest.fn()
      }
    }))
    jest.doMock('path', () => ({
      parse: jest.fn((p: string) => ({ dir: p, base: p, ext: '', name: '', root: '' })),
      format: jest.fn((obj: any) => obj.dir)
    }))

    jest.doMock('../../../../typescript/packages/shared/', () => {
      const actualUtils = jest.requireActual('../../../../typescript/packages/shared/')
      return {
        __esModule: true,
        ...actualUtils,
        utils: {
          ...actualUtils.utils,
          isFunctionEnabled: jest.fn(),
          HelmChart: {
            ...actualUtils.utils.HelmChart,
            getInstance: jest.fn(() => ({
              getListingFileContent: jest.fn(() => 'listing-content'),
              template: jest.fn(),
              readPipelineFeature: jest.fn(),
              readPipelineFeatureOptions: jest.fn(() => false)
            }))
          },
          Git: {
            getInstance: jest.fn(() => ({
              status: jest.fn().mockResolvedValue({ stdout: '' }),
              add: jest.fn(),
              commit: jest.fn(),
              push: jest.fn()
            }))
          }
        }
      }
    })

    jest.isolateModules(() => {
      core = require('@actions/core')
      utils = require('../../../../typescript/packages/shared/').utils
      main = require('../src/main') // ✅ delay until all mocks are in place
    })
  })

  afterAll(() => {
    process.env = OLD_ENV // Restore old environment
  })

  let helmChartInstanceMock: any

  function setupHelmChartListingDoc(options: any) {
    process.env.GITHUB_WORKSPACE = 'testenv'

    helmChartInstanceMock = {
      getListingFileContent: jest.fn().mockReturnValue(`test-custom-chart__test-custom-chart:
  dir: /home/runner/work/blueprint-workflows/blueprint-workflows/test/helm/charts/test-custom-chart
  name: test-custom-chart
  folderName: test-custom-chart
  relativePath: test/helm/charts/test-custom-chart
  manifestPath: test/helm/charts`),
      template: jest.fn().mockReturnValue(undefined),
      readPipelineFeature: jest.fn().mockReturnValue(parseDocument(options)),
      readPipelineFeatureOptions: jest.fn().mockReturnValue(false),
      readIgnoreWarnings: jest.fn().mockReturnValue(undefined)
    }

    // Mock getInstance to return this mock instance
    utils.HelmChart.getInstance.mockReturnValue(helmChartInstanceMock)
    utils.isFunctionEnabled.mockReturnValue(true)
  }

  it('handles default-manifest-templating undefined (should run default)', async () => {
    setupHelmChartListingDoc('')

    await main.run()

    expect(core.info).toHaveBeenCalledWith('Default manifest templating enabled')
    expect(helmChartInstanceMock.template).toHaveBeenCalledWith(
      {
        dir: '/home/runner/work/blueprint-workflows/blueprint-workflows/test/helm/charts/test-custom-chart',
        base: '/home/runner/work/blueprint-workflows/blueprint-workflows/test/helm/charts/test-custom-chart',
        ext: '',
        name: '',
        root: ''
      },
      ' -f testenv/test/helm/charts/test-custom-chart/values.yaml',
      ['--output-dir "testenv/manifests/test/helm/charts/test-custom-chart"'],
      undefined
    )
    expect(core.info).toHaveBeenCalledWith('Additional manifest templating disabled')
  })

  it('handles default-manifest-templating true', async () => {
    setupHelmChartListingDoc('default-manifest-templating: true')

    await main.run()

    expect(core.info).toHaveBeenCalledWith('Default manifest templating enabled')
    expect(helmChartInstanceMock.template).toHaveBeenCalledWith(
      {
        dir: '/home/runner/work/blueprint-workflows/blueprint-workflows/test/helm/charts/test-custom-chart',
        base: '/home/runner/work/blueprint-workflows/blueprint-workflows/test/helm/charts/test-custom-chart',
        ext: '',
        name: '',
        root: ''
      },
      ' -f testenv/test/helm/charts/test-custom-chart/values.yaml',
      ['--output-dir "testenv/manifests/test/helm/charts/test-custom-chart"'],
      undefined
    )
    expect(core.info).toHaveBeenCalledWith('Additional manifest templating disabled')
  })

  it('handles default-manifest-templating false', async () => {
    setupHelmChartListingDoc('default-manifest-templating: false')

    await main.run()

    expect(core.info).toHaveBeenCalledWith('Default manifest templating disabled')
    expect(helmChartInstanceMock.template).not.toHaveBeenCalled()
    expect(core.info).toHaveBeenCalledWith('Additional manifest templating disabled')
  })

  it('handles default-manifest-templating defined but not boolean', async () => {
    setupHelmChartListingDoc("default-manifest-templating: 'yes'")

    await main.run()

    expect(core.info).toHaveBeenCalledWith('Default manifest templating enabled')
    expect(helmChartInstanceMock.template).toHaveBeenCalledWith(
      {
        dir: '/home/runner/work/blueprint-workflows/blueprint-workflows/test/helm/charts/test-custom-chart',
        base: '/home/runner/work/blueprint-workflows/blueprint-workflows/test/helm/charts/test-custom-chart',
        ext: '',
        name: '',
        root: ''
      },
      ' -f testenv/test/helm/charts/test-custom-chart/values.yaml',
      ['--output-dir "testenv/manifests/test/helm/charts/test-custom-chart"'],
      undefined
    )
    expect(core.info).toHaveBeenCalledWith('Additional manifest templating disabled')
  })

  it('handles additional-manifest-templating defined', async () => {
    setupHelmChartListingDoc(
      `default-manifest-templating: false
additional-manifest-templating:
  - prefix-manifest-folder-name: "dev"
    value-files:
      - "values.network.yaml"
      - "values.dev.yaml"`
    )

    await main.run()
    // Should still call template, but prefix will be assigned an incrementing value
    //console.log(helmChartInstanceMock.template.mock.calls)
    expect(helmChartInstanceMock.template).toHaveBeenCalledWith(
      {
        dir: '/home/runner/work/blueprint-workflows/blueprint-workflows/test/helm/charts/test-custom-chart',
        base: '/home/runner/work/blueprint-workflows/blueprint-workflows/test/helm/charts/test-custom-chart',
        ext: '',
        name: '',
        root: ''
      },
      ' -f testenv/test/helm/charts/test-custom-chart/values.network.yaml -f testenv/test/helm/charts/test-custom-chart/values.dev.yaml',
      ['--output-dir "testenv/manifests/test/helm/charts/dev.test-custom-chart"'],
      undefined
    )
    expect(core.info).toHaveBeenCalledWith(
      'Additional manifest templating detected: [{"prefix-manifest-folder-name":"dev","value-files":["values.network.yaml","values.dev.yaml"]}]'
    )
  })

  it('handles additional-manifest-templating defined but not array', async () => {
    setupHelmChartListingDoc(
      `default-manifest-templating: false
additional-manifest-templating: true`
    )

    await main.run()

    expect(helmChartInstanceMock.template).not.toHaveBeenCalled()
    expect(core.info).toHaveBeenCalledWith('Additional manifest templating disabled')
  })

  it('handles additional-manifest-templating defined but empty', async () => {
    setupHelmChartListingDoc(
      `default-manifest-templating: false
additional-manifest-templating: []`
    )

    await main.run()
    // Should not call template, but should log info
    expect(helmChartInstanceMock.template).not.toHaveBeenCalled()
    expect(core.info).toHaveBeenCalledWith('Additional manifest templating detected: []')
  })

  it('handles prefix-manifest-folder-name undefined or empty', async () => {
    setupHelmChartListingDoc(
      `default-manifest-templating: false
additional-manifest-templating:
  - value-files:
      - "values.network.yaml"
      - "values.dev.yaml"`
    )

    await main.run()
    // Should still call template, but prefix will be assigned an incrementing value
    //console.log(helmChartInstanceMock.template.mock.calls)
    expect(helmChartInstanceMock.template).not.toHaveBeenCalled()
    expect(core.info).toHaveBeenCalledWith('Additional manifest templating detected: [{"value-files":["values.network.yaml","values.dev.yaml"]}]')
    expect(core.error).toHaveBeenCalledWith("Missing 'prefix-manifest-folder-name' in additional manifest templating options")
  })
})
