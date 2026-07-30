/**
 * One-off local script — creates 3 test users and inserts their brand
 * profiles directly from the day 2 fixtures, bypassing extraction and the
 * questionnaire entirely. Uses the Supabase service role key, which
 * bypasses Row Level Security — this must only ever run locally, never be
 * imported into the app, and the key must never be committed to git.
 *
 * Run: npx tsx scripts/seed-test-brands.ts
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SEED_PASSWORD = process.env.SEED_PASSWORD;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment."
  );
  process.exit(1);
}

if (!SEED_PASSWORD) {
  console.error("Missing SEED_PASSWORD in the environment — set it before running this script.");
  process.exit(1);
}

const password: string = SEED_PASSWORD;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SEEDS = [
  { email: "tanishveer786+examprep@gmail.com", fixture: "exam-prep-centre.json" },
  { email: "tanishveer786+coding@gmail.com", fixture: "coding-centre.json" },
  { email: "tanishveer786+language@gmail.com", fixture: "language-centre.json" },
];

function loadFixture(filename: string) {
  const raw = readFileSync(join(rootDir, "fixtures", filename), "utf-8");
  return JSON.parse(raw);
}

async function main() {
  const created: { email: string; password: string }[] = [];

  for (const seed of SEEDS) {
    const profile = loadFixture(seed.fixture);

    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: seed.email,
      password,
      email_confirm: true,
    });

    if (userError || !userData.user) {
      console.error(`✗ Failed to create ${seed.email}: ${userError?.message ?? "unknown error"}`);
      continue;
    }

    const { error: profileError } = await supabase.from("brand_profiles").insert({
      user_id: userData.user.id,
      business_name: profile.business_name,
      vertical: profile.vertical,
      tone_descriptors: profile.tone_descriptors,
      target_audience: profile.target_audience,
      value_props: profile.value_props,
      keywords: profile.keywords,
      example_phrases: profile.example_phrases,
      source: profile.source,
    });

    if (profileError) {
      console.error(
        `✗ Created user ${seed.email} but failed to insert brand profile: ${profileError.message}`
      );
      continue;
    }

    console.log(`✓ ${seed.email} — ${profile.business_name}`);
    created.push({ email: seed.email, password });
  }

  if (created.length === 0) {
    console.log("\nNo accounts created.");
    return;
  }

  console.log("\nLog in at /login with:");
  for (const c of created) {
    console.log(`  ${c.email}  /  ${c.password}`);
  }
}

main();
