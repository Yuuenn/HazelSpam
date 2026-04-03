<script setup lang="ts">
import { computed, type Component } from 'vue'
import TextView from './TextView.vue'
import EmotionView from './EmotionView.vue'
import CrybabyView from './CrybabyView.vue'
import SettingView from './SettingView.vue'
import { useUIStore } from '@/stores/useUIStore'
import type { MenuIndex } from '@/types'

const uiStore = useUIStore()
const panelViews: Record<MenuIndex, Component> = {
    TextView,
    EmotionView,
    CrybabyView,
    SettingView
}
const activePanelView = computed(() => panelViews[uiStore.uiConfig.activeMenuIndex])
</script>

<template>
    <div class="panel-content">
        <KeepAlive>
            <component :is="activePanelView"></component>
        </KeepAlive>
    </div>
</template>

<style scoped>
.panel-content {
    height: 100%;
    min-height: 0;
    overflow: hidden;
}
</style>
