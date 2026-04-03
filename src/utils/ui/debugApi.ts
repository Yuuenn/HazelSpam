import { useBiliStore } from '@/stores/useBiliStore'
import { DEBUG_NOTIFY_GLOBAL_KEYS } from '@/constants/debug'
import {
    APP_MESSAGE_GROUP,
    APP_NOTIFICATION_GROUP,
    DEBUG_NOTIFY_GLOBAL_KEY,
    PRODUCT_NAME,
    PROJECT_RELEASES_URL
} from '@/constants/brand'
import {
    getDefaultUpdateChangelogUrl,
    showUpdateDialog
} from '@/utils/ui/updateDialog'
import type { SystemDialogOptions } from '@/utils/ui/systemDialog'

type AppToastSeverity = 'success' | 'error' | 'warn' | 'info'
type MessageKind = AppToastSeverity
type NotificationKind = AppToastSeverity

type MessageOptions = {
    duration?: number
}

type BasicNotificationOptions = {
    title: string
    content: string
    duration?: number
    closable?: boolean
}

type EnqueueResult = {
    delivered: boolean
    pendingCount: number
}

type DebugLogger = {
    info: (...data: unknown[]) => void
    warn: (...data: unknown[]) => void
}

type DebugState = {
    hasToastService: boolean
    pendingCount: number
    hasNotifyApi: boolean
}

type NotifyDebugHandlers = {
    defaultToastDuration: number
    pushMessage: (
        severity: MessageKind,
        content: string,
        options?: MessageOptions
    ) => EnqueueResult
    pushNotification: (
        severity: NotificationKind,
        options: BasicNotificationOptions
    ) => EnqueueResult
    clearNotifications: () => void
    showDialog: (options: SystemDialogOptions) => void
    getDebugState: () => DebugState
    logger: DebugLogger
}

type DebugMessageResult = {
    ok: boolean
    kind: 'message'
    delivered: boolean
    hasToastService: boolean
    pendingCount: number
    group: string
}

type DebugNotificationResult = {
    ok: boolean
    kind: 'notification'
    delivered: boolean
    hasToastService: boolean
    pendingCount: number
    group: string
}

type DebugClearResult = {
    ok: boolean
    kind: 'clear'
    delivered: boolean
    hasToastService: boolean
    pendingCount: number
}

type DebugNotifyResult = DebugMessageResult | DebugNotificationResult | DebugClearResult

type DebugUpdateDialogOptions = {
    version?: string
    downloadUrl?: string
    changelogUrl?: string
}

type DebugUpdateDialogResult = {
    ok: boolean
    kind: 'update-dialog'
    shown: boolean
    version: string
    hasDownloadUrl: boolean
}

type DebugSystemDialogResult = {
    ok: boolean
    kind: 'dialog'
    shown: boolean
    severity: SystemDialogOptions['severity']
    title: string
}

type EmotionTextDebugResult = {
    ok: boolean
    hasEmotionData: boolean
    packageCount: number
    emoticonCount: number
    samplePerPackage: number
    packageTextFields: string[]
    emoticonTextFields: string[]
    packages: Array<{
        pkg_id: number
        pkg_name: string
        pkg_descript: string
        top_left_text: string
        top_right_text: string
        emoticon_count: number
        emoticon_samples: Array<{
            emoticon_id: number
            emoticon_unique: string
            emoji: string
            descript: string
            unlock_show_text: string
            unlock_show_color: string
        }>
    }>
}

type AppendGeneralPackageDebugResult = {
    ok: boolean
    packageCount: number
    appendedPackageId: number | null
    appendedPackageName: string
    emoticonCount: number
    reason?: string
}

let isDebugApiInstalled = false
let activeDebugHandlers: NotifyDebugHandlers | null = null

function buildDebugResult(
    kind: 'message',
    enqueueResult: EnqueueResult,
    group: string
): DebugMessageResult
function buildDebugResult(
    kind: 'notification',
    enqueueResult: EnqueueResult,
    group: string
): DebugNotificationResult
function buildDebugResult(
    kind: 'message' | 'notification',
    enqueueResult: EnqueueResult,
    group: string
): DebugMessageResult | DebugNotificationResult {
    return {
        ok: true,
        kind,
        delivered: enqueueResult.delivered,
        hasToastService: Boolean(activeDebugHandlers?.getDebugState().hasToastService),
        pendingCount: enqueueResult.pendingCount,
        group
    }
}

