import { computed, watch } from 'vue'
import type { BiliAPIResponse } from '@/types'
import { useBiliStore } from '@/stores/useBiliStore'
import { useModuleStore } from '@/stores/useModuleStore'

type EmotionPackage = BiliAPIResponse.GetEmoticons.EmoticonPackage
type EmotionItem = EmotionPackage['emoticons'][number]

export type EmotionPackageListItem = {
    id: number
    coverUrl: string
    name: string
    description: string
    selectedCount: number
    isCurrent: boolean
}

export type EmotionGridVariant = 'default' | 'general' | 'emoji'

export type EmotionGridItem = {
    id: number
    unique: string
    title: string
    imageUrl: string
    isSelected: boolean
    isDisabled: boolean
}

export type EmotionPackagePanel = {
    packageId: number
    imageVariant: EmotionGridVariant
    emotionItems: EmotionGridItem[]
}

export type EmotionPackageImagePanel = {
    packageId: number
    imageUrls: string[]
}

type PackageDisplayInfo = {
    name: string
    descript: string
}

const isEmojiPackage = (pkg: EmotionPackage) => /emoji/i.test(pkg.pkg_name || '')

const isGeneralPackage = (pkg: EmotionPackage) =>
    pkg.pkg_name.includes('通用表情') && !isEmojiPackage(pkg)

const getPackageOrder = (pkg: EmotionPackage) => {
    const pkgName = pkg.pkg_name || ''
    if (pkgName.includes('房间专属表情')) return 0
    if (/up主大表情/i.test(pkgName)) return 1
    if (pkgName.includes('装扮表情')) return 2
    if (isGeneralPackage(pkg)) return 3
    if (isEmojiPackage(pkg)) return 4
    return 5
}

const extractDressCollectionName = (pkg: EmotionPackage) => {
    const firstUnique = pkg.emoticons.find((item) => item.emoticon_unique)?.emoticon_unique || ''
    const bracketContent = firstUnique.match(/\[([^\]]+)\]/)?.[1] || ''
    if (!bracketContent) return ''
    const splitIndex = bracketContent.lastIndexOf('_')
    if (splitIndex <= 0) return bracketContent.trim()
    return bracketContent.slice(0, splitIndex).trim()
}

const sanitizePackageDisplayName = (name: string) => {
    const sanitized = name
        .replace(/收藏集/g, '')
        .replace(/表情包/g, '')
        .trim()
    return sanitized || name
}

const normalizeEmotionUnique = (value: unknown) => String(value ?? '').trim()

