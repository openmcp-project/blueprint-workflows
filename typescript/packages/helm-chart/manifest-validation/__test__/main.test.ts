/**
 * Unit tests for main.run ignoreWarnings functionality
 */

import { parseDocument } from 'yaml'

let main: any
let core: any
let utils: any

describe('main.run with ignoreWarnings option', () => {
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
      format: jest.fn((obj: any) => obj.dir),
      join: jest.fn((...parts: string[]) => parts.join('/'))
    }))

    jest.doMock('../../../shared/dist', () => {
      const actualShared = jest.requireActual('../../../shared/dist')
      return {
        __esModule: true,
        ...actualShared,
        utils: {
          ...actualShared.utils,
          assertNullOrEmpty: jest.fn(),
          isFunctionEnabled: jest.fn(),
          unrapYamlbyKey: jest.fn(),
          HelmChart: {
            ...actualShared.utils.HelmChart,
            getInstance: jest.fn(() => ({
              getListingFileContent: jest.fn(() => 'listing-content'),
              template: jest.fn(),
              getHelmValueFiles: jest.fn(() => '-f /path/values.yaml'),
              readPipelineFeatureOptions: jest.fn(() => false)
            }))
          }
        }
      }
    })

    jest.isolateModules(() => {
      core = require('@actions/core')
      const shared = require('../../../shared/dist')
      utils = shared.utils
      main = require('../src/main')
    })
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  let helmChartInstanceMock: any

  function setupHelmChartListingDoc(options: any) {
    process.env.GITHUB_WORKSPACE = '/test/workspace'

    helmChartInstanceMock = {
      getListingFileContent: jest.fn().mockReturnValue(`test-chart:
  dir: /test/workspace/charts/test-chart
  name: test-chart
  folderName: test-chart
  relativePath: charts/test-chart
  manifestPath: charts`),
      template: jest.fn().mockResolvedValue(undefined),
      getHelmValueFiles: jest.fn().mockReturnValue('-f /test/workspace/charts/test-chart/values.yaml'),
      readPipelineFeatureOptions: jest.fn().mockReturnValue(options ? parseDocument(options) : false)
    }

    utils.HelmChart.getInstance.mockReturnValue(helmChartInstanceMock)
    utils.isFunctionEnabled.mockReturnValue(true)
    utils.assertNullOrEmpty.mockImplementation(() => {})

    // Mock unrapYamlbyKey to handle different keys
    utils.unrapYamlbyKey.mockImplementation((doc: any, key: string, defaultValue?: any) => {
      if (typeof doc === 'string') {
        return doc
      }

      const value = doc?.get?.(key)
      if (value === undefined || value === null) {
        return defaultValue
      }
      return value
    })
  }

  describe('ignoreWarnings option from YAML config', () => {
    it('should pass ignoreWarnings=false when option is not set (default)', async () => {
      setupHelmChartListingDoc('')

      await main.run()

      expect(helmChartInstanceMock.template).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        false
      )
    })

    it('should pass ignoreWarnings=true when option is set to true', async () => {
      const options = `--dependency-update: true
ignoreWarnings: true`

      setupHelmChartListingDoc(options)

      await main.run()

      expect(helmChartInstanceMock.template).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        true
      )
    })

    it('should pass ignoreWarnings=false when option is explicitly set to false', async () => {
      const options = `--dependency-update: true
ignoreWarnings: false`

      setupHelmChartListingDoc(options)

      await main.run()

      expect(helmChartInstanceMock.template).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        false
      )
    })

    it('should handle ignoreWarnings with other helm options', async () => {
      const options = `--skip-crds: true
--skip-tests: true
--dependency-update: true
ignoreWarnings: true`

      setupHelmChartListingDoc(options)

      await main.run()

      // Verify ignoreWarnings is passed correctly
      const templateCalls = helmChartInstanceMock.template.mock.calls
      expect(templateCalls.length).toBe(1)
      expect(templateCalls[0][3]).toBe(true) // 4th parameter should be ignoreWarnings=true

      // Verify helm options are passed correctly
      const helmOptions = templateCalls[0][2]
      expect(helmOptions).toContain('--skip-crds')
      expect(helmOptions).toContain('--skip-tests')
      expect(helmOptions).toContain('--dependency-update')
    })
  })

  describe('integration with helm chart validation workflow', () => {
    it('should call template with correct parameters including ignoreWarnings', async () => {
      const options = `ignoreWarnings: true`

      setupHelmChartListingDoc(options)

      await main.run()

      expect(helmChartInstanceMock.template).toHaveBeenCalledTimes(1)

      const [dir, valueFiles, helmOptions, ignoreWarnings] = helmChartInstanceMock.template.mock.calls[0]

      expect(dir).toEqual(expect.objectContaining({
        dir: '/test/workspace/charts/test-chart'
      }))
      expect(valueFiles).toBe('-f /test/workspace/charts/test-chart/values.yaml')
      expect(Array.isArray(helmOptions)).toBe(true)
      expect(ignoreWarnings).toBe(true)
    })

    it('should handle validation enabled with ignoreWarnings', async () => {
      const options = `--dependency-update: false
ignoreWarnings: true`

      setupHelmChartListingDoc(options)
      utils.isFunctionEnabled.mockReturnValue(true)

      await main.run()

      expect(core.startGroup).toHaveBeenCalledWith('Helm Chart Manifest Validation')
      expect(helmChartInstanceMock.template).toHaveBeenCalled()
      expect(core.endGroup).toHaveBeenCalled()
    })

    it('should not call template when validation is disabled regardless of ignoreWarnings', async () => {
      const options = `ignoreWarnings: true`

      setupHelmChartListingDoc(options)
      utils.isFunctionEnabled.mockReturnValue(false) // Validation disabled

      await main.run()

      expect(helmChartInstanceMock.template).not.toHaveBeenCalled()
    })
  })

  describe('error handling with ignoreWarnings', () => {
    it('should catch and handle errors from template when ignoreWarnings is true', async () => {
      const options = `ignoreWarnings: true`

      setupHelmChartListingDoc(options)
      helmChartInstanceMock.template.mockRejectedValue(new Error('Template error'))

      await main.run()

      expect(core.setFailed).toHaveBeenCalledWith('Template error')
    })

    it('should catch and handle errors from template when ignoreWarnings is false', async () => {
      const options = `ignoreWarnings: false`

      setupHelmChartListingDoc(options)
      helmChartInstanceMock.template.mockRejectedValue(new Error('Template error with warnings'))

      await main.run()

      expect(core.setFailed).toHaveBeenCalledWith('Template error with warnings')
    })
  })

  describe('summary table generation with ignoreWarnings', () => {
    it('should add successful validation to summary when ignoreWarnings is enabled', async () => {
      const options = `ignoreWarnings: true`

      setupHelmChartListingDoc(options)

      await main.run()

      expect(core.summary.addTable).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.arrayContaining([
            expect.objectContaining({ data: 'UID Helm Chart', header: true })
          ])
        ])
      )
      expect(core.summary.write).toHaveBeenCalled()
    })
  })
})
