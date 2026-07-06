import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTenant } from '@boilerplate/ui-common';
import { getEnabledModules } from '../module-loader';
import { LoginScreen } from '../screens/LoginScreen';

const Stack = createNativeStackNavigator();

function EmptyShellScreen() {
  const { user, tenantSlug, logout } = useTenant();
  return (
    <View style={styles.center}>
      <Text style={styles.heading}>Welcome, {user?.fullName || user?.email}</Text>
      <Text style={styles.sub}>Active Tenant: {tenantSlug}</Text>
      <Text style={styles.note}>No mobile feature modules enabled for this tenant.</Text>
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

export function AppNavigator() {
  const { status, enabledFeatureKeys, logout } = useTenant();

  const enabledModules = useMemo(() => getEnabledModules(enabledFeatureKeys), [enabledFeatureKeys]);

  if (status === 'loading') {
    return (
      <View style={styles.centerDark}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (status !== 'authenticated') {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1e293b' },
        headerTintColor: '#ffffff',
        headerRight: () => (
          <TouchableOpacity onPress={logout} style={{ paddingHorizontal: 12 }}>
            <Text style={{ color: '#f87171', fontWeight: '600' }}>Logout</Text>
          </TouchableOpacity>
        ),
      }}
    >
      {enabledModules.length === 0 ? (
        <Stack.Screen name="Dashboard" component={EmptyShellScreen} />
      ) : (
        enabledModules.map((mod) => {
          // React Navigation requires a synchronous Component component or lazy wrapper
          const LazyComponent = React.lazy(mod.load);
          const SuspenseWrapper = () => (
            <React.Suspense fallback={<View style={styles.center}><ActivityIndicator /></View>}>
              <LazyComponent />
            </React.Suspense>
          );
          return (
            <Stack.Screen
              key={mod.key}
              name={mod.key.charAt(0).toUpperCase() + mod.key.slice(1)}
              component={SuspenseWrapper}
            />
          );
        })
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  centerDark: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 6,
  },
  sub: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 16,
  },
  note: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 24,
    textAlign: 'center',
  },
  logoutBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  logoutText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
