import { APP_COLOR_SCOPE_SELECTOR, APP_COLOR_STYLE_ID } from '@/constants/brand'

export type AppThemeMode = 'light' | 'dark'

type ColorTokenMap = Record<string, string>

type ThemeSemantics = {
    surfaceScale: Record<number, string>
    surfaceBase: string
    surfaceRaised: string
    surfaceHover: string
    surfaceBorder: string
    scrollHint: string
    textPrimary: string
    textMuted: string
    primary: string
    primaryHover: string
    primaryActive: string
    primaryContrast: string
    success: string
    successHover: string
    successActive: string
    danger: string
    dangerHover: string
    dangerActive: string
    highlightBackground: string
    highlightFocusBackground: string
    tooltipBackground: string
    railBackground: string
    brand: string
    brandBorder: string
    brandIcon: string
    shadowOuter: string
    shadowInner: string
    inlineActionHover: string
    inlineActionHoverBackground: string
    warning: string
    helpWarn: string
    badgeRunning: string
    badgeReady: string
    sortButtonText: string
}

const FOCUS_RING_WIDTH = '2px'
const FOCUS_RING_STYLE = 'solid'
const FOCUS_RING_OFFSET = '1px'

const createFocusRingColor = (primary: string) =>
    `color-mix(in srgb, ${primary} 58%, transparent)`

const createFocusRingShadow = (primary: string) =>
    `0 0 0 3px color-mix(in srgb, ${primary} 18%, transparent)`

const createFormFieldTokens = (semantics: ThemeSemantics) => ({
    background: semantics.surfaceRaised,
    disabledBackground: `color-mix(in srgb, ${semantics.surfaceRaised} 84%, ${semantics.surfaceBase})`,
    filledBackground: semantics.surfaceRaised,
    filledHoverBackground: semantics.surfaceHover,
    filledFocusBackground: semantics.surfaceRaised,
    borderColor: semantics.surfaceBorder,
    hoverBorderColor: semantics.primaryHover,
    focusBorderColor: semantics.primary,
    invalidBorderColor: semantics.helpWarn,
    color: semantics.textPrimary,
    disabledColor: semantics.textMuted,
    placeholderColor: semantics.textMuted,
    iconColor: semantics.textMuted
})

export const PRIME_HAZEL_PRIMARY_SCALE = {
    50: '#EDF7F3',
    100: '#D7EEE6',
    200: '#BFE3D6',
    300: '#A8D5C0',
    400: '#7ED6B6',
    500: '#57C7A2',
    600: '#3EA88A',
    700: '#328670',
    800: '#27685A',
    900: '#1C4A41',
    950: '#102E2A'
}

