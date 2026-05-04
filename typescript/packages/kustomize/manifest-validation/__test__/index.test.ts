/**
 * Unit tests for the action's main functionality, src/main.ts
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import * as fs from 'fs'
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
const infoFn = jest.fn()
const summaryWriteFn = jest.fn(async () => {})
const summaryObj = {
  addHeading: jest.fn(),
  addRaw: jest.fn(),
  addTable: jest.fn(),
  addBreak: jest.fn(),
  addDetails: jest.fn(),
  write: summaryWriteFn
}
summaryObj.addHeading.mockReturnValue(summaryObj)
summaryObj.addRaw.mockReturnValue(summaryObj)
summaryObj.addTable.mockReturnValue(summaryObj)
summaryObj.addBreak.mockReturnValue(summaryObj)

jest.unstable_mockModule('@actions/core', () => ({
  debug: debugFn,
  error: errorFn,
  getInput: getInputFn,
  notice: noticeFn,
  startGroup: startGroupFn,
  endGroup: endGroupFn,
  setFailed: setFailedFn,
  setOutput: setOutputFn,
  info: infoFn,
  warning: jest.fn(),
  isDebug: jest.fn(() => false),
  summary: summaryObj
}))

const { run } = await import('../src/main.js')

// Resolve GITHUB_WORKSPACE: use env var or fall back to repo root
const GITHUB_WORKSPACE = process.env[constants.envvars.GITHUB_WORKSPACE]?.toString() || path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../..')

const originalEnv = { ...process.env }

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    summaryObj.addHeading.mockReturnValue(summaryObj)
    summaryObj.addRaw.mockReturnValue(summaryObj)
    summaryObj.addTable.mockReturnValue(summaryObj)
    summaryObj.addBreak.mockReturnValue(summaryObj)
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('should fail when GITHUB_WORKSPACE is missing', async () => {
    process.env[constants.envvars.GITHUB_WORKSPACE] = ''
    await run()
    expect(setFailedFn).toHaveBeenCalledWith(expect.stringContaining('Missing env'))
  })

  it('should fail when kustomize listing file does not exist', async () => {
    const tmpDir = fs.mkdtempSync(path.join(GITHUB_WORKSPACE, 'kustomize-mv-test-'))
    process.env = {
      ...originalEnv,
      GITHUB_WORKSPACE: tmpDir,
      GITHUB_STEP_SUMMARY: tmpDir,
      JEST_WORKER_ID: '1'
    }

    await run()

    expect(setFailedFn).toHaveBeenCalledWith(expect.stringContaining('Kustomize listing file not found'))

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('should process kustomize listing when listing file exists', async () => {
    const tmpDir = fs.mkdtempSync(path.join(GITHUB_WORKSPACE, 'kustomize-mv-test-'))
    process.env = {
      ...originalEnv,
      GITHUB_WORKSPACE: tmpDir,
      GITHUB_STEP_SUMMARY: tmpDir,
      JEST_WORKER_ID: '1'
    }

    // Create a mock kustomize listing file
    const mockListingContent = `test__test:
  dir: ${tmpDir}/test
  name: test
  folderName: test
  relativePath: test
  manifestPath: .
  kustomizationFile: kustomization.yaml
`
    fs.writeFileSync(path.join(tmpDir, constants.KustomizeFiles.listingFile), mockListingContent)

    // Create the test kustomize directory structure
    const testDir = path.join(tmpDir, 'test')
    fs.mkdirSync(testDir, { recursive: true })
    fs.writeFileSync(
      path.join(testDir, 'kustomization.yaml'),
      `apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources: []
`
    )

    await run()

    // Clean up
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})
