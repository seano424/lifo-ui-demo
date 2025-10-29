import { z } from 'zod'

// Zod schema for template props (after sanitization)
// This ensures type safety and validation at the template level
export const ContactEmailTemplatePropsSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
})
