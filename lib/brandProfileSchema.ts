import { z } from "zod";
import type { BrandProfile } from "@/types/brandProfile";

/**
 * Mirrors schema/brandProfile.schema.json and types/brandProfile.ts exactly.
 * Keep all three in sync — this is the runtime validator for anything
 * (LLM output, questionnaire input) claiming to be a BrandProfile.
 */
export const brandProfileSchema = z.object({
  business_name: z.string().min(1),
  vertical: z.string().min(1),
  tone_descriptors: z.array(z.string().min(1)).min(3).max(5),
  target_audience: z.string().min(1),
  value_props: z.array(z.string().min(1)).min(1),
  keywords: z.array(z.string().min(1)).min(5).max(10),
  example_phrases: z.array(z.string().min(1)).min(1).max(3),
  source: z.enum(["url", "questionnaire"]),
});

// Compile-time check that this schema's inferred type matches BrandProfile exactly.
type _AssertMatches = [BrandProfile] extends [z.infer<typeof brandProfileSchema>]
  ? [z.infer<typeof brandProfileSchema>] extends [BrandProfile]
    ? true
    : never
  : never;
const _typeCheck: _AssertMatches = true;
void _typeCheck;
