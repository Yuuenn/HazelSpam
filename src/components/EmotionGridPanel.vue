<script setup lang="ts">
import { computed } from 'vue'
import AppButton from './AppButton.vue'
import type { EmotionGridItem, EmotionGridVariant } from '@/composables/useEmotionPackages'

const props = defineProps<{
    packageId: number | null
    emotionItems: EmotionGridItem[]
    imageVariant: EmotionGridVariant
    hasSelectedInCurrentPackage: boolean
    disabled: boolean
}>()

const emit = defineEmits<{
    (event: 'toggle-emotion', emotionUnique: string): void
    (event: 'clear-package'): void
}>()

const hasPackage = computed(() => props.packageId !== null)
const isGeneralVariant = computed(() => props.imageVariant === 'general')
const isEmojiVariant = computed(() => props.imageVariant === 'emoji')

const getEmotionGridButtonClass = (item: EmotionGridItem) => ({
    'emotion-grid-item--selected': item.isSelected,
    'emotion-grid-item--disabled': item.isDisabled
})
</script>

<template>
    <div class="emotion-list-wrap">
        <template v-if="hasPackage">
            <div class="emotion-list">
                <div class="hazelspam-scroll-hint-shell hazelspam-scroll-hint-shell--fill">
                    <div class="emotion-list__content hazelspam-faux-scroll">
                        <div
                            class="emotion-grid"
                            :class="{ 'emotion-grid--general': isGeneralVariant }"
                        >
                            <AppButton
                                v-for="item in emotionItems"
                                :key="item.id"
                                class="emotion-grid-item hazelspam-grid-card"
                                :class="getEmotionGridButtonClass(item)"
                                :tone="item.isSelected ? 'primary' : 'surface'"
                                size="small"
                                :title="item.title"
                                :disabled="item.isDisabled"
                                @click="emit('toggle-emotion', item.unique)"
                            >
                                <img
                                    class="emotion-grid-item__image hazelspam-grid-card__image"
                                    :class="{
                                        'emotion-grid-item__image--general': isGeneralVariant,
                                        'hazelspam-grid-card__image--general': isGeneralVariant,
                                        'emotion-grid-item__image--emoji':
                                            !isGeneralVariant && isEmojiVariant,
                                        'hazelspam-grid-card__image--emoji':
                                            !isGeneralVariant && isEmojiVariant
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
