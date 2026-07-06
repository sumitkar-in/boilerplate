import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { {{FeatureName}}Screen } from './screens/{{FeatureName}}Screen';

// This module's own stack, lazy-loaded by
// apps/mobile/src/core/module-loader.ts — only fetched once the tenant has
// "{{featureKey}}" enabled. See: skills/frontend-module/SKILL.md
const Stack = createNativeStackNavigator();

export default function {{FeatureName}}Navigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="{{FeatureName}}" component={ {{FeatureName}}Screen } />
    </Stack.Navigator>
  );
}
