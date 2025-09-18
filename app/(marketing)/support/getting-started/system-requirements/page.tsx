import { Typography } from '@/components/ui/typography'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RevealAnimation } from '@/components/ui/reveal-animation'
import { ArrowLeft, Clock, CheckCircle, Smartphone, Monitor, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function SystemRequirementsPage() {
  return (
    <main className="min-h-screen">
      <div className="max-w-4xl mx-auto px-5 py-12 space-y-8">
        
        {/* Navigation */}
        <RevealAnimation direction="none">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/support" className="hover:text-foreground transition-colors">Support</Link>
            <span>•</span>
            <Link href="/support/getting-started" className="hover:text-foreground transition-colors">Getting Started</Link>
            <span>•</span>
            <span className="text-foreground">System Requirements</span>
          </div>
        </RevealAnimation>
        
        {/* Article Header */}
        <RevealAnimation direction="none" delay={0.1}>
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock size={14} />
                2 min read
              </div>
            </div>
            
            <Typography variant="h1" className="text-3xl sm:text-4xl">
              System Requirements
            </Typography>
            
            <Typography variant="p" color="muted" className="text-lg">
              Ensure your devices and systems are compatible with LIFO for the best experience. 
              Our platform is designed to work seamlessly across all modern devices.
            </Typography>
          </div>
        </RevealAnimation>

        {/* Content */}
        <RevealAnimation delay={0.2} direction="up">
          <div className="space-y-8">
            
            {/* Mobile Requirements */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Smartphone className="h-6 w-6 text-primary" />
                  <Typography variant="h2" className="text-2xl font-bold">
                    Mobile App Requirements
                  </Typography>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Typography variant="h3" className="text-lg font-semibold mb-3">
                      iOS Devices
                    </Typography>
                    <div className="space-y-2">
                      <div className="flex gap-2 items-center">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <Typography variant="p" className="text-sm">iOS 14.0 or later</Typography>
                      </div>
                      <div className="flex gap-2 items-center">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <Typography variant="p" className="text-sm">iPhone 8 or newer</Typography>
                      </div>
                      <div className="flex gap-2 items-center">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <Typography variant="p" className="text-sm">iPad (6th generation) or newer</Typography>
                      </div>
                      <div className="flex gap-2 items-center">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <Typography variant="p" className="text-sm">Camera with autofocus</Typography>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Typography variant="h3" className="text-lg font-semibold mb-3">
                      Android Devices
                    </Typography>
                    <div className="space-y-2">
                      <div className="flex gap-2 items-center">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <Typography variant="p" className="text-sm">Android 8.0 (API level 26) or later</Typography>
                      </div>
                      <div className="flex gap-2 items-center">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <Typography variant="p" className="text-sm">3GB RAM minimum (4GB recommended)</Typography>
                      </div>
                      <div className="flex gap-2 items-center">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <Typography variant="p" className="text-sm">Camera with autofocus and flash</Typography>
                      </div>
                      <div className="flex gap-2 items-center">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <Typography variant="p" className="text-sm">Internet connection (WiFi or mobile data)</Typography>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Web Requirements */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Monitor className="h-6 w-6 text-primary" />
                  <Typography variant="h2" className="text-2xl font-bold">
                    Web Dashboard Requirements
                  </Typography>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Typography variant="h3" className="text-lg font-semibold mb-3">
                      Supported Browsers
                    </Typography>
                    <div className="space-y-2">
                      <div className="flex gap-2 items-center">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <Typography variant="p" className="text-sm">Chrome 90+ (Recommended)</Typography>
                      </div>
                      <div className="flex gap-2 items-center">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <Typography variant="p" className="text-sm">Firefox 88+</Typography>
                      </div>
                      <div className="flex gap-2 items-center">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <Typography variant="p" className="text-sm">Safari 14+</Typography>
                      </div>
                      <div className="flex gap-2 items-center">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <Typography variant="p" className="text-sm">Edge 90+</Typography>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Typography variant="h3" className="text-lg font-semibold mb-3">
                      System Requirements
                    </Typography>
                    <div className="space-y-2">
                      <div className="flex gap-2 items-center">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <Typography variant="p" className="text-sm">8GB RAM minimum</Typography>
                      </div>
                      <div className="flex gap-2 items-center">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <Typography variant="p" className="text-sm">Stable internet connection</Typography>
                      </div>
                      <div className="flex gap-2 items-center">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <Typography variant="p" className="text-sm">1920x1080 resolution minimum</Typography>
                      </div>
                      <div className="flex gap-2 items-center">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <Typography variant="p" className="text-sm">JavaScript and cookies enabled</Typography>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Important Notes */}
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-8">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-1" />
                  <div>
                    <Typography variant="h3" className="text-lg font-semibold mb-3 text-orange-900">
                      Important Notes
                    </Typography>
                    <div className="space-y-3 text-orange-800">
                      <Typography variant="p" className="text-sm">
                        <strong>Camera Quality:</strong> For best scanning results, ensure your device has a good quality camera with autofocus capability.
                      </Typography>
                      <Typography variant="p" className="text-sm">
                        <strong>Internet Connection:</strong> A stable internet connection is required for real-time syncing between devices.
                      </Typography>
                      <Typography variant="p" className="text-sm">
                        <strong>Storage:</strong> The mobile app requires approximately 150MB of storage space for optimal performance.
                      </Typography>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
              <CardContent className="p-8">
                <Typography variant="h2" className="text-2xl font-bold mb-4">
                  Ready to Set Up Your Account?
                </Typography>
                <Typography variant="p" color="muted" className="mb-6">
                  Your devices meet the requirements? Great! Let's move on to setting up your LIFO account.
                </Typography>
                <Button asLink href="/support/getting-started/account-setup">
                  Account Setup Guide
                </Button>
              </CardContent>
            </Card>
          </div>
        </RevealAnimation>

        {/* Navigation */}
        <RevealAnimation delay={0.4} direction="up">
          <div className="flex justify-between items-center pt-8 border-t">
            <Link href="/support/getting-started" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={16} />
              Back to Getting Started
            </Link>
            <Button variant="outline" asLink href="/contact">
              Need Help?
            </Button>
          </div>
        </RevealAnimation>
      </div>
    </main>
  )
}