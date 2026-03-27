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
    const iconPath = fileURLToPath(new URL('./src/assets/Icon.svg', import.meta.url))
    const rawSvg = readFileSync(iconPath, 'utf8')
    const normalizedSvg = rawSvg
        .replace(/^\s*<\?xml[^>]*>\s*/u, '')
        .replace(/<!--[\s\S]*?-->/gu, '')
        .replace(/>\s+</gu, '><')
        .replace(/\s{2,}/gu, ' ')
        .replace(/[\n\r\t]+/gu, ' ')
        .replace(/\s*=\s*/gu, '=')
        .trim()

    if (!/\bviewBox=/u.test(normalizedSvg)) {
        throw new Error('Icon.svg 缺少 viewBox，无法生成 userscript 图标。')
    }

    const base64Svg = Buffer.from(normalizedSvg, 'utf8').toString('base64')

    return `data:image/svg+xml;base64,${base64Svg}`
}

const userscriptIconDataUrl = createUserscriptIconDataUrl()

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
                icon: userscriptIconDataUrl,
                icon64: userscriptIconDataUrl,
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
                'run-at': 'document-start',
                connect: [
                    'api.bilibili.com',
                    'api.live.bilibili.com',
                    'live.bilibili.com',
                    EDGEONE_RELEASE_HOST
                ]
            },
            build: {
                fileName: 'HazelSpam.user.js',
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
