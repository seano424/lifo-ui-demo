import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'

export function Hero() {
  return (
    <div className="flex flex-col gap-16 items-center py-12">
      {/* Main heading */}
      <div className="text-center max-w-3xl mx-auto">
        <Typography
          variant="h1"
          className="mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary"
        >
          Optimisez votre inventaire avec LIFO
        </Typography>

        <Typography variant="h2" className="mb-8 text-muted-foreground">
          La solution intelligente pour gérer vos stocks et maximiser votre rentabilité
        </Typography>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Button size="lg" className="px-8">
            Commencer gratuitement
          </Button>
          <Button size="lg" variant="outline" className="px-8">
            Voir la démo
          </Button>
        </div>
      </div>

      {/* Decorative divider */}
      <div className="w-full p-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent my-8" />
    </div>
  )
}
