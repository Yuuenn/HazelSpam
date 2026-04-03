import { computed } from 'vue'
import { useSpamTaskRunner } from '@/composables/useSpamTaskRunner'
import { useModuleStore } from '@/stores/useModuleStore'
import { useUIStore } from '@/stores/useUIStore'

export const useEmotionSpamForm = () => {
    const moduleStore = useModuleStore()
    const uiStore = useUIStore()
    const { isAnySpamRunning, startSpamTask, stopAllSpamTasks } = useSpamTaskRunner()

    const isEmotionSpamRunning = computed(() => moduleStore.moduleConfig.emotionSpam.enable)

    const activeIntervalSeconds = computed({
        get: () => moduleStore.moduleConfig.emotionSpam.timeInterval,
        set: (value: number | null) => {
            if (value === null) return
            // Keep both spam modules aligned so users can switch views without surprise timing drift.
            if (moduleStore.moduleConfig.textSpam.timeInterval !== value) {
                moduleStore.moduleConfig.textSpam.timeInterval = value
            }
            if (moduleStore.moduleConfig.textSpam.tabTimeInterval !== value) {
                moduleStore.moduleConfig.textSpam.tabTimeInterval = value
            }
            if (moduleStore.moduleConfig.emotionSpam.timeInterval !== value) {
                moduleStore.moduleConfig.emotionSpam.timeInterval = value
            }
        }
    })

    const isRandomOrderEnabled = computed({
        get: () => !moduleStore.moduleConfig.emotionSpam.sequentialMode,
        set: (value: boolean) => {
            if (moduleStore.moduleConfig.emotionSpam.sequentialMode === !value) return
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
                if (moduleStore.moduleConfig.emotionSpam.timeLimit === 0) return
                moduleStore.moduleConfig.emotionSpam.timeLimit = 0
            }
        }
    })

    const timeLimitSeconds = computed({
        get: () => moduleStore.moduleConfig.emotionSpam.timeLimit,
        set: (value: number | null) => {
            if (value === null) return
            if (moduleStore.moduleConfig.emotionSpam.timeLimit === value) return
            moduleStore.moduleConfig.emotionSpam.timeLimit = value
        }
    })

    const closePanel = () => {
        uiStore.uiConfig.isShowPanel = false
    }

    const handleStartSpam = () => {
        const started = startSpamTask('emotionSpam')
        if (!started) return
        closePanel()
    }

    const handleStopSpam = () => {
        stopAllSpamTasks()
    }

    return {
        isEmotionSpamRunning,
        isAnySpamRunning,
        activeIntervalSeconds,
        isRandomOrderEnabled,
        autoStopEnabled,
        timeLimitSeconds,
        closePanel,
        handleStartSpam,
        handleStopSpam
    }
}
