import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getTodayTasks,
  getUpcomingTasks,
  getAllPendingTasks,
  completeTask,
  deleteTask,
  Task,
} from '../storage/taskStorage';
import { cancelNotification } from '../notifications/notificationHelper';

type ViewFilter = 'today' | 'upcoming' | 'all';
type PriorityFilter = 'all' | 'high' | 'medium' | 'low';

export default function HomeScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [completingId, setCompletingId] = useState<string | null>(null);

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
      if (task.repeatType === 'once') {
        await cancelNotification(task.notificationId);
      }

      await completeTask(task.id);
      await loadTasks();
    } finally {
      setCompletingId(null);
    }
  };

  const handleDelete = async (task: Task) => {
    await cancelNotification(task.notificationId);
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
        return '#B42318';
      case 'medium':
        return '#855900';
      case 'low':
        return '#237A38';
      default:
        return '#555';
    }
  };

  const getCategoryEmoji = (category: string) => {
    const emojis: Record<string, string> = {
      health: '💊',
      work: '💼',
      shopping: '🛒',
      personal: '🏠',
      habits: '⭐',
      future: '📅',
    };

    return emojis[category] || '📌';
  };

  const renderTask = ({ item }: { item: Task }) => (
    <View
      style={[
        styles.taskCard,
        { borderLeftColor: getPriorityColor(item.priority) },
      ]}
    >
      <View style={styles.taskHeader}>
        <Text style={styles.categoryEmoji}>
          {getCategoryEmoji(item.category)}
        </Text>

        <View
          style={[
            styles.priorityBadge,
            { backgroundColor: getPriorityColor(item.priority) },
          ]}
        >
          <Text style={styles.priorityText}>
            {item.priority.toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={styles.taskTitle}>{item.title}</Text>

      {item.description ? (
        <Text style={styles.taskDesc}>{item.description}</Text>
      ) : null}

      <Text style={styles.timeText}>
        📅 {new Date(item.reminderTime).toDateString()}
      </Text>

      <Text style={styles.timeText}>
        ⏰{' '}
        {new Date(item.reminderTime).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
        {item.repeatType === 'daily' ? '  |  Daily' : ''}
      </Text>

      <View style={styles.taskActions}>
        <TouchableOpacity
          style={[
            styles.completeBtn,
            completingId === item.id && { opacity: 0.6 },
          ]}
          onPress={() => handleComplete(item)}
          disabled={completingId === item.id}
        >
          <Text style={styles.btnText}>
            {completingId === item.id ? 'Saving…' : '✅ Done'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDelete(item)}
        >
          <Text style={styles.btnText}>🗑️ Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📋 My Tasks</Text>
        <Text style={styles.headerDate}>{new Date().toDateString()}</Text>
      </View>

      <View style={styles.topButtons}>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => router.push('/history')}
        >
          <Text style={styles.historyButtonText}>📊 History</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addTopButton}
          onPress={() => router.push('/add-task')}
        >
          <Text style={styles.addTopButtonText}>➕ Add Task</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {(
          [
            { id: 'all', label: 'ALL' },
            { id: 'today', label: 'TODAY' },
            { id: 'upcoming', label: 'UPCOMING' },
          ] as const
        ).map(item => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.filterBtn,
              viewFilter === item.id && styles.activeFilter,
            ]}
            onPress={() => setViewFilter(item.id)}
          >
            <Text
              style={[
                styles.filterText,
                viewFilter === item.id && styles.activeFilterText,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.filterRow}>
        {(['all', 'high', 'medium', 'low'] as const).map(item => (
          <TouchableOpacity
            key={item}
            style={[
              styles.filterBtn,
              priorityFilter === item && styles.activeFilter,
            ]}
            onPress={() => setPriorityFilter(item)}
          >
            <Text
              style={[
                styles.filterText,
                priorityFilter === item && styles.activeFilterText,
              ]}
            >
              {item.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.statsRow}>
        <Text style={styles.statsText}>
          Showing {sortedTasks.length} task
          {sortedTasks.length === 1 ? '' : 's'}
        </Text>
      </View>

      <FlatList
        data={sortedTasks}
        renderItem={renderTask}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tasks here yet</Text>
            <Text style={styles.emptySubText}>
              Tap All, or add a new task. History only shows tasks after you tap Done.
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      <TouchableOpacity
        style={styles.floatingAddButton}
        onPress={() => router.push('/add-task')}
      >
        <Text style={styles.floatingAddButtonText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 20,
    backgroundColor: '#6C63FF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerDate: {
    fontSize: 14,
    color: '#EEE',
    marginTop: 4,
  },
  topButtons: {
    flexDirection: 'row',
    padding: 10,
    gap: 10,
  },
  historyButton: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#6C63FF',
  },
  historyButtonText: {
    color: '#6C63FF',
    fontWeight: 'bold',
  },
  addTopButton: {
    flex: 1,
    backgroundColor: '#6C63FF',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  addTopButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingBottom: 10,
    gap: 8,
  },
  filterBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#DDD',
    flex: 1,
    alignItems: 'center',
  },
  activeFilter: {
    backgroundColor: '#6C63FF',
  },
  filterText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333',
  },
  activeFilterText: {
    color: '#FFF',
  },
  statsRow: {
    paddingHorizontal: 15,
    paddingBottom: 5,
  },
  statsText: {
    fontSize: 13,
    color: '#555',
  },
  taskCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 10,
    marginVertical: 6,
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 5,
    elevation: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryEmoji: {
    fontSize: 24,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  priorityText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginTop: 8,
  },
  taskDesc: {
    fontSize: 14,
    color: '#555',
    marginTop: 4,
  },
  timeText: {
    fontSize: 13,
    color: '#555',
    marginTop: 6,
  },
  taskActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  completeBtn: {
    flex: 1,
    backgroundColor: '#237A38',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: '#B42318',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  emptySubText: {
    fontSize: 14,
    color: '#555',
    marginTop: 8,
    textAlign: 'center',
  },
  floatingAddButton: {
    position: 'absolute',
    right: 20,
    bottom: 25,
    backgroundColor: '#6C63FF',
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  floatingAddButtonText: {
    color: '#FFF',
    fontSize: 34,
    lineHeight: 38,
  },
});