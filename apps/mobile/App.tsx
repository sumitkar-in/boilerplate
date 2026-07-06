import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TenantProvider } from './src/core/TenantProvider';
import { AppNavigator } from './src/core/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <TenantProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <AppNavigator />
        </NavigationContainer>
      </TenantProvider>
    </SafeAreaProvider>
  );
}
