<script setup lang="ts">
import { computed, toRef } from 'vue'
import Dialog from 'primevue/dialog'
import Toast from 'primevue/toast'
import { useUIStore } from './stores/useUIStore'
import { useBiliStore } from './stores/useBiliStore'
import { useAppShellLayout } from './composables/useAppShellLayout'
import { useAppButtonInjection } from './composables/useAppButtonInjection'
import { useGlobalScrollbarStyle } from './composables/useGlobalScrollbarStyle'
import { useHostThemeSync } from './composables/useHostThemeSync'
import PanelMenu from './components/PanelMenu.vue'
import PanelContent from './components/PanelContent.vue'
import UpdateNoticeDialog from './components/UpdateNoticeDialog.vue'
import SystemNoticeDialog from './components/SystemNoticeDialog.vue'
import { createAppButtonChrome } from './constants/button'
import {
    APP_DARK_CLASS,
    APP_MESSAGE_GROUP,
    APP_MODAL_CLASS,
    APP_NOTIFICATION_GROUP,
    APP_ROOT_CLASS,
    APP_TOAST_CLASS
} from './constants/brand'
import './theme/typographyTokens.css'
import './theme/typographyRules.css'
import './theme/layoutTokens.css'
import './theme/panelLayoutRules.css'
import './theme/interactionRules.css'
import './theme/buttonRules.css'

const uiStore = useUIStore()
const biliStore = useBiliStore()
uiStore.uiConfig.isShowPanel = false

const panelVisible = toRef(uiStore.uiConfig, 'isShowPanel')
const { shellStageClass, shellStageStyle, updateShellViewport } = useAppShellLayout(panelVisible)
const { syncThemeFromHost } = useHostThemeSync(uiStore.uiConfig, { syncColorTokens: true })
const isDarkTheme = computed(() => uiStore.uiConfig.theme === 'dark')
const rootClass = computed(() => [APP_ROOT_CLASS, { [APP_DARK_CLASS]: isDarkTheme.value }])
const panelDialogClass = computed(() => [APP_MODAL_CLASS, { [APP_DARK_CLASS]: isDarkTheme.value }])
const toastClass = computed(() => [APP_TOAST_CLASS, { [APP_DARK_CLASS]: isDarkTheme.value }])
const toastCloseButtonProps = createAppButtonChrome({ style: 'icon' })
const toastSuccessIconClass = 'hazelspam-toast-icon hazelspam-toast-icon--success'
const toastErrorIconClass = 'hazelspam-toast-icon hazelspam-toast-icon--error'
const toastWarnIconClass = 'hazelspam-toast-icon hazelspam-toast-icon--warn'
const toastInfoIconClass = 'hazelspam-toast-icon hazelspam-toast-icon--info'

const handleOpenPanel = () => {
    if (!biliStore.loginInfo?.isLogin) {
        uiStore.uiConfig.isShowPanel = false
        return
    }
    uiStore.uiConfig.isShowPanel = true
    syncThemeFromHost()
    updateShellViewport()
}

useAppButtonInjection({ onOpenPanel: handleOpenPanel })
useGlobalScrollbarStyle()
</script>

<template>
    <div :class="rootClass">
        <Dialog
            v-model:visible="uiStore.uiConfig.isShowPanel"
            :class="panelDialogClass"
            modal
            :showHeader="false"
            :closable="false"
            :dismissableMask="true"
            :draggable="false"
            :blockScroll="false"
            :style="{
                maxWidth: 'var(--hazelspam-size-panel-max-width, 1240px)',
                width: 'calc(100vw - var(--hazelspam-size-panel-vw-gap, 48px))'
            }"
            :pt="{
                root: { style: 'overflow: visible; border-radius: var(--hazelspam-shell-radius);' },
                content: { style: 'padding: 0; overflow: visible; background: transparent;' }
            }"
        >
            <div :class="['hazelspam-shell-stage', shellStageClass]" :style="shellStageStyle">
                <div class="hazelspam-shell">
                    <aside class="hazelspam-shell__sider">
                        <PanelMenu />
                    </aside>
                    <main class="hazelspam-shell__content">
                        <div class="hazelspam-shell__content-card">
                            <PanelContent />
                        </div>
                    </main>
                </div>
            </div>
        </Dialog>
        <UpdateNoticeDialog />
        <SystemNoticeDialog />

        <Toast
            :class="toastClass"
            :group="APP_MESSAGE_GROUP"
            position="top-right"
            :successIcon="toastSuccessIconClass"
            :errorIcon="toastErrorIconClass"
            :warnIcon="toastWarnIconClass"
            :infoIcon="toastInfoIconClass"
            :closeButtonProps="toastCloseButtonProps"
        />
        <Toast
            :class="toastClass"
            :group="APP_NOTIFICATION_GROUP"
            position="top-right"
            :successIcon="toastSuccessIconClass"
            :errorIcon="toastErrorIconClass"
            :warnIcon="toastWarnIconClass"
            :infoIcon="toastInfoIconClass"
            :closeButtonProps="toastCloseButtonProps"
        />
    </div>
