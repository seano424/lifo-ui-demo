import { AlertCircle, BarChart, Package, TrendingUp } from 'lucide-react'
import { FeatureCard, SupportPageWrapper } from '@/components/support'

// Data for feature cards
const features = [
  {
    icon: Package,
    title: 'Inventory Tracking',
    description:
      'Track inventory levels in real-time with automated updates from scan-in/out operations',
    features: [
      {
        title: 'Real-time Updates',
        description: 'Automatic inventory adjustments with every scan',
      },
      {
        title: 'Multi-location Support',
        description: 'Track inventory across different warehouses',
      },
      { title: 'Batch Tracking', description: 'Monitor inventory by delivery batches' },
      {
        title: 'Product Variants',
        description: 'Separate tracking for sizes, colors, and configurations',
      },
    ],
  },
  {
    icon: BarChart,
    title: 'Analytics & Reporting',
    description: 'Gain insights into your inventory performance with comprehensive analytics',
    features: [
      { title: 'Turnover Rates', description: 'Identify fast and slow-moving products' },
      { title: 'Stock Aging', description: 'Track how long inventory stays in warehouse' },
      { title: 'Demand Forecasting', description: 'Predict future inventory needs' },
      { title: 'Cost Analysis', description: 'Monitor carrying costs and storage fees' },
    ],
  },
  {
    icon: AlertCircle,
    title: 'Stock Alerts & Notifications',
    description: 'Stay informed about critical inventory levels with automated alerts',
    features: [
      {
        title: 'Low Stock Alerts',
        description: 'Notifications when inventory drops below threshold',
      },
      { title: 'Overstock Warnings', description: 'Alerts for excess inventory accumulation' },
      { title: 'Expiry Notifications', description: 'Track products approaching expiration dates' },
      {
        title: 'Custom Thresholds',
        description: 'Set specific alert levels for different products',
      },
    ],
  },
  {
    icon: TrendingUp,
    title: 'LIFO Optimization',
    description: 'Leverage Last-In-First-Out methodology for optimal inventory management',
    features: [
      {
        title: 'Automatic LIFO Sorting',
        description: 'System prioritizes newest inventory for fulfillment',
      },
      {
        title: 'Cost Optimization',
        description: 'Maximize profitability with intelligent inventory selection',
      },
      {
        title: 'Freshness Management',
        description: 'Ensure customers receive the freshest products',
      },
      { title: 'Tax Benefits', description: 'Optimize tax implications with LIFO accounting' },
    ],
  },
]

export default function InventoryManagementPage() {
  return (
    <SupportPageWrapper
      title="Inventory Management"
      description="Master your inventory with LIFO's comprehensive management tools"
      readTime="5 min read"
      intro="Effective inventory management is crucial for business success. LIFO provides comprehensive tools to track, analyze, and optimize your inventory levels."
    >
      {/* Feature Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {features.map(feature => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </div>
    </SupportPageWrapper>
  )
}
