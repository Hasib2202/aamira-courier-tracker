// src/types/package.ts
export enum PackageStatus {
  CREATED = 'CREATED',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  EXCEPTION = 'EXCEPTION',
  CANCELLED = 'CANCELLED'
}

export interface Package {
  packageId: string;
  currentStatus: PackageStatus;
  currentLat?: number;
  currentLon?: number;
  lastUpdated: string;
  eta?: string;
  isActive: boolean;
  timeSinceLastUpdate: number;
  createdAt: string;
}

export interface PackageEvent {
  packageId: string;
  status: PackageStatus;
  lat?: number;
  lon?: number;
  eventTimestamp: string;
  receivedAt: string;
  note?: string;
  eta?: string;
  eventHash: string;
}

export interface PackageDetail {
  package: Package;
  events: PackageEvent[];
}

export interface Alert {
  id: string;
  packageId: string;
  type: 'STUCK_PACKAGE';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface User {
  email: string;
  role: 'courier' | 'dispatcher';
}




