import { defineConfig } from 'eslint/config';
import * as globals from "globals";
import * as pluginJs from "@eslint/js";
import * as tseslint from "typescript-eslint";

export default defineConfig(
  {
    ignores: ["**/*.js", "node_modules", "cdk.out"]
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.commonjs,
      },
    },
    files: ["**/*.ts"],
    rules: {
      "@typescript-eslint/explicit-module-boundary-types": 0,
      "@typescript-eslint/no-explicit-any": 0,
      "no-unused-vars": 0,
      "@typescript-eslint/no-unused-vars": 0
    }
  }
);