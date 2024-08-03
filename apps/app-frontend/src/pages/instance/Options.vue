<template>
  <Modal ref="modal_confirm" :has-to-type="false" :noblur="!themeStore.advancedRendering"
    :header="t('Instance.Options.DeleteQuestion')">
    <div class="modal-body">
      <div class="markdown-body">
        <p>
          {{ t('Instance.Options.DeleteQuestionDesc') }}
        </p>
      </div>
      <div class="button-group push-right">
        <Button @click="modal_confirm.hide()"> {{ t('Instance.Options.Cancel') }} </Button>
        <Button color="danger" @click="removeProfile">
          <TrashIcon />
          {{ t('Instance.Options.Delete') }}
        </Button>
      </div>
    </div>
  </Modal>
  <Modal ref="modalConfirmUnlock" :header="t('Instance.Options.UnlockQuestion')"
    :noblur="!themeStore.advancedRendering">
    <div class="modal-delete">
      <div class="markdown-body" :v-html="t('Instance.Options.UnlockProceed')" />
      <div class="input-group push-right">
        <button class="btn" @click="$refs.modalConfirmUnlock.hide()">
          <XIcon />
          {{ t('Instance.Options.UnlockCancel') }}
        </button>
        <button class="btn btn-danger" @click="unlockProfile">
          <LockIcon />
          {{ t('Instance.Options.UnlockReact') }}
        </button>
      </div>
    </div>
  </Modal>

  <Modal ref="modalConfirmUnpair" :header="t('Instance.Options.UnpairQuestion')"
    :noblur="!themeStore.advancedRendering">
    <div class="modal-delete">
      <div class="markdown-body" :v-html="t('Instance.Options.UnpairProceed')
        " />
      <div class="input-group push-right">
        <button class="btn" @click="$refs.modalConfirmUnpair.hide()">
          <XIcon />
          {{ t('Instance.Options.UnpairCancel') }}
        </button>
        <button class="btn btn-danger" @click="unpairProfile">
          <XIcon />
          {{ t('Instance.Options.UnpairReact') }}
        </button>
      </div>
    </div>
  </Modal>

  <Modal ref="changeVersionsModal" :header="t('Instance.Options.ChangeVersions')"
    :noblur="!themeStore.advancedRendering">
    <div class="change-versions-modal universal-body">
      <div class="input-row">
        <p class="input-label">{{ t('Instance.Options.Loader') }}</p>
        <Chips v-model="loader" :items="loaders" :never-empty="false" />
      </div>
      <div class="input-row">
        <p class="input-label">{{ t('Instance.Options.GameVersion') }}</p>
        <div class="versions">
          <DropdownSelect v-model="gameVersion" :options="selectableGameVersions" name="Game Version Dropdown"
            render-up />
          <Checkbox v-model="showSnapshots" class="filter-checkbox" label="Include snapshots" />
        </div>
      </div>
      <div v-if="loader !== 'vanilla'" class="input-row">
        <p class="input-label">{{ t('Instance.Options.LoaderVersion') }}</p>
        <DropdownSelect :model-value="selectableLoaderVersions[loaderVersionIndex]" :options="selectableLoaderVersions"
          :display-name="(option) => option?.id" name="Version selector" render-up
          @change="(value) => (loaderVersionIndex = value.index)" />
      </div>
      <div class="push-right input-group">
        <button class="btn" @click="$refs.changeVersionsModal.hide()">
          <XIcon />
          {{ t('Instance.Options.BtnCancel') }}
        </button>
        <button class="btn btn-primary" :disabled="!isValid || !isChanged || editing" @click="saveGvLoaderEdits()">
          <SaveIcon />
          {{ editing ? t('Instance.Options.Saving') : t('Instance.Options.SaveChanges') }}
        </button>
      </div>
    </div>
  </Modal>
  <section class="card">
    <div class="label">
      <h3>
        <span class="label__title size-card-header">{{ t('Instance.Options.Instance') }}</span>
      </h3>
    </div>
    <label for="instance-icon">
      <span class="label__title">{{ t('Instance.Options.Icon') }}</span>
    </label>
    <div class="input-group">
      <Avatar :src="icon ? convertFileSrc(icon) : icon" size="md" class="project__icon" />
      <div class="input-stack">
        <button id="instance-icon" class="btn" @click="setIcon">
          <UploadIcon />
          {{ t('Instance.Options.SelectIcon') }}
        </button>
        <button :disabled="!icon" class="btn" @click="resetIcon">
          <TrashIcon />
          {{ t('Instance.Options.RemoveIcon') }}
        </button>
      </div>
    </div>

    <label for="project-name">
      <span class="label__title">{{ t('Instance.Options.Name') }}</span>
    </label>
    <input
      id="profile-name"
      v-model="title"
      autocomplete="off"
      maxlength="80"
      type="text"
      :disabled="instance.linked_data"
    />

    <div class="adjacent-input">
      <label for="edit-versions">
        <span class="label__title">{{ t('Instance.Options.EditMLGV') }}</span>
        <span class="label__description">
          {{ t('Instance.Options.EditMLGVDesc') }}
        </span>
      </label>
      <button id="edit-versions" class="btn" :disabled="offline" @click="$refs.changeVersionsModal.show()">
        <EditIcon />
        {{ t('Instance.Options.EditVersions') }}
      </button>
    </div>

    <div class="adjacent-input">
      <label>
        <span class="label__title">{{ t('Instance.Options.Categories') }}</span>
        <span class="label__description">
          {{ t('Instance.Options.CategoriesDesc') }}
        </span>
      </label>
      <multiselect v-model="groups" :options="availableGroups" :multiple="true" :searchable="true"
        :show-no-results="false" :close-on-select="false" :clear-search-on-select="false" :show-labels="false"
        :taggable="true" :tag-placeholder="t('Instance.Options.CategoriesAdd')"
        :placeholder="t('Instance.Options.CategoriesSelect')" @tag="(newTag) => {
          groups.push(newTag.trim().substring(0, 32))
          availableGroups.push(newTag.trim().substring(0, 32))
        }
          " />
    </div>
  </section>
  <Card>
    <div class="label">
      <h3>
        <span class="label__title size-card-header">{{ t('Instance.Options.Java') }}</span>
      </h3>
    </div>
    <div class="settings-group">
      <h3>{{ t('Instance.Options.Installation') }}</h3>
      <Checkbox v-model="overrideJavaInstall" :label="t('Instance.Options.OverrideJavaInstallation')" />
      <JavaSelector v-model="javaInstall" :disabled="!overrideJavaInstall" />
    </div>
    <hr class="card-divider" />
    <div class="settings-group">
      <h3>{{ t('Instance.Options.JavaArgs') }}</h3>
      <Checkbox v-model="overrideJavaArgs" :label="t('Instance.Options.OverrideJavaArgs')" />
      <input id="java-args" v-model="javaArgs" autocomplete="off" :disabled="!overrideJavaArgs" type="text"
        class="installation-input" :placeholder="t('Instance.Options.EnterJavaArgs')" />
    </div>
    <div class="settings-group">
      <h3>{{ t('Instance.Options.EnvVars') }}</h3>
      <Checkbox v-model="overrideEnvVars" :label="t('Instance.Options.OverrideEnvVars')" />
      <input v-model="envVars" autocomplete="off" :disabled="!overrideEnvVars" type="text" class="installation-input"
        :placeholder="t('Instance.Options.EnterEnvVars')" />
    </div>
    <hr class="card-divider" />
    <div class="settings-group">
      <h3>{{ t('Instance.Options.JavaMem') }}</h3>
      <Checkbox v-model="overrideMemorySettings" :label="t('Instance.Options.OverrideJavaMem')" />
      <Slider v-model="memory.maximum" :disabled="!overrideMemorySettings" :min="8" :max="maxMemory" :step="64"
        unit="mb" />
    </div>
  </Card>
  <Card>
    <div class="label">
      <h3>
        <span class="label__title size-card-header">{{ t('Instance.Options.Window') }}</span>
      </h3>
    </div>
    <div class="adjacent-input">
      <Checkbox v-model="overrideWindowSettings" :label="t('Instance.Options.OverrideWindow')" />
    </div>
    <div class="adjacent-input">
      <label for="fullscreen">
        <span class="label__title">{{ t('Instance.Options.FullScreen') }}</span>
        <span class="label__description">
          {{ t('Instance.Options.FullScreenDesc') }}
        </span>
      </label>
      <Toggle id="fullscreen" :model-value="fullscreenSetting" :checked="fullscreenSetting"
        :disabled="!overrideWindowSettings" @update:model-value="(e) => {
          fullscreenSetting = e
        }
          " />
    </div>
    <div class="adjacent-input">
      <label for="width">
        <span class="label__title">{{ t('Instance.Options.Width') }}</span>
        <span class="label__description"> {{ t('Instance.Options.WidthDesc') }} </span>
      </label>
      <input id="width" v-model="resolution[0]" autocomplete="off"
        :disabled="!overrideWindowSettings || fullscreenSetting" type="number"
        :placeholder="t('Instance.Options.EnterWidth')" />
    </div>
    <div class="adjacent-input">
      <label for="height">
        <span class="label__title">{{ t('Instance.Options.Height') }}</span>
        <span class="label__description"> {{ t('Instance.Options.HeightDesc') }} </span>
      </label>
      <input id="height" v-model="resolution[1]" autocomplete="off"
        :disabled="!overrideWindowSettings || fullscreenSetting" type="number" class="input"
        :placeholder="t('Instance.Options.EnterHeight')" />
    </div>
  </Card>
  <Card>
    <div class="label">
      <h3>
        <span class="label__title size-card-header">{{ t('Instance.Options.Hooks') }}</span>
      </h3>
    </div>
    <div class="adjacent-input">
      <Checkbox v-model="overrideHooks" :label="t('Instance.Options.OverrideHooks')" />
    </div>
    <div class="adjacent-input">
      <label for="pre-launch">
        <span class="label__title">{{ t('Instance.Options.PreLaunch') }}</span>
        <span class="label__description">{{ t('Instance.Options.PreLaunchDesc') }}</span>
      </label>
      <input id="pre-launch" v-model="hooks.pre_launch" autocomplete="off" :disabled="!overrideHooks" type="text"
        :placeholder="t('Instance.Options.EnterPreLaunch')" />
    </div>
    <div class="adjacent-input">
      <label for="wrapper">
        <span class="label__title">{{ t('Instance.Options.Wrapper') }}</span>
        <span class="label__description"> {{ t('Instance.Options.WrapperDesc') }} </span>
      </label>
      <input id="wrapper" v-model="hooks.wrapper" autocomplete="off" :disabled="!overrideHooks" type="text"
        :placeholder="t('Instance.Options.EnterWrapper')" />
    </div>
    <div class="adjacent-input">
      <label for="post-exit">
        <span class="label__title">{{ t('Instance.Options.PostExit') }}</span>
        <span class="label__description"> {{ t('Instance.Options.PostExitDesc') }} </span>
      </label>
      <input id="post-exit" v-model="hooks.post_exit" autocomplete="off" :disabled="!overrideHooks" type="text"
        :placeholder="t('Instance.Options.EnterPostExit')" />
    </div>
  </Card>
  <Card v-if="instance.linked_data">
    <div class="label">
      <h3>
        <span class="label__title size-card-header">{{ t('Instance.Options.Modpack') }}</span>
      </h3>
    </div>
    <div class="adjacent-input">
      <label for="general-modpack-info">
        <span class="label__description"> <strong>{{ t('Instance.Options.Modpack') }}: </strong> {{ instance.name }} </span>
        <span class="label__description">
          <strong>{{ t('Instance.Options.Version') }}: </strong>
          {{
            installedVersionData?.name != null
              ? installedVersionData.name.charAt(0).toUpperCase() +
              installedVersionData.name.slice(1)
              : getLocalVersion(props.instance.path)
          }}
        </span>
      </label>
    </div>
    <div v-if="!isPackLocked" class="adjacent-input">
      <Card class="unlocked-instance">
        {{ t('Instance.Options.Unlocked') }}
      </Card>
    </div>
    <div v-else class="adjacent-input">
      <label for="unlock-profile">
        <span class="label__title">{{ t('Instance.Options.UnlockedInstance') }}</span>
        <span class="label__description">
          {{ t('Instance.Options.UnlockedInstanceDesc') }}
        </span>
      </label>
      <Button id="unlock-profile" @click="$refs.modalConfirmUnlock.show()">
        <LockIcon /> {{ t('Instance.Options.Unlock') }}
      </Button>
    </div>

    <div class="adjacent-input">
      <label for="unpair-profile">
        <span class="label__title">{{ t('Instance.Options.UnpairInstance') }}</span>
        <span class="label__description">
          {{ t('Instance.Options.UnpairInstanceDesc') }}
        </span>
      </label>
      <Button id="unpair-profile" @click="$refs.modalConfirmUnpair.show()">
        <XIcon /> {{ t('Instance.Options.Unpair') }}
      </Button>
    </div>

    <div v-if="instance.linked_data.project_id" class="adjacent-input">
      <label for="change-modpack-version">
        <span class="label__title">{{ t('Instance.Options.ChangeMV') }}</span>
        <span class="label__description">
          {{ t('Instance.Options.ChangeMVDesc') }}
        </span>
      </label>

      <Button id="change-modpack-version" :disabled="inProgress || installing" @click="modpackVersionModal.show()">
        <SwapIcon />
        {{ t('Instance.Options.ChangeMV') }}
      </Button>
    </div>
    <div class="adjacent-input">
      <label for="repair-modpack">
        <span class="label__title">{{ t('Instance.Options.ReinstallModpack') }}</span>
        <span class="label__description">
          {{ t('Instance.Options.ReinstallModpackDesc') }}
        </span>
      </label>
      <Button id="repair-modpack" color="highlight" :disabled="offline" @click="repairModpack">
        <DownloadIcon /> {{ t('Instance.Options.Reinstall') }}
      </Button>
    </div>
  </Card>
  <Card>
    <div class="label">
      <h3>
        <span class="label__title size-card-header">{{ t('Instance.Options.InstanceManagement') }}</span>
      </h3>
    </div>
    <div v-if="instance.install_stage == 'installed'" class="adjacent-input">
      <label for="duplicate-profile">
        <span class="label__title">{{ t('Instance.Options.DuplicateInstance') }}</span>
        <span class="label__description">
          {{ t('Instance.Options.DuplicateInstanceDesc') }}
        </span>
      </label>
      <Button id="repair-profile" :disabled:="installing || inProgress || offline" @click="duplicateProfile">
        <ClipboardCopyIcon /> {{ t('Instance.Options.Duplicate') }}
      </Button>
    </div>
    <div class="adjacent-input">
      <label for="repair-profile">
        <span class="label__title">{{ t('Instance.Options.RepairInstance') }}</span>
        <span class="label__description">
          {{ t('Instance.Options.RepairInstanceDesc') }}
        </span>
      </label>
      <Button id="repair-profile" color="highlight" :disabled="installing || inProgress || repairing || offline"
        @click="repairProfile(true)">
        <HammerIcon /> {{ t('Instance.Options.Repair') }}
      </Button>
    </div>
    <div class="adjacent-input">
      <label for="delete-profile">
        <span class="label__title">{{ t('Instance.Options.DeleteInstance') }}</span>
        <span class="label__description">
          {{ t('Instance.Options.DeleteInstanceDesc') }}
        </span>
      </label>
      <Button id="delete-profile" color="danger" :disabled="removing" @click="modal_confirm.show()">
        <TrashIcon /> {{ t('Instance.Options.Delete') }}
      </Button>
    </div>
  </Card>
  <ModpackVersionModal
    v-if="instance.linked_data"
    ref="modpackVersionModal"
    :instance="instance"
    :versions="props.versions"
  />
