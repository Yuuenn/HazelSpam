<script setup lang="ts">
import { computed, toRef } from 'vue'
import AppButton from './AppButton.vue'
import type {
    EmotionGridItem,
    EmotionPackageImagePanel,
    EmotionPackagePanel
} from '@/composables/useEmotionPackages'
import { useEmotionImageWarmup } from '@/composables/useEmotionImageWarmup'

const props = defineProps<{
    packageId: number | null
    packageImagePanels: EmotionPackageImagePanel[]
    selectedPackagePanel: EmotionPackagePanel | null
    selectedEmotionKeySet: Set<string>
    hasSelectedInCurrentPackage: boolean
    disabled: boolean
}>()

const emit = defineEmits<{
    (event: 'toggle-emotion', emotionUnique: string): void
    (event: 'clear-package'): void
}>()

const selectedPackagePanel = computed(() => props.selectedPackagePanel)
const hasPackage = computed(() => selectedPackagePanel.value !== null)

useEmotionImageWarmup({
    packagePanels: toRef(props, 'packageImagePanels'),
    currentPackageId: toRef(props, 'packageId')
})

const isEmotionSelected = (item: EmotionGridItem) => props.selectedEmotionKeySet.has(item.unique)
const isEmotionDisabled = (item: EmotionGridItem) => props.disabled || item.isLocked

const getEmotionGridButtonClass = (item: EmotionGridItem) => ({
    'emotion-grid-item--selected': isEmotionSelected(item),
    'emotion-grid-item--disabled': isEmotionDisabled(item)
})

const memoizeEmotionGridItem = (item: EmotionGridItem) => [
    props.selectedEmotionKeySet.has(item.unique),
    props.disabled || item.isLocked
]
</script>

<template>
    <div class="emotion-list-wrap">
        <template v-if="hasPackage">
            <div class="emotion-list">
                <div class="hazelspam-scroll-hint-shell hazelspam-scroll-hint-shell--fill">
                    <div class="emotion-list__content hazelspam-faux-scroll">
                        <div
                            v-if="selectedPackagePanel"
                            :key="selectedPackagePanel.packageId"
                            class="emotion-grid-panel"
                        >
                            <div
                                class="emotion-grid"
                                :class="{
                                    'emotion-grid--general':
                                        selectedPackagePanel.imageVariant === 'general'
                                }"
                            >
                                <AppButton
                                    v-for="item in selectedPackagePanel.emotionItems"
                                    :key="item.id"
                                    v-memo="memoizeEmotionGridItem(item)"
                                    class="emotion-grid-item hazelspam-grid-card"
                                    :class="getEmotionGridButtonClass(item)"
                                    :tone="isEmotionSelected(item) ? 'primary' : 'surface'"
                                    size="small"
                                    :title="item.title"
                                    :disabled="isEmotionDisabled(item)"
                                    @click="emit('toggle-emotion', item.unique)"
                                >
                                    <img
                                        class="emotion-grid-item__image hazelspam-grid-card__image"
                                        :class="{
                                            'emotion-grid-item__image--general':
                                                selectedPackagePanel.imageVariant === 'general',
                                            'hazelspam-grid-card__image--general':
                                                selectedPackagePanel.imageVariant === 'general',
                                            'emotion-grid-item__image--emoji':
                                                selectedPackagePanel.imageVariant === 'emoji',
                                            'hazelspam-grid-card__image--emoji':
                                                selectedPackagePanel.imageVariant === 'emoji'
                                        }"
                                        :src="item.imageUrl"
                                        :alt="item.title"
                                    />
                                    <span class="emotion-grid-item__text hazelspam-grid-card__text">
                                        {{ item.title }}
                                    </span>
                                </AppButton>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="emotion-list__floating-action">
                <AppButton
                    app-style="icon"
                    tone="successSurface"
                    class="emotion-icon-btn"
                    icon="pi pi-refresh"
                    :disabled="!hasSelectedInCurrentPackage || disabled"
                    @click="emit('clear-package')"
                />
            </div>
        </template>

        <p v-else class="emotion-empty">请先选择一个表情包</p>
    </div>
</template>

<style scoped>
.emotion-list-wrap {
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    row-gap: var(--hazelspam-space-md);
    min-width: 0;
    min-height: 0;
}

.emotion-list {
    min-height: 0;
    border: 1px solid var(--hazelspam-color-surface-border, var(--p-content-border-color));
    border-radius: var(--hazelspam-panel-card-radius);
    padding: var(--hazelspam-space-md);
    display: flex;
    flex-direction: column;
}

.emotion-list__floating-action {
    display: flex;
    justify-content: flex-end;
    align-items: center;
}

.emotion-list__content {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-inline: var(--hazelspam-space-xs);
    padding-block: 5px;
    box-sizing: border-box;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
}

.emotion-grid {
    display: grid;
    align-self: flex-start;
    grid-template-columns: repeat(auto-fill, minmax(min(var(--emotion-grid-cell-size), 100%), 1fr));
    grid-auto-rows: var(--emotion-grid-cell-size);
    gap: var(--hazelspam-space-md);
    width: 100%;
    justify-content: center;
    align-content: start;
}

.emotion-grid-panel {
    width: 100%;
}

.emotion-grid--general {
    grid-template-columns: repeat(auto-fill, minmax(min(var(--emotion-grid-cell-size), 100%), 1fr));
}

.emotion-empty {
    margin: 0;
    min-height: 0;
    padding: var(--hazelspam-space-lg);
    color: var(--hazelspam-color-text-muted, var(--p-text-muted-color));
    font-size: var(--hazelspam-type-size-body-sm);
    border: 1px dashed
        color-mix(
            in srgb,
            var(--hazelspam-color-text-primary, var(--p-text-color)) 18%,
            transparent
        );
    border-radius: var(--hazelspam-panel-card-radius);
    display: flex;
    align-items: center;
    justify-content: center;
}

@container hazelspam-panel (max-width: 760px) {
    .emotion-list__content {
        overscroll-behavior: auto;
    }
}
</style>
