<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import FileUpload, { type FileUploadUploaderEvent } from 'primevue/fileupload'
import SelectButton from 'primevue/selectbutton'
import ToggleSwitch from 'primevue/toggleswitch'
import AppButton from './AppButton.vue'
import SettingDebugPanel from './SettingDebugPanel.vue'
import { createAppButtonProps } from '@/constants/button'
import { PROJECT_HOMEPAGE_URL } from '@/constants/brand'
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
import { GM_info, unsafeWindow } from '$'
import {
    APP_TOOLTIP_UP_CLASS,
    PRODUCT_AUTHOR,
    PRODUCT_DESCRIPTION,
    PRODUCT_NAME,
    PRODUCT_SUBTITLE,
    PROJECT_REPOSITORY_URL
} from '@/constants/brand'
import brandLogoUrl from '@/assets/Logo.svg?url'

const moduleStore = useModuleStore()
const uiStore = useUIStore()
const biliStore = useBiliStore()
const { isAnySpamRunning, stopAllTasks } = useSpamTaskRunner()
const { dialog, notification } = useDiscreteAPI(['dialog', 'notification'])
const { syncThemeFromHost } = useHostThemeSync(uiStore.uiConfig)

const APP_VERSION = GM_info.script.version
type FileUploadHandle = {
    clear: () => void
}
type ResetActionId = 'resetUserSettings' | 'resetHazelSpam'

const configImportUploadRef = ref<FileUploadHandle | null>(null)
const pendingResetActionId = ref<ResetActionId | null>(null)
const isCheckingUpdate = ref(false)
const basicUploadChooseButtonProps = {
    ...createAppButtonProps({ style: 'action', tone: 'surface' }),
    icon: 'pi pi-upload'
} as const
const RESET_CONFIRM_WINDOW_MS = 1500
const settingTooltips = {
    saveSpamStatus: '进入任何直播间后立即执行上次任务，请谨慎开启',
    autoCheckUpdate: '启动脚本后自动检查更新信息',
    danmakuActions: '在原生弹幕列表中加入复制按钮和复读按钮。该功能只支持文字弹幕',
    hideDanmakuHistoryScrollbar:
        '隐藏直播间弹幕栏原生滚动条，仅保留滚轮和触控板滚动行为，不影响 HazelSpam 面板滚动条',
    syncHostThemeWithBrowser:
        '开启后，直播间主题跟随浏览器；若您手动调整 B 站深色模式，会自动关闭此项并保留当前主题',
    pluginTheme: `手动指定深浅模式后，Dark Reader 等扩展仍可能影响 ${PRODUCT_NAME} 表现`
} as const

type PluginThemeOptionValue = 'light' | 'dark' | 'followHost'

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

const openExternalPage = (url: string) => {
    unsafeWindow.open(url)
}

