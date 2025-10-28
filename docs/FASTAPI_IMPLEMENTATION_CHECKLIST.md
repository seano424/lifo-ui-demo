# FastAPI Frontend Integration - Implementation Checklist

**Project:** LIFO.AI Frontend Integration
**Version:** 1.0
**Last Updated:** 2025-10-06

Use this checklist to track implementation progress across all phases.

---

## Phase 1: Foundation (Week 1)

**Goal:** Set up base client infrastructure and scoring client

### Core Infrastructure

- [ ] **Create base client** (`lib/api/fastapi/core/base-client.ts`)

  - [ ] `BaseFastAPIClient` class with HTTP methods (GET, POST, PUT, DELETE)
  - [ ] Authentication handling (JWT + service role)
  - [ ] Error handling and transformation
  - [ ] Timeout and retry logic
  - [ ] Performance monitoring hooks
  - [ ] Health check method

- [ ] **Create types file** (`lib/api/fastapi/core/types.ts`)

  - [ ] Common request/response interfaces
  - [ ] Error types
  - [ ] Configuration types

- [ ] **Create error handling** (`lib/api/fastapi/core/error-handling.ts`)
  - [ ] Error classification (network, auth, server)
  - [ ] Error transformation utilities
  - [ ] User-friendly error messages

### Scoring Client

- [ ] **Create scoring client** (`lib/api/fastapi/clients/scoring-client.ts`)
  - [ ] Type definitions (Alert, AlertsResponse, AnalyticsResponse, etc.)
  - [ ] `getAlerts()` method with filters
  - [ ] `getAnalytics()` method
  - [ ] `getRecommendations()` method
  - [ ] `triggerScoring()` method
  - [ ] `getSchedules()` / `createSchedule()` / `updateSchedule()` / `deleteSchedule()`
  - [ ] `getJobs()` / `getJobStatus()` methods
  - [ ] Export singleton instance

### Query Infrastructure

- [ ] **Extend query keys** (`lib/queries/query-keys.ts`)
  - [ ] Add `scoring` namespace
  - [ ] Add keys for: alerts, analytics, recommendations
  - [ ] Add keys for: schedules, jobs, jobStatus
  - [ ] Ensure proper type safety with `as const`

### React Query Hooks

- [ ] **Create scoring hooks** (`lib/hooks/fastapi/use-scoring.ts`)
  - [ ] `useAlerts()` - query hook with filters
  - [ ] `useAnalytics()` - query hook with date range
  - [ ] `useRecommendations()` - query hook
  - [ ] `useScoringSchedules()` - query hook
  - [ ] `useScoringJobs()` - query hook with filtering
  - [ ] `useScoringJobStatus()` - query hook for specific job
  - [ ] `useScoringActions()` - mutation hook (trigger, create/update/delete schedule)
  - [ ] Proper error handling in all hooks
  - [ ] Loading states
  - [ ] Cache invalidation logic

### Testing

- [ ] **Unit tests for base client**

  - [ ] Test GET/POST/PUT/DELETE methods
  - [ ] Test authentication header generation
  - [ ] Test error handling
  - [ ] Test timeout logic
  - [ ] Mock fetch with MSW

- [ ] **Unit tests for scoring client**

  - [ ] Test all methods with mock responses
  - [ ] Test error scenarios
  - [ ] Test parameter passing

- [ ] **Integration tests for hooks**
  - [ ] Test `useAlerts()` with QueryClient wrapper
  - [ ] Test mutations with cache invalidation
  - [ ] Test loading and error states

### Documentation

- [ ] **Update CLAUDE.md**

  - [ ] Document new file structure
  - [ ] Add usage examples
  - [ ] Update command reference

- [ ] **Create migration guide**
  - [ ] Document how to migrate from old client
  - [ ] Provide side-by-side examples
  - [ ] List breaking changes (if any)

### Success Criteria

- [ ] All scoring endpoints accessible through new client
- [ ] Tests pass with >85% coverage
- [ ] Components can use `useAlerts()` successfully
- [ ] No performance regressions (<300ms p95)
- [ ] Documentation complete

---

## Phase 2: Domain Clients (Week 2)

**Goal:** Implement all remaining domain clients and workflow stores

### Donation Client

