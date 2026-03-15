import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { TextTabPanel } from '@/types'
import { useModuleStore } from '@/stores/useModuleStore'

export const useTextTabs = () => {
    const moduleStore = useModuleStore()

    let tabDeleteArmTimer: ReturnType<typeof setTimeout> | null = null

    const tabDialogVisible = ref(false)
    const sortDialogVisible = ref(false)
    const pendingDeleteTabId = ref<number | null>(null)
    const pendingFocusTabId = ref<number | null>(null)
    const sortDraft = ref<TextTabPanel[]>([])

    const tabPanels = computed(() => moduleStore.moduleConfig.textSpam.tabPanels)
    const canRemoveTab = computed(() => tabPanels.value.length > 1)

    const activeTabId = computed({
        get: () => moduleStore.moduleConfig.textSpam.activeTabId,
        set: (value: number) => {
            disarmTabDelete()
            moduleStore.moduleConfig.textSpam.activeTabId = value
            const panel = moduleStore.moduleConfig.textSpam.tabPanels.find(
                (item) => item.id === value
            )
            if (panel) {
                moduleStore.moduleConfig.textSpam.msg = panel.msg
            }
        }
    })

    const activeTab = computed(() => {
        return (
            moduleStore.moduleConfig.textSpam.tabPanels.find(
                (item) => item.id === moduleStore.moduleConfig.textSpam.activeTabId
            ) ?? null
        )
    })

    const editingTabTitle = computed({
        get: () => activeTab.value?.tab ?? '',
        set: (value: string) => {
            if (!activeTab.value) return
            activeTab.value.tab = value
        }
    })

    const ensureDefaultTab = () => {
        if (!Array.isArray(moduleStore.moduleConfig.textSpam.tabPanels)) {
            moduleStore.moduleConfig.textSpam.tabPanels = []
        }

        if (moduleStore.moduleConfig.textSpam.tabPanels.length === 0) {
            moduleStore.moduleConfig.textSpam.tabPanels.push({
                key: 1,
                id: 1,
                tab: '独轮车文本',
                msg: moduleStore.moduleConfig.textSpam.msg || ''
            })
            moduleStore.moduleConfig.textSpam.activeTabId = 1
            return
        }

        if (
            !moduleStore.moduleConfig.textSpam.tabPanels.some(
                (item) => item.id === moduleStore.moduleConfig.textSpam.activeTabId
            )
        ) {
            moduleStore.moduleConfig.textSpam.activeTabId =
                moduleStore.moduleConfig.textSpam.tabPanels[0].id
        }

        const current = moduleStore.moduleConfig.textSpam.tabPanels.find(
            (item) => item.id === moduleStore.moduleConfig.textSpam.activeTabId
        )

        if (!current) return

        if (!current.tab || current.tab.trim() === '') {
            current.tab = '独轮车文本'
        }

        if (!current.msg && moduleStore.moduleConfig.textSpam.msg) {
            current.msg = moduleStore.moduleConfig.textSpam.msg
        }
    }

    const nextTabKey = () => {
        return (
            Math.max(0, ...moduleStore.moduleConfig.textSpam.tabPanels.map((item) => item.key)) + 1
        )
    }

    const nextTabId = () => {
        return (
            Math.max(0, ...moduleStore.moduleConfig.textSpam.tabPanels.map((item) => item.id)) + 1
        )
    }

    const openTabDialog = () => {
        tabDialogVisible.value = true
    }

    const isTabDeleteArmed = (tabId: number) => pendingDeleteTabId.value === tabId

    const clearTabDeleteArmTimer = () => {
        if (!tabDeleteArmTimer) return
        clearTimeout(tabDeleteArmTimer)
        tabDeleteArmTimer = null
    }

    const disarmTabDelete = () => {
        pendingDeleteTabId.value = null
        clearTabDeleteArmTimer()
    }

    const armTabDelete = (tabId: number) => {
        pendingDeleteTabId.value = tabId
        clearTabDeleteArmTimer()
        tabDeleteArmTimer = setTimeout(() => {
            if (pendingDeleteTabId.value === tabId) {
                pendingDeleteTabId.value = null
            }
            tabDeleteArmTimer = null
        }, 1500)
    }

    const removeTab = (tabId: number) => {
        const panels = moduleStore.moduleConfig.textSpam.tabPanels
        if (panels.length <= 1) return

        const index = panels.findIndex((item) => item.id === tabId)
        if (index < 0) {
            disarmTabDelete()
            return
        }

        const wasActive = moduleStore.moduleConfig.textSpam.activeTabId === tabId
        panels.splice(index, 1)
        disarmTabDelete()

        if (!wasActive) return

        const fallback = panels[Math.max(0, index - 1)] ?? panels[0]
        if (!fallback) return
        activeTabId.value = fallback.id
        moduleStore.moduleConfig.textSpam.msg = fallback.msg
    }

    const handleTabDangerToggle = (tabId: number) => {
        if (!canRemoveTab.value) {
            disarmTabDelete()
            return
        }
        if (moduleStore.moduleConfig.textSpam.enable) return
        if (pendingDeleteTabId.value === tabId) {
            removeTab(tabId)
            return
        }
        armTabDelete(tabId)
    }

    const buildCopiedTitle = (baseTitle: string) => {
        const source = baseTitle.trim() || '标签页'
        let candidate = `${source} 副本`
        let suffix = 2
        const exists = (title: string) =>
            moduleStore.moduleConfig.textSpam.tabPanels.some((item) => item.tab === title)

        while (exists(candidate)) {
            candidate = `${source} 副本 ${suffix}`
            suffix += 1
        }

        return candidate
    }

    const cloneCurrentTab = () => {
        const source = activeTab.value ?? moduleStore.moduleConfig.textSpam.tabPanels[0]
        if (!source) return

        const newPanel: TextTabPanel = {
            key: nextTabKey(),
            id: nextTabId(),
            tab: buildCopiedTitle(source.tab || `标签页 ${source.id}`),
            msg: source.msg || ''
        }

        moduleStore.moduleConfig.textSpam.tabPanels.push(newPanel)
        activeTabId.value = newPanel.id

        if (tabDialogVisible.value) {
            pendingFocusTabId.value = newPanel.id
            tabDialogVisible.value = false
            return
        }

        void focusTabButton(newPanel.id)
    }

    const focusTabButton = async (tabId: number) => {
        await nextTick()
        const row = document.querySelector(`.tabs-strip .tab-item[data-tab-id="${tabId}"]`)
        if (!(row instanceof HTMLElement)) return
        const button = row.querySelector('.tab-btn')
        if (!(button instanceof HTMLElement)) return
        button.scrollIntoView({ block: 'nearest', inline: 'nearest' })
        button.focus({ preventScroll: true })
    }

    const handleTabDialogHide = () => {
        if (pendingFocusTabId.value === null) return
        const targetTabId = pendingFocusTabId.value
        pendingFocusTabId.value = null
        void focusTabButton(targetTabId)
    }

    const openSortDialog = () => {
        disarmTabDelete()
        sortDraft.value = moduleStore.moduleConfig.textSpam.tabPanels.map((item) => ({
            ...item
        }))
        sortDialogVisible.value = true
    }

    const persistSortDraft = () => {
        const activeId = moduleStore.moduleConfig.textSpam.activeTabId
        moduleStore.moduleConfig.textSpam.tabPanels = sortDraft.value.map((item) => ({
            ...item
        }))
        const stillExists = moduleStore.moduleConfig.textSpam.tabPanels.some(
            (item) => item.id === activeId
        )
        moduleStore.moduleConfig.textSpam.activeTabId = stillExists
            ? activeId
            : (moduleStore.moduleConfig.textSpam.tabPanels[0]?.id ?? 1)
    }

    const moveSortDraft = (index: number, step: -1 | 1) => {
        const nextIndex = index + step
        if (nextIndex < 0 || nextIndex >= sortDraft.value.length) return
        const [moved] = sortDraft.value.splice(index, 1)
        sortDraft.value.splice(nextIndex, 0, moved)
        persistSortDraft()
    }

    onMounted(() => {
        ensureDefaultTab()
    })

    watch(
        () => moduleStore.moduleConfig.textSpam.tabPanels.length,
        () => {
            ensureDefaultTab()
        }
    )

    onBeforeUnmount(() => {
        clearTabDeleteArmTimer()
    })

    return {
        tabDialogVisible,
        sortDialogVisible,
        sortDraft,
        tabPanels,
        canRemoveTab,
        activeTabId,
        activeTab,
        editingTabTitle,
        ensureDefaultTab,
        openTabDialog,
        isTabDeleteArmed,
        handleTabDangerToggle,
        cloneCurrentTab,
        handleTabDialogHide,
        openSortDialog,
        moveSortDraft
    }
}