</template>

<script setup>
import {
  TrashIcon,
  UploadIcon,
  EditIcon,
  XIcon,
  SaveIcon,
  LockIcon,
  HammerIcon,
  DownloadIcon,
  ClipboardCopyIcon,
} from '@modrinth/assets'
import {
  Button,
  Toggle,
  Card,
  Slider,
  Checkbox,
  Avatar,
  Modal,
  Chips,
  DropdownSelect,
} from '@modrinth/ui'
import { SwapIcon } from '@/assets/icons'

import { Multiselect } from 'vue-multiselect'
import { useRouter } from 'vue-router'
import {
  duplicate,
  edit,
  edit_icon,
  get_optimal_jre_key,
  install,
  list,
  remove,
  update_repair_modrinth,
} from '@/helpers/profile.js'
import { computed, readonly, ref, shallowRef, watch } from 'vue'
import { get_max_memory } from '@/helpers/jre.js'
import { get } from '@/helpers/settings.js'
import JavaSelector from '@/components/ui/JavaSelector.vue'
import { convertFileSrc } from '@tauri-apps/api/tauri'
import { open } from '@tauri-apps/api/dialog'
import { get_loader_versions } from '@/helpers/metadata.js'
import { get_game_versions, get_loaders } from '@/helpers/tags.js'
import { handleError } from '@/store/notifications.js'
import { mixpanel_track } from '@/helpers/mixpanel'
import { useTheming } from '@/store/theme.js'
import { useBreadcrumbs } from '@/store/breadcrumbs'
import ModpackVersionModal from '@/components/ui/ModpackVersionModal.vue'
import { i18n } from '@/main.js';
const t = i18n.global.t;
const breadcrumbs = useBreadcrumbs()

