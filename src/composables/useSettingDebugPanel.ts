import { onBeforeUnmount, ref } from 'vue'
import Logger from '@/utils/logger'
import Storage from '@/utils/storage'
import { useModuleStore } from '@/stores/useModuleStore'
import { useUIStore } from '@/stores/useUIStore'
import { cloneModuleConfig, cloneUiConfig } from '@/utils/storage/schema'

type DebugResultTone = 'success' | 'info' | 'warn' | 'danger'
type DebugTriggerSeverity = 'success' | 'error' | 'warning' | 'info'
type DangerActionId = 'append-test-package'

const DANGER_CONFIRM_WINDOW_MS = 2400
const RANDOM_DEBUG_SEVERITIES: DebugTriggerSeverity[] = ['success', 'error', 'warning', 'info']

const getDebugApi = () => window.__HAZELSPAM_NOTIFY__ ?? null

const pickRandomSeverity = (): DebugTriggerSeverity =>
    RANDOM_DEBUG_SEVERITIES[Math.floor(Math.random() * RANDOM_DEBUG_SEVERITIES.length)]

const mapResultTone = (ok: boolean, fallback: DebugResultTone = 'info'): DebugResultTone =>
    ok ? fallback : 'danger'

export const useSettingDebugPanel = () => {
    const logger = new Logger('Setting_Debug')
    const moduleStore = useModuleStore()
    const uiStore = useUIStore()
    const pendingDangerActionId = ref<DangerActionId | null>(null)

    let dangerActionTimer: number | null = null

    const clearDangerActionTimer = () => {
        if (dangerActionTimer !== null) {
            window.clearTimeout(dangerActionTimer)
            dangerActionTimer = null
        }
    }

    const disarmDangerAction = () => {
        pendingDangerActionId.value = null
        clearDangerActionTimer()
    }

    const armDangerAction = (actionId: DangerActionId) => {
        pendingDangerActionId.value = actionId
        clearDangerActionTimer()
        dangerActionTimer = window.setTimeout(() => {
            pendingDangerActionId.value = null
            dangerActionTimer = null
        }, DANGER_CONFIRM_WINDOW_MS)
    }

    const logDebugAction = (
        label: string,
        description: string,
        tone: DebugResultTone,
        data: unknown
    ) => {
        const payload = { description, data }
        if (tone === 'danger') {
            logger.error(label, payload)
            return
        }
        if (tone === 'warn') {
            logger.warn(label, payload)
            return
        }
        if (tone === 'success') {
            logger.log(label, payload)
            return
        }
        logger.info(label, payload)
    }

    const runWithDebugApi = (
        label: string,
        runner: (debugApi: NonNullable<ReturnType<typeof getDebugApi>>) => unknown,
        resolveDescription: (data: unknown) => string,
        resolveTone: (data: unknown) => DebugResultTone = () => 'info'
    ) => {
        const debugApi = getDebugApi()
        if (!debugApi) {
            logDebugAction(label, '调试 API 尚未挂载，请稍后再试。', 'warn', {
                ok: false,
                reason: 'debug-api-unavailable'
            })
            return
        }

        try {
            const data = runner(debugApi)
            logDebugAction(label, resolveDescription(data), resolveTone(data), data)
        } catch (error) {
            logDebugAction(label, '调试动作执行失败，请检查控制台日志。', 'danger', {
                ok: false,
                error: error instanceof Error ? error.message : String(error)
            })
        }
    }

    const triggerDialog = () => {
        const severity = pickRandomSeverity()
        runWithDebugApi(
            '系统弹窗',
            (debugApi) => debugApi.dialog(undefined, undefined, severity),
            () => `已触发 ${severity} 级别的系统弹窗。`,
            () => (severity === 'success' ? 'success' : severity === 'info' ? 'info' : 'warn')
        )
    }

    const triggerUpdateDialog = () => {
        runWithDebugApi(
            '更新弹窗',
            (debugApi) => debugApi.updateDialog(),
            (data) => `已触发更新弹窗，版本 ${(data as { version?: string }).version ?? 'v9.9.9-debug'}。`,
            () => 'success'
        )
    }

    const triggerMessageToast = () => {
        const severity = pickRandomSeverity()
        runWithDebugApi(
            '消息 Toast',
            (debugApi) => debugApi.message(undefined, severity),
            () => `已触发 ${severity} 级别的消息 Toast。`,
            (data) => mapResultTone(Boolean((data as { delivered?: boolean }).delivered ?? true), 'info')
        )
    }

    const triggerNotificationToast = () => {
        const severity = pickRandomSeverity()
        runWithDebugApi(
            '通知 Toast',
            (debugApi) => debugApi.notification(undefined, undefined, severity),
            () => `已触发 ${severity} 级别的通知 Toast。`,
            (data) => mapResultTone(Boolean((data as { delivered?: boolean }).delivered ?? true), 'info')
        )
    }

    const inspectEmotionTexts = () => {
        runWithDebugApi(
            '表情文字字段',
            (debugApi) => debugApi.emotionTexts(),
            (data) => {
                const result = data as { hasEmotionData?: boolean; packageCount?: number }
                return result.hasEmotionData
                    ? `已读取 ${result.packageCount ?? 0} 组表情包文字字段。`
                    : '当前还没有拉取到表情包数据。'
            },
            (data) => mapResultTone(Boolean((data as { hasEmotionData?: boolean }).hasEmotionData), 'info')
        )
    }

    const inspectStoredConfig = () => {
        const snapshot = {
            moduleConfig: cloneModuleConfig(moduleStore.moduleConfig),
            uiConfig: cloneUiConfig(uiStore.uiConfig),
            persistedModuleConfig: Storage.getModuleConfig(),
            persistedUiConfig: Storage.getUiConfig()
        }
        logDebugAction('配置快照', '已读取当前运行态与 GM 持久化配置。', 'info', snapshot)
    }

    const appendTestPackage = () => {
        runWithDebugApi(
            '追加测试表情包',
            (debugApi) => debugApi.appendGeneralPackage(),
            (data) => {
                const result = data as { ok?: boolean; emoticonCount?: number; reason?: string }
                return result.ok
                    ? `已追加测试表情包，包含 ${result.emoticonCount ?? 0} 个表情。`
                    : result.reason || '追加测试表情包失败。'
            },
            (data) => mapResultTone(Boolean((data as { ok?: boolean }).ok), 'success')
        )
        disarmDangerAction()
    }

    const toggleDangerAction = (actionId: DangerActionId, action: () => void) => {
        if (pendingDangerActionId.value === actionId) {
            action()
            return
        }

        armDangerAction(actionId)
        logDebugAction('等待二次确认', '再次点击同一按钮即可执行高风险调试动作。', 'warn', {
            actionId
        })
    }

    onBeforeUnmount(() => {
        clearDangerActionTimer()
    })

    return {
        triggerDialog,
        triggerUpdateDialog,
        triggerMessageToast,
        triggerNotificationToast,
        inspectEmotionTexts,
        inspectStoredConfig,
        appendTestPackage,
        toggleDangerAction,
        isDangerActionArmed: (actionId: DangerActionId) => pendingDangerActionId.value === actionId
    }
}