const handleManualCheckUpdate = async () => {
    if (isCheckingUpdate.value) {
        return
    }

    isCheckingUpdate.value = true

    try {
        const result = await checkUpdate()

        if (result.status === 'latest') {
            notification.info({
                title: '最新版本',
                content: '您正在使用最新版本',
                closable: false,
                duration: 3000
            })
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
    Object.assign(uiStore.uiConfig, cloneUiConfig(storageDefaultValues.ui), {
        isShowPanel: true,
        activeMenuIndex: 'SettingView'
    })
}

const resolveDefaultTextInterval = () =>
    Math.max(
        1,
        Number(biliStore.danmuLengthLimit || storageDefaultValues.modules.textSpam.textInterval)
    )

const persistAndReloadPage = () => {
    Storage.setModuleConfig(moduleStore.moduleConfig)
    Storage.setUiConfig(uiStore.uiConfig)
    unsafeWindow.location.reload()
}

const resetUserSettings = () => {
    moduleStore.moduleConfig.settings = cloneModuleConfig(storageDefaultValues.modules).settings
    moduleStore.moduleConfig.textSpam.textInterval = resolveDefaultTextInterval()
    applyDefaultUiSettings()
    disarmResetAction()
    persistAndReloadPage()
}

const resetHazelSpam = () => {
    stopAllTasks()
    const defaultModuleConfig = cloneModuleConfig(storageDefaultValues.modules)
    defaultModuleConfig.textSpam.textInterval = resolveDefaultTextInterval()
    moduleStore.moduleConfig.textSpam = defaultModuleConfig.textSpam
    moduleStore.moduleConfig.emotionSpam = defaultModuleConfig.emotionSpam
    moduleStore.moduleConfig.settings = defaultModuleConfig.settings
    applyDefaultUiSettings()
    disarmResetAction()
    persistAndReloadPage()
}

const toggleResetAction = (actionId: ResetActionId, action: () => void) => {
    if (pendingResetActionId.value === actionId) {
        action()
        return
    }

    armResetAction(actionId)
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
    } catch {
        dialog.error({
            title: '导入失败',
            content: '读取配置文件失败，请检查文件内容是否为 TOML',
            closable: true
        })
    }
}

const handleFollowThemeChange = (follow: boolean) => {
    if (follow) {
        syncThemeFromHost()
    }
}

const pluginThemeOptions: Array<{
    value: PluginThemeOptionValue
    icon: string
    label: string
}> = [
    { value: 'light', icon: 'pi pi-sun', label: '浅色' },
    { value: 'dark', icon: 'pi pi-moon', label: '深色' },
    { value: 'followHost', icon: 'pi pi-desktop', label: '跟随直播间' }
]

const pluginThemeSelection = computed<PluginThemeOptionValue>({
    get: () => (uiStore.uiConfig.followBiliTheme ? 'followHost' : uiStore.uiConfig.theme),
    set: (value) => {
        if (value === 'followHost') {
            uiStore.uiConfig.followBiliTheme = true
            handleFollowThemeChange(true)
            return
        }

        uiStore.uiConfig.followBiliTheme = false
        uiStore.uiConfig.theme = value
    }
})

onBeforeUnmount(() => {
    clearResetActionTimer()
})
</script>

<template>
    <div class="setting-view">
        <header class="setting-view__header">
            <h2>{{ PRODUCT_NAME }} 设置</h2>
            <p>您可以调整 {{ PRODUCT_NAME }} 设置</p>
        </header>

        <div class="settings-layout">
            <div class="settings-column-stack settings-column-stack--left">
                <section class="hazelspam-panel-card setting-module">
                    <header class="setting-module__head">
                        <h3>通用</h3>
                    </header>
                    <div class="setting-control-grid setting-control-grid--two">
                        <div class="setting-control-item setting-control-item--switch">
                            <label class="setting-control-label">移除弹幕栏滚动条</label>
                            <span
                                class="setting-control-trigger setting-control-trigger--hint"
                                v-tooltip.bottom="{
                                    value: settingTooltips.hideDanmakuHistoryScrollbar,
                                    class: APP_TOOLTIP_UP_CLASS
                                }"
                            >
                                <ToggleSwitch
                                    v-model="uiStore.uiConfig.hideDanmakuHistoryScrollbar"
                                />
                            </span>
                        </div>

                        <div class="setting-control-item setting-control-item--switch">
                            <label class="setting-control-label">弹幕复制和弹幕复读按钮</label>
                            <span
                                class="setting-control-trigger setting-control-trigger--hint"
                                v-tooltip.bottom="{
                                    value: settingTooltips.danmakuActions,
                                    class: APP_TOOLTIP_UP_CLASS
                                }"
                            >
                                <ToggleSwitch
                                    v-model="moduleStore.moduleConfig.settings.danmakuActions.enable"
                                />
                            </span>
                        </div>

                        <div class="setting-control-item setting-control-item--switch">
                            <label class="setting-control-label">自动获取更新信息</label>
                            <span
                                class="setting-control-trigger setting-control-trigger--hint"
                                v-tooltip.bottom="{
                                    value: settingTooltips.autoCheckUpdate,
                                    class: APP_TOOLTIP_UP_CLASS
                                }"
                            >
                                <ToggleSwitch
                                    v-model="
                                        moduleStore.moduleConfig.settings.autoCheckUpdate.enable
                                    "
                                />
                            </span>
                        </div>

                        <div class="setting-control-item setting-control-item--switch">
                            <label class="setting-control-label">打开直播间后自动发车</label>
                            <span
                                class="setting-control-trigger setting-control-trigger--hint"
                                v-tooltip.bottom="{
                                    value: settingTooltips.saveSpamStatus,
                                    class: APP_TOOLTIP_UP_CLASS
                                }"
                            >
                                <ToggleSwitch
                                    v-model="moduleStore.moduleConfig.settings.saveSpamStatus.enable"
                                />
                            </span>
                        </div>
                    </div>

                    <hr class="setting-module-divider" role="separator" />

                    <div class="setting-module-section">
                        <header class="setting-module__head setting-module__head--compact">
                            <h3>独轮车文本配置</h3>
                            <p class="setting-module__description">快速配置文本</p>
                        </header>
                        <div class="setting-control-grid setting-control-grid--single">
                            <div class="setting-control-item">
                                <span
                                    class="setting-control-trigger setting-control-trigger--block setting-control-trigger--hint"
                                    v-tooltip.bottom="{
                                        value: '导出全部标签页及内容',
                                        class: APP_TOOLTIP_UP_CLASS
                                    }"
                                >
                                    <AppButton
                                        app-style="action"
                                        icon="pi pi-save"
                                        label="导出全部文本"
                                        tone="primary"
                                        @click="handleSaveAllTabs"
                                    />
                                </span>
                            </div>

                            <div class="setting-control-item">
                                <span
                                    class="setting-control-trigger setting-control-trigger--block setting-control-trigger--hint"
                                    v-tooltip.bottom="{
                                        value: '追加导入文本',
                                        class: APP_TOOLTIP_UP_CLASS
                                    }"
                                >
                                    <FileUpload
                                        ref="configImportUploadRef"
                                        mode="basic"
                                        class="hazelspam-fileupload"
                                        name="hazelspam-text-tabs-upload"
                                        accept=".toml,text/plain,application/toml"
                                        :maxFileSize="1024 * 1024 * 2"
                                        :auto="true"
                                        :customUpload="true"
                                        chooseLabel="导入文本 (.toml)"
                                        :chooseButtonProps="basicUploadChooseButtonProps"
                                        @uploader="handleConfigUpload"
                                    />
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                <section class="hazelspam-panel-card setting-module">
                    <header class="setting-module__head">
                        <h3>显示</h3>
                    </header>
                    <div class="setting-control-grid setting-control-grid--single">
                        <div class="setting-control-item">
                            <label class="setting-control-label">{{ PRODUCT_NAME }} 深浅主题</label>
                            <div
                                class="setting-control-trigger setting-control-trigger--block setting-control-trigger--hint"
                                v-tooltip.bottom="{
                                    value: settingTooltips.pluginTheme,
                                    class: APP_TOOLTIP_UP_CLASS
                                }"
                            >
                                <SelectButton
                                    v-model="pluginThemeSelection"
                                    class="setting-theme-select"
                                    :options="pluginThemeOptions"
                                    optionValue="value"
                                    :allowEmpty="false"
                                >
                                    <template #option="{ option }">
                                        <span class="setting-theme-option">
                                            <i :class="option.icon" aria-hidden="true"></i>
                                            <span>{{ option.label }}</span>
                                        </span>
                                    </template>
                                </SelectButton>
                            </div>
                        </div>

                        <div class="setting-control-item setting-control-item--switch">
                            <label class="setting-control-label">直播间深浅主题与浏览器同步</label>
                            <span
                                class="setting-control-trigger setting-control-trigger--hint"
                                v-tooltip.bottom="{
                                    value: settingTooltips.syncHostThemeWithBrowser,
                                    class: APP_TOOLTIP_UP_CLASS
                                }"
                            >
                                <ToggleSwitch v-model="uiStore.uiConfig.syncHostThemeWithBrowser" />
                            </span>
                        </div>
                    </div>
                </section>
            </div>

            <div class="settings-column-stack settings-column-stack--right">
                <section class="hazelspam-panel-card setting-module setting-module--about">
                    <header class="setting-module__head">
                        <h3>关于</h3>
                    </header>

                    <div class="about-content">
                        <div class="about-main">
                            <div class="about-logo-shell" aria-hidden="true">
                                <img class="about-logo-image" :src="brandLogoUrl" alt="" />
                            </div>
                            <div class="about-details">
                                <p class="about-name">{{ PRODUCT_NAME }}</p>
                                <p class="about-subtitle">{{ PRODUCT_SUBTITLE }}</p>
                                <p class="about-slogan">“{{ PRODUCT_DESCRIPTION }}”</p>
                                <p class="about-meta">@{{ PRODUCT_AUTHOR }}</p>
                                <p class="about-meta">版本 {{ APP_VERSION }}</p>
                            </div>
                        </div>

                        <div class="about-actions">
                            <AppButton
                                app-style="action"
                                icon="pi pi-github"
                                :label="`${PRODUCT_NAME} 的 GitHub 存储库`"
                                tone="primary"
                                @click="openExternalPage(PROJECT_REPOSITORY_URL)"
                            />
                            <AppButton
                                app-style="action"
                                icon="pi pi-crown"
                                :label="`${PRODUCT_NAME} 的主页`"
                                tone="surface"
                                @click="openExternalPage(PROJECT_HOMEPAGE_URL)"
                            />
                            <AppButton
                                app-style="action"
                                icon="pi pi-sync"
                                label="检测更新"
                                tone="surface"
                                :disabled="isCheckingUpdate"
                                @click="handleManualCheckUpdate"
                            />
                        </div>
                    </div>

                    <hr class="setting-module-divider" role="separator" />

                    <div class="setting-module-section">
                        <header class="setting-module__head setting-module__head--compact">
                            <h3>重置</h3>
                            <p class="setting-module__description">
                                再次点击同一按钮确认高风险操作
                            </p>
                        </header>
                        <div class="setting-control-grid setting-control-grid--single">
                            <div class="setting-control-item">
                                <span
                                    class="setting-control-trigger setting-control-trigger--block setting-control-trigger--hint"
                                    v-tooltip.bottom="{
                                        value: '重置通用和显示设置，不删除文本内容',
                                        class: APP_TOOLTIP_UP_CLASS
                                    }"
                                >
                                    <AppButton
                                        app-style="action"
                                        icon="pi pi-ban"
                                        :label="
                                            isResetActionArmed('resetUserSettings')
                                                ? '再次点击确认重置用户设置'
                                                : '重置用户设置'
                                        "
                                        :tone="
                                            isResetActionArmed('resetUserSettings')
                                                ? 'danger'
                                                : 'dangerSurface'
                                        "
                                        @click="
                                            toggleResetAction('resetUserSettings', resetUserSettings)
                                        "
                                    />
                                </span>
                            </div>

                            <div class="setting-control-item">
                                <span
                                    class="setting-control-trigger setting-control-trigger--block setting-control-trigger--hint"
                                    v-tooltip.bottom="{
                                        value: '重置 HazelSpam 并停车，同时清空当前文本独轮车内容',
                                        class: APP_TOOLTIP_UP_CLASS
                                    }"
                                >
                                    <AppButton
                                        app-style="action"
                                        icon="pi pi-ban"
                                        :label="
                                            isResetActionArmed('resetHazelSpam')
                                                ? '再次点击确认重置 HazelSpam'
                                                : '重置 HazelSpam 并删除所有文本'
                                        "
                                        :tone="
                                            isResetActionArmed('resetHazelSpam')
                                                ? 'danger'
                                                : 'dangerSurface'
                                        "
                                        @click="toggleResetAction('resetHazelSpam', resetHazelSpam)"
                                    />
                                </span>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <SettingDebugPanel
                v-if="uiStore.isSettingDebugModuleVisible"
                class="settings-debug-slot"
            />
        </div>

        <div class="hazelspam-panel-actions">
            <AppButton
                tone="surface"
                class="setting-close-btn"
                @click="uiStore.uiConfig.isShowPanel = false"
            >
                关闭此窗口
            </AppButton>
            <AppButton v-if="isAnySpamRunning" tone="danger" @click="stopAllTasks">停车</AppButton>
        </div>
    </div>
