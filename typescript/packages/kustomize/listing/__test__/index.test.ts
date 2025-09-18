/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
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

const GITHUB_WORKSPACE = process.env[constants.envvars.GITHUB_WORKSPACE]?.toString() || '/tmp/test-workspace'
const pathKustomizeFileListing = path.parse(GITHUB_WORKSPACE + '/' + constants.KustomizeFiles.listingFile)

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()

    // Set up test environment
    process.env[constants.envvars.GITHUB_WORKSPACE] = GITHUB_WORKSPACE
    
    // Ensure test workspace directory exists
    if (!fs.existsSync(GITHUB_WORKSPACE)) {
      fs.mkdirSync(GITHUB_WORKSPACE, { recursive: true })
    }

    if (fs.existsSync(path.format(pathKustomizeFileListing))) {
      fs.rmSync(path.format(pathKustomizeFileListing))
    }

    debugMock = jest.spyOn(core, 'debug').mockImplementation(() => {})
    errorMock = jest.spyOn(core, 'error').mockImplementation(() => {})
    getInputMock = jest.spyOn(core, 'getInput').mockImplementation(() => '')
    noticeMock = jest.spyOn(core, 'notice').mockImplementation(() => {})
    startGroupMock = jest.spyOn(core, 'startGroup').mockImplementation(() => {})
    setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation(() => {})
    setOutputMock = jest.spyOn(core, 'setOutput').mockImplementation(() => {})
  })

  it('should create kustomize listing file when kustomization files are found', async () => {
    // Create a temporary kustomization.yaml file for testing
    const testKustomizeDir = path.join(GITHUB_WORKSPACE!, 'test-kustomize')
    const testKustomizationFile = path.join(testKustomizeDir, 'kustomization.yaml')
    
    if (!fs.existsSync(testKustomizeDir)) {
      fs.mkdirSync(testKustomizeDir, { recursive: true })
    }
    
    fs.writeFileSync(testKustomizationFile, `
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namePrefix: test-
resources:
  - deployment.yaml
  - service.yaml
`)

    await main.run()
    expect(runMock).toHaveReturned()

    // Verify that the listing file was created
    expect(fs.existsSync(path.format(pathKustomizeFileListing))).toBe(true)
    
    // Verify that notice was called with success message
    expect(noticeMock).toHaveBeenCalledWith(
      util.format(constants.Msgs.KustomizeListingFileWritten, constants.KustomizeFiles.listingFile)
    )

    // Clean up
    fs.rmSync(testKustomizeDir, { recursive: true, force: true })
    if (fs.existsSync(path.format(pathKustomizeFileListing))) {
      fs.rmSync(path.format(pathKustomizeFileListing))
    }
  })

  it('should handle missing GITHUB_WORKSPACE environment variable', async () => {
    process.env = { ...originalEnv }
    delete process.env[constants.envvars.GITHUB_WORKSPACE]

    await main.run()
    expect(runMock).toHaveReturned()

    // Verify that setFailed was called with the appropriate error message
    expect(setFailedMock).toHaveBeenCalledWith(
      util.format(constants.ErrorMsgs.missingEnv, constants.envvars.GITHUB_WORKSPACE)
    )

    process.env = originalEnv
  })

  it('should handle empty GITHUB_WORKSPACE environment variable', async () => {
    process.env = { ...originalEnv }
    process.env[constants.envvars.GITHUB_WORKSPACE] = ''

    await main.run()
    expect(runMock).toHaveReturned()

    // Verify that setFailed was called with the appropriate error message
    expect(setFailedMock).toHaveBeenCalledWith(
      util.format(constants.ErrorMsgs.missingEnv, constants.envvars.GITHUB_WORKSPACE)
    )

    process.env = originalEnv
  })
})
