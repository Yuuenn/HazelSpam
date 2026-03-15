<script setup lang="ts">
import InputNumber from 'primevue/inputnumber'
import ToggleSwitch from 'primevue/toggleswitch'
import AppButton from './AppButton.vue'
import EmotionGridPanel from './EmotionGridPanel.vue'
import EmotionPackageList from './EmotionPackageList.vue'
import { useEmotionPackages } from '@/composables/useEmotionPackages'
import { useEmotionSpamForm } from '@/composables/useEmotionSpamForm'
import { PRODUCT_NAME } from '@/constants/brand'

const {
    packageCards,
    selectedPackageId,
    selectedPackageEmotionCards,
    selectedPackageGridVariant,
    hasSelectedInCurrentPackage,
    selectedEmotionCount,
    handleSelectPackage,
    toggleEmotionSelection,
    clearAllSelections,
    clearCurrentPackageSelections
} = useEmotionPackages()
const {
    isEmotionSpamRunning,
    isAnySpamRunning,
    activeIntervalSeconds,
    randomSendMode,
    autoStopEnabled,
    timeLimitSeconds,
    closePanel,
    handleStartSpam,
    handleStopSpam
} = useEmotionSpamForm()
</script>

<template>
    <div class="emotion-view">
        <header class="emotion-view__header">
            <h2>{{ PRODUCT_NAME }} 表情独轮车</h2>
            <p>自动发送您所选择的表情内容</p>
        </header>

        <section class="hazelspam-panel-card control-panel">
            <h3>控制面板</h3>
            <div class="control-grid">
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
                        :disabled="isEmotionSpamRunning"
                    />
                </div>

                <div class="control-item control-item--switch">
                    <label>打乱顺序发送</label>
                    <ToggleSwitch v-model="randomSendMode" :disabled="isEmotionSpamRunning" />
                </div>

                <div class="control-item control-item--switch">
                    <label>自动停止任务</label>
                    <ToggleSwitch v-model="autoStopEnabled" :disabled="isEmotionSpamRunning" />
                </div>

                <div class="control-item" v-if="autoStopEnabled">
                    <label>自动停止时间</label>
                    <InputNumber
                        v-model="timeLimitSeconds"
                        :min="1"
                        :min-fraction-digits="0"
                        :max-fraction-digits="0"
                        :use-grouping="false"
                        suffix=" 秒后"
                        size="small"
                        fluid
                        :disabled="isEmotionSpamRunning"
                    />
                </div>
            </div>
        </section>

        <section class="hazelspam-panel-card emotion-send">
            <header class="emotion-send__head">
                <h3>发送表情</h3>
                <p>您已选择 {{ selectedEmotionCount }} 个表情</p>
            </header>

            <div class="emotion-send__body">
                <EmotionPackageList
                    class="emotion-send__column"
                    :packages="packageCards"
                    :selected-count="selectedEmotionCount"
                    :disabled="isEmotionSpamRunning"
                    @select-package="handleSelectPackage"
                    @clear-all="clearAllSelections"
                />

                <EmotionGridPanel
                    class="emotion-send__column"
                    :package-id="selectedPackageId"
                    :emotion-items="selectedPackageEmotionCards"
                    :image-variant="selectedPackageGridVariant"
                    :has-selected-in-current-package="hasSelectedInCurrentPackage"
                    :disabled="isEmotionSpamRunning"
                    @toggle-emotion="toggleEmotionSelection"
                    @clear-package="clearCurrentPackageSelections"
                />
            </div>
        </section>

        <div class="hazelspam-panel-actions" v-if="!isAnySpamRunning">
            <AppButton tone="surface" @click="closePanel">关闭此窗口</AppButton>
            <AppButton
                tone="primary"
                :disabled="selectedEmotionCount === 0"
                @click="handleStartSpam"
            >
                开车
            </AppButton>
        </div>
        <div class="hazelspam-panel-actions" v-else>
            <AppButton tone="surface" @click="closePanel">关闭此窗口</AppButton>
            <AppButton tone="danger" @click="handleStopSpam">停车</AppButton>
        </div>
    </div>
</template>

<style scoped>
.emotion-view {
    display: flex;
    flex-direction: column;
    gap: var(--hazelspam-space-xl);
    height: 100%;
    min-height: 0;
    overflow: hidden;
    --emotion-grid-cell-size: 104px;
    --emotion-grid-image-size: 70px;
    --emotion-grid-item-padding-x: 8px;
    --emotion-grid-item-padding-top: 8px;
    --emotion-grid-item-padding-bottom: 3px;
    --emotion-pack-inline-offset: var(--hazelspam-space-xs);
}

.emotion-view__header h2 {
    margin: 0;
    font-size: var(--hazelspam-type-size-h2);
    font-weight: var(--hazelspam-type-weight-semibold);
}

.emotion-view__header p {
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
    display: grid;
    gap: var(--hazelspam-space-3xl);
    grid-template-columns: repeat(6, minmax(0, 1fr));
    align-items: start;
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

.emotion-send {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    row-gap: var(--hazelspam-space-lg);
    overflow: hidden;
}

.emotion-send__head {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--hazelspam-space-sm) var(--hazelspam-space-md);
}

.emotion-send__head p {
    margin: 0;
    font-size: var(--hazelspam-type-size-body-sm);
    color: var(--hazelspam-color-text-muted, var(--p-text-muted-color));
}

.emotion-send__body {
    display: grid;
    grid-template-columns: minmax(220px, 0.57fr) minmax(0, 2.43fr);
    gap: var(--hazelspam-space-xl);
    align-items: stretch;
    min-height: 0;
}

.emotion-send__column {
    min-width: 0;
    min-height: 0;
}

@media (max-width: 1180px) {
    .control-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .emotion-send__body {
        grid-template-columns: 1fr;
        grid-template-rows: minmax(220px, 36vh) minmax(0, 1fr);
    }
}

@media (max-width: 760px) {
    .control-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .emotion-send__head {
        align-items: flex-start;
    }

    .emotion-send__body {
        grid-template-rows: minmax(190px, 34vh) minmax(0, 1fr);
    }
}
</style>