</template>

<style scoped>
.setting-view {
    display: flex;
    flex-direction: column;
    gap: var(--hazelspam-space-xl);
    height: 100%;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: var(--hazelspam-space-2xs);
}

.setting-view__header h2 {
    margin: 0;
    font-size: var(--hazelspam-type-size-h2);
    font-weight: var(--hazelspam-type-weight-semibold);
}

.setting-view__header p {
    margin: var(--hazelspam-space-xs) 0 0;
    font-size: var(--hazelspam-type-size-body-sm);
    color: var(--hazelspam-color-text-muted, var(--p-text-muted-color));
}

.settings-layout {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--hazelspam-space-xl);
    flex: 1;
    min-height: 0;
}

.settings-column-stack {
    display: grid;
    gap: var(--hazelspam-space-xl);
    min-height: 0;
}

.settings-column-stack--left {
    grid-template-rows: max-content minmax(0, 1fr);
}

.settings-column-stack--right {
    grid-template-rows: minmax(0, 1fr);
}

.hazelspam-panel-card {
    border: 1px solid var(--hazelspam-color-surface-border, var(--p-content-border-color));
    border-radius: var(--hazelspam-panel-card-radius);
    padding: var(--hazelspam-space-xl);
}

.setting-module {
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: var(--hazelspam-space-lg);
}

