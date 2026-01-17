import * as core from '@actions/core'
import { utils, constants } from '../../../../typescript/packages/shared/'
import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'yaml'

async function runHelmTemplating(
  prefix: string,
  valueFiles: string[],
  GITHUB_WORKSPACE: string,
  listingYamlManifestPath: string,
  listingYamlRelativePath: string,
  listingYamlName: string,
  dir: path.ParsedPath,
  utilsHelmChart: utils.HelmChart,
  tableRows: any[],
  helmChartID: string
): Promise<void> {
  core.debug('runHelmTemplating called with prefix:' + prefix + ' and valueFiles:' + valueFiles)
  let manifestTargetFolder: path.FormatInputPathObject = path.parse(
    GITHUB_WORKSPACE + '/manifests/' + listingYamlManifestPath + '/' + prefix + listingYamlRelativePath.split('/').pop()
  )
  core.debug('Creating manifest target folder: ' + path.format(manifestTargetFolder))

  fs.mkdirSync(path.format(manifestTargetFolder), { recursive: true })
  core.debug('Created folder: ' + path.format(manifestTargetFolder))

  let helmOptions: string[] = []
  let options: yaml.Document = new yaml.Document('')

  if (utilsHelmChart.readPipelineFeatureOptions(dir, constants.Functionality.k8sManifestTemplating) !== false) {
    options = utilsHelmChart.readPipelineFeatureOptions(dir, constants.Functionality.k8sManifestTemplating)
  }

  if (utils.unrapYamlbyKey(options as any, '--skip-crds', false)) {
    helmOptions.push('--skip-crds')
  }

  helmOptions.push('--output-dir "' + path.format(manifestTargetFolder) + '"')

  // Parse ignoreWarnings - must be an array of regex patterns
  let ignoreWarnings: string[] | undefined
  const rawIgnoreWarnings = utils.unrapYamlbyKey(options as any, 'ignoreWarnings', undefined)
  const configFilePath = path.join(path.format(dir), constants.HelmChartFiles.ciConfigYaml)

  if (Array.isArray(rawIgnoreWarnings)) {
    ignoreWarnings = rawIgnoreWarnings
  } else if (typeof rawIgnoreWarnings === 'boolean') {
    throw new Error(
      `Invalid configuration in ${configFilePath}: ` +
        `'ignoreWarnings' must be an array of regex patterns, not a boolean. ` +
        `Example:\n  ignoreWarnings:\n    - "^walk\\.go:\\d+: found symbolic link in path: .*"`
    )
  } else {
    ignoreWarnings = undefined // Use defaults only
  }

  let valueArgs: string = ''
  valueFiles.forEach(valueFile => {
    valueArgs += ' -f ' + GITHUB_WORKSPACE + '/' + listingYamlRelativePath + '/' + valueFile
  })

  core.debug('Calling utilsHelmChart.template with args: ' + valueArgs + ' and helmOptions: ' + helmOptions)
  await utilsHelmChart.template(dir, valueArgs, helmOptions, ignoreWarnings)
  tableRows.push([listingYamlName, listingYamlRelativePath, helmChartID, '✅', 'manifests/' + listingYamlManifestPath + '/' + prefix + listingYamlRelativePath.split('/').pop()])
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    ///////////////////////////////////////////////////////////////////////////////////////////////////
    const GITHUB_WORKSPACE = String(process.env[constants.envvars.GITHUB_WORKSPACE])

    utils.assertNullOrEmpty(GITHUB_WORKSPACE, 'Missing env `' + constants.envvars.GITHUB_WORKSPACE + '`!')

    const pathGitRepository = path.parse(GITHUB_WORKSPACE)
    let utilsHelmChart = utils.HelmChart.getInstance()

    let helmChartListingFileContent: string = utilsHelmChart.getListingFileContent(pathGitRepository)
    let helmChartListingYamlDoc = new yaml.Document(yaml.parse(helmChartListingFileContent))
    ///////////////////////////////////////////////////////////////////////////////////////////////////
    const manifestPath: path.FormatInputPathObject = path.parse(GITHUB_WORKSPACE + '/manifests/')
    if (fs.existsSync(path.format(manifestPath))) {
      fs.rmSync(path.format(manifestPath), { recursive: true })
    } else {
      fs.mkdirSync(path.format(manifestPath), { recursive: true })
    }
    core.startGroup('K8s Manifest Templating')

    let tableRows = []
    let tableHeader = [
      { data: 'Project Name', header: true },
      { data: 'Project Folder', header: true },
      { data: 'UID', header: true },
      { data: 'Result', header: true },
      { data: 'Manifest Folder', header: true }
    ]
    let summaryRawContent: string = '<details><summary>Found following Projects...</summary>\n\n```yaml\n' + yaml.stringify(helmChartListingYamlDoc) + '\n```\n\n</details>'

    /* ==================== MANIFEST GENERATION ==================== */
    core.summary.addHeading('K8s Manifest Templating Results (Helm Charts + Kustomize Projects)').addRaw(summaryRawContent)

    for (const item of Object.keys(helmChartListingYamlDoc.toJSON())) {
      core.info('Processing Helm Chart UID:' + item)
      let yamlitem = utils.unrapYamlbyKey(helmChartListingYamlDoc as any, item)
      let listingYamlDir = utils.unrapYamlbyKey(yamlitem, constants.ListingYamlKeys.dir)
      core.debug('Listing YAML Directory:' + listingYamlDir)
      let listingYamlName = utils.unrapYamlbyKey(yamlitem, constants.ListingYamlKeys.name)
      core.debug('Listing YAML Name:' + listingYamlName)
      let listingYamlManifestPath = utils.unrapYamlbyKey(yamlitem, constants.ListingYamlKeys.manifestPath)
      core.debug('Listing YAML Manifest Path:' + listingYamlManifestPath)
      let listingYamlRelativePath = utils.unrapYamlbyKey(yamlitem, constants.ListingYamlKeys.relativePath)
      core.debug('Listing YAML Relative Path:' + listingYamlRelativePath)
      let dir: path.ParsedPath = path.parse(listingYamlDir)

      if (utils.isFunctionEnabled(dir, constants.Functionality.k8sManifestTemplating, true)) {
        core.info('K8s Manifest Templating enabled for Helm Chart UID: ' + item)
        const helmTemplatingOptions = utilsHelmChart.readPipelineFeature(dir, constants.Functionality.k8sManifestTemplating, 'helm-charts')
        core.debug('helmTemplatingOptions: ' + JSON.stringify(helmTemplatingOptions))

        // Only call .toJSON() if helmTemplatingOptions is not false and has .toJSON
        let helmTemplatingOptionsObj: any = helmTemplatingOptions
        if (helmTemplatingOptions && typeof helmTemplatingOptions !== 'boolean' && typeof helmTemplatingOptions.toJSON === 'function') {
          helmTemplatingOptionsObj = helmTemplatingOptions.toJSON()
        }

        if (helmTemplatingOptionsObj && typeof helmTemplatingOptionsObj === 'object' && helmTemplatingOptionsObj['default-manifest-templating'] === false) {
          core.info('Default manifest templating disabled')
        } else {
          core.info('Default manifest templating enabled')
          await runHelmTemplating(
            '',
            [constants.HelmChartFiles.valuesYaml],
            GITHUB_WORKSPACE,
            listingYamlManifestPath,
            listingYamlRelativePath,
            listingYamlName,
            dir,
            utilsHelmChart,
            tableRows,
            item
          )
        }

        // Check for additional-manifest-templating
        if (helmTemplatingOptionsObj && typeof helmTemplatingOptionsObj === 'object' && Array.isArray(helmTemplatingOptionsObj['additional-manifest-templating'])) {
          core.info(`Additional manifest templating detected: ${JSON.stringify(helmTemplatingOptionsObj['additional-manifest-templating'])}`)
          for (const additional of helmTemplatingOptionsObj['additional-manifest-templating']) {
            let prefix = additional['prefix-manifest-folder-name']
            if (!prefix || prefix === '') {
              core.error("Missing 'prefix-manifest-folder-name' in additional manifest templating options")
              continue
            }
            const valueFiles = additional['value-files']
            core.info(`Prefix: ${prefix}, Value files: ${JSON.stringify(valueFiles)}`)
            await runHelmTemplating(
              prefix + '.',
              valueFiles,
              GITHUB_WORKSPACE,
              listingYamlManifestPath,
              listingYamlRelativePath,
              listingYamlName,
              dir,
              utilsHelmChart,
              tableRows,
              item
            )
          }
        } else {
          core.info('Additional manifest templating disabled')
        }
      } else {
        core.info('K8s Manifest Templating disabled for Helm Chart UID: ' + item)
        tableRows.push([listingYamlName, listingYamlRelativePath, item, ':heavy_exclamation_mark: Disabled', '-'])
      }
    }

    /* ==================== KUSTOMIZE MANIFEST GENERATION ==================== */
    // Check if kustomize listing file exists and process Kustomize projects
    const kustomizeListingPath = path.join(GITHUB_WORKSPACE, constants.KustomizeFiles.listingFile)
    if (fs.existsSync(kustomizeListingPath)) {
      core.info('Found Kustomize listing file, processing Kustomize projects...')
      const kustomizeListingFileContent = fs.readFileSync(kustomizeListingPath, 'utf8')
      const kustomizeListingYamlDoc = new yaml.Document(yaml.parse(kustomizeListingFileContent))

      for (const item of Object.keys(kustomizeListingYamlDoc.toJSON())) {
        core.info('Processing Kustomize Project UID:' + item)
        let yamlitem = utils.unrapYamlbyKey(kustomizeListingYamlDoc as any, item)
        let listingYamlDir = utils.unrapYamlbyKey(yamlitem, constants.ListingYamlKeys.dir)
        core.debug('Listing YAML Directory:' + listingYamlDir)
        let listingYamlName = utils.unrapYamlbyKey(yamlitem, constants.ListingYamlKeys.name)
        core.debug('Listing YAML Name:' + listingYamlName)
        let listingYamlManifestPath = utils.unrapYamlbyKey(yamlitem, constants.ListingYamlKeys.manifestPath)
        core.debug('Listing YAML Manifest Path:' + listingYamlManifestPath)
        let listingYamlRelativePath = utils.unrapYamlbyKey(yamlitem, constants.ListingYamlKeys.relativePath)
        core.debug('Listing YAML Relative Path:' + listingYamlRelativePath)
        let dir: path.ParsedPath = path.parse(listingYamlDir)

        if (utils.isFunctionEnabled(dir, constants.Functionality.k8sManifestTemplating, true)) {
          core.info('K8s Manifest Templating enabled for Kustomize Project UID: ' + item)

          // For Kustomize, we use the same configuration approach as Helm but look for kustomize-specific options
          const kustomizeTemplatingOptions = utilsHelmChart.readPipelineFeature(dir, constants.Functionality.k8sManifestTemplating, 'kustomize-projects')
          core.debug('kustomizeTemplatingOptions: ' + JSON.stringify(kustomizeTemplatingOptions))

          // Only call .toJSON() if kustomizeTemplatingOptions is not false and has .toJSON
          let kustomizeTemplatingOptionsObj: any = kustomizeTemplatingOptions
          if (kustomizeTemplatingOptions && typeof kustomizeTemplatingOptions !== 'boolean' && typeof kustomizeTemplatingOptions.toJSON === 'function') {
            kustomizeTemplatingOptionsObj = kustomizeTemplatingOptions.toJSON()
          }

          if (kustomizeTemplatingOptionsObj && typeof kustomizeTemplatingOptionsObj === 'object' && kustomizeTemplatingOptionsObj['default-manifest-templating'] === false) {
            core.info('Default manifest templating disabled for Kustomize')
          } else {
            core.info('Default manifest templating enabled for Kustomize')
            await runKustomizeTemplating('', GITHUB_WORKSPACE, listingYamlManifestPath, listingYamlRelativePath, listingYamlName, dir, tableRows, item)
          }

          // Check for additional-manifest-templating (overlays)
          if (
            kustomizeTemplatingOptionsObj &&
            typeof kustomizeTemplatingOptionsObj === 'object' &&
            Array.isArray(kustomizeTemplatingOptionsObj['additional-manifest-templating'])
          ) {
            core.info(`Additional manifest templating (overlays) detected: ${JSON.stringify(kustomizeTemplatingOptionsObj['additional-manifest-templating'])}`)
            for (const additional of kustomizeTemplatingOptionsObj['additional-manifest-templating']) {
              let prefix = additional['prefix-manifest-folder-name']
              if (!prefix || prefix === '') {
                core.error("Missing 'prefix-manifest-folder-name' in additional manifest templating options")
                continue
              }
              const overlayPath = additional['overlay-path']
              core.info(`Prefix: ${prefix}, Overlay path: ${overlayPath}`)
              await runKustomizeTemplating(prefix + '.', GITHUB_WORKSPACE, listingYamlManifestPath, listingYamlRelativePath, listingYamlName, dir, tableRows, item, overlayPath)
            }
          } else {
            core.info('Additional manifest templating (overlays) disabled for Kustomize')
          }
        } else {
          core.info('K8s Manifest Templating disabled for Kustomize Project UID: ' + item)
          tableRows.push([listingYamlName, listingYamlRelativePath, item, ':heavy_exclamation_mark: Disabled', '-'])
        }
      }
    } else {
      core.info('No Kustomize listing file found, skipping Kustomize projects.')
    }

    await core.summary
      .addTable([tableHeader, ...tableRows])
      .addBreak()
      .addDetails(
        'Legend',
        '✅ = K8s Manifest Templated and moved to ./manifest/* folder \n ⚠️ = Empty Output \n ❌ = Build Failed \n :heavy_exclamation_mark: = K8s Manifest Templating disabled by ' +
          constants.HelmChartFiles.ciConfigYaml +
          ' or ' +
          constants.KustomizeFiles.ciConfigYaml
      )
      .write()

    let result = await utils.Git.getInstance().status(GITHUB_WORKSPACE)
    let modifiedFolders: string[] = result.stdout.split('\n')

    if (modifiedFolders.some(str => str.includes('manifests/'))) {
      await utils.Git.getInstance().add(manifestPath, GITHUB_WORKSPACE)
      await utils.Git.getInstance().commit('chore(ci): k8s manifest templated for Helm Charts and Kustomize Projects', GITHUB_WORKSPACE)
      await utils.Git.getInstance().push(GITHUB_WORKSPACE)

      core.info('Modifications committed and changes pushed to remote.')
    } else {
      core.notice('No modifications to commit or push.')
    }

    core.endGroup()

    ///////////////////////////////////////////////////////////////////////////////////////////////////
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}