const APP_THEME_SEMANTICS: Record<AppThemeMode, ThemeSemantics> = {
    light: {
        surfaceScale: {
            0: '#FFFFFF',
            50: '#F8F8F9',
            100: '#F3F3F4',
            200: '#E6E3E0',
            300: '#E0E0E2',
            400: '#C4C5C9',
            500: '#8E9196',
            600: '#6F6F73',
            700: '#4F5257',
            800: '#34373B',
            900: '#1F2023',
            950: '#161A18'
        },
        surfaceBase: '#E6E3E0',
        surfaceRaised: '#F3F3F4',
        surfaceHover: '#EDF7F3',
        surfaceBorder: '#E0E0E2',
        scrollHint: '#F3F3F4',
        textPrimary: '#2F2F30',
        textMuted: '#6F6F73',
        primary: '#3EA88A',
        primaryHover: '#328670',
        primaryActive: '#27685A',
        primaryContrast: '#FFFFFF',
        success: '#3EA88A',
        successHover: '#328670',
        successActive: '#27685A',
        danger: '#D83B44',
        dangerHover: '#C9343D',
        dangerActive: '#B22A33',
        highlightBackground: '#D7EEE6',
        highlightFocusBackground: '#BFE3D6',
        tooltipBackground: '#1F2023',
        railBackground: '#F3F3F4',
        brand: '#328670',
        brandBorder: '#328670',
        brandIcon: '#328670',
        shadowOuter: '#1F2023',
        shadowInner: '#FFFFFF',
        inlineActionHover: '#328670',
        inlineActionHoverBackground: 'rgba(62, 168, 138, 0.14)',
        warning: '#D83B44',
        helpWarn: '#D83B44',
        badgeRunning: '#328670',
        badgeReady: '#3EA88A',
        sortButtonText: '#FFFFFF'
    },
    dark: {
        surfaceScale: {
            0: '#FFFFFF',
            50: '#F5F6F7',
            100: '#E6E6E8',
            200: '#D2D4D7',
            300: '#A8A8AD',
            400: '#8E9196',
            500: '#6F6F73',
            600: '#4B4E54',
            700: '#3A3A3F',
            800: '#2A2C30',
            900: '#1F2023',
            950: '#161A18'
        },
        surfaceBase: '#1F2023',
        surfaceRaised: '#2A2C30',
        surfaceHover: '#32353A',
        surfaceBorder: '#3A3A3F',
        scrollHint: '#2A2C30',
        textPrimary: '#E6E6E8',
        textMuted: '#A8A8AD',
        primary: '#57C7A2',
        primaryHover: '#3EA88A',
        primaryActive: '#328670',
        primaryContrast: '#FFFFFF',
        success: '#57C7A2',
        successHover: '#3EA88A',
        successActive: '#328670',
        danger: '#D83B44',
        dangerHover: '#C9343D',
        dangerActive: '#B22A33',
        highlightBackground: 'color-mix(in srgb, #57C7A2 22%, #2A2C30)',
        highlightFocusBackground: 'color-mix(in srgb, #57C7A2 34%, #2A2C30)',
        tooltipBackground: '#161A18',
        railBackground: '#2A2C30',
        brand: '#57C7A2',
        brandBorder: '#3A3A3F',
        brandIcon: '#57C7A2',
        shadowOuter: '#000000',
        shadowInner: '#2A2C30',
        inlineActionHover: '#57C7A2',
        inlineActionHoverBackground: 'rgba(87, 199, 162, 0.18)',
        warning: '#D83B44',
        helpWarn: '#D83B44',
        badgeRunning: '#3EA88A',
        badgeReady: '#57C7A2',
        sortButtonText: '#FFFFFF'
    }
}

const createPrimeColorScheme = (semantics: ThemeSemantics) => {
    const formField = createFormFieldTokens(semantics)

    return {
        surface: semantics.surfaceScale,
        primary: {
            color: semantics.primary,
            contrastColor: semantics.primaryContrast,
            hoverColor: semantics.primaryHover,
            activeColor: semantics.primaryActive
        },
        highlight: {
            background: semantics.highlightBackground,
            focusBackground: semantics.highlightFocusBackground,
            color: semantics.textPrimary,
            focusColor: semantics.textPrimary
        },
        content: {
            background: semantics.surfaceRaised,
            hoverBackground: semantics.surfaceHover,
            borderColor: semantics.surfaceBorder,
            color: semantics.textPrimary,
            hoverColor: semantics.textPrimary
        },
        text: {
            color: semantics.textPrimary,
            hoverColor: semantics.textPrimary,
            mutedColor: semantics.textMuted,
            hoverMutedColor: semantics.textPrimary
        },
        formField: {
            ...formField,
            focusRing: {
                width: FOCUS_RING_WIDTH,
                style: FOCUS_RING_STYLE,
                color: createFocusRingColor(semantics.primary),
                offset: FOCUS_RING_OFFSET,
                shadow: createFocusRingShadow(semantics.primary)
            }
        }
    }
}

export const PRIME_HAZEL_COLOR_SCHEME = {
    light: createPrimeColorScheme(APP_THEME_SEMANTICS.light),
    dark: createPrimeColorScheme(APP_THEME_SEMANTICS.dark)
}

export const PRIME_HAZEL_FOCUS_RING = {
    width: FOCUS_RING_WIDTH,
    style: FOCUS_RING_STYLE,
    color: '{primary.color}',
    offset: FOCUS_RING_OFFSET,
    shadow: '0 0 0 3px color-mix(in srgb, {primary.color} 18%, transparent)'
}

