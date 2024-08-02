<script setup>
import { computed, ref, onMounted } from 'vue'
import { RouterView, RouterLink, useRouter, useRoute } from 'vue-router'
import {
  HomeIcon,
  SearchIcon,
  LibraryIcon,
  PlusIcon,
  SettingsIcon,
  FileIcon,
  XIcon,
} from '@modrinth/assets'
import { Button, Notifications, Card, Avatar } from '@modrinth/ui'
import { useLoading, useTheming } from '@/store/state'
import AccountsCard from '@/components/ui/AccountsCard.vue'
import InstanceCreationModal from '@/components/ui/InstanceCreationModal.vue'
import { get, set } from '@/helpers/settings'
import Breadcrumbs from '@/components/ui/Breadcrumbs.vue'
import RunningAppBar from '@/components/ui/RunningAppBar.vue'
import SplashScreen from '@/components/ui/SplashScreen.vue'
import ModrinthLoadingIndicator from '@/components/modrinth-loading-indicator'
import { handleError, useNotifications } from '@/store/notifications.js'
import { command_listener, warning_listener } from '@/helpers/events.js'
import {
  MinimizeIcon,
  MaximizeIcon,
  ChatIcon,
  ArrowLeftFromLineIcon,
  ArrowRightFromLineIcon,
} from '@/assets/icons'
import { type } from '@tauri-apps/api/os'
import { appWindow } from '@tauri-apps/api/window'
import { isDev, getOS, showLauncherLogsFolder } from '@/helpers/utils.js'
import {
  mixpanel_init,
  mixpanel_is_loaded,
  mixpanel_opt_out_tracking,
  mixpanel_track,
} from '@/helpers/mixpanel.js'
import { install_from_file } from '@/helpers/pack.js'
// import { iconPathAsUrl } from '@/helpers/icon'

import URLConfirmModal from '@/components/ui/URLConfirmModal.vue'
// import StickyTitleBar from '@/components/ui/tutorial/StickyTitleBar.vue'
import OnboardingScreen from '@/components/ui/tutorial/OnboardingScreen.vue'

import { saveWindowState, StateFlags } from 'tauri-plugin-window-state-api'
import { getVersion } from '@tauri-apps/api/app'
import { window as TauriWindow } from '@tauri-apps/api'
import { TauriEvent } from '@tauri-apps/api/event'
import { useLanguage } from '@/store/language.js'

import { useError } from '@/store/error.js'
import ModInstallModal from '@/components/ui/install_flow/ModInstallModal.vue'
import IncompatibilityWarningModal from '@/components/ui/install_flow/IncompatibilityWarningModal.vue'
import InstallConfirmModal from '@/components/ui/install_flow/InstallConfirmModal.vue'
import { useInstall } from '@/store/install.js'

const themeStore = useTheming()
import { i18n } from '@/main.js'
const t = i18n.global.t
const languageStore = useLanguage()
const urlModal = ref(null)
const isLoading = ref(true)

const offline = ref(!navigator.onLine)
window.addEventListener('offline', () => {
  offline.value = true
})
window.addEventListener('online', () => {
  offline.value = false
})

const showOnboarding = ref(false)
const nativeDecorations = ref(false)

const sidebarOpen = ref(false)

const failureText = ref(null)
const os = ref('')

