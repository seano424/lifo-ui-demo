"use client";

import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Calendar,
  CheckCircle,
  Clock,
  Shield,
  Smartphone,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  image?: React.ReactNode;
  reversed?: boolean;
}

function FeatureCard({
  title,
  description,
  icon,
  image,
  reversed = false,
}: FeatureCardProps) {
  return (
    <div className="py-12">
      <div
        className={`flex flex-col justify-center ${reversed ? "xl:flex-row-reverse" : "xl:flex-row"} items-center gap-8 xl:gap-12 `}
      >
        {/* Content */}
        <div className="flex-1 space-y-6 text-center xl:text-left">
          <div className="flex flex-col sm:flex-row items-center justify-center xl:justify-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-100 to-secondary-100 flex items-center justify-center text-primary-700 shadow-lg flex-shrink-0">
              {icon}
            </div>
            <Typography
              variant="h2"
              className="text-2xl sm:text-3xl xl:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-800 via-primary-700 to-secondary-900"
            >
              {title}
            </Typography>
          </div>
          <Typography
            variant="p"
            className="text-lg sm:text-lg text-foreground/70 leading-relaxed max-w-2xl mx-auto xl:mx-0"
          >
            {description}
          </Typography>
        </div>

        {/* Visual/Image */}
        <div className="flex-1 flex justify-center w-full">
          <div className="relative w-full max-w-md">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-100/20 to-secondary-100/20 rounded-3xl blur-3xl"></div>
            <div className="relative bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm rounded-3xl p-4 sm:p-6 xl:p-8 shadow-2xl border border-white/20">
              {image}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockDashboard() {
  return (
    <div className="w-full space-y-4">
      <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-2xl p-4 sm:p-6 border border-primary-100">
        <div className="flex items-center justify-between mb-3">
          <Typography
            variant="p"
            className="text-sm sm:text-base font-medium text-primary-800"
          >
            Inventory Overview
          </Typography>
          <TrendingUp size={20} className="text-primary-600" />
        </div>
        <div className="flex flex-col justify-between gap-2">
          <Typography
            variant="h3"
            className="text-2xl sm:text-3xl font-bold text-primary-900"
          >
            1,247 Items
          </Typography>
          <Typography variant="p" className="text-sm text-primary-700">
            ↗ +12% from last month
          </Typography>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 bg-white/80 rounded-xl p-3 sm:p-4 border border-gray-100">
          <Typography variant="p" className="text-xs sm:text-sm text-gray-600">
            Expiring Soon
          </Typography>
          <Typography
            variant="h4"
            className="text-lg sm:text-xl font-bold text-red-600"
          >
            23
          </Typography>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 bg-white/80 rounded-xl p-3 sm:p-4 border border-gray-100">
          <Typography variant="p" className="text-xs sm:text-sm text-gray-600">
            Low Stock
          </Typography>
          <Typography
            variant="h4"
            className="text-lg sm:text-xl font-bold text-orange-600"
          >
            8
          </Typography>
        </div>
      </div>
    </div>
  );
}

function MockScanning() {
  return (
    <div className="w-full space-y-4 flex flex-col items-center">
      <div className="bg-gradient-to-br from-secondary-50 to-primary-50 rounded-2xl p-4 sm:p-6 border border-secondary-100 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
            <CheckCircle size={16} className="text-white" />
          </div>
          <Typography
            variant="p"
            className="text-sm sm:text-base font-medium text-secondary-800"
          >
            Scanning Active
          </Typography>
        </div>
        <div className="flex flex-col gap-1">
          <Typography
            variant="h3"
            className="text-xl sm:text-2xl font-bold text-secondary-900 mb-2"
          >
            Product Scanned
          </Typography>
          <Typography
            variant="p"
            className="text-sm sm:text-base text-secondary-700"
          >
            Organic Milk - 1L
          </Typography>
        </div>
        <Typography
          variant="p"
          className="text-xs sm:text-sm text-secondary-600"
        >
          Exp: 2024-01-15 | Stock: 24 units
        </Typography>
      </div>
      <div className="flex items-center justify-center">
        <Smartphone size={48} className="text-primary-400" />
      </div>
    </div>
  );
}

function MockAnalytics() {
  return (
    <div className="w-full space-y-4">
      <div className="bg-gradient-to-br from-white/90 to-white/70 rounded-2xl p-4 sm:p-6 border border-gray-200">
        <Typography
          variant="h4"
          className="text-lg sm:text-xl font-bold text-gray-800 mb-4"
        >
          Performance Analytics
        </Typography>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Typography
              variant="p"
              className="text-sm sm:text-base text-gray-600"
            >
              Waste Reduction
            </Typography>
            <Typography
              variant="p"
              className="text-sm sm:text-base font-bold text-green-600"
            >
              -34%
            </Typography>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
            <div
              className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 sm:h-3 rounded-full"
              style={{ width: "68%" }}
            ></div>
          </div>
          <div className="flex justify-between items-center">
            <Typography
              variant="p"
              className="text-sm sm:text-base text-gray-600"
            >
              Revenue Increase
            </Typography>
            <Typography
              variant="p"
              className="text-sm sm:text-base font-bold text-primary-600"
            >
              +28%
            </Typography>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
            <div
              className="bg-gradient-to-r from-secondary-500 to-primary-500 h-2 sm:h-3 rounded-full"
              style={{ width: "82%" }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockAI() {
  return (
    <div className="w-full space-y-4">
      <div className="bg-gradient-to-br from-primary-50 to-secondary-50 rounded-2xl p-6 border border-primary-100">
        <div className="flex items-center gap-3 mb-4">
          <Bot size={24} className="text-primary-600" />
          <Typography
            variant="h4"
            className="text-lg font-bold text-primary-800"
          >
            AI Recommendations
          </Typography>
        </div>
        <div className="space-y-3">
          <div className="bg-white/70 rounded-xl p-3 border border-primary-100/50">
            <div className="flex flex-col gap-1">
              <Typography
                variant="p"
                className="text-sm font-medium text-primary-800"
              >
                📦 Reorder milk products
              </Typography>
              <Typography variant="p" className="text-xs text-primary-600">
                Based on consumption patterns
              </Typography>
            </div>
          </div>
          <div className="bg-white/70 rounded-xl p-3 border border-primary-100/50">
            <div className="flex flex-col gap-1">
              <Typography
                variant="p"
                className="text-sm font-medium text-primary-800"
              >
                ⚡ Promote expiring items
              </Typography>
              <Typography variant="p" className="text-xs text-primary-600">
                23 items expire in 2 days
              </Typography>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FeaturesPage() {
  return (
    <div className="min-h-screen py-12 sm:py-16 lg:py-20 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 lg:mb-20">
          <Typography
            as="h1"
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-800 via-primary-700 to-secondary-900 mb-4 sm:mb-6"
          >
            Powerful Features
          </Typography>
          <Typography
            variant="p"
            className="text-lg sm:text-xl text-foreground/70 max-w-3xl mx-auto leading-relaxed px-4"
          >
            Everything you need to manage your inventory efficiently with
            AI-powered insights and real-time tracking.
          </Typography>
        </div>

        {/* Features */}
        <div className="flex flex-col items-center space-y-12 lg:space-y-16">
          <div className="w-full max-w-6xl">
            {/* Real-time Dashboard */}
            <FeatureCard
              title="Real-time Dashboard"
              description="Get instant insights into your inventory with our comprehensive dashboard. Track stock levels, monitor expiration dates, and identify trends at a glance. Make informed decisions with real-time data visualization and automated alerts."
              icon={<BarChart3 size={32} />}
              image={<MockDashboard />}
            />
          </div>

          <div className="w-full max-w-6xl">
            {/* Smart Scanning */}
            <FeatureCard
              title="Smart Scanning"
              description="Effortlessly manage your inventory with our advanced scanning technology. Simply scan products to update stock levels, track expiration dates, and maintain accurate records. Works seamlessly on any mobile device."
              icon={<Smartphone size={32} />}
              image={<MockScanning />}
              reversed
            />
          </div>

          <div className="w-full max-w-6xl">
            {/* Performance Analytics */}
            <FeatureCard
              title="Performance Analytics"
              description="Understand your business performance with detailed analytics and reporting. Track waste reduction, revenue growth, and operational efficiency. Get actionable insights to optimize your inventory management strategy."
              icon={<TrendingUp size={32} />}
              image={<MockAnalytics />}
            />
          </div>

          <div className="w-full max-w-6xl">
            {/* AI-Powered Insights */}
            <FeatureCard
              title="AI-Powered Insights"
              description="Leverage artificial intelligence to optimize your inventory management. Get smart recommendations for reordering, promotional strategies, and waste reduction. Our AI learns from your patterns to provide personalized suggestions."
              icon={<Bot size={32} />}
              image={<MockAI />}
              reversed
            />
          </div>
        </div>

        {/* Additional Features Grid */}
        <div className="mt-16 lg:mt-24 flex flex-col ">
          <Typography
            variant="h2"
            as="h2"
            className=" text-4xl sm:text-5xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-primary-800 via-primary-700 to-secondary-900 mb-12 lg:mb-16 pb-2"
          >
            Everything You Need
          </Typography>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {[
              {
                icon: <Calendar size={24} />,
                title: "Expiry Tracking",
                description:
                  "Never miss expiration dates with automated alerts and LIFO management.",
              },
              {
                icon: <Shield size={24} />,
                title: "Data Security",
                description:
                  "Enterprise-grade security to protect your business data and customer information.",
              },
              {
                icon: <Zap size={24} />,
                title: "Fast Performance",
                description:
                  "Lightning-fast processing and real-time updates for seamless operations.",
              },
              {
                icon: <Target size={24} />,
                title: "Accurate Tracking",
                description:
                  "Precise inventory tracking with barcode scanning and automated updates.",
              },
              {
                icon: <Clock size={24} />,
                title: "Time Savings",
                description:
                  "Automate routine tasks and save hours of manual inventory management.",
              },
              {
                icon: <Users size={24} />,
                title: "Team Collaboration",
                description:
                  "Multi-user support with role-based permissions and team management.",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="group p-6 rounded-3xl bg-gradient-to-br from-white to-secondary-50/80 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-100 to-secondary-100 flex items-center justify-center text-primary-700 mb-4 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <div className="flex flex-col gap-1">
                  <Typography
                    variant="h3"
                    className="text-xl font-bold text-foreground mb-3"
                  >
                    {feature.title}
                  </Typography>
                  <Typography
                    variant="p"
                    className="text-foreground/70 leading-relaxed"
                  >
                    {feature.description}
                  </Typography>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 lg:mt-24 text-center">
          <div className="flex flex-col items-center gap-4 rounded-3xl p-6 sm:p-8 lg:p-12 ">
            <Typography
              variant="h2"
              className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-800 via-primary-700 to-secondary-900 mb-4 lg:mb-6"
            >
              Ready to Transform Your Inventory?
            </Typography>
            <Typography
              variant="p"
              className="text-lg sm:text-xl text-foreground/70 mb-6 lg:mb-8 max-w-2xl mx-auto px-4"
            >
              Join thousands of businesses already using LIFO.AI to optimize
              their inventory management and reduce waste.
            </Typography>
            <Button
              asLink
              href="/pricing"
              className="bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
              Start Free Trial
              <ArrowRight size={20} className="ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
