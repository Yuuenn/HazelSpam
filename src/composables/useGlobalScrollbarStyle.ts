import { watch } from 'vue'
import { GM_addStyle } from '$'
import { appShellScrollScopeSelector } from '@/composables/useAppShellLayout'
import { useUIStore } from '@/stores/useUIStore'
import {
    APP_HOST_BUTTON_CLASS,
    APP_HOST_BUTTON_ICON_CLASS,
    APP_TOOLTIP_CLASS,
    APP_TOOLTIP_UP_CLASS
} from '@/constants/brand'

const scrollbarScope = `:is(${appShellScrollScopeSelector})`
const scrollbarActiveColor = 'color-mix(in srgb, var(--p-text-color, #8f8f8f) 34%, transparent)'
const tooltipSelector = `.${APP_TOOLTIP_CLASS}`
const tooltipUpSelector = `.${APP_TOOLTIP_UP_CLASS}`
const appButtonSelector = `.${APP_HOST_BUTTON_CLASS}`
const appButtonIconSelector = `.${APP_HOST_BUTTON_ICON_CLASS}`
const hostDanmakuHistoryListSelector = `:is(.chat-history-list, .chat-history-list.h-100.p-relative.border-box.with-brush-prompt)`
const hostDanmakuScrollbarStyleId = 'hazelspam-host-danmaku-scrollbar-style'

const GLOBAL_SCROLLBAR_STYLE = `
${scrollbarScope},
${scrollbarScope} * {
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
}
${scrollbarScope}::-webkit-scrollbar,
${scrollbarScope} *::-webkit-scrollbar {
    width: var(--hazelspam-size-scrollbar-thin, 3px);
    height: var(--hazelspam-size-scrollbar-thin, 3px);
    background: transparent;
}
${scrollbarScope}::-webkit-scrollbar-track,
${scrollbarScope} *::-webkit-scrollbar-track {
    background: transparent;
}
${scrollbarScope}::-webkit-scrollbar-thumb,
${scrollbarScope} *::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: var(--hazelspam-radius-pill, 999px);
    transition:
        background-color var(--hazelspam-motion-duration-slow, 0.2s)
            var(--hazelspam-motion-ease-standard, ease);
}
${scrollbarScope}::-webkit-scrollbar-corner,
${scrollbarScope} *::-webkit-scrollbar-corner {
    background: transparent;
}
${scrollbarScope}::-webkit-scrollbar-button,
${scrollbarScope} *::-webkit-scrollbar-button {
    display: none;
    width: 0;
    height: 0;
    background: transparent;
}
${scrollbarScope}:hover,
${scrollbarScope}:focus,
${scrollbarScope}:focus-within,
${scrollbarScope} *:hover,
${scrollbarScope} *:focus,
${scrollbarScope} *:focus-within {
    scrollbar-color: ${scrollbarActiveColor} transparent;
}
${scrollbarScope}:hover::-webkit-scrollbar-thumb,
${scrollbarScope}:focus::-webkit-scrollbar-thumb,
${scrollbarScope}:focus-within::-webkit-scrollbar-thumb,
${scrollbarScope} *:hover::-webkit-scrollbar-thumb,
${scrollbarScope} *:focus::-webkit-scrollbar-thumb,
${scrollbarScope} *:focus-within::-webkit-scrollbar-thumb {
    background: ${scrollbarActiveColor};
}
${tooltipSelector},
${tooltipUpSelector} {
    --hazelspam-tooltip-bg-current: color-mix(in srgb, var(--hazelspam-color-tooltip-bg, #0f172a) 92%, transparent);
}
${tooltipSelector}.p-tooltip-right,
${tooltipSelector}.p-tooltip-left,
${tooltipUpSelector}.p-tooltip-right,
${tooltipUpSelector}.p-tooltip-left {
    padding: 0 var(--hazelspam-size-tooltip-arrow-width, 6px);
}
${tooltipSelector}.p-tooltip-top,
${tooltipSelector}.p-tooltip-bottom,
${tooltipUpSelector}.p-tooltip-top,
${tooltipUpSelector}.p-tooltip-bottom {
    padding: var(--hazelspam-size-tooltip-arrow-height, 5px) 0;
}
${tooltipSelector} .p-tooltip-text,
${tooltipUpSelector} .p-tooltip-text {
    border-radius: var(--hazelspam-radius-sm, 8px);
    padding: var(--hazelspam-space-sm, 6px) var(--hazelspam-space-md, 8px);
    background: var(--hazelspam-tooltip-bg-current);
    color: var(--hazelspam-color-tooltip-text, #fff);
    line-height: 1.3;
}
${tooltipSelector} .p-tooltip-arrow,
${tooltipUpSelector} .p-tooltip-arrow {
    border-color: transparent !important;
    border-style: solid;
}
${tooltipSelector}.p-tooltip-right .p-tooltip-arrow,
${tooltipUpSelector}.p-tooltip-right .p-tooltip-arrow {
    left: 1px !important;
    margin-top: calc(-1 * var(--hazelspam-size-tooltip-arrow-height, 5px)) !important;
    border-width: var(--hazelspam-size-tooltip-arrow-height, 5px) var(--hazelspam-size-tooltip-arrow-width, 6px)
        var(--hazelspam-size-tooltip-arrow-height, 5px) 0 !important;
    border-right-color: var(--hazelspam-tooltip-bg-current) !important;
}
${tooltipSelector}.p-tooltip-left .p-tooltip-arrow,
${tooltipUpSelector}.p-tooltip-left .p-tooltip-arrow {
    right: 1px !important;
    margin-top: calc(-1 * var(--hazelspam-size-tooltip-arrow-height, 5px)) !important;
    border-width: var(--hazelspam-size-tooltip-arrow-height, 5px) 0 var(--hazelspam-size-tooltip-arrow-height, 5px)
        var(--hazelspam-size-tooltip-arrow-width, 6px) !important;
    border-left-color: var(--hazelspam-tooltip-bg-current) !important;
}
${tooltipSelector}.p-tooltip-bottom .p-tooltip-arrow,
${tooltipUpSelector}.p-tooltip-bottom .p-tooltip-arrow {
    top: 1px !important;
    margin-left: calc(-1 * var(--hazelspam-size-tooltip-arrow-width, 6px)) !important;
    border-width: 0 var(--hazelspam-size-tooltip-arrow-width, 6px) var(--hazelspam-size-tooltip-arrow-height, 5px)
        var(--hazelspam-size-tooltip-arrow-width, 6px) !important;
    border-bottom-color: var(--hazelspam-tooltip-bg-current) !important;
}
${tooltipSelector}.p-tooltip-top .p-tooltip-arrow,
${tooltipUpSelector}.p-tooltip-top .p-tooltip-arrow {
    bottom: 1px !important;
    margin-left: calc(-1 * var(--hazelspam-size-tooltip-arrow-width, 6px)) !important;
    border-width: var(--hazelspam-size-tooltip-arrow-height, 5px) var(--hazelspam-size-tooltip-arrow-width, 6px) 0
        var(--hazelspam-size-tooltip-arrow-width, 6px) !important;
    border-top-color: var(--hazelspam-tooltip-bg-current) !important;
}
${appButtonSelector} {
    color: var(--hazelspam-host-button-color, #c9ccd0);
}
${appButtonSelector}:focus-visible {
    outline: none;
}
${appButtonIconSelector} {
    display: block;
    width: var(--hazelspam-size-app-icon, 24px);
    height: var(--hazelspam-size-app-icon, 24px);
    transform-origin: center;
    will-change: transform;
}
`

