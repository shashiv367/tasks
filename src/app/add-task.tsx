import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { saveTask, getAllTasks, Task } from '../storage/taskStorage';
import { notificationsSupported } from '../notifications/notificationHelper';
import { darkAlert } from '@/components/DarkAlert';

type Category =
  | 'health'
  | 'work'
  | 'shopping'
  | 'personal'
  | 'habits'
  | 'future';

type Priority = 'high' | 'medium' | 'low';
type RepeatType = 'once' | 'daily';

const categories: { id: Category; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'personal', label: 'Personal', icon: 'person-outline' },
  { id: 'work', label: 'Work', icon: 'briefcase-outline' },
  { id: 'health', label: 'Health', icon: 'fitness-outline' },
  { id: 'shopping', label: 'Shopping', icon: 'cart-outline' },
  { id: 'habits', label: 'Habits', icon: 'repeat-outline' },
  { id: 'future', label: 'Future', icon: 'telescope-outline' },
];

const priorities: {
  id: Priority;
  label: string;
  dot: string;
}[] = [
  { id: 'high', label: 'High', dot: '#EF4444' },
  { id: 'medium', label: 'Medium', dot: '#EAB308' },
  { id: 'low', label: 'Low', dot: '#22C55E' },
];

const repeatOptions: { id: RepeatType; label: string }[] = [
  { id: 'once', label: 'Once' },
  { id: 'daily', label: 'Daily' },
];

