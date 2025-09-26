import * as core from '@actions/core'
import { utils, constants } from '../../../shared/dist'
import * as path from 'path'
import * as yaml from 'yaml'
import * as semver from 'semver'
import * as fs from 'fs'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // Specify the directory to start searching from
    const BRANCH_NAME: string = utils.checkRequiredInput(constants.envvars.BRANCH_NAME)
    const BASE_BRANCH_NAME: string = utils.checkRequiredInput(constants.envvars.BASE_BRANCH_NAME)
    const SOURCE_GIT_REPO_URL: string = utils.checkRequiredInput(constants.envvars.SOURCE_GIT_REPO_URL)
    const TARGET_GIT_REPO_URL: string = utils.checkRequiredInput(constants.envvars.TARGET_GIT_REPO_URL)
    const GITHUB_WORKSPACE = String(process.env[constants.envvars.GITHUB_WORKSPACE])

    utils.assertNullOrEmpty(GITHUB_WORKSPACE, 'Missing env `' + constants.envvars.GITHUB_WORKSPACE + '`!')

    const pathGitRepository = path.parse(GITHUB_WORKSPACE)
    let utilsKustomize = utils.Kustomize.getInstance()

    let kustomizeListingFileContent: string = utilsKustomize.getListingFileContent(pathGitRepository)
    let kustomizeListingYamlDoc = new yaml.Document(yaml.parse(kustomizeListingFileContent))

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    core.startGroup('Kustomize Version Bump - modified files compared to ' + BASE_BRANCH_NAME)

    let summaryRawContent: string =
      '<details><summary>Found following Kustomize projects...</summary>\n\n```yaml\n' + yaml.stringify(kustomizeListingYamlDoc) + '\n```\n\n</details>'

    let tableRows = []
    let tableHeader = [
      { data: 'Kustomize Project', header: true },
      { data: 'Local Branch Version', header: true },
      { data: 'Base Branch Version', header: true },
      { data: 'New Version', header: true },
      { data: 'Status', header: true },
      { data: 'Folder', header: true }
    ]

    // Setup git remotes if needed
    if (TARGET_GIT_REPO_URL !== SOURCE_GIT_REPO_URL) {
      const TOKEN: string = core.getInput(constants.envvars.TOKEN) // Allow TOKEN to be optional
      let authenticatedRepoUrl = TARGET_GIT_REPO_URL

      if (TOKEN) {
        authenticatedRepoUrl = TARGET_GIT_REPO_URL.replace('https://', `https://${TOKEN}@`)
        console.log('Token found, using authenticated repo URL: ' + authenticatedRepoUrl)
      } else {
        console.log('Token not found, using unauthenticated repo URL: ' + authenticatedRepoUrl)
      }

      await utilsKustomize.exec('git remote add upstream ' + authenticatedRepoUrl, [], { cwd: GITHUB_WORKSPACE })
      await utilsKustomize.exec('git remote -v', [], { cwd: GITHUB_WORKSPACE })
      await utilsKustomize.exec('git fetch --all', [], { cwd: GITHUB_WORKSPACE })
    }

    // Get modified files
    let result
    if (TARGET_GIT_REPO_URL !== SOURCE_GIT_REPO_URL) {
      result = await utilsKustomize.exec('git diff --name-only "upstream/' + BASE_BRANCH_NAME + '..origin/' + BRANCH_NAME + '"', [], { cwd: GITHUB_WORKSPACE })
    } else {
      result = await utilsKustomize.exec('git diff --name-only "origin/' + BASE_BRANCH_NAME + '..origin/' + BRANCH_NAME + '"', [], { cwd: GITHUB_WORKSPACE })
    }

    const folders: string[] = result.stdout.split('\n')

    console.log('Looking for dirs with modified files')
    let foundKustomizeFolderModified: Record<string, string> = {}

    folders
      .filter(filePath => {
        const fileName = path.basename(filePath)
        return !constants.versionBumpIgnoredFiles.includes(fileName)
      })
      .forEach(function (value: string) {
        // Check if this file path contains a kustomization.yaml or kustomization.yml file
        const kustomizationYamlPath = utils.isFileFoundInPath(constants.KustomizeFiles.KustomizationYaml, path.parse(value), path.parse(GITHUB_WORKSPACE))
        const kustomizationYmlPath = utils.isFileFoundInPath(constants.KustomizeFiles.KustomizationYml, path.parse(value), path.parse(GITHUB_WORKSPACE))

        if (kustomizationYamlPath !== false || kustomizationYmlPath !== false) {
          let dirName: string = String(kustomizationYamlPath !== false ? kustomizationYamlPath : kustomizationYmlPath)
          let yamlKey = utils.findYamlKeyByDir(kustomizeListingFileContent, dirName)
          if (yamlKey === null) {
            throw new Error('Unable to find key in ' + constants.KustomizeFiles.listingFile + ' for dir ' + dirName)
          }
          foundKustomizeFolderModified[yamlKey] = dirName
          core.debug('foundKustomizeFolderModified[' + yamlKey + '] = ' + dirName)
        }
      })

    let summaryRawContentModifiedFiles: string = '<details><summary>Modified Files</summary>\n\n```yaml\n' + yaml.stringify(folders) + '\n```\n\n</details>'
    core.summary.addHeading('Kustomize Version Bump Results').addRaw(summaryRawContentModifiedFiles).addRaw(summaryRawContent)

    console.log('Looking for kustomization files')
    let cmdKustomizeSearch: string =
      '/bin/bash -c "git ls-tree -r \\"origin/' +
      BASE_BRANCH_NAME +
      '\\" --name-only | grep -E \'(' +
      constants.KustomizeFiles.KustomizationYaml +
      '|' +
      constants.KustomizeFiles.KustomizationYml +
      ')\'"'
    let resultFiles = await utilsKustomize.exec(cmdKustomizeSearch, [], { cwd: GITHUB_WORKSPACE })
    const filesOnBaseBranch: string[] = resultFiles.stdout.split(/\r?\n/)

    // Process each modified kustomize project
    for (const key of Object.keys(foundKustomizeFolderModified)) {
      console.log('Processing ' + key)
      let listingItem = utils.unrapYamlbyKey(kustomizeListingYamlDoc, key)
      let dir = utils.unrapYamlbyKey(listingItem, 'dir')
      let relativePath = utils.unrapYamlbyKey(listingItem, 'relativePath')
      let projectName = utils.unrapYamlbyKey(listingItem, 'name', path.basename(relativePath))

      core.debug('dir: ' + key + ' relativePath: ' + relativePath + ' projectName: ' + projectName)

      // Check if version bump is enabled for this kustomize project
      if (utils.isFunctionEnabled(path.parse(dir), constants.Functionality.kustomizeVersionBump, true)) {
        // Read or create .version file for current version
        let currentVersion = utilsKustomize.readOrCreateVersionFile(dir)

        // Check if the kustomization file exists on base branch to determine if this is a new project
        let kustomizationFile = utils.unrapYamlbyKey(listingItem, 'kustomizationFile', constants.KustomizeFiles.KustomizationYaml)
        const kustomizationRelativePath = path.join(relativePath, kustomizationFile)

        if (filesOnBaseBranch.includes(kustomizationRelativePath)) {
          console.log('Found ' + kustomizationFile + ' in ' + kustomizationRelativePath + '. Checking version...')

          // Try to get .version file from base branch
          let cmdShowVersion: string = ''
          if (TARGET_GIT_REPO_URL !== SOURCE_GIT_REPO_URL) {
            cmdShowVersion = '/bin/bash -c "git show \\"upstream/' + BASE_BRANCH_NAME + ':' + relativePath + '/.version\\" 2>/dev/null || echo \\"0.0.1\\""'
          } else {
            cmdShowVersion = '/bin/bash -c "git show \\"origin/' + BASE_BRANCH_NAME + ':' + relativePath + '/.version\\" 2>/dev/null || echo \\"0.0.1\\""'
          }

          core.debug(cmdShowVersion)
          let versionResult = await utilsKustomize.exec(cmdShowVersion, [], { cwd: GITHUB_WORKSPACE })

          let baseBranchVersion = versionResult.stdout.trim() || '0.0.1' // Version in base branch
          let baseBranchBumpedVersion = String(semver.inc(baseBranchVersion, 'patch')) // Bumped version in base branch
          let semVerAction: string = '-'

          switch (semver.compare(currentVersion, baseBranchVersion)) {
            case 1: // currentVersion > baseBranchVersion
              console.log('Current version is greater than base branch version')
              if (semver.major(currentVersion) > semver.major(baseBranchBumpedVersion)) {
                semVerAction = '✅❗ Okay. Major Version increase!'
              } else if (semver.minor(currentVersion) > semver.minor(baseBranchBumpedVersion)) {
                semVerAction = '✅❗ Okay. Minor Version increase!'
              } else {
                semVerAction = '✅ Okay. Patch Version increase!'
              }
              baseBranchBumpedVersion = currentVersion
              break
            case -1: // currentVersion < baseBranchVersion
            case 0: // currentVersion == baseBranchVersion
              console.log('Current version is lesser or equal to base branch version')
              semVerAction = '✳️ Bumped'

              // Write the bumped version to .version file
              utilsKustomize.writeVersionFile(dir, baseBranchBumpedVersion)

              await utils.Git.getInstance().add(path.parse(path.join(dir, '.version')), GITHUB_WORKSPACE)
              await utils.Git.getInstance().commit('chore(ci): update ' + relativePath + '/.version ' + currentVersion + ' -> ' + baseBranchBumpedVersion, GITHUB_WORKSPACE)
              break
            default:
              console.warn('Version comparison failed')
              semVerAction = '⁉️ WTF??'
              break
          }

          tableRows.push([projectName, currentVersion, baseBranchVersion, baseBranchBumpedVersion, semVerAction, relativePath])
        } else {
          // Kustomization file does not EXIST on BASE_BRANCH_NAME -> new Kustomize project!
          tableRows.push([projectName, currentVersion, '-', currentVersion, '❇️ New', relativePath])
        }
      } else {
        let currentVersion = utilsKustomize.readOrCreateVersionFile(dir)
        tableRows.push([projectName, currentVersion, '-', currentVersion, '➖ Disabled', relativePath])
      }
    }

    await core.summary
      .addTable([tableHeader, ...tableRows])
      .addBreak()
      .addDetails(
        'Legend',
        '✅ = Local branch .version is already greater than Base branch .version\n' +
          '✳️ = Local branch .version was bumped automatically by patch version\n' +
          '❇️ = Kustomize project does NOT exist on Base branch, using local version\n' +
          '❗ = Uncommon situation, please check manually\n' +
          '➖ = Version Bump Feature Disabled by ' +
          constants.KustomizeFiles.ciConfigYaml
      )
      .write()

    core.endGroup()
    await utils.Git.getInstance().push(GITHUB_WORKSPACE)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
