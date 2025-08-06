// components/dashboard/dashboard-kpi-cards.stories.tsx
// Storybook story for development and testing

import type { Meta, StoryObj } from '@storybook/react'
import { DashboardKPICards } from './dashboard-kpi-cards'

const meta: Meta<typeof DashboardKPICards> = {
  title: 'Dashboard/KPI Cards',
  component: DashboardKPICards,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-7xl mx-auto p-4">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

// Default story with mock data
export const Default: Story = {
  args: {
    useMockData: true,
  },
}

// Story with custom click handler
export const WithCustomHandler: Story = {
  args: {
    useMockData: true,
    onCardClick: (type) => {
      console.log(`Card clicked: ${type}`)
      alert(`You clicked the ${type} card!`)
    },
  },
}

// Story showing loading state
export const Loading: Story = {
  args: {
    useMockData: false, // This will trigger real API calls
  },
}