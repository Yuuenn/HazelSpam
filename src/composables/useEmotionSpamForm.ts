import { computed } from 'vue'
import { useSpamTaskRunner } from '@/composables/useSpamTaskRunner'
import { useModuleStore } from '@/stores/useModuleStore'
import { useUIStore } from '@/stores/useUIStore'

export const useEmotionSpamForm = () => {
    const moduleStore = useModuleStore()
    const uiStore = useUIStore()
    const { isAnySpamRunning, startTask, stopAllTasks } = useSpamTaskRunner()

    const isEmotionSpamRunning = computed(() => moduleStore.moduleConfig.emotionSpam.enable)

    const activeIntervalSeconds = computed({
        get: () => moduleStore.moduleConfig.emotionSpam.timeInterval,
        set: (value: number | null) => {
            if (value === null) return
            moduleStore.moduleConfig.textSpam.timeInterval = value
            moduleStore.moduleConfig.textSpam.tabTimeInterval = value
            moduleStore.moduleConfig.emotionSpam.timeInterval = value
        }
    })

    const randomSendMode = computed({
        get: () => !moduleStore.moduleConfig.emotionSpam.sequentialMode,
        set: (value: boolean) => {
            moduleStore.moduleConfig.emotionSpam.sequentialMode = !value
        }
    })

    const autoStopEnabled = computed({
        get: () => moduleStore.moduleConfig.emotionSpam.timeLimit > 0,
        set: (value: boolean) => {
            if (value) {
                if (moduleStore.moduleConfig.emotionSpam.timeLimit <= 0) {
                    moduleStore.moduleConfig.emotionSpam.timeLimit = 60
                }
            } else {
                moduleStore.moduleConfig.emotionSpam.timeLimit = 0
            }
        }
    })

    const timeLimitSeconds = computed({
        get: () => moduleStore.moduleConfig.emotionSpam.timeLimit,
        set: (value: number | null) => {
            if (value === null) return
            moduleStore.moduleConfig.emotionSpam.timeLimit = value
        }
    })

    const closePanel = () => {
        uiStore.uiConfig.isShowPanel = false
    }

    const handleStartSpam = () => {
        const started = startTask('emotionSpam')
        if (!started) return
        closePanel()
    }

    const handleStopSpam = () => {
        stopAllTasks()
    }

    return {
        isEmotionSpamRunning,
        isAnySpamRunning,
        activeIntervalSeconds,
        randomSendMode,
        autoStopEnabled,
        timeLimitSeconds,
        closePanel,
        handleStartSpam,
        handleStopSpam
    }
}
