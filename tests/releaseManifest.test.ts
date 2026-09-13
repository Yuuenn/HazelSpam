import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { PRIMARY_RELEASE_ORIGIN, MIRROR_RELEASE_ORIGIN } from '@/constants/brand'

describe('发行清单构建', () => {
    it.each([PRIMARY_RELEASE_ORIGIN, MIRROR_RELEASE_ORIGIN])(
        '为 %s 生成同版本下载清单',
        (origin) => {
            const cwd = mkdtempSync(join(tmpdir(), 'hazelspam-release-'))
            try {
                mkdirSync(join(cwd, 'dist'))
                writeFileSync(join(cwd, 'package.json'), JSON.stringify({ version: '1.3.1' }))
                execFileSync(
                    process.execPath,
                    [resolve('scripts/generateLatestReleaseManifest.js')],
                    {
                        cwd,
                        env: { ...process.env, HAZELSPAM_RELEASE_ORIGIN: origin }
                    }
                )
                const manifest = JSON.parse(readFileSync(join(cwd, 'dist/latest.json'), 'utf8'))
                expect(manifest.version).toBe('1.3.1')
                expect(manifest.downloadUrl).toBe(`${origin}/HazelSpam.min.user.js`)
                expect(manifest.downloads).toEqual({
                    default: `${origin}/HazelSpam.min.user.js`,
                    minified: `${origin}/HazelSpam.min.user.js`,
                    source: `${origin}/HazelSpam.user.js`
                })
                expect(Number.isNaN(Date.parse(manifest.publishedAt))).toBe(false)
            } finally {
                rmSync(cwd, { recursive: true, force: true })
            }
        }
    )
})
