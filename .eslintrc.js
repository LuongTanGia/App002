module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended"],
  root: true,
  env: {
    node: true,
    jest: true,
    es6: true,
  },
  ignorePatterns: [
    "dist",
    "node_modules",
    ".eslintrc.js",
    "jest.*.config.js",
    "coverage",
    "*.d.ts",
  ],
  rules: {
    // TypeScript specific rules
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],

    // General JavaScript rules
    "no-console": "warn",
    "no-debugger": "error",
    "no-duplicate-imports": "error",
    "no-unused-expressions": "error",
    "prefer-const": "error",
    "no-var": "error",
    "no-unused-vars": "off", // Turn off base rule as it conflicts with @typescript-eslint/no-unused-vars

    // Security rules
    "no-eval": "error",
    "no-implied-eval": "error",
    "no-new-func": "error",
  },
  overrides: [
    {
      files: ["**/*.test.ts", "**/*.spec.ts"],
      rules: {
        "no-console": "off",
        "@typescript-eslint/no-explicit-any": "off",
      },
    },
    {
      files: ["src/migrations/**/*.ts"],
      rules: {
        "no-console": "off",
      },
    },
  ],
};
