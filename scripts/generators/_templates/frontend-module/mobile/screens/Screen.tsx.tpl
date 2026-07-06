import { StyleSheet, Text, View } from 'react-native';

// This module's own screen — feature-specific UI lives in
// modules/{{featureKey}}/components/, not in packages/ui-common (that's
// web-only for visual components — React Native can't render DOM
// components). See: skills/frontend-module/SKILL.md
export function {{FeatureName}}Screen() {
  return (
    <View style={styles.container}>
      <Text>{{FeatureLabel}}</Text>
      {/* TODO: build the {{featureKey}} module's UI here */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
