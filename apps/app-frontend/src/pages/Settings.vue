<script setup>
import { ref, watch } from 'vue'
import {
  DownloadIcon,
  LogOutIcon,
  LogInIcon,
  BoxIcon,
  FolderSearchIcon,
  UpdatedIcon,
} from '@modrinth/assets'
import { Card, Slider, DropdownSelect, Toggle, Modal, Button } from '@modrinth/ui'
import { handleError, useTheming } from '@/store/state'
import { is_dir_writeable, change_config_dir, get, set } from '@/helpers/settings'
import { get_java_versions, get_max_memory, set_java_version } from '@/helpers/jre'
import { get as getCreds, logout } from '@/helpers/mr_auth.js'
import JavaSelector from '@/components/ui/JavaSelector.vue'
import ModrinthLoginScreen from '@/components/ui/tutorial/ModrinthLoginScreen.vue'
import { mixpanel_opt_out_tracking, mixpanel_opt_in_tracking } from '@/helpers/mixpanel'
import { open } from '@tauri-apps/api/dialog'
import { getOS } from '@/helpers/utils.js'
import { version, patch_version, development_build } from '../../package.json'
import { useLanguage } from '@/store/language.js'
import { i18n } from '@/main.js'
import { PirateShip } from '@/assets/render/index.js'
import {
  getRemote,
  getBranches,
  hrefAstralium,
  latestBetaCommitLink,
  latestBetaCommitTruncatedSha,
} from '@/helpers/update.js'
const t = i18n.global.t
import { get_user } from '@/helpers/cache.js'

const pageOptions = ['Home', 'Library']
const themeStore = useTheming()
const languageStore = useLanguage()

const accessSettings = async () => {
  const settings = await get()

  settings.launchArgs = settings.extra_launch_args.join(' ')
  settings.envVars = settings.custom_env_vars.map((x) => x.join('=')).join(' ')

  return settings
}

const fetchSettings = await accessSettings().catch(handleError)

const settings = ref(fetchSettings)
// const settingsDir = ref(settings.value.loaded_config_dir)

const maxMemory = ref(Math.floor((await get_max_memory().catch(handleError)) / 1024))

watch(
  settings,
  async (oldSettings, newSettings) => {
    if (oldSettings.loaded_config_dir !== newSettings.loaded_config_dir) {
      return
    }

    const setSettings = JSON.parse(JSON.stringify(newSettings))

    if (setSettings.telemetry) {
      mixpanel_opt_out_tracking()
    } else {
      mixpanel_opt_in_tracking()
    }

    setSettings.extra_launch_args = setSettings.launchArgs.trim().split(/\s+/).filter(Boolean)
    setSettings.custom_env_vars = setSettings.envVars
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((x) => x.split('=').filter(Boolean))

    if (!setSettings.hooks.pre_launch) {
      setSettings.hooks.pre_launch = null
    }
    if (!setSettings.hooks.wrapper) {
      setSettings.hooks.wrapper = null
    }
    if (!setSettings.hooks.post_exit) {
      setSettings.hooks.post_exit = null
    }

    if (!setSettings.custom_dir) {
      setSettings.custom_dir = null
    }

    await set(setSettings)
  },
  { deep: true },
)

const javaVersions = ref(await get_java_versions().catch(handleError))
async function updateJavaVersion(version) {
  if (version?.path === '') {
    version.path = undefined
  }

  if (version?.path) {
    version.path = version.path.replace('java.exe', 'javaw.exe')
  }

  await set_java_version(version).catch(handleError)
}

async function fetchCredentials() {
  const creds = await getCreds().catch(handleError)
  console.log(creds)
  if (creds && creds.user_id) {
    creds.user = await get_user(creds.user_id).catch(handleError)
  }
  credentials.value = creds
}

const credentials = ref()
await fetchCredentials()

const loginScreenModal = ref()

async function logOut() {
  await logout().catch(handleError)
  await fetchCredentials()
}

async function signInAfter() {
  await fetchCredentials()
}

async function findLauncherDir() {
  const newDir = await open({
    multiple: false,
    directory: true,
    title: t('Settings.SelectANewAppDirectory'),
  })

  if (newDir) {
    settings.value.custom_dir = newDir
  }
}
const confirmUpdate = ref(null)

await getRemote(false, false)
await getBranches()
</script>

