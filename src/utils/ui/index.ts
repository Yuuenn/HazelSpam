import type { ToastMessageOptions } from 'primevue/toast'
import type { ToastServiceMethods } from 'primevue/toastservice'
import Logger from '@/utils/logger'
import {
    hideSystemDialog,
    showSystemDialog,
    type SystemDialogOptions
} from '@/utils/ui/systemDialog'
import { APP_MESSAGE_GROUP, APP_NOTIFICATION_GROUP } from '@/constants/brand'
import { installNotifyDebugApi } from './debugApi'

type DiscreteApiName = 'message' | 'dialog' | 'notification' | 'loadingBar'
type AppToastSeverity = 'success' | 'error' | 'warn' | 'info'
type MessageKind = AppToastSeverity
type NotificationKind = AppToastSeverity
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
    title: string
    content: string
    duration?: number
    closable?: boolean
    actions?: NotificationAction[]
}

type MessageApi = {
    success: (content: string, options?: MessageOptions) => void
    error: (content: string, options?: MessageOptions) => void
    warn: (content: string, options?: MessageOptions) => void
    info: (content: string, options?: MessageOptions) => void
}

type NotificationApi = {
    create: (options: NotificationOptions) => void
    success: (options: NotificationOptions) => void
    error: (options: NotificationOptions) => void
    warn: (options: NotificationOptions) => void
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

let toastService: ToastServiceMethods | null = null
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
    warn: noop,
    info: noop
}

const EMPTY_NOTIFICATION_API: NotificationApi = {
    create: noop,
    success: noop,
    error: noop,
    warn: noop,
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

const normalizeSeverity = (severity: AppToastSeverity): PrimeToastSeverity => severity

const normalizeToastLine = (value: string | undefined, fallback: string): string => {
    const normalized = String(value ?? '')
        .replace(/\s*\r?\n+\s*/g, ' ')
        .trim()
    return normalized.length > 0 ? normalized : fallback
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
        summary: normalizeToastLine(content, '提示'),
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
        summary: normalizeToastLine(options.title, '提示'),
        detail: normalizeToastLine(options.content, '请查看详情'),
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
    warn: (content, options) => {
        pushMessage('warn', content, options)
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
    warn: (options) => {
        pushNotification('warn', options)
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

export const setPrimeToastService = (service: ToastServiceMethods | null) => {
    toastService = service
    flushPendingToasts()

    installNotifyDebugApi({
        defaultToastDuration: DEFAULT_TOAST_DURATION,
        pushMessage,
        pushNotification,
        clearNotifications: () => {
            toastService?.removeGroup(APP_MESSAGE_GROUP)
            toastService?.removeGroup(APP_NOTIFICATION_GROUP)
            hideSystemDialog()
        },
        showDialog: showSystemDialog,
        getDebugState: () => ({
            hasToastService: Boolean(toastService),
            pendingCount: pendingToasts.length,
            hasNotifyApi: true
        }),
        logger
    })
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
