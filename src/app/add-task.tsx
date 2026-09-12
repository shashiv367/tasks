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
  { id: 'health', label: 'Health' },
  { id: 'work', label: 'Work' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'personal', label: 'Personal' },
  { id: 'habits', label: 'Habits' },
  { id: 'future', label: 'Future' },
];

const priorities: {
  id: Priority;
  label: string;
}[] = [
  { id: 'high', label: 'High' },
  { id: 'medium', label: 'Medium' },
  { id: 'low', label: 'Low' },
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

      let message = '';
      if (!notificationsSupported) {
        message = 'Saved. Alarms only work in the installed app, not Expo Go.';
      } else if (notificationId) {
        const timeStr = reminderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        message = `Saved. Alarm at ${timeStr}.`;
      } else {
        message = 'Saved, but alarms are off. Enable notifications and alarms for this app in Android settings.';
      }

      Alert.alert(
        'Task saved',
        message,
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
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Call dentist"
          placeholderTextColor="#A0AEC0"
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
          placeholderTextColor="#A0AEC0"
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
        <View style={styles.segmentedControl}>
          {priorities.map((p, i) => (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.segmentButton,
                priority === p.id && styles.selectedSegmentButton,
                i === 0 && { borderTopLeftRadius: 10, borderBottomLeftRadius: 10 },
                i === priorities.length - 1 && { borderTopRightRadius: 10, borderBottomRightRadius: 10, borderRightWidth: 1 },
              ]}
              onPress={() => setPriority(p.id)}
            >
              <Text
                style={[
                  styles.segmentText,
                  priority === p.id && styles.selectedSegmentText,
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
        <View style={styles.segmentedControl}>
          {repeatOptions.map((option, i) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.segmentButton,
                repeatType === option.id && styles.selectedSegmentButton,
                i === 0 && { borderTopLeftRadius: 10, borderBottomLeftRadius: 10 },
                i === repeatOptions.length - 1 && { borderTopRightRadius: 10, borderBottomRightRadius: 10, borderRightWidth: 1 },
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
      </View>

      <View style={styles.rowGroup}>
        {repeatType === 'once' && (
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {reminderTime.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.label}>Time</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {reminderTime.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.notice}>
        {notificationsSupported
          ? 'A reminder will be scheduled for the selected time.'
          : 'Note: Push notifications only work in the standalone APK, not in Expo Go.'}
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
          {saving ? 'Saving...' : 'Save task'}
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
    backgroundColor: '#F4F1EA',
  },
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  inputGroup: {
    marginBottom: 24,
  },
  rowGroup: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1C2430',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    color: '#1C2430',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedOption: {
    backgroundColor: '#1F3A5F',
    borderColor: '#1F3A5F',
  },
  optionText: {
    color: '#5C6773',
    fontWeight: '500',
    fontSize: 14,
  },
  selectedOptionText: {
    color: '#FFFFFF',
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 10,
  },
  segmentButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRightWidth: 0,
    alignItems: 'center',
  },
  selectedSegmentButton: {
    backgroundColor: '#1F3A5F',
    borderColor: '#1F3A5F',
    borderRightWidth: 1,
  },
  segmentText: {
    fontWeight: '500',
    color: '#5C6773',
    fontSize: 14,
  },
  selectedSegmentText: {
    color: '#FFFFFF',
  },
  dateButton: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 15,
    color: '#1C2430',
    fontWeight: '500',
  },
  notice: {
    color: '#5C6773',
    fontSize: 13,
    marginBottom: 24,
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: '#1F3A5F',
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  disabledButton: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#5C6773',
    fontSize: 15,
    fontWeight: '500',
  },
});