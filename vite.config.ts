import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import monkey, { cdn, util } from 'vite-plugin-monkey'
import svgLoader from 'vite-svg-loader'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import {
    GITHUB_PROFILE_URL,
    PRODUCT_AUTHOR,
    PRODUCT_DESCRIPTION,
    USERSCRIPT_NAME,
    PROJECT_HOMEPAGE_URL,
    PROJECT_ISSUES_URL,
    EDGEONE_RELEASE_HOST,
    USERSCRIPT_DOWNLOAD_URL,
    USERSCRIPT_UPDATE_URL
} from './src/constants/brand'

function createUserscriptIconDataUrl() {
    const iconSize = 64
    const iconPadding = 4
    const iconPath = fileURLToPath(new URL('./src/assets/Logo.svg', import.meta.url))
    const rawSvg = readFileSync(iconPath, 'utf8').replace(/^\s*<\?xml[^>]*>\s*/u, '').trim()
    const viewBoxMatch = rawSvg.match(/viewBox="[^"]*\s([\d.]+)\s([\d.]+)"/u)

    if (!viewBoxMatch) {
        throw new Error('Logo.svg 缺少 viewBox，无法生成 userscript 图标。')
    }

    const sourceWidth = Number(viewBoxMatch[1])
    const sourceHeight = Number(viewBoxMatch[2])
    const targetHeight = iconSize - iconPadding * 2
    const targetWidth = (sourceWidth / sourceHeight) * targetHeight
    const x = (iconSize - targetWidth) / 2
    const encodedInnerSvg = encodeURIComponent(rawSvg)
    const wrappedSvg =
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${iconSize} ${iconSize}">` +
        `<image href="data:image/svg+xml;utf8,${encodedInnerSvg}" x="${x}" y="${iconPadding}" ` +
        `width="${targetWidth}" height="${targetHeight}" preserveAspectRatio="xMidYMid meet"/>` +
        `</svg>`

    return `data:image/svg+xml,${encodeURIComponent(wrappedSvg)}`
}

export default defineConfig({
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    plugins: [
        {
            name: 'hazelspam-fix-primeicons-svg-fragment',
            enforce: 'pre',
            transform(code, id) {
                if (!id.includes('primeicons.css')) return
                // PrimeIcons keeps an old SVG fallback with a fragment url (#primeicons),
                // which triggers a noisy postcss-url warning in Vite's css pipeline.
                return code.replace(
                    /,\s*url\(['"]\.\/fonts\/primeicons\.svg\?#primeicons['"]\)\s*format\(['"]svg['"]\)/g,
                    ''
                )
            }
        },
        vue(),
        svgLoader(),
        monkey({
            entry: 'src/main.ts',
            userscript: {
                icon: createUserscriptIconDataUrl(),
                name: { '': USERSCRIPT_NAME, zh: '灰宝独轮车 - 后现代 B 站弹幕工具' },
                description: { '': PRODUCT_DESCRIPTION, zh: PRODUCT_DESCRIPTION },
                namespace: GITHUB_PROFILE_URL,
                homepageURL: PROJECT_HOMEPAGE_URL,
                supportURL: PROJECT_ISSUES_URL,
                license: 'MIT',
                author: PRODUCT_AUTHOR,
                copyright: `2026, ${PRODUCT_AUTHOR} (${GITHUB_PROFILE_URL})`,
                downloadURL: USERSCRIPT_DOWNLOAD_URL,
                updateURL: USERSCRIPT_UPDATE_URL,
                match: ['*://live.bilibili.com/*'],
                'run-at': 'document-end',
                connect: [
                    'api.bilibili.com',
                    'api.live.bilibili.com',
                    'live.bilibili.com',
                    EDGEONE_RELEASE_HOST
                ]
            },
            build: {
                externalGlobals: {
                    vue: cdn
                        .jsdelivr('Vue', 'dist/vue.global.prod.js')
                        .concat(util.dataUrl('window.Vue=Vue;window.VueDemi=Vue')),
                    pinia: cdn.jsdelivr('Pinia', 'dist/pinia.iife.prod.js'),
                    axios: cdn.jsdelivr('axios', 'dist/axios.min.js'),
                    lodash: cdn.jsdelivr('_', 'lodash.min.js')
                }
            }
        })
    ]
})
