type DebugNotifyApi = {
    message: (
        content?: string,
        severity?: 'success' | 'error' | 'warning' | 'info',
        duration?: number
    ) => {
        ok: boolean
        kind: 'message'
        delivered: boolean
        hasToastService: boolean
        pendingCount: number
        group: string
    }
    notification: (
        content?: string,
        title?: string,
        severity?: 'success' | 'error' | 'warning' | 'info',
        duration?: number
    ) => {
        ok: boolean
        kind: 'notification'
        delivered: boolean
        hasToastService: boolean
        pendingCount: number
        group: string
    }
    updateDialog: (options?: {
        version?: string
        downloadUrl?: string
        changelogUrl?: string
    }) => {
        ok: boolean
        kind: 'update-dialog'
        shown: boolean
        version: string
        hasDownloadUrl: boolean
    }
    dialog: (
        content?: string,
        title?: string,
        severity?: 'success' | 'error' | 'warning' | 'info'
    ) => {
        ok: boolean
        kind: 'dialog'
        shown: boolean
        severity: 'success' | 'error' | 'warning' | 'info'
        title: string
    }
    clear: () => {
        ok: boolean
        kind: 'clear'
        delivered: boolean
        hasToastService: boolean
        pendingCount: number
    }
    status: () => {
        hasToastService: boolean
        pendingCount: number
        hasNotifyApi: boolean
    }
    emotionTexts: (samplePerPackage?: number) => {
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
    appendGeneralPackage: (samplePerPackage?: number) => {
        ok: boolean
        packageCount: number
        appendedPackageId: number | null
        appendedPackageName: string
        emoticonCount: number
        reason?: string
    }
}

declare global {
    interface Window {
        BilibiliLive: {
            INIT_TIME: number
            RND: number
            UID: number
            ROOMID: number
            ANCHOR_UID: number
            COLORFUL_LOGGER: boolean
            SHORT_ROOMID: number
            AREA_ID: number
            PARENT_AREA_ID: number
        }
        bililiveThemeV2: {
            getTheme: () => 'light' | 'dark'
            changeTheme: (theme: 'light' | 'dark') => void
            initThemeWithCSR: (theme: 'light' | 'dark') => void
        }
        __HAZELSPAM_NOTIFY__?: DebugNotifyApi
    }
}

export {}
