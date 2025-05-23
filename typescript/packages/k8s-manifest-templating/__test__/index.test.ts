/**
 * Unit tests for the action's entrypoint, src/index.ts
 */

import * as main from '../src/main'

const mockUtilsHelmChart = {
  getListingFileContent: jest.fn(),
  readPipelineFeature: jest.fn(),
  readPipelineFeatureOptions: jest.fn(),
  template: jest.fn()
}

const mockUtils = {
  assertNullOrEmpty: jest.fn(),
  unrapYamlbyKey: jest.fn(),
  isFunctionEnabled: jest.fn(),
  HelmChart: { getInstance: jest.fn(() => mockUtilsHelmChart) },
  Git: { getInstance: jest.fn(() => ({
    status: jest.fn().mockResolvedValue({ stdout: '' }),
    add: jest.fn(),
    commit: jest.fn(),
    push: jest.fn()
  })) }
}

jest.mock('../src/main', () => {
  const actual = jest.requireActual('../src/main')
  return {
    ...actual,
    __esModule: true,
    run: jest.fn()
  }
})

jest.mock('../src/main', () => ({
  ...jest.requireActual('../src/main'),
  utils: mockUtils,
  constants: {
    envvars: { GITHUB_WORKSPACE: 'GITHUB_WORKSPACE' },
    ListingYamlKeys: { dir: 'dir', name: 'name', relativePath: 'relativePath' },
    Functionality: { k8sManifestTemplating: 'k8sManifestTemplating' },
    HelmChartFiles: { valuesYaml: 'values.yaml', ciConfigYaml: 'ci-config.yaml' }
  }
}))

describe('index', () => {
  const runMock = jest.spyOn(main, 'run').mockImplementation()

  afterEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
  })

  it('calls run when imported', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../src/index')
    expect(runMock).toHaveBeenCalled()
  })
})

describe('main.run manifest templating scenarios', () => {
  let mainModule: typeof import('../src/main')
  let core: any
  let yaml: any

  beforeEach(() => {
    jest.resetModules()
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
      notice: jest.fn(),
      debug: jest.fn(),
      setFailed: jest.fn()
    }))
    jest.doMock('yaml', () => ({
      Document: jest.fn(function (content) {
        this.content = content
        this.toJSON = () => content
      }),
      parse: jest.fn((str: string) => str),
      stringify: jest.fn(() => 'yaml-string')
    }))
    jest.doMock('fs', () => ({
      existsSync: jest.fn(() => false),
      mkdirSync: jest.fn(),
      rmSync: jest.fn()
    }))
    jest.doMock('path', () => ({
      parse: jest.fn((p: string) => ({ dir: p, base: p, ext: '', name: '', root: '' })),
      format: jest.fn((obj: any) => obj.dir)
    }))
    core = require('@actions/core')
    yaml = require('yaml')
    mainModule = require('../src/main')
  })

  function setupHelmChartListingDoc(options: any) {
    // Simulate a single chart in the listing
    mockUtilsHelmChart.getListingFileContent.mockReturnValue('listing-content')
    yaml.parse.mockReturnValue({ chart1: options })
    yaml.Document.mockImplementation(function (content: any) {
      this.content = content
      this.toJSON = () => content
    })
    mockUtils.unrapYamlbyKey.mockImplementation((doc, key, fallback) => {
      if (doc && typeof doc === 'object' && key in doc) return doc[key]
      return fallback
    })
    mockUtils.isFunctionEnabled.mockReturnValue(true)
    mockUtilsHelmChart.readPipelineFeature.mockReturnValue(options)
    mockUtilsHelmChart.readPipelineFeatureOptions.mockReturnValue({})
  }

  it('handles default-manifest-templating undefined (should run default)', async () => {
    setupHelmChartListingDoc({})
    await mainModule.run()
    expect(mockUtilsHelmChart.template).toHaveBeenCalled()
    expect(core.info).toHaveBeenCalledWith('Default manifest templating enabled')
  })

  it('handles default-manifest-templating true', async () => {
    setupHelmChartListingDoc({ 'default-manifest-templating': true })
    await mainModule.run()
    expect(mockUtilsHelmChart.template).toHaveBeenCalled()
    expect(core.info).toHaveBeenCalledWith('Default manifest templating enabled')
  })

  it('handles default-manifest-templating false', async () => {
    setupHelmChartListingDoc({ 'default-manifest-templating': false })
    await mainModule.run()
    expect(mockUtilsHelmChart.template).not.toHaveBeenCalled()
    expect(core.info).toHaveBeenCalledWith('Default manifest templating disabled')
  })

  it('handles default-manifest-templating defined but not boolean', async () => {
    setupHelmChartListingDoc({ 'default-manifest-templating': 'yes' })
    await mainModule.run()
    expect(mockUtilsHelmChart.template).toHaveBeenCalled()
    expect(core.info).toHaveBeenCalledWith('Default manifest templating enabled')
  })

  it('handles additional-manifest-templating undefined', async () => {
    setupHelmChartListingDoc({})
    await mainModule.run()
    // Should not call runHelmTemplating for additional
    expect(core.info).not.toHaveBeenCalledWith(expect.stringContaining('Additional manifest templating detected'))
  })

  it('handles additional-manifest-templating defined but not array', async () => {
    setupHelmChartListingDoc({ 'additional-manifest-templating': 'not-an-array' })
    await mainModule.run()
    expect(core.info).not.toHaveBeenCalledWith(expect.stringContaining('Additional manifest templating detected'))
  })

  it('handles prefix-manifest-folder-name undefined or empty', async () => {
    setupHelmChartListingDoc({
      'additional-manifest-templating': [{ 'value-files': ['foo.yaml'] }]
    })
    await mainModule.run()
    // Should still call template, but prefix will be 'undefined.'
    expect(mockUtilsHelmChart.template).toHaveBeenCalled()
  })

  it('handles prefix-manifest-folder-name not a string', async () => {
    setupHelmChartListingDoc({
      'additional-manifest-templating': [{ 'prefix-manifest-folder-name': 123, 'value-files': ['foo.yaml'] }]
    })
    await mainModule.run()
    expect(mockUtilsHelmChart.template).toHaveBeenCalled()
  })

  it('handles value-files does not exist or is empty', async () => {
    setupHelmChartListingDoc({
      'additional-manifest-templating': [{ 'prefix-manifest-folder-name': 'test' }]
    })
    await mainModule.run()
    expect(mockUtilsHelmChart.template).toHaveBeenCalled()
  })

  it('handles value-files exists but is not array', async () => {
    setupHelmChartListingDoc({
      'additional-manifest-templating': [{ 'prefix-manifest-folder-name': 'test', 'value-files': 'not-an-array' }]
    })
    await mainModule.run()
    expect(mockUtilsHelmChart.template).toHaveBeenCalled()
  })

  it('handles value-files contains file names that do not exist', async () => {
    setupHelmChartListingDoc({
      'additional-manifest-templating': [{ 'prefix-manifest-folder-name': 'test', 'value-files': ['notfound.yaml'] }]
    })
    await mainModule.run()
    expect(mockUtilsHelmChart.template).toHaveBeenCalled()
  })
})
