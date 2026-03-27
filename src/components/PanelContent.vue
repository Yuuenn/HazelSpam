<script lang="ts">
import { defineComponent } from 'vue'
import TextView from './TextView.vue'
import EmotionView from './EmotionView.vue'
import SettingView from './SettingView.vue'
import { useUIStore } from '@/stores/useUIStore'

export default defineComponent({
    components: {
        TextView,
        EmotionView,
        SettingView
    },
    setup() {
        const uiStore = useUIStore()
        return {
            uiStore
        }
    }
})
</script>

<template>
    <div class="panel-content">
        <KeepAlive>
            <component :is="uiStore.uiConfig.activeMenuIndex"></component>
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
