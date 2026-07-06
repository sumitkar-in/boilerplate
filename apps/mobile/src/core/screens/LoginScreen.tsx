import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTenant } from '@boilerplate/ui-common';
import { apiGetTenantBranding } from '../api-client';
import type { TenantBranding } from '../api-client';

export function LoginScreen() {
  const { login } = useTenant();
  const [tenantSlug, setTenantSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState<TenantBranding | null>(null);

  useEffect(() => {
    const slug = tenantSlug.trim();
    if (!slug) {
      setBranding(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void apiGetTenantBranding(slug).then((result) => {
        if (!cancelled) setBranding(result);
      });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [tenantSlug]);

  const handleLogin = async () => {
    if (!tenantSlug || !email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(tenantSlug.trim().toLowerCase(), email.trim(), password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {branding?.logoUrl ? (
          <Image
            source={{ uri: branding.logoUrl }}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel={branding.companyName ?? 'Company logo'}
          />
        ) : null}
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>
          {branding?.companyName ? `Sign in to ${branding.companyName}` : 'Sign in to your tenant account'}
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>Tenant Slug</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. acme"
          autoCapitalize="none"
          value={tenantSlug}
          onChangeText={setTenantSlug}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
  },
  logo: {
    height: 48,
    width: '100%',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    color: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    fontSize: 14,
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  error: {
    color: '#f87171',
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 14,
  },
});
