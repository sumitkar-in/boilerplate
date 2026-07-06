import { useTenant } from './tenant-context';

/** True once the current tenant has `key` enabled — see skills/feature-flags/SKILL.md. */
export function useFeatureFlag(key: string): boolean {
  return useTenant().enabledFeatureKeys.has(key);
}
