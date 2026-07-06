import js from './apps/web/node_modules/@eslint/js/src/index.js';
import globals from './apps/web/node_modules/globals/index.js';
import reactHooks from './apps/web/node_modules/eslint-plugin-react-hooks/index.js';
import tseslint from './apps/web/node_modules/typescript-eslint/dist/index.js';

export default [
  {
    ignores: ['**/dist/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    files: ['packages/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
  },
];
