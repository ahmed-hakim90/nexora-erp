import fs from "node:fs";
import path from "node:path";

const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

const errors = [];

function validatePlpgsqlFunction(file, functionSql, startLine) {
  const lines = functionSql.split("\n");
  let ifDepth = 0;
  let pendingIfLine = null;

  lines.forEach((line, index) => {
    const lineNumber = startLine + index;
    const normalized = line
      .replace(/--.*$/, "")
      .replace(/'([^']|'')*'/g, "''")
      .trim()
      .toLowerCase();

    const structuralLine = normalized.replace(
      /\bif\b[\s\S]*?\bthen\b[\s\S]*?end\s+if\s*;/g,
      "",
    );

    if (!structuralLine) return;

    if (pendingIfLine !== null) {
      if (/\bthen\b/.test(structuralLine)) {
        ifDepth += 1;
        pendingIfLine = null;
      }
      return;
    }

    if (/^end\s+if\b/.test(structuralLine)) {
      ifDepth -= 1;
      if (ifDepth < 0) {
        errors.push(`${file}:${lineNumber} has END IF without matching IF.`);
        ifDepth = 0;
      }
      return;
    }

    if (/^elsif\b/.test(structuralLine)) {
      if (ifDepth < 1) {
        errors.push(`${file}:${lineNumber} has ELSIF outside an IF block.`);
      }
      return;
    }

    if (/^if\b/.test(structuralLine) && !/\bthen\b/.test(structuralLine)) {
      pendingIfLine = lineNumber;
      return;
    }

    if (/^if\b[\s\S]*\bthen\b/.test(structuralLine)) {
      ifDepth += 1;
    }
  });

  if (pendingIfLine !== null) {
    errors.push(`${file}:${pendingIfLine} has IF without a THEN.`);
  }

  if (ifDepth !== 0) {
    errors.push(`${file}:${startLine} has an unbalanced IF block depth of ${ifDepth}.`);
  }
}

for (const file of migrationFiles) {
  const fullPath = path.join(migrationsDir, file);
  const sql = fs.readFileSync(fullPath, "utf8");
  const lines = sql.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    if (!/create\s+or\s+replace\s+function/i.test(lines[index])) continue;

    const functionStart = index;
    let bodyEnd = -1;

    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      if (/^\s*\$\$;\s*$/.test(lines[cursor])) {
        bodyEnd = cursor;
        break;
      }
    }

    if (bodyEnd === -1) {
      errors.push(`${file}:${functionStart + 1} function body is missing closing $$;.`);
      continue;
    }

    validatePlpgsqlFunction(
      file,
      lines.slice(functionStart, bodyEnd + 1).join("\n"),
      functionStart + 1,
    );

    index = bodyEnd;
  }
}

if (errors.length > 0) {
  console.error("Migration validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Validated ${migrationFiles.length} Supabase migration files.`);
