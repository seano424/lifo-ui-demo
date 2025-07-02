'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Clock } from 'lucide-react'
import { sampleActionLog } from '@/lib/sample-data'

const getActionColor = (action: string) => {
  switch (action) {
    case 'sold':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'discounted':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'donated':
      return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'expired':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
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
                <TableCell className="font-medium">{log.productName}</TableCell>
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
