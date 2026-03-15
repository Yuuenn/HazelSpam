<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import PrimeDialog from 'primevue/dialog'
import { createAppButtonChrome } from '@/constants/button'
import { APP_DARK_CLASS } from '@/constants/brand'
import { useUIStore } from '@/stores/useUIStore'

type AppDialogStylePreset = 'popup' | 'none'

type AppDialogProps = {
    visible: boolean
    stylePreset?: AppDialogStylePreset
    contentClass?: unknown
}

const DEFAULT_POPUP_STYLE = {
    width: 'min(var(--hazelspam-size-dialog-max-width, 620px), calc(100vw - var(--hazelspam-size-panel-vw-gap, 48px)))',
    maxWidth: 'calc(100vw - var(--hazelspam-size-panel-vw-gap, 48px))',
    maxHeight: 'min(80vh, var(--hazelspam-size-dialog-max-height, 608px))'
} as const

defineOptions({
    inheritAttrs: false
})

const props = withDefaults(defineProps<AppDialogProps>(), {
    stylePreset: 'popup',
    contentClass: undefined
})

const emit = defineEmits<{
    (event: 'update:visible', value: boolean): void
}>()

const uiStore = useUIStore()
const attrs = useAttrs()

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null

const resolveBooleanAttr = (name: string, fallback: boolean) => {
    const value = attrs[name]
    if (value === undefined) {
        return fallback
    }

    return value === '' ? true : Boolean(value)
}

const dialogClass = computed(() => [
    'hazelspam-dialog',
    { [APP_DARK_CLASS]: uiStore.uiConfig.theme === 'dark' },
    attrs.class
])

const dialogStyle = computed(() =>
    props.stylePreset === 'popup' ? [DEFAULT_POPUP_STYLE, attrs.style] : attrs.style
)

const dialogPt = computed(() => {
    const sourcePt = isRecord(attrs.pt) ? { ...attrs.pt } : {}

    if (props.contentClass === undefined) {
        return Object.keys(sourcePt).length > 0 ? sourcePt : undefined
    }

    const nextContent = isRecord(sourcePt.content) ? { ...sourcePt.content } : {}
    nextContent.class = [nextContent.class, props.contentClass]
    sourcePt.content = nextContent

    return sourcePt
})

const closeButtonProps = computed(() => {
    const sourceProps = isRecord(attrs.closeButtonProps) ? { ...attrs.closeButtonProps } : {}

    return {
        ...sourceProps,
        ...createAppButtonChrome({ style: 'icon', className: sourceProps.class })
    }
})

const maximizeButtonProps = computed(() => {
    const sourceProps = isRecord(attrs.maximizeButtonProps) ? { ...attrs.maximizeButtonProps } : {}

    return {
        ...sourceProps,
        ...createAppButtonChrome({ style: 'icon', className: sourceProps.class })
    }
})

const forwardedAttrs = computed(() => {
    const nextAttrs = { ...attrs } as Record<string, unknown>

    delete nextAttrs.class
    delete nextAttrs.style
    delete nextAttrs.pt
    delete nextAttrs.modal
    delete nextAttrs.dismissableMask
    delete nextAttrs.focusOnShow
    delete nextAttrs.draggable
    delete nextAttrs.closeButtonProps
    delete nextAttrs.maximizeButtonProps

    return nextAttrs
})

const handleVisibleUpdate = (value: boolean) => {
    emit('update:visible', value)
}
</script>

<template>
    <PrimeDialog
        v-bind="forwardedAttrs"
        :visible="visible"
        :class="dialogClass"
        :style="dialogStyle"
        :pt="dialogPt"
        :modal="resolveBooleanAttr('modal', true)"
        :dismissableMask="resolveBooleanAttr('dismissableMask', true)"
        :focusOnShow="resolveBooleanAttr('focusOnShow', false)"
        :draggable="resolveBooleanAttr('draggable', false)"
        :closeButtonProps="closeButtonProps"
        :maximizeButtonProps="maximizeButtonProps"
        @update:visible="handleVisibleUpdate"
    >
        <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
            <slot :name="slotName" v-bind="slotProps ?? {}" />
        </template>
    </PrimeDialog>
</template>
