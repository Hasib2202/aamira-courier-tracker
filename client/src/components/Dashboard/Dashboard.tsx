// src/components/Dashboard/Dashboard.tsx
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Filter,
  AlertTriangle,
  Package,
  Clock,
  MapPin,
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import clsx from "clsx";

import { packageApi } from "../../api/packageApi";
import { useWebSocket } from "../../hooks/useWebSocket";
import { useAlerts } from "../../contexts/AlertContext";
import { PackageStatus, Package as PackageType } from "../../types/package";
import { LoadingSpinner } from "../UI/LoadingSpinner";
import { ErrorBoundary } from "../UI/ErrorBoundary";

const STATUS_COLORS: Record<PackageStatus, string> = {
  [PackageStatus.CREATED]: "bg-gray-100 text-gray-800",
  [PackageStatus.PICKED_UP]: "bg-blue-100 text-blue-800",
  [PackageStatus.IN_TRANSIT]: "bg-yellow-100 text-yellow-800",
  [PackageStatus.OUT_FOR_DELIVERY]: "bg-orange-100 text-orange-800",
  [PackageStatus.DELIVERED]: "bg-green-100 text-green-800",
  [PackageStatus.EXCEPTION]: "bg-red-100 text-red-800",
  [PackageStatus.CANCELLED]: "bg-gray-100 text-gray-800",
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

interface DashboardFilters {
  search: string;
  status: PackageStatus | "all";
  activeOnly: boolean;
}

interface PackagesResponse {
  packages: PackageType[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export function Dashboard() {
  const [filters, setFilters] = useState<DashboardFilters>({
    search: "",
    status: "all",
    activeOnly: true,
  });

  const { alerts } = useAlerts();

  // React Query v5 - removed onSuccess callback, using useEffect instead
  const {
    data: packagesData,
    isLoading,
    error,
    refetch,
  } = useQuery<PackagesResponse>({
    queryKey: ["packages", filters],
    queryFn: () =>
      packageApi.getPackages({
        search: filters.search || undefined,
        status: filters.status !== "all" ? filters.status : undefined,
        active_only: filters.activeOnly,
        limit: 100,
      }),
    refetchInterval: 30000,
    // onSuccess removed - React Query v5 doesn't support it
  });

  const packages = packagesData?.packages || [];

  // Handle real-time package updates via WebSocket
  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage?.type === "package_updated") {
      const updatedPackage = lastMessage.data;
      refetch(); // Refresh data when updates come through
    }
  }, [lastMessage, refetch]);

  const handleFilterChange = (newFilters: Partial<DashboardFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const stuckPackages = packages.filter((pkg: PackageType) => {
    const thirtyMinutes = 30 * 60 * 1000;
    return pkg.timeSinceLastUpdate > thirtyMinutes && pkg.isActive;
  });

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <p className="text-gray-600 mb-4">Failed to load packages</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Aamira Package Tracker
            </h1>
            <p className="text-gray-600 mt-1">
              {packages.length} active packages • {alerts.length} alerts
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">Live Updates</span>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts Banner */}
        {stuckPackages.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h3 className="font-semibold text-red-800">
                {stuckPackages.length} Stuck Package
                {stuckPackages.length !== 1 ? "s" : ""}
              </h3>
            </div>
            <p className="text-red-700 mt-1">
              The following packages haven't been updated in over 30 minutes:
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {stuckPackages.map((pkg: PackageType) => (
                <Link
                  key={pkg.packageId}
                  to={`/package/${pkg.packageId}`}
                  className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm hover:bg-red-200 transition-colors"
                >
                  {pkg.packageId}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search packages..."
                value={filters.search}
                onChange={(e) => handleFilterChange({ search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={filters.status}
                onChange={(e) =>
                  handleFilterChange({
                    status: e.target.value as PackageStatus | "all",
                  })
                }
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="all">All Statuses</option>
                {Object.entries(STATUS_DISPLAY).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Active Only Toggle */}
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filters.activeOnly}
                onChange={(e) =>
                  handleFilterChange({ activeOnly: e.target.checked })
                }
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="text-sm text-gray-700">Active only</span>
            </label>
          </div>
        </div>

        {/* Package List */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <LoadingSpinner />
            </div>
          ) : packages.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600">No packages found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Package ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Seen
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ETA
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {packages.map((pkg: PackageType) => {
                    const isStuck =
                      pkg.timeSinceLastUpdate > 30 * 60 * 1000 && pkg.isActive;

                    return (
                      <tr
                        key={pkg.packageId}
                        className={clsx(
                          "hover:bg-gray-50 transition-colors",
                          isStuck && "bg-red-50 border-l-4 border-red-500"
                        )}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            to={`/package/${pkg.packageId}`}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            {pkg.packageId}
                            {isStuck && (
                              <AlertTriangle className="inline ml-2 h-4 w-4 text-red-500" />
                            )}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={clsx(
                              "inline-flex px-2 py-1 text-xs font-semibold rounded-full",
                              STATUS_COLORS[pkg.currentStatus]
                            )}
                          >
                            {STATUS_DISPLAY[pkg.currentStatus]}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>
                              {formatDistanceToNow(new Date(pkg.lastUpdated))}{" "}
                              ago
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {pkg.currentLat && pkg.currentLon ? (
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-4 w-4" />
                              <span>
                                {pkg.currentLat.toFixed(4)},{" "}
                                {pkg.currentLon.toFixed(4)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {pkg.eta ? (
                            formatDistanceToNow(new Date(pkg.eta))
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Object.entries(STATUS_DISPLAY).map(([status, label]) => {
            const count = packages.filter(
              (pkg: PackageType) => pkg.currentStatus === status
            ).length;
            return (
              <div
                key={status}
                className="bg-white rounded-lg shadow-sm border p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{label}</p>
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                  </div>
                  <div
                    className={clsx(
                      "w-3 h-3 rounded-full",
                      STATUS_COLORS[status as PackageStatus].split(" ")[0]
                    )}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ErrorBoundary>
  );
}
