import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Text,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

import {
  saveNote,
  updateNote,
  getNoteById,
  deleteNote,
} from '../../storage/noteStorage';

export default function NoteEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Track the actual saved ID if we create one during this session
  const [currentId, setCurrentId] = useState<string | null>(isNew ? null : id);
  
  // Track initial values to know if it's dirty
  const initialRef = useRef({ title: '', body: '' });

  // Load existing note if needed
  useEffect(() => {
    if (!isNew && id) {
      void loadNote(id);
    }
  }, [id, isNew]);

  const loadNote = async (noteId: string) => {
    const note = await getNoteById(noteId);
    if (note) {
      setTitle(note.title);
      setBody(note.body);
      initialRef.current = { title: note.title, body: note.body };
    }
  };

  // Auto-save logic
  useEffect(() => {
    // Only auto-save if something changed from the initial load
    if (title === initialRef.current.title && body === initialRef.current.body) {
      return;
    }

    const timerId = setTimeout(() => {
      void performSave(true);
    }, 800);

    return () => clearTimeout(timerId);
  }, [title, body]);

  const performSave = async (isAutoSave = false) => {
    // Don't save empty notes
    if (!title.trim() && !body.trim()) {
      if (!isAutoSave) {
        Alert.alert('Empty Note', 'Please add a title or some text.');
      }
      return;
    }

    if (!isAutoSave) {
      setIsSaving(true);
    }

    try {
      if (currentId) {
        await updateNote(currentId, {
          title: title.trim(),
          body: body.trim(),
        });
      } else {
        const newNote = await saveNote({
          title: title.trim(),
          body: body.trim(),
        });
        if (newNote) {
          setCurrentId(newNote.id);
        }
      }
      
      initialRef.current = { title, body };
      
      if (!isAutoSave) {
        router.back();
      }
    } catch (error) {
      console.error('Error saving note:', error);
      if (!isAutoSave) {
        Alert.alert('Error', 'Failed to save note.');
      }
    } finally {
      if (!isAutoSave) {
        setIsSaving(false);
      }
    }
  };

  const handleManualSave = () => {
    void performSave(false);
  };

  const handleDelete = () => {
    if (!currentId) {
      router.back();
      return;
    }

    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteNote(currentId);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TextInput
          style={styles.titleInput}
          placeholder="Note title"
          placeholderTextColor="#A0AEC0"
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />
        
        <View style={styles.headerActions}>
          {!isNew && currentId && (
            <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleManualSave} style={styles.saveBtn} disabled={isSaving}>
            <Text style={styles.saveBtnText}>{isSaving ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TextInput
        style={styles.bodyInput}
        placeholder="Start typing..."
        placeholderTextColor="#A0AEC0"
        value={body}
        onChangeText={setBody}
        multiline
        textAlignVertical="top"
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F1EA',
  },
  titleInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#1C2430',
    marginRight: 12,
    paddingVertical: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  deleteText: {
    color: '#9B2C2C',
    fontSize: 15,
    fontWeight: '500',
  },
  saveBtn: {
    backgroundColor: '#1F3A5F',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  bodyInput: {
    flex: 1,
    padding: 20,
    fontSize: 16,
    color: '#1C2430',
    lineHeight: 24,
  },
});
