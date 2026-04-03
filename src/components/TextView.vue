<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import Avatar from 'primevue/avatar'
import Checkbox from 'primevue/checkbox'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Ripple from 'primevue/ripple'
import Slider from 'primevue/slider'
import Textarea from 'primevue/textarea'
import ToggleSwitch from 'primevue/toggleswitch'
import AppButton from './AppButton.vue'
import AppDialog from './AppDialog.vue'
import TextTabSortDialog from './TextTabSortDialog.vue'
import { useTextSpamForm } from '@/composables/useTextSpamForm'
import { useTextPreviewOverlay } from '@/composables/useTextPreviewOverlay'
import { useTextTabs } from '@/composables/useTextTabs'
import { useBiliStore } from '@/stores/useBiliStore'
import { useModuleStore } from '@/stores/useModuleStore'
import { useUIStore } from '@/stores/useUIStore'
import { PRODUCT_NAME } from '@/constants/brand'

const moduleStore = useModuleStore()
const uiStore = useUIStore()
const biliStore = useBiliStore()
const vRipple = Ripple

const emojiDialogVisible = ref(false)
const {
    tabDialogVisible,
    sortDialogVisible,
    sortDraft,
    tabPanels,
    canRemoveTab,
    activeTabId,
    activeTab,
    editingTabTitle,
    openTabDialog,
    isTabDeleteArmed,
    handleTabDangerToggle,
    cloneCurrentTab,
    handleTabDialogHide,
    openSortDialog,
    moveSortDraft
} = useTextTabs()
const {
    messageCharLimitMax,
    combineTabs,
    lineBreakMode,
    isRandomOrderEnabled,
    autoStopEnabled,
    activeIntervalSeconds,
    messageCharLimit,
    isAnySpamRunning,
    currentText,
    clearCurrentText,
    normalizeCurrentTextIfBlank,
    handleStartSpam,
    handleStopSpam
} = useTextSpamForm({
    activeTab
})

const textPreviewOverlay = useTextPreviewOverlay({
    currentText,
    isPreviewEnabled: lineBreakMode
})

const {
    textOverlayTransform,
    previewOverlayViewportStyle,
    previewOverlayContentStyle,
    scheduleRelayout,
    insertTextAtCursor
} = textPreviewOverlay

const textPreviewLines = computed(() => {
    const previewCharLimit = Math.max(
        1,
        Number(moduleStore.moduleConfig.textSpam.textInterval || 1)
    )
    return currentText.value.split(/\r?\n/).map((line) => ({
        keep: line.slice(0, previewCharLimit),
        overflow: line.slice(previewCharLimit)
    }))
})

const generalEmojiEmoticons = computed(
    () => biliStore.emotionData.find((item) => item.pkg_id === 100)?.emoticons ?? []
)

const insertEmojiToText = (emoji: string) => insertTextAtCursor(emoji)

onMounted(() => {
    scheduleRelayout()
})

watch(
    () => [
        uiStore.uiConfig.isShowPanel,
        uiStore.uiConfig.activeMenuIndex,
        moduleStore.moduleConfig.textSpam.enable,
        lineBreakMode.value,
        activeTabId.value
    ],
    () => {
        if (uiStore.uiConfig.activeMenuIndex === 'TextView') {
            scheduleRelayout()
        }
    }
)

