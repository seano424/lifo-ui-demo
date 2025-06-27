import { z } from 'zod'

export const storeDetailsSchema = z.object({
  name: z.string().min(2, 'Store name must be at least 2 characters'),
  type: z.enum(
    [
      'supermarket',
      'grocery_store',
      'bakery',
      'butcher',
      'delicatessen',
      'restaurant',
      'cafe',
      'other',
    ],
    {
      required_error: 'Please select a store type',
    },
  ),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  city: z.string().min(2, 'City is required'),
  postalCode: z.string().min(4, 'Valid postal code required').max(10, 'Postal code too long'),
  country: z.string().min(2, 'Country is required'),
  phone: z.string().min(10, 'Valid phone number required').optional().or(z.literal('')),
})

export type StoreDetailsForm = z.infer<typeof storeDetailsSchema>
