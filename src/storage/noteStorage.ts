import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTES_KEY = 'notes';

export interface Note {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
  createdAt: string;
}

const parseJson = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error('Error parsing stored notes:', error);
    return fallback;
  }
};

export const getAllNotes = async (): Promise<Note[]> => {
  try {
    const data = await AsyncStorage.getItem(NOTES_KEY);
    const notes = parseJson<Note[]>(data, []);
    
    return notes.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch (error) {
    console.error('Error getting notes:', error);
    return [];
  }
};

export const getNoteById = async (id: string): Promise<Note | undefined> => {
  const notes = await getAllNotes();
  return notes.find(n => n.id === id);
};

const saveAllNotes = async (notes: Note[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  } catch (error) {
    console.error('Error saving notes array:', error);
  }
};

export const saveNote = async (
  noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Note | undefined> => {
  try {
    const existingNotes = await getAllNotes();
    const now = new Date().toISOString();

    const newNote: Note = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: noteData.title,
      body: noteData.body,
      createdAt: now,
      updatedAt: now,
    };

    await saveAllNotes([newNote, ...existingNotes]);
    return newNote;
  } catch (error) {
    console.error('Error saving new note:', error);
  }
};

export const updateNote = async (
  id: string,
  updates: Partial<Omit<Note, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Note | undefined> => {
  try {
    const existingNotes = await getAllNotes();
    let updatedNote: Note | undefined;

    const newNotes = existingNotes.map(note => {
      if (note.id === id) {
        updatedNote = {
          ...note,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        return updatedNote;
      }
      return note;
    });

    if (updatedNote) {
      await saveAllNotes(newNotes);
    }
    
    return updatedNote;
  } catch (error) {
    console.error('Error updating note:', error);
  }
};

export const deleteNote = async (id: string): Promise<void> => {
  try {
    const existingNotes = await getAllNotes();
    const filtered = existingNotes.filter(note => note.id !== id);
    await saveAllNotes(filtered);
  } catch (error) {
    console.error('Error deleting note:', error);
  }
};
