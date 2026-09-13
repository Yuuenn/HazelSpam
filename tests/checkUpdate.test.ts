import { beforeEach, describe, expect, it, vi } from 'vitest'
import { checkUpdate } from '@/utils/checkUpdate'
import {
    LATEST_RELEASE_MANIFEST_URL,
    MIRROR_RELEASE_MANIFEST_URL,
    PROJECT_CHANGELOG_URL
} from '@/constants/brand'

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

    it('在 Pages manifest 版本更高时返回可更新结果', async () => {
        gmXmlhttpRequest.mockImplementation(({ url, onload }) => {
            expect(url).toBe(LATEST_RELEASE_MANIFEST_URL)
            onload?.({
                status: 200,
                responseText: JSON.stringify({
                    version: '1.1.0',
                    publishedAt: '2026-03-15T00:00:00.000Z',
                    downloadUrl: 'https://hazel.idol.gold/HazelSpam.min.user.js',
                    changelogUrl: 'https://example.com/changelog'
                })
            })
        })

        await expect(checkUpdate()).resolves.toEqual({
            status: 'available',
            currentVersion: '1.0.0',
            latestVersion: '1.1.0',
            downloadUrl: 'https://hazel.idol.gold/HazelSpam.min.user.js',
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
                        minified: 'https://hazel.idol.gold/HazelSpam.min.user.js'
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
                        default: 'https://hazel.idol.gold/HazelSpam.min.user.js'
                    }
                })
            })
        })

        await expect(checkUpdate()).resolves.toEqual({
            status: 'available',
            currentVersion: '1.0.0',
            latestVersion: '1.2.0',
            downloadUrl: 'https://hazel.idol.gold/HazelSpam.min.user.js',
            changelogUrl: PROJECT_CHANGELOG_URL
        })
    })

    it('在 manifest 缺少有效版本号时返回明确错误', async () => {
        gmXmlhttpRequest.mockImplementation(({ onload }) => {
            onload?.({
                status: 200,
                responseText: JSON.stringify({
                    downloadUrl: 'https://hazel.idol.gold/HazelSpam.min.user.js'
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
    it.each(['http', 'network', 'timeout', 'json', 'download'])(
        '主源 %s 失败后从镜像获取清单和下载链接',
        async (failure) => {
            gmXmlhttpRequest
                .mockImplementationOnce(({ onload, onerror, ontimeout, timeout }) => {
                    expect(timeout).toBe(10000)
                    if (failure === 'network') return onerror()
                    if (failure === 'timeout') return ontimeout()
                    onload({
                        status: failure === 'http' ? 503 : 200,
                        responseText:
                            failure === 'download'
                                ? JSON.stringify({ version: '1.2.0' })
                                : '<html>error</html>'
                    })
                })
                .mockImplementationOnce(({ url, onload }) => {
                    expect(url).toBe(MIRROR_RELEASE_MANIFEST_URL)
                    onload({
                        status: 200,
                        responseText: JSON.stringify({
                            version: '1.2.0',
                            downloadUrl: 'https://hazel.idol.gold/HazelSpam.min.user.js'
                        })
                    })
                })
            await expect(checkUpdate()).resolves.toMatchObject({
                status: 'available',
                downloadUrl: 'https://hazel.idol.su/HazelSpam.min.user.js'
            })
            expect(gmXmlhttpRequest).toHaveBeenCalledTimes(2)
        }
    )

    it('主源正常时不请求镜像', async () => {
        gmXmlhttpRequest.mockImplementation(({ onload }) =>
            onload({
                status: 200,
                responseText: JSON.stringify({
                    version: '1.0.0',
                    downloadUrl: 'https://hazel.idol.gold/HazelSpam.min.user.js'
                })
            })
        )
        await expect(checkUpdate()).resolves.toMatchObject({ status: 'latest' })
        expect(gmXmlhttpRequest).toHaveBeenCalledTimes(1)
    })

    it('两源均不可用时明确报错', async () => {
        gmXmlhttpRequest.mockImplementation(({ onerror }) => onerror())
        await expect(checkUpdate()).rejects.toThrow('获取最新版本信息失败')
        expect(gmXmlhttpRequest).toHaveBeenCalledTimes(2)
    })

    it('拒绝清单中的非 HTTPS 安装链接', async () => {
        gmXmlhttpRequest.mockImplementation(({ onload }) =>
            onload({
                status: 200,
                responseText: JSON.stringify({
                    version: '1.2.0',
                    downloadUrl: 'javascript:alert(1)'
                })
            })
        )
        await expect(checkUpdate()).rejects.toThrow('下载链接必须使用 HTTPS')
    })
})
