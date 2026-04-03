import { computed, onBeforeUnmount, ref } from 'vue'
import type { FileUploadUploaderEvent } from 'primevue/fileupload'
import { createAppButtonProps } from '@/constants/button'
import {
    APP_TOOLTIP_UP_CLASS,
    PRODUCT_NAME,
    PROJECT_HOMEPAGE_URL,
    PROJECT_REPOSITORY_URL
} from '@/constants/brand'
import { checkUpdate } from '@/utils/checkUpdate'
import {
    cloneModuleConfig,
    cloneTextTabPanels,
    cloneUiConfig,
    storageDefaultValues,
    type TextTabsSnapshot
} from '@/utils/storage/schema'
import {
    appendImportedTextTabsSnapshot,
    parseImportedStoragePayload,
    stringifyImportedStoragePayload
} from '@/utils/storage/importPayload'
import { useHostThemeSync } from '@/composables/useHostThemeSync'
import { useSpamTaskRunner } from '@/composables/useSpamTaskRunner'
import { useBiliStore } from '@/stores/useBiliStore'
import { useModuleStore } from '@/stores/useModuleStore'
import { useUIStore } from '@/stores/useUIStore'
import Storage from '@/utils/storage'
import { useDiscreteAPI } from '@/utils/ui'
import { showUpdateDialog } from '@/utils/ui/updateDialog'
import { openExternalUrl } from '@/utils/ui/openExternalUrl'
import { GM_info, unsafeWindow } from '$'

type FileUploadHandle = {
    clear: () => void
}

type ResetActionId = 'resetUserSettings' | 'resetHazelSpam'
type PluginThemeOptionValue = 'light' | 'dark' | 'followHost'

const RESET_CONFIRM_WINDOW_MS = 1500

const pad2 = (value: number) => value.toString().padStart(2, '0')

const buildFileStamp = () => {
    const date = new Date()
    return [
        date.getFullYear(),
        pad2(date.getMonth() + 1),
        pad2(date.getDate()),
        '-',
        pad2(date.getHours()),
        pad2(date.getMinutes()),
        pad2(date.getSeconds())
    ].join('')
}

