import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: [{ find: /^@\//, replacement: `${path.resolve(process.cwd())}/src/` }] },
  test: {
    environment: 'node',
    // Archify is a checked-in tool, not part of Glow's application test suite.
    exclude: ['**/node_modules/**', '**/.git/**', '**/.cache/**', 'tools/archify/**'],
  },
});
