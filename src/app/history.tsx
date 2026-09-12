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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getHistory } from '../storage/taskStorage';
import type { HistoryItem } from '../storage/taskStorage';

type HistorySection = {
  title: string;
  data: HistoryItem[];
};

const priorityColors = {
  high: '#9B2C2C',
  medium: '#8A6A2F',
  low: '#2F6F6A',
};

export default function HistoryScreen() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const insets = useSafeAreaInsets();

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

    const date = new Date(task.completedAt).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    
    const tasksForDate = groups.get(date) ?? [];

    tasksForDate.push(task);
    groups.set(date, tasksForDate);
  }

  const sections: HistorySection[] = Array.from(
    groups,
    ([title, data]) => ({ title, data })
  );

  const todayStr = new Date().toDateString();

  const completedToday = history.filter(
    task =>
      task.completedAt &&
      new Date(task.completedAt).toDateString() === todayStr
  ).length;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{completedToday}</Text>
          <Text style={styles.statLabel}>Completed today</Text>
        </View>
        
        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{history.length}</Text>
          <Text style={styles.statLabel}>Total completed</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#1F3A5F"
          style={styles.loader}
        />
      ) : (
        <SectionList<HistoryItem, HistorySection>
          sections={sections}
          keyExtractor={item => item.id}
          refreshing={refreshing}
          onRefresh={onRefresh}
          stickySectionHeadersEnabled={true}
          contentContainerStyle={styles.list}
          renderSectionHeader={({ section }) => (
            <View style={styles.dateHeaderContainer}>
              <Text style={styles.dateHeading}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View
              style={[
                styles.taskCard,
                { borderLeftColor: priorityColors[item.priority] },
              ]}
            >
              <View style={styles.taskHeader}>
                <Text style={styles.taskTitle}>{item.title}</Text>
                <Text style={styles.completedTime}>
                  {item.completedAt
                    ? new Date(item.completedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''}
                </Text>
              </View>

              {item.description ? (
                <Text style={styles.description} numberOfLines={1}>
                  {item.description}
                </Text>
              ) : null}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No completed tasks</Text>
              <Text style={styles.emptyText}>
                Complete tasks on the home screen to see them here.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F4F1EA' 
  },
  statsContainer: { 
    flexDirection: 'row', 
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E2E8F0',
  },
  statNumber: { 
    fontSize: 28, 
    fontWeight: '600', 
    color: '#1C2430' 
  },
  statLabel: {
    fontSize: 13,
    color: '#5C6773',
    marginTop: 4,
  },
  loader: { 
    marginTop: 40 
  },
  list: { 
    paddingHorizontal: 16, 
    paddingBottom: 32 
  },
  dateHeaderContainer: {
    backgroundColor: '#F4F1EA',
    paddingVertical: 12,
  },
  dateHeading: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5C6773',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderLeftWidth: 3,
    padding: 16,
    marginBottom: 10,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  taskTitle: { 
    fontSize: 15, 
    fontWeight: '500', 
    color: '#1C2430',
    flex: 1,
    lineHeight: 22,
    marginRight: 12,
  },
  description: { 
    fontSize: 14, 
    color: '#5C6773',
    lineHeight: 20,
  },
  completedTime: { 
    fontSize: 13, 
    color: '#5C6773' 
  },
  emptyState: { 
    alignItems: 'center', 
    padding: 24, 
    marginTop: 40 
  },
  emptyTitle: { 
    fontSize: 16, 
    fontWeight: '500', 
    color: '#1C2430' 
  },
  emptyText: {
    fontSize: 14,
    color: '#5C6773',
    textAlign: 'center',
    marginTop: 8,
  },
});