import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Modal,
  Pressable,
  Animated,
  ScrollView,
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
  requestFullScreenIntentPermission,
} from '../notifications/notificationHelper';

type ViewFilter = 'all' | 'today' | 'upcoming';
type PriorityFilter = 'all' | 'high' | 'medium' | 'low';
type SortMode = 'latest' | 'earliest' | 'priority';

const MOTIVATIONAL_QUOTES = [
  'Small steps every day\nlead to big results.',
  'Done is better than\nperfect.',
  'One task at a time.',
  'Progress, not perfection.',
  'Start where you are.',
];

const PRIORITY_DOT: Record<string, string> = {
  high: '#EF4444',
  medium: '#EAB308',
  low: '#22C55E',
};

export default function HomeScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('latest');
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [menuTaskId, setMenuTaskId] = useState<string | null>(null);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [quote] = useState(
    MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]
  );

  const insets = useSafeAreaInsets();

  useEffect(() => {
    const init = async () => {
      if (notificationsSupported && !isExpoGo) {
        const granted = await requestPermission(true);
        if (granted) {
          await requestFullScreenIntentPermission();
        }
      }
    };
    void init();
  }, []);

  const loadTasks = async (selectedView = viewFilter) => {
    let loaded: Task[] = [];
    if (selectedView === 'today') loaded = await getTodayTasks();
    else if (selectedView === 'upcoming') loaded = await getUpcomingTasks();
    else loaded = await getAllPendingTasks();
    setTasks(loaded);
  };

  useFocusEffect(
    useCallback(() => {
      void loadTasks();
      if (notificationsSupported && !isExpoGo) {
        checkPermissions();
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

  const handleDelete = async (taskId: string) => {
    setMenuTaskId(null);
    await deleteTask(taskId);
    await loadTasks();
  };

  const filteredTasks =
    priorityFilter === 'all'
      ? tasks
      : tasks.filter(t => t.priority === priorityFilter);

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortMode === 'priority') {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    }
    const aTime = new Date(a.reminderTime).getTime();
    const bTime = new Date(b.reminderTime).getTime();
    return sortMode === 'latest' ? bTime - aTime : aTime - bTime;
  });

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const sortLabel = sortMode === 'latest' ? 'Latest' : sortMode === 'earliest' ? 'Earliest' : 'Priority';

  // ─── Task Card ────────────────────────────────────────────────────────────────
  const renderTask = ({ item }: { item: Task }) => {
    const dot = PRIORITY_DOT[item.priority] ?? '#888';
    const priorityLabel =
      item.priority === 'high' ? 'High' : item.priority === 'medium' ? 'Medium' : 'Low';

    return (
      <View style={styles.card}>
        {/* Top row: checkbox + title + three-dot */}
        <View style={styles.cardTopRow}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => handleComplete(item)}
            disabled={completingId === item.id}
          />
          <View style={styles.cardMeta}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            <View style={styles.cardDateRow}>
              {/* calendar emoji */}
              <Text style={styles.calIcon}>📅</Text>
              <Text style={styles.cardDate}>{formatDateTime(item.reminderTime)}</Text>
            </View>
            {/* priority badge */}
            <View style={styles.priorityBadge}>
              <View style={[styles.priorityDot, { backgroundColor: dot }]} />
              <Text style={[styles.priorityBadgeText, { color: dot }]}>{priorityLabel}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.threeDotBtn}
            onPress={() => setMenuTaskId(item.id)}
          >
            <Text style={styles.threeDot}>⋮</Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.cardDivider} />

        {/* Action row */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleComplete(item)}
            disabled={completingId === item.id}
          >
            <Text style={styles.completeIcon}>✅</Text>
            <Text style={styles.completeText}>
              {completingId === item.id ? 'Completing…' : 'Complete'}
            </Text>
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              setMenuTaskId(null);
              router.push({ pathname: '/add-task', params: { taskId: item.id } });
            }}
          >
            <Text style={styles.editIcon}>✏️</Text>
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleDelete(item.id)}
          >
            <Text style={styles.deleteIcon}>🗑️</Text>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ─── Three-dot context menu ───────────────────────────────────────────────────
  const contextTask = tasks.find(t => t.id === menuTaskId);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ─── Header ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Tasks</Text>
          <Text style={styles.headerSub}>Stay consistent, make it happen.</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Text style={styles.headerIcon}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Text style={styles.headerIcon}>⋮</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── View Filter Tabs ───────────────────────────────────── */}
      <View style={styles.viewFiltersRow}>
        {(['all', 'today', 'upcoming'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.viewTab, viewFilter === tab && styles.viewTabActive]}
            onPress={() => { setViewFilter(tab); }}
          >
            <Text style={[styles.viewTabText, viewFilter === tab && styles.viewTabTextActive]}>
              {tab === 'all' ? 'All' : tab === 'today' ? 'Today' : 'Upcoming'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ─── Priority Filters ───────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.priorityScroll}
        contentContainerStyle={styles.priorityScrollContent}
      >
        {/* All */}
        <TouchableOpacity
          style={[styles.priorityPill, priorityFilter === 'all' && styles.priorityPillActiveAll]}
          onPress={() => setPriorityFilter('all')}
        >
          <Text style={[styles.priorityPillText, priorityFilter === 'all' && styles.priorityPillTextActiveAll]}>
            All
          </Text>
        </TouchableOpacity>

        {(['high', 'medium', 'low'] as const).map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.priorityPill, styles.priorityPillDark]}
            onPress={() => setPriorityFilter(p === priorityFilter ? 'all' : p)}
          >
            <View style={[styles.filterDot, { backgroundColor: PRIORITY_DOT[p] }]} />
            <Text style={[
              styles.priorityPillText,
              { color: priorityFilter === p ? '#fff' : '#aaa' }
            ]}>
              {p === 'high' ? 'High' : p === 'medium' ? 'Medium' : 'Low'}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Filter icon */}
        <TouchableOpacity style={styles.filterIconBtn}>
          <Text style={styles.filterIconText}>⚙</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ─── Stats + Sort ───────────────────────────────────────── */}
      <View style={styles.statsRow}>
        <Text style={styles.statsText}>
          {sortedTasks.length} {sortedTasks.length === 1 ? 'task' : 'tasks'}
        </Text>
        <TouchableOpacity
          style={styles.sortBtn}
          onPress={() => setSortMenuOpen(true)}
        >
          <Text style={styles.sortBtnText}>Sort: {sortLabel} ▾</Text>
        </TouchableOpacity>
      </View>

      {/* ─── Task List ──────────────────────────────────────────── */}
      <FlatList
        data={sortedTasks}
        renderItem={renderTask}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3B82F6"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyQuote}>{quote}</Text>
            <View style={styles.emptyUnderline} />
          </View>
        }
        contentContainerStyle={[
          styles.listContent,
          sortedTasks.length === 0 && styles.listContentEmpty,
        ]}
      />

      {/* ─── FAB ────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 80 }]}
        onPress={() => router.push('/add-task')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* ─── Bottom Tab Bar ─────────────────────────────────────── */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom }]}>
        {[
          { icon: '🏠', label: 'Tasks', active: true },
          { icon: '📄', label: 'Notes', onPress: () => router.push('/notes') },
          { icon: '🕐', label: 'History', onPress: () => router.push('/history') },
          { icon: '⚙️', label: 'Settings', onPress: () => {} },
        ].map((tab, i) => (
          <TouchableOpacity
            key={i}
            style={styles.tabItem}
            onPress={tab.onPress}
          >
            <Text style={[styles.tabIcon, tab.active && styles.tabIconActive]}>
              {tab.icon}
            </Text>
            <Text style={[styles.tabLabel, tab.active && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ─── Context Menu Modal ─────────────────────────────────── */}
      <Modal
        transparent
        visible={!!menuTaskId}
        animationType="fade"
        onRequestClose={() => setMenuTaskId(null)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setMenuTaskId(null)}>
          <View style={styles.menuBox}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuTaskId(null);
                if (contextTask) router.push({ pathname: '/add-task', params: { taskId: contextTask.id } });
              }}
            >
              <Text style={styles.menuItemText}>✏️  Edit task</Text>
            </TouchableOpacity>
            <View style={styles.menuSep} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => contextTask && handleComplete(contextTask)}
            >
              <Text style={styles.menuItemText}>✅  Mark complete</Text>
            </TouchableOpacity>
            <View style={styles.menuSep} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => contextTask && handleDelete(contextTask.id)}
            >
              <Text style={[styles.menuItemText, { color: '#EF4444' }]}>🗑️  Delete task</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* ─── Sort Menu Modal ────────────────────────────────────── */}
      <Modal
        transparent
        visible={sortMenuOpen}
        animationType="fade"
        onRequestClose={() => setSortMenuOpen(false)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setSortMenuOpen(false)}>
          <View style={styles.menuBox}>
            {([['latest', 'Latest first'], ['earliest', 'Earliest first'], ['priority', 'By priority']] as const).map(
              ([mode, label]) => (
                <TouchableOpacity
                  key={mode}
                  style={styles.menuItem}
                  onPress={() => { setSortMode(mode); setSortMenuOpen(false); }}
                >
                  <Text style={[styles.menuItemText, sortMode === mode && { color: '#3B82F6' }]}>
                    {sortMode === mode ? '● ' : '○ '}{label}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },

  // ── Header ──────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    fontSize: 16,
  },

  // ── View Filter Tabs ────────────────────────────────────────────
  viewFiltersRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 6,
    marginBottom: 12,
  },
  viewTab: {
    paddingVertical: 7,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  viewTabActive: {
    backgroundColor: '#3B82F6',
  },
  viewTabText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '500',
  },
  viewTabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  // ── Priority Filters ────────────────────────────────────────────
  priorityScroll: {
    flexGrow: 0,
    marginBottom: 12,
  },
  priorityScrollContent: {
    paddingHorizontal: 20,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  priorityPillDark: {
    backgroundColor: '#111',
  },
  priorityPillActiveAll: {
    borderColor: '#3B82F6',
    backgroundColor: 'transparent',
  },
  priorityPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#aaa',
  },
  priorityPillTextActiveAll: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  filterIconText: {
    color: '#aaa',
    fontSize: 14,
  },

  // ── Stats + Sort ─────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  statsText: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '500',
  },
  sortBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  sortBtnText: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '500',
  },

  // ── Task List ────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  listContentEmpty: {
    flex: 1,
  },

  // ── Task Card ────────────────────────────────────────────────────
  card: {
    backgroundColor: '#111',
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#555',
    marginTop: 2,
    flexShrink: 0,
  },
  cardMeta: {
    flex: 1,
    gap: 5,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  cardDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  calIcon: {
    fontSize: 12,
  },
  cardDate: {
    color: '#888',
    fontSize: 12,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1e1e1e',
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  priorityDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  priorityBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  threeDotBtn: {
    padding: 4,
    marginTop: -2,
  },
  threeDot: {
    color: '#888',
    fontSize: 20,
    fontWeight: '700',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#1e1e1e',
    marginHorizontal: 14,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 12,
  },
  actionDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#1e1e1e',
  },
  completeIcon: { fontSize: 13 },
  completeText: {
    color: '#22C55E',
    fontSize: 13,
    fontWeight: '600',
  },
  editIcon: { fontSize: 13 },
  editText: {
    color: '#3B82F6',
    fontSize: 13,
    fontWeight: '600',
  },
  deleteIcon: { fontSize: 13 },
  deleteText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Empty state ──────────────────────────────────────────────────
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyQuote: {
    color: '#666',
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 24,
  },
  emptyUnderline: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#3B82F6',
  },

  // ── FAB ─────────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    right: 22,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  fabIcon: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 30,
    marginTop: -2,
  },

  // ── Bottom Tab Bar ───────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0d0d0d',
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    paddingTop: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingBottom: 4,
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.5,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    color: '#666',
    fontSize: 10,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },

  // ── Modals ───────────────────────────────────────────────────────
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBox: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    width: 240,
    overflow: 'hidden',
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  menuItemText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  menuSep: {
    height: 1,
    backgroundColor: '#2a2a2a',
  },
});