defineExpose({
  initialize: async () => {
    isLoading.value = false
    const {
      native_decorations,
      theme,
      language,
      telemetry,
      collapsed_navigation,
      advanced_rendering,
      onboarded,
    } = await get()
    languageStore.setLanguageState(language)
    const settings = await get()
    // video should play if the user is not on linux, and has not onboarded
    os.value = await getOS()
    // videoPlaying.value = !fully_onboarded && os.value !== 'Linux'
    const dev = await isDev()
    const version = await getVersion()
    showOnboarding.value = !onboarded

    nativeDecorations.value = native_decorations
    if (os.value !== 'MacOS') appWindow.setDecorations(native_decorations)

    themeStore.setThemeState(theme)
    themeStore.collapsedNavigation = collapsed_navigation
    themeStore.advancedRendering = advanced_rendering

    mixpanel_init('014c7d6a336d0efaefe3aca91063748d', { debug: dev, persistence: 'localStorage' })
    settings.telemetry = false // Disable telemetry by default
    set(settings)
    if (!telemetry) {
      console.info('[AR • Hard Disable Patch] • TELEMETRY (DISABLED) status is ', telemetry)
      mixpanel_opt_out_tracking()
    }
    mixpanel_track('Launched', { version, dev, onboarded })

    if (!dev) document.addEventListener('contextmenu', (event) => event.preventDefault())

    if ((await type()) === 'Darwin') {
      document.getElementsByTagName('html')[0].classList.add('mac')
    } else {
      document.getElementsByTagName('html')[0].classList.add('windows')
    }

    await warning_listener((e) =>
      notificationsWrapper.value.addNotification({
        title: 'Warning',
        text: e.message,
        type: 'warn',
      }),
    )

    // if (showOnboarding.value) {
    //   onboardingVideo.value.play()
    // }
  },
  failure: async (e) => {
    isLoading.value = false
    failureText.value = e
    os.value = await getOS()
  },
})

const handleClose = async () => {
  await TauriWindow.getCurrent().close()
}

TauriWindow.getCurrent().listen(TauriEvent.WINDOW_CLOSE_REQUESTED, async () => {
  await handleClose()
})

const router = useRouter()
router.afterEach((to, from, failure) => {
  if (mixpanel_is_loaded()) {
    mixpanel_track('PageView', { path: to.path, fromPath: from.path, failed: failure })
  }
})
const route = useRoute()
const isOnBrowse = computed(() => route.path.startsWith('/browse'))
const loading = useLoading()

const notifications = useNotifications()
const notificationsWrapper = ref()

const error = useError()
const errorModal = ref()

const install = useInstall()
const modInstallModal = ref()
const installConfirmModal = ref()
const incompatibilityWarningModal = ref()

onMounted(() => {
  notifications.setNotifs(notificationsWrapper.value)

  error.setErrorModal(errorModal.value)

  install.setIncompatibilityWarningModal(incompatibilityWarningModal)
  install.setInstallConfirmModal(installConfirmModal)
  install.setModInstallModal(modInstallModal)
})

document.querySelector('body').addEventListener('click', function (e) {
  let target = e.target
  while (target != null) {
    if (target.matches('a')) {
      if (
        target.href &&
        ['http://', 'https://', 'mailto:', 'tel:'].some((v) => target.href.startsWith(v)) &&
        !target.classList.contains('router-link-active') &&
        !target.href.startsWith('http://localhost') &&
        !target.href.startsWith('https://tauri.localhost')
      ) {
        window.__TAURI_INVOKE__('tauri', {
          __tauriModule: 'Shell',
          message: {
            cmd: 'open',
            path: target.href,
          },
        })
      }
      e.preventDefault()
      break
    }
    target = target.parentElement
  }
})

document.querySelector('body').addEventListener('auxclick', function (e) {
  // disables middle click -> new tab
  if (e.button === 1) {
    e.preventDefault()
    // instead do a left click
    const event = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true,
    })
    e.target.dispatchEvent(event)
  }
})

const accounts = ref(null)

command_listener(async (e) => {
  if (e.event === 'RunMRPack') {
    // RunMRPack should directly install a local mrpack given a path
    if (e.path.endsWith('.mrpack')) {
      await install_from_file(e.path).catch(handleError)
      mixpanel_track('InstanceCreate', {
        source: 'CreationModalFileDrop',
      })
    }
  } else {
    // Other commands are URL-based (deep linking)
    urlModal.value.show(e)
  }
})

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
}

// async function openInstance(instance) {
//   const instancePath = `/instance/${encodeURIComponent(instance.path)}/`
//   if (route.path.startsWith('/instance')) {
//     await router.replace({ path: `/library` }).then(() => {
//       setTimeout(() => {
//         router.replace({ path: instancePath }).catch(() => { })
//       }, 128)
//     })
//   } else {
//     router.push({ path: instancePath })
//   }
// }
</script>

