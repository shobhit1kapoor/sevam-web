"use client";

import { useState } from "react";

export default function Home() {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  return (
    <div
      className="relative min-h-screen bg-[#21346e] overflow-hidden"
      style={{ fontFamily: "Rubik, sans-serif" }}
    >
      {/* Background Video */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260206_044704_dd33cb15-c23f-4cfc-aa09-a0465d4dcb54.mp4"
      />

      {/* Content Container */}
      <div className="relative z-10 container mx-auto px-6 md:px-8 pt-32 md:pt-48">
        {/* Headline */}
        <h1
          className="text-white font-bold uppercase text-6xl md:text-7xl lg:text-8xl xl:text-[100px] leading-[0.98] max-w-4xl"
          style={{ letterSpacing: "-0.125em" }}
        >
          <div>NEW ERA</div>
          <div>OF Ecommerce</div>
          <div>STARTS NOW</div>
        </h1>

        {/* CTA Button */}
        <div className="mt-12">
          <a
            href="/customer/dashboard"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            className={`relative block w-[184px] h-[65px] font-bold uppercase text-[20px] text-[#161a20] transition-transform duration-200 cursor-pointer ${
              isPressed ? "scale-95" : isHovered ? "scale-105" : "scale-100"
            }`}
          >
            {/* SVG Background */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 184 65"
              preserveAspectRatio="none"
              fill="none"
            >
              <path
                d="M 10 0 L 174 0 Q 184 0 184 10 L 184 55 Q 184 65 174 65 L 10 65 Q 0 65 0 55 L 0 10 Q 0 0 10 0"
                fill="white"
              />
            </svg>

            {/* Button Text */}
            <span className="relative z-20 flex items-center justify-center w-full h-full font-rubik font-bold">
              GET STARTED
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}
