import { Typography } from '@/components/ui/typography'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RevealAnimation } from '@/components/ui/reveal-animation'
import { ArrowLeft, Clock, CheckCircle, ScanLine, Camera, AlertTriangle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function ScanInProcessPage() {
  return (
    <main className="min-h-screen">
      <div className="max-w-4xl mx-auto px-5 py-12 space-y-8">
        
        {/* Navigation */}
        <RevealAnimation direction="none">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/support" className="hover:text-foreground transition-colors">Support</Link>
            <span>•</span>
            <Link href="/support/workflows" className="hover:text-foreground transition-colors">Core Workflows</Link>
            <span>•</span>
            <span className="text-foreground">Scan-In Process</span>
          </div>
        </RevealAnimation>
        
        {/* Article Header */}
        <RevealAnimation direction="none" delay={0.1}>
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock size={14} />
                10 min read
              </div>
              <div className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full text-xs">
                <ScanLine size={12} />
                Essential workflow
              </div>
            </div>
            
            <Typography variant="h1" className="text-3xl sm:text-4xl">
              Scan-In Process
            </Typography>
            
            <Typography variant="p" color="muted" className="text-lg">
              Master the scan-in workflow to efficiently add products to your inventory. 
              This comprehensive guide covers everything from basic scanning to advanced troubleshooting.
            </Typography>
          </div>
        </RevealAnimation>

        {/* Content */}
        <RevealAnimation delay={0.2} direction="up">
          <div className="space-y-8">
            
            {/* Overview */}
            <Card>
              <CardContent className="p-8">
                <Typography variant="h2" className="text-2xl font-bold mb-4">
                  What is the Scan-In Process?
                </Typography>
                <Typography variant="p" className="mb-4">
                  The Scan-In process is how you add new products to your LIFO inventory system. 
                  Using our mobile app, you'll scan product barcodes to automatically capture product information, 
                  expiry dates, and create inventory batches.
                </Typography>
                <Typography variant="p">
                  This process is the foundation of effective inventory management in LIFO, 
                  ensuring accurate tracking from the moment products arrive at your store.
                </Typography>
              </CardContent>
            </Card>

            {/* Step by Step Process */}
            <Card>
              <CardContent className="p-8">
                <Typography variant="h2" className="text-2xl font-bold mb-6">
                  Step-by-Step Scan-In Process
                </Typography>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      1
                    </div>
                    <div>
                      <Typography variant="p" className="font-semibold mb-2">
                        Open the LIFO Mobile App
                      </Typography>
                      <Typography variant="p" color="muted" className="mb-2">
                        Launch the LIFO app on your mobile device and ensure you're logged in to your store account.
                      </Typography>
                      <Typography variant="p" color="muted" className="text-sm">
                        <strong>Tip:</strong> Make sure you have good lighting and a stable internet connection.
                      </Typography>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      2
                    </div>
                    <div>
                      <Typography variant="p" className="font-semibold mb-2">
                        Navigate to Scan-In
                      </Typography>
                      <Typography variant="p" color="muted" className="mb-2">
                        Tap the "Scan In" button on the main dashboard or use the camera icon in the bottom navigation.
                      </Typography>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      3
                    </div>
                    <div>
                      <Typography variant="p" className="font-semibold mb-2">
                        Scan Product Barcode
                      </Typography>
                      <Typography variant="p" color="muted" className="mb-2">
                        Point your camera at the product barcode. The app will automatically detect and scan the barcode.
                      </Typography>
                      <Typography variant="p" color="muted" className="text-sm">
                        <strong>Best Practice:</strong> Hold the device steady and ensure the barcode fills about 60% of the screen.
                      </Typography>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      4
                    </div>
                    <div>
                      <Typography variant="p" className="font-semibold mb-2">
                        Capture Expiry Date
                      </Typography>
                      <Typography variant="p" color="muted" className="mb-2">
                        After scanning the barcode, point the camera at the expiry date on the product. 
                        Our AI will automatically read and parse the date.
                      </Typography>
                      <Typography variant="p" color="muted" className="text-sm">
                        <strong>Manual Entry:</strong> If automatic recognition fails, you can manually enter the date.
                      </Typography>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      5
                    </div>
                    <div>
                      <Typography variant="p" className="font-semibold mb-2">
                        Enter Quantity & Details
                      </Typography>
                      <Typography variant="p" color="muted" className="mb-2">
                        Specify the quantity of items you're adding and verify product details. 
                        Add any additional information like supplier or batch notes if needed.
                      </Typography>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      6
                    </div>
                    <div>
                      <Typography variant="p" className="font-semibold mb-2">
                        Confirm and Save
                      </Typography>
                      <Typography variant="p" color="muted">
                        Review all information and tap "Add to Inventory" to complete the scan-in process. 
                        The product will immediately appear in your inventory dashboard.
                      </Typography>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Best Practices */}
            <Card>
              <CardContent className="p-8">
                <Typography variant="h2" className="text-2xl font-bold mb-6">
                  Best Practices for Accurate Scanning
                </Typography>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <Typography variant="p" className="font-semibold mb-1">
                          Good Lighting
                        </Typography>
                        <Typography variant="p" color="muted" className="text-sm">
                          Ensure adequate lighting for clear barcode and date recognition
                        </Typography>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <Typography variant="p" className="font-semibold mb-1">
                          Steady Hands
                        </Typography>
                        <Typography variant="p" color="muted" className="text-sm">
                          Hold the device steady to avoid blurry scans
                        </Typography>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <Typography variant="p" className="font-semibold mb-1">
                          Clean Barcodes
                        </Typography>
                        <Typography variant="p" color="muted" className="text-sm">
                          Wipe dirt or moisture from barcodes before scanning
                        </Typography>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <Typography variant="p" className="font-semibold mb-1">
                          Proper Distance
                        </Typography>
                        <Typography variant="p" color="muted" className="text-sm">
                          Keep the camera 15-20cm away from the barcode
                        </Typography>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <Typography variant="p" className="font-semibold mb-1">
                          Batch Processing
                        </Typography>
                        <Typography variant="p" color="muted" className="text-sm">
                          Scan similar products together for efficiency
                        </Typography>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <Typography variant="p" className="font-semibold mb-1">
                          Double-Check Dates
                        </Typography>
                        <Typography variant="p" color="muted" className="text-sm">
                          Always verify automatically captured expiry dates
                        </Typography>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Troubleshooting */}
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-8">
                <div className="flex items-start gap-3 mb-6">
                  <AlertTriangle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-1" />
                  <Typography variant="h2" className="text-2xl font-bold text-orange-900">
                    Troubleshooting Common Issues
                  </Typography>
                </div>
                <div className="space-y-4 text-orange-800">
                  <div>
                    <Typography variant="p" className="font-semibold mb-2">
                      Barcode Won't Scan
                    </Typography>
                    <Typography variant="p" className="text-sm mb-2">
                      • Check lighting and clean the barcode surface<br/>
                      • Try different angles and distances<br/>
                      • Use manual barcode entry as backup
                    </Typography>
                  </div>
                  <div>
                    <Typography variant="p" className="font-semibold mb-2">
                      Expiry Date Not Recognized
                    </Typography>
                    <Typography variant="p" className="text-sm mb-2">
                      • Ensure the date is clearly visible and unobstructed<br/>
                      • Try different lighting conditions<br/>
                      • Use manual date entry if automatic recognition fails
                    </Typography>
                  </div>
                  <div>
                    <Typography variant="p" className="font-semibold mb-2">
                      App Running Slowly
                    </Typography>
                    <Typography variant="p" className="text-sm">
                      • Check your internet connection<br/>
                      • Close other apps to free up memory<br/>
                      • Restart the LIFO app if necessary
                    </Typography>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
              <CardContent className="p-8">
                <Typography variant="h2" className="text-2xl font-bold mb-4">
                  Master the Complete Workflow
                </Typography>
                <Typography variant="p" color="muted" className="mb-6">
                  Now that you've mastered scanning products in, learn about the scan-out process 
                  and inventory management to complete your LIFO expertise.
                </Typography>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button asLink href="/support/workflows/scan-out">
                    Learn Scan-Out Process
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                  <Button variant="outline" asLink href="/support/workflows/inventory-management">
                    Inventory Management
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </RevealAnimation>

        {/* Navigation */}
        <RevealAnimation delay={0.4} direction="up">
          <div className="flex justify-between items-center pt-8 border-t">
            <Link href="/support/workflows" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={16} />
              Back to Core Workflows
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