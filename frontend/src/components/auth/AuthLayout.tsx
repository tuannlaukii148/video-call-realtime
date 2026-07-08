import React from "react";
import { motion } from "motion/react";
import { Flame } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  description: string;
}

export function AuthLayout({ children, title, description }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Left Side: Form */}
      <motion.section
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full lg:w-[45%] flex flex-col justify-center px-8 md:px-20 py-12 bg-surface"
      >
        <div className="max-w-md w-full mx-auto">
          <div className="mb-12 flex items-center gap-2">
            <div className="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center">
              <img src="/logo/logo.png" alt="WebCall Logo" className="w-10 h-10 rounded-lg object-cover" />
            </div>
            <span className="text-2xl font-bold tracking-tighter text-primary">
              WebCall
            </span>
          </div>

          <div className="space-y-2 mb-10">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-on-surface leading-tight">
              {title}
            </h1>
            <p className="text-on-surface-variant text-lg font-medium leading-relaxed">
              {description}
            </p>
          </div>

          {children}
        </div>
      </motion.section>

      {/* Right Side: Visual */}
      <section className="hidden lg:flex flex-1 relative bg-surface-container-low overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1616587894289-86480e533129?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="WebCall connection"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        </div>
        <div className="relative z-10 w-full max-w-2xl mt-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white"
          >


          </motion.div>
        </div>
      </section>
    </div>
  );
}
