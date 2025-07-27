import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc"; // Make sure @eslint/eslintrc is installed if not already (npm install @eslint/eslintrc)

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  // Recommended: specify a directory for plugins. If your plugins are in node_modules,
  // this is usually the project root.
  // This helps FlatCompat find plugins like @typescript-eslint.
  // You might need to adjust this path based on your project structure.
  resolvePluginsRelativeTo: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Add a new configuration object to override specific rules
  {
    // These files should match where you want these rules applied.
    // By default, `next/typescript` typically applies to .ts and .tsx files.
    // Using a broad pattern here ensures it covers all your JS/TS files.
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    rules: {
      // Allow the use of 'any' type
      // Note: This rule comes from @typescript-eslint
      "@typescript-eslint/no-explicit-any": "off",

      // Allow unused variables
      // You should disable both the core ESLint rule and the TypeScript-specific one
      "no-unused-vars": "off", // Core ESLint rule
      "@typescript-eslint/no-unused-vars": "off", // TypeScript-specific rule
    },
  },
];

export default eslintConfig;