watch(
    () => moduleStore.moduleConfig.textSpam.textInterval,
    () => {
        scheduleRelayout()
    }
)
</script>
<template>
    <div class="hazelspam-panel-view hazelspam-responsive-scope">
        <header class="hazelspam-panel-view__header">
            <h2>{{ PRODUCT_NAME }} 独轮车</h2>
            <p>自动发送您所设定好的文本内容</p>
        </header>

        <section class="hazelspam-panel-card control-panel">
            <h3>控制面板</h3>
            <div class="control-grid hazelspam-responsive-grid" data-hazelspam-grid="6">
                <div class="control-item">
                    <label>每条弹幕字数上限</label>
                    <Slider
                        v-model="messageCharLimit"
                        :min="1"
                        :max="messageCharLimitMax"
                        :step="1"
                        :disabled="moduleStore.moduleConfig.textSpam.enable"
                    />
                    <small>{{ messageCharLimit }} 字</small>
                </div>

                <div class="control-item">
                    <label>每条弹幕间隔时间</label>
                    <InputNumber
                        v-model="activeIntervalSeconds"
                        :min="1"
                        :min-fraction-digits="0"
                        :max-fraction-digits="0"
                        :use-grouping="false"
                        suffix=" 秒后"
                        size="small"
                        fluid
                        :disabled="moduleStore.moduleConfig.textSpam.enable"
                    />
                </div>

                <div class="control-item control-item--switch">
                    <label>每行仅发送一条弹幕</label>
                    <ToggleSwitch
                        v-model="lineBreakMode"
                        :disabled="moduleStore.moduleConfig.textSpam.enable"
                    />
                </div>

                <div class="control-item control-item--switch">
                    <label>打乱顺序发送</label>
                    <ToggleSwitch
                        v-model="isRandomOrderEnabled"
                        :disabled="moduleStore.moduleConfig.textSpam.enable"
                    />
                </div>

                <div class="control-item control-item--switch">
                    <label>自动停止任务</label>
                    <ToggleSwitch
                        v-model="autoStopEnabled"
                        :disabled="moduleStore.moduleConfig.textSpam.enable"
                    />
                </div>

                <div class="control-item" v-if="autoStopEnabled">
                    <label>自动停止时间</label>
                    <InputNumber
                        v-model="moduleStore.moduleConfig.textSpam.timeLimit"
                        :min="1"
                        :min-fraction-digits="0"
                        :max-fraction-digits="0"
                        :use-grouping="false"
                        suffix=" 秒后"
                        size="small"
                        fluid
                        :disabled="moduleStore.moduleConfig.textSpam.enable"
                    />
                </div>
            </div>
        </section>

        <div class="content-split hazelspam-responsive-split" data-hazelspam-stack="fill">
            <section class="hazelspam-panel-card text-panel hazelspam-responsive-panel">
                <h3>发送文本</h3>
                <div class="text-tools">
                    <AppButton
                        tone="surface"
                        class="tool-btn"
                        icon="pi pi-face-smile"
                        @click="emojiDialogVisible = true"
                        :disabled="moduleStore.moduleConfig.textSpam.enable"
                    />
                    <AppButton
                        tone="dangerSurface"
                        class="tool-btn tool-btn--danger"
                        icon="pi pi-trash"
                        @click="clearCurrentText"
                        :disabled="moduleStore.moduleConfig.textSpam.enable"
                    />
                </div>

                <div class="editor-region" :class="{ 'editor-region--preview': lineBreakMode }">
                    <div class="text-area-wrap">
                        <Textarea
                            :ref="textPreviewOverlay.textInputRef"
                            v-model="currentText"
                            class="text-input"
                            :disabled="moduleStore.moduleConfig.textSpam.enable"
                            placeholder="输入需要发送的文本"
                            @blur="normalizeCurrentTextIfBlank"
                        />
                    </div>

                    <div v-if="lineBreakMode" class="preview-title">
                        <span class="preview-highlight-warning">樱桃红字符</span>
                        代表超出本条弹幕上限的部分，将被自动丢弃。为确保文本完整请考虑加入回车换行
                    </div>

                    <div v-if="lineBreakMode" class="preview-overlay-wrap">
                        <Textarea
                            :ref="textPreviewOverlay.textPreviewInputRef"
                            :model-value="currentText"
                            class="preview-base"
                            readonly
                        />
                        <div
                            class="preview-overlay-viewport"
                            :style="previewOverlayViewportStyle"
                            aria-hidden="true"
                        >
                            <div
                                class="preview-overlay"
                                :style="{
                                    ...previewOverlayContentStyle,
                                    transform: textOverlayTransform
                                }"
                            >
                                <div
                                    class="preview-line"
                                    v-for="(line, idx) in textPreviewLines"
                                    :key="idx"
                                >
                                    <span>{{ line.keep }}</span
                                    ><span class="overflow">{{ line.overflow }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section class="hazelspam-panel-card tabs-panel hazelspam-responsive-panel">
                <div class="tabs-head">
                    <h3>标签页</h3>
                </div>

                <div
                    class="hazelspam-scroll-hint-shell hazelspam-scroll-hint-shell--fill tabs-list-shell"
                >
                    <div class="tabs-strip hazelspam-faux-scroll">
                        <div
                            v-for="panel in tabPanels"
                            :key="panel.id"
                            class="tab-item hazelspam-row-group"
                            :data-tab-id="panel.id"
                        >
                            <AppButton
                                app-style="row"
                                :tone="activeTabId === panel.id ? 'primary' : 'surface'"
                                class="tab-btn"
                                :label="panel.tab || `标签页 ${panel.id}`"
                                size="small"
                                @click="activeTabId = panel.id"
                                :disabled="moduleStore.moduleConfig.textSpam.enable"
                            />
                            <AppButton
                                app-style="square"
                                :tone="isTabDeleteArmed(panel.id) ? 'dangerSurface' : 'surface'"
                                class="tab-danger-toggle"
                                :icon="
                                    canRemoveTab && isTabDeleteArmed(panel.id)
                                        ? 'pi pi-trash'
                                        : 'pi pi-ban'
                                "
                                @click="handleTabDangerToggle(panel.id)"
                                :disabled="
                                    moduleStore.moduleConfig.textSpam.enable || !canRemoveTab
                                "
                            />
                        </div>
                    </div>
                </div>

                <div class="tabs-footer">
                    <hr class="tabs-divider" role="separator" />

                    <div class="tabs-footer-actions">
                        <AppButton
                            app-style="action"
                            size="small"
                            label="修改当前标签页标题"
                            icon="pi pi-bookmark"
                            @click="openTabDialog"
                            :disabled="moduleStore.moduleConfig.textSpam.enable || !activeTab"
                        />
                        <AppButton
                            app-style="action"
                            size="small"
                            tone="surface"
                            label="拷贝当前标签页"
                            icon="pi pi-clone"
                            @click="cloneCurrentTab"
                            :disabled="moduleStore.moduleConfig.textSpam.enable || !activeTab"
                        />
                    </div>

                    <div class="tabs-sort-action">
                        <AppButton
                            app-style="action"
                            size="small"
                            tone="surface"
                            class="tabs-sort-btn"
                            icon="pi pi-sort-alt"
                            label="排序所有标签页"
                            @click="openSortDialog"
                            :disabled="moduleStore.moduleConfig.textSpam.enable"
                        />
                    </div>

                    <label class="tabs-check">
                        <Checkbox
                            v-model="combineTabs"
                            binary
                            :disabled="moduleStore.moduleConfig.textSpam.enable"
                        />
                        <span>发送时将全体标签页内容按上下顺序组合为一个整体文本进行处理</span>
                    </label>
                </div>
            </section>
        </div>

        <div class="hazelspam-panel-actions" v-if="!isAnySpamRunning">
            <AppButton tone="surface" @click="uiStore.uiConfig.isShowPanel = false"
                >关闭此窗口</AppButton
            >
            <AppButton tone="primary" @click="handleStartSpam">开车</AppButton>
        </div>
        <div class="hazelspam-panel-actions" v-else>
            <AppButton tone="surface" @click="uiStore.uiConfig.isShowPanel = false"
                >关闭此窗口</AppButton
            >
            <AppButton tone="danger" @click="handleStopSpam">停车</AppButton>
        </div>

        <AppDialog v-model:visible="emojiDialogVisible" header="插入表情">
            <div class="emoji-grid">
                <button
                    type="button"
                    v-ripple
                    v-for="data in generalEmojiEmoticons"
                    :key="data.emoticon_id"
                    class="emoji-cell"
                    :disabled="data.perm === 0"
                    @click="insertEmojiToText(data.emoji)"
                >
                    <Avatar :image="data.url" shape="circle" />
                </button>
            </div>
            <template #footer>
                <AppButton tone="surface" @click="emojiDialogVisible = false">关闭</AppButton>
            </template>
        </AppDialog>

        <AppDialog
            v-model:visible="tabDialogVisible"
            header="修改标签页标题"
            class="tab-title-dialog"
            @hide="handleTabDialogHide"
        >
            <div class="dialog-body">
                <label>标签页标题</label>
                <InputText
                    v-model="editingTabTitle"
                    class="tab-title-input"
                    placeholder="请输入标题"
                />
            </div>
        </AppDialog>

        <TextTabSortDialog
            v-model:visible="sortDialogVisible"
            :items="sortDraft"
            @move="moveSortDraft"
        />
    </div>
</template>

<style scoped>
.hazelspam-panel-view {
    display: flex;
    flex-direction: column;
    gap: var(--hazelspam-space-xl);
    height: 100%;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: var(--hazelspam-space-2xs);
    --preview-block-gap: var(--hazelspam-space-sm);
    --editor-font-size: var(--hazelspam-size-editor-font, 17px);
    --editor-line-height: 1.55;
    --editor-padding-y: var(--hazelspam-space-lg);
    --editor-padding-x: var(--hazelspam-space-xl);
    --thin-scrollbar-size: var(--hazelspam-size-scrollbar-thin, 3px);
    --tab-row-height: var(--hazelspam-size-collection-row-height, 30px);
    --tab-row-gap: var(--hazelspam-space-sm);
    --tab-visible-count: 7;
}

.hazelspam-panel-view__header h2 {
    margin: 0;
    font-size: var(--hazelspam-type-size-h2);
    font-weight: var(--hazelspam-type-weight-semibold);
}

.hazelspam-panel-view__header p {
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
    margin: 0 0 var(--hazelspam-space-lg);
    font-size: var(--hazelspam-type-size-h4);
    font-weight: var(--hazelspam-type-weight-semibold);
}

.content-split {
    --hazelspam-responsive-split-columns: minmax(0, 7fr) minmax(0, 3fr);
    align-items: stretch;
    flex: 1;
    min-height: 0;
}

.text-panel,
.tabs-panel {
    min-width: 0;
    height: 100%;
    gap: var(--hazelspam-space-lg);
    overflow: hidden;
}

.text-panel {
    display: grid;
    grid-template-rows: auto auto minmax(0, 1fr);
    --hazelspam-responsive-panel-min-height: clamp(320px, 62vh, 520px);
}

.tabs-panel {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    --hazelspam-responsive-panel-min-height: clamp(280px, 50vh, 430px);
}

.control-grid {
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

.control-item label {
    font-size: var(--hazelspam-type-size-body-sm);
    font-weight: var(--hazelspam-type-weight-medium);
    color: var(--hazelspam-color-text-muted, var(--p-text-muted-color));
}

.control-item small {
    color: var(--hazelspam-color-text-muted, var(--p-text-muted-color));
    font-size: var(--hazelspam-type-size-caption);
}

.text-area-wrap {
    width: 100%;
    min-width: 0;
    min-height: 0;
}

.editor-region {
    display: grid;
    grid-template-rows: minmax(0, 1fr);
    min-height: 0;
    overflow: visible;
}

.editor-region--preview {
    grid-template-rows: minmax(0, 1fr) auto minmax(0, 1fr);
    row-gap: var(--preview-block-gap);
}

.text-input {
    display: block;
    width: 100%;
    box-sizing: border-box;
    height: 100%;
    min-height: 100%;
    max-height: 100%;
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

.preview-title {
    margin: 0;
    font-size: var(--hazelspam-type-size-body-sm);
    line-height: 1.45;
    color: var(--hazelspam-color-text-muted, var(--p-text-muted-color));
}

.preview-highlight-warning {
    color: var(--hazelspam-color-warning, #d83b44);
}

.preview-overlay-wrap {
    position: relative;
    width: 100%;
    min-height: 0;
}

.preview-base {
    display: block;
    width: 100%;
    box-sizing: border-box;
    height: 100%;
    min-height: 100%;
    max-height: 100%;
    color: transparent !important;
    -webkit-text-fill-color: transparent !important;
    text-shadow: none !important;
    caret-color: transparent;
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
    resize: none;
    font-size: var(--editor-font-size);
    line-height: var(--editor-line-height);
    padding: var(--editor-padding-y) var(--editor-padding-x);
    background: var(--hazelspam-color-field-bg, var(--p-form-field-background));
    border-color: var(--hazelspam-color-field-border, var(--p-form-field-border-color));
}

.preview-base::placeholder {
    color: transparent !important;
    -webkit-text-fill-color: transparent !important;
}

.preview-overlay-viewport {
    position: absolute;
    overflow: hidden;
    pointer-events: none;
    color: var(--hazelspam-color-text-primary, var(--p-text-color));
}

.preview-overlay {
    position: relative;
    white-space: pre-wrap;
    overflow-wrap: break-word;
    word-break: normal;
}

.preview-line {
    min-height: 1.45em;
}

.overflow {
    color: var(--hazelspam-color-warning, #d83b44);
}

.text-tools {
    display: flex;
    align-items: center;
    gap: var(--hazelspam-space-md);
}

.text-panel > h3,
.tabs-head h3 {
    margin: 0;
}

.tabs-head {
    display: flex;
    align-items: center;
    gap: var(--hazelspam-space-md);
    min-width: 0;
}

.tabs-list-shell {
    min-height: 0;
    min-width: 0;
    overflow: hidden;
}

.tabs-strip {
    --hazelspam-pill-height: var(--tab-row-height);
    display: flex;
    flex-direction: column;
    gap: var(--tab-row-gap);
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
    flex: 1 1 auto;
    min-height: 0;
}

.tabs-footer {
    display: flex;
    flex-direction: column;
    gap: var(--hazelspam-space-lg);
    min-height: 0;
    min-width: 0;
}

.tabs-divider {
    margin: 0;
    border: 0;
    border-top: 1px solid
        color-mix(
            in srgb,
            var(--hazelspam-color-surface-border, var(--p-content-border-color)) 88%,
            transparent
        );
}

.tabs-footer-actions {
    display: flex;
    flex-direction: column;
    gap: var(--hazelspam-space-md);
    min-width: 0;
}

.tabs-sort-action {
    margin-top: 0;
    min-width: 0;
}

.tabs-check {
    display: flex;
    align-items: flex-start;
    gap: var(--hazelspam-space-md);
    font-size: var(--hazelspam-type-size-body-sm);
    color: var(--hazelspam-color-text-primary, var(--p-text-color));
    min-width: 0;
}

.tabs-check span {
    min-width: 0;
    overflow-wrap: anywhere;
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

.dialog-body {
    display: flex;
    flex-direction: column;
    gap: var(--hazelspam-space-md);
}

.tab-title-input {
    width: 100%;
}

.text-input,
.preview-base {
    scrollbar-width: none;
    scrollbar-color: transparent transparent;
}

.text-input::-webkit-scrollbar,
.preview-base::-webkit-scrollbar {
    width: 0;
    height: 0;
}

.text-input::-webkit-scrollbar-track,
.preview-base::-webkit-scrollbar-track {
    background: transparent;
}

.text-input::-webkit-scrollbar-thumb,
.preview-base::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: var(--hazelspam-radius-pill);
}

.text-input:hover,
.text-input:focus,
.preview-base:hover,
.preview-base:focus {
    scrollbar-width: thin;
    scrollbar-color: color-mix(
            in srgb,
            var(--hazelspam-color-text-primary, var(--p-text-color)) 42%,
            transparent
        )
        transparent;
}

.text-input:hover::-webkit-scrollbar,
.text-input:focus::-webkit-scrollbar,
.preview-base:hover::-webkit-scrollbar,
.preview-base:focus::-webkit-scrollbar {
    width: var(--thin-scrollbar-size);
    height: var(--thin-scrollbar-size);
}

.text-input:hover::-webkit-scrollbar-thumb,
.text-input:focus::-webkit-scrollbar-thumb,
.preview-base:hover::-webkit-scrollbar-thumb,
.preview-base:focus::-webkit-scrollbar-thumb {
    background: color-mix(
        in srgb,
        var(--hazelspam-color-text-primary, var(--p-text-color)) 42%,
        transparent
    );
}

@container hazelspam-panel (max-width: 760px) {
    .text-panel {
        grid-template-rows: auto auto minmax(220px, 1fr);
    }

    .tabs-panel {
        grid-template-rows: auto minmax(220px, 1fr) auto;
    }

    .text-input,
    .preview-base,
    .tabs-strip {
        overscroll-behavior: auto;
    }
}
</style>
