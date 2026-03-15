import { APP_CSS_NAMESPACE } from './brand'

export const APP_BUTTON_BASE_CLASS = `${APP_CSS_NAMESPACE}-app-button`
export const APP_BUTTON_STYLE_ATTR = `data-${APP_CSS_NAMESPACE}-button-style`
export const APP_BUTTON_TONE_ATTR = `data-${APP_CSS_NAMESPACE}-button-tone`

export const APP_BUTTON_STYLE_CLASS_MAP = {
    action: `${APP_CSS_NAMESPACE}-action-btn`,
    inline: `${APP_CSS_NAMESPACE}-inline-btn`,
    row: `${APP_CSS_NAMESPACE}-row-btn`,
    square: `${APP_CSS_NAMESPACE}-square-btn`,
    sort: `${APP_CSS_NAMESPACE}-sort-btn`,
    icon: `${APP_CSS_NAMESPACE}-icon-btn`,
    rail: `${APP_CSS_NAMESPACE}-rail__btn`
} as const

export type AppButtonStyle = keyof typeof APP_BUTTON_STYLE_CLASS_MAP

export const APP_BUTTON_TONE_BINDINGS = {
    primary: {},
    surface: {
        severity: 'secondary',
        outlined: true
    },
    danger: {
        severity: 'danger'
    },
    dangerSurface: {
        severity: 'danger',
        outlined: true
    },
    success: {
        severity: 'success'
    },
    successSurface: {
        severity: 'success',
        outlined: true
    }
} as const

export type AppButtonTone = keyof typeof APP_BUTTON_TONE_BINDINGS

type AppButtonChromeOptions = {
    style?: AppButtonStyle
    tone?: AppButtonTone
    className?: unknown
}

export const createAppButtonChrome = ({ style, tone, className }: AppButtonChromeOptions) => ({
    class: [
        style || tone ? APP_BUTTON_BASE_CLASS : null,
        style ? APP_BUTTON_STYLE_CLASS_MAP[style] : null,
        className
    ],
    ...(style ? { [APP_BUTTON_STYLE_ATTR]: style } : {}),
    ...(tone ? { [APP_BUTTON_TONE_ATTR]: tone } : {})
})

export const createAppButtonProps = ({ style, tone, className }: AppButtonChromeOptions) => ({
    ...createAppButtonChrome({ style, tone, className }),
    ...(tone ? APP_BUTTON_TONE_BINDINGS[tone] : {})
})
