<script setup lang="ts">
import { ref } from 'vue'
import Avatar from 'primevue/avatar'
import Ripple from 'primevue/ripple'
import Textarea from 'primevue/textarea'
import ToggleSwitch from 'primevue/toggleswitch'
import AppButton from './AppButton.vue'
import AppDialog from './AppDialog.vue'
import { APP_TOOLTIP_UP_CLASS, PRODUCT_NAME } from '@/constants/brand'
import { useCrybabyView, type CrybabyEditorAction } from '@/composables/useCrybabyView'

const vRipple = Ripple
const emojiDialogVisible = ref(false)
const injectToolbarTooltipBinding = {
    value: '在弹幕工具栏中新增 Crybaby 功能',
    class: APP_TOOLTIP_UP_CLASS
}
const insertEmojiTooltipBinding = {
    value: '插入表情',
    class: APP_TOOLTIP_UP_CLASS
}

const {
    isNativeComposerReady,
    composerLengthLimit,
    composerCharacterCount,
    composerText,
    generalEmojiEmoticons,
    editorActions,
    isSendDisabled,
    isCrybabyModeEnabled,
    insertEmojiToComposer,
    handleSendCurrentDanmaku,
    closePanel
} = useCrybabyView()

const handleEditorActionClick = (action: CrybabyEditorAction) => {
    if (action.disabled) {
        action.onDisabledClick?.()
        return
    }
    action.onClick()
}
</script>

<template>
    <div class="crybaby-view hazelspam-responsive-scope">
        <header class="crybaby-view__header">
            <h2>{{ PRODUCT_NAME }} Crybaby 增强模式</h2>
            <p>准备弹幕、激活 Crybaby——然后您可以连点发送按钮</p>
        </header>

        <section class="hazelspam-panel-card control-panel">
            <h3>控制面板</h3>
            <div class="control-grid hazelspam-responsive-grid" data-hazelspam-grid="2">
                <div class="control-item control-item--switch">
                    <label class="control-label">将 Crybaby 按钮注入弹幕工具栏</label>
                    <span
                        class="control-trigger control-trigger--hint"
                        v-tooltip.bottom="injectToolbarTooltipBinding"
                    >
                        <ToggleSwitch v-model="isCrybabyModeEnabled" />
                    </span>
                </div>
            </div>
        </section>

        <section class="hazelspam-panel-card send-panel hazelspam-responsive-panel">
            <header class="module-head">
                <h3>Crybaby 弹幕发送框</h3>
            </header>

            <div class="send-panel__body">
                <div class="text-tools composer-actions">
                    <span
                        v-for="action in editorActions"
                        :key="action.id"
                        class="composer-action-trigger"
                        v-tooltip.bottom="{
                            value: action.label,
                            class: APP_TOOLTIP_UP_CLASS
                        }"
                    >
                        <AppButton
                            :tone="action.tone"
                            class="tool-btn p-button-icon-only crybaby-editor-btn"
                            :class="{
                                'crybaby-editor-btn--soft-disabled':
                                    action.disabled && action.allowClickWhenDisabled
                            }"
                            :data-crybaby-action="action.id"
                            :disabled="action.disabled && !action.allowClickWhenDisabled"
                            :aria-label="action.label"
                            :aria-disabled="action.disabled ? 'true' : undefined"
                            :aria-pressed="
                                action.active === undefined ? undefined : String(action.active)
                            "
                            @click="handleEditorActionClick(action)"
                        >
                            <span class="crybaby-editor-btn__icon" v-html="action.iconSvg"></span>
                        </AppButton>
                    </span>
                    <span class="composer-action-divider" aria-hidden="true"></span>
                    <span
                        class="composer-action-trigger"
                        v-tooltip.bottom="insertEmojiTooltipBinding"
                    >
                        <AppButton
                            tone="surface"
                            class="tool-btn p-button-icon-only crybaby-editor-btn"
                            icon="pi pi-face-smile"
                            :disabled="!isNativeComposerReady"
                            aria-label="插入表情"
                            @click="emojiDialogVisible = true"
                        />
                    </span>
                </div>

                <div class="composer-editor">
                    <div class="composer-textarea-shell">
                        <Textarea
                            v-model="composerText"
                            class="composer-textarea"
                            :maxlength="composerLengthLimit"
                            :disabled="!isNativeComposerReady"
                            :rows="3"
                            :placeholder="
                                isNativeComposerReady
                                    ? '输入需要发送的弹幕内容'
                                    : '当前未发现直播间原生输入框'
                            "
                        />
                    </div>
                </div>
            </div>

            <footer class="send-panel__footer">
                <p class="composer-counter">{{ composerCharacterCount }} / {{ composerLengthLimit }} 字</p>
                <AppButton tone="primary" :disabled="isSendDisabled" @click="handleSendCurrentDanmaku"
                    >发送</AppButton
                >
            </footer>
        </section>

        <div class="hazelspam-panel-actions crybaby-actions">
            <AppButton tone="surface" @click="closePanel">关闭此窗口</AppButton>
        </div>

        <AppDialog v-model:visible="emojiDialogVisible" header="插入表情">
            <div class="emoji-grid">
                <button
                    v-for="data in generalEmojiEmoticons"
                    :key="data.emoticon_id"
                    type="button"
                    v-ripple
                    class="emoji-cell"
                    :disabled="data.perm === 0"
                    @click="insertEmojiToComposer(data.emoji)"
                >
                    <Avatar :image="data.url" shape="circle" />
                </button>
            </div>
            <template #footer>
                <AppButton tone="surface" @click="emojiDialogVisible = false">关闭</AppButton>
            </template>
        </AppDialog>
    </div>
