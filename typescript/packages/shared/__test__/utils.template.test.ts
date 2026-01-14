/**
 * Unit tests for HelmChart.template ignoreWarnings functionality
 */

import * as path from 'path'
import * as exec2 from '@actions/exec'
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

  describe('when ignoreWarnings is false (default behavior)', () => {
    it('should throw error when stderr contains warnings other than deprecated chart warning', async () => {
      const dir = path.parse('/test/helm-chart')
      const valueFiles = '-f /test/helm-chart/values.yaml'

      execMock.mockResolvedValue({
        exitCode: 0,
        stdout: 'some valid manifest content here with sufficient length to pass validation checks',
        stderr: 'WARNING: Some other warning message'
      })

      await expect(
        helmChart.template(dir, valueFiles, [], false)
      ).rejects.toThrow('Helm Chart /test/helm-chart is deprecated! stderr: WARNING: Some other warning message')
    })

    it('should throw error when stderr contains multiple warnings', async () => {
      const dir = path.parse('/test/helm-chart')
      const valueFiles = '-f /test/helm-chart/values.yaml'

      execMock.mockResolvedValue({
        exitCode: 0,
        stdout: 'some valid manifest content here with sufficient length to pass validation checks',
        stderr: 'WARNING: Multiple warnings\nWARNING: Another warning'
      })

      await expect(
        helmChart.template(dir, valueFiles, [], false)
      ).rejects.toThrow('Helm Chart /test/helm-chart is deprecated!')
    })

    it('should NOT throw error for deprecated chart warning (allowed warning)', async () => {
      const dir = path.parse('/test/helm-chart')
      const valueFiles = '-f /test/helm-chart/values.yaml'

      execMock.mockResolvedValue({
        exitCode: 0,
        stdout: 'some valid manifest content here with sufficient length to pass validation checks',
        stderr: 'WARNING: This chart is deprecated'
      })

      const result = await helmChart.template(dir, valueFiles, [], false)

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

      const result = await helmChart.template(dir, valueFiles, [], false)

      expect(result).toBe('some valid manifest content here with sufficient length to pass validation checks')
    })
  })

  describe('when ignoreWarnings is true', () => {
    it('should NOT throw error for any warnings in stderr', async () => {
      const dir = path.parse('/test/helm-chart')
      const valueFiles = '-f /test/helm-chart/values.yaml'

      execMock.mockResolvedValue({
        exitCode: 0,
        stdout: 'some valid manifest content here with sufficient length to pass validation checks',
        stderr: 'WARNING: Some warning message that would normally fail'
      })

      const result = await helmChart.template(dir, valueFiles, [], true)

      expect(result).toBe('some valid manifest content here with sufficient length to pass validation checks')
    })

    it('should NOT throw error for deprecated chart warning', async () => {
      const dir = path.parse('/test/helm-chart')
      const valueFiles = '-f /test/helm-chart/values.yaml'

      execMock.mockResolvedValue({
        exitCode: 0,
        stdout: 'some valid manifest content here with sufficient length to pass validation checks',
        stderr: 'WARNING: This chart is deprecated'
      })

      const result = await helmChart.template(dir, valueFiles, [], true)

      expect(result).toBe('some valid manifest content here with sufficient length to pass validation checks')
    })

    it('should NOT throw error for multiple warnings', async () => {
      const dir = path.parse('/test/helm-chart')
      const valueFiles = '-f /test/helm-chart/values.yaml'

      execMock.mockResolvedValue({
        exitCode: 0,
        stdout: 'some valid manifest content here with sufficient length to pass validation checks',
        stderr: 'WARNING: Multiple warnings\nWARNING: Another warning\nWARNING: Yet another warning'
      })

      const result = await helmChart.template(dir, valueFiles, [], true)

      expect(result).toBe('some valid manifest content here with sufficient length to pass validation checks')
    })

    it('should still throw error for empty stdout (invalid manifest)', async () => {
      const dir = path.parse('/test/helm-chart')
      const valueFiles = '-f /test/helm-chart/values.yaml'

      execMock.mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: 'WARNING: Some warning'
      })

      await expect(
        helmChart.template(dir, valueFiles, [], true)
      ).rejects.toThrow('Helm Chart /test/helm-chart Templating failed with empty manifest!')
    })

    it('should still throw error for non-zero exit code with stderr', async () => {
      const dir = path.parse('/test/helm-chart')
      const valueFiles = '-f /test/helm-chart/values.yaml'

      execMock.mockResolvedValue({
        exitCode: 1,
        stdout: 'some valid manifest content here with sufficient length to pass validation checks',
        stderr: 'ERROR: Fatal error occurred'
      })

      await expect(
        helmChart.template(dir, valueFiles, [], true)
      ).rejects.toThrow('Helm Chart /test/helm-chart exitCode: 1 stdErr: ERROR: Fatal error occurred')
    })
  })

  describe('when ignoreWarnings is undefined (defaults to false)', () => {
    it('should behave the same as ignoreWarnings=false', async () => {
      const dir = path.parse('/test/helm-chart')
      const valueFiles = '-f /test/helm-chart/values.yaml'

      execMock.mockResolvedValue({
        exitCode: 0,
        stdout: 'some valid manifest content here with sufficient length to pass validation checks',
        stderr: 'WARNING: Some warning'
      })

      await expect(
        helmChart.template(dir, valueFiles, [])
      ).rejects.toThrow('Helm Chart /test/helm-chart is deprecated!')
    })
  })

  describe('with options parameter', () => {
    it('should pass options correctly when ignoreWarnings is false', async () => {
      const dir = path.parse('/test/helm-chart')
      const valueFiles = '-f /test/helm-chart/values.yaml'
      const options = ['--skip-crds', '--dependency-update']

      execMock.mockResolvedValue({
        exitCode: 0,
        stdout: 'some valid manifest content here with sufficient length to pass validation checks',
        stderr: ''
      })

      await helmChart.template(dir, valueFiles, options, false)

      expect(execMock).toHaveBeenCalledWith(
        expect.stringContaining('--skip-crds --dependency-update')
      )
    })

    it('should pass options correctly when ignoreWarnings is true', async () => {
      const dir = path.parse('/test/helm-chart')
      const valueFiles = '-f /test/helm-chart/values.yaml'
      const options = ['--skip-tests', '--include-crds']

      execMock.mockResolvedValue({
        exitCode: 0,
        stdout: 'some valid manifest content here with sufficient length to pass validation checks',
        stderr: 'WARNING: Some warning'
      })

      await helmChart.template(dir, valueFiles, options, true)

      expect(execMock).toHaveBeenCalledWith(
        expect.stringContaining('--skip-tests --include-crds')
      )
    })
  })
})
