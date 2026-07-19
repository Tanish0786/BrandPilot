/**
 * Mirrors schema/brandProfile.schema.json exactly. Keep the two in sync —
 * if you change one, change the other.
 */
export type BrandProfileSource = "url" | "questionnaire";

export interface BrandProfile {
  business_name: string;
  vertical: string;
  tone_descriptors: string[];
  target_audience: string;
  value_props: string[];
  keywords: string[];
  example_phrases: string[];
  source: BrandProfileSource;
}
