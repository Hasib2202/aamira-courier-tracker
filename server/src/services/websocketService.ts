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
      const clientOrigin = socket.handshake.headers.origin;
      
      logger.info(`Client connected: ${socket.id} from origin: ${clientOrigin}`);

      // Send connection confirmation
      socket.emit('connection_established', {
        connectedClients: this.connectedClients.size,
        timestamp: new Date(),
        clientId: socket.id
      });

      // Handle client joining dispatcher room
      socket.on('join_dispatcher', () => {
        socket.join('dispatchers');
        logger.info(`Client ${socket.id} joined dispatchers room`);
        
        // Confirm room join
        socket.emit('dispatcher_room_joined', {
          timestamp: new Date(),
          clientId: socket.id
        });
      });

      // Handle client joining courier room
      socket.on('join_courier', (data) => {
        const courierId = data?.courierId || 'unknown';
        socket.join(`courier_${courierId}`);
        logger.info(`Client ${socket.id} joined courier room: courier_${courierId}`);
        
        socket.emit('courier_room_joined', {
          courierId,
          timestamp: new Date(),
          clientId: socket.id
        });
      });

      // Handle package status requests
      socket.on('get_package_status', (packageId) => {
        logger.info(`Package status requested for: ${packageId} by client: ${socket.id}`);
        // You can implement package status lookup here
      });

      // Handle ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date() });
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        this.connectedClients.delete(socket);
        logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
      });

      // Handle connection errors
      socket.on('error', (error) => {
        logger.error(`Socket error for client ${socket.id}:`, error);
      });
    });

    // Handle server-level events
    this.io.on('connection_error', (error) => {
      logger.error('WebSocket connection error:', error);
    });

    logger.info('WebSocket service initialized successfully');
  }

  emitPackageUpdate(update: PackageUpdatePayload): void {
    // ✅ FIXED: Ensure proper data structure and validate required fields
    if (!update.packageId || !update.status) {
      logger.error('Invalid package update payload:', update);
      return;
    }

    const updateData = {
      type: 'package_updated',
      data: {
        packageId: update.packageId,
        status: update.status,
        lat: update.lat,
        lon: update.lon,
        lastUpdated: update.lastUpdated,
        note: update.note,
        eta: update.eta,
        isActive: update.isActive
      },
      timestamp: new Date()
    };

    // Emit to dispatchers
    this.io.to('dispatchers').emit('package_updated', updateData);
    
    // Also emit to specific courier if package has courier assignment
    // You can extend this based on your package model
    // if (update.courierId) {
    //   this.io.to(`courier_${update.courierId}`).emit('package_updated', updateData);
    // }
    
    logger.info(`Emitted package update for ${update.packageId} to ${this.connectedClients.size} clients`);
    logger.debug('WebSocket payload:', JSON.stringify(updateData, null, 2));
  }

  emitAlert(alert: Alert): void {
    if (!alert.id || !alert.message) {
      logger.error('Invalid alert payload:', alert);
      return;
    }

    const alertData = {
      type: 'new_alert',
      data: alert,
      timestamp: new Date()
    };

    this.io.to('dispatchers').emit('new_alert', alertData);
    logger.info(`Emitted alert ${alert.id} to dispatchers`);
  }

  // ✅ NEW: Helper method to create proper package update payload
  createPackageUpdatePayload(apiData: any): PackageUpdatePayload {
    return {
      packageId: apiData.package_id || apiData.packageId,
      status: apiData.status,
      lat: apiData.lat,
      lon: apiData.lon,
      lastUpdated: apiData.timestamp ? new Date(apiData.timestamp) : new Date(),
      note: apiData.note,
      eta: apiData.eta ? new Date(apiData.eta) : undefined,
      isActive: !['DELIVERED', 'CANCELLED'].includes(apiData.status)
    };
  }

  broadcastMessage(event: string, data: any): void {
    const message = {
      type: event,
      data,
      timestamp: new Date()
    };

    this.io.emit(event, message);
    logger.info(`Broadcasted ${event} to all ${this.connectedClients.size} clients`);
  }

  // Send message to specific room
  sendToRoom(room: string, event: string, data: any): void {
    const message = {
      type: event,
      data,
      timestamp: new Date()
    };

    this.io.to(room).emit(event, message);
    logger.info(`Sent ${event} to room: ${room}`);
  }

  // Send message to specific client
  sendToClient(socketId: string, event: string, data: any): void {
    const message = {
      type: event,
      data,
      timestamp: new Date()
    };

    this.io.to(socketId).emit(event, message);
    logger.info(`Sent ${event} to client: ${socketId}`);
  }

  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  // Get list of rooms and their client counts
  getRoomInfo(): Record<string, number> {
    const roomInfo: Record<string, number> = {};
    
    this.io.sockets.adapter.rooms.forEach((sockets, room) => {
      // Skip individual socket rooms (they have the same name as socket ID)
      if (!sockets.has(room)) {
        roomInfo[room] = sockets.size;
      }
    });

    return roomInfo;
  }

  // Health check for WebSocket service
  getHealthStatus() {
    return {
      connected_clients: this.connectedClients.size,
      rooms: this.getRoomInfo(),
      timestamp: new Date()
    };
  }
}