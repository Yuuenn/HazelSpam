<script setup lang="ts">
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
import TabPanels from 'primevue/tabpanels'
import Tabs from 'primevue/tabs'
import ToggleSwitch from 'primevue/toggleswitch'
import AppButton from './AppButton.vue'
import { APP_TOOLTIP_UP_CLASS, PRODUCT_NAME } from '@/constants/brand'
import { useCrybabyView } from '@/composables/useCrybabyView'

const {
    activeGuideTab,
    isCrybabyModeEnabled,
    crybabyToolbarStateTitle,
    crybabyModeStatus,
    toolbarFeatureCards,
    guideTabs,
    closePanel
} = useCrybabyView()
</script>

<template>
    <div class="crybaby-view hazelspam-responsive-scope">
        <header class="crybaby-view__header">
            <h2>{{ PRODUCT_NAME }} Crybaby 增强模式</h2>
            <p>弹幕工具栏的超快速发送、自动装填差异化弹幕功能</p>
        </header>

        <section class="hazelspam-panel-card control-panel">
            <h3>控制面板</h3>
            <div class="control-grid hazelspam-responsive-grid" data-hazelspam-grid="2">
                <div class="control-item control-item--switch">
                    <label class="control-label">开启 {{ PRODUCT_NAME }} Crybaby 增强模式</label>
                    <span
                        class="control-trigger control-trigger--hint"
                        v-tooltip.bottom="{
                            value: '在弹幕工具栏中新增 Crybaby 功能',
                            class: APP_TOOLTIP_UP_CLASS
                        }"
                    >
                        <ToggleSwitch v-model="isCrybabyModeEnabled" />
                    </span>
                </div>
            </div>
        </section>

        <div class="content-split hazelspam-responsive-split" data-hazelspam-stack="fill">
            <section class="hazelspam-panel-card send-panel hazelspam-responsive-panel">
                <header class="module-head">
                    <h3>发送弹幕</h3>
                    <p>发送路径仍在直播间原生输入区，本页只负责控制入口显示与状态说明。</p>
                </header>

                <div class="send-panel__body">
                    <article class="status-card" :data-active="isCrybabyModeEnabled ? 'true' : 'false'">
                        <strong>{{ crybabyToolbarStateTitle }}</strong>
                        <p>{{ crybabyModeStatus }}</p>
                    </article>

                    <article
                        v-for="card in toolbarFeatureCards"
                        :key="card.title"
                        class="feature-card"
                        :data-active="isCrybabyModeEnabled ? 'true' : 'false'"
                    >
                        <div class="feature-card__icon" aria-hidden="true">
                            <i :class="card.iconClass"></i>
                        </div>
                        <div class="feature-card__content">
                            <h4>{{ card.title }}</h4>
                            <p>{{ card.description }}</p>
                        </div>
                    </article>
                </div>
            </section>

            <section class="hazelspam-panel-card guide-panel hazelspam-responsive-panel">
                <header class="module-head">
                    <h3>说明</h3>
                    <p>按照现有页面规范集中管理 Crybaby 增强入口，不改动原有工具栏按钮功能。</p>
                </header>

                <Tabs v-model:value="activeGuideTab" class="guide-tabs" :lazy="true">
                    <TabList class="guide-tabs__list">
                        <Tab v-for="item in guideTabs" :key="item.id" :value="item.id">
                            {{ item.label }}
                        </Tab>
                    </TabList>

                    <TabPanels class="guide-tabs__panels">
                        <TabPanel v-for="item in guideTabs" :key="item.id" :value="item.id">
                            <article class="guide-card guide-card--panel">
                                <h4>{{ item.title }}</h4>
                                <p>{{ item.description }}</p>
                            </article>
                        </TabPanel>
                    </TabPanels>
                </Tabs>
            </section>
        </div>

        <div class="hazelspam-panel-actions crybaby-actions">
            <AppButton tone="surface" @click="closePanel">关闭此窗口</AppButton>
        </div>
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

