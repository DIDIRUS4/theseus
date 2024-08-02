<template>
  <Button v-if="mode !== 'isolated'" v-tooltip.right="t('AccountsCard.MinecraftAccounts')"
    class="btn btn-transparent collapsed-button" @click="showCard = !showCard">
    <Avatar size="xl" class="collapsed-button__icon" :src="selectedAccount
      ? `https://mc-heads.net/avatar/${selectedAccount.username}/128x128`
      : 'https://launcher-files.modrinth.com/assets/steve_head.png'
      " />
    <span class="collapsed-button__label">{{ t('AccountsCard.MinecraftAccounts') }}</span>
  </Button>
  <transition name="fade">
    <Card v-if="showCard || mode === 'isolated'" ref="card" class="account-card"
      :class="{ expanded: mode === 'expanded', isolated: mode === 'isolated' }">
      <div v-if="selectedAccount" class="selected account">
        <Avatar size="xs" :src="`https://mc-heads.net/avatar/${selectedAccount.username}/128x128`" />
        <div>
          <h4 class="account-type">{{ selectedAccount.username }}
            <component :is="printAccountType(selectedAccount)" class="account-type" />
          </h4>
          <p>{{ t('AccountsCard.Active') }}</p>
        </div>
        <Button v-tooltip="t('AccountsCard.Logout')" class="trash-icon-selected-fix" icon-only color="raised"
          @click="logout(selectedAccount.id)">
          <TrashIcon />
        </Button>
      </div>
      <div v-else-if="!selectedAccount && displayAccounts.length > 0" class="logged-out no-account">
        <h4>{{ t('AccountsCard.NoSelected') }}</h4>
      </div>
      <div v-else class="logged-out no-account">
        <h4>{{ t('AccountsCard.NoAccount') }}</h4>
        <div class="account-no-account-fix">
          <Button v-tooltip="t('AccountsCard.LoginLicense')" icon-only color="secondary" @click="login()">
            <Microsoft class="account-type-no-account" />
          </Button>
          <Button v-tooltip="t('AccountsCard.LoginOffline')" icon-only color="secondary" @click="loginOffline()">
            <Pirate class="account-type-no-account" />
          </Button>
        </div>
      </div>

      <div v-if="displayAccounts.length > 0" class="account-group">
        <div v-for="account in displayAccounts" :key="account.id" class="account-row">
          <Button class="option account" @click="setAccount(account)">
            <Avatar :src="`https://mc-heads.net/avatar/${account.username}/128x128`" class="icon" />
            <p class="account-type">{{ account.username }}
              <component :is="printAccountType(account)" class="account-type" />
            </p>
          </Button>
          <Button v-tooltip="t('AccountsCard.Logout')" class="account-buttons-fix" icon-only
            @click="logout(account.id)">
            <TrashIcon />
          </Button>
        </div>
      </div>
      <div v-if="accounts.length > 0" class="logged-out account-fix account">
        <Button @click="login()">
          <Microsoft />
          {{ t('AccountsCard.License') }}
        </Button>
        <Button @click="loginOffline()">
          <Pirate />
          {{ t('AccountsCard.Pirate') }}
        </Button>
      </div>
    </Card>
  </transition>
  <Modal ref="loginOfflineModal" class="modal" :header="t('AccountsCard.AuthOffline')">
    <div class="modal-body">
      <div class="label">{{ t('AccountsCard.Username') }}</div>
      <input type="text" v-model="playerName" :placeholder="t('AccountsCard.UsernamePl')" />
      <Button v-tooltip="t('AccountsCard.Add')" icon-only color="secondary" @click="tryLoginOffline()">
        <PlusIcon />
      </Button>
    </div>
  </Modal>
  <Modal ref="loginErrorModal" class="modal" :header="t('AccountsCard.InputError')">
    <div class="modal-body">
      <div class="label">{{ t('AccountsCard.TryAgainError') }}</div>
      <Button color="primary" @click="tryAgainLoginOffline()">
        {{ t('AccountsCard.TryAgain') }}
      </Button>
    </div>
  </Modal>
  <Modal ref="unexpectedErrorModal" class="modal" header="Ошибка">
    <div class="modal-body">
      <div class="label">{{ t('AccountsCard.UnexpectedError') }}</div>
    </div>
  </Modal>
