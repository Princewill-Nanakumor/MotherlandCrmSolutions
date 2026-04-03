"use client";

import { MessageCircle, Coins, Building2 } from "lucide-react";
import { motion } from "framer-motion";

export default function ContactSection() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <section id="contact-us" className="py-16 bg-white">
      <div className="max-w-6xl px-4 mx-auto sm:px-6 lg:px-8">
        <motion.div
          className="p-6 bg-white shadow-2xl rounded-2xl sm:p-8 md:p-12"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {/* Header */}
          <motion.div className="mb-12 text-center" variants={itemVariants}>
            <h2 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl bg-linear-to-r from-indigo-600 to-purple-600 bg-clip-text">
              Contact Us
            </h2>
          </motion.div>

          <div className="space-y-12">
            {/* Introduction Section */}
            <motion.div
              className="space-y-6 text-center"
              variants={itemVariants}
            >
              <div className="flex justify-center">
                <div className="p-4 rounded-full bg-linear-to-r from-indigo-100 to-purple-100">
                  <Building2 className="w-10 h-10 text-indigo-600" />
                </div>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 sm:text-3xl">
                Professional CRM Solutions for Your Business
              </h3>
              <p className="max-w-3xl mx-auto text-lg leading-relaxed text-gray-600!">
                At{" "}
                <span className="font-semibold text-indigo-600">
                  Motherland CRM Solutions
                </span>
                , we provide comprehensive Customer Relationship Management
                services designed to help companies streamline their sales
                processes, manage leads effectively, and boost team
                productivity. Our platform offers powerful tools for lead
                management, team collaboration, and business growth.
              </p>
            </motion.div>

            {/* Contact Information */}
            <motion.div
              className="p-8 border border-indigo-100 bg-linear-to-r from-indigo-50 to-purple-50 rounded-xl"
              variants={itemVariants}
            >
              <h3 className="mb-6 text-xl font-semibold text-center text-gray-900">
                Get in Touch
              </h3>
              <div className="flex justify-center mb-6">
                <div className="flex items-center p-6 space-x-4 transition-shadow bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <MessageCircle className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500!">Telegram</p>
                    <a
                      href="https://t.me/Motherlandsolutions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-gray-900 transition-colors hover:text-blue-600"
                    >
                      @Motherlandsolutions
                    </a>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="pt-6 mt-6 border-t border-indigo-200">
                <div className="flex items-center justify-center p-4 space-x-3 bg-white border border-gray-200 rounded-lg">
                  <div className="p-2 rounded-lg bg-amber-100">
                    <Coins className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-900">
                      Crypto Payments Available
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Bitcoin, Ethereum, USDT & more accepted
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
