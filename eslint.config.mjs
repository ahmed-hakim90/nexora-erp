import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const architectureRestrictedImportPatterns = [
  {
    group: ["@/features/*/infrastructure/*"],
    message:
      "Feature infrastructure is private and server-only. Expose stable contracts through public-api.ts or route adapters.",
  },
  {
    group: ["@/features/*/domain/*"],
    message:
      "Feature domain internals are private to the owning module. Expose stable contracts through public-api.ts.",
  },
  {
    group: ["@/features/*/application/*"],
    message:
      "Feature application internals are private to the owning module. Use public-api.ts or route adapters.",
  },
  {
    group: ["@/features/*/presentation/*"],
    message:
      "Feature presentation is private to its module and route experience. Do not reuse UI as a business dependency.",
  },
  {
    group: ["@/features/*/permissions/*"],
    message:
      "Feature permission registries are private to the owning module. Import permissions through public-api.ts.",
  },
  {
    group: ["@/features/*/tests/*"],
    message: "Feature test helpers must not become production dependencies.",
  },
  {
    group: ["@/platform/*/infrastructure/*"],
    message:
      "Platform infrastructure is server-only. Use public platform contracts instead.",
  },
];

const sonnerRestrictedImportPaths = [
  {
    name: "sonner",
    message:
      "Only src/platform/feedback/public-api.tsx may import Sonner directly. Use feedback exports from '@/platform/client' elsewhere.",
  },
];

export default defineConfig([
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: architectureRestrictedImportPatterns,
        },
      ],
    },
  },
  {
    files: ["src/app/**/*", "src/core/**/*", "src/features/**/*", "src/shared/**/*"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            ...architectureRestrictedImportPatterns,
          ],
        },
      ],
    },
  },
  {
    files: ["src/platform/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: sonnerRestrictedImportPaths,
          patterns: architectureRestrictedImportPatterns,
        },
      ],
    },
  },
  {
    files: ["src/app/**/*", "src/core/**/*", "src/features/**/*", "src/shared/**/*"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            ...sonnerRestrictedImportPaths,
          ],
          patterns: [
            ...architectureRestrictedImportPatterns,
            {
              group: ["@/infrastructure/*"],
              message:
                "Root infrastructure is server-only and must not be imported outside approved platform adapters.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/platform/feedback/public-api.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: architectureRestrictedImportPatterns,
        },
      ],
    },
  },
  globalIgnores([".next/**", "next-env.d.ts"]),
]);
