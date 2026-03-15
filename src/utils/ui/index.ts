import type { ToastMessageOptions } from 'primevue/toast'
import type { ToastServiceMethods } from 'primevue/toastservice'
import Logger from '@/utils/logger'
import { useBiliStore } from '@/stores/useBiliStore'
import {
    getDefaultUpdateChangelogUrl,
    showUpdateDialog
} from '@/utils/ui/updateDialog'
import {
    hideSystemDialog,
    showSystemDialog,
    type SystemDialogOptions
} from '@/utils/ui/systemDialog'
import {
    APP_MESSAGE_GROUP,
    APP_NOTIFICATION_GROUP,
    DEBUG_NOTIFY_GLOBAL_KEY,
    PRODUCT_NAME,
    PROJECT_RELEASES_URL
} from '@/constants/brand'
import { DEBUG_NOTIFY_GLOBAL_KEYS } from '@/constants/debug'

type DiscreteApiName = 'message' | 'dialog' | 'notification' | 'loadingBar'
type MessageKind = 'success' | 'error' | 'warning' | 'info'
type NotificationKind = 'success' | 'error' | 'warning' | 'info'
type PrimeToastSeverity = 'success' | 'error' | 'warn' | 'info'

const DEFAULT_TOAST_DURATION = 2500
const logger = new Logger('UI_Notify')

type MessageOptions = {
    duration?: number
}

export type NotificationAction = {
    label: string
    severity?: 'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'contrast'
    onClick?: () => void
    closeOnClick?: boolean
}

export type NotificationOptions = {
    title?: string
    content?: string
    duration?: number
    closable?: boolean
    actions?: NotificationAction[]
}

type MessageApi = {
    success: (content: string, options?: MessageOptions) => void
    error: (content: string, options?: MessageOptions) => void
    warning: (content: string, options?: MessageOptions) => void
    info: (content: string, options?: MessageOptions) => void
}

type NotificationApi = {
    create: (options: NotificationOptions) => void
    success: (options: NotificationOptions) => void
    error: (options: NotificationOptions) => void
    warning: (options: NotificationOptions) => void
    info: (options: NotificationOptions) => void
    destroyAll: () => void
}

type DialogApi = {
    create: (options: SystemDialogOptions) => void
    success: (options: Omit<SystemDialogOptions, 'severity'>) => void
    error: (options: Omit<SystemDialogOptions, 'severity'>) => void
    warning: (options: Omit<SystemDialogOptions, 'severity'>) => void
    info: (options: Omit<SystemDialogOptions, 'severity'>) => void
    destroyAll: () => void
}

type EmptyApi = Record<string, (...args: unknown[]) => void>

type DiscreteApiMap = {
    message: MessageApi
    notification: NotificationApi
    dialog: DialogApi
    loadingBar: EmptyApi
}

type SelectedDiscreteApi<T extends readonly DiscreteApiName[]> = {
    [K in T[number]]: DiscreteApiMap[K]
}

type PrimeToastMessage = ToastMessageOptions & {
    data?: {
        actions?: NotificationAction[]
    }
}

type EnqueueResult = {
    delivered: boolean
    pendingCount: number
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
    severity: NotificationKind
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

let toastService: ToastServiceMethods | null = null
let isDebugApiInstalled = false
const pendingToasts: PrimeToastMessage[] = []

const noop = () => {}

const EMPTY_API: EmptyApi = new Proxy(
    {},
    {
        get: () => noop
    }
)

const EMPTY_MESSAGE_API: MessageApi = {
    success: noop,
    error: noop,
    warning: noop,
    info: noop
}

const EMPTY_NOTIFICATION_API: NotificationApi = {
    create: noop,
    success: noop,
    error: noop,
    warning: noop,
    info: noop,
    destroyAll: noop
}

const EMPTY_DIALOG_API: DialogApi = {
    create: noop,
    success: noop,
    error: noop,
    warning: noop,
    info: noop,
    destroyAll: noop
}

const normalizeSeverity = (severity: MessageKind | NotificationKind): PrimeToastSeverity => {
    if (severity === 'warning') return 'warn'
    return severity
}

const enqueueToast = (message: PrimeToastMessage): EnqueueResult => {
    if (!toastService) {
        pendingToasts.push(message)
        return {
            delivered: false,
            pendingCount: pendingToasts.length
        }
    }

    toastService.add(message)
    return {
        delivered: true,
        pendingCount: pendingToasts.length
    }
}

const flushPendingToasts = () => {
    if (!toastService || pendingToasts.length === 0) return
    pendingToasts.splice(0).forEach((message) => toastService?.add(message))
}

const pushMessage = (
    severity: MessageKind,
    content: string,
    options?: MessageOptions
): EnqueueResult => {
    const life = options?.duration ?? DEFAULT_TOAST_DURATION
    return enqueueToast({
        group: APP_MESSAGE_GROUP,
        severity: normalizeSeverity(severity),
        summary: content,
        closable: false,
        life
    })
}

const pushNotification = (
    severity: NotificationKind,
    options: NotificationOptions
): EnqueueResult => {
    const life = options.duration ?? DEFAULT_TOAST_DURATION
    return enqueueToast({
        group: APP_NOTIFICATION_GROUP,
        severity: normalizeSeverity(severity),
        summary: options.title,
        detail: options.content,
        closable: options.closable ?? true,
        life,
        data: {
            actions: options.actions ?? []
        }
    })
}

const messageAPI: MessageApi = {
    success: (content, options) => {
        pushMessage('success', content, options)
    },
    error: (content, options) => {
        pushMessage('error', content, options)
    },
    warning: (content, options) => {
        pushMessage('warning', content, options)
    },
    info: (content, options) => {
        pushMessage('info', content, options)
    }
}

const notificationAPI: NotificationApi = {
    create: (options) => {
        pushNotification('info', options)
    },
    success: (options) => {
        pushNotification('success', options)
    },
    error: (options) => {
        pushNotification('error', options)
    },
    warning: (options) => {
        pushNotification('warning', options)
    },
    info: (options) => {
        pushNotification('info', options)
    },
    destroyAll: () => {
        toastService?.removeGroup(APP_NOTIFICATION_GROUP)
    }
}

const dialogAPI: DialogApi = {
    create: (options) => {
        showSystemDialog(options)
    },
    success: (options) => {
        showSystemDialog({ ...options, severity: 'success' })
    },
    error: (options) => {
        showSystemDialog({ ...options, severity: 'error' })
    },
    warning: (options) => {
        showSystemDialog({ ...options, severity: 'warning' })
    },
    info: (options) => {
        showSystemDialog({ ...options, severity: 'info' })
    },
    destroyAll: () => {
        hideSystemDialog()
    }
}

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
        hasToastService: Boolean(toastService),
        pendingCount: enqueueResult.pendingCount,
        group
    }
}

