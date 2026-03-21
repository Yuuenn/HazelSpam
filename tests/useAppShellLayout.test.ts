import { describe, expect, it } from 'vitest'
import { resolveShellLayoutTier, resolveShellViewportMetrics } from '@/composables/useAppShellLayout'

describe('app shell layout tier', () => {
    it('resolves desktop tier for wide viewports', () => {
        expect(resolveShellLayoutTier(1366)).toBe('desktop')
    })

    it('resolves tablet tier for medium viewports', () => {
        expect(resolveShellLayoutTier(1100)).toBe('tablet')
    })

    it('resolves mobile tier for narrow viewports', () => {
        expect(resolveShellLayoutTier(700)).toBe('mobile')
    })

    it('resolves compact tier for extra narrow viewports', () => {
        expect(resolveShellLayoutTier(500)).toBe('compact')
    })
})

describe('app shell layout', () => {
    it('uses direct-height rendering for regular live room viewports', () => {
        const metrics = resolveShellViewportMetrics({
            viewportHeight: 734,
            viewportWidth: 1366
        })

        expect(metrics.scale).toBe(1)
        expect(metrics.stageHeight).toBe(662)
        expect(metrics.renderHeight).toBe(662)
    })

    it('keeps the standard viewport offset in mobile-tier viewports', () => {
        const metrics = resolveShellViewportMetrics({
            viewportHeight: 734,
            viewportWidth: 700
        })

        expect(metrics.scale).toBe(1)
        expect(metrics.stageHeight).toBe(662)
        expect(metrics.renderHeight).toBe(662)
    })

    it('uses compact viewport offset in narrow viewports', () => {
        const metrics = resolveShellViewportMetrics({
            viewportHeight: 734,
            viewportWidth: 500
        })

        expect(metrics.scale).toBe(1)
        expect(metrics.stageHeight).toBe(706)
        expect(metrics.renderHeight).toBe(706)
    })

    it('caps shell height at the design height when the viewport is large enough', () => {
        const metrics = resolveShellViewportMetrics({
            viewportHeight: 920,
            viewportWidth: 1366
        })

        expect(metrics.scale).toBe(1)
        expect(metrics.stageHeight).toBe(760)
        expect(metrics.renderHeight).toBe(760)
    })
})
