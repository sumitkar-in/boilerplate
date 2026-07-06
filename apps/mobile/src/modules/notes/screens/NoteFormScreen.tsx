import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createNote, updateNote, type Note } from '../api';

type NotesStackParamList = {
  Notes: undefined;
  NoteForm: { note?: Note };
};

export function NoteFormScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<NotesStackParamList>>();
  const route = useRoute<RouteProp<NotesStackParamList, 'NoteForm'>>();
  const editingNote = route.params?.note;

  const [title, setTitle] = useState(editingNote?.title ?? '');
  const [content, setContent] = useState(editingNote?.content ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      if (editingNote) {
        await updateNote(editingNote.id, { title, content });
      } else {
        await createNote({ title, content });
      }
      navigation.goBack();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Note title"
        placeholderTextColor="#94a3b8"
      />

      <Text style={styles.label}>Content</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        value={content}
        onChangeText={setContent}
        placeholder="Write your note here…"
        placeholderTextColor="#94a3b8"
        multiline
        numberOfLines={6}
      />

      <TouchableOpacity style={styles.saveBtn} onPress={() => void handleSave()} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{editingNote ? 'Save Changes' : 'Create Note'}</Text>}
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
  textarea: { minHeight: 120, textAlignVertical: 'top' },
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
