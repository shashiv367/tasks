import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { getAllNotes, Note } from '../../storage/noteStorage';
import { BottomTabBar } from '@/components/BottomTabBar';

export default function NotesScreen() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  const loadNotes = async () => {
    try {
      const data = await getAllNotes();
      setNotes(data);
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void loadNotes();
    }, [])
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  const renderNote = ({ item }: { item: Note }) => {
    const displayTitle = item.title || 'Untitled Note';
    const displayBody = item.body.split('\n')[0] || 'No additional text';

    return (
      <TouchableOpacity
        style={styles.noteCard}
        onPress={() => router.push(`/notes/${item.id}`)}
        activeOpacity={0.75}
      >
        <View style={styles.noteHeader}>
          <Text style={styles.noteTitle} numberOfLines={1}>
            {displayTitle}
          </Text>
          <Text style={styles.noteDate}>{formatDate(item.updatedAt)}</Text>
        </View>
        <Text style={styles.noteBodyPreview} numberOfLines={2}>
          {displayBody}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={styles.loader} />
      ) : (
        <FlatList
          data={notes}
          renderItem={renderNote}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={52} color="#475569" />
              <Text style={styles.emptyTitle}>No notes yet</Text>
              <Text style={styles.emptyText}>
                Tap the plus button below to jot down an idea or reminder.
              </Text>
            </View>
          }
        />
      )}

      {/* FAB to add a note */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 70 }]}
        onPress={() => router.push('/notes/new')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Bottom Tab Bar */}
      <BottomTabBar activeTab="notes" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loader: {
    marginTop: 60,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  noteCard: {
    backgroundColor: '#12151C',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E2430',
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 12,
  },
  noteDate: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  noteBodyPreview: {
    fontSize: 14,
    color: '#8E95A5',
    lineHeight: 20,
  },
  emptyContainer: {
    paddingTop: 80,
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
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
});
