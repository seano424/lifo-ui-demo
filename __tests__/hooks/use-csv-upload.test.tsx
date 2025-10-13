/**
 * Tests for useCSVUpload hook - CSV Upload Analytics Bug
 *
 * This test suite verifies that CSV upload analytics are correctly displayed
 *
 * Bug Report Context:
 * - User reported that UI shows "500 items imported" but terminal shows "no items were processed"
 * - Terminal log: "Skipping fallback scoring trigger - no items were processed"
 * - UI displayed: "500 items imported!" with metrics showing 500 processed, 0 skipped
 *
 * Testing Strategy:
 * - Mock fetch responses to simulate backend behavior
 * - Test that the hook correctly parses and displays upload results
 * - Test edge cases: 0 processed, partial processing, all skipped
 * - Verify scoring trigger is only called when items are actually processed
 */

import { renderHook, waitFor, act } from '@testing-library/react'
import { toast } from 'sonner'
import { useCSVUpload } from '@/hooks/use-csv-upload'
import { createWrapper } from '@/__tests__/setup/test-utils'

// Mock the toast notifications
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
}))

// Mock fetch globally
global.fetch = jest.fn()

// Helper to create a mock File with text() method
function createMockFile(content: string, filename: string): File {
  const file = new File([content], filename, { type: 'text/csv' })
  // Mock the text() method for Node.js environment
  Object.defineProperty(file, 'text', {
    value: jest.fn().mockResolvedValue(content),
  })
  return file
}