<template>
  <div class="settings-page">
    <Card>
      <div class="label">
        <h3>
          <span class="label__title size-card-header">{{ t('Settings.GeneralSettings') }}</span>
        </h3>
      </div>
      <ModrinthLoginScreen ref="loginScreenModal" :callback="signInAfter" />
      <div class="adjacent-input">
        <label for="theme">
          <span class="label__title">{{ t('Settings.ManageAccount') }}</span>
          <span v-if="credentials" class="label__description">
            {{ t('Settings.ManageAccount') }} {{ credentials.user.username }}.
          </span>
          <span v-else> {{ t('Settings.SignInToYourModrinthAccount') }} </span>
        </label>
        <button v-if="credentials" class="btn" @click="logOut">
          <LogOutIcon />
          {{ t('Settings.SignOut') }}
        </button>
        <button v-else class="btn" @click="$refs.loginScreenModal.show()">
          <LogInIcon />
          {{ t('Settings.SignIn') }}
        </button>
      </div>
      <label for="theme">
        <span class="label__title">{{ t('Settings.AppDirectory') }}</span>
        <span class="label__description">
          {{ t('Settings.TheDirectoryWhereTheLauncherStoresAllOfItsFiles') }}
        </span>
      </label>
      <div class="app-directory">
        <div class="iconified-input">
          <BoxIcon />
          <input id="appDir" v-model="settings.custom_dir" type="text" class="input" />
          <Button class="r-btn" @click="findLauncherDir">
            <FolderSearchIcon />
          </Button>
        </div>
      </div>
    </Card>
    <Card>
      <div class="label">
        <h3>
          <span class="label__title size-card-header">{{ t('Settings.Display') }}</span>
        </h3>
      </div>
      <div class="adjacent-input">
        <label for="theme">
          <span class="label__title">{{ t('Settings.ColorTheme') }}</span>
          <span class="label__description">{{ t('Settings.ChangeColor') }}</span>
        </label>
        <DropdownSelect
          id="theme"
          name="Theme dropdown"
          :options="themeStore.themeOptions"
          :default-value="settings.theme"
          :model-value="settings.theme"
          class="theme-dropdown"
          @change="
            (e) => {
              themeStore.setThemeState(e.option.toLowerCase())
              settings.theme = themeStore.selectedTheme
            }
          "
        />
      </div>

      <div class="adjacent-input">
        <label for="language">
          <span class="label__title">{{ t('Settings.Language') }}</span>
          <span class="label__description">{{
            t('Settings.ChangeTheGlobalLauncherLanguages')
          }}</span>
        </label>
        <DropdownSelect
          id="language"
          name="Language dropdown"
          :options="languageStore.languageOptions"
          :default-value="settings.language"
          :model-value="settings.language"
          class="language-dropdown"
          @change="
            (e) => {
              languageStore.setLanguageState(e.option.toLowerCase())
              settings.language = e.option
            }
          "
        />
      </div>

      <div class="adjacent-input">
        <label for="advanced-rendering">
          <span class="label__title">{{ t('Settings.AdvancedRendering') }}</span>
          <span class="label__description">
            {{ t('Settings.EnablesAdvancedRendering') }}
          </span>
        </label>
        <Toggle
          id="advanced-rendering"
          :model-value="themeStore.advancedRendering"
          :checked="themeStore.advancedRendering"
          @update:model-value="
            (e) => {
              themeStore.advancedRendering = e
              settings.advanced_rendering = themeStore.advancedRendering
            }
          "
        />
      </div>
      <div class="adjacent-input">
        <label for="minimize-launcher">
          <span class="label__title">{{ t('Settings.MinimizeLauncher') }}</span>
          <span class="label__description">{{ t('Settings.MinimizeTheLauncher') }}</span>
        </label>
        <Toggle
          id="minimize-launcher"
          :model-value="settings.hide_on_process_start"
          :checked="settings.hide_on_process_start"
          @update:model-value="
            (e) => {
              settings.hide_on_process_start = e
            }
          "
        />
      </div>
      <div v-if="getOS() != 'MacOS'" class="adjacent-input">
        <label for="native-decorations">
          <span class="label__title">{{ t('Settings.NativeDecorations') }}</span>
          <span class="label__description">{{ t('Settings.UseSystemWindowFrame') }}</span>
        </label>
        <Toggle
          id="native-decorations"
          :model-value="settings.native_decorations"
          :checked="settings.native_decorations"
          @update:model-value="
            (e) => {
              settings.native_decorations = e
            }
          "
        />
      </div>
      <div class="adjacent-input">
        <label for="opening-page">
          <span class="label__title">{{ t('Settings.DefaultLandingPage') }}</span>
          <span class="label__description">{{
            t('Settings.ChangeThePageToWhichTheLauncherOpensOn')
          }}</span>
        </label>
        <DropdownSelect
          id="opening-page"
          name="Opening page dropdown"
          :options="pageOptions"
          :default-value="settings.default_page"
          :model-value="settings.default_page"
          class="opening-page"
          @change="
            (e) => {
              settings.default_page = e.option
            }
          "
        />
      </div>
    </Card>
    <Card>
      <div class="label">
        <h3>
          <span class="label__title size-card-header">{{ t('Settings.ResourceManagement') }}</span>
        </h3>
      </div>

      <div class="adjacent-input">
        <label for="max-downloads">
          <span class="label__title">{{ t('Settings.Mcd') }}</span>
          <span class="label__description">{{ t('Settings.McdDesc') }}</span>
        </label>
        <Slider
          id="max-downloads"
          v-model="settings.max_concurrent_downloads"
          :min="1"
          :max="10"
          :step="1"
        />
      </div>

      <div class="adjacent-input">
        <label for="max-writes">
          <span class="label__title">{{ t('Settings.Mcw') }}</span>
          <span class="label__description">{{ t('Settings.McwDesc') }}</span>
        </label>
        <Slider
          id="max-writes"
          v-model="settings.max_concurrent_writes"
          :min="1"
          :max="50"
          :step="1"
        />
      </div>
    </Card>
    <Card>
      <div class="label">
        <h3>
          <span class="label__title size-card-header">{{ t('Settings.Privacy') }}</span>
        </h3>
      </div>
      <div class="adjacent-input">
        <label for="opt-out-analytics">
          <span class="label__title">{{ t('Settings.DisableAnalytics') }}</span>
          <span class="label__description">
            {{ t('Settings.AnalyticsDesc') }}
          </span>
        </label>
        <Toggle
          id="opt-out-analytics"
          :model-value="settings.telemetry"
          :checked="settings.telemetry"
          :disabled="settings.telemetry"
          @update:model-value="
            (e) => {
              settings.telemetry = e
            }
          "
        />
      </div>
      <div class="adjacent-input">
        <label for="disable-discord-rpc">
          <span class="label__title">{{ t('Settings.DisableRPC') }}</span>
          <span class="label__description">
            {{ t('Settings.DisableRPCDesc') }}
          </span>
        </label>
        <Toggle
          id="disable-discord-rpc"
          v-model="settings.discord_rpc"
          :checked="settings.discord_rpc"
          @update:model-value="
            (e) => {
              settings.discord_rpc = e
            }
          "
        />
      </div>
    </Card>
    <Card>
      <div class="label">
        <h3>
          <span class="label__title size-card-header">{{ t('Settings.JavaSet') }}</span>
        </h3>
      </div>
      <template v-for="version in [21, 17, 8]">
        <label :for="'java-' + version">
          <span class="label__title">Java {{ version }}</span>
        </label>
        <JavaSelector
          :id="'java-selector-' + version"
          v-model="javaVersions[version]"
          :version="version"
          @update:model-value="updateJavaVersion"
        />
      </template>
      <hr class="card-divider" />
      <label for="java-args">
        <span class="label__title">{{ t('Settings.JavaArgs') }}</span>
      </label>
      <input
        id="java-args"
        v-model="settings.launchArgs"
        autocomplete="off"
        type="text"
        class="installation-input"
        :placeholder="t('Settings.EnterJavaArgs')"
      />
      <label for="env-vars">
        <span class="label__title">{{ t('Settings.EnvVars') }}</span>
      </label>
      <input
        id="env-vars"
        v-model="settings.envVars"
        autocomplete="off"
        type="text"
        class="installation-input"
        :placeholder="t('Settings.EnterEnvVars')"
      />
      <hr class="card-divider" />
      <div class="adjacent-input">
        <label for="max-memory">
          <span class="label__title">{{ t('Settings.JavaMem') }}</span>
          <span class="label__description">
            {{ t('Settings.JavaMemDesc') }}
          </span>
        </label>
        <Slider
          id="max-memory"
          v-model="settings.memory.maximum"
          :min="8"
          :max="maxMemory"
          :step="64"
          unit="mb"
        />
      </div>
    </Card>
    <Card>
      <div class="label">
        <h3>
          <span class="label__title size-card-header">{{ t('Settings.Hooks') }}</span>
        </h3>
      </div>
      <div class="adjacent-input">
        <label for="pre-launch">
          <span class="label__title">{{ t('Settings.PreLaunch') }}</span>
          <span class="label__description">{{ t('Settings.PreLaunchDesc') }}</span>
        </label>
        <input
          id="pre-launch"
          v-model="settings.hooks.pre_launch"
          autocomplete="off"
          type="text"
          :placeholder="t('Settings.EnterPreLaunch')"
        />
      </div>
      <div class="adjacent-input">
        <label for="wrapper">
          <span class="label__title">{{ t('Settings.Wrapper') }}</span>
          <span class="label__description">{{ t('Settings.WrapperDesc') }}</span>
        </label>
        <input
          id="wrapper"
          v-model="settings.hooks.wrapper"
          autocomplete="off"
          type="text"
          :placeholder="t('Settings.EnterWrapper')"
        />
      </div>
      <div class="adjacent-input">
        <label for="post-exit">
          <span class="label__title">{{ t('Settings.PostExit') }}</span>
          <span class="label__description">{{ t('Settings.PostExitDesc') }}</span>
        </label>
        <input
          id="post-exit"
          v-model="settings.hooks.post_exit"
          autocomplete="off"
          type="text"
          :placeholder="t('Settings.EnterPostExit')"
        />
      </div>
    </Card>
    <Card>
      <div class="label">
        <h3>
          <span class="label__title size-card-header">{{ t('Settings.WindowSize') }}</span>
        </h3>
      </div>
      <div class="adjacent-input">
        <label for="fullscreen">
          <span class="label__title">{{ t('Settings.FullScreen') }}</span>
          <span class="label__description">
            {{ t('Settings.FullScreenDesc') }}
          </span>
        </label>
        <Toggle
          id="fullscreen"
          :model-value="settings.force_fullscreen"
          :checked="settings.force_fullscreen"
          @update:model-value="
            (e) => {
              settings.force_fullscreen = e
            }
          "
        />
      </div>
      <div class="adjacent-input">
        <label for="width">
          <span class="label__title">{{ t('Settings.Width') }}</span>
          <span class="label__description">{{ t('Settings.WidthDesc') }}</span>
        </label>
        <input
          id="width"
          v-model="settings.game_resolution[0]"
          :disabled="settings.force_fullscreen"
          autocomplete="off"
          type="number"
          :placeholder="t('Settings.EnterWidth')"
        />
      </div>
      <div class="adjacent-input">
        <label for="height">
          <span class="label__title">{{ t('Settings.Height') }}</span>
          <span class="label__description">{{ t('Settings.HeightDesc') }}</span>
        </label>
        <input
          id="height"
          v-model="settings.game_resolution[1]"
          :disabled="settings.force_fullscreen"
          autocomplete="off"
          type="number"
          class="input"
          :placeholder="t('Settings.EnterHeight')"
        />
      </div>
    </Card>
    <Card>
      <div class="label inline-fix">
        <h3>
          <span class="label__title size-card-header in"
            >{{ t('Settings.About') }}
            <p v-if="development_build" class="development option">
              {{ t('Settings.DevelopmentBuild') }}
            </p>
          </span>
        </h3>
      </div>
      <div>
        <label>
          <span class="label__title inl">AstralRinth <PirateShip /> Version </span>
          <span class="label__description"
            >Modrinth/Code version: v{{ version }}. Patch version: v{{ patch_version }}
          </span>

          <span class="label__description"
            >{{ t('Settings.LatestBetaCommit') }}
            <a class="github" :href="latestBetaCommitLink">{{
              latestBetaCommitTruncatedSha
            }}</a></span
          >
          <span class="label__description"
            >{{ t('Settings.LatestAvailable') }}
            <a class="github" :href="hrefAstralium">{{ t('Settings.OurGithub') }}</a></span
          >

          <span class="label__title">Update Checker</span>

          <span class="label__description"
            >{{ t('Settings.Remote') }}
            <p id="releaseData" class="cosmic inline-fix"></p>
          </span>
          <span class="label__description"
            >{{ t('Settings.Local') }}
            <p class="cosmic inline-fix">v{{ version }}{{ patch_version }}</p></span
          >
        </label>
        <div class="inline-item-group">
          <Button icon-only @click="getRemote(false, false), getBranches()">
            <UpdatedIcon /> {{ t('Settings.CheckForUpdates') }}
          </Button>
        </div>
      </div>
      <UpdateModal ref="confirmUpdate" />
    </Card>
  </div>
