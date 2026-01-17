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
      readPipelineFeatureOptions: jest.fn().mockReturnValue(options ? parseDocument(options) : false),
      readIgnoreWarnings: jest.fn().mockReturnValue(undefined) // Default: ignoreWarnings not set
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
      // Convert YAML sequence to array
      if (value && typeof value.toJSON === 'function') {
        return value.toJSON()
      }
      return value
    })
  }

  function setIgnoreWarnings(value: string[] | undefined | Error) {
    if (value instanceof Error) {
      helmChartInstanceMock.readIgnoreWarnings.mockImplementation(() => {
        throw value
      })
    } else {
      helmChartInstanceMock.readIgnoreWarnings.mockReturnValue(value)
    }
  }

  describe('ignoreWarnings option from YAML config', () => {
    it('should pass ignoreWarnings=undefined when option is not set (default)', async () => {
      setupHelmChartListingDoc('')
      // readPipelineFeature returns false by default (not set)

      await main.run()

      expect(helmChartInstanceMock.template).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.anything(), undefined)
    })

    it('should pass ignoreWarnings array when option is set to array', async () => {
      setupHelmChartListingDoc('--dependency-update: true')
      setIgnoreWarnings(['^walk\\.go:\\d+: found symbolic link in path: .*'])

      await main.run()

      expect(helmChartInstanceMock.template).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        ['^walk\\.go:\\d+: found symbolic link in path: .*']
      )
    })

    it('should pass empty array when ignoreWarnings is empty array', async () => {
      setupHelmChartListingDoc('--dependency-update: true')
      setIgnoreWarnings([])

      await main.run()

      expect(helmChartInstanceMock.template).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.anything(), [])
    })

    it('should throw error when ignoreWarnings is set to boolean', async () => {
      setupHelmChartListingDoc('--dependency-update: true')
      setIgnoreWarnings(new Error("'ignoreWarnings' must be an array of regex patterns, not a boolean"))

      await main.run()

      expect(core.setFailed).toHaveBeenCalledWith(
        expect.stringContaining("'ignoreWarnings' must be an array of regex patterns, not a boolean")
      )
    })

    it('should handle multiple patterns in ignoreWarnings array', async () => {
      setupHelmChartListingDoc(`--skip-crds: true
--skip-tests: true
--dependency-update: true`)
      setIgnoreWarnings(['^walk\\.go:\\d+: found symbolic link in path: .*', '^WARNING: Template expansion encountered symlinks'])

      await main.run()

      // Verify ignoreWarnings is passed correctly
      const templateCalls = helmChartInstanceMock.template.mock.calls
      expect(templateCalls.length).toBe(1)
      expect(templateCalls[0][3]).toEqual(['^walk\\.go:\\d+: found symbolic link in path: .*', '^WARNING: Template expansion encountered symlinks'])

      // Verify helm options are passed correctly
      const helmOptions = templateCalls[0][2]
      expect(helmOptions).toContain('--skip-crds')
      expect(helmOptions).toContain('--skip-tests')
      expect(helmOptions).toContain('--dependency-update')
    })
  })

  describe('integration with helm chart validation workflow', () => {
    it('should call template with correct parameters including ignoreWarnings array', async () => {
      setupHelmChartListingDoc('')
      setIgnoreWarnings(['^test-pattern.*'])

      await main.run()

      expect(helmChartInstanceMock.template).toHaveBeenCalledTimes(1)

      const [, valueFiles, helmOptions, ignoreWarnings] = helmChartInstanceMock.template.mock.calls[0]

      expect(dir).toEqual(
        expect.objectContaining({
          dir: '/test/workspace/charts/test-chart'
        })
      )
      expect(valueFiles).toBe('-f /test/workspace/charts/test-chart/values.yaml')
      expect(Array.isArray(helmOptions)).toBe(true)
      expect(ignoreWarnings).toEqual(['^test-pattern.*'])
    })

    it('should handle validation enabled with ignoreWarnings array', async () => {
      setupHelmChartListingDoc('--dependency-update: false')
      setIgnoreWarnings(['^pattern.*'])
      utils.isFunctionEnabled.mockReturnValue(true)

      await main.run()

      expect(core.startGroup).toHaveBeenCalledWith('Helm Chart Manifest Validation')
      expect(helmChartInstanceMock.template).toHaveBeenCalled()
      expect(core.endGroup).toHaveBeenCalled()
    })

    it('should not call template when validation is disabled regardless of ignoreWarnings', async () => {
      setupHelmChartListingDoc('')
      setIgnoreWarnings(['^pattern.*'])
      utils.isFunctionEnabled.mockReturnValue(false) // Validation disabled

      await main.run()

      expect(helmChartInstanceMock.template).not.toHaveBeenCalled()
    })
  })

  describe('error handling with ignoreWarnings', () => {
    it('should catch and handle errors from template when ignoreWarnings is array', async () => {
      setupHelmChartListingDoc('')
      setIgnoreWarnings(['^pattern.*'])
      helmChartInstanceMock.template.mockRejectedValue(new Error('Template error'))

      await main.run()

      expect(core.setFailed).toHaveBeenCalledWith('Template error')
    })

    it('should catch and handle errors from template when ignoreWarnings is undefined', async () => {
      setupHelmChartListingDoc('')
      // ignoreWarnings not set (default)
      helmChartInstanceMock.template.mockRejectedValue(new Error('Template error with warnings'))

      await main.run()

      expect(core.setFailed).toHaveBeenCalledWith('Template error with warnings')
    })
  })

  describe('summary table generation with ignoreWarnings', () => {
    it('should add successful validation to summary when ignoreWarnings is configured', async () => {
      setupHelmChartListingDoc('')
      setIgnoreWarnings(['^pattern.*'])

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
