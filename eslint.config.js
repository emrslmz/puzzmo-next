import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: [
    'src/assets/vendor/**',
    'dist/**',
    'build/**',
    'node_modules/**',
    '*.min.js',
    '*.config.js',
    '*.config.ts',
    '*.config.mjs',
    'android/**',
    'ios/**',
    'capacitor.config.ts',
    'vite.config.mjs',
    'vue.config.js',
    'tailwind.config.js',
    'postcss.config.cjs',
    'public/**'
  ],
  rules: {
    'no-console': 'off',
    'vue/no-unused-components': 'off',
    'node/prefer-global/process': 'off',
    'unused-imports/no-unused-vars': 'warn',
    'ts/no-use-before-define': 'warn',
    'vue/require-toggle-inside-transition': 'warn'
  }
})
