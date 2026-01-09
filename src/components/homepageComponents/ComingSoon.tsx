// components/homepageComponents/ComingSoon.tsx
"use client";

export default function ComingSoon() {
  return (
    <main className="max-w-7xl mx-auto px-6 py-20">
      {/* Header Section */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent mb-6">
          Coming Soon
        </h1>
        <p className="text-xl text-indigo-900/70 dark:text-gray-300 max-w-3xl mx-auto">
          We are constantly working to enhance ZodaShield with powerful new
          features to make your lead management even more efficient and
          effective.
        </p>
      </div>

      {/* Beta Testing Section */}
      <section className="mb-16">
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 dark:from-blue-400 dark:to-purple-400 rounded-2xl p-8 text-white mb-8">
          <div className="flex items-center justify-center mb-4">
            <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium">
              🧪 Beta Testing
            </span>
          </div>
          <h2 className="text-3xl font-bold text-center mb-4">
            Try New Features First
          </h2>
          <p className="text-xl text-center opacity-90 mb-6">
            Get early access to cutting-edge features and help us shape the
            future of ZodaShield
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-3">
                Advanced User Management
              </h3>
              <p className="text-white/80 text-sm">
                Enhanced role-based permissions, user activity tracking, and
                advanced team collaboration features.
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Custom Workflows</h3>
              <p className="text-white/80 text-sm">
                Create custom lead processing workflows and automated task
                assignments.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Features Section */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-indigo-900 dark:text-white mb-8 text-center">
          Upcoming Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Email Automation */}
          <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-700 relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 text-xs font-medium rounded-full">
                Coming Soon
              </span>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 dark:from-yellow-400/20 dark:to-orange-400/20 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-yellow-600 dark:text-yellow-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-indigo-900 dark:text-white mb-3">
              Email Automation
            </h3>
            <p className="text-indigo-900/70 dark:text-gray-300">
              Automated email campaigns and follow-up sequences to nurture your
              leads through personalized communication workflows.
            </p>
          </div>

          {/* Advanced Analytics */}
          <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-700 relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 text-xs font-medium rounded-full">
                Coming Soon
              </span>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 dark:from-yellow-400/20 dark:to-orange-400/20 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-yellow-600 dark:text-yellow-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-indigo-900 dark:text-white mb-3">
              Advanced Analytics
            </h3>
            <p className="text-indigo-900/70 dark:text-gray-300">
              Deep-dive analytics with custom dashboards, conversion funnels,
              and predictive insights to optimize your sales performance.
            </p>
          </div>

          {/* Live Chat Integration */}
          <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-700 relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 text-xs font-medium rounded-full">
                Coming Soon
              </span>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 dark:from-yellow-400/20 dark:to-orange-400/20 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-yellow-600 dark:text-yellow-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-indigo-900 dark:text-white mb-3">
              Live Chat Integration
            </h3>
            <p className="text-indigo-900/70 dark:text-gray-300">
              Real-time chat functionality to engage with leads directly within
              the platform and track conversation history.
            </p>
          </div>

          {/* Enhanced Payment Options */}
          <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-700 relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 text-xs font-medium rounded-full">
                Coming Soon
              </span>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 dark:from-yellow-400/20 dark:to-orange-400/20 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-yellow-600 dark:text-yellow-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-indigo-900 dark:text-white mb-3">
              Enhanced Payment Options
            </h3>
            <p className="text-indigo-900/70 dark:text-gray-300">
              Additional secure payment methods including cryptocurrency and
              international payment gateways for global transactions.
            </p>
          </div>

          {/* Lead Scoring */}
          <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-700 relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 text-xs font-medium rounded-full">
                Coming Soon
              </span>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 dark:from-yellow-400/20 dark:to-orange-400/20 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-yellow-600 dark:text-yellow-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-indigo-900 dark:text-white mb-3">
              Lead Scoring
            </h3>
            <p className="text-indigo-900/70 dark:text-gray-300">
              Intelligent lead scoring system to automatically prioritize leads
              based on engagement, behavior, and conversion probability.
            </p>
          </div>

          {/* API Integration */}
          <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-700 relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 text-xs font-medium rounded-full">
                Coming Soon
              </span>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 dark:from-yellow-400/20 dark:to-orange-400/20 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-yellow-600 dark:text-yellow-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-indigo-900 dark:text-white mb-3">
              API Integration
            </h3>
            <p className="text-indigo-900/70 dark:text-gray-300">
              RESTful API to integrate ZodaShield with your existing tools and
              automate data synchronization across platforms.
            </p>
          </div>

          {/* Advertising Platform */}
          <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-700 relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-green-500/20 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">
                Ads Platform
              </span>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-emerald-500/20 dark:from-green-400/20 dark:to-emerald-400/20 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-indigo-900 dark:text-white mb-3">
              Advertising Platform
            </h3>
            <p className="text-indigo-900/70 dark:text-gray-300">
              Integrated advertising tools to promote your services and reach
              potential customers through targeted campaigns.
            </p>
          </div>

          {/* Ad Analytics */}
          <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-700 relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-green-500/20 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">
                Ads Platform
              </span>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-emerald-500/20 dark:from-green-400/20 dark:to-emerald-400/20 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-indigo-900 dark:text-white mb-3">
              Ad Analytics
            </h3>
            <p className="text-indigo-900/70 dark:text-gray-300">
              Comprehensive advertising analytics to track campaign performance,
              ROI, and optimize your marketing spend.
            </p>
          </div>
        </div>
      </section>

      {/* Development Status Section */}
      <section className="mb-16">
        <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-gray-200 dark:border-gray-700">
          <h2 className="text-3xl font-bold text-indigo-900 dark:text-white mb-6">
            Development Roadmap
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Phase 1: Core Features
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Data import, lead management, and basic analytics
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-yellow-600 dark:text-yellow-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Phase 2: Advanced Features
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Automation, advanced analytics, and integrations
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-blue-600 dark:text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Phase 3: Enterprise Features
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Advanced integrations, custom workflows, and enterprise tools
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Information Section */}
      <section className="mb-16">
        <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-gray-200 dark:border-gray-700">
          <h2 className="text-3xl font-bold text-indigo-900 dark:text-white mb-6 text-center">
            Get in Touch
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-indigo-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-indigo-600 dark:text-indigo-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Email
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                info@zodashield.com
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-indigo-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-indigo-600 dark:text-indigo-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Support Hours
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Mon-Fri: 9AM-6PM UTC
                <br />
                Weekend: On-demand
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
