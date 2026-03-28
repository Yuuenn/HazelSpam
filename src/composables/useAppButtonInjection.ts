import { onBeforeUnmount, onMounted, watch } from 'vue'
import { useBiliStore } from '@/stores/useBiliStore'
import { useModuleStore } from '@/stores/useModuleStore'
import { resolveHostTheme } from '@/composables/useHostThemeSync'
import { dq, pollingQuery } from '@/utils/dom'
import Logger from '@/utils/logger'
import {
    APP_HOST_BUTTON_CLASS,
    APP_HOST_BUTTON_ICON_CLASS,
    APP_HOST_TOOLBAR_BUTTON_CLASS,
    APP_HOST_TOOLBAR_ICON_CLASS,
    APP_HOST_TOOLBAR_ICON_WRAPPER_CLASS,
    APP_HOST_TOOLBAR_ITEM_CLASS
} from '@/constants/brand'
type AppButtonState = 'running' | 'ready' | 'error'

type UseAppButtonInjectionOptions = {
    onOpenPanel: () => void
}

const APP_BUTTON_HOST_SELECTOR = '.icon-left-part'
const APP_BUTTON_READY_SELECTOR = '#control-panel-ctnr-box'
const APP_BUTTON_LABEL = '打开 HazelSpam 面板'
const APP_BUTTON_DEFAULT_COLOR = '#C9CCD0'
const APP_BUTTON_DARK_COLOR = '#46494D'
const APP_BUTTON_SKIN_COLOR = '#FFFFFF'
const APP_BUTTON_RUNNING_ROTATE_SPEED = 90
const APP_BUTTON_RUNNING_ROTATE_LIMIT = 45
const APP_BUTTON_ERROR_ROTATE_SPEED = 540

const APP_BUTTON_ICON_MARKUP = `
<div class="${APP_HOST_TOOLBAR_ICON_WRAPPER_CLASS}">
    <svg class="${APP_HOST_BUTTON_ICON_CLASS} ${APP_HOST_TOOLBAR_ICON_CLASS}" width="24" height="24" viewBox="2 0 20 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
        <path d="M3 12A9 9 0 1 0 21 12A9 9 0 1 0 3 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M10 12A2 2 0 1 0 14 12A2 2 0 1 0 10 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M12 14V21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M10 12L3.25 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M14 12L20.75 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
</div>
`

