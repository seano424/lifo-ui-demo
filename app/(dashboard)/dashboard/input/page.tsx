'use client'

import { useState } from 'react'
import StreamlinedScanningInterface from '@/components/scanning/streamlined-scanning-interface'
import { CSVUploadForm } from '@/components/csv-upload/csv-upload-form'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Scan, Upload } from 'lucide-react'
import { useStoreState } from '@/lib/stores/store-context'

export default function InputPage() {
  const { activeStore: currentStore } = useStoreState()

  return (
    <div className="max-w-screen-lg mx-auto space-y-6">
      <Tabs defaultValue="scan" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="scan" className="flex items-center gap-2">
            <Scan className="w-4 h-4" />
            Barcode Scanning
          </TabsTrigger>
          <TabsTrigger value="csv" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            CSV Bulk Import
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scan" className="mt-6">
          <div className="max-w-screen-sm mx-auto">
            <StreamlinedScanningInterface />
          </div>
        </TabsContent>

        <TabsContent value="csv" className="mt-6">
          <div className="max-w-4xl mx-auto">
            <Card className="p-6 mb-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Bulk Inventory Import</h2>
                <p className="text-muted-foreground">
                  Import hundreds of products at once using CSV files. Perfect for initial setup or
                  large inventory updates.
                </p>
              </div>
            </Card>

            {currentStore ? (
              <CSVUploadForm
                storeId={currentStore.store_id}
                onUploadComplete={result => {
                  console.log('Upload completed:', result)
                }}
              />
            ) : (
              <Card className="p-6">
                <div className="text-center text-muted-foreground">
                  Please select a store to upload inventory data.
                </div>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
