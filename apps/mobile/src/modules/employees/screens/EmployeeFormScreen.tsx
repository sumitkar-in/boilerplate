import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createEmployee, updateEmployee, type Employee } from '../api';

type EmployeesStackParamList = {
  Employees: undefined;
  EmployeeForm: { employee?: Employee };
};

export function EmployeeFormScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<EmployeesStackParamList>>();
  const route = useRoute<RouteProp<EmployeesStackParamList, 'EmployeeForm'>>();
  const editingEmployee = route.params?.employee;

  const [name, setName] = useState(editingEmployee?.name ?? '');
  const [phone, setPhone] = useState(editingEmployee?.phone ?? '');
  const [email, setEmail] = useState(editingEmployee?.email ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !phone.trim() || !email.trim()) {
      setError('Name, phone, and email are required.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, { name, phone, email });
      } else {
        await createEmployee({ name, phone, email });
      }
      navigation.goBack();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save employee');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Jane Doe" placeholderTextColor="#94a3b8" />

      <Text style={styles.label}>Phone</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="+1 (555) 000-0000"
        placeholderTextColor="#94a3b8"
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="jane@example.com"
        placeholderTextColor="#94a3b8"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TouchableOpacity style={styles.saveBtn} onPress={() => void handleSave()} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{editingEmployee ? 'Save Changes' : 'Create Employee'}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#0f172a', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 12,
    fontSize: 14,
    color: '#0f172a',
  },
  saveBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  saveText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  error: { color: '#ef4444', marginBottom: 12 },
});