export const useEmotionPackages = () => {
    const biliStore = useBiliStore()
    const moduleStore = useModuleStore()

    const anchorDisplayName = computed(() => biliStore.roomAnchorName?.trim() || '')
    const isEmotionSpamRunning = computed(() => moduleStore.moduleConfig.emotionSpam.enable)

    const packageList = computed(() => {
        return biliStore.emotionData.slice().sort((a, b) => {
            const orderA = getPackageOrder(a)
            const orderB = getPackageOrder(b)
            if (orderA !== orderB) return orderA - orderB
            return b.pkg_id - a.pkg_id
        })
    })

    const formatPackageDisplayInfo = (pkg: EmotionPackage): PackageDisplayInfo => {
        const defaultName = pkg.pkg_name || `表情包 ${pkg.pkg_id}`
        let name = defaultName
        let descript = pkg.pkg_descript || ''

        if (descript === 'emoji表情' || descript === '官方表情(系统)') {
            descript = ''
        }

        if (descript === '装扮表情') {
            const collectionName = extractDressCollectionName(pkg)
            if (collectionName) {
                name = collectionName
            }
        }

        if (descript === '房间表情(系统)') {
            descript = '动态评论表情'
            if (anchorDisplayName.value) {
                name = anchorDisplayName.value
            }
        }

        if (!descript && pkg.pkg_name === '房间专属表情') {
            descript = '直播间表情'
            if (anchorDisplayName.value) {
                name = anchorDisplayName.value
            }
        }

        return { name: sanitizePackageDisplayName(name), descript }
    }

    const packageDisplayMap = computed(() => {
        const map = new Map<number, PackageDisplayInfo>()
        packageList.value.forEach((pkg) => {
            map.set(pkg.pkg_id, formatPackageDisplayInfo(pkg))
        })
        return map
    })

    const getPackageDisplayInfo = (pkg: EmotionPackage): PackageDisplayInfo =>
        packageDisplayMap.value.get(pkg.pkg_id) ?? {
            name: pkg.pkg_name || `表情包 ${pkg.pkg_id}`,
            descript: pkg.pkg_descript || ''
        }

    const selectedPackage = computed(
        () =>
            packageList.value.find(
                (data) => data.pkg_id === moduleStore.moduleConfig.emotionSpam.selectedPackageId
            ) ?? null
    )

    const selectedEmotionSet = computed(
        () =>
            new Set(
                moduleStore.moduleConfig.emotionSpam.msg
                    .map((item) => normalizeEmotionUnique(item))
                    .filter((item) => item.length > 0)
            )
    )

    const emotionPackageIdMap = computed(() => {
        const map = new Map<string, number>()
        packageList.value.forEach((pkg) => {
            pkg.emoticons.forEach((item) => {
                const unique = normalizeEmotionUnique(item.emoticon_unique)
                if (!unique) return
                map.set(unique, pkg.pkg_id)
            })
        })
        return map
    })

    const packageSelectedCountMap = computed(() => {
        const map = new Map<number, number>()
        const packageIdMap = emotionPackageIdMap.value
        moduleStore.moduleConfig.emotionSpam.msg.forEach((selectedValue) => {
            const selectedKey = normalizeEmotionUnique(selectedValue)
            if (!selectedKey) return
            const packageId = packageIdMap.get(selectedKey)
            if (packageId === undefined) return
            map.set(packageId, (map.get(packageId) ?? 0) + 1)
        })
        return map
    })

    const getPackageSelectedCount = (pkgId: number) => packageSelectedCountMap.value.get(pkgId) ?? 0

    const selectedEmotionCount = computed(() => moduleStore.moduleConfig.emotionSpam.msg.length)

    watch(
        packageList,
        (list) => {
            if (list.length === 0) {
                return
            }

            const currentSelectedPackageId = moduleStore.moduleConfig.emotionSpam.selectedPackageId
            const hasCurrentSelection = list.some((pkg) => pkg.pkg_id === currentSelectedPackageId)

            if (!hasCurrentSelection) {
                moduleStore.moduleConfig.emotionSpam.selectedPackageId = list[0].pkg_id
            }
        },
        { immediate: true }
    )

    const handleSelectPackage = (id: number) => {
        moduleStore.moduleConfig.emotionSpam.selectedPackageId = id
    }

    const isPackageCurrent = (id: number) =>
        moduleStore.moduleConfig.emotionSpam.selectedPackageId === id

    const isEmotionDisabled = (item: EmotionItem) => item.perm === 0 || isEmotionSpamRunning.value

    const isEmotionSelected = (emotionUnique: string) => selectedEmotionSet.value.has(emotionUnique)

    const toggleEmotionSelection = (emotionUnique: string) => {
        const emotionKey = normalizeEmotionUnique(emotionUnique)
        if (!emotionKey) {
            return
        }

        const targetEmotion = selectedPackage.value?.emoticons.find(
            (item) => normalizeEmotionUnique(item.emoticon_unique) === emotionKey
        )

        if (!targetEmotion || isEmotionDisabled(targetEmotion)) {
            return
        }

        const selected = moduleStore.moduleConfig.emotionSpam.msg
        const existedIndex = selected.findIndex(
            (value) => normalizeEmotionUnique(value) === emotionKey
        )

        if (existedIndex >= 0) {
            selected.splice(existedIndex, 1)
        } else {
            selected.push(emotionKey)
        }
    }

    const clearAllSelections = () => {
        if (isEmotionSpamRunning.value) return
        moduleStore.moduleConfig.emotionSpam.msg = []
    }

    const clearCurrentPackageSelections = () => {
        if (isEmotionSpamRunning.value || !selectedPackage.value) return

        const currentPackageSet = new Set(
            selectedPackage.value.emoticons.map((item) =>
                normalizeEmotionUnique(item.emoticon_unique)
            )
        )

        moduleStore.moduleConfig.emotionSpam.msg = moduleStore.moduleConfig.emotionSpam.msg.filter(
            (value) => !currentPackageSet.has(normalizeEmotionUnique(value))
        )
    }

    const packageCards = computed<EmotionPackageListItem[]>(() => {
        return packageList.value.map((pkg) => {
            const displayInfo = getPackageDisplayInfo(pkg)

            return {
                id: pkg.pkg_id,
                coverUrl: pkg.current_cover,
                name: displayInfo.name || `表情包 ${pkg.pkg_id}`,
                description: displayInfo.descript,
                selectedCount: getPackageSelectedCount(pkg.pkg_id),
                isCurrent: isPackageCurrent(pkg.pkg_id)
            }
        })
    })

    const selectedPackageId = computed(() => selectedPackage.value?.pkg_id ?? null)

    const packageImagePanels = computed<EmotionPackageImagePanel[]>(() => {
        return packageList.value.map((pkg) => ({
            packageId: pkg.pkg_id,
            imageUrls: pkg.emoticons.map((item) => item.url)
        }))
    })

    const selectedPackagePanel = computed<EmotionPackagePanel | null>(() => {
        const pkg = selectedPackage.value
        if (!pkg) {
            return null
        }

        const imageVariant: EmotionGridVariant = isGeneralPackage(pkg)
            ? 'general'
            : isEmojiPackage(pkg)
              ? 'emoji'
              : 'default'

        return {
            packageId: pkg.pkg_id,
            imageVariant,
            emotionItems: pkg.emoticons.map((item) => {
                const unique = normalizeEmotionUnique(item.emoticon_unique)
                return {
                    id: item.emoticon_id,
                    unique,
                    title: item.emoji || item.descript || `表情 ${item.emoticon_id}`,
                    imageUrl: item.url,
                    isSelected: isEmotionSelected(unique),
                    isDisabled: isEmotionDisabled(item)
                }
            })
        }
    })

    const hasSelectedInCurrentPackage = computed(() => {
        if (selectedPackageId.value === null) {
            return false
        }

        return getPackageSelectedCount(selectedPackageId.value) > 0
    })

    return {
        packageCards,
        packageImagePanels,
        selectedPackagePanel,
        selectedPackageId,
        hasSelectedInCurrentPackage,
        selectedEmotionCount,
        handleSelectPackage,
        toggleEmotionSelection,
        clearAllSelections,
        clearCurrentPackageSelections
    }
}
