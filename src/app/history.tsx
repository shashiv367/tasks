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
import { Ionicons } from '@expo/vector-icons';

import { getHistory } from '../storage/taskStorage';
import type { HistoryItem } from '../storage/taskStorage';
import { BottomTabBar } from '@/components/BottomTabBar';
import { darkAlert } from '@/components/DarkAlert';

type HistorySection = {
  title: string;
  data: HistoryItem[];
};

const PRIORITY_DOT: Record<string, string> = {
  high: '#EF4444',
  medium: '#EAB308',
  low: '#22C55E',
};

export default function HistoryScreen() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const insets = useSafeAreaInsets();

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
            darkAlert('Error', 'Could not load task history.');
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
      darkAlert('Error', 'Could not refresh task history.');
    } finally {
      setRefreshing(false);
    }
  };

  const groups = new Map<string, HistoryItem[]>();

  for (const task of history) {
    if (!task.completedAt) continue;

    const date = new Date(task.completedAt).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
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
    <View style={styles.container}>
      {/* Stats Header */}
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
          color="#3B82F6"
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
            <View style={styles.dateHeaderContainer}>
              <Ionicons name="calendar-outline" size={14} color="#3B82F6" style={{ marginRight: 6 }} />
              <Text style={styles.dateHeading}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const dot = PRIORITY_DOT[item.priority] ?? '#8E95A5';
            return (
              <View style={styles.taskCard}>
                <View style={styles.taskCardContent}>
                  <View style={styles.checkBadge}>
                    <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
                  </View>

                  <View style={styles.taskMeta}>
                    <Text style={styles.taskTitle}>{item.title}</Text>

                    {item.description ? (
                      <Text style={styles.description} numberOfLines={1}>
                        {item.description}
                      </Text>
                    ) : null}

                    <View style={styles.cardFooterRow}>
                      <View style={styles.priorityBadge}>
                        <View style={[styles.priorityDot, { backgroundColor: dot }]} />
                        <Text style={[styles.priorityBadgeText, { color: dot }]}>
                          {item.priority}
                        </Text>
                      </View>

                      <Text style={styles.completedTime}>
                        {item.completedAt
                          ? new Date(item.completedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-done-circle-outline" size={48} color="#64748B" />
              <Text style={styles.emptyTitle}>No completed tasks</Text>
              <Text style={styles.emptyText}>
                Complete tasks on the home screen to see them here.
              </Text>
            </View>
          }
        />
      )}

      {/* Reusable Bottom Tab Bar */}
      <BottomTabBar activeTab="history" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingVertical: 18,
    paddingHorizontal: 20,
    backgroundColor: '#12151C',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E2430',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#242A38',
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#8E95A5',
    marginTop: 4,
    fontWeight: '500',
  },
  loader: {
    marginTop: 60,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  dateHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingTop: 16,
  },
  dateHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8E95A5',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  taskCard: {
    backgroundColor: '#12151C',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1E2430',
  },
  taskCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkBadge: {
    marginTop: 2,
  },
  taskMeta: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  description: {
    fontSize: 13,
    color: '#8E95A5',
    lineHeight: 18,
    marginTop: 4,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  completedTime: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    padding: 30,
    marginTop: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
});