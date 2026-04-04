import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        include: [
            'src/lib/*.test.ts',
            'src/lib/engine/**/*.test.ts',
            'src/lib/engine/**/*.test.tsx',
            'src/lib/translation/**/*.test.ts',
            'src/lib/api/**/*.test.ts',
            'src/lib/calibration/**/*.test.ts',
            'src/lib/storage/**/*.test.ts',
            'src/tests/calibration/**/*.ts',
        ],
        reporters: 'verbose',
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json-summary'],
            include: [
                'src/lib/engine/extractors.ts',
                'src/lib/engine/mapper.ts',
                'src/lib/api/rate-limit.ts',
                'src/lib/api-auth.ts',
            ],
            thresholds: {
                lines: 80,
                functions: 80,
            },
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
})
