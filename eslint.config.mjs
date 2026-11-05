import js from "@eslint/js";
import ts from "typescript-eslint";
export default ts.config(
  {
    ignores: [
      ".tools/**",
      "test-results/**",
      "playwright-report/**",
      "**/dist/**",
      "**/.next/**",
      "**/target/**",
      "**/node_modules/**",
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    rules: { "@typescript-eslint/no-explicit-any": "error" },
  },
  {
    files: ["**/*.mjs"],
    languageOptions: { globals: { process: "readonly" } },
  },
);