const router = useRouter()

const props = defineProps({
  instance: {
    type: Object,
    required: true,
  },
  offline: {
    type: Boolean,
    default: false,
  },
  versions: {
    type: Array,
    required: true,
  },
})

const themeStore = useTheming()

const title = ref(props.instance.name)
const icon = ref(props.instance.icon_path)
const groups = ref(props.instance.groups)

const modpackVersionModal = ref(null)
const modal_confirm = ref(null)

const instancesList = await list()
const availableGroups = ref([
  ...new Set(
    instancesList.reduce((acc, obj) => {
      return acc.concat(obj.groups)
    }, []),
  ),
])

async function resetIcon() {
  icon.value = null
  await edit_icon(props.instance.path, null).catch(handleError)
  mixpanel_track('InstanceRemoveIcon')
}

async function setIcon() {
  const value = await open({
    multiple: false,
    filters: [
      {
        name: 'Image',
        extensions: ['png', 'jpeg', 'svg', 'webp', 'gif', 'jpg'],
      },
    ],
  })

  if (!value) return

  icon.value = value
  await edit_icon(props.instance.path, icon.value).catch(handleError)

  mixpanel_track('InstanceSetIcon')
}

const globalSettings = await get().catch(handleError)

const modalConfirmUnlock = ref(null)
const modalConfirmUnpair = ref(null)

