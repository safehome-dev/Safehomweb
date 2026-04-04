import Link from "next/link";

export default function TermsOfService() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-6">Terms of Service</h1>

      <p className="text-sm text-gray-600 mb-8">Last updated: April 4, 2026</p>

      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-3">1. Acceptance of Terms</h2>
          <p className="text-gray-700 leading-relaxed">
            By downloading, installing, or using the SafeHome mobile application (&quot;App&quot;) or accessing our website, you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, please do not use our services. We reserve the right to update or modify these Terms at any time, and your continued use of SafeHome constitutes acceptance of any changes.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">2. Description of Service</h2>
          <p className="text-gray-700 leading-relaxed">
            SafeHome is a platform that enables users to discover and list properties for rent or sale, find roommates, upload property photos, and connect with other users. SafeHome acts as an intermediary platform and does not own, manage, or control any properties listed on the App.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">3. Account Registration</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            To access certain features of SafeHome, you must create an account. By creating an account, you agree to:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
            <li>Provide accurate, current, and complete information</li>
            <li>Maintain and promptly update your account information</li>
            <li>Keep your login credentials secure and confidential</li>
            <li>Accept responsibility for all activity that occurs under your account</li>
            <li>Notify us immediately of any unauthorized use of your account</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mt-3">
            You must be at least 18 years old to create an account and use SafeHome. We reserve the right to suspend or terminate accounts that violate these Terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">4. User Conduct</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            When using SafeHome, you agree not to:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
            <li>Post false, misleading, or fraudulent property listings</li>
            <li>Upload photos that you do not have the right to use</li>
            <li>Harass, threaten, or intimidate other users</li>
            <li>Use the App for any illegal or unauthorized purpose</li>
            <li>Attempt to gain unauthorized access to other accounts or systems</li>
            <li>Distribute spam, malware, or other harmful content</li>
            <li>Scrape, data mine, or use automated tools to access the App</li>
            <li>Impersonate another person or entity</li>
            <li>Violate any applicable laws or regulations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">5. Property Listings</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            When creating property listings on SafeHome, you agree that:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
            <li>All information provided in listings must be accurate and truthful</li>
            <li>You have the legal right to list the property (as owner, authorized agent, or tenant with subletting rights)</li>
            <li>Photos uploaded must accurately represent the property</li>
            <li>Pricing and availability information must be kept up to date</li>
            <li>Listings must comply with all applicable housing laws, including fair housing regulations</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mt-3">
            SafeHome reserves the right to remove any listing that violates these Terms or that we deem inappropriate, without prior notice.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">6. Photos and Content</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            By uploading photos or other content to SafeHome, you:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
            <li>Retain ownership of your content</li>
            <li>Grant SafeHome a non-exclusive, worldwide, royalty-free license to use, display, and distribute your content within the App for the purpose of providing our services</li>
            <li>Represent that you own or have the necessary rights to the content you upload</li>
            <li>Agree that your content does not infringe on any third-party rights</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mt-3">
            You may delete your photos and content at any time through the App. Upon deletion, we will remove the content from our active systems, though cached or archived copies may persist for a limited period.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">7. Transactions Between Users</h2>
          <p className="text-gray-700 leading-relaxed">
            SafeHome facilitates connections between property owners, renters, buyers, and roommates. However, SafeHome is not a party to any transaction or agreement between users. We do not guarantee the accuracy of listings, the quality of properties, or the conduct of any user. You are solely responsible for evaluating properties, verifying information, and conducting due diligence before entering into any rental, purchase, or roommate agreement.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">8. Fees and Payments</h2>
          <p className="text-gray-700 leading-relaxed">
            SafeHome may offer free and paid features. Any applicable fees will be clearly disclosed before you incur charges. We reserve the right to introduce, modify, or discontinue fees for any part of the service with reasonable notice. All fees are non-refundable unless otherwise stated.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">9. Intellectual Property</h2>
          <p className="text-gray-700 leading-relaxed">
            The SafeHome name, logo, and all related trademarks, service marks, designs, and intellectual property are owned by SafeHome. You may not use, copy, or distribute our intellectual property without prior written consent. The App&apos;s design, features, and functionality are protected by copyright, trademark, and other intellectual property laws.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">10. Disclaimer of Warranties</h2>
          <p className="text-gray-700 leading-relaxed">
            SafeHome is provided on an &quot;as is&quot; and &quot;as available&quot; basis without warranties of any kind, either express or implied. We do not warrant that the App will be uninterrupted, error-free, or free of harmful components. We make no guarantees regarding the accuracy, reliability, or completeness of any content or listings on the platform.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">11. Limitation of Liability</h2>
          <p className="text-gray-700 leading-relaxed">
            To the fullest extent permitted by law, SafeHome and its officers, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the App, including but not limited to loss of profits, data, or goodwill. Our total liability for any claim arising from these Terms or your use of SafeHome shall not exceed the amount you paid to us in the twelve (12) months preceding the claim.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">12. Indemnification</h2>
          <p className="text-gray-700 leading-relaxed">
            You agree to indemnify, defend, and hold harmless SafeHome and its affiliates from any claims, damages, losses, or expenses (including reasonable legal fees) arising from your use of the App, your violation of these Terms, or your infringement of any third-party rights.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">13. Termination</h2>
          <p className="text-gray-700 leading-relaxed">
            We may suspend or terminate your access to SafeHome at any time, with or without cause, and with or without notice. Upon termination, your right to use the App ceases immediately. You may also delete your account at any time through the App. Sections of these Terms that by their nature should survive termination shall remain in effect.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">14. Governing Law</h2>
          <p className="text-gray-700 leading-relaxed">
            These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles. Any disputes arising from these Terms or your use of SafeHome shall be resolved through binding arbitration or in the courts of competent jurisdiction.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">15. Changes to These Terms</h2>
          <p className="text-gray-700 leading-relaxed">
            We reserve the right to modify these Terms at any time. We will notify you of significant changes by posting the updated Terms on this page and updating the &quot;Last updated&quot; date. Your continued use of SafeHome after changes are posted constitutes your acceptance of the revised Terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">16. Contact Us</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            If you have any questions about these Terms of Service, please contact us at:
          </p>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-700">Email: support@safehome.com</p>
          </div>
        </section>

        <section className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            By using SafeHome, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. Please also review our{" "}
            <Link href="/privacy-policy" className="text-blue-600 hover:underline">
              Privacy Policy
            </Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
