import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getHistory } from '../storage/taskStorage';
import type { HistoryItem } from '../storage/taskStorage';

type HistorySection = {
  title: string;
  data: HistoryItem[];
};

const priorityColors = {
  high: '#B42318',
  medium: '#855900',
  low: '#237A38',
};

export default function HistoryScreen() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Reload history each time this screen gains focus.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadHistory = async () => {
        try {
          const tasks = await getHistory();

          if (active) {
            setHistory(tasks);
          }
        } catch {
          if (active) {
            Alert.alert('Error', 'Could not load task history.');
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

      void loadHistory();

      return () => {
        active = false;
      };
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);

    try {
      setHistory(await getHistory());
    } catch {
      Alert.alert('Error', 'Could not refresh task history.');
    } finally {
      setRefreshing(false);
    }
  };

  // getHistory returns tasks with the most recent completion first.
  const groups = new Map<string, HistoryItem[]>();

  for (const task of history) {
    if (!task.completedAt) continue;

    const date = new Date(task.completedAt).toDateString();
    const tasksForDate = groups.get(date) ?? [];

    tasksForDate.push(task);
    groups.set(date, tasksForDate);
  }

  const sections: HistorySection[] = Array.from(
    groups,
    ([title, data]) => ({ title, data })
  );

  const today = new Date().toDateString();

  const completedToday = history.filter(
    task =>
      task.completedAt &&
      new Date(task.completedAt).toDateString() === today
  ).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Task History</Text>
        <Text style={styles.subtitle}>Your completed tasks</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{completedToday}</Text>
          <Text style={styles.statLabel}>Completed today</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{history.length}</Text>
          <Text style={styles.statLabel}>Total completed</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#6C63FF"
          style={styles.loader}
        />
      ) : (
        <SectionList<HistoryItem, HistorySection>
          sections={sections}
          keyExtractor={item => item.id}
          refreshing={refreshing}
          onRefresh={onRefresh}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.list}
          renderSectionHeader={({ section }) => (
            <Text style={styles.dateHeading}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <View
              style={[
                styles.taskCard,
                { borderLeftColor: priorityColors[item.priority] },
              ]}
            >
              <Text style={styles.taskTitle}>{item.title}</Text>

              {item.description ? (
                <Text style={styles.description}>
                  {item.description}
                </Text>
              ) : null}

              <Text style={styles.meta}>
                {item.category} • {item.priority} priority
              </Text>

              <Text style={styles.completedTime}>
                Completed at{' '}
                {item.completedAt
                  ? new Date(item.completedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Unknown time'}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No completed tasks yet</Text>
              <Text style={styles.emptyText}>
                Mark a task as Done on the home screen to see it here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { padding: 20, backgroundColor: '#6C63FF' },
  heading: { fontSize: 26, fontWeight: 'bold', color: '#FFF' },
  subtitle: { fontSize: 14, color: '#FFF', marginTop: 6 },
  statsRow: { flexDirection: 'row', padding: 16, gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: '#6C63FF' },
  statLabel: {
    fontSize: 13,
    color: '#555',
    marginTop: 4,
    textAlign: 'center',
  },
  loader: { marginTop: 40 },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  dateHeading: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    paddingVertical: 12,
  },
  taskCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderLeftWidth: 4,
    padding: 16,
    marginBottom: 10,
  },
  taskTitle: { fontSize: 17, fontWeight: '600', color: '#222' },
  description: { fontSize: 14, color: '#555', marginTop: 6 },
  meta: { fontSize: 13, color: '#555', marginTop: 8 },
  completedTime: { fontSize: 12, color: '#666', marginTop: 6 },
  emptyState: { alignItems: 'center', padding: 24, marginTop: 40 },
  emptyTitle: { fontSize: 19, fontWeight: '600', color: '#333' },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
});