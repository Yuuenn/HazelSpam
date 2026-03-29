<script setup lang="ts">
import AppButton from './AppButton.vue'
import type { MenuIndex } from '@/types'
import { useUIStore } from '../stores/useUIStore'
import { PRODUCT_NAME } from '@/constants/brand'

const uiStore = useUIStore()

type SidebarItem = { label: string; key: MenuIndex; iconClass: string }

const mainMenuItems: SidebarItem[] = [
    {
        label: '独轮车',
        key: 'TextView',
        iconClass: 'pi pi-comments'
    },
    {
        label: '表情独轮车',
        key: 'EmotionView',
        iconClass: 'pi pi-face-smile'
    },
    {
        label: 'Crybaby 增强',
        key: 'CrybabyView',
        iconClass: 'pi pi-heart'
    }
]

const settingsItem: SidebarItem = {
    label: '全局设置',
    key: 'SettingView',
    iconClass: 'pi pi-cog'
}

const handleSelect = (key: MenuIndex) => {
    uiStore.updateMenuValue(key)
}

const isActive = (key: MenuIndex) => uiStore.uiConfig.activeMenuIndex === key
</script>

<template>
    <nav class="hazelspam-rail">
        <div class="hazelspam-rail__card">
            <div class="hazelspam-rail__top">
                <button
                    type="button"
                    class="hazelspam-brand"
                    :title="PRODUCT_NAME"
                    :aria-label="`${PRODUCT_NAME} 品牌图标`"
                >
                    <!-- Hidden debug brand-click entry is intentionally not wired right now.
                         Keep the reveal logic in useUIStore for future re-enable, but avoid
                         introducing hidden side effects on the current settings UI path. -->
                    <svg
                        class="hazelspam-brand__icon"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                        <path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
                        <path d="M10 12a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
                        <path d="M12 14l0 7" />
                        <path d="M10 12l-6.75 -2" />
                        <path d="M14 12l6.75 -2" />
                    </svg>
                </button>

                <div class="hazelspam-rail__list">
                    <span
                        v-for="item in mainMenuItems"
                        :key="item.key"
                        class="hazelspam-rail__tooltip-anchor"
                        :data-tooltip="item.label"
                    >
                        <AppButton
                            app-style="rail"
                            text
                            rounded
                            :icon="item.iconClass"
                            :aria-label="item.label"
                            :aria-current="isActive(item.key) ? 'page' : undefined"
                            @click="handleSelect(item.key)"
                        />
                    </span>
                </div>
            </div>

            <div class="hazelspam-rail__bottom">
                <span class="hazelspam-rail__tooltip-anchor" :data-tooltip="settingsItem.label">
                    <AppButton
                        app-style="rail"
                        text
                        rounded
                        :icon="settingsItem.iconClass"
                        :aria-label="settingsItem.label"
                        :aria-current="isActive(settingsItem.key) ? 'page' : undefined"
                        @click="handleSelect(settingsItem.key)"
                    />
                </span>
            </div>
        </div>
    </nav>
</template>

<style scoped>
.hazelspam-rail {
    height: 100%;
    display: flex;
    justify-content: flex-start;
    align-items: flex-start;
}

.hazelspam-rail__card {
    height: 100%;
    width: var(--hazelspam-size-rail-width, 60px);
    border-radius: var(--hazelspam-rail-card-radius);
    background: var(--hazelspam-color-rail-bg, rgb(241, 242, 245));
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    padding: var(--hazelspam-space-2xl) var(--hazelspam-space-md);
    gap: var(--hazelspam-space-2xl);
}

.hazelspam-rail__top {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--hazelspam-space-5xl);
}

