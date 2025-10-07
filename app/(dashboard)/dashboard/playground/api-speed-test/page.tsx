'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export default function APISpeedTest() {
  const [results, setResults] = useState<Record<string, number>>({})
  const supabase = createClient()

  const testDirectQuery = async () => {
    const start = performance.now()
    const { data } = await supabase.from('categories').select('*')
    const duration = performance.now() - start
    setResults(prev => ({ ...prev, 'Direct Query': duration }))
    console.log('Direct query:', duration.toFixed(2), 'ms', data?.length, 'rows')
  }

  const testRPC = async () => {
    const start = performance.now()
    const { data } = await supabase.rpc('get_categories_for_dropdown')
    const duration = performance.now() - start
    setResults(prev => ({ ...prev, 'RPC Call': duration }))
    console.log('RPC call:', duration.toFixed(2), 'ms', data?.length, 'rows')
  }

  const testRPCWithSchema = async () => {
    const start = performance.now()
    const { data } = await supabase.schema('inventory').rpc('get_categories_for_dropdown')
    const duration = performance.now() - start
    setResults(prev => ({ ...prev, 'RPC with schema': duration }))
    console.log('RPC with schema:', duration.toFixed(2), 'ms', data?.length, 'rows')
  }

  const testMultipleCalls = async () => {
    const times: number[] = []
    for (let i = 0; i < 5; i++) {
      const start = performance.now()
      await supabase.rpc('get_categories_for_dropdown')
      times.push(performance.now() - start)
    }
    const avg = times.reduce((a, b) => a + b) / times.length
    setResults(prev => ({ ...prev, 'Average of 5 calls': avg }))
    console.log('5 calls:', times, 'avg:', avg.toFixed(2))
  }

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Supabase API Speed Test</h1>

      <div className="space-y-2">
        <Button onClick={testDirectQuery}>Test Direct Query</Button>
        <Button onClick={testRPC}>Test RPC Call</Button>
        <Button onClick={testRPCWithSchema}>Test RPC with Schema</Button>
        <Button onClick={testMultipleCalls}>Test 5x Calls (avg)</Button>
      </div>

      <div className="mt-8 space-y-2">
        <h2 className="font-bold">Results:</h2>
        {Object.entries(results).map(([name, duration]) => (
          <div key={name} className="flex justify-between p-2 border">
            <span>{name}</span>
            <span className={duration > 100 ? 'text-red-500' : 'text-green-500'}>
              {duration.toFixed(2)}ms
            </span>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h3 className="font-bold mb-2">Expected Results</h3>
        <ul className="text-sm space-y-1">
          <li>✅ Direct Query: 50-200ms (baseline)</li>
          <li>✅ RPC Call: Should be similar to direct query</li>
          <li>❌ If both &gt;300ms: Network/plan issue</li>
          <li>❌ If RPC &gt;2x direct: RPC inefficiency</li>
        </ul>
      </div>
    </div>
  )
}