<template>
  <!-- <StickyTitleBar v-if="videoPlaying" /> -->
  <!-- <video
    v-if="videoPlaying"
    ref="onboardingVideo"
    class="video"
    src="@/assets/video.mp4"
    autoplay
    @ended="videoPlaying = false"
  /> -->
  <div v-if="failureText" class="failure dark-mode">
    <div class="appbar-failure dark-mode">
      <Button v-if="os != 'MacOS'" icon-only @click="TauriWindow.getCurrent().close()">
        <XIcon />
      </Button>
    </div>
    <div class="error-view dark-mode">
      <Card class="error-text">
        <div class="label">
          <h3>
            <span class="label__title size-card-header">Failed to initialize</span>
          </h3>
        </div>
        <div class="error-div">
          AstralRinth App failed to load correctly. This may be because of a corrupted file, or
          because the app is missing crucial files.
        </div>
        <div class="error-div">You may be able to fix it one of the following ways:</div>
        <ul class="error-div">
          <li>Ennsuring you are connected to the internet, then try restarting the app.</li>
          <li>Redownloading the app.</li>
        </ul>
        <div class="error-div">
          If it still does not work, you can seek support using the link below. You should provide
          the following error, as well as any recent launcher logs in the folder below.
        </div>
        <div class="error-div">The following error was provided:</div>

        <Card class="error-message">
          {{ failureText.message }}
        </Card>

        <div class="button-row push-right">
          <Button @click="showLauncherLogsFolder"><FileIcon />Open launcher logs</Button>

          <a class="btn" href="https://www.astralium.su/follow/telegram/astralium">
            <ChatIcon /> Get support
          </a>
        </div>
      </Card>
    </div>
  </div>
  <SplashScreen v-else-if="!videoPlaying && isLoading" app-loading />
  <OnboardingScreen v-else-if="showOnboarding" :finish="() => (showOnboarding = false)" />
  <div v-else class="container">
    <div
      class="nav-container"
      data-tauri-drag-region
      :class="`${sidebarOpen ? 'nav-container__open' : ''}`"
      :style="{
        '--sidebar-label-opacity': sidebarOpen ? '1' : '0',
      }"
    >
      <div class="pages-list">
        <div class="square-collapsed-space">
          <Button
            transparent
            icon-only
            class="collapsed-button non-collapse"
            @click="toggleSidebar"
          >
            <ArrowRightFromLineIcon v-if="!sidebarOpen" />
            <ArrowLeftFromLineIcon v-else />
          </Button>
        </div>
      </div>
      <div class="pages-list">
        <suspense>
          <AccountsCard ref="accounts" mode="small" />
        </suspense>
        <div class="pages-list">
          <RouterLink to="/" class="btn icon-only collapsed-button">
            <HomeIcon />
            <span class="collapsed-button__label">{{ t('Application.Home') }}</span>
          </RouterLink>
          <RouterLink
            to="/browse/modpack"
            class="btn icon-only collapsed-button"
            :class="{
              'router-link-active': isOnBrowse,
            }"
          >
            <SearchIcon />
            <span class="collapsed-button__label">{{ t('Application.Browse') }}</span>
          </RouterLink>
          <RouterLink to="/library" class="btn icon-only collapsed-button">
            <LibraryIcon />
            <span class="collapsed-button__label">{{ t('Application.Library') }}</span>
          </RouterLink>
          <suspense>
            <InstanceCreationModal ref="installationModal" />
          </suspense>
        </div>
      </div>
      <!-- <div class="divider">
        <hr />
      </div>
      <div class="divider">
        <hr />
      </div> -->
      <div class="pages-list">
        <RouterLink to="/settings" class="btn icon-only collapsed-button">
          <SettingsIcon />
          <span class="collapsed-button__label">{{ t('Application.Settings') }}</span>
        </RouterLink>
        <Button
          class="page-item collapsed-button"
          icon-only
          :disabled="offline"
          @click="() => $refs.installationModal.show()"
        >
          <PlusIcon />
          <span class="collapsed-button__label">{{ t('Application.CreateProfile') }}</span>
        </Button>
      </div>
    </div>
    <div class="view">
      <div class="appbar-row">
        <!-- Top Bar -->
        <div data-tauri-drag-region class="appbar">
          <section class="navigation-controls">
            <router-link :to="'/'">
              <img src="../../app/icons/icon.png" class="logo" />
            </router-link>
            <Breadcrumbs after-logo data-tauri-drag-region />
          </section>
          <section class="mod-stats">
            <Suspense>
              <RunningAppBar />
            </Suspense>
          </section>
        </div>
        <section v-if="!nativeDecorations" class="window-controls">
          <Button class="titlebar-button" icon-only @click="() => appWindow.minimize()">
            <MinimizeIcon />
          </Button>
          <Button class="titlebar-button" icon-only @click="() => appWindow.toggleMaximize()">
            <MaximizeIcon />
          </Button>
          <Button
            class="titlebar-button close"
            icon-only
            @click="
              () => {
                saveWindowState(StateFlags.ALL)
                handleClose()
              }
            "
          >
            <XIcon />
          </Button>
        </section>
      </div>
      <div class="router-view">
        <ModrinthLoadingIndicator
          offset-height="var(--appbar-height)"
          :offset-width="sidebarOpen ? 'var(--sidebar-open-width)' : 'var(--sidebar-width)'"
        />
        <RouterView v-slot="{ Component }">
          <template v-if="Component">
            <Suspense @pending="loading.startLoading()" @resolve="loading.stopLoading()">
              <component :is="Component"></component>
            </Suspense>
          </template>
        </RouterView>
      </div>
    </div>
  </div>
  <URLConfirmModal ref="urlModal" />
  <Notifications ref="notificationsWrapper" />
  <ErrorModal ref="errorModal" />
  <ModInstallModal ref="modInstallModal" />
  <IncompatibilityWarningModal ref="incompatibilityWarningModal" />
  <InstallConfirmModal ref="installConfirmModal" />
