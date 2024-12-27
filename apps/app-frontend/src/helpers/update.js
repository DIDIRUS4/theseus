import { ref } from 'vue'
import { getVersion } from '@tauri-apps/api/app'
import { getArtifact, getOS } from '@/helpers/utils.js'

const version = await getVersion()

export const allowState = ref(false)
export const installState = ref(false)
export const updateState = ref(false)
export const latestBetaCommitTruncatedSha = ref('')
export const latestBetaCommitLink = ref('')
export const launcherUrl = 'https://www.astralium.su/get/ar'

const os = ref('')
const releaseLink = `https://api.github.com/repos/DIDIRUS4/AstralRinth/releases/latest`
const branchesLink = `https://api.github.com/repos/DIDIRUS4/AstralRinth/branches`
const failedFetch = [`Failed to fetch remote releases:`, `Failed to fetch remote commits:`]
const localVersion = `v${version}`
const betaBranch = `beta` // Github repository beta branch
const osNames = ['macos', 'windows', 'linux']
const macExtension = `.dmg` // MacOS file type for download
const windowsExtension = `.msi` // Windows file type for download
const blacklistedBuilds = [
  `dev`,
  `nightly`,
  `dirty`,
  `dirty-dev`,
  `dirty-nightly`,
  `dirty_dev`,
  `dirty_nightly`,
] // This is blacklisted builds for download. For example, file.startsWith('dev') is not allowed.

/**
 * Asynchronously fetches branches and their latest commit information from the specified URLs.
 *
 * @return {Promise<void>} This function does not return anything directly but updates the latestBetaCommitTruncatedSha and latestBetaCommitLink values.
 */
export async function getBranches() {
  fetch(branchesLink)
    .then(async (response) => {
      if (response.ok) {
        response.json().then((data) => {
          const branches = data.map((branch) => branch)
          branches.forEach((branch) => {
            fetch(branch.commit.url).then(async (data) => {
              if (data.ok) {
                data.json().then((data) => {
                  const truncatedSha = data.sha.slice(0, 7)
                  const commitLink = data.html_url
                  if (branch.name.toLowerCase() == betaBranch) {
                    latestBetaCommitTruncatedSha.value = truncatedSha
                    latestBetaCommitLink.value = commitLink
                  }
                })
              } else {
                throw new Error(data.status)
              }
            })
          })
        })
      } else {
        throw new Error(response.status)
      }
    })
    .catch((error) => {
      latestBetaCommitTruncatedSha.value = error.message
      latestBetaCommitLink.value = undefined
      console.error(failedFetch[1], error)
    })
}

/**
 * Asynchronous function to get remote data and handle updates and downloads.
 *
 * @param {boolean} elementIdBool - Indicates whether to disable an element ID.
 * @param {boolean} downloadArtifactBool - Indicates whether to download an artifact.
 */
export async function getRemote(elementIdBool, downloadArtifactBool) {
  fetch(releaseLink)
    .then((response) => {
      if (!response.ok) {
        throw new Error(response.status)
      }
      return response.json()
    })
    .then(async (data) => {
      os.value = await getOS()
      const latestRelease = data.name
      let remoteVersion = undefined

      if (!elementIdBool) {
        const releaseData = document.getElementById('releaseData')
        if (releaseData == null) {
          console.error('Release data element not found.')
          return false
        }
        releaseData.textContent = latestRelease
        remoteVersion = `${releaseData.textContent}`
      } else {
        remoteVersion = latestRelease
      }
      if (osNames.includes(os.value.toLowerCase())) {
        if (remoteVersion.startsWith(localVersion)) {
          updateState.value = false
          allowState.value = false
        } else {
          updateState.value = true
          allowState.value = true
        }
      } else {
        updateState.value = false
        allowState.value = false
      }
      console.log('Update available state is', updateState.value)
      console.log('Remote version is', remoteVersion)
      console.log('Local version is', localVersion)
      console.log('Operating System is', os.value)

      if (downloadArtifactBool) {
        installState.value = true
        const builds = data.assets
        const fileName = getInstaller(getExtension(), builds)
        if (fileName != null) {
          await getArtifact(fileName[1], fileName[0], os.value, true)
        }
        installState.value = false
      }
    })
    .catch((error) => {
      console.error(failedFetch[0], error)
      if (!elementIdBool) {
        const errorData = document.getElementById('releaseData')
        if (errorData) {
          errorData.textContent = `${error.message}`
        }
        updateState.value = false
        allowState.value = false
        installState.value = false
      }
    })
}

/**
 * Retrieves the installer for a specific operating system.
 *
 * @param {string} osExtension - The file extension of the installer.
 * @param {Array} builds - The list of builds.
 * @return {Array|null} An array containing the installer name and URL if found, or null if not found.
 */
function getInstaller(osExtension, builds) {
  for (let i of builds) {
    let blacklistedItem = false
    blacklistedBuilds.forEach((item) => {
      if (i.name.startsWith(item)) {
        return (blacklistedItem = true)
      }
    })
    if (i.name.endsWith(osExtension) && !blacklistedItem) {
      console.log(i.browser_download_url)
      return [i.name, i.browser_download_url]
    }
  }
  return null
}

/**
 * A function to get the extension based on the operating system.
 *
 * @return {string} The extension based on the operating system.
 */
function getExtension() {
  if (os.value.toLowerCase() == osNames[0]) {
    return macExtension
  } else if (os.value.toLowerCase() == osNames[1]) {
    return windowsExtension
  }
  return null
}