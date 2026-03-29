import { computed, ref } from 'vue'
import { PRODUCT_NAME } from '@/constants/brand'
import { useModuleStore } from '@/stores/useModuleStore'
import { useUIStore } from '@/stores/useUIStore'

type GuideTabId = 'enable' | 'usage' | 'disable'

const toolbarFeatureCards = [
    {
        iconClass: 'pi pi-heart',
        title: 'Crybaby 自动装填',
        description: '保留当前 Crybaby 按钮行为，发送后尝试自动准备差异化的下一条弹幕。'
    },
    {
        iconClass: 'pi pi-plus-circle',
        title: '弹幕 +1',
        description: '沿用现有工具栏里的快速复读入口，继续在原生输入区完成连发节奏。'
    },
    {
        iconClass: 'pi pi-trash',
        title: '清空内容',
        description: '保持当前清空输入框能力不变，便于快速重置原生弹幕栏内容。'
    }
] as const

const guideTabs: Array<{
    id: GuideTabId
    label: string
    title: string
    description: string
}> = [
    {
        id: 'enable',
        label: '开启方式',
        title: '开启方式',
        description: `打开 ${PRODUCT_NAME} Crybaby 增强模式后，才会在当前直播间的原生弹幕工具栏中注入现有按钮组。`
    },
    {
        id: 'usage',
        label: '使用方式',
        title: '使用方式',
        description: '本页只负责管理入口和说明，实际发送、Crybaby 自动装填与清空操作仍在直播间原生输入区完成。'
    },
    {
        id: 'disable',
        label: '关闭效果',
        title: '关闭效果',
        description: '关闭增强模式后，当前直播间不会继续注入 Crybaby 工具栏按钮，也不会在工具栏内保留占位。'
    }
]

export const useCrybabyView = () => {
    const moduleStore = useModuleStore()
    const uiStore = useUIStore()
    const activeGuideTab = ref<GuideTabId>('enable')

    const isCrybabyModeEnabled = computed({
        get: () => moduleStore.moduleConfig.settings.danmakuActions.enable,
        set: (value: boolean) => {
            moduleStore.moduleConfig.settings.danmakuActions.enable = value

            if (!value) {
                moduleStore.moduleConfig.settings.danmakuActions.crybabyEnabled = false
            }
        }
    })

    const crybabyToolbarStateTitle = computed(() => {
        if (!isCrybabyModeEnabled.value) {
            return '增强模式未开启'
        }

        return moduleStore.moduleConfig.settings.danmakuActions.crybabyEnabled
            ? 'Crybaby 自动装填已开启'
            : 'Crybaby 自动装填待手动开启'
    })

    const crybabyModeStatus = computed(() => {
        if (!isCrybabyModeEnabled.value) {
            return '开启增强模式后，才会在直播间工具栏中显示 Crybaby 按钮。'
        }

        return moduleStore.moduleConfig.settings.danmakuActions.crybabyEnabled
            ? '发送完成后会继续尝试自动装填差异化弹幕；无法生成不同内容时会自动关闭。'
            : '当前只启用了工具栏入口，Crybaby 自动装填本身仍保持关闭。'
    })

    const closePanel = () => {
        uiStore.uiConfig.isShowPanel = false
    }

    return {
        activeGuideTab,
        isCrybabyModeEnabled,
        crybabyToolbarStateTitle,
        crybabyModeStatus,
        toolbarFeatureCards,
        guideTabs,
        closePanel
    }
}