.hazelspam-brand {
    width: var(--hazelspam-size-rail-button, 44px);
    height: var(--hazelspam-size-rail-button, 44px);
    border-radius: var(--hazelspam-rail-brand-radius);
    border: 1.5px solid var(--hazelspam-color-brand-border, var(--hazelspam-color-brand, #d5d5d5));
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--hazelspam-color-brand-icon, var(--hazelspam-color-brand, #d5d5d5));
    margin-bottom: var(--hazelspam-space-2xs, 2px);
    background: transparent;
    padding: 0;
    cursor: pointer;
    transition:
        transform var(--hazelspam-motion-duration-normal, 0.16s)
            var(--hazelspam-motion-ease-standard, ease),
        border-color var(--hazelspam-motion-duration-normal, 0.16s)
            var(--hazelspam-motion-ease-standard, ease),
        color var(--hazelspam-motion-duration-normal, 0.16s)
            var(--hazelspam-motion-ease-standard, ease);
}

.hazelspam-brand:hover {
    transform: scale(1.03);
}

.hazelspam-brand:active {
    transform: scale(0.97);
}

.hazelspam-brand:focus-visible {
    outline: var(--hazelspam-focus-ring-width, 2px)
        var(--hazelspam-focus-ring-style, solid)
        var(--hazelspam-focus-ring-color, var(--hazelspam-color-accent));
    outline-offset: var(--hazelspam-focus-ring-offset, 2px);
}

.hazelspam-brand__icon {
    width: var(--hazelspam-size-brand-icon, 25px);
    height: var(--hazelspam-size-brand-icon, 25px);
}

.hazelspam-rail__list,
.hazelspam-rail__bottom {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--hazelspam-space-md);
}

.hazelspam-rail__bottom {
    margin-top: auto;
}

.hazelspam-rail__tooltip-anchor {
    position: relative;
    display: inline-flex;
}

.hazelspam-rail__tooltip-anchor::after {
    content: attr(data-tooltip);
    position: absolute;
    left: calc(100% + var(--hazelspam-size-tooltip-gap, 10px));
    top: 50%;
    transform: translateY(-50%) translateX(calc(-1 * var(--hazelspam-size-tooltip-nudge, 2px)));
    opacity: 0;
    pointer-events: none;
    z-index: 51020;
    border-radius: var(--hazelspam-rail-tooltip-radius);
    padding: var(--hazelspam-space-sm) var(--hazelspam-space-md);
    background: color-mix(in srgb, var(--hazelspam-color-tooltip-bg, #0f172a) 92%, transparent);
    color: var(--hazelspam-color-tooltip-text, #fff);
    line-height: 1.25;
    white-space: nowrap;
    transition:
        opacity var(--hazelspam-motion-duration-normal, 0.16s) var(--hazelspam-motion-ease-standard, ease),
        transform var(--hazelspam-motion-duration-normal, 0.16s) var(--hazelspam-motion-ease-standard, ease);
}

.hazelspam-rail__tooltip-anchor::before {
    content: '';
    position: absolute;
    left: calc(100% + var(--hazelspam-size-tooltip-arrow-offset, 4px));
    top: 50%;
    transform: translateY(-50%) translateX(calc(-1 * var(--hazelspam-size-tooltip-nudge, 2px)));
    opacity: 0;
    pointer-events: none;
    z-index: 51020;
    border-style: solid;
    border-width: var(--hazelspam-size-tooltip-arrow-height, 5px) var(--hazelspam-size-tooltip-arrow-width, 6px)
        var(--hazelspam-size-tooltip-arrow-height, 5px) 0;
    border-color: transparent
        color-mix(in srgb, var(--hazelspam-color-tooltip-bg, #0f172a) 92%, transparent) transparent
        transparent;
    transition:
        opacity var(--hazelspam-motion-duration-normal, 0.16s) var(--hazelspam-motion-ease-standard, ease),
        transform var(--hazelspam-motion-duration-normal, 0.16s) var(--hazelspam-motion-ease-standard, ease);
}

.hazelspam-rail__tooltip-anchor:hover::before,
.hazelspam-rail__tooltip-anchor:hover::after {
    opacity: 1;
    transform: translateY(-50%) translateX(0);
}
</style>
