<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import PrimeButton from 'primevue/button'
import {
    APP_BUTTON_BASE_CLASS,
    APP_BUTTON_STYLE_ATTR,
    APP_BUTTON_STYLE_CLASS_MAP,
    APP_BUTTON_TONE_ATTR,
    APP_BUTTON_TONE_BINDINGS,
    type AppButtonStyle,
    type AppButtonTone
} from '@/constants/button'

type AppButtonProps = {
    appStyle?: AppButtonStyle
    tone?: AppButtonTone
}

defineOptions({
    inheritAttrs: false
})

const props = defineProps<AppButtonProps>()
const attrs = useAttrs()

const buttonClass = computed(() => [
    APP_BUTTON_BASE_CLASS,
    props.appStyle ? APP_BUTTON_STYLE_CLASS_MAP[props.appStyle] : null,
    attrs.class
])

const forwardedBindings = computed(() => {
    const nextAttrs = { ...attrs } as Record<string, unknown>

    delete nextAttrs.class

    if (props.appStyle) {
        nextAttrs[APP_BUTTON_STYLE_ATTR] = props.appStyle
    }

    if (props.tone) {
        nextAttrs[APP_BUTTON_TONE_ATTR] = props.tone

        for (const [key, value] of Object.entries(APP_BUTTON_TONE_BINDINGS[props.tone])) {
            if (nextAttrs[key] === undefined) {
                nextAttrs[key] = value
            }
        }
    }

    return nextAttrs
})
</script>

<template>
    <PrimeButton v-bind="forwardedBindings" :class="buttonClass">
        <slot />
    </PrimeButton>
</template>
