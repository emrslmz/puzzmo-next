import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: [
    'dist/**',
    'node_modules/**',
    'android/**',
    'ios/**',
    'public/**',
    'assets-src/**',
    'revenuecat/**',
    '*.config.*',
  ],
  rules: {
    'no-console': 'off',
    'node/prefer-global/process': 'off',
    // Phaser game objects add themselves to the scene in their constructor.
    'no-new': 'off',
    // The unused-imports variant misreports plain JS locals under ESLint 10.
    'unused-imports/no-unused-vars': 'off',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
  },
})
