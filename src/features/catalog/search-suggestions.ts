export const SEARCH_QUERY_LIMIT = 120;
export const SEARCH_SUGGESTION_LIMIT = 6;
export function normalizeSuggestionQuery(value: string) {
  return value.normalize('NFKC').replace(/\s+/gu, ' ').trim().slice(0, SEARCH_QUERY_LIMIT);
}
export type SearchSuggestion = { id: string; slug: string; name: string; image: string; price: number; available: boolean };