const logDebugResult = (label: string, result: DebugNotifyResult, payload?: unknown) => {
    const state = result.delivered ? '已投递到 ToastService' : '暂存到待发送队列'
    logger.info(`[debug:${label}] ${state}`, {
        payload,
        hasToastService: result.hasToastService,
        pendingCount: result.pendingCount,
        group: 'group' in result ? result.group : undefined
    })
}

const installDebugApi = () => {
    if (isDebugApiInstalled || typeof window === 'undefined') return

    const debugApi = {
        message: (
            content = '这是一条测试消息',
            severity: MessageKind = 'info',
            duration = DEFAULT_TOAST_DURATION
        ) => {
            const enqueueResult = pushMessage(severity, content, { duration })
            const result = buildDebugResult('message', enqueueResult, APP_MESSAGE_GROUP)
            logDebugResult('message', result, { content, severity, duration })
            return result
        },
        notification: (
            content = '这是一条测试通知',
            title = `${PRODUCT_NAME} 调试通知`,
            severity: NotificationKind = 'info',
            duration = DEFAULT_TOAST_DURATION
        ) => {
            const enqueueResult = pushNotification(severity, {
                title,
                content,
                closable: true,
                duration
            })
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
            logger.info('[debug:update-dialog] 已触发更新弹窗', {
                ...result,
                changelogUrl,
                downloadUrl
            })
            return result
        },
        dialog: (
            content = '这是一条调试弹窗',
            title = `${PRODUCT_NAME} 调试弹窗`,
            severity: NotificationKind = 'info'
        ): DebugSystemDialogResult => {
            showSystemDialog({
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
            logger.info('[debug:dialog] 已触发系统弹窗', {
                ...result,
                content
            })
            return result
        },
        clear: () => {
            toastService?.removeGroup(APP_MESSAGE_GROUP)
            toastService?.removeGroup(APP_NOTIFICATION_GROUP)
            hideSystemDialog()
            const result: DebugClearResult = {
                ok: true,
                kind: 'clear',
                delivered: Boolean(toastService),
                hasToastService: Boolean(toastService),
                pendingCount: pendingToasts.length
            }
            logDebugResult('clear', result)
            return result
        },
        status: () => {
            const result = {
                hasToastService: Boolean(toastService),
                pendingCount: pendingToasts.length,
                hasNotifyApi: true
            }
            logger.info('[debug:status] 当前通知状态', result)
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

            logger.info('[debug:emotion-texts] 可用文字字段', {
                packageTextFields,
                emoticonTextFields
            })
            logger.info('[debug:emotion-texts] 当前数据快照', result)
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
                logger.warn('[debug:emotion-append-general] 追加失败', result)
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

            logger.info('[debug:emotion-append-general] 已追加调试通用表情包', result)
            return result
        }
    }

    const debugWindow = window as unknown as Record<string, typeof debugApi>
    DEBUG_NOTIFY_GLOBAL_KEYS.forEach((key) => {
        debugWindow[key] = debugApi
    })

    isDebugApiInstalled = true
    logger.info(`调试通知 API 已挂载到 window.${DEBUG_NOTIFY_GLOBAL_KEY}`)
}

export const setPrimeToastService = (service: ToastServiceMethods | null) => {
    toastService = service
    flushPendingToasts()
    installDebugApi()
}

export function useDiscreteAPI<T extends readonly DiscreteApiName[]>(
    apis: T,
    disable = false
): SelectedDiscreteApi<T> {
    const apiMap: DiscreteApiMap = disable
        ? {
              message: EMPTY_MESSAGE_API,
              notification: EMPTY_NOTIFICATION_API,
              dialog: EMPTY_DIALOG_API,
              loadingBar: EMPTY_API
          }
        : {
              message: messageAPI,
              notification: notificationAPI,
              dialog: dialogAPI,
              loadingBar: EMPTY_API
          }

    const selectedApi = {} as SelectedDiscreteApi<T>
    const mutableSelectedApi = selectedApi as Record<
        DiscreteApiName,
        DiscreteApiMap[DiscreteApiName]
    >

    apis.forEach((api) => {
        mutableSelectedApi[api] = apiMap[api]
    })

    return selectedApi
}
