import { CATEGORY_CHIP } from "../components/variants/types";

/** Maps study-library section labels to source-pill category chips. */
export const LIBRARY_CATEGORY_TO_CHIP: Record<string, string> = {
  Figures: "TLF",
  Listings: "Data",
};

export function libraryCategoryAccent(libraryCategory: string): string {
  const chipKey = LIBRARY_CATEGORY_TO_CHIP[libraryCategory] ?? libraryCategory;
  return CATEGORY_CHIP[chipKey]?.accent ?? CATEGORY_CHIP.Document.accent;
}
