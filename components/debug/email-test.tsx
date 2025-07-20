// components/dev/email-test.tsx (Development only)

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { Mail, Send, AlertCircle, CheckCircle2 } from 'lucide-react'

interface TestResult {
  success: boolean
  messageId?: string
  error?: string
  message?: string
}

export function EmailTestComponent() {
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState<'welcome' | 'pin_reset'>('welcome')
  const [result, setResult] = useState<TestResult | null>(null)

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  const handleSendTest = async () => {
    if (!email || !name) {
      toast.error('Veuillez remplir tous les champs')
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          email,
          name,
        }),
      })

      const data = await response.json()
      setResult(data)

      if (data.success) {
        toast.success('Email de test envoyé avec succès!')
      } else {
        toast.error(`Échec de l'envoi: ${data.error}`)
      }
    } catch (error: unknown) {
      const errorResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur réseau',
      }
      setResult(errorResult)
      toast.error(`Erreur: ${errorResult.error}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Test Email (Dev)
        </CardTitle>
        <CardDescription>Testez l&apos;envoi d&apos;emails Resend en développement</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="test-email">Email de test</Label>
          <Input
            id="test-email"
            type="email"
            placeholder="votre-email@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="test-name">Nom de test</Label>
          <Input
            id="test-name"
            placeholder="Jean Dupont"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="test-type">Type d&apos;email</Label>
          <Select
            value={type}
            onValueChange={(value: 'welcome' | 'pin_reset') => setType(value)}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="welcome">Email d&apos;accueil</SelectItem>
              <SelectItem value="pin_reset">Réinitialisation PIN</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleSendTest}
          disabled={isLoading || !email || !name}
          className="w-full flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Envoi...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Envoyer le test
            </>
          )}
        </Button>

        {result && (
          <Alert variant={result.success ? 'default' : 'destructive'}>
            {result.success ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              <div className="space-y-1">
                <div>{result.message || result.error}</div>
                {result.messageId && (
                  <div className="text-xs font-mono">ID: {result.messageId}</div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-muted-foreground">
          <p>
            <strong>Test credentials:</strong>
          </p>
          <p>Username: testuser</p>
          <p>PIN: 1234</p>
          <p>Store: Test Store LIFO</p>
        </div>
      </CardContent>
    </Card>
  )
}
