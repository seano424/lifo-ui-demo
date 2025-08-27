// Main scanning interface exports

export type {
  BaseScanningCallbacks,
  BaseScanningConfig,
  BaseScanningProps,
  BaseScanningState,
} from './base-scanning-interface'

// Base interface (Phase 2)
export {
  default as BaseScanningInterface,
  useBaseScanningLogic,
} from './base-scanning-interface'
export { default as RefactoredScanningInterface } from './refactored-scanning-interface'

// Scan-in interface (Phase 2)
export { default as ScanInInterface } from './scan-in/scan-in-interface'

// Scan-out interface (Phase 3)
export { default as ScanOutInterface } from './scan-out/scan-out-interface'
// Shared components (Phase 1)
export * from './shared'
