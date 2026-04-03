<script setup lang="ts">
import FileUpload from 'primevue/fileupload'
import SelectButton from 'primevue/selectbutton'
import ToggleSwitch from 'primevue/toggleswitch'
import AppButton from './AppButton.vue'
import { useSettingView } from '@/composables/useSettingView'
import {
    PRODUCT_AUTHOR,
    PRODUCT_DESCRIPTION,
    PRODUCT_NAME,
    PRODUCT_SUBTITLE,
    PROJECT_REPOSITORY_URL,
    PROJECT_HOMEPAGE_URL
} from '@/constants/brand'
import brandLogoUrl from '@/assets/Icon.svg?url'

const {
    APP_VERSION,
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
} = useSettingView()
</script>

<template>
    <div class="setting-view hazelspam-responsive-scope">
        <header class="setting-view__header">
            <h2>{{ PRODUCT_NAME }} 设置</h2>
            <p>您可以调整 {{ PRODUCT_NAME }} 设置</p>
        </header>

        <div class="settings-layout hazelspam-responsive-fit-grid">
            <div class="settings-column-stack settings-column-stack--left">
                <section class="hazelspam-panel-card setting-module">
                    <header class="setting-module__head">
                        <h3>通用</h3>
                    </header>
                    <div
                        class="setting-control-grid setting-control-grid--two hazelspam-responsive-fit-grid"
                    >
                        <div class="setting-control-item setting-control-item--switch">
                            <label class="setting-control-label">移除弹幕栏滚动条</label>
                            <span
                                class="setting-control-trigger setting-control-trigger--hint"
                                v-tooltip.bottom="tooltipBindings.hideDanmakuHistoryScrollbar"
                            >
                                <ToggleSwitch
                                    v-model="uiStore.uiConfig.hideDanmakuHistoryScrollbar"
                                />
                            </span>
                        </div>

                        <div class="setting-control-item setting-control-item--switch">
                            <label class="setting-control-label">自动获取更新信息</label>
                            <span
                                class="setting-control-trigger setting-control-trigger--hint"
                                v-tooltip.bottom="tooltipBindings.autoCheckUpdate"
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
                                v-tooltip.bottom="tooltipBindings.saveSpamStatus"
                            >
                                <ToggleSwitch
                                    v-model="
                                        moduleStore.moduleConfig.settings.saveSpamStatus.enable
                                    "
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
                                    v-tooltip.bottom="tooltipBindings.exportAllTextTabs"
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
                                    v-tooltip.bottom="tooltipBindings.importTextTabs"
                                >
                                    <FileUpload
                                        :ref="bindConfigImportUploadRef"
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
                                v-tooltip.bottom="tooltipBindings.pluginTheme"
                            >
                                <SelectButton
                                    v-model="pluginThemeSelection"
                                    class="setting-theme-select"
                                    :options="pluginThemeOptions"
                                    optionLabel="label"
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
                                v-tooltip.bottom="tooltipBindings.syncHostThemeWithBrowser"
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
                        <div class="about-main hazelspam-responsive-split">
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
                                    v-tooltip.bottom="tooltipBindings.resetUserSettings"
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
                                            toggleResetAction(
                                                'resetUserSettings',
                                                resetUserSettings
                                            )
                                        "
                                    />
                                </span>
                            </div>

                            <div class="setting-control-item">
                                <span
                                    class="setting-control-trigger setting-control-trigger--block setting-control-trigger--hint"
                                    v-tooltip.bottom="tooltipBindings.resetAll"
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

            <!-- Hidden debug panel is intentionally not mounted in the settings UI for now.
                 Keep SettingDebugPanel/useSettingDebugPanel and the reveal state machine for
                 future re-enable, but keep the current layout free of debug-only content. -->
        </div>

        <div class="hazelspam-panel-actions setting-actions">
            <AppButton
                tone="surface"
                class="setting-close-btn"
                @click="uiStore.uiConfig.isShowPanel = false"
            >
                关闭此窗口
            </AppButton>
            <AppButton v-if="isAnySpamRunning" tone="danger" @click="stopAllSpamTasks"
                >停车</AppButton
            >
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
    --hazelspam-responsive-grid-gap: var(--hazelspam-space-xl);
    --hazelspam-responsive-fit-min: 380px;
    align-items: stretch;
    gap: var(--hazelspam-space-xl);
    flex: 1;
    min-height: 0;
    overflow: hidden;
}

.settings-column-stack {
    display: grid;
    grid-auto-rows: max-content;
    align-content: start;
    align-self: stretch;
    gap: var(--hazelspam-space-xl);
    min-width: 0;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
}

.settings-column-stack--left {
    grid-template-rows: max-content max-content;
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
    --hazelspam-responsive-grid-gap: var(--hazelspam-space-3xl);
    --hazelspam-responsive-fit-min: 240px;
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
    overflow: visible;
}

.about-main {
    width: 100%;
    max-width: 460px;
    --hazelspam-responsive-split-columns: 120px minmax(0, 1fr);
    align-items: start;
    justify-content: stretch;
    overflow: visible;
}

.about-logo-shell {
    align-self: center;
    width: 120px;
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--hazelspam-radius-xl);
    overflow: visible;
    transition:
        background var(--hazelspam-motion-duration-normal, 0.16s)
            var(--hazelspam-motion-ease-standard, ease),
        box-shadow var(--hazelspam-motion-duration-normal, 0.16s)
            var(--hazelspam-motion-ease-standard, ease);
}

.about-logo-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    filter: drop-shadow(
            0 4px 9px
                color-mix(in srgb, var(--hazelspam-color-shadow-outer, #000000) 14%, transparent)
        )
        drop-shadow(
            0 1px 0
                color-mix(in srgb, var(--hazelspam-color-shadow-inner, #ffffff) 44%, transparent)
        );
    transition:
        filter var(--hazelspam-motion-duration-normal, 0.16s)
            var(--hazelspam-motion-ease-standard, ease),
        transform var(--hazelspam-motion-duration-normal, 0.16s)
            var(--hazelspam-motion-ease-standard, ease);
}

:global(.hazelspam-dark .setting-module--about .about-logo-shell) {
    background: transparent;
    box-shadow: none;
}

:global(.hazelspam-dark .setting-module--about .about-logo-image) {
    filter: brightness(0.96) saturate(0.98)
        drop-shadow(
            0 3px 8px
                color-mix(in srgb, var(--hazelspam-color-shadow-outer, #000000) 30%, transparent)
        )
        drop-shadow(
            0 1px 0
                color-mix(in srgb, var(--hazelspam-color-shadow-inner, #ffffff) 16%, transparent)
        );
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

.setting-actions {
    flex: 0 0 auto;
}

@container hazelspam-panel (max-width: 760px) {
    .settings-layout {
        flex: 0 0 auto;
        align-content: start;
        overflow: visible;
    }

    .settings-column-stack--left,
    .settings-column-stack--right {
        grid-template-rows: none;
        overflow: visible;
    }

    .about-content {
        align-items: stretch;
    }

    .about-main,
    .about-actions {
        max-width: none;
    }

    .about-logo-shell {
        align-self: flex-start;
    }

    .about-details {
        padding-top: 0;
    }
}
</style>
