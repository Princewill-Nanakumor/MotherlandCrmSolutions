"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";

export default function TestimonialsSection() {
  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Sales Director",
      company: "TechStart Inc",
      image: "SJ",
      content:
        "ZodaShield transformed how we handle our sheet data. The import feature saved us countless hours, and the analytics help us make better decisions.",
    },
    {
      name: "Michael Chen",
      role: "Operations Manager",
      company: "Growth Solutions",
      image: "MC",
      content:
        "The subscription management and team features are exactly what we needed. Our productivity has increased by 40% since switching to ZodaShield.",
    },
    {
      name: "Emily Rodriguez",
      role: "Marketing Lead",
      company: "Digital Ventures",
      image: "ER",
      content: "Excellent platform with outstanding support",
    },
    {
      name: "David Thompson",
      role: "CEO",
      company: "InnovateCorp",
      image: "DT",
      content:
        "The custom status feature is game-changing. We can now track lead performance and manage them in one place.",
    },
    {
      name: "Lucas Peterson",
      role: "Team manager",
      company: "Unisalts",
      image: "DT",
      content:
        "The comprehensive activity logs have transformed how we monitor our operations. We can track every lead interaction, team member activity, and system changes with complete transparency and accountability.",
    },
    {
      name: "Alex Martinez",
      role: "Product Manager",
      company: "FutureTech",
      image: "AM",
      content:
        "The real-time analytics and reporting features give us insights our leads. Our conversion rates improved significantly.",
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Calculate visible slides based on screen size
  const getVisibleCount = () => {
    if (typeof window === "undefined") return 3;
    return window.innerWidth < 768 ? 1 : window.innerWidth < 1024 ? 2 : 3;
  };

  const [visibleCount, setVisibleCount] = useState(getVisibleCount());
  const totalSlides = Math.max(0, testimonials.length - visibleCount + 1);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setVisibleCount(getVisibleCount());
      // Reset index to prevent out of bounds
      setCurrentIndex((prev) =>
        Math.min(prev, testimonials.length - getVisibleCount())
      );
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [testimonials.length]);

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying || totalSlides <= 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalSlides);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, totalSlides]);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
    // Resume auto-play after 10 seconds of manual interaction
    setTimeout(() => setIsAutoPlaying(true), 10000);
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  }, [totalSlides]);

  // Calculate slide width based on visible count
  const slideWidth = `${100 / visibleCount}%`;

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

  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 50,
      scale: 0.9,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
    },
  };

  const buttonVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
    },
    hover: {
      scale: 1.1,
      transition: { duration: 0.2 },
    },
    tap: {
      scale: 0.9,
    },
  };

  return (
    <section className="py-16 bg-gradient-to-b from-white/50 to-white/20 dark:from-gray-900/50 dark:to-gray-800/20">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.h2
            variants={cardVariants}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent mb-6"
          >
            What Our Customers Say
          </motion.h2>
          <motion.p
            variants={cardVariants}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto"
          >
            Don&rsquo;t just take our word for it. Here&rsquo;s what businesses
            say about ZodaShield.
          </motion.p>
        </motion.div>

        {/* Slider Container */}
        <div className="relative">
          {/* Navigation Buttons */}
          <motion.button
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-full flex items-center justify-center border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-700 transition-all duration-300 group -ml-6"
            aria-label="Previous testimonials"
            variants={buttonVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            whileHover="hover"
            whileTap="tap"
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <svg
              className="w-6 h-6 text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </motion.button>

          <motion.button
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-full flex items-center justify-center border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-700 transition-all duration-300 group -mr-6"
            aria-label="Next testimonials"
            variants={buttonVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            whileHover="hover"
            whileTap="tap"
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <svg
              className="w-6 h-6 text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </motion.button>

          {/* Slides Container */}
          <div className="overflow-hidden px-4 md:px-8 lg:px-12">
            <motion.div
              className="flex"
              animate={{
                x: `-${currentIndex * (100 / visibleCount)}%`,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 px-2"
                  style={{ width: slideWidth }}
                >
                  <motion.div
                    variants={cardVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-2xl p-6 border border-gray-200 dark:border-gray-700 transition-all duration-300 h-full flex flex-col"
                  >
                    <div className="flex items-center mb-4">
                      <motion.div
                        className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm mr-4"
                        whileHover={{
                          rotate: 360,
                          transition: { duration: 0.6 },
                        }}
                      >
                        {testimonial.image}
                      </motion.div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {testimonial.name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {testimonial.role}
                          <div className="text-indigo-500 dark:text-indigo-400">
                            {testimonial.company}
                          </div>
                        </div>
                      </div>
                    </div>
                    <blockquote className="text-gray-700 dark:text-gray-300 italic text-base leading-relaxed mb-6 flex-grow">
                      &ldquo;{testimonial.content}&rdquo;
                    </blockquote>
                    <motion.div
                      className="flex text-yellow-400"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: 0.3 }}
                    >
                      {[...Array(5)].map((_, i) => (
                        <motion.svg
                          key={i}
                          className="w-5 h-5 fill-current"
                          viewBox="0 0 20 20"
                          initial={{ scale: 0 }}
                          whileInView={{ scale: 1 }}
                          viewport={{ once: true }}
                          transition={{
                            duration: 0.3,
                            delay: 0.4 + i * 0.1,
                            type: "spring",
                            stiffness: 200,
                          }}
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </motion.svg>
                      ))}
                    </motion.div>
                  </motion.div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Dots Indicator */}
          <motion.div
            className="flex justify-center mt-8 space-x-2"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            {Array.from({ length: totalSlides }, (_, index) => (
              <motion.button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? "bg-indigo-600 dark:bg-indigo-400 scale-150"
                    : "bg-indigo-200 dark:bg-indigo-800 hover:bg-indigo-400 dark:hover:bg-indigo-600"
                }`}
                aria-label={`View testimonials ${index + 1}-${index + visibleCount}`}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              />
            ))}
          </motion.div>

          {/* Progress Bar */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            whileInView={{ opacity: 1, scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-6 max-w-md mx-auto h-1 bg-indigo-200 dark:bg-indigo-800 rounded-full overflow-hidden"
          >
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
              initial={{ width: "100%" }}
              animate={{ width: 0 }}
              transition={{ duration: 5, ease: "linear" }}
              key={currentIndex}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