</template>

<style lang="scss" scoped>
.markdown-body {
  :deep(table) {
    width: auto;
  }

  :deep(hr),
  :deep(h1),
  :deep(h2) {
    max-width: max(60rem, 90%);
  }

  :deep(ul),
  :deep(ol) {
    margin-left: 2rem;
  }
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: var(--gap-lg);
  text-align: left;

  .button-group {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }

  strong {
    color: var(--color-contrast);
  }
}

.download-modal {
  color: #3e8cde;
  padding: var(--gap-sm) var(--gap-lg);
  text-decoration: none;
  text-shadow:
    0 0 4px rgba(79, 173, 255, 0.5),
    0 0 8px rgba(14, 98, 204, 0.5),
    0 0 12px rgba(122, 31, 199, 0.5);
  transition: color 0.35s ease;
}

.download-modal:hover,
.download-modal:focus,
.download-modal:active {
  color: #10fae5;
  text-shadow: #26065e;
}

.option {
  background: var(--color-bg);
  border-radius: var(--radius-lg);
  width: auto;
  display: inline-flex;
  align-items: center;
  margin-top: auto;
  margin-left: 0.5rem;
  font-size: 1rem;
  padding: 0.5rem;
}

.development {
  color: #ff6a00;
  text-decoration: none;
  text-shadow:
    0 0 4px rgba(79, 173, 255, 0.5),
    0 0 8px rgba(14, 98, 204, 0.5),
    0 0 12px rgba(122, 31, 199, 0.5);
  transition: color 1.5s ease;
}