</template>

<style lang="scss" scoped>
.sleek-primary {
  background-color: var(--color-brand-highlight);
  transition: all ease-in-out 0.1s;
}

.logo {
  height: calc(var(--appbar-height) - 2.5rem);
  width: auto;
  min-height: 100%;
  color: var(--color-contrast);
}

.navigation-controls {
  display: flex;
  flex-direction: row;

  align-items: center;
}

.appbar-row {
  display: flex;
  flex-direction: row;
}

.window-controls {
  z-index: 20;
  display: none;
  flex-direction: row;
  align-items: center;

  .titlebar-button {
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all ease-in-out 0.1s;
    background-color: var(--color-raised-bg);
    color: var(--color-base);
    border-radius: 0;
    height: var(--appbar-height);

    &.close {
      &:hover,
      &:active {
        background-color: var(--color-red);
        color: var(--color-accent-contrast);
      }
    }

    &:hover,
    &:active {
      background-color: var(--color-button-bg);
      color: var(--color-contrast);
    }
  }
}

.container {
  --appbar-height: 4.5rem;

  --sidebar-gap: 0.35rem;

  --sidebar-width: 4.5rem;
  --sidebar-open-width: 15rem;
  --sidebar-padding: 0.75rem;

  --sidebar-icon-size: 1.5rem;
  --sidebar-button-size: calc(var(--sidebar-width) - calc(var(--sidebar-padding) * 2));
  --sidebar-open-button-size: calc(var(--sidebar-open-width) - calc(var(--sidebar-padding) * 2));

  height: 100vh;
  display: flex;
  flex-direction: row;
  overflow: hidden;

  .view {
    width: calc(100% - var(--sidebar-width));
    background-color: var(--color-raised-bg);

    .appbar {
      display: flex;
      align-items: center;
      justify-content: space-between;

      flex-grow: 1;
      background: var(--color-raised-bg);
      text-align: center;
      padding: var(--gap-md);
      height: var(--appbar-height);
      gap: var(--gap-sm);
      //no select
      user-select: none;
      -webkit-user-select: none;
    }

    .router-view {
      width: 100%;
      height: calc(100% - var(--appbar-height));
      overflow: auto;
      overflow-x: hidden;
      background-color: var(--color-bg);
      border-top-left-radius: var(--radius-xl);
    }
  }
}

