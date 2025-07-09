'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProductTable } from '@/components/products/product-table'
import { BatchAnalytics } from '@/components/batches/batch-analysis'
import { ActionLog } from '@/components/actions/action-log'
import { AddProductForm } from '@/components/actions/add-product-form'

export default function DashboardTabs() {
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="dashboard">Overview</TabsTrigger>
        <TabsTrigger value="products">Products</TabsTrigger>
        <TabsTrigger value="batches">Batches</TabsTrigger>
        <TabsTrigger value="log">Action Log</TabsTrigger>
        <TabsTrigger value="add">Add Product</TabsTrigger>
      </TabsList>

      <TabsContent value="dashboard" className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <ProductTable />
          <BatchAnalytics />
          <div className="flex-1">
            <ActionLog />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="products" className="space-y-4">
        <ProductTable />
      </TabsContent>

      <TabsContent value="batches" className="space-y-4">
        <BatchAnalytics />
      </TabsContent>

      <TabsContent value="log" className="space-y-4">
        <ActionLog />
      </TabsContent>

      <TabsContent value="add" className="space-y-4">
        <AddProductForm />
      </TabsContent>
    </Tabs>
  )
}
