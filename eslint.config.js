// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  {
    // Generated or third-party folders, never edited by hand.
    ignores: ['dist/*', 'android/*', 'ios/*', '.expo/*', 'node_modules/*', 'openspec/*', '.claude/*', '.agents/*'],
  },
  {
    // Tests and the Jest setup run in Jest, which provides describe/it/expect/jest.
    files: ['**/__tests__/**', '**/*.test.*', 'jest.setup.js'],
    languageOptions: { globals: { ...globals.jest, ...globals.node } },
  },
  {
    // Build scripts and config plugins run in Node.
    files: ['scripts/**', 'plugins/**', '*.config.js'],
    languageOptions: { globals: globals.node },
  },
]);
