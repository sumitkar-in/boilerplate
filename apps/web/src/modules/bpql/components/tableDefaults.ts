import type { BpqlTableInput } from '../api';

export const EMPTY_TABLE: BpqlTableInput = {
  name: '',
  slug: '',
  description: '',
  fields: [{ key: 'name', label: 'Name', type: 'text', required: true }],
};
