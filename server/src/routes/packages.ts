import { Router, Request, Response } from 'express';
import Joi from 'joi';
import crypto from 'crypto';
import { Package, PackageEvent, PackageStatus, TERMINAL_STATUSES } from '../models/Package';
import { logger } from '../utils/logger';
import { WebSocketService } from '../services/websocketService';

const router = Router();

// Validation schemas
const packageUpdateSchema = Joi.object({
  package_id: Joi.string().required().max(100),
  status: Joi.string().valid(...Object.values(PackageStatus)).required(),
  lat: Joi.number().min(-90).max(90).optional(),
  lon: Joi.number().min(-180).max(180).optional(),
  timestamp: Joi.date().iso().required(),
  note: Joi.string().max(500).optional(),
  eta: Joi.date().iso().optional()
});

const querySchema = Joi.object({
  status: Joi.string().valid(...Object.values(PackageStatus)).optional(),
  active_only: Joi.boolean().optional(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
  search: Joi.string().max(100).optional()
});

export function packageRoutes(websocketService: WebSocketService): Router {
  
  // F1: Ingest Courier Updates
  router.post('/update', async (req: Request, res: Response) => {
    try {
      // Validate input
      const { error, value } = packageUpdateSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
      }

      const {
        package_id,
        status,
        lat,
        lon,
        timestamp,
        note,
        eta
      } = value;

      // Create event hash for idempotency
      const eventData = `${package_id}-${status}-${timestamp}-${lat}-${lon}-${note || ''}`;
      const eventHash = crypto.createHash('sha256').update(eventData).digest('hex');

      // Check if event already exists (idempotency)
      const existingEvent = await PackageEvent.findOne({ eventHash });
      if (existingEvent) {
        logger.info(`Duplicate event ignored: ${eventHash}`);
        return res.json({
          message: 'Event already processed',
          packageId: package_id,
          eventId: existingEvent._id
        });
      }

      const eventTimestamp = new Date(timestamp);
      const receivedAt = new Date();

      // Get current package state
      let package_ = await Package.findOne({ packageId: package_id });
      
      // Handle out-of-order events
      if (package_ && eventTimestamp < package_.lastUpdated) {
        logger.warn(`Out-of-order event for package ${package_id}: ${eventTimestamp} < ${package_.lastUpdated}`);
        
        // Store event but don't update current state
        const event = new PackageEvent({
          packageId: package_id,
          status,
          lat,
          lon,
          eventTimestamp,
          receivedAt,
          note,
          eta,
          eventHash
        });
        
        await event.save();
        
        return res.json({
          message: 'Out-of-order event stored in history',
          packageId: package_id,
          eventId: event._id
        });
      }

      // Create or update package
      if (!package_) {
        package_ = new Package({
          packageId: package_id,
          currentStatus: status,
          currentLat: lat,
          currentLon: lon,
          lastUpdated: eventTimestamp,
          eta
        });
      } else {
        package_.currentStatus = status;
        package_.currentLat = lat || package_.currentLat;
        package_.currentLon = lon || package_.currentLon;
        package_.lastUpdated = eventTimestamp;
        if (eta) package_.eta = eta;
      }

      // Save package and event
      await package_.save();
      
      const event = new PackageEvent({
        packageId: package_id,
        status,
        lat,
        lon,
        eventTimestamp,
        receivedAt,
        note,
        eta,
        eventHash
      });
      
      await event.save();

      logger.info(`Package ${package_id} updated to ${status}`);

      // Emit real-time update
      websocketService.emitPackageUpdate({
        packageId: package_id,
        status,
        lat,
        lon,
        lastUpdated: eventTimestamp,
        note,
        eta,
        isActive: !TERMINAL_STATUSES.includes(status as PackageStatus)
      });

      res.json({
        message: 'Package updated successfully',
        packageId: package_id,
        eventId: event._id
      });

    } catch (error) {
      logger.error('Error updating package:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update package'
      });
    }
  });

  // F3: Get Active Packages (Dashboard View)
  router.get('/', async (req: Request, res: Response) => {
    try {
      const { error, value } = querySchema.validate(req.query);
      if (error) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
      }

      const { status, active_only = true, limit, offset, search } = value;

      // Build query
      const query: any = {};
      
      if (active_only) {
        query.isActive = true;
        // Show packages from last 24 hours
        const yesterday = new Date();
        yesterday.setHours(yesterday.getHours() - 24);
        query.lastUpdated = { $gte: yesterday };
      }
      
      if (status) {
        query.currentStatus = status;
      }
      
      if (search) {
        query.packageId = { $regex: search, $options: 'i' };
      }

      // Get packages with pagination
      const packages = await Package.find(query)
        .sort({ lastUpdated: -1 })
        .limit(limit)
        .skip(offset)
        .lean();

      const total = await Package.countDocuments(query);

      // Add time since last update
      const packagesWithTimeSince = packages.map(pkg => ({
        ...pkg,
        timeSinceLastUpdate: Date.now() - new Date(pkg.lastUpdated).getTime()
      }));

      res.json({
        packages: packagesWithTimeSince,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      });

    } catch (error) {
      logger.error('Error fetching packages:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch packages'
      });
    }
  });

  // Get Package Details with History
  router.get('/:packageId', async (req: Request, res: Response) => {
    try {
      const { packageId } = req.params;

      const package_ = await Package.findOne({ packageId }).lean();
      if (!package_) {
        return res.status(404).json({
          error: 'Package not found',
          packageId
        });
      }

      // Get event history
      const events = await PackageEvent.find({ packageId })
        .sort({ eventTimestamp: -1 })
        .lean();

      res.json({
        package: {
          ...package_,
          timeSinceLastUpdate: Date.now() - new Date(package_.lastUpdated).getTime()
        },
        events
      });

    } catch (error) {
      logger.error('Error fetching package details:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch package details'
      });
    }
  });

  return router;
}