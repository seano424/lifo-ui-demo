'use client'

import { Card } from '@/components/ui/card'
import { Scan, Upload } from 'lucide-react'
import { useStoreState } from '@/lib/stores/store-context'
import { CSVUploadForm } from '@/components/csv-upload/csv-upload-form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import StreamlinedScanningInterface from '@/components/scanning/streamlined-scanning-interface'

export default function InboundPage() {
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
