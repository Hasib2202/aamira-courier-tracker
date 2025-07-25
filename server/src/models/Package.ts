import mongoose, { Document, Schema } from 'mongoose';

// Package status enum
export enum PackageStatus {
  CREATED = 'CREATED',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  EXCEPTION = 'EXCEPTION',
  CANCELLED = 'CANCELLED'
}

// Terminal statuses that mark a package as inactive
export const TERMINAL_STATUSES = [PackageStatus.DELIVERED, PackageStatus.CANCELLED];

// Package Event interface
export interface IPackageEvent extends Document {
  packageId: string;
  status: PackageStatus;
  lat?: number;
  lon?: number;
  eventTimestamp: Date;
  receivedAt: Date;
  note?: string;
  eta?: Date;
  eventHash: string;
}

// Package interface
export interface IPackage extends Document {
  packageId: string;
  currentStatus: PackageStatus;
  currentLat?: number;
  currentLon?: number;
  lastUpdated: Date;
  eta?: Date;
  createdAt: Date;
  isActive: boolean;
  events: IPackageEvent[];
}

// Package Event Schema
const PackageEventSchema = new Schema<IPackageEvent>({
  packageId: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: Object.values(PackageStatus),
    required: true
  },
  lat: {
    type: Number,
    min: -90,
    max: 90
  },
  lon: {
    type: Number,
    min: -180,
    max: 180
  },
  eventTimestamp: {
    type: Date,
    required: true
  },
  receivedAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  note: {
    type: String,
    maxlength: 500
  },
  eta: {
    type: Date
  },
  eventHash: {
    type: String,
    required: true,
    unique: true
  }
}, {
  timestamps: true
});

// Package Schema
const PackageSchema = new Schema<IPackage>({
  packageId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  currentStatus: {
    type: String,
    enum: Object.values(PackageStatus),
    required: true,
    default: PackageStatus.CREATED
  },
  currentLat: {
    type: Number,
    min: -90,
    max: 90
  },
  currentLon: {
    type: Number,
    min: -180,
    max: 180
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
    required: true
  },
  eta: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

// Virtual for events
PackageSchema.virtual('events', {
  ref: 'PackageEvent',
  localField: 'packageId',
  foreignField: 'packageId',
  options: { sort: { eventTimestamp: -1 } }
});

// Update isActive based on status
PackageSchema.pre('save', function(next) {
  this.isActive = !TERMINAL_STATUSES.includes(this.currentStatus);
  next();
});

// Indexes for performance
PackageSchema.index({ isActive: 1, lastUpdated: -1 });
PackageSchema.index({ currentStatus: 1 });
PackageEventSchema.index({ packageId: 1, eventTimestamp: -1 });
PackageEventSchema.index({ receivedAt: -1 });

export const Package = mongoose.model<IPackage>('Package', PackageSchema);
export const PackageEvent = mongoose.model<IPackageEvent>('PackageEvent', PackageEventSchema);