const logDebugResult = (label: string, result: DebugNotifyResult, payload?: unknown) => {
    const handlers = activeDebugHandlers
    if (!handlers) {
        return
    }

    const state = handlers.getDebugState()
    const messageState = result.delivered ? '已投递到 ToastService' : '暂存到待发送队列'
    handlers.logger.info(`[debug:${label}] ${messageState}`, {
        payload,
        hasToastService: state.hasToastService,
        pendingCount: state.pendingCount,
        group: 'group' in result ? result.group : undefined
    })
}

export const installNotifyDebugApi = (handlers: NotifyDebugHandlers) => {
    activeDebugHandlers = handlers
    if (isDebugApiInstalled || typeof window === 'undefined') {
        return
    }

    const debugApi = {
        message: (
            content = '这是一条测试消息',
            severity: MessageKind = 'info',
            duration = handlers.defaultToastDuration
        ) => {
            const enqueueResult = activeDebugHandlers?.pushMessage(severity, content, {
                duration
            })
            if (!enqueueResult) {
                return {
                    ok: false,
                    kind: 'message',
                    delivered: false,
                    hasToastService: false,
                    pendingCount: 0,
                    group: APP_MESSAGE_GROUP
                }
            }
            const result = buildDebugResult('message', enqueueResult, APP_MESSAGE_GROUP)
            logDebugResult('message', result, { content, severity, duration })
            return result
        },
        notification: (
            content = '这是一条测试通知',
            title = `${PRODUCT_NAME} 调试通知`,
            severity: NotificationKind = 'info',
            duration = handlers.defaultToastDuration
        ) => {
            const enqueueResult = activeDebugHandlers?.pushNotification(severity, {
                title,
                content,
                closable: true,
                duration
            })
            if (!enqueueResult) {
                return {
                    ok: false,
                    kind: 'notification',
                    delivered: false,
                    hasToastService: false,
                    pendingCount: 0,
                    group: APP_NOTIFICATION_GROUP
                }
            }
            const result = buildDebugResult('notification', enqueueResult, APP_NOTIFICATION_GROUP)
            logDebugResult('notification', result, { title, content, severity, duration })
            return result
        },
        updateDialog: (options: DebugUpdateDialogOptions = {}): DebugUpdateDialogResult => {
            const version = options.version ?? 'v9.9.9-debug'
            const downloadUrl = options.downloadUrl ?? PROJECT_RELEASES_URL
            const changelogUrl = options.changelogUrl ?? getDefaultUpdateChangelogUrl()

            showUpdateDialog({
                version,
                changelogUrl,
                downloadUrl
            })

            const result: DebugUpdateDialogResult = {
                ok: true,
                kind: 'update-dialog',
                shown: true,
                version,
                hasDownloadUrl: Boolean(downloadUrl)
            }
            activeDebugHandlers?.logger.info('[debug:update-dialog] 已触发更新弹窗', {
                ...result,
                changelogUrl,
                downloadUrl
            })
            return result
        },
        dialog: (
            content = '这是一条调试弹窗',
            title = `${PRODUCT_NAME} 调试弹窗`,
            severity: SystemDialogOptions['severity'] = 'info'
        ): DebugSystemDialogResult => {
            activeDebugHandlers?.showDialog({
                severity,
                title,
                content,
                confirmText: '',
                closable: true
            })
            const result: DebugSystemDialogResult = {
                ok: true,
                kind: 'dialog',
                shown: true,
                severity,
                title
            }
            activeDebugHandlers?.logger.info('[debug:dialog] 已触发系统弹窗', {
                ...result,
                content
            })
            return result
        },
        clear: () => {
            activeDebugHandlers?.clearNotifications()
            const state = activeDebugHandlers?.getDebugState() ?? {
                hasToastService: false,
                pendingCount: 0,
                hasNotifyApi: true
            }
            const result: DebugClearResult = {
                ok: true,
                kind: 'clear',
                delivered: state.hasToastService,
                hasToastService: state.hasToastService,
                pendingCount: state.pendingCount
            }
            logDebugResult('clear', result)
            return result
        },
        status: () => {
            const result =
                activeDebugHandlers?.getDebugState() ?? {
                    hasToastService: false,
                    pendingCount: 0,
                    hasNotifyApi: true
                }
            activeDebugHandlers?.logger.info('[debug:status] 当前通知状态', result)
            return result
        },
        emotionTexts: (samplePerPackage = 3): EmotionTextDebugResult => {
            const normalizedSample =
                Number.isFinite(samplePerPackage) && samplePerPackage > 0
                    ? Math.floor(samplePerPackage)
                    : 3
            const packageTextFields = [
                'pkg_name',
                'pkg_descript',
                'top_show.top_left.text',
                'top_show.top_right.text'
            ]
            const emoticonTextFields = [
                'emoji',
                'descript',
                'unlock_show_text',
                'unlock_show_color'
            ]
            const emotionData = useBiliStore().emotionData
            const packages = emotionData.map((pkg) => ({
                pkg_id: pkg.pkg_id,
                pkg_name: pkg.pkg_name,
                pkg_descript: pkg.pkg_descript,
                top_left_text: pkg.top_show?.top_left?.text ?? '',
                top_right_text: pkg.top_show?.top_right?.text ?? '',
                emoticon_count: pkg.emoticons.length,
                emoticon_samples: pkg.emoticons.slice(0, normalizedSample).map((item) => ({
                    emoticon_id: item.emoticon_id,
                    emoticon_unique: item.emoticon_unique,
                    emoji: item.emoji,
                    descript: item.descript,
                    unlock_show_text: item.unlock_show_text,
                    unlock_show_color: item.unlock_show_color
                }))
            }))
            const emoticonCount = packages.reduce((sum, pkg) => sum + pkg.emoticon_count, 0)

            const result: EmotionTextDebugResult = {
                ok: true,
                hasEmotionData: emotionData.length > 0,
                packageCount: packages.length,
                emoticonCount,
                samplePerPackage: normalizedSample,
                packageTextFields,
                emoticonTextFields,
                packages
            }

            activeDebugHandlers?.logger.info('[debug:emotion-texts] 可用文字字段', {
                packageTextFields,
                emoticonTextFields
            })
            activeDebugHandlers?.logger.info('[debug:emotion-texts] 当前数据快照', result)
            return result
        },
        appendGeneralPackage: (samplePerPackage = 6): AppendGeneralPackageDebugResult => {
            const biliStore = useBiliStore()
            const sourcePackages = biliStore.emotionData
            const normalizedSample =
                Number.isFinite(samplePerPackage) && samplePerPackage > 0
                    ? Math.floor(samplePerPackage)
                    : 6

            if (sourcePackages.length === 0) {
                const result: AppendGeneralPackageDebugResult = {
                    ok: false,
                    packageCount: 0,
                    appendedPackageId: null,
                    appendedPackageName: '通用表情',
                    emoticonCount: 0,
                    reason: 'emotionData 为空，尚未拉取到表情包数据'
                }
                activeDebugHandlers?.logger.warn('[debug:emotion-append-general] 追加失败', result)
                return result
            }

            const isGeneralPackage = (pkg: (typeof sourcePackages)[number]) =>
                pkg.pkg_id === 100 || pkg.pkg_name.includes('通用表情')

            const sourcePackage =
                sourcePackages.find((pkg) => isGeneralPackage(pkg)) ?? sourcePackages[0]

            const maxPkgId = sourcePackages.reduce((max, pkg) => Math.max(max, pkg.pkg_id), 0)
            let maxEmoticonId = 0
            sourcePackages.forEach((pkg) => {
                pkg.emoticons.forEach((item) => {
                    maxEmoticonId = Math.max(maxEmoticonId, item.emoticon_id)
                })
            })

            const pickedEmoticons = sourcePackage.emoticons.slice(0, normalizedSample)
            const fallbackEmoticons =
                pickedEmoticons.length > 0 ? pickedEmoticons : sourcePackage.emoticons.slice(0, 1)

            const uniquePrefix = `${PRODUCT_NAME.toLowerCase()}-debug-general-${Date.now()}`
            const clonedEmoticons = fallbackEmoticons.map((item, index) => ({
                ...item,
                emoticon_id: maxEmoticonId + index + 1,
                emoticon_unique: `${uniquePrefix}-${index}`,
                emoji: item.emoji || `调试表情${index + 1}`,
                descript: item.descript || `调试追加表情 ${index + 1}`
            }))

            const debugPackage = {
                ...sourcePackage,
                pkg_id: maxPkgId + 1,
                pkg_name: '通用表情',
                pkg_descript: `${PRODUCT_NAME} 调试追加`,
                emoticons: clonedEmoticons
            }

            biliStore.emotionData.push(debugPackage)

            const result: AppendGeneralPackageDebugResult = {
                ok: true,
                packageCount: biliStore.emotionData.length,
                appendedPackageId: debugPackage.pkg_id,
                appendedPackageName: debugPackage.pkg_name,
                emoticonCount: debugPackage.emoticons.length
            }

            activeDebugHandlers?.logger.info('[debug:emotion-append-general] 已追加调试通用表情包', result)
            return result
        }
    }

    const debugWindow = window as unknown as Record<string, typeof debugApi>
    DEBUG_NOTIFY_GLOBAL_KEYS.forEach((key) => {
        debugWindow[key] = debugApi
    })

    isDebugApiInstalled = true
    handlers.logger.info(`调试通知 API 已挂载到 window.${DEBUG_NOTIFY_GLOBAL_KEY}`)
}