.setting-module__head {
    display: flex;
    flex-direction: column;
    gap: var(--hazelspam-space-md);
}

.setting-module__head h3 {
    margin: 0;
    font-size: var(--hazelspam-type-size-h4);
    font-weight: var(--hazelspam-type-weight-semibold);
}

.setting-module__head--compact h3 {
    font-size: var(--hazelspam-type-size-h5, var(--hazelspam-type-size-h4));
}

.setting-module__description {
    margin: 0;
    font-size: var(--hazelspam-type-size-body-sm);
    color: var(--hazelspam-color-text-muted, var(--p-text-muted-color));
    line-height: 1.45;
}

.setting-control-grid {
    display: grid;
    align-items: start;
    gap: var(--hazelspam-space-3xl);
}

.setting-control-grid--two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
}

.setting-control-grid--single {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--hazelspam-space-md);
}

.setting-control-item {
    display: flex;
    flex-direction: column;
    gap: var(--hazelspam-space-sm);
    min-width: 0;
}

.setting-control-item--switch {
    align-items: flex-start;
}

.setting-control-item--hint {
    cursor: help;
}

.setting-control-label {
    font-size: var(--hazelspam-type-size-body-sm);
    font-weight: var(--hazelspam-type-weight-medium);
    color: var(--hazelspam-color-text-muted, var(--p-text-muted-color));
}

