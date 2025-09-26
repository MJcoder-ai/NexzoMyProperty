module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: null,
    tsconfigRootDir: __dirname,
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  env: {
    es2021: true,
    node: true,
    jest: true,
    browser: true
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }
    ]
  },
  ignorePatterns: ['dist', 'build', '.turbo', 'coverage']
};