- [ ] **Create donation client** (`lib/api/fastapi/clients/donation-client.ts`)

  - [ ] Type definitions (DonationRecipient, DonationSuitableItem, DonationAction)
  - [ ] `getRecipients()` / `createRecipient()` / `updateRecipient()` / `deleteRecipient()`
  - [ ] `querySuitableItems()` with filters
  - [ ] `recordDonation()` method
  - [ ] `getDonationHistory()` with filters
  - [ ] `getDonationImpact()` with date range
  - [ ] Export singleton instance

- [ ] **Create donation hooks** (`lib/hooks/fastapi/use-donations.ts`)

  - [ ] `useDonationRecipients()` - query hook
  - [ ] `useSuitableDonationItems()` - query hook with filters
  - [ ] `useDonationHistory()` - query hook
  - [ ] `useDonationImpact()` - query hook
  - [ ] `useDonationActions()` - mutation hook (create/update/delete recipient, record donation)
  - [ ] Optimistic updates for `recordDonation()`

- [ ] **Create donation workflow store** (`lib/stores/donation-workflow-store.ts`)

  - [ ] State: currentStep, selectedRecipient, selectedItems, scheduledPickup, notes
  - [ ] Actions: selectRecipient, addItem, removeItem, updateItemQuantity
  - [ ] Actions: setScheduledPickup, setNotes, completeWorkflow, resetWorkflow
  - [ ] SSR-safe hooks (following scanning-workflow-store pattern)
  - [ ] Persistence to localStorage (optional)

- [ ] **Add query keys**
  - [ ] Add `donations` namespace to query-keys.ts
  - [ ] Keys for: recipients, suitableItems, history, impact

### Scanning Client

- [ ] **Create scanning client** (`lib/api/fastapi/clients/scanning-client.ts`)

  - [ ] Type definitions (BarcodeResult, OCRExpiryResult, ProductRecognitionResult)
  - [ ] `scanBarcode()` method
  - [ ] `extractExpiry()` method (wrapper for OCR client)
  - [ ] `recognizeProduct()` method
  - [ ] `getSessionStats()` method
  - [ ] Export singleton instance

- [ ] **Create scanning hooks** (`lib/hooks/fastapi/use-scanning.ts`)

  - [ ] `useBarcodeScan()` - mutation hook
  - [ ] `useSessionStats()` - query hook
  - [ ] Proper error handling for OCR failures

- [ ] **Integrate with existing scanning store**

  - [ ] Update `scanning-workflow-store.ts` to use new client
  - [ ] Ensure backward compatibility
  - [ ] Test existing scanning flow still works

- [ ] **Add query keys**
  - [ ] Add `scanning` namespace to query-keys.ts
  - [ ] Keys for: barcode, sessionStats

### Batch Operations Client

- [ ] **Create batch client** (`lib/api/fastapi/clients/batch-client.ts`)

  - [ ] Type definitions (BatchCreateRequest, BatchActionRequest, BulkBatchCreateResponse)
  - [ ] `createBatch()` method
  - [ ] `createBatches()` bulk method
  - [ ] `applyAction()` method
  - [ ] `applyBulkActions()` method
  - [ ] `getActionHistory()` with filters
  - [ ] Export singleton instance

- [ ] **Create batch operations hooks** (`lib/hooks/fastapi/use-batch-operations.ts`)

  - [ ] `useBatchCreate()` - mutation hook
  - [ ] `useBulkBatchCreate()` - mutation hook with progress
  - [ ] `useBatchAction()` - mutation hook
  - [ ] `useBulkBatchActions()` - mutation hook
  - [ ] `useBatchActionHistory()` - query hook
  - [ ] Cache invalidation for batches queries

- [ ] **Create batch operation store** (`lib/stores/batch-operation-store.ts`)

  - [ ] State: selectedBatches, bulkActionType, confirmationState
  - [ ] Actions: selectBatch, deselectBatch, clearSelection
  - [ ] Actions: setBulkActionType, confirmBulkAction
  - [ ] SSR-safe hooks

- [ ] **Add query keys**
  - [ ] Add `batchOperations` namespace to query-keys.ts
  - [ ] Keys for: actionHistory

### CSV Operations Client

- [ ] **Create CSV client** (`lib/api/fastapi/clients/csv-client.ts`)

  - [ ] Type definitions (CSVUploadResponse, CSVDuplicateCheckResponse, CSVProcessingStatus)
  - [ ] `uploadCSV()` method
  - [ ] `checkDuplicates()` method
  - [ ] `getProcessingStatus()` method
  - [ ] `cancelProcessing()` method
  - [ ] `getUploadHistory()` method
  - [ ] Export singleton instance

