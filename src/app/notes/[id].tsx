import React, { useState, useEffect, useRef } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { darkAlert } from '@/components/DarkAlert';

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
    if (title === initialRef.current.title && body === initialRef.current.body) {
      return;
    }

    const timerId = setTimeout(() => {
      void performSave(true);
    }, 800);

    return () => clearTimeout(timerId);
  }, [title, body]);

  const performSave = async (isAutoSave = false) => {
    if (!title.trim() && !body.trim()) {
      if (!isAutoSave) {
        darkAlert('Empty Note', 'Please add a title or some text.');
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
        darkAlert('Error', 'Failed to save note.');
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

    darkAlert(
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
          placeholderTextColor="#64748B"
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />

        <View style={styles.headerActions}>
          {!isNew && currentId && (
            <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleManualSave}
            style={styles.saveBtn}
            disabled={isSaving}
          >
            <Ionicons name="checkmark" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.saveBtnText}>{isSaving ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TextInput
        style={styles.bodyInput}
        placeholder="Start writing..."
        placeholderTextColor="#64748B"
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
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2430',
  },
  titleInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 12,
    paddingVertical: 6,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#161922',
  },
  saveBtn: {
    backgroundColor: '#3B82F6',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  bodyInput: {
    flex: 1,
    padding: 18,
    fontSize: 16,
    color: '#E2E8F0',
    lineHeight: 24,
  },
});
