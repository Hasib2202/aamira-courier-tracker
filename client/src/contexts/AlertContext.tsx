// client/src/contexts/AlertContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Alert {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
}

interface AlertContextType {
  alerts: Alert[];
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp'>) => void;
  removeAlert: (id: string) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const addAlert = (alert: Omit<Alert, 'id' | 'timestamp'>) => {
    const newAlert: Alert = {
      ...alert,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    };
    setAlerts(prev => [...prev, newAlert]);

    // Auto remove after 5 seconds
    setTimeout(() => {
      removeAlert(newAlert.id);
    }, 5000);
  };

  const removeAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  return (
    <AlertContext.Provider value={{ alerts, addAlert, removeAlert }}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlerts = () => {
  const context = useContext(AlertContext);
  if (context === undefined) {
    // Fallback for when context is not available
    return {
      alerts: [],
      addAlert: () => {},
      removeAlert: () => {}
    };
  }
  return context;
};