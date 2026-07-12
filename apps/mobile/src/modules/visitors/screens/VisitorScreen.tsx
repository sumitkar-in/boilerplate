import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { listVisitors, deleteVisitor, updateVisitor, type Visitor } from '../api';

export function VisitorScreen() {
  const [items, setItems] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listVisitors();
      setItems(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load visitors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteVisitor(id);
      void loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleExit = async (id: string) => {
    try {
      await updateVisitor(id, { exitTime: new Date().toISOString() });
      void loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to mark exit');
    }
  };

  if (loading && items.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={loadData}
        ListEmptyComponent={<Text style={styles.empty}>No visitors found.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{String(item.name)}</Text>
              {item.exitTime ? (
                <Text>Exit: {String(item.exitTime)}</Text>
              ) : (
                <TouchableOpacity onPress={() => void handleExit(item.id)} style={[styles.deleteBtn, { backgroundColor: '#3b82f6', alignSelf: 'flex-start', marginTop: 4 }]}>
                  <Text style={styles.deleteText}>Mark Exit</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={() => void handleDelete(item.id)} style={styles.deleteBtn}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  itemTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  deleteBtn: { backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  deleteText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  error: { color: '#ef4444', marginBottom: 12 },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 32 },
});
