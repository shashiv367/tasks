import React, { useState } from 'react';
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
import { router } from 'expo-router';

import { saveTask, setTaskNotificationId } from '../storage/taskStorage';
import {
  notificationsSupported,
  scheduleTaskNotification,
} from '../notifications/notificationHelper';

type Category =
  | 'health'
  | 'work'
  | 'shopping'
  | 'personal'
  | 'habits'
  | 'future';

type Priority = 'high' | 'medium' | 'low';
type RepeatType = 'once' | 'daily';

const categories: { id: Category; label: string }[] = [
  { id: 'health', label: '💊 Health' },
  { id: 'work', label: '💼 Work' },
  { id: 'shopping', label: '🛒 Shopping' },
  { id: 'personal', label: '🏠 Personal' },
  { id: 'habits', label: '⭐ Habits' },
  { id: 'future', label: '📅 Future' },
];

const priorities: {
  id: Priority;
  label: string;
  color: string;
}[] = [
  { id: 'high', label: '🔴 High', color: '#B42318' },
  { id: 'medium', label: '🟡 Medium', color: '#855900' },
  { id: 'low', label: '🟢 Low', color: '#237A38' },
];

const repeatOptions: { id: RepeatType; label: string }[] = [
  { id: 'once', label: 'Once' },
  { id: 'daily', label: 'Daily' },
];

export default function AddTaskScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [category, setCategory] = useState<Category>('personal');
  const [priority, setPriority] = useState<Priority>('medium');
  const [repeatType, setRepeatType] = useState<RepeatType>('once');

  const [reminderTime, setReminderTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving) return;

    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter a task title.');
      return;
    }

    if (repeatType === 'once' && reminderTime.getTime() <= Date.now()) {
      Alert.alert(
        'Invalid reminder time',
        'For a one-time task, please choose a future date and time.'
      );
      return;
    }

    setSaving(true);

    try {
      const task = await saveTask({
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        repeatType,
        reminderTime: reminderTime.toISOString(),
      });

      if (!task) {
        Alert.alert('Error', 'Task could not be saved.');
        setSaving(false);
        return;
      }

      const notificationId = await scheduleTaskNotification(task);

      if (notificationId) {
        await setTaskNotificationId(task.id, notificationId);
      }

      Alert.alert(
        'Task saved',
        notificationsSupported
          ? 'Your task has been saved and a reminder was scheduled.'
          : 'Your task has been saved. Reminders work after you install the APK, not in Expo Go.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      console.error('Could not save task:', error);
      Alert.alert('Error', 'Task could not be saved. Please try again.');
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
      <Text style={styles.screenTitle}>➕ Add New Task</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Task Title *</Text>

        <TextInput
          style={styles.input}
          placeholder="Example: Take medicine"
          placeholderTextColor="#777"
          value={title}
          onChangeText={setTitle}
          maxLength={60}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description</Text>

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Add details if needed..."
          placeholderTextColor="#777"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Category</Text>

        <View style={styles.optionGrid}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.optionButton,
                category === cat.id && styles.selectedOption,
              ]}
              onPress={() => setCategory(cat.id)}
            >
              <Text
                style={[
                  styles.optionText,
                  category === cat.id && styles.selectedOptionText,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Priority</Text>

        <View style={styles.row}>
          {priorities.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.priorityButton,
                priority === p.id && {
                  backgroundColor: p.color,
                  borderColor: p.color,
                },
              ]}
              onPress={() => setPriority(p.id)}
            >
              <Text
                style={[
                  styles.priorityText,
                  priority === p.id && styles.selectedOptionText,
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Repeat</Text>

        <View style={styles.row}>
          {repeatOptions.map(option => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.repeatButton,
                repeatType === option.id && styles.selectedOption,
              ]}
              onPress={() => setRepeatType(option.id)}
            >
              <Text
                style={[
                  styles.optionText,
                  repeatType === option.id && styles.selectedOptionText,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {repeatType === 'once' && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date</Text>

          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              📅 {reminderTime.toDateString()}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Reminder Time</Text>

        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowTimePicker(true)}
        >
          <Text style={styles.dateButtonText}>
            ⏰{' '}
            {reminderTime.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.notice}>
        {notificationsSupported
          ? 'A reminder will be scheduled for the time you choose.'
          : 'Reminders work after you install the APK. Expo Go cannot send them.'}
      </Text>

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

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.disabledButton]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>
          {saving ? 'Saving…' : '💾 Save Task'}
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
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#6C63FF',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFF',
    color: '#222',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    backgroundColor: '#FFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  selectedOption: {
    backgroundColor: '#6C63FF',
    borderColor: '#6C63FF',
  },
  optionText: {
    color: '#333',
    fontWeight: '600',
  },
  selectedOptionText: {
    color: '#FFF',
  },
  priorityButton: {
    flex: 1,
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center',
  },
  priorityText: {
    fontWeight: '700',
    color: '#333',
  },
  repeatButton: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center',
  },
  dateButton: {
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  notice: {
    color: '#666',
    fontSize: 13,
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: '#6C63FF',
    padding: 17,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 5,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    padding: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});