export type FeatureDefinition = {
  key: string;
  label: string;
  defaultEnabled: boolean;
};

export const DEMO_FEATURE_KEYS = ['notes', 'departments', 'employees'] as const;
export type DemoFeatureKey = (typeof DEMO_FEATURE_KEYS)[number];
