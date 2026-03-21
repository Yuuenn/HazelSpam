import { defineStore } from 'pinia'
import { reactive, watch } from 'vue'
import _ from 'lodash'
import { MenuIndex, UiConfig } from '@/types'
import Storage from '@/utils/storage'

export const useUIStore = defineStore('ui', () => {
    const uiConfig: UiConfig = reactive(Storage.getUiConfig())

    const updateMenuValue = (key: MenuIndex) => {
        uiConfig.activeMenuIndex = key
    }

    watch(
        uiConfig,
        _.debounce((newUiConfig: UiConfig) => Storage.setUiConfig(newUiConfig), 350)
    )

    return {
        uiConfig,
        updateMenuValue
    }
})
