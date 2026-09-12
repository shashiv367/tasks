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

import { getAllNotes, Note } from '../../storage/noteStorage';

export default function NotesScreen() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

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
      day: 'numeric' 
    });
  };

  const renderNote = ({ item }: { item: Note }) => {
    const displayTitle = item.title || 'Untitled Note';
    const displayBody = item.body.split('\n')[0] || 'No additional text';

    return (
      <TouchableOpacity
        style={styles.noteCard}
        onPress={() => router.push(`/notes/${item.id}`)}
      >
        <View style={styles.noteHeader}>
          <Text style={styles.noteTitle} numberOfLines={1}>
            {displayTitle}
          </Text>
          <Text style={styles.noteDate}>{formatDate(item.updatedAt)}</Text>
        </View>
        <Text style={styles.noteBodyPreview} numberOfLines={1}>
          {displayBody}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#1F3A5F" style={styles.loader} />
      ) : (
        <FlatList
          data={notes}
          renderItem={renderNote}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No notes yet. Write something you don't want to forget.
              </Text>
            </View>
          }
        />
      )}
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.newNoteBtn}
          onPress={() => router.push('/notes/new')}
        >
          <Text style={styles.newNoteBtnText}>New note</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1EA',
  },
  loader: {
    marginTop: 40,
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  noteCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C2430',
    flex: 1,
    marginRight: 12,
  },
  noteDate: {
    fontSize: 13,
    color: '#5C6773',
  },
  noteBodyPreview: {
    fontSize: 14,
    color: '#5C6773',
    lineHeight: 20,
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#5C6773',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'transparent',
  },
  newNoteBtn: {
    backgroundColor: '#1F3A5F',
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  newNoteBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