</template>

<style scoped>
.crybaby-view {
    display: flex;
    flex-direction: column;
    gap: var(--hazelspam-space-xl);
    height: 100%;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: var(--hazelspam-space-2xs);
    --editor-font-size: var(--hazelspam-size-editor-font, 17px);
    --editor-line-height: 1.55;
    --editor-padding-y: var(--hazelspam-space-lg);
    --editor-padding-x: var(--hazelspam-space-xl);
    --thin-scrollbar-size: var(--hazelspam-size-scrollbar-thin, 3px);
    --hazelspam-pill-height: var(--hazelspam-size-collection-row-height, 30px);
}

.crybaby-view > :is(.crybaby-view__header, .control-panel, .crybaby-actions) {
    flex: 0 0 auto;
    min-width: 0;
}

.crybaby-view__header h2 {
    margin: 0;
    font-size: var(--hazelspam-type-size-h2);
    font-weight: var(--hazelspam-type-weight-semibold);
}

.crybaby-view__header p {
    margin: var(--hazelspam-space-xs) 0 0;
    font-size: var(--hazelspam-type-size-body-sm);
    color: var(--hazelspam-color-text-muted, var(--p-text-muted-color));
}

.hazelspam-panel-card {
    border: 1px solid var(--hazelspam-color-surface-border, var(--p-content-border-color));
    border-radius: var(--hazelspam-panel-card-radius);
    padding: var(--hazelspam-space-xl);
}

.hazelspam-panel-card h3 {
    margin: 0;
    font-size: var(--hazelspam-type-size-h4);
    font-weight: var(--hazelspam-type-weight-semibold);
}

.control-grid {
    margin-top: var(--hazelspam-space-lg);
    --hazelspam-responsive-grid-gap: var(--hazelspam-space-3xl);
}

.control-item {
    display: flex;
    flex-direction: column;
    gap: var(--hazelspam-space-sm);
    min-width: 0;
}

.control-item--switch {
    align-items: flex-start;
}

.control-label {
    font-size: var(--hazelspam-type-size-body-sm);
    font-weight: var(--hazelspam-type-weight-medium);
    color: var(--hazelspam-color-text-muted, var(--p-text-muted-color));
}

.control-trigger {
    align-self: flex-start;
    width: fit-content;
    max-width: 100%;
}

.control-trigger--hint {
    cursor: help;
}

.send-panel {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-rows: auto auto auto;
    align-content: start;
    gap: var(--hazelspam-space-lg);
    min-width: 0;
    overflow: hidden;
    --hazelspam-responsive-panel-min-height: clamp(220px, 32vh, 300px);
}

.module-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--hazelspam-space-md);
    min-width: 0;
}

.composer-counter {
    margin: 0;
    font-size: var(--hazelspam-type-size-body-sm);
    line-height: 1.45;
    color: var(--hazelspam-color-text-muted, var(--p-text-muted-color));
    flex: 0 0 auto;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
}

.send-panel__body {
    display: flex;
    flex-direction: column;
    gap: var(--hazelspam-space-md);
    min-width: 0;
    min-height: 0;
}

.composer-editor {
    min-width: 0;
}

.composer-actions {
    display: flex;
    align-items: center;
    gap: var(--hazelspam-space-md);
    min-width: 0;
}

.composer-action-trigger {
    display: inline-flex;
}

.composer-action-divider {
    width: 1px;
    height: 16px;
    flex: 0 0 auto;
    align-self: center;
    margin-inline: var(--hazelspam-space-2xs);
    background: color-mix(
        in srgb,
        var(--hazelspam-color-surface-border, var(--p-content-border-color)) 92%,
        transparent
    );
}

.crybaby-editor-btn {
    position: relative;
}