export default function AddTaskScreen() {
  const { taskId } = useLocalSearchParams<{ taskId?: string }>();
  const isEditing = !!taskId;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('personal');
  const [priority, setPriority] = useState<Priority>('medium');
  const [repeatType, setRepeatType] = useState<RepeatType>('once');
  const [reminderTime, setReminderTime] = useState(new Date());

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!taskId) return;
    const loadTask = async () => {
      const all = await getAllTasks();
      const existing = all.find(t => t.id === taskId);
      if (existing) {
        setTitle(existing.title);
        setDescription(existing.description || '');
        setCategory(existing.category);
        setPriority(existing.priority);
        setRepeatType(existing.repeatType);
        setReminderTime(new Date(existing.reminderTime));
      }
    };
    void loadTask();
  }, [taskId]);

  const handleSave = async () => {
    if (saving) return;

    if (!title.trim()) {
      darkAlert('Missing title', 'Please enter a task title.');
      return;
    }

    if (repeatType === 'once' && reminderTime.getTime() <= Date.now()) {
      darkAlert(
        'Invalid reminder time',
        'For a one-time task, please choose a future date and time.'
      );
      return;
    }

    setSaving(true);

    try {
      const task = await saveTask({
        ...(taskId ? { id: taskId } : {}),
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        repeatType,
        reminderTime: reminderTime.toISOString(),
      });

      if (!task) {
        darkAlert('Error', 'Task could not be saved.');
        setSaving(false);
        return;
      }

      router.back();
    } catch (error) {
      console.error('Could not save task:', error);
      darkAlert('Error', 'Task could not be saved. Please try again.');
      setSaving(false);
    }
  };

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    setShowDatePicker(false);
    if (event.type !== 'set' || !selectedDate) return;

    const newDate = new Date(reminderTime);
    newDate.setFullYear(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate()
    );
    setReminderTime(newDate);
  };

  const handleTimeChange = (
    event: DateTimePickerEvent,
    selectedTime?: Date
  ) => {
    setShowTimePicker(false);
    if (event.type !== 'set' || !selectedTime) return;

    const newDate = new Date(reminderTime);
    newDate.setHours(
      selectedTime.getHours(),
      selectedTime.getMinutes(),
      0,
      0
    );
    setReminderTime(newDate);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Title input card */}
      <View style={styles.card}>
        <Text style={styles.label}>Task Title</Text>
        <TextInput
          style={styles.input}
          placeholder="What do you need to do?"
          placeholderTextColor="#64748B"
          value={title}
          onChangeText={setTitle}
          maxLength={80}
        />

        <Text style={[styles.label, { marginTop: 16 }]}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Add details, links, or notes..."
          placeholderTextColor="#64748B"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Priority card */}
      <View style={styles.card}>
        <Text style={styles.label}>Priority</Text>
        <View style={styles.priorityRow}>
          {priorities.map(p => {
            const isSelected = priority === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.priorityBtn,
                  isSelected && {
                    borderColor: p.dot,
                    backgroundColor: 'rgba(255,255,255,0.06)',
                  },
                ]}
                onPress={() => setPriority(p.id)}
              >
                <View style={[styles.priorityDot, { backgroundColor: p.dot }]} />
                <Text
                  style={[
                    styles.priorityBtnText,
                    { color: isSelected ? '#FFFFFF' : '#8E95A5' },
                  ]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Date & Time card */}
      <View style={styles.card}>
        <Text style={styles.label}>Schedule & Reminder</Text>
        
        {/* Repeat selector */}
        <View style={styles.segmentedControl}>
          {repeatOptions.map(option => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.segmentButton,
                repeatType === option.id && styles.selectedSegmentButton,
              ]}
              onPress={() => setRepeatType(option.id)}
            >
              <Text
                style={[
                  styles.segmentText,
                  repeatType === option.id && styles.selectedSegmentText,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.dateTimeRow}>
          {repeatType === 'once' && (
            <TouchableOpacity
              style={styles.pickerBtn}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={16} color="#3B82F6" style={{ marginRight: 8 }} />
              <Text style={styles.pickerBtnText}>
                {reminderTime.toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.pickerBtn}
            onPress={() => setShowTimePicker(true)}
          >
            <Ionicons name="time-outline" size={16} color="#3B82F6" style={{ marginRight: 8 }} />
            <Text style={styles.pickerBtnText}>
              {reminderTime.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </TouchableOpacity>
        </View>

        {!notificationsSupported && (
          <Text style={styles.notice}>
            Note: Alarms only fire in installed builds, not in Expo Go.
          </Text>
        )}
      </View>

      {/* Category card */}
      <View style={styles.card}>
        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryGrid}>
          {categories.map(cat => {
            const isSelected = category === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryChip,
                  isSelected && styles.categoryChipSelected,
                ]}
                onPress={() => setCategory(cat.id)}
              >
                <Ionicons
                  name={cat.icon}
                  size={15}
                  color={isSelected ? '#3B82F6' : '#8E95A5'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    isSelected && styles.categoryChipTextSelected,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Date Pickers */}
      {showDatePicker && (
        <DateTimePicker
          value={reminderTime}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={handleDateChange}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={reminderTime}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}

      {/* Action Buttons */}
      <TouchableOpacity
        style={[styles.saveButton, saving && styles.disabledButton]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.85}
      >
        <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
        <Text style={styles.saveButtonText}>
          {saving ? 'Saving...' : isEditing ? 'Update Task' : 'Create Task'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => router.back()}
        disabled={saving}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#12151C',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E2430',
    padding: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E95A5',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#161922',
    color: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#242A38',
  },
  textArea: {
    height: 84,
    textAlignVertical: 'top',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  priorityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#161922',
    borderWidth: 1,
    borderColor: '#242A38',
    borderRadius: 12,
    paddingVertical: 12,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#161922',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  selectedSegmentButton: {
    backgroundColor: '#16233B',
  },
  segmentText: {
    color: '#8E95A5',
    fontSize: 13,
    fontWeight: '500',
  },
  selectedSegmentText: {
    color: '#3B82F6',
    fontWeight: '700',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#161922',
    borderWidth: 1,
    borderColor: '#242A38',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  pickerBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  notice: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 10,
    lineHeight: 18,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161922',
    borderWidth: 1,
    borderColor: '#242A38',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  categoryChipSelected: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  categoryChipText: {
    color: '#8E95A5',
    fontSize: 13,
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: '#3B82F6',
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#12151C',
    borderWidth: 1,
    borderColor: '#1E2430',
  },
  cancelButtonText: {
    color: '#8E95A5',
    fontSize: 14,
    fontWeight: '600',
  },
});