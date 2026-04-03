import { defineStore } from 'pinia'
import { reactive, watch } from 'vue'
import _ from 'lodash'
import mitt from 'mitt'
import type BaseModule from '@/modules/BaseModule'
import { appModuleConstructors } from '@/modules'
import { startupModuleConstructors } from '@/modules/default'
import { ModuleConfig, ModuleEventMap } from '@/types'
import Storage from '@/utils/storage'
import Logger from '@/utils/logger'

type ModuleConstructor = new (moduleName?: string) => BaseModule

export const useModuleStore = defineStore('modules', () => {
    const moduleConfig: ModuleConfig = reactive(Storage.getModuleConfig())
    const emitter = mitt<ModuleEventMap>()

    function runModuleConstructors(
        moduleConstructors: readonly ModuleConstructor[]
    ): Promise<void[]> {
        return Promise.all(moduleConstructors.map((ModuleCtor) => new ModuleCtor().run()))
    }

    function loadStartupModules(): Promise<void[]> {
        return runModuleConstructors(startupModuleConstructors)
    }

    function loadAppModules(): Promise<void[]> {
        return runModuleConstructors(appModuleConstructors)
    }

    async function loadModules(): Promise<void> {
        const logger = new Logger('LoadModules')
        let errorCount = 0
        let retryCount = 0
        const maxRetries = 2
        const retryDelay = 2000

        while (retryCount <= maxRetries) {
            try {
                await loadStartupModules()
                break
            } catch (error) {
                logger.warn(`重试次数: ${retryCount + 1}`, error)
                errorCount++
                retryCount++
                if (retryCount <= maxRetries) {
                    await new Promise((resolve) => setTimeout(resolve, retryDelay))
                } else {
                    logger.error('达到最大重试次数，终止运行')
                    break
                }
            }
        }

        if (errorCount <= maxRetries) {
            try {
                await loadAppModules()
            } catch (error) {
                logger.error('加载模块出错', error)
            }
        }
    }

    const persistTextSpamConfig = _.debounce(
        (textSpamConfig: ModuleConfig['textSpam']) =>
            Storage.setModuleConfigSection('textSpam', textSpamConfig),
        350
    )
    const persistEmotionSpamConfig = _.debounce(
        (emotionSpamConfig: ModuleConfig['emotionSpam']) =>
            Storage.setModuleConfigSection('emotionSpam', emotionSpamConfig),
        350
    )
    const persistSettingModulesConfig = _.debounce(
        (settingModulesConfig: ModuleConfig['settings']) =>
            Storage.setModuleConfigSection('settings', settingModulesConfig),
        350
    )

    watch(
        () => moduleConfig.textSpam,
        (textSpamConfig) => persistTextSpamConfig(textSpamConfig),
        { deep: true }
    )
    watch(
        () => moduleConfig.emotionSpam,
        (emotionSpamConfig) => persistEmotionSpamConfig(emotionSpamConfig),
        { deep: true }
    )
    watch(
        () => moduleConfig.settings,
        (settingModulesConfig) => persistSettingModulesConfig(settingModulesConfig),
        { deep: true }
    )

    return { moduleConfig, loadModules, emitter }
})
