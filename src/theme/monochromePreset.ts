import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'
import {
    PRIME_HAZEL_COLOR_SCHEME,
    PRIME_HAZEL_FOCUS_RING,
    PRIME_HAZEL_PRIMARY_SCALE
} from './colorTokens'

const APP_BUTTON_TOKENS = {
    root: {
        borderRadius: 'var(--hazelspam-radius-md)',
        roundedBorderRadius: 'var(--hazelspam-radius-pill)',
        gap: 'var(--hazelspam-space-sm)',
        transitionDuration: 'var(--hazelspam-motion-duration-fast)',
        focusRing: {
            width: '{focus.ring.width}',
            style: '{focus.ring.style}',
            offset: '{focus.ring.offset}'
        },
        label: {
            fontWeight: 'var(--hazelspam-type-weight-medium)'
        },
        sm: {
            fontSize: 'var(--hazelspam-type-size-body-sm)'
        },
        lg: {
            fontSize: 'var(--hazelspam-type-size-body-lg)'
        },
        primary: {
            color: 'var(--p-primary-contrast-color)',
            hoverColor: 'var(--p-primary-contrast-color)',
            activeColor: 'var(--p-primary-contrast-color)',
            focusRing: {
                color: '{focus.ring.color}',
                shadow: '{focus.ring.shadow}'
            }
        },
        danger: {
            background: 'var(--hazelspam-color-danger)',
            hoverBackground: 'var(--hazelspam-color-danger-hover)',
            activeBackground: 'var(--hazelspam-color-danger-active)',
            borderColor: 'var(--hazelspam-color-danger)',
            hoverBorderColor: 'var(--hazelspam-color-danger-hover)',
            activeBorderColor: 'var(--hazelspam-color-danger-active)',
            color: '#FFFFFF',
            hoverColor: '#FFFFFF',
            activeColor: '#FFFFFF',
            focusRing: {
                color: 'var(--hazelspam-color-danger)',
                shadow:
                    '0 0 0 3px color-mix(in srgb, var(--hazelspam-color-danger) 18%, transparent)'
            }
        },
        success: {
            background: 'var(--hazelspam-color-success)',
            hoverBackground: 'var(--hazelspam-color-success-hover)',
            activeBackground: 'var(--hazelspam-color-success-active)',
            borderColor: 'var(--hazelspam-color-success)',
            hoverBorderColor: 'var(--hazelspam-color-success-hover)',
            activeBorderColor: 'var(--hazelspam-color-success-active)',
            color: '#FFFFFF',
            hoverColor: '#FFFFFF',
            activeColor: '#FFFFFF',
            focusRing: {
                color: 'var(--hazelspam-color-success)',
                shadow:
                    '0 0 0 3px color-mix(in srgb, var(--hazelspam-color-success) 18%, transparent)'
            }
        }
    },
    outlined: {
        secondary: {
            borderColor: 'var(--p-content-border-color)',
            color: 'var(--p-text-color, #111111)',
            hoverBackground: 'color-mix(in srgb, var(--p-primary-color, #111111) 10%, transparent)',
            activeBackground: 'color-mix(in srgb, var(--p-primary-color, #111111) 16%, transparent)'
        },
        danger: {
            borderColor: 'var(--hazelspam-color-danger)',
            color: 'var(--hazelspam-color-danger)',
            hoverBackground: 'color-mix(in srgb, var(--hazelspam-color-danger) 12%, transparent)',
            activeBackground: 'color-mix(in srgb, var(--hazelspam-color-danger) 18%, transparent)'
        },
        success: {
            borderColor: 'var(--hazelspam-color-success)',
            color: 'var(--hazelspam-color-success)',
            hoverBackground:
                'color-mix(in srgb, var(--hazelspam-color-success) 12%, transparent)',
            activeBackground:
                'color-mix(in srgb, var(--hazelspam-color-success) 18%, transparent)'
        }
    },
    text: {
        secondary: {
            color: 'var(--p-text-muted-color)',
            hoverBackground: 'color-mix(in srgb, var(--p-primary-color, #111111) 10%, transparent)',
            activeBackground: 'color-mix(in srgb, var(--p-primary-color, #111111) 16%, transparent)'
        },
        danger: {
            color: 'var(--hazelspam-color-danger)',
            hoverBackground: 'color-mix(in srgb, var(--hazelspam-color-danger) 12%, transparent)',
            activeBackground: 'color-mix(in srgb, var(--hazelspam-color-danger) 18%, transparent)'
        },
        success: {
            color: 'var(--hazelspam-color-success)',
            hoverBackground:
                'color-mix(in srgb, var(--hazelspam-color-success) 12%, transparent)',
            activeBackground:
                'color-mix(in srgb, var(--hazelspam-color-success) 18%, transparent)'
        }
    }
}

const MonochromePreset = definePreset(Aura, {
    semantic: {
        primary: PRIME_HAZEL_PRIMARY_SCALE,
        focusRing: PRIME_HAZEL_FOCUS_RING,
        colorScheme: PRIME_HAZEL_COLOR_SCHEME
    },
    components: {
        button: APP_BUTTON_TOKENS
    }
})

export default MonochromePreset