.status-card,
.feature-card,
.guide-card {
    border: 1px solid var(--hazelspam-color-surface-border, var(--p-content-border-color));
    border-radius: var(--hazelspam-collection-radius);
    background: color-mix(
        in srgb,
        var(--hazelspam-color-shell-card-bg, var(--p-content-background)) 92%,
        transparent
    );
}

.status-card[data-active='true'],
.feature-card[data-active='true'] {
    border-color: color-mix(in srgb, var(--hazelspam-color-accent) 32%, transparent);
    background: color-mix(in srgb, var(--hazelspam-color-accent) 7%, transparent);
}

.status-card strong {
    font-size: var(--hazelspam-type-size-body-sm);
    font-weight: var(--hazelspam-type-weight-semibold);
    color: var(--hazelspam-color-text-primary, var(--p-text-color));
}

.status-card p,
.feature-card p,
.guide-card p {
    margin: 0;
    font-size: var(--hazelspam-type-size-body-sm);
    line-height: 1.5;
    color: var(--hazelspam-color-text-primary, var(--p-text-color));
}

.content-split {
    flex: 1;
    min-height: 0;
    align-items: stretch;
}

.send-panel,
.guide-panel {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: var(--hazelspam-space-lg);
    overflow: hidden;
    --hazelspam-responsive-panel-min-height: clamp(260px, 42vh, 420px);
}

.module-head {
    display: flex;
    flex-direction: column;
    gap: var(--hazelspam-space-xs);
}

.module-head p {
    margin: 0;
    font-size: var(--hazelspam-type-size-body-sm);
    color: var(--hazelspam-color-text-muted, var(--p-text-muted-color));
    line-height: 1.45;
}

.send-panel__body {
    display: flex;
    flex-direction: column;
    gap: var(--hazelspam-space-md);
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: var(--hazelspam-space-2xs);
    overscroll-behavior: contain;
}

.status-card,
.guide-card {
    display: flex;
    flex-direction: column;
    gap: var(--hazelspam-space-xs);
    padding: var(--hazelspam-space-lg);
}

.feature-card {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: var(--hazelspam-space-md);
    align-items: start;
    padding: var(--hazelspam-space-lg);
}

.feature-card__icon {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--hazelspam-color-accent) 12%, transparent);
    color: var(--hazelspam-color-accent);
    flex: 0 0 32px;
}

.feature-card__icon i {
    font-size: 14px;
    line-height: 1;
}

.feature-card__content {
    display: flex;
    flex-direction: column;
    gap: var(--hazelspam-space-xs);
    min-width: 0;
}

.feature-card__content h4,
.guide-card h4 {
    margin: 0;
    font-size: var(--hazelspam-type-size-body-sm);
    font-weight: var(--hazelspam-type-weight-semibold);
    color: var(--hazelspam-color-text-primary, var(--p-text-color));
}

.guide-tabs {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: var(--hazelspam-space-md);
    min-height: 0;
}

.guide-tabs__list,
.guide-tabs__panels {
    min-height: 0;
    min-width: 0;
}

.guide-tabs :deep(.p-tablist) {
    background: transparent;
}

.guide-tabs :deep(.p-tablist-content) {
    overflow: auto;
    overscroll-behavior: contain;
}

.guide-tabs :deep([role='tablist']) {
    min-width: max-content;
}

.guide-tabs :deep(.p-tabpanels) {
    min-height: 0;
    background: transparent;
    padding: 0;
}

.guide-tabs :deep([role='tabpanel']) {
    min-height: 0;
    padding: 0;
}

.guide-card--panel {
    border-color: var(--hazelspam-color-surface-border, var(--p-content-border-color));
    background: var(--hazelspam-color-shell-card-bg, var(--p-content-background));
    justify-content: flex-start;
}

.crybaby-actions {
    flex: 0 0 auto;
}

@container hazelspam-panel (max-width: 760px) {
    .send-panel__body,
    .guide-tabs :deep(.p-tablist-content) {
        overscroll-behavior: auto;
    }
}
</style>
