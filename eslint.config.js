import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

const webGlobals = {
  ...globals.browser,
  fetch: "readonly",
  FormData: "readonly",
  Blob: "readonly",
  Headers: "readonly",
  Response: "readonly",
  AbortController: "readonly",
  AbortSignal: "readonly",
  MediaRecorder: "readonly",
  FileReader: "readonly",
};

const nodeGlobals = {
  ...globals.node,
  fetch: "readonly",
  FormData: "readonly",
  Blob: "readonly",
  Headers: "readonly",
  Response: "readonly",
  AbortController: "readonly",
  AbortSignal: "readonly",
  structuredClone: "readonly",
};

export default [
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/*.min.js", "package-lock.json"],
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx,mjs}"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...nodeGlobals, ...webGlobals },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": "warn",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  {
    files: ["frontend/**/*.{js,jsx}"],
    languageOptions: { globals: webGlobals },
  },
  {
    files: ["backend/**/*.js", "scripts/**/*.mjs", "*.config.js"],
    languageOptions: { globals: nodeGlobals },
  },
];
