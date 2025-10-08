'use client'

import { CSVUploadForm } from '@/components/csv-upload/csv-upload-form'
import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import ManualInboundEntry from '@/components/inbound/manual-inbound-entry'
import ScanningInterface from '@/components/scanning/standalone-scanning-interface'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
// import { useMediaQuery } from '@/hooks/use-mobile'
import { useStoreState } from '@/lib/stores/store-context'
import { Keyboard, Scan, Upload } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function InboundPage() {
  const { activeStore: currentStore } = useStoreState()
  // const { isTablet, isMobile } = useMediaQuery()
  const t = useTranslations('dashboard.inbound')

  return (
    <div className="space-y-6">
      <DashboardInsetHeader title={t('title')} description={t('description')} />
      {/* Mobile Tabs */}
      <Tabs defaultValue="scan" className="w-full lg:hidden">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="scan" className="flex items-center gap-2">
            <Scan className="w-4 h-4 stroke-2 border-2 rounded-full p-[2px] bg-primary-100" />
            {t('mobile.barcodeScanning')}
          </TabsTrigger>
          <TabsTrigger value="csv" className="flex items-center gap-2">
            <Upload className="w-4 h-4 stroke-2 border-2  rounded-full p-[2px] bg-primary-100" />
            {t('mobile.csvBulkImport')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scan" className="mt-6">
          <div className="max-w-2xl mx-auto">{<ScanningInterface />}</div>
        </TabsContent>

        <TabsContent value="csv" className="mt-6">
          <div className="max-w-4xl mx-auto">
            {currentStore ? (
              <CSVUploadForm
                storeId={currentStore.store_id}
                onUploadComplete={_result => {
                  // Upload completed
                }}
              />
            ) : (
              <Card className="p-6">
                <div className="text-center text-muted-foreground">{t('messages.selectStore')}</div>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Desktop Tabs for Manual Entry and CSV Import */}
      <div className="hidden lg:block max-w-6xl mx-auto">
        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-xl mx-auto">
            <TabsTrigger value="scan" className="flex items-center gap-2">
              <Scan className="w-4 h-4 stroke-2 border-2 rounded-full p-[2px] bg-primary-100" />
              {t('mobile.barcodeScanning')}
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Keyboard className="w-4 h-4" />
              {t('desktop.manualEntry')}
            </TabsTrigger>
            <TabsTrigger value="csv" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              {t('desktop.csvBulkImport')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scan" className="mt-6">
            <div className="max-w-2xl mx-auto">{<ScanningInterface />}</div>
          </TabsContent>

          <TabsContent value="manual" className="mt-6">
            <div className="max-w-6xl mx-auto">
              {currentStore ? (
                <ManualInboundEntry
                  storeId={currentStore.store_id}
                  onBatchSubmitted={_result => {
                    // Batch submitted
                  }}
                />
              ) : (
                <Card className="p-6">
                  <div className="text-center text-muted-foreground">
                    {t('messages.selectStoreInventory')}
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="csv" className="mt-6">
            <div className="max-w-4xl mx-auto">
              {currentStore ? (
                <CSVUploadForm
                  storeId={currentStore.store_id}
                  onUploadComplete={_result => {
                    // Upload completed
                  }}
                />
              ) : (
                <Card className="p-6">
                  <div className="text-center text-muted-foreground">
                    {t('messages.selectStore')}
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
