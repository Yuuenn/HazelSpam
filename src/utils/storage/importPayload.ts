import { getTextFallbackPool } from '@/utils/textFallback'
import { cloneTextTabPanels, normalizeTextTabsSnapshot, type TextTabsSnapshot } from './schema'

type ImportedTextTabsPayload = {
    kind: 'textTabs'
    textTabs: TextTabsSnapshot
}

type ParsedTomlTab = {
    title?: string
    text?: string
}

export type ImportedStoragePayload = ImportedTextTabsPayload

const TAB_TABLE_HEADER = '[[tabs]]'

const normalizeLineEndings = (value: string) => value.replace(/\r\n?/g, '\n')

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null

const countTrailingBackslashes = (value: string, endIndex: number) => {
    let count = 0

    for (let index = endIndex - 1; index >= 0 && value[index] === '\\'; index -= 1) {
        count += 1
    }

    return count
}

const findUnescapedTripleQuotes = (value: string) => {
    for (let index = 0; index <= value.length - 3; index += 1) {
        if (value.slice(index, index + 3) !== '"""') {
            continue
        }

        if (countTrailingBackslashes(value, index) % 2 === 0) {
            return index
        }
    }

    return -1
}

const parseUnicodeEscape = (value: string, startIndex: number, length: number) => {
    const hex = value.slice(startIndex, startIndex + length)
    if (!/^[0-9a-fA-F]+$/.test(hex)) {
        return null
    }

    const codePoint = Number.parseInt(hex, 16)
    if (codePoint > 0x10ffff) {
        return null
    }

    const character = String.fromCodePoint(codePoint)
    return {
        nextIndex: startIndex + length,
        character
    }
}

const unescapeTomlBasicString = (value: string) => {
    let result = ''

    for (let index = 0; index < value.length; index += 1) {
        const currentChar = value[index]
        if (currentChar !== '\\') {
            result += currentChar
            continue
        }

        const escapeChar = value[index + 1]
        if (escapeChar === undefined) {
            return null
        }

        switch (escapeChar) {
            case 'b':
                result += '\b'
                index += 1
                break
            case 't':
                result += '\t'
                index += 1
                break
            case 'n':
                result += '\n'
                index += 1
                break
            case 'f':
                result += '\f'
                index += 1
                break
            case 'r':
                result += '\r'
                index += 1
                break
            case '"':
                result += '"'
                index += 1
                break
            case '\\':
                result += '\\'
                index += 1
                break
            case 'u': {
                const parsed = parseUnicodeEscape(value, index + 2, 4)
                if (parsed === null) {
                    return null
                }
                result += parsed.character
                index = parsed.nextIndex - 1
                break
            }
            case 'U': {
                const parsed = parseUnicodeEscape(value, index + 2, 8)
                if (parsed === null) {
                    return null
                }
                result += parsed.character
                index = parsed.nextIndex - 1
                break
            }
            default:
                return null
        }
    }

    return result
}

const parseInlineTomlString = (value: string) => {
    const trimmedValue = value.trim()

    if (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) {
        return unescapeTomlBasicString(trimmedValue.slice(1, -1))
    }

    if (trimmedValue.startsWith("'") && trimmedValue.endsWith("'")) {
        return trimmedValue.slice(1, -1)
    }

    return null
}

const createFallbackTextTabsSnapshot = () => {
    const tabPanels = getTextFallbackPool().map((msg, index) => ({
        key: index + 1,
        id: index + 1,
        tab: `默认文案 ${index + 1}`,
        msg
    }))

    return normalizeTextTabsSnapshot({
        activeTabId: tabPanels[0].id,
        tabPanels
    })
}

const finalizeParsedTabs = (tabs: ParsedTomlTab[]) => {
    const normalizedTabs = tabs
        .filter((tab) => tab.title !== undefined || tab.text !== undefined)
        .map((tab, index) => ({
            key: index + 1,
            id: index + 1,
            tab: typeof tab.title === 'string' ? tab.title : `标签页 ${index + 1}`,
            msg: typeof tab.text === 'string' ? tab.text : ''
        }))

    if (normalizedTabs.length === 0) {
        return createFallbackTextTabsSnapshot()
    }

    return normalizeTextTabsSnapshot({
        activeTabId: normalizedTabs[0].id,
        tabPanels: normalizedTabs
    })
}

