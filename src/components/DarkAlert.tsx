import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertConfig {
  title: string;
  message?: string;
  buttons?: AlertButton[];
}

interface AlertState extends AlertConfig {
  visible: boolean;
}

type Listener = (state: AlertState) => void;
let globalListener: Listener | null = null;

export const darkAlert = (
  title: string,
  message?: string,
  buttons?: AlertButton[]
) => {
  if (globalListener) {
    globalListener({
      visible: true,
      title,
      message,
      buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'OK', style: 'default' }],
    });
  }
};

export const DarkAlertHost: React.FC = () => {
  const [state, setState] = useState<AlertState>({
    visible: false,
    title: '',
    message: '',
    buttons: [],
  });

  useEffect(() => {
    globalListener = setState;
    return () => {
      globalListener = null;
    };
  }, []);

  const closeAlert = (callback?: () => void) => {
    setState(prev => ({ ...prev, visible: false }));
    if (callback) {
      setTimeout(callback, 100);
    }
  };

  if (!state.visible) return null;

  return (
    <Modal
      transparent
      visible={state.visible}
      animationType="fade"
      onRequestClose={() => closeAlert()}
    >
      <Pressable style={styles.overlay} onPress={() => closeAlert()}>
        <Pressable style={styles.dialog} onPress={e => e.stopPropagation()}>
          <Text style={styles.title}>{state.title}</Text>
          {state.message ? <Text style={styles.message}>{state.message}</Text> : null}

          {(() => {
            const buttonsList = state.buttons && state.buttons.length > 0
              ? state.buttons
              : [{ text: 'OK', style: 'default' as const }];

            return (
              <View
                style={[
                  styles.buttonsRow,
                  buttonsList.length > 2 && styles.buttonsCol,
                ]}
              >
                {buttonsList.map((btn, index) => {
                  const isCancel = btn.style === 'cancel';
                  const isDestructive = btn.style === 'destructive';

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.button,
                        isCancel && styles.cancelButton,
                        isDestructive && styles.destructiveButton,
                        !isCancel && !isDestructive && styles.defaultButton,
                        buttonsList.length > 2 && { width: '100%', marginBottom: 8 },
                      ]}
                      activeOpacity={0.8}
                      onPress={() => closeAlert(btn.onPress)}
                    >
                      <Text
                        style={[
                          styles.buttonText,
                          isCancel && styles.cancelButtonText,
                          isDestructive && styles.destructiveButtonText,
                          !isCancel && !isDestructive && styles.defaultButtonText,
                        ]}
                      >
                        {btn.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })()}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  dialog: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#161922',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#242A38',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#8E95A5',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 8,
  },
  buttonsCol: {
    flexDirection: 'column',
    gap: 0,
  },
  button: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultButton: {
    backgroundColor: '#3B82F6',
  },
  cancelButton: {
    backgroundColor: '#1E2430',
    borderWidth: 1,
    borderColor: '#2A3242',
  },
  destructiveButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  defaultButtonText: {
    color: '#FFFFFF',
  },
  cancelButtonText: {
    color: '#8E95A5',
  },
  destructiveButtonText: {
    color: '#EF4444',
  },
});
