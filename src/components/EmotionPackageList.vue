<script setup lang="ts">
import AppButton from './AppButton.vue'
import type { EmotionPackageListItem } from '@/composables/useEmotionPackages'

defineProps<{
    packages: EmotionPackageListItem[]
    selectedCount: number
    disabled: boolean
}>()

const emit = defineEmits<{
    (event: 'select-package', id: number): void
    (event: 'clear-all'): void
}>()

const getPackageButtonClass = (isCurrent: boolean) => ({
    'emotion-pack-item--current': isCurrent
})

const memoizeEmotionPackageItem = (
    isCurrent: boolean,
    selectedCount: number,
    disabled: boolean
) => [isCurrent, selectedCount, disabled]
</script>

<template>
    <div class="emotion-pack-column">
        <div class="hazelspam-scroll-hint-shell hazelspam-scroll-hint-shell--fill">
            <div class="emotion-pack-list hazelspam-faux-scroll">
                <AppButton
                    v-for="item in packages"
                    :key="item.id"
                    v-memo="memoizeEmotionPackageItem(item.isCurrent, item.selectedCount, disabled)"
                    :id="item.id.toString()"
                    class="emotion-pack-item hazelspam-list-item"
                    :class="getPackageButtonClass(item.isCurrent)"
                    :tone="item.isCurrent ? 'primary' : 'surface'"
                    size="small"
                    :title="item.description || item.name"
                    @click="emit('select-package', item.id)"
                >
                    <img
                        class="emotion-pack-item__cover hazelspam-list-item__cover"
                        :src="item.coverUrl"
                        :alt="item.name || `表情包 ${item.id}`"
                    />
                    <span class="emotion-pack-item__text hazelspam-list-item__content">
                        <span class="emotion-pack-item__name hazelspam-list-item__title">
                            {{ item.name || `表情包 ${item.id}` }}
                        </span>
                        <small v-if="item.description" class="hazelspam-list-item__meta">
                            {{ item.description }}
                        </small>
                    </span>
                    <span
                        v-if="item.selectedCount > 0"
                        class="emotion-pack-item__count hazelspam-list-item__count"
                        :class="{
                            'emotion-pack-item__count--single': item.selectedCount < 10,
                            'hazelspam-list-item__count--single': item.selectedCount < 10
                        }"
                    >
                        {{ item.selectedCount }}
                    </span>
                </AppButton>
            </div>
        </div>

        <div class="emotion-pack-actions">
            <AppButton
                tone="danger"
                class="emotion-clear-all-btn"
                icon="pi pi-trash"
                label="取消选中所有表情"
                :disabled="selectedCount === 0 || disabled"
                @click="emit('clear-all')"
            />
        </div>
    </div>
</template>

<style scoped>
.emotion-pack-column {
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    row-gap: var(--hazelspam-space-md);
}

.emotion-pack-list {
    display: flex;
    flex-direction: column;
    gap: var(--hazelspam-space-sm);
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
}

.emotion-pack-list,
.emotion-pack-actions {
    box-sizing: border-box;
    padding-right: var(--emotion-pack-inline-offset);
}

.emotion-pack-actions {
    display: flex;
    justify-content: center;
    align-items: center;
}

@container hazelspam-panel (max-width: 760px) {
    .emotion-pack-list {
        overscroll-behavior: auto;
    }
}
</style>
