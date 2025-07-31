// Export both versions for easy switching
export { CSVUploadForm as LegacyCSVUploadForm } from './csv-upload-form'
export { UltraFastCSVUploadForm } from './csv-upload-form-ultra-fast'

// Default export is now the ultra-fast version
export { UltraFastCSVUploadForm as default } from './csv-upload-form-ultra-fast'
export { UltraFastCSVUploadForm as CSVUploadForm } from './csv-upload-form-ultra-fast'