'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react'
import { sampleBatchPerformance } from '@/lib/sample-data'

export function BatchAnalytics() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Batch Performance Analytics
        </CardTitle>
        <CardDescription>
          Track which expiration date batches are performing well vs poorly
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {sampleBatchPerformance.map(batch => (
            <div key={batch.batchId} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium">{batch.productName}</h4>
                  <p className="text-sm text-muted-foreground">
                    Batch: {batch.batchId} • Expires:{' '}
                    {new Date(batch.expirationDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={`${
                      batch.wasteReduction >= 70
                        ? 'bg-green-100 text-green-800 border-green-200'
                        : batch.wasteReduction >= 50
                          ? 'bg-orange-100 text-orange-800 border-orange-200'
                          : 'bg-red-100 text-red-800 border-red-200'
                    }`}
                  >
                    {batch.wasteReduction >= 70 ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : batch.wasteReduction >= 50 ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {batch.wasteReduction}% saved
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{batch.soldQuantity}</div>
                  <div className="text-xs text-muted-foreground">Sold</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{batch.discountedQuantity}</div>
                  <div className="text-xs text-muted-foreground">Discounted</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{batch.donatedQuantity}</div>
                  <div className="text-xs text-muted-foreground">Donated</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{batch.expiredQuantity}</div>
                  <div className="text-xs text-muted-foreground">Expired</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Waste Reduction Progress</span>
                  <span>{batch.wasteReduction}%</span>
                </div>
                <Progress value={batch.wasteReduction} className="h-2" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
