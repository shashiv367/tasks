import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

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
import { BottomTabBar } from '@/components/BottomTabBar';

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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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

  // Filter tasks based on priority and search query
  const filteredTasks = tasks.filter(t => {
    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    const matchSearch =
      !searchQuery.trim() ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchPriority && matchSearch;
  });

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
        {/* Top row: checkbox + meta + three-dot */}
        <View style={styles.cardTopRow}>
          <TouchableOpacity
            style={styles.checkboxTouch}
            onPress={() => handleComplete(item)}
            disabled={completingId === item.id}
          >
            <View style={[styles.checkboxSquircle, completingId === item.id && styles.checkboxDisabled]}>
              {completingId === item.id ? (
                <Ionicons name="checkmark" size={14} color="#3B82F6" />
              ) : null}
            </View>
          </TouchableOpacity>

          <View style={styles.cardMeta}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.cardDateRow}>
              <Ionicons name="calendar-outline" size={13} color="#8E95A5" style={{ marginRight: 5 }} />
              <Text style={styles.cardDate}>{formatDateTime(item.reminderTime)}</Text>
            </View>
            {/* Priority badge pill */}
            <View style={styles.priorityBadge}>
              <View style={[styles.priorityBadgeDot, { backgroundColor: dot }]} />
              <Text style={[styles.priorityBadgeText, { color: dot }]}>{priorityLabel}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.threeDotBtn}
            onPress={() => setMenuTaskId(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="ellipsis-vertical" size={18} color="#8E95A5" />
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
            <Ionicons name="checkmark-circle-outline" size={16} color="#22C55E" />
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
            <Ionicons name="pencil" size={15} color="#3B82F6" />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleDelete(item.id)}
          >
            <Ionicons name="trash-outline" size={15} color="#EF4444" />
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const contextTask = tasks.find(t => t.id === menuTaskId);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ─── Header ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Tasks</Text>
          <Text style={styles.headerSub}>Stay consistent, make it happen.</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.headerIconBtn, searchOpen && styles.headerIconBtnActive]}
            onPress={() => {
              setSearchOpen(!searchOpen);
              if (searchOpen) setSearchQuery('');
            }}
          >
            <Ionicons name="search" size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={onRefresh}
          >
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Search Bar (if opened) ─────────────────────────────── */}
      {searchOpen && (
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={16} color="#8E95A5" style={{ marginLeft: 12, marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tasks..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 8 }}>
              <Ionicons name="close-circle" size={16} color="#8E95A5" />
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {/* ─── View Filter Tabs (All / Today / Upcoming) ─────────────── */}
      <View style={styles.viewFiltersRow}>
        {(['all', 'today', 'upcoming'] as const).map(tab => {
          const isActive = viewFilter === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.viewTab, isActive && styles.viewTabActive]}
              onPress={() => setViewFilter(tab)}
            >
              <Text style={[styles.viewTabText, isActive && styles.viewTabTextActive]}>
                {tab === 'all' ? 'All' : tab === 'today' ? 'Today' : 'Upcoming'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ─── Priority Filters Row ───────────────────────────────── */}
      <View style={styles.priorityFilterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.priorityScrollContent}
        >
          {/* All pill */}
          <TouchableOpacity
            style={[styles.priorityPill, priorityFilter === 'all' && styles.priorityPillActiveAll]}
            onPress={() => setPriorityFilter('all')}
          >
            <Text style={[styles.priorityPillText, priorityFilter === 'all' && styles.priorityPillTextActiveAll]}>
              All
            </Text>
          </TouchableOpacity>

          {(['high', 'medium', 'low'] as const).map(p => {
            const isSelected = priorityFilter === p;
            return (
              <TouchableOpacity
                key={p}
                style={[
                  styles.priorityPill,
                  styles.priorityPillDark,
                  isSelected && { borderColor: PRIORITY_DOT[p], borderWidth: 1 },
                ]}
                onPress={() => setPriorityFilter(isSelected ? 'all' : p)}
              >
                <View style={[styles.filterDot, { backgroundColor: PRIORITY_DOT[p] }]} />
                <Text style={[styles.priorityPillText, { color: isSelected ? '#FFFFFF' : '#A0AEC0' }]}>
                  {p === 'high' ? 'High' : p === 'medium' ? 'Medium' : 'Low'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ─── Stats + Sort ───────────────────────────────────────── */}
      <View style={styles.statsRow}>
        <Text style={styles.statsText}>
          {sortedTasks.length} {sortedTasks.length === 1 ? 'task' : 'tasks'}
        </Text>
        <TouchableOpacity
          style={styles.sortBtn}
          onPress={() => setSortMenuOpen(true)}
        >
          <Text style={styles.sortBtnText}>Sort: {sortLabel}</Text>
          <Ionicons name="chevron-down" size={13} color="#8E95A5" style={{ marginLeft: 4 }} />
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
        style={[styles.fab, { bottom: insets.bottom + 70 }]}
        onPress={() => router.push('/add-task')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>

      {/* ─── Bottom Tab Bar ─────────────────────────────────────── */}
      <BottomTabBar activeTab="tasks" />

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
                if (contextTask) {
                  router.push({ pathname: '/add-task', params: { taskId: contextTask.id } });
                }
              }}
            >
              <Ionicons name="pencil" size={16} color="#3B82F6" style={{ marginRight: 10 }} />
              <Text style={styles.menuItemText}>Edit task</Text>
            </TouchableOpacity>
            <View style={styles.menuSep} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => contextTask && handleComplete(contextTask)}
            >
              <Ionicons name="checkmark-circle" size={16} color="#22C55E" style={{ marginRight: 10 }} />
              <Text style={styles.menuItemText}>Mark complete</Text>
            </TouchableOpacity>
            <View style={styles.menuSep} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => contextTask && handleDelete(contextTask.id)}
            >
              <Ionicons name="trash" size={16} color="#EF4444" style={{ marginRight: 10 }} />
              <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Delete task</Text>
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
            <Text style={styles.menuHeader}>Sort by</Text>
            <View style={styles.menuSep} />
            {(['latest', 'earliest', 'priority'] as const).map(mode => (
              <TouchableOpacity
                key={mode}
                style={styles.menuItem}
                onPress={() => {
                  setSortMode(mode);
                  setSortMenuOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.menuItemText,
                    sortMode === mode && { color: '#3B82F6', fontWeight: '700' },
                  ]}
                >
                  {mode === 'latest' ? 'Latest first' : mode === 'earliest' ? 'Earliest first' : 'Priority'}
                </Text>
                {sortMode === mode && (
                  <Ionicons name="checkmark" size={18} color="#3B82F6" style={{ marginLeft: 'auto' }} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },

  // ── Header ───────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: '#8E95A5',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#161922',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#222632',
  },
  headerIconBtnActive: {
    backgroundColor: '#1E293B',
    borderColor: '#3B82F6',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12151C',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222632',
    height: 42,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    paddingVertical: 0,
  },

  // ── View Filter Tabs ─────────────────────────────────────────────
  viewFiltersRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
  viewTab: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  viewTabActive: {
    backgroundColor: '#16233B',
  },
  viewTabText: {
    color: '#8E95A5',
    fontSize: 14,
    fontWeight: '500',
  },
  viewTabTextActive: {
    color: '#3B82F6',
    fontWeight: '700',
  },

  // ── Priority Filter Pills ────────────────────────────────────────
  priorityFilterWrapper: {
    marginBottom: 14,
  },
  priorityScrollContent: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  priorityPillActiveAll: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  priorityPillDark: {
    backgroundColor: '#12151C',
    borderColor: '#1E2430',
  },
  priorityPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  priorityPillTextActiveAll: {
    color: '#3B82F6',
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
    backgroundColor: '#12151C',
    borderWidth: 1,
    borderColor: '#1E2430',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },

  // ── Stats row ────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  statsText: {
    color: '#8E95A5',
    fontSize: 13,
    fontWeight: '500',
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortBtnText: {
    color: '#8E95A5',
    fontSize: 13,
    fontWeight: '500',
  },

  // ── Task List ────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 110,
  },
  listContentEmpty: {
    flexGrow: 1,
  },

  // ── Task Card ────────────────────────────────────────────────────
  card: {
    backgroundColor: '#12151C',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E2430',
    overflow: 'hidden',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 12,
  },
  checkboxTouch: {
    marginTop: 2,
  },
  checkboxSquircle: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#3E4758',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDisabled: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  cardMeta: {
    flex: 1,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 6,
  },
  cardDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardDate: {
    color: '#8E95A5',
    fontSize: 12,
    fontWeight: '500',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  priorityBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  threeDotBtn: {
    padding: 4,
    marginTop: -2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#1A1E29',
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
    gap: 6,
    paddingVertical: 12,
  },
  actionDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#1A1E29',
  },
  completeText: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '600',
  },
  editText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Empty state ──────────────────────────────────────────────────
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 14,
  },
  emptyQuote: {
    color: '#64748B',
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

  // ── FAB ──────────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },

  // ── Modals ───────────────────────────────────────────────────────
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBox: {
    backgroundColor: '#161922',
    borderRadius: 16,
    width: 250,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#242A38',
  },
  menuHeader: {
    color: '#8E95A5',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  menuSep: {
    height: 1,
    backgroundColor: '#222632',
  },
});