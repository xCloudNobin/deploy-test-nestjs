import { mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config.mts';

export default mergeConfig(baseConfig, {
  test: {
    name: 'e2e',
    include: ['test/**/*.spec.ts', 'test/**/*.e2e-spec.ts'],
  },
});