const overrideJavaInstall = ref(!!props.instance.java_path)
const optimalJava = readonly(await get_optimal_jre_key(props.instance.path).catch(handleError))
const javaInstall = ref({ path: optimalJava.path ?? props.instance.java_path })

const overrideJavaArgs = ref(!!props.instance.extra_launch_args)
const javaArgs = ref(
  (props.instance.extra_launch_args ?? globalSettings.extra_launch_args).join(' '),
)

const overrideEnvVars = ref(!!props.instance.custom_env_vars)
const envVars = ref(
  (props.instance.custom_env_vars ?? globalSettings.custom_env_vars)
    .map((x) => x.join('='))
    .join(' '),
)

const overrideMemorySettings = ref(!!props.instance.memory)
const memory = ref(props.instance.memory ?? globalSettings.memory)
const maxMemory = Math.floor((await get_max_memory().catch(handleError)) / 1024)

const overrideWindowSettings = ref(
  !!props.instance.game_resolution || !!props.instance.force_fullscreen,
)
const resolution = ref(props.instance.game_resolution ?? globalSettings.game_resolution)
const overrideHooks = ref(
  props.instance.hooks.pre_launch || props.instance.hooks.wrapper || props.instance.hooks.post_exit,
)
const hooks = ref(props.instance.hooks ?? globalSettings.hooks)

