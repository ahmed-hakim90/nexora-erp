import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const featureNames = [
  "products",
  "product-categories",
  "units",
  "brands",
  "warehouses",
  "warehouse-locations",
  "customers",
  "suppliers",
  "price-lists",
  "tax-profiles"
];
const featureRoot = join(root, "src/features");
const appRoot = join(root, "src/app");

function walk(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stat = statSync(path);
    return stat.isDirectory() ? walk(path) : [path];
  });
}

const featureFiles = featureNames.flatMap((feature) => walk(join(featureRoot, feature)).filter((file) => /\.(ts|tsx)$/.test(file)));
const uiFiles = walk(appRoot).filter((file) => /\.(ts|tsx)$/.test(file));

const missingRequiredFiles = featureNames.flatMap((feature) => [
  `src/features/${feature}/module.manifest.ts`,
  `src/features/${feature}/public-api.ts`,
  `src/features/${feature}/permissions/permission-registry.ts`,
  `src/features/${feature}/application/types.ts`,
  `src/features/${feature}/domain/rules/${feature}.rules.ts`,
  `src/features/${feature}/infrastructure/repositories/${feature}.repository.ts`,
  `src/features/${feature}/application/services/${feature}.service.ts`,
  `src/features/${feature}/routes/actions/${feature}.actions.ts`,
]).filter((relative) => {
  try {
    statSync(join(root, relative));
    return false;
  } catch {
    return true;
  }
});

const privateCrossFeatureImports = featureFiles.flatMap((file) => {
  const source = readFileSync(file, "utf8");
  const owner = featureNames.find((feature) => file.includes(`/src/features/${feature}/`));
  return featureNames
    .filter((feature) => feature !== owner)
    .flatMap((feature) => {
      const forbidden = new RegExp(`@/features/${feature}/(?!public-api|routes/)`);
      return forbidden.test(source) ? [file.replace(`${root}/`, "")] : [];
    });
});

const supabaseInUi = uiFiles.filter((file) => {
  const source = readFileSync(file, "utf8");
  return source.includes(".from(") || source.includes("createRequestSupabaseClient") || source.includes("@supabase/supabase-js");
});

if (missingRequiredFiles.length > 0) throw new Error(`Missing required Sprint 5 feature files: ${missingRequiredFiles.join(", ")}`);
if (privateCrossFeatureImports.length > 0) throw new Error(`Private cross-feature imports found: ${[...new Set(privateCrossFeatureImports)].join(", ")}`);
if (supabaseInUi.length > 0) throw new Error(`Supabase queries found in UI/app files: ${supabaseInUi.map((file) => file.replace(`${root}/`, "")).join(", ")}`);

console.log("Sprint 5 master data boundary verification passed.");
