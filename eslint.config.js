import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist/**', 'client/dist/**', 'node_modules/**', '.agents/**'] },
  ...tseslint.configs.recommended,
)