- [ ] **Create CSV operations hooks** (`lib/hooks/fastapi/use-csv-operations.ts`)

  - [ ] `useCSVUpload()` - mutation hook with progress
  - [ ] `useCSVDuplicateCheck()` - mutation hook
  - [ ] `useCSVProcessingStatus()` - query hook with polling
  - [ ] `useCSVUploadHistory()` - query hook
  - [ ] Auto-stop polling when processing complete

- [ ] **Add query keys**
  - [ ] Add `csvOperations` namespace to query-keys.ts
  - [ ] Keys for: uploadHistory, processingStatus

### Unified Exports

- [ ] **Create index file** (`lib/api/fastapi/index.ts`)
  - [ ] Export all clients
  - [ ] Export all types
  - [ ] Export singleton instances
  - [ ] Add JSDoc comments

### Testing

- [ ] **Unit tests for all clients**

  - [ ] Donation client tests
  - [ ] Scanning client tests
  - [ ] Batch client tests
  - [ ] CSV client tests

- [ ] **Integration tests for hooks**

  - [ ] Test all query hooks
  - [ ] Test all mutation hooks
  - [ ] Test optimistic updates
  - [ ] Test cache invalidation

- [ ] **Store tests**
  - [ ] Donation workflow store tests
  - [ ] Batch operation store tests

### Success Criteria

- [ ] All 26 endpoints accessible through domain clients
- [ ] All hooks functional and tested
- [ ] Workflow stores working correctly
- [ ] Tests pass with >85% coverage
- [ ] Zero breaking changes to existing code

---

## Phase 3: Component Integration (Week 3)

**Goal:** Integrate clients into UI and build missing features

### Update Existing Components

- [ ] **Dashboard components**

  - [ ] Update alerts section to use `useAlerts()`
  - [ ] Update analytics section to use `useAnalytics()`
  - [ ] Update recommendations to use `useRecommendations()`
  - [ ] Remove old fastapi-client.ts usage
  - [ ] Test loading states
  - [ ] Test error states
  - [ ] Test empty states

- [ ] **Mobile scanner**
  - [ ] Integrate `scanningClient.scanBarcode()`
  - [ ] Update OCR flow to use new client
  - [ ] Test barcode scanning
  - [ ] Test expiry extraction
  - [ ] Test product recognition
  - [ ] Optimize for mobile performance

### Build New Features

- [ ] **Donation workflow UI**

  - [ ] Create `DonationWizard` component
  - [ ] Step 1: Recipient selection
    - [ ] List recipients with `useDonationRecipients()`
    - [ ] Add recipient form
    - [ ] Edit/delete recipient actions
  - [ ] Step 2: Item selection
    - [ ] Show suitable items with `useSuitableDonationItems()`
    - [ ] Multi-select with quantity inputs
    - [ ] Show estimated value
  - [ ] Step 3: Schedule pickup (optional)
    - [ ] Date/time picker
    - [ ] Notes field
  - [ ] Step 4: Confirmation
    - [ ] Review selected items
    - [ ] Show total quantity and value
    - [ ] Confirm button triggers `recordDonation()`
  - [ ] Step 5: Complete
    - [ ] Success message
    - [ ] Print receipt option
    - [ ] Start new donation button

- [ ] **Donation impact dashboard**

  - [ ] Show impact metrics with `useDonationImpact()`
  - [ ] Charts for donation trends
  - [ ] Recipient breakdown
  - [ ] Category breakdown

- [ ] **Donation history view**

  - [ ] List donations with `useDonationHistory()`
  - [ ] Filter by recipient
  - [ ] Filter by date range
  - [ ] Export to CSV

- [ ] **Batch operation bulk actions**

  - [ ] Batch selection UI (checkboxes)
  - [ ] Bulk action dropdown (discount, donate, dispose)
  - [ ] Confirmation modal
  - [ ] Progress indicator for bulk operations
  - [ ] Use `useBulkBatchActions()`

- [ ] **Batch action history**

  - [ ] List batch actions with `useBatchActionHistory()`
  - [ ] Filter by action type
  - [ ] Filter by date range
  - [ ] Show action details

