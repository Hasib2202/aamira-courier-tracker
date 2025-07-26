// src/components/PackageDetail/PackageDetail.tsx
import React from "react";
import { useParams, Link } from "react-router-dom";
// import { useQuery } from 'react-query';
import {
  ArrowLeft,
  Package as PackageIcon,
  Clock,
  MapPin,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import clsx from "clsx";

import { packageApi } from "../../api/packageApi";
import { PackageStatus } from "../../types/package";
import { LoadingSpinner } from "../UI/LoadingSpinner";
import { ErrorBoundary } from "../UI/ErrorBoundary";
import LocationMap from "../Map/LocationMap"; // New import
import { useQuery } from "@tanstack/react-query";

const STATUS_COLORS: Record<PackageStatus, string> = {
  [PackageStatus.CREATED]: "bg-gray-100 text-gray-800 border-gray-200",
  [PackageStatus.PICKED_UP]: "bg-blue-100 text-blue-800 border-blue-200",
  [PackageStatus.IN_TRANSIT]: "bg-yellow-100 text-yellow-800 border-yellow-200",
  [PackageStatus.OUT_FOR_DELIVERY]:
    "bg-orange-100 text-orange-800 border-orange-200",
  [PackageStatus.DELIVERED]: "bg-green-100 text-green-800 border-green-200",
  [PackageStatus.EXCEPTION]: "bg-red-100 text-red-800 border-red-200",
  [PackageStatus.CANCELLED]: "bg-gray-100 text-gray-800 border-gray-200",
};

const STATUS_DISPLAY: Record<PackageStatus, string> = {
  [PackageStatus.CREATED]: "Created",
  [PackageStatus.PICKED_UP]: "Picked Up",
  [PackageStatus.IN_TRANSIT]: "In Transit",
  [PackageStatus.OUT_FOR_DELIVERY]: "Out for Delivery",
  [PackageStatus.DELIVERED]: "Delivered",
  [PackageStatus.EXCEPTION]: "Exception",
  [PackageStatus.CANCELLED]: "Cancelled",
};

const STATUS_ICONS: Record<PackageStatus, React.ReactNode> = {
  [PackageStatus.CREATED]: <PackageIcon className="w-4 h-4" />,
  [PackageStatus.PICKED_UP]: <PackageIcon className="w-4 h-4" />,
  [PackageStatus.IN_TRANSIT]: <Clock className="w-4 h-4" />,
  [PackageStatus.OUT_FOR_DELIVERY]: <MapPin className="w-4 h-4" />,
  [PackageStatus.DELIVERED]: <PackageIcon className="w-4 h-4" />,
  [PackageStatus.EXCEPTION]: <AlertTriangle className="w-4 h-4" />,
  [PackageStatus.CANCELLED]: <PackageIcon className="w-4 h-4" />,
};

export function PackageDetail() {
  const { packageId } = useParams<{ packageId: string }>();

  const {
    data: packageDetail,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["package-detail", packageId],
    queryFn: () => packageApi.getPackageDetail(packageId!),
    enabled: !!packageId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !packageDetail) {
    return (
      <div className="py-12 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
        <p className="mb-4 text-gray-600">Failed to load package details</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 mr-4 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
        <Link
          to="/"
          className="px-4 py-2 text-white transition-colors bg-gray-600 rounded-lg hover:bg-gray-700"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const { package: pkg, events } = packageDetail;
  const isStuck = pkg.timeSinceLastUpdate > 30 * 60 * 1000 && pkg.isActive;

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              to="/"
              className="flex items-center space-x-2 text-gray-600 transition-colors hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>

        {/* Package Info Card */}
        <div className="overflow-hidden bg-white border rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="flex items-center space-x-2 text-2xl font-bold text-gray-900">
                  <PackageIcon className="w-6 h-6" />
                  <span>{pkg.packageId}</span>
                  {isStuck && (
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  )}
                </h1>
              </div>
              <div>
                <span
                  className={clsx(
                    "inline-flex px-3 py-1 text-sm font-semibold rounded-full border",
                    STATUS_COLORS[pkg.currentStatus]
                  )}
                >
                  {STATUS_DISPLAY[pkg.currentStatus]}
                </span>
              </div>
            </div>
          </div>

          <div className="px-6 py-4">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <h3 className="mb-1 text-sm font-medium text-gray-500">
                  Last Updated
                </h3>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-900">
                    {formatDistanceToNow(new Date(pkg.lastUpdated))} ago
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {format(new Date(pkg.lastUpdated), "MMM d, yyyy h:mm a")}
                </p>
              </div>

              <div>
                <h3 className="mb-1 text-sm font-medium text-gray-500">
                  Current Location
                </h3>
                {pkg.currentLat && pkg.currentLon ? (
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-900">
                      {pkg.currentLat.toFixed(4)}, {pkg.currentLon.toFixed(4)}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">
                    No location data
                  </span>
                )}
              </div>

              <div>
                <h3 className="mb-1 text-sm font-medium text-gray-500">
                  Estimated Delivery
                </h3>
                {pkg.eta ? (
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-900">
                      {format(new Date(pkg.eta), "MMM d, h:mm a")}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">Not available</span>
                )}
              </div>

              <div>
                <h3 className="mb-1 text-sm font-medium text-gray-500">
                  Status
                </h3>
                <div className="text-sm text-gray-900">
                  {pkg.isActive ? (
                    <span className="text-green-600">Active</span>
                  ) : (
                    <span className="text-gray-600">Completed</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stuck Package Alert */}
          {isStuck && (
            <div className="px-6 py-4 border-t border-red-200 bg-red-50">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="font-semibold text-red-800">Package Stuck</h3>
              </div>
              <p className="mt-1 text-red-700">
                This package hasn't been updated in over 30 minutes (
                {Math.floor(pkg.timeSinceLastUpdate / 60000)} minutes ago).
              </p>
            </div>
          )}
        </div>

        {/* Event Timeline */}
        <div className="bg-white border rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Event Timeline
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {events.length} events recorded
            </p>
          </div>

          <div className="px-6 py-4">
            {events.length === 0 ? (
              <div className="py-8 text-center">
                <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">No events recorded yet</p>
              </div>
            ) : (
              <div className="space-y-6">
                {events.map((event, index) => (
                  <div key={event.eventHash} className="relative">
                    {/* Timeline line */}
                    {index < events.length - 1 && (
                      <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200" />
                    )}

                    <div className="flex items-start space-x-4">
                      {/* Status icon */}
                      <div
                        className={clsx(
                          "flex items-center justify-center w-12 h-12 rounded-full border-2 bg-white",
                          STATUS_COLORS[event.status]
                            .replace("bg-", "border-")
                            .replace("text-", "text-"),
                          "shadow-sm"
                        )}
                      >
                        {STATUS_ICONS[event.status]}
                      </div>

                      {/* Event details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">
                              {STATUS_DISPLAY[event.status]}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {format(
                                new Date(event.eventTimestamp),
                                "MMM d, yyyy h:mm a"
                              )}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-400">
                              Received{" "}
                              {format(new Date(event.receivedAt), "h:mm a")}
                            </p>
                          </div>
                        </div>

                        {/* Additional details */}
                        <div className="mt-2 space-y-2">
                          {event.note && (
                            <p className="p-2 text-sm text-gray-700 rounded bg-gray-50">
                              {event.note}
                            </p>
                          )}

                          {event.lat && event.lon && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <MapPin className="w-4 h-4" />
                              <span>
                                Location: {event.lat.toFixed(4)},{" "}
                                {event.lon.toFixed(4)}
                              </span>
                            </div>
                          )}

                          {event.eta && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Calendar className="w-4 h-4" />
                              <span>
                                ETA:{" "}
                                {format(new Date(event.eta), "MMM d, h:mm a")}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Map Placeholder */}
        {pkg.currentLat && pkg.currentLon && (
          <div className="bg-white border rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Current Location
              </h2>
            </div>
            <div className="flex items-center justify-center h-64 bg-gray-100">
              <div className="text-center">
                <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="text-gray-600">
                  {pkg.currentLat.toFixed(4)}, {pkg.currentLon.toFixed(4)}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Map integration would go here
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
