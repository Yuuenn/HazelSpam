import { computed, onMounted, watch, type Ref } from 'vue'
import type { TextTabPanel } from '@/types'
import { useSpamTaskRunner } from '@/composables/useSpamTaskRunner'
import { useBiliStore } from '@/stores/useBiliStore'
import { useModuleStore } from '@/stores/useModuleStore'
import { useUIStore } from '@/stores/useUIStore'
import { normalizeSubmittedText } from '@/utils/textFallback'

type UseTextSpamFormOptions = {
    activeTab: Readonly<Ref<TextTabPanel | null>>
}

export const useTextSpamForm = ({ activeTab }: UseTextSpamFormOptions) => {
    const moduleStore = useModuleStore()
    const uiStore = useUIStore()
    const biliStore = useBiliStore()
    const { isAnySpamRunning, startTask, stopAllTasks } = useSpamTaskRunner()

    const textLengthLimitMax = computed(() => Math.max(1, Number(biliStore.danmuLengthLimit || 40)))

    const combineTabs = computed({
        get: () => moduleStore.moduleConfig.textSpam.sourceMode === 'tabs',
        set: (value: boolean) => {
            if (value) {
                moduleStore.moduleConfig.textSpam.tabSplitMode =
                    moduleStore.moduleConfig.textSpam.splitMode
                moduleStore.moduleConfig.textSpam.tabTimeInterval =
                    moduleStore.moduleConfig.textSpam.timeInterval
            } else {
                moduleStore.moduleConfig.textSpam.splitMode =
                    moduleStore.moduleConfig.textSpam.tabSplitMode
                moduleStore.moduleConfig.textSpam.timeInterval =
                    moduleStore.moduleConfig.textSpam.tabTimeInterval
            }
            moduleStore.moduleConfig.textSpam.sourceMode = value ? 'tabs' : 'single'
        }
    })

    const lineBreakMode = computed({
        get: () =>
            (combineTabs.value
                ? moduleStore.moduleConfig.textSpam.tabSplitMode
                : moduleStore.moduleConfig.textSpam.splitMode) === 'byLine',
        set: (value: boolean) => {
            const splitMode = value ? 'byLine' : 'continuous'
            if (combineTabs.value) {
                moduleStore.moduleConfig.textSpam.tabSplitMode = splitMode
                return
            }
            moduleStore.moduleConfig.textSpam.splitMode = splitMode
        }
    })

    const randomSendMode = computed({
        get: () => !moduleStore.moduleConfig.textSpam.sequentialMode,
        set: (value: boolean) => {
            moduleStore.moduleConfig.textSpam.sequentialMode = !value
        }
    })

    const autoStopEnabled = computed({
        get: () => moduleStore.moduleConfig.textSpam.timeLimit > 0,
        set: (value: boolean) => {
            if (value) {
                if (moduleStore.moduleConfig.textSpam.timeLimit <= 0) {
                    moduleStore.moduleConfig.textSpam.timeLimit = 60
                }
            } else {
                moduleStore.moduleConfig.textSpam.timeLimit = 0
            }
        }
    })

    const activeIntervalSeconds = computed({
        get: () =>
            combineTabs.value
                ? moduleStore.moduleConfig.textSpam.tabTimeInterval
                : moduleStore.moduleConfig.textSpam.timeInterval,
        set: (value: number | null) => {
            if (value === null) return
            moduleStore.moduleConfig.textSpam.tabTimeInterval = value
            moduleStore.moduleConfig.textSpam.timeInterval = value
            moduleStore.moduleConfig.emotionSpam.timeInterval = value
        }
    })

    const textLengthLimit = computed({
        get: () => moduleStore.moduleConfig.textSpam.textInterval,
        set: (value: number | null) => {
            if (value === null) return
            moduleStore.moduleConfig.textSpam.textInterval = value
        }
    })

    const currentText = computed({
        get: () => activeTab.value?.msg ?? moduleStore.moduleConfig.textSpam.msg,
        set: (value: string) => {
            if (activeTab.value) {
                activeTab.value.msg = value
            }
            moduleStore.moduleConfig.textSpam.msg = value
        }
    })

    const hasUsableText = (value: unknown): value is string =>
        typeof value === 'string' && value.trim().length > 0

    const normalizeCurrentTextIfBlank = () => {
        if (hasUsableText(currentText.value)) return
        const normalized = normalizeSubmittedText(currentText.value)
        currentText.value = normalized
        moduleStore.moduleConfig.textSpam.msg = normalized
    }

    const normalizeBeforeSubmit = () => {
        const textSpam = moduleStore.moduleConfig.textSpam
        if (textSpam.sourceMode === 'tabs') {
            const hasAnyTabText = textSpam.tabPanels.some((panel) => hasUsableText(panel.msg))
            if (!hasAnyTabText) {
                const fallbackPanel = activeTab.value ?? textSpam.tabPanels[0]
                if (!fallbackPanel) {
                    textSpam.msg = normalizeSubmittedText(textSpam.msg)
                } else {
                    const normalizedFallback = normalizeSubmittedText(fallbackPanel.msg)
                    fallbackPanel.msg = normalizedFallback
                    textSpam.msg = normalizedFallback
                }
            }
        }

        normalizeCurrentTextIfBlank()
    }

    const clearCurrentText = () => {
        currentText.value = ''
    }

    const handleStartSpam = () => {
        normalizeBeforeSubmit()
        const started = startTask('textSpam')
        if (!started) return
        uiStore.uiConfig.isShowPanel = false
    }

    const handleStopSpam = () => {
        stopAllTasks()
    }

    onMounted(() => {
        if (moduleStore.moduleConfig.textSpam.textInterval > textLengthLimitMax.value) {
            moduleStore.moduleConfig.textSpam.textInterval = textLengthLimitMax.value
        }
    })

    watch(textLengthLimitMax, (maxLength) => {
        if (moduleStore.moduleConfig.textSpam.textInterval > maxLength) {
            moduleStore.moduleConfig.textSpam.textInterval = maxLength
        }
    })

    return {
        textLengthLimitMax,
        combineTabs,
        lineBreakMode,
        randomSendMode,
        autoStopEnabled,
        activeIntervalSeconds,
        textLengthLimit,
        isAnySpamRunning,
        currentText,
        clearCurrentText,
        normalizeCurrentTextIfBlank,
        handleStartSpam,
        handleStopSpam
    }
}
