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

    // Connect to WebSocket
    const socket = io(url.replace('ws://', 'http://'), {
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

    socket.on('package_updated', (data) => {
      setLastMessage({ type: 'package_updated', data });
      toast.success(`Package ${data.packageId} updated to ${data.status}`);
    });

    socket.on('new_alert', (alert: Alert) => {
      setLastMessage({ type: 'new_alert', data: alert });
      toast.error(`Alert: ${alert.message}`, { duration: 6000 });
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