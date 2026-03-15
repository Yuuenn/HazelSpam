import { describe, expect, it } from 'vitest'
import { resolveShellViewportMetrics } from '@/composables/useAppShellLayout'

describe('app shell layout', () => {
    it('keeps the standard scaled shell for regular live room viewports', () => {
        const metrics = resolveShellViewportMetrics({
            viewportHeight: 734
        })

        expect(metrics.scale).toBeCloseTo(662 / 760, 4)
        expect(metrics.stageHeight).toBe(662)
        expect(metrics.renderHeight).toBe(760)
    })

    it('keeps the same scaling behavior in embedded lite room viewports', () => {
        const metrics = resolveShellViewportMetrics({
            viewportHeight: 734
        })

        expect(metrics.scale).toBeCloseTo(662 / 760, 4)
        expect(metrics.stageHeight).toBe(662)
        expect(metrics.renderHeight).toBe(760)
    })

    it('caps shell height at the design height when the viewport is large enough', () => {
        const metrics = resolveShellViewportMetrics({
            viewportHeight: 920
        })

        expect(metrics.scale).toBe(1)
        expect(metrics.stageHeight).toBe(760)
        expect(metrics.renderHeight).toBe(760)
    })
})
