
// src/services/websocketService.ts
import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { Alert } from './alertService';

export interface PackageUpdatePayload {
  packageId: string;
  status: string;
  lat?: number;
  lon?: number;
  lastUpdated: Date;
  note?: string;
  eta?: Date;
  isActive: boolean;
}

export class WebSocketService {
  private connectedClients = new Set<Socket>();

  constructor(private io: SocketIOServer) {}

  initialize(): void {
    this.io.on('connection', (socket: Socket) => {
      this.connectedClients.add(socket);
      logger.info(`Client connected: ${socket.id}`);

      // Handle client joining dispatcher room
      socket.on('join_dispatcher', () => {
        socket.join('dispatchers');
        logger.info(`Client ${socket.id} joined dispatchers room`);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.connectedClients.delete(socket);
        logger.info(`Client disconnected: ${socket.id}`);
      });

      // Send current connection count
      socket.emit('connection_established', {
        connectedClients: this.connectedClients.size,
        timestamp: new Date()
      });
    });
  }

  emitPackageUpdate(update: PackageUpdatePayload): void {
    this.io.to('dispatchers').emit('package_updated', {
      ...update,
      timestamp: new Date()
    });
    
    logger.info(`Emitted package update for ${update.packageId} to ${this.connectedClients.size} clients`);
  }

  emitAlert(alert: Alert): void {
    this.io.to('dispatchers').emit('new_alert', alert);
    logger.info(`Emitted alert ${alert.id} to dispatchers`);
  }

  broadcastMessage(event: string, data: any): void {
    this.io.emit(event, data);
  }

  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }
}