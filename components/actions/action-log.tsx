'use client'

import { Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { sampleActionLog } from '@/lib/sample-data'

const getActionColor = (action: string) => {
  switch (action) {
    case 'sold':
      return 'bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-300 border-primary-200 dark:border-primary-700'
    case 'discounted':
      return 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700'
    case 'donated':
      return 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-700'
    case 'expired':
      return 'bg-destructive text-destructive border-destructive'
    default:
      return 'bg-gray-100 dark:bg-gray-800/60 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600'
  }
}

export function ActionLog() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Actions Log
        </CardTitle>
        <CardDescription>
          Track all discount, donation, and sale actions taken on products
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sampleActionLog.map(log => (
              <TableRow key={log.id}>
                <TableCell className="">{log.productName}</TableCell>
                <TableCell>
                  <Badge className={getActionColor(log.action)}>
                    {log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>{log.quantity}</TableCell>
                <TableCell>{log.userName}</TableCell>
                <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
