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
    const { isAnySpamRunning, startSpamTask, stopAllSpamTasks } = useSpamTaskRunner()

    const messageCharLimitMax = computed(() =>
        Math.max(1, Number(biliStore.danmakuLengthLimit || 40))
    )

    const combineTabs = computed({
        get: () => moduleStore.moduleConfig.textSpam.sourceMode === 'tabs',
        set: (value: boolean) => {
            if ((moduleStore.moduleConfig.textSpam.sourceMode === 'tabs') === value) {
                return
            }

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
                if (moduleStore.moduleConfig.textSpam.tabSplitMode === splitMode) return
                moduleStore.moduleConfig.textSpam.tabSplitMode = splitMode
                return
            }
            if (moduleStore.moduleConfig.textSpam.splitMode === splitMode) return
            moduleStore.moduleConfig.textSpam.splitMode = splitMode
        }
    })

    const isRandomOrderEnabled = computed({
        get: () => !moduleStore.moduleConfig.textSpam.sequentialMode,
        set: (value: boolean) => {
            if (moduleStore.moduleConfig.textSpam.sequentialMode === !value) return
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
                if (moduleStore.moduleConfig.textSpam.timeLimit === 0) return
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
            // Keep both spam modules aligned so users can switch views without surprise timing drift.
            if (moduleStore.moduleConfig.textSpam.tabTimeInterval !== value) {
                moduleStore.moduleConfig.textSpam.tabTimeInterval = value
            }
            if (moduleStore.moduleConfig.textSpam.timeInterval !== value) {
                moduleStore.moduleConfig.textSpam.timeInterval = value
            }
            if (moduleStore.moduleConfig.emotionSpam.timeInterval !== value) {
                moduleStore.moduleConfig.emotionSpam.timeInterval = value
            }
        }
    })

    const messageCharLimit = computed({
        get: () => moduleStore.moduleConfig.textSpam.textInterval,
        set: (value: number | null) => {
            if (value === null) return
            if (moduleStore.moduleConfig.textSpam.textInterval === value) return
            moduleStore.moduleConfig.textSpam.textInterval = value
        }
    })

    const currentText = computed({
        get: () => activeTab.value?.msg ?? moduleStore.moduleConfig.textSpam.msg,
        set: (value: string) => {
            if (activeTab.value && activeTab.value.msg !== value) {
                activeTab.value.msg = value
            }
            if (moduleStore.moduleConfig.textSpam.msg !== value) {
                moduleStore.moduleConfig.textSpam.msg = value
            }
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
        const started = startSpamTask('textSpam')
        if (!started) return
        uiStore.uiConfig.isShowPanel = false
    }

    const handleStopSpam = () => {
        stopAllSpamTasks()
    }

    onMounted(() => {
        if (moduleStore.moduleConfig.textSpam.textInterval > messageCharLimitMax.value) {
            moduleStore.moduleConfig.textSpam.textInterval = messageCharLimitMax.value
        }
    })

    watch(messageCharLimitMax, (maxCharLimit) => {
        if (moduleStore.moduleConfig.textSpam.textInterval > maxCharLimit) {
            moduleStore.moduleConfig.textSpam.textInterval = maxCharLimit
        }
    })

    return {
        messageCharLimitMax,
        combineTabs,
        lineBreakMode,
        isRandomOrderEnabled,
        autoStopEnabled,
        activeIntervalSeconds,
        messageCharLimit,
        isAnySpamRunning,
        currentText,
        clearCurrentText,
        normalizeCurrentTextIfBlank,
        handleStartSpam,
        handleStopSpam
    }
}
