import { categories, brands, fragranceFamilies, collections } from "@/db/schema";

export const TAXONOMY_TABLES = {
  categories,
  brands,
  families: fragranceFamilies,
  collections,
} as const;

export type TaxonomyType = keyof typeof TAXONOMY_TABLES;

export function isTaxonomyType(t: string): t is TaxonomyType {
  return t in TAXONOMY_TABLES;
}
