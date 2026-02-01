import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Typography } from './typography'

interface ComingSoonProps {
  title: string
  description: string
  children: React.ReactNode
}

export default function ComingSoon({ title, description, children }: ComingSoonProps) {
  return (
    <Card className="text-center border-dashed shadow-primary-300 shadow-xl">
      <CardHeader>
        <CardTitle className="">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Typography variant="p" className="text-muted-foreground">
          {description}
        </Typography>
        {children}
      </CardContent>
    </Card>
  )
}