.crybaby-editor-btn--soft-disabled {
    opacity: var(--hazelspam-icon-btn-disabled-opacity, 0.45);
}

.crybaby-editor-btn.hazelspam-app-button[aria-pressed='true'] {
    background: var(--hazelspam-color-accent);
    border-color: var(--hazelspam-color-accent);
    color: var(--hazelspam-color-accent-contrast, #ffffff);
}

.crybaby-editor-btn.hazelspam-app-button[aria-pressed='true']:hover {
    background: var(--hazelspam-color-accent-hover, var(--hazelspam-color-accent));
    border-color: var(--hazelspam-color-accent-hover, var(--hazelspam-color-accent));
    color: var(--hazelspam-color-accent-contrast, #ffffff);
}

.crybaby-editor-btn__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    pointer-events: none;
}

.crybaby-editor-btn__icon :deep(.hazelspam-host-toolbar-icon) {
    width: 13px;
    height: 13px;
    display: block;
    color: currentColor;
}

.crybaby-editor-btn__icon :deep(.hazelspam-host-toolbar-icon [stroke]) {
    stroke: currentColor;
}

.crybaby-editor-btn[data-crybaby-action='repeat']
    .crybaby-editor-btn__icon
    :deep(.hazelspam-host-toolbar-icon [stroke]) {
    stroke-width: 1.2;
}

.crybaby-editor-btn[data-crybaby-action='clear']
    .crybaby-editor-btn__icon
    :deep(.hazelspam-host-toolbar-icon [stroke]) {
    stroke-width: 1.05;
}

.crybaby-editor-btn__icon :deep(.hazelspam-host-toolbar-icon [fill='none']) {
    fill: none;
}

.composer-textarea-shell {
    min-width: 0;
}

.composer-textarea {
    display: block;
    width: 100%;
    box-sizing: border-box;
    min-height: 98px;
    max-height: 132px;
    resize: none;
    font-size: var(--editor-font-size);
    line-height: var(--editor-line-height);
    padding: var(--editor-padding-y) var(--editor-padding-x);
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
    background: var(--hazelspam-color-field-bg, var(--p-form-field-background));
    border-color: var(--hazelspam-color-field-border, var(--p-form-field-border-color));
    color: var(--hazelspam-color-field-text, var(--p-form-field-color));
}

.composer-textarea {
    scrollbar-width: none;
    scrollbar-color: transparent transparent;
}

.composer-textarea::-webkit-scrollbar {
    width: 0;
    height: 0;
}

.composer-textarea::-webkit-scrollbar-track {
    background: transparent;
}

.composer-textarea::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: var(--hazelspam-radius-pill);
}

.composer-textarea:hover,
.composer-textarea:focus {
    scrollbar-width: thin;
    scrollbar-color: color-mix(
            in srgb,
            var(--hazelspam-color-text-primary, var(--p-text-color)) 42%,
            transparent
        )
        transparent;
}

.composer-textarea:hover::-webkit-scrollbar,
.composer-textarea:focus::-webkit-scrollbar {
    width: var(--thin-scrollbar-size);
    height: var(--thin-scrollbar-size);
}

.composer-textarea:hover::-webkit-scrollbar-thumb,
.composer-textarea:focus::-webkit-scrollbar-thumb {
    background: color-mix(
        in srgb,
        var(--hazelspam-color-text-primary, var(--p-text-color)) 42%,
        transparent
    );
}

.send-panel__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--hazelspam-space-md);
}

.crybaby-actions {
    flex: 0 0 auto;
}

.emoji-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(var(--hazelspam-size-emoji-cell, 42px), 1fr));
    gap: var(--hazelspam-space-md);
}

.emoji-cell {
    border: 1px solid var(--hazelspam-color-surface-border, var(--p-content-border-color));
    border-radius: var(--hazelspam-emoji-radius);
    background: transparent;
    width: var(--hazelspam-size-emoji-cell, 42px);
    height: var(--hazelspam-size-emoji-cell, 42px);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
}

@container hazelspam-panel (max-width: 760px) {
    .module-head {
        align-items: flex-start;
    }

    .send-panel__footer {
        flex-wrap: wrap;
        justify-content: flex-end;
    }

    .composer-counter {
        width: 100%;
    }

    .composer-textarea {
        overscroll-behavior: auto;
    }
}

@container hazelspam-panel (max-width: 560px) {
    .composer-actions {
        flex-wrap: wrap;
        gap: var(--hazelspam-space-sm);
    }

    .composer-action-divider {
        display: none;
    }

    .send-panel__footer
        :deep(:is(.hazelspam-app-button, [data-hazelspam-button-style]).p-button:not(.p-button-icon-only)) {
        flex: 1 1 100%;
    }
}
</style>