.failure {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--color-bg);

  .appbar-failure {
    display: flex;
    /* Change to flex to align items horizontally */
    justify-content: flex-end;
    /* Align items to the right */
    height: var(--appbar-height);
    //no select
    user-select: none;
    -webkit-user-select: none;
  }

  .error-view {
    display: flex;
    /* Change to flex to align items horizontally */
    justify-content: center;
    width: 100%;
    background-color: var(--color-bg);

    color: var(--color-base);

    .card {
      background-color: var(--color-raised-bg);
    }

    .error-text {
      display: flex;
      max-width: 60%;
      gap: 0.25rem;
      flex-direction: column;

      .error-div {
        // spaced out
        margin: 0.5rem;
      }

      .error-message {
        margin: 0.5rem;
        background-color: var(--color-button-bg);
      }
    }
  }
}

.nav-container {
  display: flex;
  flex-direction: column;

  padding-left: var(--sidebar-padding);
  padding-right: var(--sidebar-padding);
  padding-bottom: var(--sidebar-padding);

  align-items: center;
  justify-content: space-between;

  height: 100%;

  background-color: var(--color-raised-bg);
  box-shadow: var(--shadow-inset-sm), var(--shadow-floating);

  transition: all ease-in-out 0.1s;

  width: var(--sidebar-width);
}

.nav-container__open {
  width: var(--sidebar-open-width);
}

.square-collapsed-space {
  margin-top: 1rem;
  height: var(--appbar-height);
  width: 100%;

  user-select: none;
  -webkit-user-select: none;

  display: flex;
  justify-content: flex-start;
  align-items: center;
}

@media screen and (-webkit-min-device-pixel-ratio: 0) {
  .square-collapsed-space {
    height: auto;
    padding-bottom: var(--gap-md);
  }
}

.divider {
  height: auto;
  width: 100%;

  hr {
    background-color: var(--color-button-bg);
    border: none;
    color: var(--color-button-bg);

    height: 1px;
    width: 100%;

    margin: 0;
  }

  margin-top: var(--sidebar-gap);
  // div should always have + 1 --sidebar-gap margin to the bottom to be equal
  margin-bottom: calc(var(--sidebar-gap) * 2);

  padding-left: var(--sidebar-padding);
  padding-right: var(--sidebar-padding);
}

// .instances {
//   flex: 1;

//   flex-flow: column wrap; // This hides any elements that aren't fully visible
//   overflow: hidden;
// }

.pages-list {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;

  width: 100%;

  gap: var(--sidebar-gap);

  .page-item,
  a {
    display: flex;
    align-items: center;
    word-spacing: 3px;
    background: inherit;
    transition: all ease-in-out 0.1s;
    color: var(--color-base);

    &.router-link-active {
      color: var(--color-brand);
      background: var(--color-brand-highlight);
    }

    &:hover {
      color: var(--color-contrast);
      background: var(--color-button-bg);
    }

    &.router-link-active:hover {
      color: var(--color-brand);
      background: var(--color-brand-highlight);
    }
  }

  &.primary {
    color: var(--color-accent-contrast);
    background-color: var(--color-brand);
  }
}

:deep {
  .non-collapse {
    width: var(--sidebar-button-size) !important;
  }

  .collapsed-button {
    justify-content: flex-start;

    // width: var(--sidebar-icon-size);
    height: var(--sidebar-button-size);
    width: 100%;

    flex-shrink: 0;

    padding: var(--sidebar-padding) !important;
    border-radius: 16px; // 99999
    box-shadow: none;

    white-space: nowrap;
    overflow: hidden;

    transition: all ease-in-out 0.1s;

    .collapsed-button__icon,
    svg {
      width: var(--sidebar-icon-size) !important;
      height: var(--sidebar-icon-size) !important;

      flex-shrink: 0;
    }

    .collapsed-avatar__icon {
      width: var(--sidebar-icon-size) !important;
      height: var(--sidebar-icon-size) !important;

      flex-shrink: 0;

      border-radius: var(--radius-xl);
    }

    .collapsed-button__label {
      word-spacing: normal; // Why is this even needed?
      opacity: var(--sidebar-label-opacity);
      transition: all ease-in-out 0.1s;
    }
  }
}

.button-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: var(--gap-md);

  .transparent {
    padding: var(--gap-sm) 0;
  }
}
</style>
