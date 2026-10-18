import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // O worker é gerado pelo MSW; alterações manuais seriam sobrescritas na atualização.
  globalIgnores(['dist', 'artifacts', 'public/mockServiceWorker.js']),
  {
    // Aplica as regras aos módulos TypeScript, incluindo componentes com JSX.
    files: ['**/*.{ts,tsx}'],
    // Combina verificações da linguagem, tipagem, uso dos hooks e atualização durante desenvolvimento.
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      // Reconhece APIs do navegador, como window e localStorage, sem tratá-las como variáveis indefinidas.
      globals: globals.browser,
    },
  },
])
