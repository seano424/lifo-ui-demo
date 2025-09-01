'use client'

import { Keyboard, Scan, Upload } from 'lucide-react'
import { CSVUploadForm } from '@/components/csv-upload/csv-upload-form'
import ManualInboundEntry from '@/components/inbound/manual-inbound-entry'
import ScanningInterface from '@/components/scanning/standalone-scanning-interface'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMediaQuery } from '@/hooks/use-mobile'
import { useStoreState } from '@/lib/stores/store-context'

export default function InboundPage() {
  const { activeStore: currentStore } = useStoreState()
  const { isTablet, isMobile } = useMediaQuery()

  return (
    <div className="space-y-6">
      {/* Mobile Tabs */}
      <Tabs
        defaultValue="scan"
        className="w-full lg:hidden"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger
            value="scan"
            className="flex items-center gap-2"
          >
            <Scan className="w-4 h-4 stroke-2 border-2 rounded-full p-[2px] bg-primary-100" />
            Barcode Scanning
          </TabsTrigger>
          <TabsTrigger
            value="csv"
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4 stroke-2 border-2  rounded-full p-[2px] bg-primary-100" />
            CSV Bulk Import
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="scan"
          className="mt-6"
        >
          <div className="max-w-2xl mx-auto">
            {(isMobile || isTablet) && <ScanningInterface />}
          </div>
        </TabsContent>

        <TabsContent
          value="csv"
          className="mt-6"
        >
          <div className="max-w-4xl mx-auto">
            {currentStore ? (
              <CSVUploadForm
                storeId={currentStore.store_id}
                onUploadComplete={(result) => {
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

      {/* Desktop Tabs for Manual Entry and CSV Import */}
      <div className="hidden lg:block max-w-6xl mx-auto">
        <Tabs
          defaultValue="manual"
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 max-w-xl mx-auto">
            <TabsTrigger
              value="manual"
              className="flex items-center gap-2"
            >
              <Keyboard className="w-4 h-4" />
              Manual Entry
            </TabsTrigger>
            <TabsTrigger
              value="csv"
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              CSV Bulk Import
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="manual"
            className="mt-6"
          >
            <div className="max-w-6xl mx-auto">
              {currentStore ? (
                <ManualInboundEntry
                  storeId={currentStore.store_id}
                  onBatchSubmitted={(result) => {
                    console.log('Batch submitted:', result)
                  }}
                />
              ) : (
                <Card className="p-6">
                  <div className="text-center text-muted-foreground">
                    Please select a store to add inventory.
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent
            value="csv"
            className="mt-6"
          >
            <div className="max-w-4xl mx-auto">
              {currentStore ? (
                <CSVUploadForm
                  storeId={currentStore.store_id}
                  onUploadComplete={(result) => {
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
    </div>
  )
}
