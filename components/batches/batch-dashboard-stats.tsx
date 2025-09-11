'use client'

import {
  Activity,
  AlertTriangle,
  BarChart3,
  Calendar,
  DollarSign,
  Package,
  TrendingDown,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { useBatchAlerts, useBatchSummary } from '@/hooks/use-batches'

export function BatchDashboardStats() {
  const { totalBatches, activeBatches, expiredBatches, totalStock, totalValue } = useBatchSummary()

  const {
    expiringBatches,
    lowStockBatches,
    hasAlerts,
    isLoading: isLoadingAlerts,
  } = useBatchAlerts()

  const stats = [
    {
      title: 'Total Batches',
      value: totalBatches,
      icon: Package,
      description: `${activeBatches} active, ${expiredBatches} expired`,
      trend: activeBatches > expiredBatches ? 'positive' : 'neutral',
    },
    {
      title: 'Total Stock',
      value: totalStock.toLocaleString(),
      icon: BarChart3,
      description: 'Units across all batches',
      trend: 'neutral',
    },
    {
      title: 'Inventory Value',
      value: `$${totalValue.toLocaleString()}`,
      icon: DollarSign,
      description: 'Based on cost prices',
      trend: 'positive',
    },
    {
      title: 'Expiring Soon',
      value: expiringBatches?.length || 0,
      icon: Calendar,
      description: 'Within 7 days',
      trend: (expiringBatches?.length || 0) > 0 ? 'negative' : 'positive',
      alert: (expiringBatches?.length || 0) > 0,
    },
    {
      title: 'Low Stock',
      value: lowStockBatches?.length || 0,
      icon: TrendingDown,
      description: 'Below threshold',
      trend: (lowStockBatches?.length || 0) > 0 ? 'negative' : 'positive',
      alert: (lowStockBatches?.length || 0) > 0,
    },
    {
      title: 'Active Status',
      value: hasAlerts ? 'Alerts' : 'Good',
      icon: Activity,
      description: hasAlerts ? 'Requires attention' : 'All systems normal',
      trend: hasAlerts ? 'negative' : 'positive',
      alert: hasAlerts,
    },
  ]

  const getTrendColor = (trend: string, alert?: boolean) => {
    if (alert) return 'text-red-600'
    switch (trend) {
      case 'positive':
        return 'text-primary-600'
      case 'negative':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getTrendBg = (trend: string, alert?: boolean) => {
    if (alert) return 'bg-red-50 border-red-200'
    switch (trend) {
      case 'positive':
        return 'bg-primary-50 border-primary-200'
      case 'negative':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  if (isLoadingAlerts) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <Card key={`skeleton-${i + 1}`} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-muted rounded-2xl w-20"></div>
              <div className="h-4 w-4 bg-muted rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded-2xl w-16 mb-1"></div>
              <div className="h-3 bg-muted rounded-2xl w-24"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Alert Banner */}
      {hasAlerts && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div className="flex-1">
                <Typography variant="p" color="muted">
                  Action Required: {expiringBatches?.length || 0} batch(es) expiring soon
                  {(lowStockBatches?.length || 0) > 0 &&
                    `, ${lowStockBatches.length} with low stock`}
                </Typography>
                <Typography variant="p" color="muted">
                  Review your inventory to prevent waste and stockouts
                </Typography>
              </div>
              <Badge variant="outline" className="border-orange-300 text-orange-700">
                {(expiringBatches?.length || 0) + (lowStockBatches?.length || 0)} alerts
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card
              key={stat.title || `stat-${index}`}
              className={`transition-all hover:shadow-md ${getTrendBg(stat.trend, stat.alert)}`}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>
                  <Typography variant="h3">{stat.title}</Typography>
                </CardTitle>
                <Icon className={`h-4 w-4 ${getTrendColor(stat.trend, stat.alert)}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getTrendColor(stat.trend, stat.alert)}`}>
                  {stat.value}
                  {stat.alert && (
                    <Badge variant="destructive" className="ml-2 text-xs">
                      !
                    </Badge>
                  )}
                </div>
                <Typography variant="p" color="muted">
                  {stat.description}
                </Typography>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions for Alerts */}
      {hasAlerts && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {(expiringBatches?.length || 0) > 0 && (
                <div className="space-y-2">
                  <Typography variant="h4" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Expiring Batches ({expiringBatches?.length})
                  </Typography>
                  <div className="space-y-1">
                    {expiringBatches?.slice(0, 3).map(batch => (
                      <div
                        key={batch.batch_id}
                        className="text-sm flex justify-between items-center"
                      >
                        <span className="truncate">{batch.batch_number}</span>
                        <Badge variant="outline" className="text-xs">
                          {new Date(batch.expiry_date).toLocaleDateString()}
                        </Badge>
                      </div>
                    ))}
                    {(expiringBatches?.length || 0) > 3 && (
                      <Typography variant="p" color="muted">
                        +{(expiringBatches?.length || 0) - 3} more
                      </Typography>
                    )}
                  </div>
                </div>
              )}

              {(lowStockBatches?.length || 0) > 0 && (
                <div className="space-y-2">
                  <Typography variant="h4" className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4" />
                    Low Stock Batches ({lowStockBatches?.length})
                  </Typography>
                  <div className="space-y-1">
                    {lowStockBatches?.slice(0, 3).map(batch => (
                      <div
                        key={batch.batch_id}
                        className="text-sm flex justify-between items-center"
                      >
                        <span className="truncate">{batch.batch_number}</span>
                        <Badge variant="outline" className="text-xs">
                          {batch.current_quantity} left
                        </Badge>
                      </div>
                    ))}
                    {(lowStockBatches?.length || 0) > 3 && (
                      <Typography variant="p" color="muted">
                        +{(lowStockBatches?.length || 0) - 3} more
                      </Typography>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
