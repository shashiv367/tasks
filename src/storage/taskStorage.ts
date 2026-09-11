import AsyncStorage from '@react-native-async-storage/async-storage';

const TASKS_KEY = 'tasks';
const HISTORY_KEY = 'task_history';

export interface Task {
  id: string;
  title: string;
  description: string;
  category: 'health' | 'work' | 'shopping' | 'personal' | 'habits' | 'future';
  priority: 'high' | 'medium' | 'low';
  reminderTime: string;
  repeatType: 'once' | 'daily';
  isCompleted: boolean;
  lastCompletedDate: string | null;
  createdAt: string;
  completedAt: string | null;
  notificationId: string | null;
}

export interface HistoryItem {
  id: string;
  taskId: string;
  title: string;
  description: string;
  category: Task['category'];
  priority: Task['priority'];
  completedAt: string;
}

export const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseJson = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error('Error parsing stored data:', error);
    return fallback;
  }
};

const dedupeHistory = (items: HistoryItem[]): HistoryItem[] => {
  const seen = new Set<string>();
  const result: HistoryItem[] = [];

  for (const item of items) {
    const date = toLocalDateString(new Date(item.completedAt));
    const key = `${item.taskId}-${date}`;

    if (seen.has(key)) continue;

    seen.add(key);
    result.push(item);
  }

  return result;
};

export const getAllTasks = async (): Promise<Task[]> => {
  try {
    const tasks = await AsyncStorage.getItem(TASKS_KEY);
    return parseJson<Task[]>(tasks, []);
  } catch (error) {
    console.error('Error getting tasks:', error);
    return [];
  }
};

const saveAllTasks = async (tasks: Task[]): Promise<void> => {
  await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
};

const readHistory = async (): Promise<HistoryItem[]> => {
  const history = await AsyncStorage.getItem(HISTORY_KEY);
  return parseJson<HistoryItem[]>(history, []);
};

const saveHistory = async (history: HistoryItem[]): Promise<void> => {
  await AsyncStorage.setItem(
    HISTORY_KEY,
    JSON.stringify(dedupeHistory(history))
  );
};

export const saveTask = async (
  task: Omit<
    Task,
    | 'id'
    | 'isCompleted'
    | 'createdAt'
    | 'completedAt'
    | 'lastCompletedDate'
    | 'notificationId'
  >
): Promise<Task | undefined> => {
  try {
    const existingTasks = await getAllTasks();

    const newTask: Task = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: task.title,
      description: task.description || '',
      category: task.category,
      priority: task.priority,
      reminderTime: task.reminderTime,
      repeatType: task.repeatType,
      isCompleted: false,
      lastCompletedDate: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
      notificationId: null,
    };

    await saveAllTasks([...existingTasks, newTask]);
    return newTask;
  } catch (error) {
    console.error('Error saving task:', error);
  }
};

export const setTaskNotificationId = async (
  taskId: string,
  notificationId: string | null
): Promise<void> => {
  try {
    const tasks = await getAllTasks();
    const updatedTasks = tasks.map(task =>
      task.id === taskId ? { ...task, notificationId } : task
    );
    await saveAllTasks(updatedTasks);
  } catch (error) {
    console.error('Error saving notification id:', error);
  }
};

export const completeTask = async (taskId: string): Promise<void> => {
  try {
    const tasks = await getAllTasks();
    const task = tasks.find(item => item.id === taskId);

    if (!task) return;
    if (task.repeatType !== 'daily' && task.isCompleted) return;

    const now = new Date();
    const today = toLocalDateString(now);

    if (task.repeatType === 'daily' && task.lastCompletedDate === today) {
      return;
    }

    const history = await readHistory();
    const alreadyLoggedToday = history.some(
      item =>
        item.taskId === taskId &&
        toLocalDateString(new Date(item.completedAt)) === today
    );

    const updatedTasks = tasks.map(item => {
      if (item.id !== taskId) return item;

      if (item.repeatType === 'daily') {
        return {
          ...item,
          lastCompletedDate: today,
          isCompleted: false,
          completedAt: null,
        };
      }

      return {
        ...item,
        isCompleted: true,
        completedAt: now.toISOString(),
      };
    });

    await saveAllTasks(updatedTasks);

    if (alreadyLoggedToday) return;

    const historyItem: HistoryItem = {
      id: `${taskId}-${now.getTime()}`,
      taskId,
      title: task.title,
      description: task.description,
      category: task.category,
      priority: task.priority,
      completedAt: now.toISOString(),
    };

    await saveHistory([historyItem, ...history]);
  } catch (error) {
    console.error('Error completing task:', error);
  }
};

export const deleteTask = async (taskId: string): Promise<void> => {
  try {
    const tasks = await getAllTasks();
    await saveAllTasks(tasks.filter(task => task.id !== taskId));
  } catch (error) {
    console.error('Error deleting task:', error);
  }
};

export const getTodayTasks = async (): Promise<Task[]> => {
  try {
    const tasks = await getAllTasks();
    const today = toLocalDateString(new Date());

    return tasks.filter(task => {
      if (task.repeatType === 'daily') {
        return task.lastCompletedDate !== today;
      }

      if (task.isCompleted) return false;

      return toLocalDateString(new Date(task.reminderTime)) <= today;
    });
  } catch (error) {
    console.error('Error getting today tasks:', error);
    return [];
  }
};

export const getUpcomingTasks = async (): Promise<Task[]> => {
  try {
    const tasks = await getAllTasks();
    const today = toLocalDateString(new Date());

    return tasks.filter(task => {
      if (task.isCompleted || task.repeatType === 'daily') return false;
      return toLocalDateString(new Date(task.reminderTime)) > today;
    });
  } catch (error) {
    console.error('Error getting upcoming tasks:', error);
    return [];
  }
};

export const getAllPendingTasks = async (): Promise<Task[]> => {
  try {
    const tasks = await getAllTasks();
    const today = toLocalDateString(new Date());

    return tasks.filter(task => {
      if (task.repeatType === 'daily') {
        return task.lastCompletedDate !== today;
      }

      return !task.isCompleted;
    });
  } catch (error) {
    console.error('Error getting pending tasks:', error);
    return [];
  }
};

export const getHistory = async (): Promise<HistoryItem[]> => {
  try {
    const history = dedupeHistory(await readHistory());

    return history.sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );
  } catch (error) {
    console.error('Error getting history:', error);
    return [];
  }
};