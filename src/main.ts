import { bootstrapBiliThemeDocumentHints } from './composables/hostThemeSurfaceBootstrap'

bootstrapBiliThemeDocumentHints()

const mountAppModulePromise = import('./mountApp')

const startMountHazelSpamApp = () => {
    void mountAppModulePromise.then(({ mountHazelSpamApp }) => {
        mountHazelSpamApp()
    })
}

if (document.readyState === 'complete') {
    startMountHazelSpamApp()
} else {
    window.addEventListener('load', startMountHazelSpamApp, { once: true })
}
