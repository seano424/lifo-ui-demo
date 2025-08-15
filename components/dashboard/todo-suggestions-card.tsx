'use client'

import { ArrowRight, CheckSquare, ListTodo } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

import { Card, CardContent } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'

export function TodoSuggestionsCard() {
  const t = useTranslations('dashboard.quickActions')

  return (
    <Link href="/dashboard/todos" className="block h-full">
      <Card className="border-0 shadow-sm hover:shadow-md transition-all hover:bg-secondary/5 h-full rounded-md overflow-hidden group">
        <CardContent className="border-l-4 border-l-secondary p-3 py-3 flex flex-col">
          <div className="flex items-start gap-3 mb-1.5">
            <div className="p-1.5 bg-secondary rounded-md flex-shrink-0 text-secondary-foreground shadow-sm">
              <CheckSquare className="h-3.5 w-3.5" />
            </div>

            <div className="flex-grow">
              <div className="flex items-center justify-between">
                <Typography variant="h4" className="font-semibold text-sm text-secondary">
                  {t('todoSuggestions.title')}
                </Typography>
                <div className="flex items-center gap-2">
                  <ListTodo className="h-4 w-4 text-secondary/70" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Typography variant="p" className="text-xs text-muted-foreground pl-8 pr-5">
              {t('todoSuggestions.description')}
            </Typography>
            <ArrowRight className="h-4 w-4 text-secondary transform transition-transform group-hover:translate-x-1 flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
