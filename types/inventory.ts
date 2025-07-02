export interface Product {
  id: string
  barcode: string
  name: string
  category: string
  expirationDate: string
  quantity: number
  originalQuantity: number
  status: 'fresh' | 'expiring-soon' | 'expired' | 'discounted' | 'donated' | 'sold'
  batchId: string
  addedDate: string
  price: number
  discountedPrice?: number
}

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'employee'
  storeId: string
}

export interface ActionLog {
  id: string
  productId: string
  productName: string
  action: 'discounted' | 'donated' | 'sold' | 'expired'
  quantity: number
  timestamp: string
  userId: string
  userName: string
}

export interface BatchPerformance {
  batchId: string
  productName: string
  expirationDate: string
  totalQuantity: number
  soldQuantity: number
  discountedQuantity: number
  donatedQuantity: number
  expiredQuantity: number
  wasteReduction: number
}