const fullscreenSetting = ref(!!props.instance.force_fullscreen)

const unlinkModpack = ref(false)

const inProgress = ref(false)
const installing = computed(() => props.instance.install_stage !== 'installed')
const installedVersion = computed(() => props.instance?.linked_data?.version_id)
const installedVersionData = computed(() => {
  if (!installedVersion.value) return null
  return props.versions.find((version) => version.id === installedVersion.value)
})

watch(
  [
    title,
    groups,
    groups,
    overrideJavaInstall,
    javaInstall,
    overrideJavaArgs,
    javaArgs,
    overrideEnvVars,
    envVars,
    overrideMemorySettings,
    memory,
    overrideWindowSettings,
    resolution,
    fullscreenSetting,
    overrideHooks,
    hooks,
    unlinkModpack,
  ],
  async () => {
    await edit(props.instance.path, editProfileObject.value)
  },
  { deep: true },
)

const getLocalVersion = (path) => {
  const pathSlice = path.split(' ').slice(-1).toString()
  // If the path ends in (1), (2), etc. it's a duplicate instance and no version can be obtained.
  if (/^\(\d\)/.test(pathSlice)) {
    return 'Unknown'
  }
  return pathSlice
}

const editProfileObject = computed(() => {
  const editProfile = {
    name: title.value.trim().substring(0, 32) ?? 'Instance',
    groups: groups.value.map((x) => x.trim().substring(0, 32)).filter((x) => x.length > 0),
    loader_version: props.instance.loader_version,
    linked_data: props.instance.linked_data,
    java: {},
    hooks: {},
  }

  if (overrideJavaInstall.value) {
    if (javaInstall.value.path !== '') {
      editProfile.java_path = javaInstall.value.path.replace('java.exe', 'javaw.exe')
    }
  }

  if (overrideJavaArgs.value) {
    if (javaArgs.value !== '') {
      editProfile.extra_launch_args = javaArgs.value.trim().split(/\s+/).filter(Boolean)
    }
  }

  if (overrideEnvVars.value) {
    if (envVars.value !== '') {
      editProfile.custom_env_vars = envVars.value
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((x) => x.split('=').filter(Boolean))
    }
  }

  if (overrideMemorySettings.value) {
    editProfile.memory = memory.value
  }

  if (overrideWindowSettings.value) {
    editProfile.force_fullscreen = fullscreenSetting.value

    if (!fullscreenSetting.value) {
      editProfile.game_resolution = resolution.value
    }
  }

  if (overrideHooks.value) {
    editProfile.hooks = hooks.value
  }

  if (unlinkModpack.value) {
    editProfile.linked_data = null
  }

  breadcrumbs.setName('Instance', editProfile.name)

  return editProfile
})

