import { Typography } from '@/components/ui/typography'

export default function TermsPage() {
  return (
    <main className="min-h-screen py-20 px-4 relative overflow-hidden">
      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center justify-center mb-16">
          <Typography
            variant="h1"
            className="text-center text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-800 via-primary-700 to-secondary-900 mb-6"
          >
            Terms and Conditions
          </Typography>
          <Typography variant="p" className="text-center text-sm text-muted-foreground">
            Last Updated: October 16, 2025
          </Typography>
        </div>

        {/* Content */}
        <div className="rounded-3xl bg-gradient-to-br from-white/80 to-white/60 border border-white/20 shadow-lg p-8 md:p-12 space-y-8">
          {/* Section 1 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              1. Acceptance of Terms
            </Typography>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              By creating an account and using the LIFO application and website (collectively, the
              "Service"), you agree to be bound by these Terms and Conditions, including our privacy
              practices described herein. If you do not agree to these terms, please do not use the
              Service.
            </Typography>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              2. Description of Service
            </Typography>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              LIFO provides batch-level inventory management software designed to help retail stores
              track product expiration dates, reduce food waste, and optimize discount and donation
              decisions through image recognition technology and data analytics.
            </Typography>
          </section>

          {/* Section 3 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              3. User Accounts
            </Typography>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              You are responsible for:
            </Typography>
            <ul className="space-y-2 ml-6">
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • Providing accurate information during registration
                </Typography>
              </li>
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • Maintaining the security of your account credentials
                </Typography>
              </li>
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • All activities that occur under your account
                </Typography>
              </li>
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • Notifying us immediately of any unauthorized access
                </Typography>
              </li>
            </ul>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              We may assign different user roles (admin, manager, employee) with varying access
              levels to support your store operations.
            </Typography>
          </section>

          {/* Section 4 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              4. Data Collection and Use
            </Typography>
            <div className="space-y-4">
              <div>
                <Typography variant="h3" className="text-lg font-semibold text-foreground mb-2">
                  What Data We Collect:
                </Typography>
                <ul className="space-y-2 ml-6">
                  <li>
                    <Typography variant="p" className="text-foreground/80 leading-relaxed">
                      • Account information (name, email, store details, user role)
                    </Typography>
                  </li>
                  <li>
                    <Typography variant="p" className="text-foreground/80 leading-relaxed">
                      • Inventory data (product names, batch numbers, expiration dates, quantities)
                    </Typography>
                  </li>
                  <li>
                    <Typography variant="p" className="text-foreground/80 leading-relaxed">
                      • Product images captured through scanning (processed for expiration date
                      recognition)
                    </Typography>
                  </li>
                  <li>
                    <Typography variant="p" className="text-foreground/80 leading-relaxed">
                      • Usage data (actions taken, scan timestamps, discount/donation decisions)
                    </Typography>
                  </li>
                  <li>
                    <Typography variant="p" className="text-foreground/80 leading-relaxed">
                      • Device information (browser type, operating system, IP address)
                    </Typography>
                  </li>
                </ul>
              </div>
              <div>
                <Typography variant="h3" className="text-lg font-semibold text-foreground mb-2">
                  How We Use Your Data:
                </Typography>
                <ul className="space-y-2 ml-6">
                  <li>
                    <Typography variant="p" className="text-foreground/80 leading-relaxed">
                      • To provide and maintain the Service functionality
                    </Typography>
                  </li>
                  <li>
                    <Typography variant="p" className="text-foreground/80 leading-relaxed">
                      • To generate discount and donation recommendations
                    </Typography>
                  </li>
                  <li>
                    <Typography variant="p" className="text-foreground/80 leading-relaxed">
                      • To create analytics dashboards showing inventory value and waste metrics
                    </Typography>
                  </li>
                  <li>
                    <Typography variant="p" className="text-foreground/80 leading-relaxed">
                      • To improve our image recognition algorithms
                    </Typography>
                  </li>
                  <li>
                    <Typography variant="p" className="text-foreground/80 leading-relaxed">
                      • To communicate important Service updates
                    </Typography>
                  </li>
                  <li>
                    <Typography variant="p" className="text-foreground/80 leading-relaxed">
                      • To ensure compliance with food waste regulations
                    </Typography>
                  </li>
                </ul>
              </div>
              <div>
                <Typography variant="h3" className="text-lg font-semibold text-foreground mb-2">
                  Legal Basis (GDPR):
                </Typography>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  We process your data based on:
                </Typography>
                <ul className="space-y-2 ml-6">
                  <li>
                    <Typography variant="p" className="text-foreground/80 leading-relaxed">
                      • Performance of contract (providing the Service you signed up for)
                    </Typography>
                  </li>
                  <li>
                    <Typography variant="p" className="text-foreground/80 leading-relaxed">
                      • Legitimate interests (improving our Service, preventing fraud)
                    </Typography>
                  </li>
                  <li>
                    <Typography variant="p" className="text-foreground/80 leading-relaxed">
                      • Your consent (where explicitly requested)
                    </Typography>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              5. Data Ownership and Storage
            </Typography>
            <div className="space-y-4">
              <div>
                <Typography variant="h3" className="text-lg font-semibold text-foreground mb-2">
                  Your Data:
                </Typography>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  You retain full ownership of all data you input into the Service. Your data is
                  stored securely on servers located in the European Union and is encrypted both in
                  transit and at rest.
                </Typography>
              </div>
              <div>
                <Typography variant="h3" className="text-lg font-semibold text-foreground mb-2">
                  Data Retention:
                </Typography>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  We retain your data for as long as your account remains active. Upon account
                  deletion, we will delete or anonymize your data within 90 days, except where
                  retention is required by law.
                </Typography>
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              6. Data Sharing and Third Parties
            </Typography>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              We do not sell your personal data. We may share data only:
            </Typography>
            <ul className="space-y-2 ml-6">
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • With service providers who help us operate the Service (cloud hosting,
                  analytics)
                </Typography>
              </li>
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • When required by law or legal process
                </Typography>
              </li>
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • To protect our rights or prevent fraud
                </Typography>
              </li>
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • With your explicit consent
                </Typography>
              </li>
            </ul>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              All third-party processors are contractually bound to GDPR standards.
            </Typography>
          </section>

          {/* Section 7 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              7. Your Privacy Rights (GDPR)
            </Typography>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              You have the right to:
            </Typography>
            <ul className="space-y-2 ml-6">
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • Access your personal data and receive a copy
                </Typography>
              </li>
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • Rectify inaccurate or incomplete data
                </Typography>
              </li>
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • Delete your data ("right to be forgotten")
                </Typography>
              </li>
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • Port your data to another service in a structured format
                </Typography>
              </li>
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • Object to certain data processing activities
                </Typography>
              </li>
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • Restrict processing in specific circumstances
                </Typography>
              </li>
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • Withdraw consent at any time where processing is based on consent
                </Typography>
              </li>
            </ul>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              To exercise these rights, contact us at{' '}
              <a
                href="mailto:contact@lifo-app.com"
                className="text-primary-700 hover:text-primary-600 underline"
              >
                contact@lifo-app.com
              </a>
              .
            </Typography>
          </section>

          {/* Section 8 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              8. Cookies and Tracking Technologies
            </Typography>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              We currently use essential cookies necessary for Service functionality
              (authentication, session management). We may implement additional cookies in the
              future for:
            </Typography>
            <ul className="space-y-2 ml-6">
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • Analytics and performance monitoring
                </Typography>
              </li>
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • User preference storage
                </Typography>
              </li>
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • Service improvement
                </Typography>
              </li>
            </ul>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              You can control cookie preferences through your browser settings. Disabling essential
              cookies may limit Service functionality. We will update you if we introduce new cookie
              types.
            </Typography>
          </section>

          {/* Section 9 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              9. User Responsibilities
            </Typography>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              You agree to:
            </Typography>
            <ul className="space-y-2 ml-6">
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • Use the Service in compliance with all applicable laws and food safety
                  regulations
                </Typography>
              </li>
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • Ensure accuracy of expiration dates and product information entered
                </Typography>
              </li>
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • Verify product safety independently; LIFO recommendations are advisory only
                </Typography>
              </li>
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • Not misuse, disrupt, or attempt to gain unauthorized access to the Service
                </Typography>
              </li>
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • Not use the Service for any unlawful or fraudulent purpose
                </Typography>
              </li>
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • Maintain appropriate backup systems for critical business data
                </Typography>
              </li>
            </ul>
          </section>

          {/* Section 10 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              10. Service Availability and Changes
            </Typography>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              We strive to provide reliable service but do not guarantee uninterrupted access. We
              reserve the right to modify, suspend, or discontinue any aspect of the Service with
              reasonable notice. Material changes to these Terms will be communicated via email or
              in-app notification.
            </Typography>
          </section>

          {/* Section 11 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              11. Intellectual Property
            </Typography>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              The Service, including its design, features, image recognition technology, and
              underlying software, is owned by LIFO and protected by intellectual property laws. You
              may not copy, modify, reverse engineer, or create derivative works from any part of
              the Service.
            </Typography>
          </section>

          {/* Section 12 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              12. Data Security
            </Typography>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              We implement industry-standard security measures including:
            </Typography>
            <ul className="space-y-2 ml-6">
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • Encryption of data in transit (TLS/SSL) and at rest
                </Typography>
              </li>
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • Regular security audits and vulnerability assessments
                </Typography>
              </li>
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • Access controls and authentication mechanisms
                </Typography>
              </li>
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • Secure development practices
                </Typography>
              </li>
            </ul>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              However, no system is completely secure. You acknowledge that you provide data at your
              own risk.
            </Typography>
          </section>

          {/* Section 13 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              13. Limitation of Liability
            </Typography>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              The Service is provided "as is" without warranties of any kind. LIFO is not liable
              for:
            </Typography>
            <ul className="space-y-2 ml-6">
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • Business decisions made based on Service recommendations
                </Typography>
              </li>
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • Food safety incidents or regulatory compliance issues
                </Typography>
              </li>
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • Loss of data due to technical failures or user error
                </Typography>
              </li>
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • Indirect, incidental, consequential, or punitive damages
                </Typography>
              </li>
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • Service interruptions or data breaches despite reasonable security measures
                </Typography>
              </li>
            </ul>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              Maximum liability is limited to the amount paid for the Service in the preceding 12
              months.
            </Typography>
          </section>

          {/* Section 14 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              14. Termination
            </Typography>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              Either party may terminate this agreement at any time. Upon termination:
            </Typography>
            <ul className="space-y-2 ml-6">
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • Your access to the Service will cease immediately
                </Typography>
              </li>
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • You may request export of your data within 30 days
                </Typography>
              </li>
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • We will delete your data in accordance with Section 5 and GDPR requirements
                </Typography>
              </li>
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • Outstanding fees remain due
                </Typography>
              </li>
            </ul>
          </section>

          {/* Section 15 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              15. Data Breach Notification
            </Typography>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              In the event of a data breach affecting your personal data, we will notify you and
              relevant supervisory authorities within 72 hours as required by GDPR, providing
              information about the nature of the breach and remedial actions taken.
            </Typography>
          </section>

          {/* Section 16 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              16. International Data Transfers
            </Typography>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              If we transfer data outside the EU, we ensure adequate protection through:
            </Typography>
            <ul className="space-y-2 ml-6">
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • Standard Contractual Clauses approved by the EU Commission
                </Typography>
              </li>
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • Adequacy decisions
                </Typography>
              </li>
              <li>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  • Other lawful transfer mechanisms under GDPR
                </Typography>
              </li>
            </ul>
          </section>

          {/* Section 17 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              17. Children's Privacy
            </Typography>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              The Service is not intended for individuals under 16 years of age. We do not knowingly
              collect data from children.
            </Typography>
          </section>

          {/* Section 18 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              18. Governing Law and Disputes
            </Typography>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              These Terms are governed by the laws of the European Union and the Netherlands. Any
              disputes shall be resolved in the courts of Amsterdam, Netherlands.
            </Typography>
          </section>

          {/* Section 19 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              19. Contact Information
            </Typography>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              For questions about these Terms, privacy concerns, or to exercise your GDPR rights:
            </Typography>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              Email:{' '}
              <a
                href="mailto:contact@lifo-app.com"
                className="text-primary-700 hover:text-primary-600 underline"
              >
                contact@lifo-app.com
              </a>
            </Typography>
          </section>

          {/* Section 20 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              20. Supervisory Authority
            </Typography>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              You have the right to lodge a complaint with your local data protection authority if
              you believe we have violated GDPR or your privacy rights.
            </Typography>
          </section>

          {/* Final Statement */}
          <section className="pt-6 border-t border-foreground/10">
            <Typography variant="p" className="text-foreground/80 leading-relaxed italic">
              By using LIFO, you acknowledge that you have read, understood, and agree to be bound
              by these Terms and Conditions, including our data collection and privacy practices.
            </Typography>
          </section>
        </div>
      </div>
    </main>
  )
}
