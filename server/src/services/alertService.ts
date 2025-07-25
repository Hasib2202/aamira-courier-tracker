// src/services/alertService.ts
import { Package, PackageStatus } from '../models/Package';
import { logger } from '../utils/logger';
import { WebSocketService } from './websocketService';

export interface Alert {
  id: string;
  packageId: string;
  type: 'STUCK_PACKAGE';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

export class AlertService {
  private activeAlerts = new Map<string, Alert>();
  private STUCK_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

  constructor(private websocketService: WebSocketService) {}

  async checkStuckPackages(): Promise<void> {
    try {
      const thirtyMinutesAgo = new Date(Date.now() - this.STUCK_THRESHOLD_MS);
      
      // Find active packages that haven't been updated in >30 minutes
      const stuckPackages = await Package.find({
        isActive: true,
        lastUpdated: { $lt: thirtyMinutesAgo },
        currentStatus: { 
          $nin: [PackageStatus.DELIVERED, PackageStatus.CANCELLED] 
        }
      }).lean();

      for (const pkg of stuckPackages) {
        const alertId = `stuck_${pkg.packageId}`;
        
        // Skip if already alerted (avoid spam)
        if (this.activeAlerts.has(alertId)) {
          continue;
        }

        const timeSinceUpdate = Date.now() - new Date(pkg.lastUpdated).getTime();
        const minutesStuck = Math.floor(timeSinceUpdate / 60000);

        const alert: Alert = {
          id: alertId,
          packageId: pkg.packageId,
          type: 'STUCK_PACKAGE',
          message: `Package ${pkg.packageId} has been stuck in ${pkg.currentStatus} status for ${minutesStuck} minutes`,
          timestamp: new Date(),
          acknowledged: false
        };

        this.activeAlerts.set(alertId, alert);
        
        logger.warn(`STUCK PACKAGE ALERT: ${alert.message}`);
        
        // Emit alert to dispatchers
        this.websocketService.emitAlert(alert);
        
        // Mock email notification (F4 requirement)
        this.sendEmailAlert(alert);
      }

      // Clean up resolved alerts
      this.cleanupResolvedAlerts();

    } catch (error) {
      logger.error('Error checking stuck packages:', error);
    }
  }

  private async cleanupResolvedAlerts(): Promise<void> {
    const activePackageIds = new Set(
      (await Package.find({ isActive: true }).select('packageId').lean())
        .map(p => p.packageId)
    );

    for (const [alertId, alert] of this.activeAlerts.entries()) {
      if (!activePackageIds.has(alert.packageId)) {
        this.activeAlerts.delete(alertId);
        logger.info(`Cleaned up resolved alert for package ${alert.packageId}`);
      }
    }
  }

  private sendEmailAlert(alert: Alert): void {
    // Mock SMTP email sending (as mentioned in requirements)
    logger.info(`[MOCK EMAIL] To: dispatcher@aamira.com`);
    logger.info(`[MOCK EMAIL] Subject: STUCK PACKAGE ALERT - ${alert.packageId}`);
    logger.info(`[MOCK EMAIL] Body: ${alert.message}`);
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  acknowledgeAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }
}
