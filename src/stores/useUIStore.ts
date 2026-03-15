import { defineStore } from 'pinia'
import { reactive, ref, watch } from 'vue'
import _ from 'lodash'
import { MenuIndex, UiConfig } from '@/types'
import Storage from '@/utils/storage'

const DEBUG_MODULE_REVEAL_CLICK_TARGET = 22

export const useUIStore = defineStore('ui', () => {
    const uiConfig: UiConfig = reactive(Storage.getUiConfig())
    const isSettingDebugModuleVisible = ref(false)
    const settingDebugRevealProgress = ref(0)

    const updateMenuValue = (key: MenuIndex) => {
        uiConfig.activeMenuIndex = key
    }

    const registerRailBrandClick = () => {
        if (isSettingDebugModuleVisible.value) return

        settingDebugRevealProgress.value += 1

        if (settingDebugRevealProgress.value < DEBUG_MODULE_REVEAL_CLICK_TARGET) {
            return
        }

        isSettingDebugModuleVisible.value = true
        settingDebugRevealProgress.value = DEBUG_MODULE_REVEAL_CLICK_TARGET
        uiConfig.activeMenuIndex = 'SettingView'
    }

    watch(
        uiConfig,
        _.debounce((newUiConfig: UiConfig) => Storage.setUiConfig(newUiConfig), 350)
    )

    return {
        uiConfig,
        updateMenuValue,
        isSettingDebugModuleVisible,
        registerRailBrandClick
    }
})
