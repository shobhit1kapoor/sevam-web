'use client'

import { motion } from 'framer-motion'
import { Star } from 'lucide-react'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
}

export default function HeroSection() {
  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-white">
      {/* Background Video */}
      <div className="absolute inset-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover [transform:scaleY(-1)]"
        >
          <source
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260302_085640_276ea93b-d7da-4418-a09b-2aa5b490e838.mp4"
            type="video/mp4"
          />
        </video>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[26.416%] from-[rgba(255,255,255,0)] to-[66.943%] to-white"></div>
      </div>

      {/* Content Container */}
      <motion.div
        className="relative z-10 w-full min-h-screen flex flex-col items-center pt-[290px] max-w-[1200px] mx-auto px-4 gap-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Heading */}
        <motion.div variants={itemVariants} className="w-full">
          <h1 className="text-80px font-medium tracking-[-0.04em] leading-tight text-center font-['var(--font-geist)']">
            Simple{' '}
            <span
              className="italic font-['var(--font-instrument-serif)'] text-100px"
              style={{ display: 'inline' }}
            >
              management
            </span>{' '}
            for your remote team
          </h1>
        </motion.div>

        {/* Description */}
        <motion.p
          variants={itemVariants}
          className="text-18px opacity-80 text-[#373a46] text-center max-w-[554px] font-['var(--font-geist)']"
        >
          Streamline team management and collaboration with our powerful platform
          designed for remote-first teams.
        </motion.p>

        {/* Email Input & CTA Block */}
        <motion.div variants={itemVariants} className="w-full max-w-[554px] flex flex-col gap-4">
          {/* Email Input Container */}
          <div className="rounded-[40px] bg-[#fcfcfc] border border-gray-200 p-1 shadow-[0px_10px_40px_5px_rgba(194,194,194,0.25)]">
            <div className="flex items-center gap-3 px-6 py-3">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 bg-transparent text-16px outline-none placeholder-gray-400 font-['var(--font-geist)']"
              />
              <button className="px-6 py-3 bg-[#1a1a1a] text-white rounded-full font-medium text-14px hover:bg-[#2a2a2a] transition-colors shadow-[inset_-4px_-6px_25px_0px_rgba(201,201,201,0.08),inset_4px_4px_10px_0px_rgba(29,29,29,0.24)] font-['var(--font-geist)']">
                Get Started
              </button>
            </div>
          </div>

          {/* Social Proof */}
          <div className="flex items-center gap-3 justify-center">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  className="fill-yellow-400 text-yellow-400 -ml-1"
                />
              ))}
            </div>
            <span className="text-14px text-gray-600 font-['var(--font-geist)']">
              1,020+ Reviews
            </span>
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}