describe('useCSVUpload - Analytics Bug Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('Bug: UI shows wrong processed count', () => {
    it('should display 0 processed when backend returns 0 processed (not total_items)', async () => {
      // Simulate the bug scenario: backend returns total_items=500 but processed=0
      const mockResponse = {
        success: true,
        processed: 0, // Actually processed
        skipped: 500, // All items were skipped
        errors: [],
        total_items: 500, // Total items in CSV
        processing_time_ms: 749.67,
        duplicates_skipped: [],
        performance_metrics: {
          items_per_second: 0,
          duplicate_detection_ms: 100,
          product_resolution_ms: 200,
          batch_insertion_ms: 0,
          database_operations_ms: 300,
        },
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const { result } = renderHook(() => useCSVUpload(), {
        wrapper: createWrapper(),
      })

      const testFile = createMockFile('test,csv,data', 'test.csv')

      // Preview the file first
      await act(async () => {
        await result.current.previewCsvFile(testFile)
      })

      // Upload the file
      await act(async () => {
        result.current.mutate({
          file: testFile,
          storeId: 'test-store-123',
          csvData: [],
        })
      })

      // Wait for the upload to complete
      await waitFor(() => {
        expect(result.current.isPending).toBe(false)
      })

      // Verify the upload result shows 0 processed (not 500)
      expect(result.current.data).toBeDefined()
      expect(result.current.data?.processed).toBe(0)
      expect(result.current.data?.total_items).toBe(500)
      expect(result.current.data?.skipped).toBe(500)

      // Verify scoring trigger was NOT called (since processed = 0)
      const fetchCalls = (global.fetch as jest.Mock).mock.calls
      const scoringCalls = fetchCalls.filter(call => call[0].includes('/api/scoring/trigger'))
      expect(scoringCalls.length).toBe(0)
    })

    it('should only trigger scoring when processed > 0', async () => {
      const mockResponse = {
        success: true,
        processed: 250,
        skipped: 250,
        errors: [],
        total_items: 500,
        processing_time_ms: 749.67,
        duplicates_skipped: [],
        performance_metrics: {
          items_per_second: 333.78,
        },
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })

      const { result } = renderHook(() => useCSVUpload(), {
        wrapper: createWrapper(),
      })

      const testFile = createMockFile('test,csv,data', 'test.csv')

      await act(async () => {
        await result.current.previewCsvFile(testFile)
      })

      await act(async () => {
        result.current.mutate({
          file: testFile,
          storeId: 'test-store-123',
          csvData: [],
        })
      })

      await waitFor(() => {
        expect(result.current.isPending).toBe(false)
      })

      // Verify the data is correct
      expect(result.current.data?.processed).toBe(250)
      expect(result.current.data?.skipped).toBe(250)

      // Verify scoring trigger WAS called (since processed > 0)
      const fetchCalls = (global.fetch as jest.Mock).mock.calls
      const scoringCalls = fetchCalls.filter(call => call[0].includes('/api/scoring/trigger'))
      expect(scoringCalls.length).toBe(1)

      // Verify the scoring trigger was called with correct data
      const scoringCallBody = JSON.parse(scoringCalls[0][1].body)
      expect(scoringCallBody.metadata.itemsImported).toBe(250)
    })

    it('should display correct metrics when all items are processed', async () => {
      const mockResponse = {
        success: true,
        processed: 500,
        skipped: 0,
        errors: [],
        total_items: 500,
        processing_time_ms: 749.67,
        duplicates_skipped: [],
        performance_metrics: {
          items_per_second: 667.11,
          duplicate_detection_ms: 100,
          product_resolution_ms: 200,
          batch_insertion_ms: 300,
          database_operations_ms: 600,
        },
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })

      const { result } = renderHook(() => useCSVUpload(), {
        wrapper: createWrapper(),
      })

      const testFile = createMockFile('test,csv,data', 'test.csv')

      await act(async () => {
        await result.current.previewCsvFile(testFile)
      })

      await act(async () => {
        result.current.mutate({
          file: testFile,
          storeId: 'test-store-123',
          csvData: [],
        })
      })

      await waitFor(() => {
        expect(result.current.isPending).toBe(false)
      })

      // Verify all metrics are correct
      expect(result.current.data?.processed).toBe(500)
      expect(result.current.data?.skipped).toBe(0)
      expect(result.current.data?.total_items).toBe(500)
      expect(result.current.data?.processing_time_ms).toBe(749.67)
      expect(result.current.data?.performance_metrics?.items_per_second).toBe(667.11)

      // Verify success toast was called with correct message
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('500'), expect.any(Object))
    })

    it('should handle error responses gracefully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Invalid CSV format',
        }),
      })

      const { result } = renderHook(() => useCSVUpload(), {
        wrapper: createWrapper(),
      })

      const testFile = createMockFile('invalid data', 'test.csv')

      await act(async () => {
        await result.current.previewCsvFile(testFile)
      })

      await act(async () => {
        result.current.mutate({
          file: testFile,
          storeId: 'test-store-123',
          csvData: [],
        })
      })

      await waitFor(() => {
        expect(result.current.isPending).toBe(false)
      })

      // Verify error state
      expect(result.current.error).toBeDefined()
      expect(toast.error).toHaveBeenCalled()

      // Verify scoring was NOT triggered
      const fetchCalls = (global.fetch as jest.Mock).mock.calls
      const scoringCalls = fetchCalls.filter(call => call[0].includes('/api/scoring/trigger'))
      expect(scoringCalls.length).toBe(0)
    })
  })

  describe('CSV Preview functionality', () => {
    it('should correctly parse CSV and generate preview', async () => {
      const csvContent = `SKU,Product_Name,Category,Quantity,Expiry_Date
APPLE001,Red Apples,Fresh Produce,50,2025-12-31
MILK002,Whole Milk,Dairy,30,2025-11-15
BREAD003,Sourdough,Bakery,25,2025-10-20`

      const { result } = renderHook(() => useCSVUpload(), {
        wrapper: createWrapper(),
      })

      const testFile = createMockFile(csvContent, 'test.csv')

      await act(async () => {
        await result.current.previewCsvFile(testFile)
      })

      // Verify preview was generated
      expect(result.current.isPreviewReady).toBe(true)
      expect(result.current.csvPreview).toHaveLength(3)
      expect(result.current.csvPreview[0]).toMatchObject({
        SKU: 'APPLE001',
        Product_Name: 'Red Apples',
        Category: 'Fresh Produce',
        Quantity: 50,
        Expiry_Date: '2025-12-31',
      })
    })

    it('should track items without expiry dates', async () => {
      const csvContent = `SKU,Product_Name,Category,Quantity,Expiry_Date
APPLE001,Red Apples,Fresh Produce,50,2025-12-31
MILK002,Whole Milk,Dairy,30,
BREAD003,Sourdough,Bakery,25,`

      const { result } = renderHook(() => useCSVUpload(), {
        wrapper: createWrapper(),
      })

      const testFile = createMockFile(csvContent, 'test.csv')

      await act(async () => {
        await result.current.previewCsvFile(testFile)
      })

      // Verify items without expiry are tracked
      expect(result.current.columnMapping.hasExpiryColumn).toBe(true)
      expect(result.current.columnMapping.itemsWithoutExpiry).toBe(2)
    })
  })

  describe('Reset functionality', () => {
    it('should reset preview and upload state', async () => {
      const csvContent = `SKU,Product_Name,Category,Quantity,Expiry_Date
APPLE001,Red Apples,Fresh Produce,50,2025-12-31`

      const { result } = renderHook(() => useCSVUpload(), {
        wrapper: createWrapper(),
      })

      const testFile = createMockFile(csvContent, 'test.csv')

      await act(async () => {
        await result.current.previewCsvFile(testFile)
      })

      expect(result.current.isPreviewReady).toBe(true)
      expect(result.current.csvPreview.length).toBeGreaterThan(0)

      // Reset
      act(() => {
        result.current.resetPreview()
      })

      // Verify state is cleared
      expect(result.current.isPreviewReady).toBe(false)
      expect(result.current.csvPreview).toHaveLength(0)
      expect(result.current.columnMapping.itemsWithoutExpiry).toBe(0)
      expect(result.current.data).toBeUndefined()
    })
  })
})
