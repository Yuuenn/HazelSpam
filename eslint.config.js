import js from '@eslint/js'
import globals from 'globals'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import vueParser from 'vue-eslint-parser'

export default tseslint.config(
    {
        ignores: ['dist/**', 'coverage/**', 'debug/**', 'node_modules/**']
    },
    {
        ...js.configs.recommended,
        files: ['**/*.{js,mjs,cjs}'],
        languageOptions: {
            ...js.configs.recommended.languageOptions,
            globals: {
                ...globals.node
            }
        },
        rules: {
            ...js.configs.recommended.rules,
            'no-console': 'off'
        }
    },
    ...pluginVue.configs['flat/essential'],
    ...tseslint.configs.recommended,
    {
        files: ['**/*.{ts,tsx,vue}'],
        languageOptions: {
            parser: vueParser,
            parserOptions: {
                parser: tseslint.parser,
                ecmaVersion: 'latest',
                sourceType: 'module',
                extraFileExtensions: ['.vue']
            },
            globals: {
                ...globals.browser,
                ...globals.node
            }
        },
        rules: {
            'no-console': 'off',
            'vue/multi-word-component-names': 'off'
        }
    },
    {
        files: ['tests/**/*.ts', '**/*.{test,spec}.ts'],
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.vitest
            }
        }
    },
    {
        files: ['**/*.d.ts'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off'
        }
    }
)
