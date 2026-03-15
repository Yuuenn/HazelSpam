<script setup lang="ts">
import { computed } from 'vue'
import AppButton from './AppButton.vue'
import AppDialog from './AppDialog.vue'

type SortDialogItem = {
    id: number
    tab: string
}

const props = defineProps<{
    visible: boolean
    items: SortDialogItem[]
}>()

const emit = defineEmits<{
    (event: 'update:visible', value: boolean): void
    (event: 'move', index: number, step: -1 | 1): void
}>()

const modelVisible = computed({
    get: () => props.visible,
    set: (value: boolean) => emit('update:visible', value)
})

const handleMove = (index: number, step: -1 | 1) => {
    emit('move', index, step)
}
</script>

<template>
    <AppDialog
        v-model:visible="modelVisible"
        header="标签页排序"
        class="tab-sort-dialog"
        content-class="tab-sort-dialog__content"
    >
        <div class="tab-sort-dialog__shell hazelspam-scroll-hint-shell">
            <div class="tab-sort-dialog__list hazelspam-faux-scroll">
                <div
                    class="tab-sort-dialog__item hazelspam-row-group"
                    v-for="(item, index) in items"
                    :key="item.id"
                >
                    <AppButton
                        app-style="row"
                        tone="surface"
                        class="tab-btn"
                        :label="item.tab || `标签页 ${item.id}`"
                        size="small"
                    />
                    <div class="tab-sort-dialog__actions">
                        <AppButton
                            app-style="icon"
                            tone="surface"
                            class="sort-move-btn"
                            icon="pi pi-arrow-up"
                            @click="handleMove(index, -1)"
                            :disabled="index === 0"
                        />
                        <AppButton
                            app-style="icon"
                            tone="surface"
                            class="sort-move-btn"
                            icon="pi pi-arrow-down"
                            @click="handleMove(index, 1)"
                            :disabled="index === items.length - 1"
                        />
                    </div>
                </div>
            </div>
        </div>
    </AppDialog>
</template>

<style scoped>
:global(.tab-sort-dialog__content) {
    --tab-visible-count: 7;
    --sort-row-height: var(--hazelspam-size-sort-row-height, 28px);
    --sort-row-gap: var(--hazelspam-space-lg);
    --sort-icon-btn-size: var(--sort-row-height);
    --sort-icon-btn-radius: var(--hazelspam-tool-radius);
    --hazelspam-pill-height: var(--sort-row-height);
    --hazelspam-icon-btn-size: var(--sort-icon-btn-size);
    --hazelspam-icon-btn-radius: var(--sort-icon-btn-radius);
    overflow: hidden;
    display: flex;
    min-height: 0;
}

.tab-sort-dialog__shell {
    display: flex;
    flex: 1;
    min-height: 0;
}

.tab-sort-dialog__list {
    display: flex;
    flex-direction: column;
    gap: var(--sort-row-gap, var(--hazelspam-space-lg, 10px));
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
    max-height: calc(
        (var(--sort-row-height) * var(--tab-visible-count, 7)) +
            (var(--sort-row-gap, var(--hazelspam-space-lg, 10px)) * (var(--tab-visible-count, 7) - 1))
    );
    padding-right: var(--hazelspam-space-2xs, 2px);
}

.tab-sort-dialog__item {
    min-height: var(--sort-row-height);
}

.tab-sort-dialog__actions {
    display: flex;
    gap: var(--hazelspam-space-md);
    flex: 0 0 auto;
    margin-left: var(--hazelspam-space-md);
}
</style>
