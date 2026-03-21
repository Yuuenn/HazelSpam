<script setup lang="ts">
import AppButton from './AppButton.vue'
import { useSettingDebugPanel } from '@/composables/useSettingDebugPanel'

const {
    triggerDialog,
    triggerUpdateDialog,
    triggerMessageToast,
    triggerNotificationToast,
    inspectEmotionTexts,
    inspectStoredConfig,
    appendTestPackage,
    toggleDangerAction,
    isDangerActionArmed
} = useSettingDebugPanel()

const appendTestPackageLabel = () =>
    isDangerActionArmed('append-test-package') ? '再次点击追加测试表情包' : '追加测试表情包'
</script>

<template>
    <section class="hazelspam-panel-card setting-module setting-module--debug setting-debug-panel">
        <header class="setting-module__head">
            <h3>调试</h3>
            <p class="setting-module__description">调试模式</p>
        </header>

        <div class="debug-button-stack">
            <AppButton
                app-style="action"
                size="small"
                tone="surface"
                label="触发弹窗"
                @click="triggerDialog"
            />
            <AppButton
                app-style="action"
                size="small"
                tone="surface"
                label="触发更新"
                @click="triggerUpdateDialog"
            />
            <AppButton
                app-style="action"
                size="small"
                tone="surface"
                label="触发消息 Toast"
                @click="triggerMessageToast"
            />
            <AppButton
                app-style="action"
                size="small"
                tone="surface"
                label="触发通知 Toast"
                @click="triggerNotificationToast"
            />
            <AppButton
                app-style="action"
                size="small"
                :tone="isDangerActionArmed('append-test-package') ? 'dangerSurface' : 'surface'"
                :label="appendTestPackageLabel()"
                @click="toggleDangerAction('append-test-package', appendTestPackage)"
            />
            <AppButton
                app-style="action"
                size="small"
                tone="surface"
                label="输出表情字段到 Console"
                @click="inspectEmotionTexts"
            />
            <AppButton
                app-style="action"
                size="small"
                tone="surface"
                label="输出配置快照到 Console"
                @click="inspectStoredConfig"
            />
        </div>
    </section>
</template>

<style scoped>
.setting-debug-panel {
    width: 100%;
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

.setting-module__description {
    margin: 0;
    font-size: var(--hazelspam-type-size-body-sm);
    color: var(--hazelspam-color-text-muted, var(--p-text-muted-color));
    line-height: 1.45;
}

.debug-button-stack {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: var(--hazelspam-space-md);
}

.debug-button-stack :deep(.hazelspam-app-button) {
    width: 100%;
}
</style>
