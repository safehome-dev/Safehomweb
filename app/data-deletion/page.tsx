import Link from "next/link";

export default function DataDeletion() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-slate-900">
          SafeHome
        </Link>
        <nav className="flex gap-6">
          <Link href="/privacy-policy" className="text-slate-600 hover:text-slate-900 transition-colors">
            Privacy Policy
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-4xl font-bold text-slate-900 mb-6">Account & Data Deletion Request</h1>
        
        <div className="bg-blue-50 border-l-4 border-blue-600 p-6 mb-8">
          <p className="text-lg text-gray-800">
            <strong>Developer:</strong> SafeHome
          </p>
        </div>

        {/* Steps Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-blue-600">How to Request Account Deletion</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Send an Email Request</h3>
                <p className="text-gray-700">
                  Email us at{" "}
                  <a href="mailto:safehometech465@gmail.com" className="text-blue-600 font-semibold underline">
                    safehometech465@gmail.com
                  </a>{" "}
                  with the subject line &quot;Account Deletion Request&quot;
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Include Your Account Email</h3>
                <p className="text-gray-700">
                  In your email, please include the email address associated with your SafeHome account
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Receive Confirmation</h3>
                <p className="text-gray-700">
                  We will confirm receipt of your request within 2 business days and process the deletion
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Data Types Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
          <h2 className="text-2xl font-semibold mb-4">Data Deletion Details</h2>
          
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-3 text-green-700">✓ Data That Will Be Deleted</h3>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700">
              <li><strong>Account Information:</strong> Name, email address, phone number, and profile details</li>
              <li><strong>Property Listings:</strong> All rental, sale, and roommate listings you&apos;ve created</li>
              <li><strong>Photos:</strong> All property photos and images uploaded by you</li>
              <li><strong>User Preferences:</strong> Search history, saved searches, and app settings</li>
              <li><strong>Communication Data:</strong> Messages, inquiries, and conversation history</li>
              <li><strong>Activity Data:</strong> Favorited listings and browsing history</li>
            </ul>
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-3 text-amber-700">⚠️ Data That May Be Retained</h3>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700">
              <li><strong>Transaction Records:</strong> Required for legal compliance and fraud prevention (anonymized after 90 days)</li>
              <li><strong>Legal Records:</strong> Data required to be retained by law (typically 12-24 months depending on jurisdiction)</li>
              <li><strong>Aggregated Analytics:</strong> Anonymized usage statistics that cannot identify you personally</li>
            </ul>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">📅 Retention Period</h3>
            <ul className="space-y-2 text-gray-700">
              <li>• <strong>Immediate:</strong> Account deactivation upon request confirmation</li>
              <li>• <strong>Within 30 days:</strong> Complete deletion of personal data from active systems</li>
              <li>• <strong>Within 90 days:</strong> Removal from backup systems and anonymization of transaction records</li>
              <li>• <strong>Legal retention:</strong> Certain data may be retained for up to 24 months as required by law</li>
            </ul>
          </div>

          <p className="mt-4 text-amber-700 bg-amber-50 p-3 rounded">
            ⚠️ <strong>Warning:</strong> This action cannot be undone. Once your data is deleted, it cannot be recovered.
          </p>
        </div>

        {/* Contact Card */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-8 rounded-lg shadow-lg text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to Request Deletion?</h2>
          <p className="mb-6 text-blue-100">
            Send your account deletion request to:
          </p>
          <a 
            href="mailto:safehometech465@gmail.com?subject=Account%20Deletion%20Request"
            className="inline-block bg-white text-blue-600 font-bold px-8 py-4 rounded-lg hover:bg-blue-50 transition-colors text-lg"
          >
            safehometech465@gmail.com
          </a>
          <p className="mt-4 text-sm text-blue-100">
            Include your account email address in the message
          </p>
        </div>

        <div className="mt-8 p-4 bg-slate-100 rounded-lg border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-2">Questions About Data Deletion?</h3>
          <p className="text-slate-700 text-sm">
            If you have questions about the deletion process, data retention, or need assistance, contact us at{" "}
            <a href="mailto:safehometech465@gmail.com" className="text-blue-600 font-semibold underline">
              safehometech465@gmail.com
            </a>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-12 mt-20 border-t border-slate-200">
        <div className="max-w-4xl mx-auto text-center text-slate-600">
          <p className="mb-4">&copy; 2026 SafeHome. All rights reserved.</p>
          <div className="flex justify-center gap-6">
            <Link href="/privacy-policy" className="hover:text-slate-900 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/data-deletion" className="hover:text-slate-900 transition-colors">
              Delete My Data
            </Link>
            <Link href="#" className="hover:text-slate-900 transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
