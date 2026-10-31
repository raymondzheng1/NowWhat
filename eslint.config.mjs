import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "test-results/**",
      "playwright-report/**",
      "next-env.d.ts",
      "scripts/**",
      // Build scripts for review packs, not app source — same reasoning as scripts/**.
      "docs/**",
      "corpus/index.json",
      "corpus/legal/index.json",
      "data/index.json",
      "coverage/**",
      // Background sessions check out whole copies of this repo under .claude/worktrees/,
      // build output and all. Linting them failed `verify` here with 960 errors that were
      // none of this checkout's code, whenever a background task happened to be running.
      ".claude/**",
    ],
  },
  {
    rules: {
      // No `any` (harness §2.4) — prefer unknown + narrowing.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];

export default eslintConfig;
