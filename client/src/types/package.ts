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
  note?: string;
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
  type: 'STUCK_PACKAGE' | 'DELAYED' | 'EXCEPTION';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'courier' | 'dispatcher' | 'admin';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface DashboardFilters {
  search?: string;
  status?: PackageStatus | 'all';
  activeOnly?: boolean;
  limit?: number;
  offset?: number;
}