- [ ] **CSV upload interface**

  - [ ] File picker with drag & drop
  - [ ] Upload with `useCSVUpload()`
  - [ ] Progress bar
  - [ ] Validation results display
  - [ ] Duplicate detection UI
  - [ ] Processing status with `useCSVProcessingStatus()`
  - [ ] Cancel upload button

- [ ] **CSV upload history**

  - [ ] List uploads with `useCSVUploadHistory()`
  - [ ] Show status (pending, processing, completed, failed)
  - [ ] View details/errors
  - [ ] Retry failed uploads

- [ ] **Scoring schedule manager**

  - [ ] List schedules with `useScoringSchedules()`
  - [ ] Add schedule form with cron expression builder
  - [ ] Enable/disable toggle
  - [ ] Delete schedule button
  - [ ] Show next run time

- [ ] **Scoring job tracker**
  - [ ] List jobs with `useScoringJobs()`
  - [ ] Filter by status
  - [ ] Show progress for running jobs
  - [ ] View job details
  - [ ] Manual trigger button

### Mobile Optimization

- [ ] **Performance testing**

  - [ ] Test all endpoints on mobile network (3G/4G)
  - [ ] Ensure <300ms response times (p95)
  - [ ] Optimize image uploads for mobile
  - [ ] Test offline scenarios

- [ ] **UI/UX**
  - [ ] Touch-friendly buttons (min 44x44px)
  - [ ] Mobile-optimized forms
  - [ ] Bottom sheets for modals
  - [ ] Swipe gestures where appropriate
  - [ ] Loading skeletons

### Accessibility

- [ ] **WCAG 2.1 AA compliance**
  - [ ] Keyboard navigation
  - [ ] Screen reader support (ARIA labels)
  - [ ] Color contrast (4.5:1 minimum)
  - [ ] Focus indicators
  - [ ] Error announcements

### Success Criteria

- [ ] All features accessible in UI
- [ ] Mobile performance <300ms (p95)
- [ ] Smooth animations and transitions
- [ ] No console errors
- [ ] Accessibility audit passes

---

## Phase 4: Testing & Polish (Week 4)

**Goal:** Comprehensive testing and production readiness

### Testing

- [ ] **Unit tests**

  - [ ] All clients: 100% coverage
  - [ ] All hooks: 100% coverage
  - [ ] All stores: 100% coverage
  - [ ] Utilities and helpers

- [ ] **Integration tests**

  - [ ] Complete donation workflow
  - [ ] Complete scanning workflow
  - [ ] Batch operations flow
  - [ ] CSV upload flow
  - [ ] Cache invalidation scenarios

- [ ] **E2E tests (Playwright)**

  - [ ] User can view alerts
  - [ ] User can record donation
  - [ ] User can scan product
  - [ ] User can upload CSV
  - [ ] User can trigger scoring

- [ ] **Performance tests**

  - [ ] Load testing (artillery/k6)
  - [ ] Response time benchmarks
  - [ ] Bundle size analysis
  - [ ] Lighthouse CI

- [ ] **Security tests**
  - [ ] Auth token validation
  - [ ] Permission checks
  - [ ] Input sanitization
  - [ ] XSS prevention
  - [ ] CSRF protection

### Code Quality

- [ ] **Linting**

  - [ ] ESLint passes
  - [ ] Biome checks pass
  - [ ] No console.log statements in production
  - [ ] No TypeScript `any` types

- [ ] **Code review**
  - [ ] All code reviewed by team
  - [ ] Architecture review
  - [ ] Security review
  - [ ] Performance review

### Error Handling

- [ ] **Comprehensive error handling**

  - [ ] Network errors
  - [ ] Auth errors
  - [ ] Validation errors
  - [ ] Server errors
  - [ ] Timeout errors

- [ ] **Error boundaries**

  - [ ] Component-level error boundaries
  - [ ] Page-level error boundaries
  - [ ] Global error boundary

- [ ] **User feedback**
  - [ ] Toast notifications for all mutations
  - [ ] Error messages in UI
  - [ ] Retry buttons
  - [ ] Help text for common errors

### Documentation

- [ ] **API documentation**

  - [ ] JSDoc for all public methods
  - [ ] Type documentation
  - [ ] Usage examples
  - [ ] Migration guide

- [ ] **Component documentation**

  - [ ] Storybook stories for new components
  - [ ] Props documentation
  - [ ] Accessibility notes

