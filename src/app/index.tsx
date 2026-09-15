import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getTodayTasks,
  getUpcomingTasks,
  getAllPendingTasks,
  completeTask,
  deleteTask,
  Task,
} from '../storage/taskStorage';
import {
  requestPermission,
  checkPermissions,
  isExpoGo,
  notificationsSupported,
} from '../notifications/notificationHelper';

type ViewFilter = 'today' | 'upcoming' | 'all';
type PriorityFilter = 'all' | 'high' | 'medium' | 'low';

export default function HomeScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [remindersOn, setRemindersOn] = useState<boolean>(false);
  
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const checkPermissions = async () => {
      if (notificationsSupported && !isExpoGo) {
        const granted = await requestPermission(true);
        setRemindersOn(granted);
      }
    };
    void checkPermissions();
  }, []);

  const loadTasks = async (selectedView = viewFilter) => {
    let loadedTasks: Task[] = [];

    if (selectedView === 'today') {
      loadedTasks = await getTodayTasks();
    } else if (selectedView === 'upcoming') {
      loadedTasks = await getUpcomingTasks();
    } else {
      loadedTasks = await getAllPendingTasks();
    }

    setTasks(loadedTasks);
  };

  useFocusEffect(
    useCallback(() => {
      void loadTasks();
      
      if (notificationsSupported && !isExpoGo) {
        checkPermissions().then(granted => {
          setRemindersOn(granted);
        });
      }
    }, [viewFilter])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  const handleComplete = async (task: Task) => {
    if (completingId) return;

    setCompletingId(task.id);

    try {
      await completeTask(task.id);
      await loadTasks();
    } finally {
      setCompletingId(null);
    }
  };

  const handleDelete = async (task: Task) => {
    await deleteTask(task.id);
    await loadTasks();
  };

  const filteredTasks =
    priorityFilter === 'all'
      ? tasks
      : tasks.filter(task => task.priority === priorityFilter);

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const order = { high: 1, medium: 2, low: 3 };
    return order[a.priority] - order[b.priority];
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#9B2C2C';
      case 'medium':
        return '#8A6A2F';
      case 'low':
        return '#2F6F6A';
      default:
        return '#5C6773';
    }
  };

  const renderTask = ({ item }: { item: Task }) => (
    <View
      style={[
        styles.taskCard,
        { borderLeftColor: getPriorityColor(item.priority) },
      ]}
    >
      <View style={styles.taskHeader}>
        <Text style={styles.taskTitle}>{item.title}</Text>
        <Text style={[styles.priorityLabel, { color: getPriorityColor(item.priority) }]}>
          {item.priority === 'high' ? 'High' : item.priority === 'medium' ? 'Med' : 'Low'}
        </Text>
      </View>

      {item.description ? (
        <Text style={styles.taskDesc} numberOfLines={1}>{item.description}</Text>
      ) : null}

      <Text style={styles.timeText}>
        {new Date(item.reminderTime).toDateString()} •{' '}
        {new Date(item.reminderTime).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
        {item.repeatType === 'daily' ? ' (Daily)' : ''}
      </Text>

      <View style={styles.taskActions}>
        <TouchableOpacity
          style={[styles.actionBtn, completingId === item.id && { opacity: 0.6 }]}
          onPress={() => handleComplete(item)}
          disabled={completingId === item.id}
        >
          <Text style={styles.completeText}>
            {completingId === item.id ? 'Completing...' : 'Complete'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleDelete(item)}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerTitle}>Tasks</Text>
            <Text style={styles.headerDate}>{new Date().toDateString()}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => router.push('/notes')} style={styles.headerBtn}>
              <Text style={styles.headerBtnText}>Notes</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/history')} style={styles.headerBtn}>
              <Text style={styles.headerBtnText}>History</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/add-task')} style={styles.headerBtn}>
              <Text style={styles.headerBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
        {!isExpoGo && (
          <Text style={styles.reminderStatus}>
            Reminders: {remindersOn ? 'on' : 'off'}
          </Text>
        )}
      </View>

      <View style={styles.filtersContainer}>
        <View style={styles.viewFilters}>
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'today', label: 'Today' },
              { id: 'upcoming', label: 'Upcoming' },
            ] as const
          ).map(item => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.viewFilterBtn,
                viewFilter === item.id && styles.activeViewFilter,
              ]}
              onPress={() => setViewFilter(item.id)}
            >
              <Text
                style={[
                  styles.viewFilterText,
                  viewFilter === item.id && styles.activeViewFilterText,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.priorityFilters}>
          {(['all', 'high', 'medium', 'low'] as const).map(item => (
            <TouchableOpacity
              key={item}
              style={[
                styles.priorityFilterBtn,
                priorityFilter === item && styles.activePriorityFilter,
              ]}
              onPress={() => setPriorityFilter(item)}
            >
              <Text
                style={[
                  styles.priorityFilterText,
                  priorityFilter === item && styles.activePriorityFilterText,
                ]}
              >
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.statsRow}>
        <Text style={styles.statsText}>
          {sortedTasks.length} open task{sortedTasks.length === 1 ? '' : 's'}
        </Text>
      </View>

      <FlatList
        data={sortedTasks}
        renderItem={renderTask}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1F3A5F" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tasks yet. Add one when you're ready.</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1EA',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#1F3A5F',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerDate: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  headerBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  headerBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  reminderStatus: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 8,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: '#F4F1EA',
  },
  viewFilters: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
  },
  viewFilterBtn: {
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeViewFilter: {
    borderBottomColor: '#1F3A5F',
  },
  viewFilterText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#5C6773',
  },
  activeViewFilterText: {
    color: '#1C2430',
  },
  priorityFilters: {
    flexDirection: 'row',
    gap: 16,
  },
  priorityFilterBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#EBE9E2',
  },
  activePriorityFilter: {
    backgroundColor: '#1C2430',
  },
  priorityFilterText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#5C6773',
  },
  activePriorityFilterText: {
    color: '#FFFFFF',
  },
  statsRow: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  statsText: {
    fontSize: 13,
    color: '#5C6773',
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    marginBottom: 12,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C2430',
    flex: 1,
    lineHeight: 22,
  },
  priorityLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  taskDesc: {
    fontSize: 15,
    color: '#5C6773',
    marginBottom: 8,
    lineHeight: 22,
  },
  timeText: {
    fontSize: 13,
    color: '#5C6773',
    marginTop: 4,
    marginBottom: 12,
  },
  taskActions: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F4F1EA',
  },
  actionBtn: {
    paddingVertical: 6,
    paddingRight: 12,
  },
  completeText: {
    color: '#2F6F6A',
    fontWeight: '600',
    fontSize: 14,
  },
  deleteText: {
    color: '#9B2C2C',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#5C6773',
    textAlign: 'center',
  },
});