async function runKustomizeTemplating(
  prefix: string,
  GITHUB_WORKSPACE: string,
  listingYamlManifestPath: string,
  listingYamlRelativePath: string,
  listingYamlName: string,
  dir: path.ParsedPath,
  tableRows: any[],
  kustomizeProjectID: string,
  overlayPath?: string
): Promise<void> {
  core.debug('runKustomizeTemplating called with prefix:' + prefix + ' overlayPath:' + (overlayPath || 'base'))

  let manifestTargetFolder: path.FormatInputPathObject = path.parse(
    GITHUB_WORKSPACE + '/manifests/' + listingYamlManifestPath + '/' + prefix + listingYamlRelativePath.split('/').pop()
  )
  core.debug('Creating manifest target folder: ' + path.format(manifestTargetFolder))

  fs.mkdirSync(path.format(manifestTargetFolder), { recursive: true })
  core.debug('Created folder: ' + path.format(manifestTargetFolder))

  try {
    const { execSync } = require('child_process')
    // Determine the source path for kustomize build
    // We need to combine the base directory with the relative path to get the actual project directory
    const projectPath = path.join(GITHUB_WORKSPACE, listingYamlRelativePath)
    const sourcePath = overlayPath ? path.join(projectPath, overlayPath) : projectPath

    // Run kustomize build and save to target folder
    const manifestFileName = `${prefix}${listingYamlRelativePath.split('/').pop()}.yaml`
    const manifestFilePath = path.join(path.format(manifestTargetFolder), manifestFileName)

    core.info(`Running kustomize build on ${sourcePath}`)
    const result = execSync(`kubectl kustomize ${sourcePath}`, {
      encoding: 'utf8',
      stdio: 'pipe'
    })

    if (result && result.length > 0) {
      fs.writeFileSync(manifestFilePath, result)
      core.info(`✅ Kustomize manifest generated: ${manifestFilePath}`)
      tableRows.push([
        listingYamlName,
        listingYamlRelativePath,
        kustomizeProjectID,
        '✅',
        'manifests/' + listingYamlManifestPath + '/' + prefix + listingYamlRelativePath.split('/').pop()
      ])
    } else {
      core.warning(`⚠️ Kustomize build produced empty output for ${listingYamlRelativePath}`)
      tableRows.push([listingYamlName, listingYamlRelativePath, kustomizeProjectID, '⚠️', '-'])
    }
  } catch (error) {
    core.error(`❌ Kustomize build failed for ${listingYamlRelativePath}: ${error}`)
    tableRows.push([listingYamlName, listingYamlRelativePath, kustomizeProjectID, '❌', '-'])
  }
}