const createPrimeCompatibilityTokens = (semantics: ThemeSemantics): ColorTokenMap => {
    const formField = createFormFieldTokens(semantics)

    return {
        '--p-surface-0': semantics.surfaceScale[0],
        '--p-surface-50': semantics.surfaceScale[50],
        '--p-surface-100': semantics.surfaceScale[100],
        '--p-surface-200': semantics.surfaceScale[200],
        '--p-surface-300': semantics.surfaceScale[300],
        '--p-surface-400': semantics.surfaceScale[400],
        '--p-surface-500': semantics.surfaceScale[500],
        '--p-surface-600': semantics.surfaceScale[600],
        '--p-surface-700': semantics.surfaceScale[700],
        '--p-surface-800': semantics.surfaceScale[800],
        '--p-surface-900': semantics.surfaceScale[900],
        '--p-surface-950': semantics.surfaceScale[950],
        '--p-primary-color': semantics.primary,
        '--p-primary-hover-color': semantics.primaryHover,
        '--p-primary-active-color': semantics.primaryActive,
        '--p-primary-contrast-color': semantics.primaryContrast,
        '--p-highlight-background': semantics.highlightBackground,
        '--p-highlight-focus-background': semantics.highlightFocusBackground,
        '--p-highlight-color': semantics.textPrimary,
        '--p-highlight-focus-color': semantics.textPrimary,
        '--p-content-background': semantics.surfaceRaised,
        '--p-content-hover-background': semantics.surfaceHover,
        '--p-content-border-color': semantics.surfaceBorder,
        '--p-content-color': semantics.textPrimary,
        '--p-content-hover-color': semantics.textPrimary,
        '--p-text-color': semantics.textPrimary,
        '--p-text-hover-color': semantics.textPrimary,
        '--p-text-muted-color': semantics.textMuted,
        '--p-text-hover-muted-color': semantics.textPrimary,
        '--p-form-field-background': formField.background,
        '--p-form-field-disabled-background': formField.disabledBackground,
        '--p-form-field-filled-background': formField.filledBackground,
        '--p-form-field-filled-hover-background': formField.filledHoverBackground,
        '--p-form-field-filled-focus-background': formField.filledFocusBackground,
        '--p-form-field-border-color': formField.borderColor,
        '--p-form-field-hover-border-color': formField.hoverBorderColor,
        '--p-form-field-focus-border-color': formField.focusBorderColor,
        '--p-form-field-invalid-border-color': formField.invalidBorderColor,
        '--p-form-field-color': formField.color,
        '--p-form-field-disabled-color': formField.disabledColor,
        '--p-form-field-placeholder-color': formField.placeholderColor,
        '--p-form-field-icon-color': formField.iconColor,
        '--p-focus-ring-width': FOCUS_RING_WIDTH,
        '--p-focus-ring-style': FOCUS_RING_STYLE,
        '--p-focus-ring-color': createFocusRingColor(semantics.primary),
        '--p-focus-ring-offset': FOCUS_RING_OFFSET,
        '--p-focus-ring-shadow': createFocusRingShadow(semantics.primary)
    }
}

