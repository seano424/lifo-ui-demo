import { FILE_UPLOAD } from '@/lib/constants/file-upload'

/**
 * Validates if a file is a valid CSV file based on extension and MIME type
 * @param file - The file to validate
 * @returns boolean - true if file is valid CSV
 */
export function validateCSVFile(file: File): boolean {
  // Check file extension
  const hasValidExtension = FILE_UPLOAD.SUPPORTED_EXTENSIONS.some(ext =>
    file.name.toLowerCase().endsWith(ext),
  )

  // Check MIME type
  const hasValidMimeType = FILE_UPLOAD.SUPPORTED_MIME_TYPES.some(mimeType => file.type === mimeType)

  // Accept if either check passes (some systems don't set proper MIME types)
  return hasValidExtension || hasValidMimeType
}

/**
 * Validates file size against maximum allowed size
 * @param file - The file to validate
 * @returns boolean - true if file size is acceptable
 */
export function validateFileSize(file: File): boolean {
  return file.size <= FILE_UPLOAD.MAX_FILE_SIZE
}

/**
 * Comprehensive file validation for CSV uploads
 * @param file - The file to validate
 * @returns object with validation result and error message
 */
export function validateUploadFile(file: File): { isValid: boolean; error?: string } {
  if (!validateCSVFile(file)) {
    return {
      isValid: false,
      error: 'Invalid file type. Please upload a CSV file (.csv)',
    }
  }

  if (!validateFileSize(file)) {
    return {
      isValid: false,
      error: `File too large. Maximum size is ${Math.round(FILE_UPLOAD.MAX_FILE_SIZE / (1024 * 1024))}MB`,
    }
  }

  return { isValid: true }
}
