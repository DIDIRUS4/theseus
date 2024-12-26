<template>
  <div
    v-if="mode !== 'isolated'"
    ref="button"
    class="button-base mt-2 px-3 py-2 bg-button-bg rounded-xl flex items-center gap-2"
    :class="{ expanded: mode === 'expanded' }"
    @click="toggleMenu"
  >
    <Avatar
      size="36px"
      :src="
        selectedAccount
          ? `https://mc-heads.net/avatar/${selectedAccount.id}/128`
          : 'https://launcher-files.modrinth.com/assets/steve_head.png'
      "
    />
    <div class="flex flex-col w-full">
      <span>
        <component v-if="selectedAccount" :is="getAccountType(selectedAccount)" class="vector-icon" />
        {{ selectedAccount ? selectedAccount.username : 'Select account' }}
      </span>
      <span class="text-secondary text-xs">Minecraft account</span>
    </div>
    <DropdownIcon class="w-5 h-5 shrink-0" />
  </div>
  <transition name="fade">
    <Card v-if="showCard || mode === 'isolated'" ref="card" class="account-card"
      :class="{ expanded: mode === 'expanded', isolated: mode === 'isolated' }">
      <div v-if="selectedAccount" class="selected account">
        <Avatar size="xs" :src="`https://mc-heads.net/avatar/${selectedAccount.username}/128`" />
        <div>
          <h4>
            <component :is="getAccountType(selectedAccount)" class="vector-icon" /> {{ selectedAccount.username }}
          </h4>
          <p>Selected</p>
        </div>
        <Button v-tooltip="'Log out'" icon-only color="raised" @click="logout(selectedAccount.id)">
          <TrashIcon />
        </Button>
      </div>
      <div v-else class="login-section account">
        <h4>Not signed in</h4>
        <Button v-tooltip="'Log in'" icon-only @click="login()">
          <MicrosoftIcon />
        </Button>
        <Button v-tooltip="'Add offline'" icon-only @click="tryOfflineLogin()">
          <PirateIcon />
        </Button>
      </div>
      <div v-if="displayAccounts.length > 0" class="account-group">
        <div v-for="account in displayAccounts" :key="account.id" class="account-row">
          <Button class="option account" @click="setAccount(account)">
            <Avatar :src="`https://mc-heads.net/avatar/${account.username}/128`" class="icon" />
            <p class="account-type">
              <component :is="getAccountType(account)" class="vector-icon" />
              {{ account.username }}
            </p>
          </Button>
          <Button v-tooltip="'Log out'" icon-only @click="logout(account.id)">
            <TrashIcon />
          </Button>
        </div>
      </div>
      <div v-if="accounts.length > 0" class="login-section account centered">
        <Button v-tooltip="'Log in'" icon-only @click="login()">
          <MicrosoftIcon />
        </Button>
        <Button v-tooltip="'Add offline'" icon-only @click="tryOfflineLogin()">
          <PirateIcon />
        </Button>
      </div>
    </Card>
  </transition>
  <ModalWrapper ref="loginOfflineModal" class="modal" header="Add new offline account">
    <div class="modal-body">
      <div class="label">Enter offline username</div>
      <input type="text" v-model="playerName" placeholder="Provide offline player name" />
      <Button icon-only color="secondary" @click="offlineLoginFinally()">
        Continue
      </Button>
    </div>
  </ModalWrapper>
  <ModalWrapper ref="loginErrorModal" class="modal" header="Error while proceed">
    <div class="modal-body">
      <div class="label">Error occurred while adding offline account</div>
      <Button color="primary" @click="retryOfflineLogin()">
        Try again
      </Button>
    </div>
  </ModalWrapper>
  <ModalWrapper ref="unexpectedErrorModal" class="modal" header="Ошибка">
    <div class="modal-body">
      <div class="label">Unexcepted error</div>
    </div>
  </ModalWrapper>
</template>

