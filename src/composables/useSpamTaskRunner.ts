import { computed } from 'vue'
import EmotionSpamModule from '@/modules/spam/emotionSpamModule'
import TextSpamModule from '@/modules/spam/textSpamModule'
import { useModuleStore } from '@/stores/useModuleStore'
import type { SpamTaskKey } from '@/types'

const spamTaskKeys: SpamTaskKey[] = ['textSpam', 'emotionSpam']

export const useSpamTaskRunner = () => {
    const moduleStore = useModuleStore()
    const textSpamModule = new TextSpamModule('StopTextSpam')
    const emotionSpamModule = new EmotionSpamModule('StopEmotionSpam')

    const isAnySpamRunning = computed(
        () =>
            moduleStore.moduleConfig.textSpam.enable || moduleStore.moduleConfig.emotionSpam.enable
    )

    const startSpamTask = (task: SpamTaskKey): boolean => {
        if (isAnySpamRunning.value) {
            return false
        }

        spamTaskKeys.forEach((key) => {
            moduleStore.moduleConfig[key].enable = key === task
        })

        moduleStore.moduleConfig.settings.saveSpamStatus.lastTask = task
        moduleStore.emitter.emit(task, { module: task })
        return true
    }

    const stopAllSpamTasks = () => {
        if (moduleStore.moduleConfig.textSpam.enable) {
            textSpamModule.stop()
        }
        if (moduleStore.moduleConfig.emotionSpam.enable) {
            emotionSpamModule.stop()
        }
    }

    // Backward-compat aliases for existing call sites.
    const startTask = startSpamTask
    const stopAllTasks = stopAllSpamTasks

    return {
        isAnySpamRunning,
        startSpamTask,
        stopAllSpamTasks,
        startTask,
        stopAllTasks
    }
}
