import React from 'react'

export default function DashboardInsetHeader({
  title,
  description,
  rightContent,
}: {
  title: string
  description: string
  rightContent?: React.ReactNode
}) {
  return (
    <div className="flex justify-between items-center">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-gray-600">{description}</p>
      </div>
      {rightContent && rightContent}
    </div>
  )
}