- [ ] **Developer guide**
  - [ ] How to add new endpoints
  - [ ] How to create hooks
  - [ ] Testing guidelines
  - [ ] Troubleshooting guide

### Monitoring Setup

- [ ] **Error tracking**

  - [ ] Sentry integration
  - [ ] Error reporting configured
  - [ ] Source maps uploaded
  - [ ] Alert rules configured

- [ ] **Performance monitoring**

  - [ ] Vercel Analytics
  - [ ] Core Web Vitals tracking
  - [ ] API response time tracking
  - [ ] Custom metrics

- [ ] **User analytics**
  - [ ] PostHog analytics
  - [ ] Feature usage tracking
  - [ ] User flow analysis

### Success Criteria

- [ ] Test coverage >85%
- [ ] All E2E tests pass
- [ ] Performance benchmarks met
- [ ] Security audit passes
- [ ] Documentation complete
- [ ] Monitoring configured

---

## Phase 5: Advanced Features (Week 5+)

**Goal:** Offline support, type generation, and optimization

### Offline Support

- [ ] **Offline mutation queue**

  - [ ] IndexedDB for offline storage
  - [ ] Queue mutations when offline
  - [ ] Auto-sync when back online
  - [ ] Conflict resolution

- [ ] **Service worker**

  - [ ] Cache static assets
  - [ ] Cache API responses
  - [ ] Background sync
  - [ ] Push notifications (optional)

- [ ] **Offline indicator**
  - [ ] Show offline status in UI
  - [ ] Disable features requiring connectivity
  - [ ] Show queued mutations

### Type Generation

- [ ] **OpenAPI type generation**

  - [ ] Script to generate types from /openapi.json
  - [ ] Automated in CI/CD
  - [ ] Version control for generated types
  - [ ] Deprecation warnings

- [ ] **Zod validation**
  - [ ] Create Zod schemas for all types
  - [ ] Runtime validation in clients
  - [ ] Parse API responses
  - [ ] Better error messages

### Advanced Caching

- [ ] **Smart prefetching**

  - [ ] Prefetch on hover
  - [ ] Prefetch on route change
  - [ ] Predictive prefetching

- [ ] **Cache optimization**
  - [ ] Optimize stale times
  - [ ] Implement cache persistence (optional)
  - [ ] Memory management
  - [ ] Cache size monitoring

### Performance Optimization

- [ ] **Bundle optimization**

  - [ ] Code splitting
  - [ ] Dynamic imports
  - [ ] Tree shaking
  - [ ] Minimize bundle size

- [ ] **Image optimization**

  - [ ] Next.js Image component
  - [ ] WebP format
  - [ ] Lazy loading
  - [ ] Responsive images

- [ ] **Network optimization**
  - [ ] Request deduplication
  - [ ] Response compression
  - [ ] HTTP/2 push (if applicable)
  - [ ] CDN integration

### Telemetry

- [ ] **Custom events**

  - [ ] Track feature usage
  - [ ] Track errors by category
  - [ ] Track performance metrics
  - [ ] Track user flows

- [ ] **Dashboards**
  - [ ] Sentry dashboard
  - [ ] Vercel analytics dashboard
  - [ ] Custom metrics dashboard

### Success Criteria

- [ ] Offline mode functional
- [ ] Types auto-generated
- [ ] Runtime validation active
- [ ] Performance optimized
- [ ] Telemetry configured

---

## Migration Checklist

### Deprecate Old Client

- [ ] **Add deprecation warnings**

  - [ ] Console warnings in old client methods
  - [ ] JSDoc @deprecated tags
  - [ ] Migration guide link

- [ ] **Update all components**

  - [ ] Search for `fastapi-client.ts` usage
  - [ ] Replace with new clients/hooks
  - [ ] Test each migrated component

- [ ] **Remove old code**
  - [ ] Delete `lib/services/fastapi-client.ts`
  - [ ] Remove old types
  - [ ] Clean up unused imports

### Verify Migration

- [ ] No references to old client in codebase
- [ ] All tests pass
- [ ] No console warnings
- [ ] Production smoke test

---

## Production Readiness

### Pre-Deployment

- [ ] **Code freeze**

  - [ ] No new features
  - [ ] Bug fixes only
  - [ ] Final testing

- [ ] **Staging deployment**

  - [ ] Deploy to staging
  - [ ] Full QA pass
  - [ ] Performance testing
  - [ ] Load testing

