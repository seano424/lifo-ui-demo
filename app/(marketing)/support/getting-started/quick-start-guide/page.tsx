import { Typography } from '@/components/ui/typography'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RevealAnimation } from '@/components/ui/reveal-animation'
import { ArrowLeft, Clock, CheckCircle, Zap, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function QuickStartGuidePage() {
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
            <span className="text-foreground">Quick Start Guide</span>
          </div>
        </RevealAnimation>
        
        {/* Article Header */}
        <RevealAnimation direction="none" delay={0.1}>
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock size={14} />
                5 min read
              </div>
              <div className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full text-xs">
                <Zap size={12} />
                Start here
              </div>
            </div>
            
            <Typography variant="h1" className="text-3xl sm:text-4xl">
              Quick Start Guide
            </Typography>
            
            <Typography variant="p" color="muted" className="text-lg">
              Welcome to LIFO! This guide will walk you through the core concepts and get you up and running in minutes. 
              By the end, you'll understand exactly how LIFO can transform your inventory management.
            </Typography>
          </div>
        </RevealAnimation>

        {/* Article Content */}
        <RevealAnimation delay={0.2} direction="up">
          <div className="space-y-8">
            
            {/* What is LIFO Section */}
            <Card>
              <CardContent className="p-8">
                <Typography variant="h2" className="text-2xl font-bold mb-4">
                  What is LIFO?
                </Typography>
                <Typography variant="p" className="mb-4">
                  LIFO (Last In, First Out) is a revolutionary inventory management platform designed specifically 
                  for retail businesses to reduce food waste and optimize stock management. Unlike traditional 
                  inventory systems, LIFO focuses on expiry date management and intelligent product rotation.
                </Typography>
                <Typography variant="p">
                  Our platform combines AI-powered scanning technology with real-time analytics to help you 
                  make smarter decisions about your inventory, reduce waste by up to 40%, and increase profitability.
                </Typography>
              </CardContent>
            </Card>

            {/* Key Benefits */}
            <Card>
              <CardContent className="p-8">
                <Typography variant="h2" className="text-2xl font-bold mb-6">
                  Key Benefits You'll Experience
                </Typography>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-1" />
                    <div>
                      <Typography variant="p" className="font-semibold mb-1">
                        Reduce Food Waste by 40%
                      </Typography>
                      <Typography variant="p" color="muted" className="text-sm">
                        Smart expiry tracking ensures products are sold or donated before they expire
                      </Typography>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-1" />
                    <div>
                      <Typography variant="p" className="font-semibold mb-1">
                        Save 5+ Hours Weekly
                      </Typography>
                      <Typography variant="p" color="muted" className="text-sm">
                        Automated scanning and tracking eliminates manual inventory processes
                      </Typography>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-1" />
                    <div>
                      <Typography variant="p" className="font-semibold mb-1">
                        Increase Profits by 15%
                      </Typography>
                      <Typography variant="p" color="muted" className="text-sm">
                        Better inventory management and reduced waste directly impact your bottom line
                      </Typography>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-1" />
                    <div>
                      <Typography variant="p" className="font-semibold mb-1">
                        Real-time Insights
                      </Typography>
                      <Typography variant="p" color="muted" className="text-sm">
                        Dashboard analytics help you make data-driven inventory decisions
                      </Typography>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* How It Works */}
            <Card>
              <CardContent className="p-8">
                <Typography variant="h2" className="text-2xl font-bold mb-6">
                  How LIFO Works in 4 Simple Steps
                </Typography>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      1
                    </div>
                    <div>
                      <Typography variant="p" className="font-semibold mb-2">
                        Scan Products In
                      </Typography>
                      <Typography variant="p" color="muted">
                        Use our mobile app to scan product barcodes and automatically capture expiry dates. 
                        No manual data entry required.
                      </Typography>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      2
                    </div>
                    <div>
                      <Typography variant="p" className="font-semibold mb-2">
                        Get Smart Alerts
                      </Typography>
                      <Typography variant="p" color="muted">
                        Receive notifications when products are approaching expiry. 
                        Our AI prioritizes which items need attention first.
                      </Typography>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      3
                    </div>
                    <div>
                      <Typography variant="p" className="font-semibold mb-2">
                        Take Action
                      </Typography>
                      <Typography variant="p" color="muted">
                        Follow recommendations to discount, donate, or reposition products. 
                        Track all actions for complete visibility.
                      </Typography>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      4
                    </div>
                    <div>
                      <Typography variant="p" className="font-semibold mb-2">
                        Monitor Results
                      </Typography>
                      <Typography variant="p" color="muted">
                        View comprehensive analytics showing waste reduction, cost savings, 
                        and operational improvements over time.
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
                  Ready to Get Started?
                </Typography>
                <Typography variant="p" color="muted" className="mb-6">
                  Now that you understand how LIFO works, follow these next steps to set up your account 
                  and start reducing waste today.
                </Typography>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button asLink href="/support/getting-started/system-requirements">
                    Check System Requirements
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                  <Button variant="outline" asLink href="/support/getting-started/account-setup">
                    Account Setup Guide
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </RevealAnimation>

        {/* Back to Section */}
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