export const useAppButtonInjection = ({ onOpenPanel }: UseAppButtonInjectionOptions) => {
    const logger = new Logger('AppButtonInjection')
    const biliStore = useBiliStore()
    const moduleStore = useModuleStore()

    let appButton: HTMLButtonElement | null = null
    let appButtonIcon: SVGElement | null = null
    let hostMutationObserver: MutationObserver | null = null
    let themeMutationObserver: MutationObserver | null = null
    let isHostInitialized = false
    let isHostInitializing = false
    let appButtonState: AppButtonState = 'ready'
    let appButtonRotationDeg = 0
    let motionFrameId: number | null = null
    let appearanceSyncFrameId: number | null = null
    let lastMotionFrameAt: number | null = null
    let runningSwingDirection: 1 | -1 = -1

    const resolveSkinIdFromSSR = () => {
        const noireData = (window as unknown as Record<string, unknown>).__NEPTUNE_IS_MY_WAIFU__
        if (typeof noireData !== 'object' || noireData === null) {
            return 0
        }

        const roomInfoRes = (noireData as Record<string, unknown>).roomInfoRes
        if (typeof roomInfoRes !== 'object' || roomInfoRes === null) {
            return 0
        }

        const data = (roomInfoRes as Record<string, unknown>).data
        if (typeof data !== 'object' || data === null) {
            return 0
        }

        const skinInfo = (data as Record<string, unknown>).skin_info
        if (typeof skinInfo !== 'object' || skinInfo === null) {
            return 0
        }

        const skinId = Number((skinInfo as Record<string, unknown>).id ?? 0)
        if (!Number.isFinite(skinId) || skinId <= 0) {
            return 0
        }

        return skinId
    }

    const hasRoomSkin = () => {
        const skinStyle = document.getElementById('skin-css')
        const skinIdFromStyle = Number(skinStyle?.getAttribute('data-skin-id') ?? 0)
        if (Number.isFinite(skinIdFromStyle) && skinIdFromStyle > 0) {
            return true
        }

        return resolveSkinIdFromSSR() > 0
    }

    const resolveAppButtonColor = () => {
        if (hasRoomSkin()) {
            return APP_BUTTON_SKIN_COLOR
        }

        return resolveHostTheme() === 'dark' ? APP_BUTTON_DARK_COLOR : APP_BUTTON_DEFAULT_COLOR
    }

    const resolveAppButtonState = (): AppButtonState => {
        const isRunning =
            moduleStore.moduleConfig.textSpam.enable || moduleStore.moduleConfig.emotionSpam.enable
        if (isRunning) {
            return 'running'
        }

        const isReady = Boolean(biliStore.loginInfo?.isLogin && biliStore.cookies)
        return isReady ? 'ready' : 'error'
    }

    const applyAppButtonRotation = () => {
        appButtonIcon?.style.setProperty(
            'transform',
            `rotate(${Math.round((appButtonRotationDeg % 360) * 100) / 100}deg)`
        )
    }

    const stopMotionLoop = () => {
        if (motionFrameId !== null) {
            cancelAnimationFrame(motionFrameId)
            motionFrameId = null
        }

        lastMotionFrameAt = null
    }

    const tickMotion = (timestamp: number) => {
        if (!appButtonIcon || appButtonState === 'ready') {
            stopMotionLoop()
            return
        }

        if (lastMotionFrameAt === null) {
            lastMotionFrameAt = timestamp
        }

        const deltaSeconds = (timestamp - lastMotionFrameAt) / 1000
        lastMotionFrameAt = timestamp

        if (appButtonState === 'running') {
            appButtonRotationDeg +=
                runningSwingDirection * APP_BUTTON_RUNNING_ROTATE_SPEED * deltaSeconds

            if (appButtonRotationDeg <= -APP_BUTTON_RUNNING_ROTATE_LIMIT) {
                appButtonRotationDeg = -APP_BUTTON_RUNNING_ROTATE_LIMIT
                runningSwingDirection = 1
            } else if (appButtonRotationDeg >= APP_BUTTON_RUNNING_ROTATE_LIMIT) {
                appButtonRotationDeg = APP_BUTTON_RUNNING_ROTATE_LIMIT
                runningSwingDirection = -1
            }
        } else if (appButtonState === 'error') {
            appButtonRotationDeg += APP_BUTTON_ERROR_ROTATE_SPEED * deltaSeconds
        }

        applyAppButtonRotation()
        motionFrameId = requestAnimationFrame(tickMotion)
    }

    const ensureMotionLoop = () => {
        if (appButtonState === 'ready') {
            appButtonRotationDeg = 0
            applyAppButtonRotation()
            stopMotionLoop()
            return
        }

        if (motionFrameId !== null) return
        lastMotionFrameAt = null
        motionFrameId = requestAnimationFrame(tickMotion)
    }

    const syncAppButtonAppearance = () => {
        if (!appButton) return

        const nextState = resolveAppButtonState()
        if (nextState !== appButtonState) {
            if (nextState === 'ready') {
                appButtonRotationDeg = 0
            } else if (nextState === 'running') {
                appButtonRotationDeg = 0
                runningSwingDirection = -1
            }
        }

        appButtonState = nextState
        appButton.dataset.state = appButtonState
        appButton.style.setProperty('--hazelspam-host-button-color', resolveAppButtonColor())
        applyAppButtonRotation()
        ensureMotionLoop()
    }

    const scheduleAppButtonAppearanceSync = () => {
        if (appearanceSyncFrameId !== null) return

        appearanceSyncFrameId = requestAnimationFrame(() => {
            appearanceSyncFrameId = null
            syncAppButtonAppearance()
        })
    }

    const stripAppButtonBaseInlineStyles = (button: HTMLButtonElement) => {
        ;[
            'position',
            'display',
            'align-items',
            'justify-content',
            'width',
            'height',
            'padding',
            'border',
            'background',
            'color',
            'cursor',
            'margin-left'
        ].forEach((property) => button.style.removeProperty(property))
    }

    const ensureAppButtonHostItem = (
        hostElement: HTMLElement,
        button: HTMLButtonElement
    ): HTMLDivElement => {
        const existingItem = button.closest(`.${APP_HOST_TOOLBAR_ITEM_CLASS}`)
        if (existingItem instanceof HTMLDivElement) {
            existingItem.removeAttribute('title')
            return existingItem
        }

        const hostItem = document.createElement('div')
        hostItem.classList.add(APP_HOST_TOOLBAR_ITEM_CLASS)

        if (button.parentElement) {
            button.parentElement.insertBefore(hostItem, button)
        } else {
            hostElement.append(hostItem)
        }

        hostItem.append(button)
        return hostItem
    }

    const renderAppButton = async (containerSelector: string): Promise<void> => {
        const hostElement = await pollingQuery(document, containerSelector, 300, 1200, true)
        if (!(hostElement instanceof HTMLElement)) return

        let button = hostElement.querySelector(
            `.${APP_HOST_BUTTON_CLASS}`
        ) as HTMLButtonElement | null

        if (!button) {
            button = document.createElement('button')
            button.type = 'button'
            button.classList.add(APP_HOST_BUTTON_CLASS, APP_HOST_TOOLBAR_BUTTON_CLASS)
            button.ariaLabel = APP_BUTTON_LABEL
            button.addEventListener('click', onOpenPanel)

            const iconTemplate = document.createElement('template')
            iconTemplate.innerHTML = APP_BUTTON_ICON_MARKUP.trim()
            const iconWrapper = iconTemplate.content.firstElementChild

            if (!(iconWrapper instanceof HTMLElement)) {
                throw new Error('HazelSpam 入口图标初始化失败')
            }

            button.append(iconWrapper)
        }

        button.type = 'button'
        button.classList.add(APP_HOST_BUTTON_CLASS, APP_HOST_TOOLBAR_BUTTON_CLASS)
        button.ariaLabel = APP_BUTTON_LABEL
        stripAppButtonBaseInlineStyles(button)
        ensureAppButtonHostItem(hostElement, button)

        appButton = button
        appButtonIcon = button.querySelector(`.${APP_HOST_BUTTON_ICON_CLASS}`) as SVGElement | null
        syncAppButtonAppearance()
    }

    const tryInitializeHostButton = () => {
        if (isHostInitialized || isHostInitializing || !dq(APP_BUTTON_READY_SELECTOR)) {
            return
        }

        isHostInitializing = true

        void renderAppButton(APP_BUTTON_HOST_SELECTOR)
            .then(() => {
                isHostInitialized = true
                hostMutationObserver?.disconnect()
                hostMutationObserver = null
                logger.info('入口按钮初始化完成')
            })
            .catch((error: unknown) => {
                logger.warn('入口按钮初始化失败', error)
            })
            .finally(() => {
                isHostInitializing = false
            })
    }

    watch(
        () => [
            moduleStore.moduleConfig.textSpam.enable,
            moduleStore.moduleConfig.emotionSpam.enable,
            biliStore.loginInfo?.isLogin,
            Boolean(biliStore.cookies)
        ],
        () => scheduleAppButtonAppearanceSync(),
        { immediate: true }
    )

    onMounted(() => {
        tryInitializeHostButton()
        hostMutationObserver = new MutationObserver(() => {
            tryInitializeHostButton()
        })
        hostMutationObserver.observe(document.body, { childList: true, subtree: true })

        themeMutationObserver = new MutationObserver(() => {
            scheduleAppButtonAppearanceSync()
        })
        themeMutationObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['style']
        })
    })

    onBeforeUnmount(() => {
        hostMutationObserver?.disconnect()
        themeMutationObserver?.disconnect()
        if (appearanceSyncFrameId !== null) {
            cancelAnimationFrame(appearanceSyncFrameId)
            appearanceSyncFrameId = null
        }
        stopMotionLoop()
        hostMutationObserver = null
        themeMutationObserver = null
        appButton = null
        appButtonIcon = null
    })
}
