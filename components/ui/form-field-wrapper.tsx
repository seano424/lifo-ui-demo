'use client'

import type { ReactNode } from 'react'
import type { Control, FieldPath, FieldValues } from 'react-hook-form'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { safeFieldValue } from '@/lib/utils/form-helpers'

interface FormFieldWrapperProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label: string
  placeholder: string
  required?: boolean
  disabled?: boolean
  type?: 'text' | 'email' | 'password' | 'tel'
  children?: ReactNode
}

/**
 * Reusable form field wrapper that handles common patterns
 */
export function FormFieldWrapper<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  required = false,
  disabled = false,
  type = 'text',
  children,
}: FormFieldWrapperProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col gap-2">
          <FormLabel>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <FormControl>
            {children || (
              <Input
                type={type}
                placeholder={placeholder}
                disabled={disabled}
                {...field}
                value={safeFieldValue(field.value)}
              />
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

/**
 * Wrapper for optional form fields with "(Optional)" suffix
 */
export function OptionalFormFieldWrapper<TFieldValues extends FieldValues>(
  props: Omit<FormFieldWrapperProps<TFieldValues>, 'required'>,
) {
  return <FormFieldWrapper {...props} label={`${props.label} (Optional)`} required={false} />
}

/**
 * Wrapper for required form fields
 */
export function RequiredFormFieldWrapper<TFieldValues extends FieldValues>(
  props: Omit<FormFieldWrapperProps<TFieldValues>, 'required'>,
) {
  return <FormFieldWrapper {...props} required={true} />
}
