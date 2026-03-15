import { beforeEach, describe, expect, it, vi } from 'vitest'
import { checkUpdate } from '@/utils/checkUpdate'
import { LATEST_RELEASE_MANIFEST_URL, PROJECT_CHANGELOG_URL } from '@/constants/brand'

const { gmInfo, gmXmlhttpRequest } = vi.hoisted(() => ({
    gmInfo: {
        script: {
            version: '1.0.0'
        }
    },
    gmXmlhttpRequest: vi.fn()
}))

vi.mock('$', () => ({
    GM_info: gmInfo,
    GM_xmlhttpRequest: gmXmlhttpRequest
}))

describe('checkUpdate', () => {
    beforeEach(() => {
        gmInfo.script.version = '1.0.0'
        gmXmlhttpRequest.mockReset()
    })

    it('在 EdgeOne manifest 版本更高时返回可更新结果', async () => {
        gmXmlhttpRequest.mockImplementation(({ url, onload }) => {
            expect(url).toBe(LATEST_RELEASE_MANIFEST_URL)
            onload?.({
                status: 200,
                responseText: JSON.stringify({
                    version: '1.1.0',
                    publishedAt: '2026-03-15T00:00:00.000Z',
                    downloadUrl: 'https://hazel.idols.ltd/HazelSpam.min.user.js',
                    changelogUrl: 'https://example.com/changelog'
                })
            })
        })

        await expect(checkUpdate()).resolves.toEqual({
            status: 'available',
            currentVersion: '1.0.0',
            latestVersion: '1.1.0',
            downloadUrl: 'https://hazel.idols.ltd/HazelSpam.min.user.js',
            changelogUrl: 'https://example.com/changelog'
        })
    })

    it('在 manifest 版本不高于当前版本时返回 latest', async () => {
        gmInfo.script.version = '1.1.0'
        gmXmlhttpRequest.mockImplementation(({ onload }) => {
            onload?.({
                status: 200,
                responseText: JSON.stringify({
                    version: '1.1.0',
                    publishedAt: '2026-03-15T00:00:00.000Z',
                    downloads: {
                        minified: 'https://hazel.idols.ltd/HazelSpam.min.user.js'
                    }
                })
            })
        })

        await expect(checkUpdate()).resolves.toEqual({
            status: 'latest',
            currentVersion: '1.1.0',
            latestVersion: '1.1.0'
        })
    })

    it('在 changelog 缺失时回退到仓库 changelog', async () => {
        gmXmlhttpRequest.mockImplementation(({ onload }) => {
            onload?.({
                status: 200,
                responseText: JSON.stringify({
                    version: '1.2.0',
                    publishedAt: '2026-03-15T00:00:00.000Z',
                    downloads: {
                        default: 'https://hazel.idols.ltd/HazelSpam.min.user.js'
                    }
                })
            })
        })

        await expect(checkUpdate()).resolves.toEqual({
            status: 'available',
            currentVersion: '1.0.0',
            latestVersion: '1.2.0',
            downloadUrl: 'https://hazel.idols.ltd/HazelSpam.min.user.js',
            changelogUrl: PROJECT_CHANGELOG_URL
        })
    })

    it('在 manifest 缺少有效版本号时返回明确错误', async () => {
        gmXmlhttpRequest.mockImplementation(({ onload }) => {
            onload?.({
                status: 200,
                responseText: JSON.stringify({
                    downloadUrl: 'https://hazel.idols.ltd/HazelSpam.min.user.js'
                })
            })
        })

        await expect(checkUpdate()).rejects.toThrow('最新版本信息缺少有效版本号')
    })

    it('在新版本缺少安装链接时返回明确错误', async () => {
        gmXmlhttpRequest.mockImplementation(({ onload }) => {
            onload?.({
                status: 200,
                responseText: JSON.stringify({
                    version: '1.2.0',
                    publishedAt: '2026-03-15T00:00:00.000Z'
                })
            })
        })

        await expect(checkUpdate()).rejects.toThrow('最新版本信息未提供可用的安装链接')
    })
})
