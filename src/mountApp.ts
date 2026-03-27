import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Tooltip from 'primevue/tooltip'
import ToastService from 'primevue/toastservice'
import 'primeicons/primeicons.css'
import { dce } from './utils/dom'
import App from './App.vue'
import { useModuleStore } from './stores/useModuleStore'
import MonochromePreset from './theme/monochromePreset'
import { setPrimeToastService } from './utils/ui'
import { APP_ROOT_ID, PRIME_DARK_MODE_SELECTOR } from './constants/brand'

const pinia = createPinia()
const APP_ROOT_HOST_STYLE =
    'position:fixed;top:0;left:0;width:0;height:0;overflow:visible;z-index:0;'
const PRIMEVUE_GLOBAL_STYLE_SELECTOR = 'style[data-primevue-style-id="global-style"]'
const PRIMEVUE_GLOBAL_BOX_SIZING_RULE =
    /\*\s*,\s*::before\s*,\s*::after\s*\{\s*box-sizing\s*:\s*border-box\s*;?\s*\}/g

const stripPrimeVueGlobalBoxSizing = () => {
    // PrimeVue injects a global border-box reset that can change Bilibili's own layout calculations.
    document.querySelectorAll(PRIMEVUE_GLOBAL_STYLE_SELECTOR).forEach((node) => {
        if (!(node instanceof HTMLStyleElement)) return

        const cssText = node.textContent ?? ''
        const nextCssText = cssText.replace(PRIMEVUE_GLOBAL_BOX_SIZING_RULE, '')
        if (nextCssText !== cssText) {
            node.textContent = nextCssText
        }
    })
}

export const mountHazelSpamApp = () => {
    if (document.getElementById(APP_ROOT_ID)) {
        return
    }

    const app = createApp(App)

    app.use(pinia)
    app.use(PrimeVue, {
        ripple: true,
        zIndex: {
            modal: 50000,
            overlay: 49000,
            menu: 49500,
            tooltip: 51000
        },
        theme: {
            preset: MonochromePreset,
            options: {
                darkModeSelector: PRIME_DARK_MODE_SELECTOR
            }
        }
    })
    stripPrimeVueGlobalBoxSizing()
    app.use(ToastService)
    app.directive('tooltip', Tooltip)
    setPrimeToastService(app.config.globalProperties.$toast ?? null)

    const moduleStore = useModuleStore(pinia)
    moduleStore.loadModules()

    const div = dce('div')
    div.id = APP_ROOT_ID
    // Keep the app host out of normal document flow so it does not affect the live room layout.
    div.style.cssText = APP_ROOT_HOST_STYLE
    document.body.appendChild(div)
    app.mount(div)
}