const repairing = ref(false)

async function duplicateProfile() {
  await duplicate(props.instance.path).catch(handleError)
  mixpanel_track('InstanceDuplicate', {
    loader: props.instance.loader,
    game_version: props.instance.game_version,
  })
}

async function repairProfile(force) {
  repairing.value = true
  await install(props.instance.path, force).catch(handleError)
  repairing.value = false

  mixpanel_track('InstanceRepair', {
    loader: props.instance.loader,
    game_version: props.instance.game_version,
  })
}

async function unpairProfile() {
  const editProfile = props.instance
  editProfile.linked_data = null
  await edit(props.instance.path, editProfile)
  installedVersion.value = null
  installedVersionData.value = null
  modalConfirmUnpair.value.hide()
}

async function unlockProfile() {
  const editProfile = props.instance
  editProfile.linked_data.locked = false
  await edit(props.instance.path, editProfile)
  modalConfirmUnlock.value.hide()
}

const isPackLocked = computed(() => {
  return props.instance.linked_data && props.instance.linked_data.locked
})

async function repairModpack() {
  inProgress.value = true
  await update_repair_modrinth(props.instance.path).catch(handleError)
  inProgress.value = false

  mixpanel_track('InstanceRepair', {
    loader: props.instance.loader,
    game_version: props.instance.game_version,
  })
}

const removing = ref(false)
async function removeProfile() {
  removing.value = true
  await remove(props.instance.path).catch(handleError)
  removing.value = false

  mixpanel_track('InstanceRemove', {
    loader: props.instance.loader,
    game_version: props.instance.game_version,
  })

  await router.push({ path: '/' })
}

const changeVersionsModal = ref(null)
const showSnapshots = ref(false)

const [
  fabric_versions,
  forge_versions,
  quilt_versions,
  neoforge_versions,
  all_game_versions,
  loaders,
] = await Promise.all([
  get_loader_versions('fabric').then(shallowRef).catch(handleError),
  get_loader_versions('forge').then(shallowRef).catch(handleError),
  get_loader_versions('quilt').then(shallowRef).catch(handleError),
  get_loader_versions('neo').then(shallowRef).catch(handleError),
  get_game_versions().then(shallowRef).catch(handleError),
  get_loaders()
    .then((value) =>
      value
        .filter((item) => item.supported_project_types.includes('modpack'))
        .map((item) => item.name.toLowerCase()),
    )
    .then(ref)
    .catch(handleError),
])
loaders.value.unshift('vanilla')

