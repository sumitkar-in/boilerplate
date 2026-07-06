// Shared between apps/api (list-query.builder.ts) and the frontend
// (@boilerplate/ui-common's AdvancedDataTable + toListFilters helper).
// AdvancedDataTable's "select specific values" column filter menu sends
// its chosen values as a single string joined with this separator, using
// the internal-only "in" ListFilterOperator (see list-query.dto.ts).
export const LIST_FILTER_IN_SEPARATOR = '';
