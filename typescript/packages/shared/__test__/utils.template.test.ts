/**
 * Unit tests for HelmChart.template ignoreWarnings functionality
 */

import * as path from 'path'
import { HelmChart } from '../src/utils'

describe('HelmChart.template ignoreWarnings parameter', () => {
  let helmChart: HelmChart
  let execMock: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    helmChart = HelmChart.getInstance()

    // Mock the exec method
    execMock = jest.spyOn(helmChart, 'exec')
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('default behavior (ignoreWarnings undefined)', () => {
    it('should throw error when stderr contains warnings other than deprecated chart warning', async () => {
      const dir = path.parse('/test/helm-chart')
      const valueFiles = '-f /test/helm-chart/values.yaml'

      execMock.mockResolvedValue({
        exitCode: 0,
        stdout: 'some valid manifest content here with sufficient length to pass validation checks',
        stderr: 'WARNING: Some other warning message'
      })

      await expect(helmChart.template(dir, valueFiles, [])).rejects.toThrow(
        'Helm Chart /test/helm-chart templating produced unexpected stderr: WARNING: Some other warning message'
      )
    })

    it('should throw error when stderr contains multiple warnings', async () => {
      const dir = path.parse('/test/helm-chart')
      const valueFiles = '-f /test/helm-chart/values.yaml'

      execMock.mockResolvedValue({
        exitCode: 0,
        stdout: 'some valid manifest content here with sufficient length to pass validation checks',
        stderr: 'WARNING: Multiple warnings\nWARNING: Another warning'
      })

      await expect(helmChart.template(dir, valueFiles, [])).rejects.toThrow(
        'Helm Chart /test/helm-chart templating produced unexpected stderr'
      )
    })

    it('should NOT throw error for deprecated chart warning (default pattern)', async () => {
      const dir = path.parse('/test/helm-chart')
      const valueFiles = '-f /test/helm-chart/values.yaml'

      execMock.mockResolvedValue({
        exitCode: 0,
        stdout: 'some valid manifest content here with sufficient length to pass validation checks',
        stderr: 'WARNING: This chart is deprecated'
      })

      const result = await helmChart.template(dir, valueFiles, [])

      expect(result).toBe('some valid manifest content here with sufficient length to pass validation checks')
    })

    it('should NOT throw error when stderr is empty', async () => {
      const dir = path.parse('/test/helm-chart')
      const valueFiles = '-f /test/helm-chart/values.yaml'

      execMock.mockResolvedValue({
        exitCode: 0,
        stdout: 'some valid manifest content here with sufficient length to pass validation checks',
        stderr: ''
      })

      const result = await helmChart.template(dir, valueFiles, [])

      expect(result).toBe('some valid manifest content here with sufficient length to pass validation checks')
    })
  })

  describe('with custom ignoreWarnings patterns', () => {
    it('should ignore warnings matching custom regex patterns', async () => {
      const dir = path.parse('/test/helm-chart')
      const valueFiles = '-f /test/helm-chart/values.yaml'
      const ignoreWarnings = ['^walk\\.go:\\d+: found symbolic link in path: .*']

      execMock.mockResolvedValue({
        exitCode: 0,
        stdout: 'some valid manifest content here with sufficient length to pass validation checks',
        stderr: 'walk.go:74: found symbolic link in path: /some/path'
      })

      const result = await helmChart.template(dir, valueFiles, [], ignoreWarnings)

      expect(result).toBe('some valid manifest content here with sufficient length to pass validation checks')
    })

    it('should merge custom patterns with default deprecated chart pattern', async () => {
      const dir = path.parse('/test/helm-chart')
      const valueFiles = '-f /test/helm-chart/values.yaml'
      const ignoreWarnings = ['^Custom warning.*']

      execMock.mockResolvedValue({
        exitCode: 0,
        stdout: 'some valid manifest content here with sufficient length to pass validation checks',
        stderr: 'WARNING: This chart is deprecated'
      })

      // Default pattern should still work even with custom patterns
      const result = await helmChart.template(dir, valueFiles, [], ignoreWarnings)

      expect(result).toBe('some valid manifest content here with sufficient length to pass validation checks')
    })

    it('should allow multiple stderr lines when all match patterns', async () => {
      const dir = path.parse('/test/helm-chart')
      const valueFiles = '-f /test/helm-chart/values.yaml'
      const ignoreWarnings = ['^walk\\.go:\\d+: found symbolic link in path: .*']

      execMock.mockResolvedValue({
        exitCode: 0,
        stdout: 'some valid manifest content here with sufficient length to pass validation checks',
        stderr: 'WARNING: This chart is deprecated\nwalk.go:74: found symbolic link in path: /some/path'
      })

      const result = await helmChart.template(dir, valueFiles, [], ignoreWarnings)

      expect(result).toBe('some valid manifest content here with sufficient length to pass validation checks')
    })

    it('should throw error when any stderr line does not match patterns', async () => {
      const dir = path.parse('/test/helm-chart')
      const valueFiles = '-f /test/helm-chart/values.yaml'
      const ignoreWarnings = ['^walk\\.go:\\d+: found symbolic link in path: .*']

      execMock.mockResolvedValue({
        exitCode: 0,
        stdout: 'some valid manifest content here with sufficient length to pass validation checks',
        stderr: 'walk.go:74: found symbolic link in path: /some/path\nUNEXPECTED ERROR: something bad happened'
      })

      await expect(helmChart.template(dir, valueFiles, [], ignoreWarnings)).rejects.toThrow(
        'Helm Chart /test/helm-chart templating produced unexpected stderr'
      )
    })

    it('should handle empty ignoreWarnings array (only defaults)', async () => {
      const dir = path.parse('/test/helm-chart')
      const valueFiles = '-f /test/helm-chart/values.yaml'
      const ignoreWarnings: string[] = []

      execMock.mockResolvedValue({
        exitCode: 0,
        stdout: 'some valid manifest content here with sufficient length to pass validation checks',
        stderr: 'WARNING: This chart is deprecated'
      })

      const result = await helmChart.template(dir, valueFiles, [], ignoreWarnings)

      expect(result).toBe('some valid manifest content here with sufficient length to pass validation checks')
    })

    it('should handle wildcard pattern to ignore all warnings', async () => {
      const dir = path.parse('/test/helm-chart')
      const valueFiles = '-f /test/helm-chart/values.yaml'
      const ignoreWarnings = ['.*'] // match everything

      execMock.mockResolvedValue({
        exitCode: 0,
        stdout: 'some valid manifest content here with sufficient length to pass validation checks',
        stderr: 'WARNING: Any random warning\nERROR: Some error output\nAnything else'
      })

      const result = await helmChart.template(dir, valueFiles, [], ignoreWarnings)

      expect(result).toBe('some valid manifest content here with sufficient length to pass validation checks')
    })
  })

  describe('validation checks still apply regardless of ignoreWarnings', () => {
    it('should still throw error for empty stdout (invalid manifest)', async () => {
      const dir = path.parse('/test/helm-chart')
      const valueFiles = '-f /test/helm-chart/values.yaml'
      const ignoreWarnings = ['.*']

      execMock.mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: 'WARNING: Some warning'
      })

      await expect(helmChart.template(dir, valueFiles, [], ignoreWarnings)).rejects.toThrow(
        'Helm Chart /test/helm-chart Templating failed with empty manifest!'
      )
    })

    it('should still throw error for non-zero exit code with stderr', async () => {
      const dir = path.parse('/test/helm-chart')
      const valueFiles = '-f /test/helm-chart/values.yaml'
      const ignoreWarnings = ['.*']

      execMock.mockResolvedValue({
        exitCode: 1,
        stdout: 'some valid manifest content here with sufficient length to pass validation checks',
        stderr: 'ERROR: Fatal error occurred'
      })

      await expect(helmChart.template(dir, valueFiles, [], ignoreWarnings)).rejects.toThrow(
        'Helm Chart /test/helm-chart exitCode: 1 stdErr: ERROR: Fatal error occurred'
      )
    })
  })

  describe('with options parameter', () => {
    it('should pass options correctly when ignoreWarnings is undefined', async () => {
      const dir = path.parse('/test/helm-chart')
      const valueFiles = '-f /test/helm-chart/values.yaml'
      const options = ['--skip-crds', '--dependency-update']

      execMock.mockResolvedValue({
        exitCode: 0,
        stdout: 'some valid manifest content here with sufficient length to pass validation checks',
        stderr: ''
      })

      await helmChart.template(dir, valueFiles, options)

      expect(execMock).toHaveBeenCalledWith(
        expect.stringContaining('--skip-crds --dependency-update')
      )
    })

    it('should pass options correctly when ignoreWarnings is provided', async () => {
      const dir = path.parse('/test/helm-chart')
      const valueFiles = '-f /test/helm-chart/values.yaml'
      const options = ['--skip-tests', '--include-crds']
      const ignoreWarnings = ['.*']

      execMock.mockResolvedValue({
        exitCode: 0,
        stdout: 'some valid manifest content here with sufficient length to pass validation checks',
        stderr: 'WARNING: Some warning'
      })

      await helmChart.template(dir, valueFiles, options, ignoreWarnings)

      expect(execMock).toHaveBeenCalledWith(
        expect.stringContaining('--skip-tests --include-crds')
      )
    })
  })
})
