<script setup>
import { Button } from '@modrinth/ui'
import { ref, onMounted } from 'vue'
import { get, set } from '@/helpers/settings.js'
import mixpanel from 'mixpanel-browser'
import GalleryImage from '@/components/ui/tutorial/GalleryImage.vue'
// import LoginCard from '@/components/ui/tutorial/LoginCard.vue'
import StickyTitleBar from '@/components/ui/tutorial/StickyTitleBar.vue'
import { auto_install_java, get_jre } from '@/helpers/jre.js'
import { handleError } from '@/store/notifications.js'
// import ImportingCard from '@/components/ui/tutorial/ImportingCard.vue'
// import ModrinthLoginScreen from '@/components/ui/tutorial/ModrinthLoginScreen.vue'
// import PreImportScreen from '@/components/ui/tutorial/PreImportScreen.vue'

const page = ref(1)

const props = defineProps({
  finish: {
    type: Function,
    default: () => {},
  },
})

// const flow = ref('')

// const nextPhase = () => {
//   phase.value++
//   mixpanel.track('TutorialPhase', { page: phase.value })
// }

// const prevPhase = () => {
//   phase.value--
// }

// const nextPage = (newFlow) => {
//   page.value++
//   mixpanel.track('OnboardingPage', { page: page.value })
//
//   if (newFlow) {
//     flow.value = newFlow
//   }
// }

// const endOnboarding = () => {
//   nextPhase()
// }

// const prevPage = () => {
//   page.value--
// }

const finishOnboarding = async () => {
  mixpanel.track('OnboardingFinish')
  const settings = await get()
  settings.onboarded = true
  await set(settings)
  props.finish()
}

async function fetchSettings() {
  const fetchSettings = await get().catch(handleError)
  if (!fetchSettings.java_globals) {
    fetchSettings.java_globals = {}
  }

  if (!fetchSettings.java_globals.JAVA_17) {
    const path1 = await auto_install_java(17).catch(handleError)
    fetchSettings.java_globals.JAVA_17 = await get_jre(path1).catch(handleError)
  }

  if (!fetchSettings.java_globals.JAVA_8) {
    const path2 = await auto_install_java(8).catch(handleError)
    fetchSettings.java_globals.JAVA_8 = await get_jre(path2).catch(handleError)
  }

  await set(fetchSettings).catch(handleError)
}

// const accessSettings = async () => {
//   const settings = await get()
//
//   if (!settings.java_globals.JAVA_8) settings.java_globals.JAVA_8 = { path: '', version: '' }
//   if (!settings.java_globals.JAVA_17) settings.java_globals.JAVA_17 = { path: '', version: '' }
//
//   settings.javaArgs = settings.custom_java_args.join(' ')
//   settings.envArgs = settings.custom_env_args.map((x) => x.join('=')).join(' ')
//
//   return settings
// }

// const settings = ref(accessSettings)
// async function migrateModrinthData() {
//   settings.value = await accessSettings().catch(handleError)
//
//   const pathSeparator = settings.value.loaded_config_dir.includes('/') ? '/' : '\\';
//   const pathComponents = settings.value.loaded_config_dir.split(pathSeparator);
//
//   pathComponents.pop();
//   pathComponents.push("astralrinth")
//
//   let newPath = pathComponents.join(pathSeparator)
//
//   console.log(settings.value.loaded_config_dir)
//   console.log(newPath)
//   // await migrate_config_dir(mrPath) // Migrate process...
//   await change_config_dir(newPath)
// }

onMounted(async () => {
  await fetchSettings()
})
</script>

<template>
  <div class="onboarding">
    <StickyTitleBar />
    <GalleryImage
      v-if="page === 1"
      :gallery="[
        { // Main gallery
          url: 'https://i.imgur.com/1xhmQ7i.png',
          title: 'AstralRinth Contacts',
          subtitle: 'You can get support and help with our patches or just have a nice chat in our chat. Scan the QR-Code and follow the news!',
        }
      ]"
      logo
    >
      <Button class="large" color="primary" @click="finishOnboarding">
        <span class="h4">Log into the AstralRinth launcher and start playing</span>
      </Button>
    </GalleryImage>
  </div>
</template>

<style scoped lang="scss">
.sleek-primary {
  background-color: var(--color-brand-highlight);
  transition: all ease-in-out 0.1s;
}

.navigation-controls {
  flex-grow: 1;
  width: min-content;
}

.window-controls {
  z-index: 20;
  display: none;
  flex-direction: row;
  align-items: center;
  gap: 0.25rem;

  .titlebar-button {
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all ease-in-out 0.1s;
    background-color: var(--color-raised-bg);
    color: var(--color-base);

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
  --appbar-height: 3.25rem;
  --sidebar-width: 4.5rem;

  height: 100vh;
  display: flex;
  flex-direction: row;
  overflow: hidden;

  .view {
    width: calc(100% - var(--sidebar-width));

    .appbar {
      display: flex;
      align-items: center;
      background: var(--color-raised-bg);
      box-shadow: var(--shadow-inset-sm), var(--shadow-floating);
      padding: var(--gap-md);
      height: 3.25rem;
      gap: var(--gap-sm);
      user-select: none;
      -webkit-user-select: none;
    }

    .router-view {
      width: 100%;
      height: calc(100% - 3.125rem);
      overflow: auto;
      overflow-x: hidden;
      background-color: var(--color-bg);
    }
  }
}

.nav-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  background-color: var(--color-raised-bg);
  box-shadow: var(--shadow-inset-sm), var(--shadow-floating);
  padding: var(--gap-md);
  width: var(--sidebar-width);
  max-width: var(--sidebar-width);
  min-width: var(--sidebar-width);

  --sidebar-width: 4.5rem;
}

.pages-list {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  width: 100%;
  gap: 0.5rem;

  .btn {
    background-color: var(--color-raised-bg);
    height: 3rem !important;
    width: 3rem !important;
    padding: 0.75rem;
    border-radius: var(--radius-md);
    box-shadow: none;

    svg {
      width: 1.5rem !important;
      height: 1.5rem !important;
      max-width: 1.5rem !important;
      max-height: 1.5rem !important;
    }

    &.active {
      background-color: var(--color-button-bg);
      box-shadow: var(--shadow-floating);
    }

    &.sleek-primary {
      background-color: var(--color-brand-highlight);
      transition: all ease-in-out 0.1s;
    }
  }
}

.nav-section {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
  height: 100%;
  gap: 1rem;
}

.sticky-tip {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  z-index: 10;
}

.intro-card {
  display: flex;
  flex-direction: column;
  padding: var(--gap-xl);

  .app-logo {
    width: 100%;
    height: auto;
    display: block;
    margin: auto;
  }

  p {
    color: var(--color-contrast);
    text-align: left;
    width: 100%;
  }

  .actions {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    gap: var(--gap-sm);
  }
}

.final-tip {
  position: absolute;
  bottom: 50%;
  right: 50%;
  transform: translate(50%, 50%);
  z-index: 10;
}

.onboarding {
  background: top linear-gradient(0deg, #000000, rgba(0, 0, 0, 0.35)),
  url(https://i.imgur.com/GA3OPpg.png);
  background-size: cover;
  height: 100vh;
  min-height: 100vh;
  max-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--gap-xl);
  padding-top: calc(2.5rem + var(--gap-lg));
}

.first-tip {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
}

.whole-page-shadow {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100%;
  backdrop-filter: brightness(0.5);
  -webkit-backdrop-filter: brightness(0.5);
  z-index: 9;
}
</style>