const HOST_DANMAKU_SCROLLBAR_STYLE = `
${hostDanmakuHistoryListSelector} {
    scrollbar-width: none !important;
    scrollbar-color: transparent transparent !important;
    -ms-overflow-style: none !important;
}
${hostDanmakuHistoryListSelector}::-webkit-scrollbar {
    width: 0 !important;
    height: 0 !important;
    display: none !important;
}
`

let isGlobalScrollbarStyleInstalled = false

const mountHostDanmakuScrollbarStyle = () => {
    if (document.getElementById(hostDanmakuScrollbarStyleId)) {
        return
    }

    const style = document.createElement('style')
    style.id = hostDanmakuScrollbarStyleId
    style.textContent = HOST_DANMAKU_SCROLLBAR_STYLE
    ;(document.head || document.documentElement).appendChild(style)
}

const unmountHostDanmakuScrollbarStyle = () => {
    const style = document.getElementById(hostDanmakuScrollbarStyleId)
    style?.parentNode?.removeChild(style)
}

const syncHostDanmakuScrollbarStyle = (shouldHideScrollbar: boolean) => {
    if (shouldHideScrollbar) {
        mountHostDanmakuScrollbarStyle()
        return
    }

    unmountHostDanmakuScrollbarStyle()
}

export const useGlobalScrollbarStyle = () => {
    if (isGlobalScrollbarStyleInstalled) {
        return
    }

    GM_addStyle(GLOBAL_SCROLLBAR_STYLE)
    isGlobalScrollbarStyleInstalled = true

    const uiStore = useUIStore()
    watch(
        () => uiStore.uiConfig.hideDanmakuHistoryScrollbar,
        (enabled) => syncHostDanmakuScrollbarStyle(enabled),
        { immediate: true }
    )
}
