"use client";

import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { ArrowRight, Building2, Check, Sparkles, Users } from "lucide-react";

interface PricingCardProps {
  title: string;
  subtitle: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  fees: { type: string; percentage: string }[];
  sellingPoint: string;
  isPopular?: boolean;
  isComingSoon?: boolean;
  icon: React.ReactNode;
}

function PricingCard({
  title,
  subtitle,
  price,
  period,
  description,
  features,
  fees,
  sellingPoint,
  isPopular = false,
  isComingSoon = false,
  icon,
}: PricingCardProps) {
  return (
    <div className="group relative flex flex-col p-8 rounded-3xl backdrop-blur-md border transition-all duration-500 h-full bg-gradient-to-br from-white/80 to-white/60 border-white/20 shadow-lg hover:shadow-xl hover:from-white/90 hover:to-white/70">
      {/* Popular badge */}
      {isPopular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-gradient-to-r from-primary-700 to-secondary-700 text-white px-2 py-2 rounded-full text-sm font-semibold flex items-center gap-2">
            <Sparkles size={16} />
            Most Popular
          </div>
        </div>
      )}

      {/* Coming Soon badge */}
      {isComingSoon && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-gradient-to-r from-gray-400 to-gray-500 text-white px-4 py-2 rounded-full text-xs font-medium">
            Coming Soon
          </div>
        </div>
      )}

      {/* Icon and Title */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm bg-gradient-to-br from-primary-50 to-secondary-50 text-secondary-700">
          {icon}
        </div>
        <div className="flex flex-col gap-1">
          <Typography
            variant="h3"
            className="text-2xl font-bold text-foreground"
          >
            {title}
          </Typography>
          <Typography variant="p" className="text-foreground/70 text-sm">
            {subtitle}
          </Typography>
        </div>
      </div>

      {/* Price */}
      <div className="mb-6">
        <div className="flex items-baseline gap-2">
          <Typography
            variant="h2"
            className="text-4xl font-bold text-foreground"
          >
            {price}
          </Typography>
          {period && (
            <Typography variant="p" className="text-foreground/60">
              {period}
            </Typography>
          )}
        </div>
      </div>

      {/* Description */}
      <Typography
        variant="p"
        className="text-foreground/80 mb-6 leading-relaxed"
      >
        {description}
      </Typography>

      {/* Features */}
      <div className="flex-grow mb-6">
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <Check
                size={18}
                className="text-primary-600 mt-0.5 flex-shrink-0"
              />
              <Typography variant="p" className="text-foreground/80 text-sm">
                {feature}
              </Typography>
            </li>
          ))}
        </ul>
      </div>

      {/* Fees */}
      {fees.length > 0 && (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-primary-50/50 to-secondary-50/50 border border-primary-100/50">
          <Typography
            variant="h4"
            className="text-sm font-semibold text-foreground/80 mb-2"
          >
            Win-Win Fees:
          </Typography>
          {fees.map((fee, index) => (
            <div key={index} className="flex justify-between items-center">
              <Typography variant="p" className="text-xs text-foreground/70">
                {fee.type}
              </Typography>
              <Typography
                variant="p"
                className="text-xs font-medium text-primary-700"
              >
                {fee.percentage}
              </Typography>
            </div>
          ))}
        </div>
      )}

      {/* Selling Point */}
      <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-secondary-50/50 to-primary-50/50 border border-secondary-100/50">
        <Typography
          variant="p"
          className="text-sm font-medium text-secondary-800"
        >
          💡 {sellingPoint}
        </Typography>
      </div>

      {/* CTA Button */}
      <Button
        className={`w-full group-hover:scale-105 transition-transform duration-300 ${
          isComingSoon
            ? "opacity-50 cursor-not-allowed"
            : isPopular
              ? "hover:from-primary-700 hover:to-secondary-700"
              : ""
        }`}
        disabled={isComingSoon}
      >
        {isComingSoon ? "Coming Soon" : "Get Started"}
        {!isComingSoon && <ArrowRight size={16} className="ml-2" />}
      </Button>
    </div>
  );
}

export default function PricingPage() {
  return (
    <div className="min-h-screen py-20 px-4 relative overflow-hidden">

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center justify-center mb-16">
          <Typography
            as="h1"
            className="text-center text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-800 via-primary-700 to-secondary-900 mb-6"
          >
            Choose Your Plan
          </Typography>
          <Typography
            variant="p"
            className="text-center text-xl text-foreground/70 max-w-2xl mx-auto leading-relaxed"
          >
            Start with our free trial and scale as you grow. No lock-in, full
            support included.
          </Typography>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16 mt-8">
          {/* Free Trial */}
          <PricingCard
            title="Free Trial"
            subtitle="Pilot shops"
            price="Free"
            period="3 months"
            description="All features, with no limitation, for a 3-month free trial."
            features={[
              "3 days of Onboarding and Training",
              "Full support included",
              "No lock-in - exit anytime",
              "All features unlocked",
            ]}
            fees={[]}
            sellingPoint="Perfect for testing our solution risk-free"
            icon={<Sparkles size={24} />}
          />

          {/* Light */}
          <PricingCard
            title="Light"
            subtitle="Small shops, 1 seat only"
            price="9€"
            period="/month"
            description="For small shops starting their inventory management journey."
            features={[
              "Maximum 3 months of data in Dashboard",
              "1 user seat included",
              "Core inventory features",
              "Email support",
            ]}
            fees={[
              { type: "Margin of products sold", percentage: "30%" },
              { type: "Tax credit", percentage: "20%" },
            ]}
            sellingPoint="Get started on managing your inventory"
            icon={<Users size={24} />}
          />

          {/* Pro */}
          <PricingCard
            title="Pro"
            subtitle="Bigger shops, 2+ FTE"
            price="39€"
            period="/month"
            description="For growing businesses that need team collaboration and advanced features."
            features={[
              "Unlimited data retention",
              "2+ user seats",
              "Role management",
              "Priority support",
              "Advanced analytics",
            ]}
            fees={[
              { type: "Margin of products sold", percentage: "30%" },
              { type: "Tax credit", percentage: "20%" },
            ]}
            sellingPoint="Manage roles in your shop effectively"
            isPopular={true}
            icon={<Building2 size={24} />}
          />

          {/* Enterprise */}
          <PricingCard
            title="Enterprise"
            subtitle="For chains"
            price="Custom"
            description="Tailored solution for multi-location businesses with advanced needs."
            features={[
              "Multiple POS management",
              "Advanced analytics",
              "Custom integrations",
              "Dedicated support",
              "Custom pricing per POS",
            ]}
            fees={[
              { type: "Margin of products sold", percentage: "Custom%" },
              { type: "Tax credit", percentage: "Custom%" },
            ]}
            sellingPoint="Manage multiple POS and get advanced analytics"
            isComingSoon={true}
            icon={<Building2 size={24} />}
          />
        </div>

        {/* Bottom Note */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-primary-50 to-secondary-50 border border-primary-100">
            <Typography variant="p" className="text-sm text-foreground/70">
              💡 <strong>Note:</strong> Pricing is subject to change. All fees
              are to be confirmed.
            </Typography>
          </div>
        </div>
      </div>
    </div>
  );
}