.setting-control-trigger {
    align-self: flex-start;
    width: fit-content;
    max-width: 100%;
}

.setting-control-trigger--block {
    width: 100%;
}

.setting-control-trigger--hint {
    cursor: help;
}

.setting-control-item small {
    color: var(--hazelspam-color-text-muted, var(--p-text-muted-color));
    font-size: var(--hazelspam-type-size-caption);
}

.setting-empty-control {
    width: 100%;
    min-height: 31px;
    border: 1px dashed
        color-mix(
            in srgb,
            var(--hazelspam-color-surface-border, var(--p-content-border-color)) 90%,
            transparent
        );
    border-radius: var(--hazelspam-collection-radius);
    background: color-mix(
        in srgb,
        var(--hazelspam-color-surface-border, var(--p-content-border-color)) 10%,
        transparent
    );
}

.setting-theme-select {
    width: 100%;
    display: flex;
    gap: var(--hazelspam-space-xs);
    padding: var(--hazelspam-space-xs);
    border: 1px solid var(--hazelspam-color-surface-border, var(--p-content-border-color));
    border-radius: var(--hazelspam-collection-radius);
    background: transparent;
}

.setting-theme-select :deep(.p-togglebutton) {
    flex: 1;
    min-width: 0;
    border: 1px solid transparent;
    border-radius: calc(var(--hazelspam-collection-radius) - var(--hazelspam-space-xs));
    background: transparent;
    color: var(--hazelspam-color-text-primary, var(--p-text-color));
    box-shadow: none;
    transition:
        background var(--hazelspam-motion-duration-fast, 0.12s)
            var(--hazelspam-motion-ease-standard, ease),
        color var(--hazelspam-motion-duration-fast, 0.12s)
            var(--hazelspam-motion-ease-standard, ease),
        border-color var(--hazelspam-motion-duration-fast, 0.12s)
            var(--hazelspam-motion-ease-standard, ease),
        box-shadow var(--hazelspam-motion-duration-fast, 0.12s)
            var(--hazelspam-motion-ease-standard, ease);
}