.development:hover,
.development:focus,
.development:active {
  color: #4800d3;
  text-shadow: #801313;
}

.cosmic {
  color: #3e8cde;
  text-decoration: none;
  text-shadow:
    0 0 4px rgba(79, 173, 255, 0.5),
    0 0 8px rgba(14, 98, 204, 0.5),
    0 0 12px rgba(122, 31, 199, 0.5);
  transition: color 0.35s ease;
}

.cosmic:hover,
.cosmic:focus,
.cosmic:active {
  color: #10fae5;
  text-shadow: #26065e;
}

.download {
  color: #3e8cde;
  border: none;
  padding: var(--gap-sm) var(--gap-lg);
  //background-color: rgba(0, 0, 0, 0.0);
  text-decoration: none;
  text-shadow:
    0 0 4px rgba(79, 173, 255, 0.5),
    0 0 8px rgba(14, 98, 204, 0.5),
    0 0 12px rgba(122, 31, 199, 0.5);
  transition: color 0.35s ease;
}

.download:hover,
.download:focus,
.download:active {
  color: #10fae5;
  text-shadow: #26065e;
}

a.github {
  color: #3e8cde;
  text-decoration: none;
  text-shadow:
    0 0 4px rgba(79, 173, 255, 0.5),
    0 0 8px rgba(14, 98, 204, 0.5),
    0 0 12px rgba(122, 31, 199, 0.5);
  transition: color 0.35s ease;
}

a.github:hover,
a.github:focus,
a.github:active {
  color: #10fae5;
  text-shadow: #26065e;
}

.inline-item-group {
  display: inline-flex;
  gap: 0.25rem;
}

.inline-fix {
  display: inline-flex;
  margin-top: -2rem;
  margin-bottom: -2rem;
  //margin-left: 0.3rem;
}

// .remote-update-fix {
//   display: inline-flex;

//   //width: ;
//   //margin-left: -0.2rem;
//   .iconified-input {
//     flex-grow: 1;

//     input {
//       flex-basis: auto;
//     }
//   }
// }

.settings-page {
  margin: 1rem;
}

.installation-input {
  width: 100% !important;
  flex-grow: 1;
}

.theme-dropdown {
  text-transform: capitalize;
}

.language-dropdown {
  text-transform: capitalize;
}

.app-directory {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--gap-sm);

  .iconified-input {
    flex-grow: 1;

    input {
      flex-basis: auto;
    }
  }
}
</style>
