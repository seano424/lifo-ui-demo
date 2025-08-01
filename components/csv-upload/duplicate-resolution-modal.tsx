'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { AlertTriangle, Package, Plus, X } from 'lucide-react'
import { DuplicateWarning, DuplicateAction, DuplicateResolution } from '@/types/duplicate-detection'
import { useState } from 'react'

interface DuplicateResolutionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  duplicates: DuplicateWarning[]
  onResolve: (resolutions: DuplicateResolution[]) => void
  onCancel: () => void
}

export function DuplicateResolutionModal({
  open,
  onOpenChange,
  duplicates,
  onResolve,
  onCancel,
}: DuplicateResolutionModalProps) {
  const [localDuplicates, setLocalDuplicates] = useState<DuplicateWarning[]>(duplicates)

  const updateAction = (index: number, action: DuplicateAction) => {
    const updated = [...localDuplicates]
    updated[index].action = action
    setLocalDuplicates(updated)
  }

  const handleResolve = () => {
    const resolutions: DuplicateResolution[] = localDuplicates.map(duplicate => ({
      sku: duplicate.sku,
      expiryDate: duplicate.expiryDate,
      action: duplicate.action,
    }))
    onResolve(resolutions)
    onOpenChange(false)
  }

  const handleCancel = () => {
    onCancel()
    onOpenChange(false)
  }

  const getActionColor = (action: DuplicateAction) => {
    switch (action) {
      case 'MERGE':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'ADD_ANYWAY':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'SKIP':
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const totalMerged = localDuplicates.filter(d => d.action === 'MERGE').length
  const totalSeparate = localDuplicates.filter(d => d.action === 'ADD_ANYWAY').length
  const totalSkipped = localDuplicates.filter(d => d.action === 'SKIP').length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <DialogTitle>Duplicate Batches Detected</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            Found <strong>{duplicates.length} items</strong> in your CSV that already exist with the
            same expiry date. Choose how to handle each duplicate below.
          </DialogDescription>
        </DialogHeader>

        {/* Summary Stats */}
        <div className="flex gap-2 mb-4">
          <Badge variant="outline" className={getActionColor('MERGE')}>
            {totalMerged} Merge
          </Badge>
          <Badge variant="outline" className={getActionColor('ADD_ANYWAY')}>
            {totalSeparate} Separate
          </Badge>
          <Badge variant="outline" className={getActionColor('SKIP')}>
            {totalSkipped} Skip
          </Badge>
        </div>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {localDuplicates.map((duplicate, index) => (
            <Card key={`${duplicate.sku}-${duplicate.expiryDate}`} className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h4 className="font-medium text-lg">{duplicate.productName}</h4>
                  <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                    <span>
                      SKU: <code className="bg-muted px-1 rounded">{duplicate.sku}</code>
                    </span>
                    <span>
                      Expires: <strong>{duplicate.expiryDate}</strong>
                    </span>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  Duplicate Found
                </Badge>
              </div>

              {/* Quantity Comparison */}
              <div className="bg-muted/30 p-4 rounded-lg mb-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="font-medium text-sm text-blue-700">📦 Current Inventory</p>
                    <p className="text-2xl font-bold text-blue-800">{duplicate.existingQuantity}</p>
                    <p className="text-xs text-muted-foreground">
                      {duplicate.existingBatchNumbers.length} batch(es):{' '}
                      {duplicate.existingBatchNumbers.join(', ')}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-sm text-green-700">📄 CSV Upload</p>
                    <p className="text-2xl font-bold text-green-800">+{duplicate.newQuantity}</p>
                    <p className="text-xs text-muted-foreground">New batch from CSV</p>
                  </div>
                </div>
              </div>

              {/* Action Selection */}
              <RadioGroup
                value={duplicate.action}
                onValueChange={(value: DuplicateAction) => updateAction(index, value)}
                className="space-y-3"
              >
                <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                  <RadioGroupItem value="MERGE" id={`merge-${index}`} className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor={`merge-${index}`} className="cursor-pointer">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="w-4 h-4 text-blue-600" />
                        <span className="font-medium">Merge quantities</span>
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                          {duplicate.existingQuantity + duplicate.newQuantity} total
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Add new quantity to existing batches. Best for same delivery/shipment.
                      </p>
                    </Label>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                  <RadioGroupItem value="ADD_ANYWAY" id={`add-${index}`} className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor={`add-${index}`} className="cursor-pointer">
                      <div className="flex items-center gap-2 mb-1">
                        <Plus className="w-4 h-4 text-green-600" />
                        <span className="font-medium">Add as separate batch</span>
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                          New batch
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Create new batch with unique batch number. Use for different deliveries.
                      </p>
                    </Label>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                  <RadioGroupItem value="SKIP" id={`skip-${index}`} className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor={`skip-${index}`} className="cursor-pointer">
                      <div className="flex items-center gap-2 mb-1">
                        <X className="w-4 h-4 text-gray-600" />
                        <span className="font-medium">Skip this item</span>
                        <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700">
                          No change
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Don&apos;t import this item. Keep existing inventory unchanged.
                      </p>
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </Card>
          ))}
        </div>

        <DialogFooter className="flex gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel} className="flex-1">
            Cancel Upload
          </Button>
          <Button onClick={handleResolve} className="flex-1 bg-blue-600 hover:bg-blue-700">
            Continue with Selections
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
