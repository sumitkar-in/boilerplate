// Shared shapes for saved queries and charts — kept separate from either
// entity file so neither has to import the other.
export type BpqlWhereClause = {
  field: string;
  operator: string;
  value?: string;
};
