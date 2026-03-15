import { reactive } from 'vue'

export type SystemDialogSeverity = 'success' | 'error' | 'warning' | 'info'

export type SystemDialogOptions = {
    severity?: SystemDialogSeverity
    title?: string
    content?: string
    confirmText?: string
    closable?: boolean
}

type SystemDialogState = {
    visible: boolean
    severity: SystemDialogSeverity
    title: string
    content: string
    confirmText: string
    closable: boolean
}

const DEFAULT_TITLE_BY_SEVERITY: Record<SystemDialogSeverity, string> = {
    success: '操作成功',
    error: '操作失败',
    warning: '提示',
    info: '提示'
}

const systemDialogState = reactive<SystemDialogState>({
    visible: false,
    severity: 'info',
    title: DEFAULT_TITLE_BY_SEVERITY.info,
    content: '',
    confirmText: '我知道了',
    closable: true
})

export const useSystemDialogState = () => systemDialogState

export const showSystemDialog = (options: SystemDialogOptions) => {
    const severity = options.severity ?? 'info'
    systemDialogState.severity = severity
    systemDialogState.title = options.title?.trim() || DEFAULT_TITLE_BY_SEVERITY[severity]
    systemDialogState.content = options.content ?? ''
    systemDialogState.confirmText =
        options.confirmText === undefined ? '我知道了' : options.confirmText.trim()
    systemDialogState.closable = options.closable ?? true
    systemDialogState.visible = true
}

export const hideSystemDialog = () => {
    systemDialogState.visible = false
}
