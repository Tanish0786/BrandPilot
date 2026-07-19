import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const schemaPath = join(rootDir, "schema", "brandProfile.schema.json");
const fixturesDir = join(rootDir, "fixtures");

const schema = JSON.parse(readFileSync(schemaPath, "utf-8"));
const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

const fixtureFiles = readdirSync(fixturesDir).filter((f) => f.endsWith(".json"));

let hasErrors = false;

for (const file of fixtureFiles) {
  const data = JSON.parse(readFileSync(join(fixturesDir, file), "utf-8"));
  const valid = validate(data);

  if (valid) {
    console.log(`✓ ${file}`);
  } else {
    hasErrors = true;
    console.error(`✗ ${file}`);
    for (const err of validate.errors) {
      console.error(`    ${err.instancePath || "(root)"} ${err.message}`);
    }
  }
}

if (hasErrors) {
  process.exit(1);
}
