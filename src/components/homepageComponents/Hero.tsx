// components/homepageComponents/Hero.tsx
"use client";

import { motion, Variants } from "framer-motion";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { memo, useMemo } from "react";
import dynamic from "next/dynamic";
import { FileSpreadsheet, BarChart3, Users, LucideIcon } from "lucide-react";

// Define the Feature interface
interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

// Define props for FeatureCard
interface FeatureCardProps {
  feature: Feature;
}

// Lazy load floating elements with no SSR
const FloatingElement = dynamic(() => import("../ui/FloatingElements"), {
  ssr: false,
  loading: () => null,
});

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
    />
  );
}

// Optimized animation variants with proper typing
const heroVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.4,
      staggerChildren: 0.1,
    },
  },
};

const textVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const buttonVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
};

const featureCardVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

// Memoized feature card component with proper typing
const FeatureCard = memo<FeatureCardProps>(({ feature }) => {
  const IconComponent = feature.icon;

  return (
    <motion.div
      className="text-center p-6 rounded-2xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 will-change-transform"
      variants={featureCardVariants}
      transition={{ duration: 0.4, ease: "easeOut" }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
    >
      <div
        className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-lg flex items-center justify-center mx-auto mb-6 shadow-md`}
      >
        <IconComponent size={24} className="text-white" />
      </div>
      <h3 className="text-xl font-semibold text-indigo-900 dark:text-white mb-2">
        {feature.title}
      </h3>
      <p className="text-indigo-900/70 dark:text-gray-400">
        {feature.description}
      </p>
    </motion.div>
  );
});

FeatureCard.displayName = "FeatureCard";

export default memo(function Hero() {
  const { data: session, status } = useSession();

  // Memoize features array with proper typing
  const features: readonly Feature[] = useMemo(
    () =>
      [
        {
          icon: FileSpreadsheet,
          title: "Excel & CSV Import",
          description:
            "Import your spreadsheet data with intelligent field mapping and validation",
          color: "from-blue-500 to-cyan-500",
        },
        {
          icon: BarChart3,
          title: "Data Analytics",
          description:
            "Get insights into your imported data and sales performance",
          color: "from-green-500 to-emerald-500",
        },
        {
          icon: Users,
          title: "Team Management",
          description:
            "Collaborate with your team to process and manage imported leads",
          color: "from-purple-500 to-pink-500",
        },
      ] as const,
    []
  );

  return (
    <motion.main
      className="max-w-7xl mx-auto px-6 py-20 relative overflow-hidden"
      variants={heroVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Reduced floating elements for better performance */}
      <FloatingElement
        className="absolute top-20 left-10 w-16 h-16 bg-gradient-to-r from-indigo-400/15 to-purple-400/15 rounded-full blur-xl"
        duration={6}
        delay={0}
        y={20}
      >
        <div className="w-full h-full bg-gradient-to-r from-indigo-400/15 to-purple-400/15 rounded-full" />
      </FloatingElement>

      <motion.div
        className="absolute top-40 right-20 w-12 h-12 bg-gradient-to-r from-purple-400/15 to-pink-400/15 rounded-full blur-xl"
        animate={{
          y: [0, -15, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 4,
          delay: 1,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <div className="text-center relative z-10">
        <motion.h1
          className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent mb-6"
          variants={textVariants}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          Transform Your Excel & CSV Data into Actionable Leads
        </motion.h1>

        <motion.p
          className="text-xl text-indigo-900/70 dark:text-gray-300 mb-12 max-w-2xl mx-auto"
          variants={textVariants}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          Streamline your data processing, import Excel and CSV files
          seamlessly, and manage leads efficiently with ZodaShield CRM.
        </motion.p>

        <motion.div
          className="flex justify-center space-x-6 h-12"
          variants={textVariants}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {status === "loading" ? (
            <>
              <Skeleton className="h-full w-40 rounded-lg" />
              <Skeleton className="h-full w-32 rounded-lg" />
            </>
          ) : session ? (
            <motion.div
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <Link
                href="/dashboard"
                className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-500 dark:to-purple-500 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 dark:hover:from-indigo-600 dark:hover:to-purple-600 transition-all duration-200 font-medium shadow-md hover:shadow-lg will-change-transform"
              >
                Go to Dashboard
              </Link>
            </motion.div>
          ) : (
            <>
              <motion.div
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <Link
                  href="/signup"
                  className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-500 dark:to-purple-500 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 dark:hover:from-indigo-600 dark:hover:to-purple-600 transition-all duration-200 font-medium shadow-md hover:shadow-lg will-change-transform"
                >
                  Sign up
                </Link>
              </motion.div>
              <motion.div
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <Link
                  href="/"
                  className="px-8 py-3 border-2 border-indigo-600/20 dark:border-indigo-400/20 text-indigo-600 dark:text-indigo-300 rounded-lg hover:border-indigo-600/40 dark:hover:border-indigo-400/40 hover:bg-indigo-50 dark:hover:bg-gray-800 transition-all duration-200 font-medium will-change-transform"
                >
                  Sign In
                </Link>
              </motion.div>
            </>
          )}
        </motion.div>
      </div>

      {/* Features Section */}
      <motion.div
        className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10"
        initial="hidden"
        animate="visible"
        transition={{
          delay: 0.6,
          staggerChildren: 0.15,
        }}
      >
        {features.map((feature, featureIndex) => (
          <FeatureCard
            key={`hero-feature-${feature.title}-${featureIndex}`}
            feature={feature}
          />
        ))}
      </motion.div>
    </motion.main>
  );
});
