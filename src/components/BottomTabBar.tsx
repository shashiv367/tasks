import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export type ActiveTab = 'tasks' | 'notes' | 'history' | 'settings';

interface BottomTabBarProps {
  activeTab: ActiveTab;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab }) => {
  const insets = useSafeAreaInsets();

  const tabs: {
    id: ActiveTab;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconActive: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  }[] = [
    {
      id: 'tasks',
      label: 'Tasks',
      icon: 'home-outline',
      iconActive: 'home',
      onPress: () => {
        if (activeTab !== 'tasks') router.replace('/');
      },
    },
    {
      id: 'notes',
      label: 'Notes',
      icon: 'document-text-outline',
      iconActive: 'document-text',
      onPress: () => {
        if (activeTab !== 'notes') router.replace('/notes');
      },
    },
    {
      id: 'history',
      label: 'History',
      icon: 'time-outline',
      iconActive: 'time',
      onPress: () => {
        if (activeTab !== 'history') router.replace('/history');
      },
    },
  ];

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabItem}
            activeOpacity={0.7}
            onPress={tab.onPress}
          >
            <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
              <Ionicons
                name={isActive ? tab.iconActive : tab.icon}
                size={22}
                color={isActive ? '#3B82F6' : '#8E95A5'}
              />
            </View>
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: '#12151C',
    paddingTop: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 2,
  },
  iconContainer: {
    paddingHorizontal: 18,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.16)',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8E95A5',
  },
  tabLabelActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
});