const createAppColorTokens = (semantics: ThemeSemantics): ColorTokenMap => {
    const formField = createFormFieldTokens(semantics)
    const focusRingColor = createFocusRingColor(semantics.primary)
    const focusRingShadow = createFocusRingShadow(semantics.primary)

    return {
        ...createPrimeCompatibilityTokens(semantics),
        '--hazelspam-color-accent': semantics.primary,
        '--hazelspam-color-accent-hover': semantics.primaryHover,
        '--hazelspam-color-accent-active': semantics.primaryActive,
        '--hazelspam-color-accent-contrast': semantics.primaryContrast,
        '--hazelspam-color-success': semantics.success,
        '--hazelspam-color-success-hover': semantics.successHover,
        '--hazelspam-color-success-active': semantics.successActive,
        '--hazelspam-color-danger': semantics.danger,
        '--hazelspam-color-danger-hover': semantics.dangerHover,
        '--hazelspam-color-danger-active': semantics.dangerActive,
        '--hazelspam-color-field-bg': formField.background,
        '--hazelspam-color-field-disabled-bg': formField.disabledBackground,
        '--hazelspam-color-field-border': formField.borderColor,
        '--hazelspam-color-field-hover-border': formField.hoverBorderColor,
        '--hazelspam-color-field-focus-border': formField.focusBorderColor,
        '--hazelspam-color-field-text': formField.color,
        '--hazelspam-color-field-disabled-text': formField.disabledColor,
        '--hazelspam-color-field-placeholder': formField.placeholderColor,
        '--hazelspam-color-field-icon': formField.iconColor,
        '--hazelspam-focus-ring-width': FOCUS_RING_WIDTH,
        '--hazelspam-focus-ring-style': FOCUS_RING_STYLE,
        '--hazelspam-focus-ring-color': focusRingColor,
        '--hazelspam-focus-ring-offset': FOCUS_RING_OFFSET,
        '--hazelspam-focus-ring-shadow': focusRingShadow,
        '--hazelspam-color-tooltip-text': '#FFFFFF',
        '--hazelspam-color-text-primary': semantics.textPrimary,
        '--hazelspam-color-text-muted': semantics.textMuted,
        '--hazelspam-color-surface-border': semantics.surfaceBorder,
        '--hazelspam-color-badge-running': semantics.badgeRunning,
        '--hazelspam-color-badge-ready': semantics.badgeReady,
        '--hazelspam-color-badge-error': '#D03050',
        '--hazelspam-color-sort-btn-text': semantics.sortButtonText,
        '--hazelspam-color-inline-action-link': semantics.inlineActionHover,
        '--hazelspam-color-tooltip-bg': semantics.tooltipBackground,
        '--hazelspam-color-shell-bg': semantics.surfaceBase,
        '--hazelspam-color-shell-sider-bg': semantics.surfaceBase,
        '--hazelspam-color-shell-card-bg': semantics.surfaceRaised,
        '--hazelspam-color-shadow-outer': semantics.shadowOuter,
        '--hazelspam-color-shadow-inner': semantics.shadowInner,
        '--hazelspam-color-rail-bg': semantics.railBackground,
        '--hazelspam-color-brand': semantics.brand,
        '--hazelspam-color-brand-border': semantics.brandBorder,
        '--hazelspam-color-brand-icon': semantics.brandIcon,
        '--hazelspam-color-warning': semantics.warning,
        '--hazelspam-color-sort-btn-bg': semantics.primary,
        '--hazelspam-color-sort-btn-hover-bg': semantics.primaryHover,
        '--hazelspam-color-scroll-hint': semantics.scrollHint,
        '--hazelspam-color-inline-action-muted': semantics.textMuted,
        '--hazelspam-color-inline-action-hover': semantics.inlineActionHover,
        '--hazelspam-color-inline-action-hover-bg': semantics.inlineActionHoverBackground,
        '--hazelspam-color-help-warn': semantics.helpWarn
    }
}

export const APP_COLOR_TOKENS: Record<AppThemeMode, ColorTokenMap> = {
    light: createAppColorTokens(APP_THEME_SEMANTICS.light),
    dark: createAppColorTokens(APP_THEME_SEMANTICS.dark)
}

export const applyAppColorTokens = (theme: AppThemeMode) => {
    if (typeof document === 'undefined') return

    const tokens = APP_COLOR_TOKENS[theme]
    const tokenRules = Object.entries(tokens)
        .map(([name, value]) => `${name}: ${value};`)
        .join('\n    ')

    let styleElement = document.getElementById(APP_COLOR_STYLE_ID) as HTMLStyleElement | null
    if (!styleElement) {
        styleElement = document.createElement('style')
        styleElement.id = APP_COLOR_STYLE_ID
        document.head.appendChild(styleElement)
    }

    styleElement.textContent = `${APP_COLOR_SCOPE_SELECTOR} {\n    ${tokenRules}\n}`
}