</template>

<script setup>
import { PlusIcon, TrashIcon } from '@modrinth/assets'
import { Avatar, Button, Card, Modal } from '@modrinth/ui'
import { ref, computed, onMounted, onBeforeUnmount, onUnmounted } from 'vue'

import {
  offline_authenticate_await_completion,
  login as login_flow,
  remove_user,
  get_default_user,
  set_default_user,
  users
} from '@/helpers/auth'
import { i18n } from '@/main.js'
import { handleError } from '@/store/state.js'
import { mixpanel_track } from '@/helpers/mixpanel'
import { process_listener } from '@/helpers/events'
import { Pirate, Microsoft } from '@/assets/render/index.js'
import { handleSevereError } from '@/store/error.js'

const t = i18n.global.t

defineProps({
  mode: {
    type: String,
    required: true,
    default: 'normal'
  }
})


const emit = defineEmits(['change'])

const accounts = ref([])
const loginOfflineModal = ref(null)
const loginErrorModal = ref(null)
const unexpectedErrorModal = ref(null)
const playerName = ref('')
const defaultUser = ref(null)

async function refreshValues() {
  defaultUser.value = await get_default_user().catch(handleError)
  accounts.value = await users().catch(handleError)
}

defineExpose({
  refreshValues
})
await refreshValues()

const displayAccounts = computed(() =>
  accounts.value.filter((account) => defaultUser.value !== account.id),
)

const selectedAccount = computed(() =>
  accounts.value.find((account) => account.id === defaultUser.value),
)

async function setAccount(account) {
  defaultUser.value = account.id
  await set_default_user(account.id).catch(handleError)
  emit('change')
}

function printAccountType(account) {
  if (account.access_token == 'null') {
    return Pirate
  } else {
    return Microsoft
  }
}

async function login() {
  const loggedIn = await login_flow().catch(handleSevereError)

  if (loggedIn) {
    await setAccount(loggedIn)
    await refreshValues()
  }

  mixpanel_track('AccountLogIn')
}


async function loginOffline() {
  loginOfflineModal.value.show()
}


async function tryLoginOffline() { // By AstralRinth
  let name = playerName.value
  if (name.length > 1 && name.length < 20 && name !== '') {
    const loggedIn = await offline_authenticate_await_completion(name).catch(handleError)
    loginOfflineModal.value.hide()
    if (loggedIn) {
      await setAccount(loggedIn)
      await refreshValues()
    } else {
      unexpectedErrorModal.value.show()
    }
    playerName.value = ''
    mixpanel_track('AccountLogIn')
  } else {
    playerName.value = ''
    loginOfflineModal.value.hide()
    loginErrorModal.value.show()
  }
}

function tryAgainLoginOffline() {
  loginErrorModal.value.hide()
  loginOffline()
}


const logout = async (id) => {
  await remove_user(id).catch(handleError)
  await refreshValues()
  if (!selectedAccount.value && accounts.value.length > 0) {
    await setAccount(accounts.value[0])
    await refreshValues()
  } else {
    emit('change')
  }
  mixpanel_track('AccountLogOut')
}

let showCard = ref(false)
let card = ref(null)
let button = ref(null)
const handleClickOutside = (event) => {
  const elements = document.elementsFromPoint(event.clientX, event.clientY)
  if (
    card.value &&
    card.value.$el !== event.target &&
    !elements.includes(card.value.$el) &&
    button.value &&
    !button.value.contains(event.target)
  ) {
    showCard.value = false
  }
}

const unlisten = await process_listener(async (e) => {
  if (e.event === 'launched') {
    await refreshValues()
  }
})

onMounted(() => {
  window.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  unlisten()
})
</script>

<style scoped lang="scss">
.selected {
  background: var(--color-brand-highlight);
  border-radius: var(--radius-lg);
  color: var(--color-contrast);
  //margin-right: 0.5rem;
  gap: 1rem;
}

.logged-out {
  background: var(--color-bg);
  border-radius: var(--radius-lg);
  gap: 0.5rem;
}