const loader = ref(props.instance.loader)
const gameVersion = ref(props.instance.game_version)
const selectableGameVersions = computed(() => {
  return all_game_versions.value
    .filter((item) => {
      let defaultVal = item.version_type === 'release' || showSnapshots.value
      if (loader.value === 'fabric') {
        defaultVal &= fabric_versions.value.gameVersions.some((x) => item.version === x.id)
      } else if (loader.value === 'forge') {
        defaultVal &= forge_versions.value.gameVersions.some((x) => item.version === x.id)
      } else if (loader.value === 'quilt') {
        defaultVal &= quilt_versions.value.gameVersions.some((x) => item.version === x.id)
      } else if (loader.value === 'neoforge') {
        defaultVal &= neoforge_versions.value.gameVersions.some((x) => item.version === x.id)
      }

      return defaultVal
    })
    .map((item) => item.version)
})

const selectableLoaderVersions = computed(() => {
  if (gameVersion.value) {
    if (loader.value === 'fabric') {
      return fabric_versions.value.gameVersions[0].loaders
    } else if (loader.value === 'forge') {
      return forge_versions.value.gameVersions.find((item) => item.id === gameVersion.value).loaders
    } else if (loader.value === 'quilt') {
      return quilt_versions.value.gameVersions[0].loaders
    } else if (loader.value === 'neoforge') {
      return neoforge_versions.value.gameVersions.find((item) => item.id === gameVersion.value)
        .loaders
    }
  }
  return []
})
const loaderVersionIndex = ref(
  selectableLoaderVersions.value.findIndex((x) => x.id === props.instance.loader_version),
)

const isValid = computed(() => {
  return (
    selectableGameVersions.value.includes(gameVersion.value) &&
    (loaderVersionIndex.value >= 0 || loader.value === 'vanilla')
  )
})

const isChanged = computed(() => {
  return (
    loader.value !== props.instance.loader ||
    gameVersion.value !== props.instance.game_version ||
    selectableLoaderVersions.value[loaderVersionIndex.value].id !== props.instance.loader_version
  )
})

watch(loader, () => (loaderVersionIndex.value = 0))

const editing = ref(false)
async function saveGvLoaderEdits() {
  editing.value = true

  let editProfile = editProfileObject.value
  editProfile.loader = loader.value
  editProfile.game_version = gameVersion.value

  if (loader.value !== 'vanilla') {
    editProfile.loader_version = selectableLoaderVersions.value[loaderVersionIndex.value].id
  }
  await edit(props.instance.path, editProfile).catch(handleError)
  await repairProfile(false)

  editing.value = false
  changeVersionsModal.value.hide()
}
</script>

<style scoped lang="scss">
.change-versions-modal {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  gap: 1rem;

  :deep(.animated-dropdown .options) {
    max-height: 13.375rem;
  }

  .input-label {
    font-size: 1rem;
    font-weight: bolder;
    color: var(--color-contrast);
    margin-bottom: 0.5rem;
  }

  .versions {
    display: flex;
    flex-direction: row;
    gap: 1rem;
  }
}

.settings-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 1rem 0;

  h3 {
    margin: 0;
  }
}

.installation-input {
  width: 100%;
}

:deep(button.checkbox) {
  border: none;
}

.unlocked-instance {
  background-color: var(--color-bg);
}

.modal-delete {
  padding: var(--gap-lg);
  display: flex;
  flex-direction: column;

  .markdown-body {
    margin-bottom: 1rem;
  }

  .confirmation-label {
    margin-bottom: 0.5rem;
  }

  .confirmation-text {
    padding-right: 0.25ch;
    margin: 0 0.25rem;
  }

  .confirmation-input {
    input {
      width: 20rem;
      max-width: 100%;
    }
  }

  .button-group {
    margin-left: auto;
    margin-top: 1.5rem;
  }
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: var(--gap-lg);

  .button-group {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }

  strong {
    color: var(--color-contrast);
  }
}
</style>