- [ ] **Security review**
  - [ ] Auth flow review
  - [ ] Input validation review
  - [ ] Dependency audit
  - [ ] OWASP top 10 check

### Deployment

- [ ] **Production deployment**

  - [ ] Deploy during low-traffic window
  - [ ] Monitor error rates
  - [ ] Monitor performance
  - [ ] Rollback plan ready

- [ ] **Post-deployment**
  - [ ] Smoke tests
  - [ ] Monitor for 24 hours
  - [ ] Check error tracking
  - [ ] Check analytics

### Documentation

- [ ] **Update README**

  - [ ] New architecture overview
  - [ ] Setup instructions
  - [ ] Usage examples

- [ ] **Changelog**
  - [ ] Document all changes
  - [ ] Breaking changes (if any)
  - [ ] Migration guide

---

## Metrics & KPIs

Track these metrics to measure success:

### Performance

- [ ] API response time (p50, p95, p99)
  - Target: <300ms (p95)
- [ ] Page load time
  - Target: <2s (FCP)
- [ ] Time to Interactive (TTI)
  - Target: <3s
- [ ] Bundle size
  - Target: <500KB gzipped

### Reliability

- [ ] Error rate
  - Target: <0.1%
- [ ] Uptime
  - Target: 99.9%
- [ ] Cache hit rate
  - Target: >80%

### User Experience

- [ ] Task completion rate
  - Target: >95%
- [ ] Feature adoption rate
  - Track donations, scanning, CSV uploads
- [ ] User satisfaction (surveys)
  - Target: >4.5/5

---

## Notes & Considerations

### Important Reminders

- Always use absolute paths (not relative)
- Maintain backward compatibility during migration
- Test on mobile devices regularly
- Keep types in sync with backend
- Document breaking changes
- Follow existing code patterns

### Common Pitfalls

- Forgetting to invalidate cache after mutations
- Not handling loading states
- Missing error boundaries
- SSR/hydration issues with Zustand
- Race conditions in mutations
- Memory leaks from unsubscribed queries

### Best Practices

- Use React Query for server state
- Use Zustand for UI state
- Always show loading skeletons
- Implement optimistic updates for better UX
- Debounce search inputs
- Prefetch predictable data
- Test on slow networks

---

## Sign-Off

### Phase 1 ✅

- [ ] Code review completed by: \***\*\_\_\*\***
- [ ] Tested by: \***\*\_\_\*\***
- [ ] Documentation reviewed by: \***\*\_\_\*\***
- [ ] Approved by: \***\*\_\_\*\***
- Date: \***\*\_\_\*\***

### Phase 2 ✅

- [ ] Code review completed by: \***\*\_\_\*\***
- [ ] Tested by: \***\*\_\_\*\***
- [ ] Documentation reviewed by: \***\*\_\_\*\***
- [ ] Approved by: \***\*\_\_\*\***
- Date: \***\*\_\_\*\***

### Phase 3 ✅

- [ ] Code review completed by: \***\*\_\_\*\***
- [ ] Tested by: \***\*\_\_\*\***
- [ ] Documentation reviewed by: \***\*\_\_\*\***
- [ ] Approved by: \***\*\_\_\*\***
- Date: \***\*\_\_\*\***

### Phase 4 ✅

- [ ] Code review completed by: \***\*\_\_\*\***
- [ ] Tested by: \***\*\_\_\*\***
- [ ] Security review by: \***\*\_\_\*\***
- [ ] Approved by: \***\*\_\_\*\***
- Date: \***\*\_\_\*\***

### Phase 5 ✅

- [ ] Code review completed by: \***\*\_\_\*\***
- [ ] Tested by: \***\*\_\_\*\***
- [ ] Approved by: \***\*\_\_\*\***
- Date: \***\*\_\_\*\***

### Production Deployment ✅

- [ ] Deployed by: \***\*\_\_\*\***
- [ ] Verified by: \***\*\_\_\*\***
- [ ] Date: \***\*\_\_\*\***

---

**For questions or issues, refer to:**

- Full documentation: `FASTAPI_FRONTEND_INTEGRATION_STRATEGY.md`
- Quick reference: `FASTAPI_INTEGRATION_SUMMARY.md`
- Architecture diagrams: `FASTAPI_ARCHITECTURE_DIAGRAM.md`