</template>

<style scoped>
:global(#hazelspam),
:global(#hazelspam *),
:global(#hazelspam *::before),
:global(#hazelspam *::after),
:global(.hazelspam-root),
:global(.hazelspam-root *),
:global(.hazelspam-root *::before),
:global(.hazelspam-root *::after),
:global(.hazelspam-modal),
:global(.hazelspam-modal *),
:global(.hazelspam-modal *::before),
:global(.hazelspam-modal *::after),
:global(.hazelspam-dialog),
:global(.hazelspam-dialog *),
:global(.hazelspam-dialog *::before),
:global(.hazelspam-dialog *::after),
:global(.hazelspam-toast),
:global(.hazelspam-toast *),
:global(.hazelspam-toast *::before),
:global(.hazelspam-toast *::after) {
    box-sizing: border-box;
}

:global(#hazelspam .p-toggleswitch),
:global(.hazelspam-modal .p-toggleswitch),
:global(.hazelspam-dialog .p-toggleswitch),
.hazelspam-root :deep(.p-toggleswitch) {
    width: var(--hazelspam-switch-width) !important;
    height: var(--hazelspam-switch-height) !important;
}

:global(#hazelspam .p-toggleswitch .p-toggleswitch-handle),
:global(.hazelspam-modal .p-toggleswitch .p-toggleswitch-handle),
:global(.hazelspam-dialog .p-toggleswitch .p-toggleswitch-handle),
.hazelspam-root :deep(.p-toggleswitch .p-toggleswitch-handle) {
    width: var(--hazelspam-switch-handle-size) !important;
    height: var(--hazelspam-switch-handle-size) !important;
    inset-inline-start: var(--hazelspam-switch-gap) !important;
    margin-block-start: calc(-1 * (var(--hazelspam-switch-handle-size) / 2)) !important;
}

:global(#hazelspam .p-toggleswitch.p-toggleswitch-checked .p-toggleswitch-handle),
:global(.hazelspam-modal .p-toggleswitch.p-toggleswitch-checked .p-toggleswitch-handle),
:global(.hazelspam-dialog .p-toggleswitch.p-toggleswitch-checked .p-toggleswitch-handle),
.hazelspam-root :deep(.p-toggleswitch.p-toggleswitch-checked .p-toggleswitch-handle) {
    inset-inline-start: calc(
        var(--hazelspam-switch-width) - (var(--hazelspam-switch-handle-size) + var(--hazelspam-switch-gap))
    ) !important;
}

:global(.hazelspam-dialog.p-dialog) {
    width: min(
        var(--hazelspam-size-dialog-max-width, 620px),
        calc(100vw - var(--hazelspam-size-panel-vw-gap, 48px))
    ) !important;
    max-width: calc(100vw - var(--hazelspam-size-panel-vw-gap, 48px)) !important;
    max-height: min(80vh, var(--hazelspam-size-dialog-max-height, 608px));
    display: flex;
    flex-direction: column;
    border-radius: var(--hazelspam-radius-3xl);
    overflow: hidden;
    background: var(--hazelspam-color-shell-card-bg, var(--p-content-background));
    border: 1px solid var(--hazelspam-color-surface-border, var(--p-content-border-color));
    color: var(--hazelspam-color-text-primary, var(--p-text-color));
}

:global(.hazelspam-dialog .p-dialog-header),
:global(.hazelspam-dialog .p-dialog-content),
:global(.hazelspam-dialog .p-dialog-footer) {
    background: var(--hazelspam-color-shell-card-bg, var(--p-content-background));
    color: var(--hazelspam-color-text-primary, var(--p-text-color));
}

:global(.hazelspam-dialog .p-dialog-header) {
    padding: var(
        --hazelspam-dialog-header-padding,
        var(--p-dialog-header-padding, var(--hazelspam-space-xl) var(--hazelspam-space-2xl))
    );
    border-bottom: none;
}

:global(.hazelspam-dialog .p-dialog-footer) {
    padding: var(
        --hazelspam-dialog-footer-padding,
        var(--p-dialog-footer-padding, var(--hazelspam-space-md) var(--hazelspam-space-2xl))
    );
    border-top: none;
}

:global(.hazelspam-dialog .p-dialog-content) {
    padding: var(
        --hazelspam-dialog-content-padding,
        var(--p-dialog-content-padding, var(--hazelspam-space-md) var(--hazelspam-space-2xl))
    );
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
}

:global(.hazelspam-scroll-hint-shell) {
    position: relative;
    min-height: 0;
    --hazelspam-scroll-hint-height: 68px;
    --hazelspam-scroll-hint-ambient-opacity: 0.68;
    --hazelspam-scroll-hint-focus-opacity: 1;
    --hazelspam-scroll-hint-color: color-mix(
        in srgb,
        var(--hazelspam-color-scroll-hint, var(--p-content-background, #ffffff)) 100%,
        transparent
    );
    --hazelspam-scroll-hint-transition: 0.08s linear;
}

:global(.hazelspam-scroll-hint-shell) {
    overflow: hidden;
}

:global(.hazelspam-scroll-hint-shell--fill) {
    display: flex;
    flex: 1;
    min-height: 0;
}

:global(.hazelspam-scroll-hint-shell > .hazelspam-faux-scroll) {
    width: 100%;
}

:global(.hazelspam-scroll-hint-shell--fill > .hazelspam-faux-scroll) {
    flex: 1;
    min-height: 0;
}

:global(.hazelspam-faux-scroll) {
    scrollbar-width: none !important;
    scrollbar-color: transparent transparent !important;
    -ms-overflow-style: none;
}

:global(.hazelspam-faux-scroll::-webkit-scrollbar) {
    width: 0 !important;
    height: 0 !important;
    display: none;
}

:global(.hazelspam-scroll-hint-shell::before),
:global(.hazelspam-scroll-hint-shell::after),
:global(.hazelspam-scroll-hint-shell::after) {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    height: var(--hazelspam-scroll-hint-height, 26px);
    pointer-events: none;
    z-index: 1;
    opacity: 0;
    transition: opacity var(--hazelspam-scroll-hint-transition, 0.08s linear);
}

:global(.hazelspam-scroll-hint-shell::before) {
    top: 0;
    bottom: auto;
    background: linear-gradient(to bottom, var(--hazelspam-scroll-hint-color) 0%, transparent 100%);
}

:global(.hazelspam-scroll-hint-shell::after) {
    top: auto;
    bottom: 0;
    background: linear-gradient(to bottom, transparent 0%, var(--hazelspam-scroll-hint-color) 100%);
}

:global(.hazelspam-scroll-hint-shell[data-scroll-hint='up']::before),
:global(.hazelspam-scroll-hint-shell[data-scroll-hint='both']::before) {
    opacity: var(--hazelspam-scroll-hint-ambient-opacity);
}

:global(.hazelspam-scroll-hint-shell[data-scroll-hint='down']::after),
:global(.hazelspam-scroll-hint-shell[data-scroll-hint='both']::after) {
    opacity: var(--hazelspam-scroll-hint-ambient-opacity);
}

:global(.hazelspam-scroll-hint-shell[data-scroll-hint='up']:hover::before),
:global(.hazelspam-scroll-hint-shell[data-scroll-hint='both']:hover::before),
:global(.hazelspam-scroll-hint-shell[data-scroll-hint='up']:focus-within::before),
:global(.hazelspam-scroll-hint-shell[data-scroll-hint='both']:focus-within::before) {
    opacity: var(--hazelspam-scroll-hint-focus-opacity);
}

:global(.hazelspam-scroll-hint-shell[data-scroll-hint='down']:hover::after),
:global(.hazelspam-scroll-hint-shell[data-scroll-hint='both']:hover::after),
:global(.hazelspam-scroll-hint-shell[data-scroll-hint='down']:focus-within::after),
:global(.hazelspam-scroll-hint-shell[data-scroll-hint='both']:focus-within::after) {
    opacity: var(--hazelspam-scroll-hint-focus-opacity);
}

:global(.hazelspam-dialog .p-dialog-title) {
    font-size: var(--hazelspam-type-size-h2);
    font-weight: var(--hazelspam-type-weight-semibold);
    line-height: 1.35;
    color: inherit;
}

:global(.hazelspam-dialog .p-dialog-header-actions [data-hazelspam-button-style='icon']),
:global(.hazelspam-dialog .p-dialog-header-actions [data-hazelspam-button-style='icon']:focus),
:global(
        .hazelspam-dialog .p-dialog-header-actions [data-hazelspam-button-style='icon']:focus-visible
    ),
:global(.hazelspam-dialog .p-dialog-header-actions [data-hazelspam-button-style='icon']:active) {
    outline: none !important;
    outline-width: 0 !important;
    outline-offset: 0 !important;
    box-shadow: none !important;
    border-color: transparent !important;
}

:global(.hazelspam-modal.p-dialog) {
    border-radius: var(--hazelspam-shell-radius);
    overflow: visible;
    background: transparent;
    border: none;
    box-shadow: none;
}

:global(.hazelspam-modal .p-dialog-content) {
    padding: 0 !important;
    overflow: visible !important;
    background: transparent !important;
}

.hazelspam-shell-stage {
    width: 100%;
    height: var(--hazelspam-shell-stage-height, var(--hazelspam-shell-design-height, 760px));
    min-height: 0;
    overflow: visible;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    background: transparent;
    padding: var(--hazelspam-space-sm);
    box-sizing: border-box;
}

.hazelspam-shell {
    display: flex;
    width: 100%;
    height: var(--hazelspam-shell-render-height, var(--hazelspam-shell-design-height, 760px));
    min-height: var(--hazelspam-shell-render-height, var(--hazelspam-shell-design-height, 760px));
    max-height: var(--hazelspam-shell-render-height, var(--hazelspam-shell-design-height, 760px));
    transform: scale(var(--hazelspam-shell-scale, 1));
    transform-origin: top center;
    will-change: transform;
    border-radius: var(--hazelspam-shell-radius);
    overflow: hidden;
    border: 1px solid
        color-mix(
            in srgb,
            var(--hazelspam-color-text-primary, var(--p-text-color, #1f2937)) 8%,
            transparent
        );
    background: var(--hazelspam-color-shell-bg, #fff);
    box-shadow: var(--hazelspam-shadow-shell);
}

.hazelspam-shell__sider {
    width: var(--hazelspam-shell-sider-width, 84px);
    min-width: var(--hazelspam-shell-sider-width, 84px);
    min-height: 0;
    background: var(--hazelspam-color-shell-sider-bg, #fff);
    padding: var(--hazelspam-shell-padding);
}

.hazelspam-shell__content {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    overflow: hidden;
    padding: var(--hazelspam-shell-padding) var(--hazelspam-shell-padding) var(--hazelspam-shell-padding) 0;
}

.hazelspam-shell__content-card {
    flex: 1;
    min-width: 0;
    min-height: 0;
    border-radius: var(--hazelspam-shell-card-radius);
    border: 1px solid
        color-mix(
            in srgb,
            var(--hazelspam-color-text-primary, var(--p-text-color, #1f2937)) 8%,
            transparent
        );
    background: var(--hazelspam-color-shell-card-bg, #fff);
    overflow: hidden;
    padding: var(--hazelspam-shell-content-card-padding-y) var(--hazelspam-shell-content-card-padding-x);
}

.hazelspam-dark .hazelspam-shell {
    background: var(--hazelspam-color-shell-bg, #101215);
}

.hazelspam-dark .hazelspam-shell__sider {
    background: var(--hazelspam-color-shell-sider-bg, #101215);
}

.hazelspam-dark .hazelspam-shell__content-card {
    background: var(--hazelspam-color-shell-card-bg, #101215);
}

:global(.hazelspam-toast.p-toast) {
    --p-toast-summary-font-size: var(--hazelspam-type-size-h5, 15px);
    --p-toast-summary-font-weight: var(--hazelspam-type-weight-semibold, 600);
    --p-toast-detail-font-size: var(--hazelspam-type-size-caption, 12px);
    --hazelspam-toast-icon-size: var(--hazelspam-type-size-h2, 20px);
    --hazelspam-toast-icon-warn-color: #a16207;
    --hazelspam-toast-icon-info-color: #1d4ed8;
}

:global(.hazelspam-toast.p-toast .p-toast-message-content) {
    align-items: center;
}

:global(.hazelspam-toast.p-toast .p-toast-message-text) {
    gap: calc(var(--hazelspam-space-2xs, 2px) / 2);
}

:global(.hazelspam-toast.p-toast .p-icon.p-toast-message-icon),
:global(.hazelspam-toast.p-toast .p-toast-message-icon) {
    margin: 0;
    align-self: center;
    font-size: var(--hazelspam-toast-icon-size);
    width: var(--hazelspam-toast-icon-size);
    height: var(--hazelspam-toast-icon-size);
}

:global(.hazelspam-toast.p-toast .p-toast-message-icon.hazelspam-toast-icon) {
    display: inline-block;
    flex: 0 0 var(--hazelspam-toast-icon-size);
    font-size: 0;
    background-color: currentColor;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
    -webkit-mask-size: contain;
    mask-size: contain;
    -webkit-mask-position: center;
    mask-position: center;
}

:global(.hazelspam-toast.p-toast .p-toast-message-success .hazelspam-toast-icon--success) {
    color: var(--hazelspam-color-success, #16a34a);
    -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='none' stroke='%23000' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m5 12l5 5L20 7'/%3E%3C/svg%3E");
    mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='none' stroke='%23000' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m5 12l5 5L20 7'/%3E%3C/svg%3E");
}

:global(.hazelspam-toast.p-toast .p-toast-message-error .hazelspam-toast-icon--error) {
    color: var(--hazelspam-color-danger, #d83b44);
    -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='none' stroke='%23000' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M18 6L6 18M6 6l12 12'/%3E%3C/svg%3E");
    mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='none' stroke='%23000' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M18 6L6 18M6 6l12 12'/%3E%3C/svg%3E");
}

:global(.hazelspam-toast.p-toast .p-toast-message-warn .hazelspam-toast-icon--warn) {
    color: var(--hazelspam-toast-icon-warn-color, #a16207);
    -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='none' stroke='%23000' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M12 3c7.2 0 9 1.8 9 9s-1.8 9-9 9s-9-1.8-9-9s1.8-9 9-9m0 5v4m0 4h.01'/%3E%3C/svg%3E");
    mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='none' stroke='%23000' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M12 3c7.2 0 9 1.8 9 9s-1.8 9-9 9s-9-1.8-9-9s1.8-9 9-9m0 5v4m0 4h.01'/%3E%3C/svg%3E");
}

:global(.hazelspam-toast.p-toast .p-toast-message-info .hazelspam-toast-icon--info) {
    color: var(--hazelspam-toast-icon-info-color, #1d4ed8);
    -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cg fill='none' stroke='%23000' stroke-linecap='round' stroke-linejoin='round' stroke-width='2'%3E%3Cpath d='M3 12a9 9 0 1 0 18 0a9 9 0 0 0-18 0m9-3h.01'/%3E%3Cpath d='M11 12h1v4h1'/%3E%3C/g%3E%3C/svg%3E");
    mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cg fill='none' stroke='%23000' stroke-linecap='round' stroke-linejoin='round' stroke-width='2'%3E%3Cpath d='M3 12a9 9 0 1 0 18 0a9 9 0 0 0-18 0m9-3h.01'/%3E%3Cpath d='M11 12h1v4h1'/%3E%3C/g%3E%3C/svg%3E");
}

:global(.hazelspam-toast.p-toast .p-toast-summary) {
    font-size: var(--p-toast-summary-font-size) !important;
    font-weight: var(--p-toast-summary-font-weight) !important;
    line-height: 1.35;
}

:global(.hazelspam-toast.p-toast .p-toast-detail) {
    font-size: var(--p-toast-detail-font-size) !important;
    line-height: 1.45;
}

</style>