.setting-theme-select :deep(.p-togglebutton .p-togglebutton-content) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-width: 0;
    padding: 0;
    border-radius: inherit;
    background: transparent;
    color: inherit;
}

.setting-theme-select :deep(.p-togglebutton .p-togglebutton-content *),
.setting-theme-select :deep(.p-togglebutton .p-togglebutton-label),
.setting-theme-select :deep(.p-togglebutton .p-togglebutton-icon) {
    color: inherit;
}

.setting-theme-select :deep(.p-togglebutton:hover) {
    background: color-mix(in srgb, var(--hazelspam-color-accent) 10%, transparent);
    border-color: var(--hazelspam-color-accent);
    color: var(--hazelspam-color-accent);
}

.setting-theme-select :deep(.p-togglebutton.p-togglebutton-checked),
.setting-theme-select :deep(.p-togglebutton[data-p-checked='true']) {
    background: var(--hazelspam-color-accent);
    border-color: var(--hazelspam-color-accent);
    color: var(--hazelspam-color-accent-contrast, #ffffff);
    box-shadow: none;
}

.setting-theme-select :deep(.p-togglebutton.p-togglebutton-checked:hover),
.setting-theme-select :deep(.p-togglebutton[data-p-checked='true']:hover) {
    background: var(--hazelspam-color-accent-hover, var(--hazelspam-color-accent));
    border-color: var(--hazelspam-color-accent-hover, var(--hazelspam-color-accent));
    color: var(--hazelspam-color-accent-contrast, #ffffff);
}

.setting-theme-select :deep(.p-togglebutton:focus-visible) {
    box-shadow: var(
        --hazelspam-focus-ring-shadow,
        var(
            --p-focus-ring-shadow,
            0 0 0 3px color-mix(in srgb, var(--hazelspam-color-accent) 18%, transparent)
        )
    );
    outline: var(--hazelspam-focus-ring-width, var(--p-focus-ring-width, 2px))
        var(--hazelspam-focus-ring-style, var(--p-focus-ring-style, solid))
        var(--hazelspam-focus-ring-color, var(--p-focus-ring-color, var(--hazelspam-color-accent)));
    outline-offset: var(--hazelspam-focus-ring-offset, var(--p-focus-ring-offset, 1px));
}

.setting-theme-option {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--hazelspam-space-xs);
    width: 100%;
    font-size: var(--hazelspam-type-size-caption);
    font-weight: var(--hazelspam-type-weight-medium);
}

.setting-theme-option span {
    font-size: inherit;
}

.setting-theme-option i {
    font-size: var(--hazelspam-type-size-caption);
    color: inherit;
}

.setting-control-item--placeholder {
    min-height: 0;
}

.setting-module--about {
    display: flex;
    flex-direction: column;
    gap: var(--hazelspam-space-lg);
}

.about-content {
    margin-top: 0;
    margin-bottom: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    gap: var(--hazelspam-space-xl);
    min-height: 0;
}

.about-main {
    width: 100%;
    max-width: 460px;
    display: grid;
    grid-template-columns: 100px minmax(0, 1fr);
    gap: var(--hazelspam-space-xl);
    align-items: start;
    justify-content: center;
}

.about-logo-shell {
    align-self: center;
    width: 100px;
    height: 100px;
    border: 1px solid var(--hazelspam-color-surface-border, var(--p-content-border-color));
    border-radius: var(--hazelspam-radius-lg);
    background: color-mix(in srgb, var(--hazelspam-color-brand, #89b4c7) 12%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--hazelspam-color-brand, #89b4c7) 25%, transparent);
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--hazelspam-space-sm);
}

.about-logo-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
}

.about-details {
    display: flex;
    flex-direction: column;
    gap: var(--hazelspam-space-xs);
    min-width: 0;
    padding-top: var(--hazelspam-space-xs);
}

.about-details p {
    margin: 0;
}

.about-name {
    font-size: var(--hazelspam-type-size-h3);
    font-weight: var(--hazelspam-type-weight-semibold);
    line-height: 1.35;
}

.about-subtitle {
    font-size: var(--hazelspam-type-size-body-sm);
    color: var(--hazelspam-color-text-muted, var(--p-text-muted-color));
}

.about-slogan {
    font-size: var(--hazelspam-type-size-body-sm);
    color: var(--hazelspam-color-accent, var(--hazelspam-color-brand, #6a9db2));
    font-weight: var(--hazelspam-type-weight-medium);
}

.about-meta {
    font-size: var(--hazelspam-type-size-body-sm);
    color: var(--hazelspam-color-text-muted, var(--p-text-muted-color));
}

.about-actions {
    width: 100%;
    max-width: 460px;
    display: flex;
    flex-direction: column;
    gap: var(--hazelspam-space-md);
}

.setting-module-divider {
    margin: var(--hazelspam-space-sm) 0;
    border: 0;
    border-top: 1px solid
        color-mix(
            in srgb,
            var(--hazelspam-color-surface-border, var(--p-content-border-color)) 88%,
            transparent
        );
}

.setting-module-section {
    display: flex;
    flex-direction: column;
    gap: var(--hazelspam-space-md);
}

.settings-debug-slot {
    min-height: 0;
}

@media (max-width: 1180px) {
    .settings-layout {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        grid-template-areas:
            'left right'
            'debug debug';
    }

    .settings-column-stack--left {
        grid-area: left;
    }

    .settings-column-stack--right {
        grid-area: right;
    }

    .settings-debug-slot {
        grid-area: debug;
    }
}

@media (max-width: 760px) {
    .settings-layout {
        grid-template-columns: 1fr;
        grid-template-areas:
            'left'
            'right'
            'debug';
    }

    .setting-control-grid--two {
        grid-template-columns: 1fr;
    }

    .about-main {
        grid-template-columns: 1fr;
        justify-items: center;
        text-align: center;
    }

    .about-logo-shell {
        width: 100px;
        height: 100px;
    }

    .about-details {
        align-items: center;
    }
}
</style>
