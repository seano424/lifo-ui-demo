'use client'

import { useState } from 'react'
import { useScoringRecommendations } from '@/hooks/use-fastapi-scoring'
import type { ScoringAlert } from '@/hooks/use-fastapi-scoring'
import { useActiveDonationRecipients, useDonationAction } from '@/hooks/use-donations'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, AlertTriangle, Heart, Percent, Clock } from 'lucide-react'

interface ActionableBatchesEnhancedProps {
  storeId: string
}

export function ActionableBatchesEnhanced({ storeId }: ActionableBatchesEnhancedProps) {
  const { data: alertsData, isLoading, error } = useScoringRecommendations(storeId)
  const { recipients } = useActiveDonationRecipients(storeId)
  const donationMutation = useDonationAction()

  const [selectedBatch, setSelectedBatch] = useState<ScoringAlert | null>(null)
  const [selectedRecipient, setSelectedRecipient] = useState<string>('')
  const [donationNotes, setDonationNotes] = useState<string>('')
  const [dialogOpen, setDialogOpen] = useState(false)

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading actionable batches...</span>
        </CardContent>
      </Card>
    )
  }

  if (error || !alertsData) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load scoring recommendations. Please try again.
        </AlertDescription>
      </Alert>
    )
  }

  const batches = alertsData?.alerts || []
  const summary = alertsData?.summary

  if (batches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Actionable Batches</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No immediate actions required! All batches are within safe scoring thresholds.
          </p>
        </CardContent>
      </Card>
    )
  }

  const handleDonation = (batch: ScoringAlert) => {
    setSelectedBatch(batch)
    setSelectedRecipient('')
    setDonationNotes('')
    setDialogOpen(true)
  }

  const handleExecuteDonation = async () => {
    if (!selectedBatch || !selectedRecipient) return

    try {
      await donationMutation.mutateAsync({
        batchId: selectedBatch.batch_id,
        recipientId: selectedRecipient,
        notes: donationNotes || undefined,
      })
      setDialogOpen(false)
    } catch (error) {
      // Error handling is done in the mutation
      console.error(error)
    }
  }

  const getUrgencyColor = (urgencyLevel: string) => {
    switch (urgencyLevel) {
      case 'critical':
        return 'destructive'
      case 'high':
        return 'default'
      case 'medium':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getActionIcon = (recommendation: string) => {
    if (recommendation.toLowerCase().includes('discount')) return <Percent className="h-4 w-4" />
    if (recommendation.toLowerCase().includes('donate')) return <Heart className="h-4 w-4" />
    if (
      recommendation.toLowerCase().includes('urgent') ||
      recommendation.toLowerCase().includes('remove')
    )
      return <AlertTriangle className="h-4 w-4" />
    return <Clock className="h-4 w-4" />
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            Scoring-Based Recommendations ({summary?.total_alerts || batches.length})
          </CardTitle>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>Critical: {summary?.critical_count || 0}</span>
            <span>High: {summary?.high_count || 0}</span>
            <span>Medium: {summary?.medium_count || 0}</span>
            <span>Low: {summary?.low_count || 0}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {batches.map(batch => (
              <div key={batch.batch_id} className="border rounded-lg p-4 space-y-3">
                {/* Batch header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{batch.product_name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {batch.category}
                      </Badge>
                      <Badge variant={getUrgencyColor(batch.urgency_level)}>
                        {batch.urgency_level}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Qty: {batch.quantity}</span>
                      <span>{batch.days_to_expiry} days to expiry</span>
                      <span>Loss Risk: €{batch.potential_loss.toFixed(0)}</span>
                      <span>Score: {Math.round(batch.priority_score)}</span>
                    </div>
                  </div>

                  <Badge variant="secondary">
                    Score: {Math.round(batch.composite_score * 100)}%
                  </Badge>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="default" className="gap-2">
                    {getActionIcon(batch.recommendation)}
                    {batch.recommendation}
                  </Button>

                  {batch.recommendation.toLowerCase().includes('donate') && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => handleDonation(batch)}
                      disabled={recipients.length === 0}
                    >
                      <Heart className="h-4 w-4" />
                      Execute Donation
                    </Button>
                  )}

                  {/* Always show a manual donate option for categories suitable for donation */}
                  {!batch.recommendation.toLowerCase().includes('donate') &&
                    (batch.category?.toLowerCase().includes('bread') ||
                      batch.category?.toLowerCase().includes('produce') ||
                      batch.category?.toLowerCase().includes('bakery')) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-2"
                        onClick={() => handleDonation(batch)}
                        disabled={recipients.length === 0}
                      >
                        <Heart className="h-4 w-4" />
                        Donate Instead
                      </Button>
                    )}
                </div>

                {/* Scoring system recommendation details */}
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>Scoring Recommendation:</strong> {batch.recommendation}
                    <span className="ml-2 text-muted-foreground">
                      • Urgency: {batch.urgency_level} • Score:{' '}
                      {(batch.composite_score * 100).toFixed(0)}%
                    </span>
                  </AlertDescription>
                </Alert>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Donation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Donate Batch</DialogTitle>
            <DialogDescription>
              Select a recipient for {selectedBatch?.product_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Batch details */}
            {selectedBatch && (
              <div className="bg-muted p-3 rounded-lg">
                <h4 className="font-medium">{selectedBatch.product_name}</h4>
                <p className="text-sm text-muted-foreground">
                  Quantity: {selectedBatch.current_quantity} • Expires:{' '}
                  {new Date(selectedBatch.expiry_date).toLocaleDateString()}
                </p>
              </div>
            )}

            {/* Recipient selection */}
            <div className="space-y-2">
              <Label>Select Donation Recipient</Label>
              <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a recipient..." />
                </SelectTrigger>
                <SelectContent>
                  {recipients.map(recipient => (
                    <SelectItem key={recipient.recipient_id} value={recipient.recipient_id}>
                      <div>
                        <div className="font-medium">{recipient.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {recipient.recipient_type} •{' '}
                          {recipient.is_certified ? 'Certified' : 'Not certified'}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={donationNotes}
                onChange={e => setDonationNotes(e.target.value)}
                placeholder="Add any notes about this donation..."
                rows={3}
              />
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleExecuteDonation}
                disabled={!selectedRecipient || donationMutation.isPending}
              >
                {donationMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Confirm Donation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
