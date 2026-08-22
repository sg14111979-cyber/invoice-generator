import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Underscore-prefixed bindings are intentional discards (e.g. destructuring
      // fields out of a database row before re-inserting it).
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // react-pdf's <Image> is a PDF primitive, not an HTML image element.
    files: ["src/lib/pdf/**/*.tsx"],
    rules: { "jsx-a11y/alt-text": "off" },
  },
];

export default eslintConfig;
