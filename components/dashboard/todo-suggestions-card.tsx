'use client'

import { ArrowRight, CheckSquare, ListTodo } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'

export function TodoSuggestionsCard() {
  const t = useTranslations('dashboard.quickActions')
  // Pour simuler des tâches en attente
  const pendingTasks = 5

  return (
    <Link href="/dashboard/todos" className="block h-full">
      <Card className="border-l-4 border-l-purple-500 border-t-0 border-r-0 border-b-0 shadow-sm hover:shadow-md transition-all hover:bg-gradient-to-r hover:from-purple-50 hover:to-transparent dark:hover:from-purple-900/10 dark:hover:to-transparent h-full rounded-md overflow-hidden group">
        <CardContent className="p-3 py-2.5 flex items-center gap-3">
          <div className="p-1.5 bg-gradient-to-br from-purple-500 via-violet-500 to-purple-600 rounded-md flex-shrink-0 text-white shadow-sm">
            <CheckSquare className="h-3.5 w-3.5" />
          </div>

          <div className="flex-grow">
            <div className="flex items-center justify-between">
              <Typography
                variant="h4"
                className="font-semibold text-sm bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 inline-block text-transparent bg-clip-text"
              >
                {t('todoSuggestions.title')}
              </Typography>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="bg-gradient-to-r from-purple-100 to-violet-100 dark:from-purple-900/40 dark:to-violet-900/40 text-purple-700 dark:text-purple-300 text-xs px-1.5 py-0 font-medium"
                >
                  {pendingTasks}
                </Badge>
                <ListTodo className="h-4 w-4 text-purple-500/70 dark:text-purple-400/70" />
              </div>
            </div>
            <Typography variant="p" className="text-xs text-muted-foreground line-clamp-1">
              {t('todoSuggestions.description')}
            </Typography>
          </div>

          <ArrowRight className="h-4 w-4 text-purple-500 transform transition-transform group-hover:translate-x-1" />
        </CardContent>
      </Card>
    </Link>
  )
}
