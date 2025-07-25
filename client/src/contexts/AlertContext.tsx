// src/contexts/AlertContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert } from '../types/package';
import { useWebSocket } from '../hooks/useWebSocket';

interface AlertContextType {
  alerts: Alert[];
  acknowledgeAlert: (alertId: string) => void;
  clearAlert: (alertId: string) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage?.type === 'new_alert') {
      const newAlert = lastMessage.data as Alert;
      setAlerts(prev => {
        // Avoid duplicates
        if (prev.some(alert => alert.id === newAlert.id)) {
          return prev;
        }
        return [newAlert, ...prev];
      });
    }
  }, [lastMessage]);

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev =>
      prev.map(alert =>
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      )
    );
  };

  const clearAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  return (
    <AlertContext.Provider value={{ alerts, acknowledgeAlert, clearAlert }}>
      {children}
    </AlertContext.Provider>
  );
}

export function useAlerts() {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlerts must be used within an AlertProvider');
  }
  return context;
}