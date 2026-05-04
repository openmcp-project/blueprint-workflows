/**
 * Unit tests for the action's main functionality, src/index.ts
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import * as fs from 'fs'
import * as util from 'util'
import * as path from 'path'
import { constants } from '../../../shared/dist/index.js'

const debugFn = jest.fn()
const errorFn = jest.fn()
const getInputFn = jest.fn(() => '')
const noticeFn = jest.fn()
const startGroupFn = jest.fn()
const setFailedFn = jest.fn()
const setOutputFn = jest.fn()
const endGroupFn = jest.fn()

jest.unstable_mockModule('@actions/core', () => ({
  debug: debugFn,
  error: errorFn,
  getInput: getInputFn,
  notice: noticeFn,
  startGroup: startGroupFn,
  endGroup: endGroupFn,
  setFailed: setFailedFn,
  setOutput: setOutputFn,
  info: jest.fn(),
  warning: jest.fn(),
  isDebug: jest.fn(() => false)
}))

const { run } = await import('../src/index.js')

// Resolve GITHUB_WORKSPACE: use env var or fall back to repo root
const GITHUB_WORKSPACE = process.env[constants.envvars.GITHUB_WORKSPACE]?.toString() || path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../..')
const pathKustomizeFileListing = path.parse(GITHUB_WORKSPACE + '/' + constants.KustomizeFiles.listingFile)

const originalEnv = { ...process.env }

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    if (fs.existsSync(path.format(pathKustomizeFileListing))) {
      fs.rmSync(path.format(pathKustomizeFileListing))
    }
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('should fail when GITHUB_WORKSPACE is missing', async () => {
    process.env[constants.envvars.GITHUB_WORKSPACE] = ''
    await run()
    expect(setFailedFn).toHaveBeenCalledWith(util.format(constants.ErrorMsgs.missingEnv, constants.envvars.GITHUB_WORKSPACE))
  })

  it('should create kustomize listing file when kustomization files are found', async () => {
    // Create a temporary kustomization.yaml file for testing
    const testKustomizeDir = path.join(GITHUB_WORKSPACE, 'test-kustomize-tmp')
    const testKustomizationFile = path.join(testKustomizeDir, 'kustomization.yaml')

    if (!fs.existsSync(testKustomizeDir)) {
      fs.mkdirSync(testKustomizeDir, { recursive: true })
    }

    fs.writeFileSync(
      testKustomizationFile,
      `apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namePrefix: test-
resources:
  - deployment.yaml
`
    )

    process.env = {
      ...originalEnv,
      GITHUB_WORKSPACE: GITHUB_WORKSPACE,
      GITHUB_STEP_SUMMARY: GITHUB_WORKSPACE
    }

    await run()
    expect(setFailedFn).not.toHaveBeenCalled()

    expect(fs.existsSync(path.format(pathKustomizeFileListing))).toBe(true)
    expect(noticeFn).toHaveBeenCalledWith(util.format(constants.Msgs.KustomizeListingFileWritten, constants.KustomizeFiles.listingFile))

    // Clean up
    fs.rmSync(testKustomizeDir, { recursive: true, force: true })
    if (fs.existsSync(path.format(pathKustomizeFileListing))) {
      fs.rmSync(path.format(pathKustomizeFileListing))
    }
  })
})
