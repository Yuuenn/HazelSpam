import mitt from 'mitt'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sanitizeModuleConfig } from '@/utils/storage/schema'

const { moduleStoreState, checkUpdateMock, showUpdateDialogMock } = vi.hoisted(() => ({
    moduleStoreState: {
        current: null as {
            moduleConfig: ReturnType<typeof sanitizeModuleConfig>
            emitter: ReturnType<typeof mitt>
        } | null
    },
    checkUpdateMock: vi.fn(),
    showUpdateDialogMock: vi.fn()
}))

vi.mock('@/stores/useModuleStore', () => ({
    useModuleStore: () => moduleStoreState.current
}))

vi.mock('@/utils/checkUpdate', () => ({
    checkUpdate: checkUpdateMock
}))

vi.mock('@/utils/ui/updateDialog', () => ({
    showUpdateDialog: showUpdateDialogMock
}))

import AutoCheckUpdateModule from '@/modules/settings/autoCheckUpdateModule'

describe('AutoCheckUpdateModule', () => {
    beforeEach(() => {
        moduleStoreState.current = {
            moduleConfig: sanitizeModuleConfig({}),
            emitter: mitt()
        }
        moduleStoreState.current.moduleConfig.settings.autoCheckUpdate.enable = true
        checkUpdateMock.mockReset()
        showUpdateDialogMock.mockReset()
    })

    it('swallows update check failures so the module run still resolves', async () => {
        checkUpdateMock.mockRejectedValue(new Error('network error'))

        const module = new AutoCheckUpdateModule('AutoCheckUpdateTest')

        await expect(module.run()).resolves.toBeUndefined()
        expect(showUpdateDialogMock).not.toHaveBeenCalled()
    })

    it('shows the update dialog when a newer version is found', async () => {
        checkUpdateMock.mockResolvedValue({
            status: 'available',
            currentVersion: '1.0.0',
            latestVersion: '1.1.0',
            downloadUrl: 'https://hazel.idols.ltd/HazelSpam.min.user.js',
            changelogUrl: 'https://example.com/changelog'
        })

        const module = new AutoCheckUpdateModule('AutoCheckUpdateTest')

        await expect(module.run()).resolves.toBeUndefined()
        expect(showUpdateDialogMock).toHaveBeenCalledWith({
            version: '1.1.0',
            changelogUrl: 'https://example.com/changelog',
            downloadUrl: 'https://hazel.idols.ltd/HazelSpam.min.user.js'
        })
    })
})
