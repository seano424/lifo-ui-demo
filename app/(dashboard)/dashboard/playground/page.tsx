'use client'

import React, { useState } from 'react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

export default function PlaygroundPage() {
  const [discountModal, setDiscountModal] = useState(false)
  const [donationModal, setDonationModal] = useState(false)
  const [detailsModal, setDetailsModal] = useState(false)
  const [fullHeightModal, setFullHeightModal] = useState(false)

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">BottomSheet Component Playground</h1>
        <p className="text-muted-foreground">
          Test the BottomSheet component with different content types. On mobile, sheets slide up from bottom with swipe-to-dismiss. On desktop, they appear as centered modals.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Discount Modal</CardTitle>
            <CardDescription>Apply discounts to products</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setDiscountModal(true)} className="w-full">
              Open Discount Modal
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Donation Modal</CardTitle>
            <CardDescription>Mark items for donation</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setDonationModal(true)} className="w-full">
              Open Donation Modal
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
            <CardDescription>View detailed product information</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setDetailsModal(true)} className="w-full">
              Open Details Modal
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Full Height Modal</CardTitle>
            <CardDescription>Test fullHeight variant with long content</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setFullHeightModal(true)} className="w-full">
              Open Full Height Modal
            </Button>
          </CardContent>
        </Card>
      </div>

      <BottomSheet
        isOpen={discountModal}
        onClose={() => setDiscountModal(false)}
        title="Apply Discount"
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="discount-type">Discount Type</Label>
            <select
              id="discount-type"
              className="w-full mt-1 px-3 py-2 border rounded-md"
            >
              <option>Percentage (%)</option>
              <option>Fixed Amount ($)</option>
            </select>
          </div>
          
          <div>
            <Label htmlFor="discount-value">Discount Value</Label>
            <Input
              id="discount-value"
              type="number"
              placeholder="Enter discount value"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Input
              id="reason"
              placeholder="e.g., Damaged packaging"
              className="mt-1"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setDiscountModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={() => setDiscountModal(false)} className="flex-1">
              Apply Discount
            </Button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        isOpen={donationModal}
        onClose={() => setDonationModal(false)}
        title="Mark for Donation"
      >
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Selected Items</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span>Canned Beans</span>
                <Badge>5 units</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Pasta Sauce</span>
                <Badge>3 units</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Rice</span>
                <Badge>10 units</Badge>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="donation-org">Donation Organization</Label>
            <select
              id="donation-org"
              className="w-full mt-1 px-3 py-2 border rounded-md"
            >
              <option>Local Food Bank</option>
              <option>Community Kitchen</option>
              <option>Shelter Services</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              className="w-full mt-1 px-3 py-2 border rounded-md"
              rows={3}
              placeholder="Add any additional notes..."
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setDonationModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={() => setDonationModal(false)} className="flex-1">
              Confirm Donation
            </Button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        isOpen={detailsModal}
        onClose={() => setDetailsModal(false)}
        title="Product Details"
      >
        <div className="space-y-6">
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
            <span className="text-muted-foreground">Product Image</span>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">Organic Whole Grain Pasta</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Barcode</p>
                <p className="font-mono">1234567890123</p>
              </div>
              <div>
                <p className="text-muted-foreground">Category</p>
                <p>Pasta & Grains</p>
              </div>
              <div>
                <p className="text-muted-foreground">Stock Level</p>
                <p>24 units</p>
              </div>
              <div>
                <p className="text-muted-foreground">Expiry Date</p>
                <p>2024-12-31</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Nutritional Information</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Calories</span>
                <span>200 per serving</span>
              </div>
              <div className="flex justify-between">
                <span>Protein</span>
                <span>7g</span>
              </div>
              <div className="flex justify-between">
                <span>Carbohydrates</span>
                <span>42g</span>
              </div>
              <div className="flex justify-between">
                <span>Fat</span>
                <span>1g</span>
              </div>
            </div>
          </div>

          <Button onClick={() => setDetailsModal(false)} className="w-full">
            Close
          </Button>
        </div>
      </BottomSheet>

      <BottomSheet
        isOpen={fullHeightModal}
        onClose={() => setFullHeightModal(false)}
        title="Full Height Example"
        variant="fullHeight"
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">
            This is a full height modal variant that takes up 90% of the viewport height. 
            It's useful for content that needs more vertical space.
          </p>

          {Array.from({ length: 20 }, (_, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle>Item {i + 1}</CardTitle>
                <CardDescription>
                  This is a sample item to demonstrate scrolling in a full height modal.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
                  Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                </p>
              </CardContent>
            </Card>
          ))}

          <Button onClick={() => setFullHeightModal(false)} className="w-full">
            Close Modal
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}