<script setup>
import { DropdownIcon, PlusIcon, TrashIcon, LogInIcon, PirateIcon as Offline, MicrosoftIcon as License, MicrosoftIcon, PirateIcon } from '@modrinth/assets'
import { Avatar, Button, Card } from '@modrinth/ui'
import { ref, computed, onMounted, onBeforeUnmount, onUnmounted } from 'vue'
import {
  offline_login,
  users,
  remove_user,
  set_default_user,
  login as login_flow,
  get_default_user,
} from '@/helpers/auth'
import { handleError } from '@/store/state.js'
import { trackEvent } from '@/helpers/analytics'
import { process_listener } from '@/helpers/events'
import { handleSevereError } from '@/store/error.js'
import ModalWrapper from './modal/ModalWrapper.vue'

defineProps({
  mode: {
    type: String,
    required: true,
    default: 'normal',
  },
})

const emit = defineEmits(['change'])

const accounts = ref({})
const defaultUser = ref()
const loginOfflineModal = ref(null)
const loginErrorModal = ref(null)
const unexpectedErrorModal = ref(null)
const playerName = ref('')

async function tryOfflineLogin() { // Patched
  loginOfflineModal.value.show()
}

async function offlineLoginFinally() { // Patched
  let name = playerName.value
  if (name.length > 1 && name.length < 20 && name !== '') {
    const loggedIn = await offline_login(name).catch(handleError)
    loginOfflineModal.value.hide()
    if (loggedIn) {
      await setAccount(loggedIn)
      await refreshValues()
    } else {
      unexpectedErrorModal.value.show()
    }
    playerName.value = ''
  } else {
    playerName.value = ''
    loginOfflineModal.value.hide()
    loginErrorModal.value.show()
  }
}

function retryOfflineLogin() { // Patched
  loginErrorModal.value.hide()
  tryOfflineLogin()
}

function getAccountType(account) { // Patched
  if (account.access_token != "null" && account.access_token != null && account.access_token != "") {
    return License
  } else {
    return Offline
  }
}

async function refreshValues() {
  defaultUser.value = await get_default_user().catch(handleError)
  accounts.value = await users().catch(handleError)
}
defineExpose({
  refreshValues,
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

async function login() {
  const loggedIn = await login_flow().catch(handleSevereError)

  if (loggedIn) {
    await setAccount(loggedIn)
    await refreshValues()
  }

  trackEvent('AccountLogIn')
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
  trackEvent('AccountLogOut')
}

const showCard = ref(false)
const card = ref(null)
const button = ref(null)
const handleClickOutside = (event) => {
  const elements = document.elementsFromPoint(event.clientX, event.clientY)
  if (
    card.value &&
    card.value.$el !== event.target &&
    !elements.includes(card.value.$el) &&
    !button.value.contains(event.target)
  ) {
    toggleMenu(false)
  }
}

function toggleMenu(override = true) {
  if (showCard.value || !override) {
    showCard.value = false
  } else {
    showCard.value = true
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
  gap: 1rem;
}

.login-section {
  background: var(--color-bg);
  border-radius: var(--radius-lg);
  gap: 1rem;
}


.vector-icon {
  width: 12px;
  height: 12px;
}

.account {
  width: max-content;
  display: flex;
  align-items: center;
  text-align: left;
  padding: 0.5rem 1rem;

  h4,
  p {
    margin: 0;
  }
}

.account-card {
  position: fixed;
  display: flex;
  flex-direction: column;
  margin-top: 0.5rem;
  right: 2rem;
  z-index: 11;
  gap: 0.5rem;
  padding: 1rem;
  border: 1px solid var(--color-button-bg);
  width: max-content;
  user-select: none;
  -ms-user-select: none;
  -webkit-user-select: none;
  max-height: 98vh;
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

.centered {
  display: flex;
  gap: 1rem;
  margin: auto;
}

.account-group {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.option {
  width: calc(100% - 2.25rem);
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
  gap: 0.5rem;
  vertical-align: center;
  justify-content: space-between;
  padding-right: 1rem;
}

.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.25s ease,
    translate 0.25s ease,
    scale 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  translate: 0 -2rem;
  scale: 0.9;
}

.avatar-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-base);
  background-color: var(--color-button-bg);
  border-radius: var(--radius-md);
  width: 100%;
  padding: 0.5rem 0.75rem;
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
