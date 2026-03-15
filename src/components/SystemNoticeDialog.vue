<script setup lang="ts">
import { computed } from 'vue'
import AppButton from './AppButton.vue'
import AppDialog from './AppDialog.vue'
import { hideSystemDialog, useSystemDialogState } from '@/utils/ui/systemDialog'
import type { AppButtonTone } from '@/constants/button'

const systemDialogState = useSystemDialogState()

const dialogVisible = computed({
    get: () => systemDialogState.visible,
    set: (visible: boolean) => {
        systemDialogState.visible = visible
    }
})

const confirmTone = computed<AppButtonTone>(() => {
    if (systemDialogState.severity === 'error') return 'danger'
    if (systemDialogState.severity === 'warning') return 'danger'
    if (systemDialogState.severity === 'success') return 'success'
    return 'primary'
})
</script>

<template>
    <AppDialog
        v-model:visible="dialogVisible"
        :dismissableMask="systemDialogState.closable"
        :closable="systemDialogState.closable"
        :base-z-index="55000"
        append-to="body"
        :header="systemDialogState.title"
    >
        <p class="system-dialog-content">{{ systemDialogState.content }}</p>
        <div v-if="systemDialogState.confirmText" class="hazelspam-panel-actions system-dialog-actions">
            <AppButton :tone="confirmTone" @click="hideSystemDialog">
                {{ systemDialogState.confirmText }}
            </AppButton>
        </div>
    </AppDialog>
</template>

<style scoped>
.system-dialog-content {
    margin: 0;
    font-size: var(--hazelspam-type-size-body-sm);
    line-height: 1.5;
    white-space: pre-wrap;
}

.system-dialog-actions {
    margin-top: var(--hazelspam-space-lg);
    display: flex;
    justify-content: flex-end;
}
</style>
