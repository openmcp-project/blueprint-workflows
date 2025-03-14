/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */

import * as core from '@actions/core'
import * as main from '../src/index'
import * as fs from 'fs'
import * as util from 'util'
import * as path from 'path'
import { utils, constants } from '../../../shared/dist'

// Mock the action's main function
const runMock = jest.spyOn(main, 'run')

// Mock the GitHub Actions core library
let debugMock: jest.SpiedFunction<typeof core.debug>
let errorMock: jest.SpiedFunction<typeof core.error>
let getInputMock: jest.SpiedFunction<typeof core.getInput>
let setFailedMock: jest.SpiedFunction<typeof core.setFailed>
let setOutputMock: jest.SpiedFunction<typeof core.setOutput>
let noticeMock: jest.SpiedFunction<typeof core.notice>
let startGroupMock: jest.SpiedFunction<typeof core.startGroup>

const originalEnv = process.env

const GITHUB_WORKSPACE = process.env[constants.envvars.GITHUB_WORKSPACE]?.toString()
const pathHelmChartFileListing = path.parse(GITHUB_WORKSPACE + '/' + constants.HelmChartFiles.listingFile)

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()

    if (fs.existsSync(path.format(pathHelmChartFileListing))) {
      fs.rmSync(path.format(pathHelmChartFileListing))
    }

    debugMock = jest.spyOn(core, 'debug').mockImplementation()
    errorMock = jest.spyOn(core, 'error').mockImplementation()
    getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
    noticeMock = jest.spyOn(core, 'notice').mockImplementation()
    startGroupMock = jest.spyOn(core, 'startGroup').mockImplementation()
    setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
    setOutputMock = jest.spyOn(core, 'setOutput').mockImplementation()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('Missing env', async () => {
    process.env[constants.envvars.GITHUB_WORKSPACE] = ''
    await main.run()
    expect(runMock).toHaveBeenCalled()
    expect(setFailedMock).toHaveBeenCalledWith(util.format(constants.ErrorMsgs.missingEnv, constants.envvars.GITHUB_WORKSPACE))
  })

  it('Helm Chart Listing File', async () => {
    process.env = {
      ...originalEnv,
      GITHUB_WORKSPACE: GITHUB_WORKSPACE,
      GITHUB_STEP_SUMMARY: GITHUB_WORKSPACE
    }

    await main.run()
    expect(runMock).toHaveReturned()
    expect(setFailedMock).not.toHaveBeenCalled()

    expect(fs.existsSync(GITHUB_WORKSPACE + '/' + constants.HelmChartFiles.listingFile)).toBe(true)

    expect(startGroupMock).toHaveBeenNthCalledWith(1, util.format(constants.Msgs.HelmChartListingFolderContaining, constants.HelmChartFiles.Chartyaml))
    expect(startGroupMock).toHaveBeenNthCalledWith(2, util.format(constants.Msgs.HelmChartListingFolderContaining, constants.HelmChartFiles.ciConfigYaml))
    expect(startGroupMock).toHaveBeenNthCalledWith(3, constants.Msgs.HelmChartListingFileYamlContent)
    expect(noticeMock).toHaveBeenCalledWith(util.format(constants.Msgs.HelmChartListingFileWritten, constants.HelmChartFiles.listingFile))

    const helmChartListingFileYamlDoc = utils.readYamlFile(pathHelmChartFileListing)
    // ToDo: mock actual functions that looksup folders and populates yaml document!
    const bla = utils.unrapYamlbyKey(helmChartListingFileYamlDoc, 'test-custom-chart__test-custom-chart')
    expect(utils.unrapYamlbyKey(bla, constants.ListingYamlKeys.name)).toBe('test-custom-chart')
    expect(utils.unrapYamlbyKey(bla, constants.ListingYamlKeys.relativePath)).toBe('test/helm/charts/test-custom-chart')
  })
})
