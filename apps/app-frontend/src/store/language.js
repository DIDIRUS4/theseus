import { defineStore } from 'pinia'
import { i18n } from '@/main.js'

const rewriteString = (string) => string.toLowerCase()

export const useLanguage = defineStore('languageStore', {
  state: () => ({
    languageOptions: ['russian', 'english'],
    selectedLanguage: 'english',
  }),
  actions: {
    setLanguageState(newLanguage) {
      if (!this.languageOptions.includes(rewriteString(newLanguage))) {
        throw new Error('Selected language is not present. Check languageOptions.')
      }

      this.selectedLanguage = rewriteString(newLanguage)
      this.setLanguageClass()
    },
    setLanguageClass() {
      i18n.global.locale = this.selectedLanguage
    },
    setupWatcher() {
      this.$watch(
        () => i18n.global.locale,
        (newLanguage) => {
          console.log('Language changed globally and rewritted in settings:', newLanguage)
        },
      )
    },
  },
  onInit() {
    this.setupWatcher()
  },
})