const triggerTextDownload = (
    content: string,
    prefix: string,
    extension: string,
    mimeType: string
) => {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` })
    const objectURL = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = objectURL
    anchor.download = `${prefix}-${buildFileStamp()}.${extension}`
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(objectURL), 0)
}

const resolveUploaderFiles = (files: File | File[]): File[] => {
    return Array.isArray(files) ? files : [files]
}

const readFileAsText = (file: File) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            resolve(typeof reader.result === 'string' ? reader.result : '')
        }
        reader.onerror = () => {
            reject(new Error('File read failed'))
        }
        reader.readAsText(file)
    })

const createTooltip = (value: string) => ({
    value,
    class: APP_TOOLTIP_UP_CLASS
})

export const useSettingView = () => {
    const moduleStore = useModuleStore()
    const uiStore = useUIStore()
    const biliStore = useBiliStore()
    const { isAnySpamRunning, stopAllSpamTasks } = useSpamTaskRunner()
    const { dialog, message, notification } = useDiscreteAPI(['dialog', 'message', 'notification'])
    const { syncThemeFromHost } = useHostThemeSync(uiStore.uiConfig)

    const APP_VERSION = GM_info.script.version

    const configImportUploadRef = ref<FileUploadHandle | null>(null)
    const pendingResetActionId = ref<ResetActionId | null>(null)
    const isCheckingUpdate = ref(false)

    const basicUploadChooseButtonProps = {
        ...createAppButtonProps({ style: 'action', tone: 'surface' }),
        icon: 'pi pi-upload'
    } as const

    const settingTooltips = {
        saveSpamStatus: '进入任何直播间后立即执行上次任务，请谨慎开启',
        autoCheckUpdate: '启动脚本后自动检查更新信息',
        hideDanmakuHistoryScrollbar:
            '隐藏直播间弹幕栏原生滚动条，仅保留滚轮和触控板滚动行为，不影响 HazelSpam 面板滚动条',
        syncHostThemeWithBrowser:
            '开启后，直播间主题跟随浏览器；若您手动调整 B 站深色模式，会自动关闭此项并保留当前主题',
        pluginTheme: `手动指定深浅模式后，Dark Reader 等扩展仍可能影响 ${PRODUCT_NAME} 表现`,
        exportAllTextTabs: '导出全部标签页及内容',
        importTextTabs: '追加导入文本',
        resetUserSettings: '重置通用和显示设置，不删除文本内容',
        resetAll: '重置 HazelSpam 并停车，同时清空当前文本独轮车内容'
    } as const

    const tooltipBindings = {
        hideDanmakuHistoryScrollbar: createTooltip(settingTooltips.hideDanmakuHistoryScrollbar),
        autoCheckUpdate: createTooltip(settingTooltips.autoCheckUpdate),
        saveSpamStatus: createTooltip(settingTooltips.saveSpamStatus),
        pluginTheme: createTooltip(settingTooltips.pluginTheme),
        syncHostThemeWithBrowser: createTooltip(settingTooltips.syncHostThemeWithBrowser),
        exportAllTextTabs: createTooltip(settingTooltips.exportAllTextTabs),
        importTextTabs: createTooltip(settingTooltips.importTextTabs),
        resetUserSettings: createTooltip(settingTooltips.resetUserSettings),
        resetAll: createTooltip(settingTooltips.resetAll)
    } as const

    const pluginThemeOptions: Array<{
        value: PluginThemeOptionValue
        icon: string
        label: string
    }> = [
        { value: 'light', icon: 'pi pi-sun', label: '浅色' },
        { value: 'dark', icon: 'pi pi-moon', label: '深色' },
        { value: 'followHost', icon: 'pi pi-desktop', label: '跟随直播间' }
    ]

    let resetActionTimer: number | null = null

    const clearResetActionTimer = () => {
        if (resetActionTimer === null) {
            return
        }

        window.clearTimeout(resetActionTimer)
        resetActionTimer = null
    }

    const disarmResetAction = () => {
        pendingResetActionId.value = null
        clearResetActionTimer()
    }

    const armResetAction = (actionId: ResetActionId) => {
        pendingResetActionId.value = actionId
        clearResetActionTimer()
        resetActionTimer = window.setTimeout(() => {
            pendingResetActionId.value = null
            resetActionTimer = null
        }, RESET_CONFIRM_WINDOW_MS)
    }

    const isResetActionArmed = (actionId: ResetActionId) => pendingResetActionId.value === actionId

    const applyDefaultUiSettings = () => {
        Object.assign(uiStore.uiConfig, cloneUiConfig(storageDefaultValues.ui))
    }

    const resolveDefaultTextInterval = () =>
        Math.max(
            1,
            Number(
                biliStore.danmakuLengthLimit || storageDefaultValues.modules.textSpam.textInterval
            )
        )

    const persistAndReloadPage = () => {
        Storage.setModuleConfig(moduleStore.moduleConfig)
        Storage.setUiConfig(uiStore.uiConfig)
        unsafeWindow.location.reload()
    }

    const applyTabSnapshot = (snapshot: TextTabsSnapshot) => {
        const tabPanels = cloneTextTabPanels(snapshot.tabPanels)
        moduleStore.moduleConfig.textSpam.tabPanels = tabPanels
        moduleStore.moduleConfig.textSpam.activeTabId = snapshot.activeTabId
        const activePanel = tabPanels.find((panel) => panel.id === snapshot.activeTabId)
        moduleStore.moduleConfig.textSpam.msg =
            activePanel?.msg ?? moduleStore.moduleConfig.textSpam.msg
    }

    const appendImportedTabSnapshot = (snapshot: TextTabsSnapshot) => {
        const mergedSnapshot = appendImportedTextTabsSnapshot(
            {
                activeTabId: moduleStore.moduleConfig.textSpam.activeTabId,
                tabPanels: cloneTextTabPanels(moduleStore.moduleConfig.textSpam.tabPanels)
            },
            snapshot
        )

        applyTabSnapshot(mergedSnapshot)
    }

    const handleSaveAllTabs = () => {
        const content = stringifyImportedStoragePayload({
            kind: 'textTabs',
            textTabs: {
                activeTabId: moduleStore.moduleConfig.textSpam.activeTabId,
                tabPanels: cloneTextTabPanels(moduleStore.moduleConfig.textSpam.tabPanels)
            }
        })

        triggerTextDownload(content, 'hazelspam-text-tabs', 'toml', 'application/toml')
    }

    const handleConfigUpload = async (event: FileUploadUploaderEvent) => {
        const [targetFile] = resolveUploaderFiles(event.files)
        if (!targetFile) {
            return
        }

        try {
            const fileContent = await readFileAsText(targetFile)
            const importedPayload = parseImportedStoragePayload(fileContent)
            if (importedPayload === null || importedPayload.kind !== 'textTabs') {
                dialog.error({
                    title: '导入失败',
                    content: '读取 TOML 失败，请检查 [[tabs]]、title 和 text 格式。',
                    closable: true
                })
                return
            }

            appendImportedTabSnapshot(importedPayload.textTabs)
            configImportUploadRef.value?.clear()
            notification.success({
                title: '导入成功',
                content: `已追加 ${importedPayload.textTabs.tabPanels.length} 个文本标签页。`,
                closable: false,
                duration: 2500
            })
        } catch {
            dialog.error({
                title: '导入失败',
                content: '读取配置文件失败，请检查文件内容是否为 TOML',
                closable: true
            })
        }
    }

    const bindConfigImportUploadRef = (element: unknown) => {
        configImportUploadRef.value = element as FileUploadHandle | null
    }

    const resetUserSettings = () => {
        moduleStore.moduleConfig.settings = cloneModuleConfig(storageDefaultValues.modules).settings
        moduleStore.moduleConfig.textSpam.textInterval = resolveDefaultTextInterval()
        applyDefaultUiSettings()
        disarmResetAction()
        persistAndReloadPage()
    }

    const resetHazelSpam = () => {
        stopAllSpamTasks()
        disarmResetAction()
        Storage.clearAll()
        unsafeWindow.location.reload()
    }

    const toggleResetAction = (actionId: ResetActionId, action: () => void) => {
        if (pendingResetActionId.value === actionId) {
            action()
            return
        }

        armResetAction(actionId)
    }

    const openExternalPage = (url: string) => {
        openExternalUrl(url)
    }

    const handleManualCheckUpdate = async () => {
        if (isCheckingUpdate.value) {
            return
        }

        isCheckingUpdate.value = true

        try {
            const result = await checkUpdate()

            if (result.status === 'latest') {
                message.info('当前已是最新版本')
                return
            }

            showUpdateDialog({
                version: result.latestVersion,
                changelogUrl: result.changelogUrl,
                downloadUrl: result.downloadUrl
            })
        } catch (error) {
            notification.error({
                title: '检查更新失败',
                content: error instanceof Error ? error.message : '请稍后重试',
                closable: false,
                duration: 4000
            })
        } finally {
            isCheckingUpdate.value = false
        }
    }

    const pluginThemeSelection = computed<PluginThemeOptionValue>({
        get: () => (uiStore.uiConfig.followBiliTheme ? 'followHost' : uiStore.uiConfig.theme),
        set: (value) => {
            if (value === 'followHost') {
                uiStore.uiConfig.followBiliTheme = true
                syncThemeFromHost()
                return
            }

            uiStore.uiConfig.followBiliTheme = false
            uiStore.uiConfig.theme = value
        }
    })

    onBeforeUnmount(() => {
        clearResetActionTimer()
    })

    return {
        APP_VERSION,
        PROJECT_HOMEPAGE_URL,
        PROJECT_REPOSITORY_URL,
        moduleStore,
        uiStore,
        isAnySpamRunning,
        stopAllSpamTasks,
        bindConfigImportUploadRef,
        isCheckingUpdate,
        basicUploadChooseButtonProps,
        pluginThemeOptions,
        pluginThemeSelection,
        tooltipBindings,
        openExternalPage,
        handleManualCheckUpdate,
        handleSaveAllTabs,
        handleConfigUpload,
        isResetActionArmed,
        toggleResetAction,
        resetUserSettings,
        resetHazelSpam
    }
}
