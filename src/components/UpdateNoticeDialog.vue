<script setup lang="ts">
import { computed } from 'vue'
import AppButton from './AppButton.vue'
import AppDialog from './AppDialog.vue'
import { unsafeWindow } from '$'
import { PRODUCT_NAME } from '@/constants/brand'
import { useUpdateDialogState } from '@/utils/ui/updateDialog'

const updateDialogState = useUpdateDialogState()

const dialogVisible = computed({
    get: () => updateDialogState.visible,
    set: (visible: boolean) => {
        updateDialogState.visible = visible
    }
})

const dialogTitle = computed(() =>
    updateDialogState.version ? `发现新版本：${updateDialogState.version}` : '发现新版本'
)

const openChangelog = () => {
    unsafeWindow.open(updateDialogState.changelogUrl)
}

const installUpdate = () => {
    if (!updateDialogState.downloadUrl) return
    unsafeWindow.open(updateDialogState.downloadUrl)
}
</script>

<template>
    <AppDialog
        v-model:visible="dialogVisible"
        :base-z-index="55000"
        append-to="body"
        :header="dialogTitle"
    >
        <p class="update-notice-content">
            检测到 {{ PRODUCT_NAME }} 有新版本，建议查看更新日志后安装。
        </p>
        <p v-if="!updateDialogState.downloadUrl" class="update-notice-meta">
            当前发布信息未提供安装链接，请先查看更新日志。
        </p>
        <div class="hazelspam-panel-actions update-notice-actions">
            <AppButton tone="surface" @click="openChangelog">查看更新日志</AppButton>
            <AppButton tone="success" :disabled="!updateDialogState.downloadUrl" @click="installUpdate">
                安装
            </AppButton>
        </div>
    </AppDialog>
</template>

<style scoped>
.update-notice-content {
    margin: 0;
    font-size: var(--hazelspam-type-size-body-sm);
    line-height: 1.5;
}

.update-notice-meta {
    margin: var(--hazelspam-space-sm) 0 0;
    font-size: var(--hazelspam-type-size-caption);
    line-height: 1.5;
    color: var(--hazelspam-color-text-muted, var(--p-text-muted-color));
}

.update-notice-actions {
    margin-top: var(--hazelspam-space-lg);
    display: flex;
    flex-wrap: wrap;
    gap: var(--hazelspam-space-xs);
    justify-content: flex-end;
}
</style>