.account {
  width: auto;
  display: flex;
  align-items: center;
  text-align: left;
  padding: 0.5rem;

  h4,
  p {
    margin: 0;
  }
}

.no-account {
  width: 20rem;
  display: flex;
  align-items: center;
  text-align: left;
  padding: 0.5rem;

  h4,
  p {
    margin: 0;
  }
}

.account-type {
  display: inline-flex;
  margin-left: 0.3rem;
}

.account-type-no-account {
  display: inline-flex;
  margin-left: auto;
}

.account-fix {
  width: auto;
  margin: auto;
}

.account-no-account-fix {
  width: max-content;
  gap: 0.5rem;
  display: flex;
  margin-left: auto;
}

.account-buttons-fix {
  //margin: auto;
  display: flex;
  //gap: 2rem
}

.trash-icon-selected-fix {
  display: flex;
  margin-left: auto;
}

.account-card {
  width: min-content; // Change this percent value for rescale AccountsCard.vue window
  position: initial;
  display: flex;
  flex-direction: column;
  top: 0.5rem;
  left: auto;
  margin-top: inherit;
  z-index: 11;
  gap: 0.5rem;
  padding: 1rem;
  border: 1px solid var(--color-button-bg);
  user-select: none;
  -ms-user-select: none;
  -webkit-user-select: none;
  max-height: 40vh;
  overflow-y: auto;

  &::-webkit-scrollbar-track {
    border-top-right-radius: 1rem;
    border-bottom-right-radius: 1rem;
  }

  &::-webkit-scrollbar {
    border-top-right-radius: 1rem;
    border-bottom-right-radius: 1rem;
  }

  &.hidden {
    display: none;
  }

  &.expanded {
    left: 13.5rem;
  }

  &.isolated {
    position: relative;
    left: 0;
    top: 0;
  }
}

.accounts-title {
  font-size: 1.2rem;
  font-weight: bolder;
}

.account-group {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.option {
  // TODO: Check it later
  //width: calc(100% - 2.25rem);
  background: var(--color-raised-bg);
  color: var(--color-base);
  box-shadow: none;

  img {
    margin-right: 0.5rem;
  }
}

.icon {
  --size: 1.5rem !important;
}

.account-row {
  display: flex;
  flex-direction: row;
  gap: 0.25rem;
  vertical-align: center;
  justify-content: space-between;
  padding-right: 0.5rem;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.avatar-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-base);
  background-color: var(--color-raised-bg);
  border-radius: var(--radius-md);
  width: 100%;
  text-align: left;

  &.expanded {
    border: 1px solid var(--color-button-bg);
    padding: 1rem;
  }
}

.avatar-text {
  margin: auto 0 auto 0.25rem;
  display: flex;
  flex-direction: column;
}

.text {
  width: 6rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.accounts-text {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin: 0;
}

.qr-code {
  background-color: white !important;
  border-radius: var(--radius-md);
}

.modal-body {
  display: flex;
  flex-direction: row;
  gap: var(--gap-lg);
  align-items: center;
  padding: var(--gap-xl);

  .modal-text {
    display: flex;
    flex-direction: column;
    gap: var(--gap-sm);
    width: 100%;

    h2,
    p {
      margin: 0;
    }

    .code-text {
      display: flex;
      flex-direction: row;
      gap: var(--gap-xs);
      align-items: center;

      .code {
        background-color: var(--color-bg);
        border-radius: var(--radius-md);
        border: solid 1px var(--color-button-bg);
        font-family: var(--mono-font);
        letter-spacing: var(--gap-md);
        color: var(--color-contrast);
        font-size: 2rem;
        font-weight: bold;
        padding: var(--gap-sm) 0 var(--gap-sm) var(--gap-md);
      }

      .btn {
        width: 2.5rem;
        height: 2.5rem;
      }
    }
  }
}

.button-row {
  display: flex;
  flex-direction: row;
}

.modal {
  position: absolute;
}

.code {
  color: var(--color-brand);
  padding: 0.05rem 0.1rem;
  // row not column
  display: flex;

  .card {
    background: var(--color-base);
    color: var(--color-contrast);
    padding: 0.5rem 1rem;
  }
}
</style>