export const appendImportedTextTabsSnapshot = (
    currentSnapshot: TextTabsSnapshot,
    importedSnapshot: TextTabsSnapshot
) => {
    const currentPanels = cloneTextTabPanels(currentSnapshot.tabPanels)
    let nextKey = Math.max(0, ...currentPanels.map((panel) => panel.key))
    let nextId = Math.max(0, ...currentPanels.map((panel) => panel.id))

    const appendedPanels = cloneTextTabPanels(importedSnapshot.tabPanels).map((panel) => ({
        ...panel,
        key: (nextKey += 1),
        id: (nextId += 1)
    }))

    const mergedPanels = [...currentPanels, ...appendedPanels]
    const nextActiveTabId = mergedPanels.some((panel) => panel.id === currentSnapshot.activeTabId)
        ? currentSnapshot.activeTabId
        : (mergedPanels[0]?.id ?? 1)

    return normalizeTextTabsSnapshot({
        activeTabId: nextActiveTabId,
        tabPanels: mergedPanels
    })
}

const parseTabsToml = (content: string) => {
    const lines = normalizeLineEndings(content).split('\n')
    const tabs: ParsedTomlTab[] = []
    let currentTab: ParsedTomlTab | null = null
    let multilineTextBuffer: string[] | null = null

    for (const rawLine of lines) {
        if (multilineTextBuffer !== null) {
            const closingIndex = findUnescapedTripleQuotes(rawLine)
            if (closingIndex >= 0) {
                multilineTextBuffer.push(rawLine.slice(0, closingIndex))
                const parsedText = unescapeTomlBasicString(multilineTextBuffer.join('\n'))
                if (parsedText === null) {
                    return null
                }

                if (currentTab === null) {
                    return null
                }

                currentTab.text = parsedText
                multilineTextBuffer = null
                continue
            }

            multilineTextBuffer.push(rawLine)
            continue
        }

        const trimmedLine = rawLine.trim()
        if (trimmedLine.length === 0 || trimmedLine.startsWith('#')) {
            continue
        }

        if (trimmedLine === TAB_TABLE_HEADER) {
            if (currentTab !== null) {
                tabs.push(currentTab)
            }

            currentTab = {}
            continue
        }

        if (currentTab === null) {
            continue
        }

        const assignmentMatch = rawLine.match(/^\s*([A-Za-z0-9_-]+)\s*=\s*(.+?)\s*$/)
        if (!assignmentMatch) {
            continue
        }

        const [, key, rawValue] = assignmentMatch
        if (key === 'title') {
            const parsedTitle = parseInlineTomlString(rawValue)
            if (parsedTitle !== null) {
                currentTab.title = parsedTitle
            }
            continue
        }

        if (key !== 'text') {
            continue
        }

        const trimmedValue = rawValue.trim()
        if (trimmedValue.startsWith('"""')) {
            const inlineText = trimmedValue.slice(3)
            const closingIndex = findUnescapedTripleQuotes(inlineText)
            if (closingIndex >= 0) {
                const parsedText = unescapeTomlBasicString(inlineText.slice(0, closingIndex))
                if (parsedText === null) {
                    return null
                }

                currentTab.text = parsedText
                continue
            }

            multilineTextBuffer = inlineText.length > 0 ? [inlineText] : []
            continue
        }

        const parsedText = parseInlineTomlString(trimmedValue)
        if (parsedText !== null) {
            currentTab.text = parsedText
        }
    }

    if (multilineTextBuffer !== null) {
        return null
    }

    if (currentTab !== null) {
        tabs.push(currentTab)
    }

    return finalizeParsedTabs(tabs)
}

const escapeTomlBasicString = (value: string) =>
    value
        .replace(/\\/g, '\\\\')
        .replace(/\u0008/g, '\\b')
        .replace(/\t/g, '\\t')
        .replace(/\n/g, '\\n')
        .replace(/\f/g, '\\f')
        .replace(/\r/g, '\\r')
        .replace(/"/g, '\\"')

const escapeTomlMultilineBasicString = (value: string) =>
    normalizeLineEndings(value)
        .replace(/\\/g, '\\\\')
        .replace(/\u0008/g, '\\b')
        .replace(/\t/g, '\\t')
        .replace(/\f/g, '\\f')
        .replace(/\r/g, '\\r')
        .replace(/"/g, '\\"')

export const stringifyImportedStoragePayload = (payload: ImportedStoragePayload) => {
    if (!isRecord(payload) || payload.kind !== 'textTabs') {
        return ''
    }

    return payload.textTabs.tabPanels
        .map((panel) => {
            const title = escapeTomlBasicString(panel.tab)
            const text = escapeTomlMultilineBasicString(panel.msg)

            return `${TAB_TABLE_HEADER}\ntitle = "${title}"\ntext = """${text}"""`
        })
        .join('\n\n')
}

export const parseImportedStoragePayload = (content: string): ImportedStoragePayload | null => {
    if (typeof content !== 'string') {
        return null
    }

    const textTabs = parseTabsToml(content)
    if (textTabs === null) {
        return null
    }

    return {
        kind: 'textTabs',
        textTabs
    }
}
