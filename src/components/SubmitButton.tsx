'use client'

import { useFormStatus } from 'react-dom'
import ActionButton from '@/components/ActionButtons'

export function SubmitButton({
  text = 'Submit',
  loadingText = 'Saving...',
  className = '',
}: {
  text?: string
  loadingText?: string
  className?: string
}) {
  const { pending } = useFormStatus()

  return (
    <ActionButton type="submit" loading={pending} className={className}>
      {pending ? loadingText : text}
    </ActionButton>
  )
}