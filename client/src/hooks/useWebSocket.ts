// src/hooks/useWebSocket.ts
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { Alert } from '../types/package';

interface WebSocketMessage {
  type: string;
  data: unknown;
}

export function useWebSocket(url?: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!url) return;

    const socket = io(url.replace('ws://', 'http://').replace('wss://', 'https://'), {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join_dispatcher');
      toast.success('Connected to live updates');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      toast.error('Disconnected from live updates');
    });

    socket.on('package_updated', (message: any) => {
      // Backend sends: { type: 'package_updated', data: { packageId, status, ... }, timestamp }
      const packageData = message.data;
      
      setLastMessage({ type: 'package_updated', data: packageData });
      
      if (packageData?.packageId && packageData?.status) {
        const formattedStatus = packageData.status.replace(/_/g, ' ').toLowerCase()
          .split(' ')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        toast.success(`Package ${packageData.packageId} updated to ${formattedStatus}`, {
          duration: 4000
        });
      }
    });

    socket.on('new_alert', (message: any) => {
      const alertData = message.data as Alert;
      
      setLastMessage({ type: 'new_alert', data: alertData });
      
      if (alertData?.message) {
        toast.error(`Alert: ${alertData.message}`, { duration: 6000 });
      }
    });

    socket.on('connection_established', (data) => {
      console.log('WebSocket connection established:', data);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [url]);

  return {
    isConnected,
    lastMessage,
    socket: socketRef.current,
  };
}