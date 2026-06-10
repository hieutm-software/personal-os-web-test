"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Lock, Zap, Command, Layers, Shield, Cpu, Code, Globe } from "lucide-react";


export default function LandingPage() {
  // theme is not used here

  return (
    <div className="min-h-screen bg-[#000000] text-zinc-50 font-sans selection:bg-indigo-500/30 overflow-hidden relative">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30" />
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-indigo-500 opacity-20 blur-[100px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto backdrop-blur-md border-b border-premium-border bg-black/5 dark:bg-black/20 sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">Personal OS</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-premium-text transition-colors">
            Sign In
          </Link>
          <Link 
            href="/login" 
            className="group relative inline-flex h-9 items-center justify-center overflow-hidden rounded-full bg-white px-4 font-medium text-black transition-all hover:bg-zinc-200"
          >
            <span className="mr-2">Get Started</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center px-6 pt-32 pb-24 text-center max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="inline-flex items-center rounded-full border border-premium-border bg-black/5 dark:bg-white/5 px-3 py-1 text-sm text-zinc-700 dark:text-zinc-300 backdrop-blur-md mb-8"
        >
          <span className="flex h-2 w-2 rounded-full bg-indigo-500 mr-2 animate-pulse"></span>
          Personal OS v2.0 is now live
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60"
        >
          The Ultimate <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
            Productivity Engine
          </span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="text-lg md:text-xl text-zinc-500 dark:text-zinc-400 max-w-2xl mb-10 leading-relaxed"
        >
          Stop switching context. Manage your tasks, notes, documents, and credentials in a single, blazing-fast, edge-optimized monolithic platform.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
          className="flex flex-col sm:flex-row items-center gap-4"
        >
          <Link 
            href="/login" 
            className="flex h-12 items-center justify-center rounded-full bg-white px-8 text-sm font-semibold text-black transition-all hover:scale-105 hover:shadow-[0_0_40px_8px_rgba(99,102,241,0.3)]"
          >
            Start Building
            <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
          <button 
            onClick={() => {
              const cmdKEvent = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, metaKey: true });
              document.dispatchEvent(cmdKEvent);
            }}
            className="flex h-12 items-center justify-center rounded-full border border-premium-border bg-black/5 dark:bg-white/5 px-8 text-sm font-medium text-white transition-all hover:bg-black/10 dark:bg-white/10 backdrop-blur-md"
          >
            <span>Press</span> 
            <kbd className="mx-2 inline-flex items-center justify-center rounded bg-white/20 px-2 py-1 text-xs font-mono text-white/90 leading-none h-6">⌘ K</kbd> 
            <span>to explore</span>
          </button>
        </motion.div>
      </main>

      {/* Mockup Showcase */}
      <section className="relative z-20 max-w-6xl mx-auto px-6 -mt-10 mb-32">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="relative rounded-2xl border border-premium-border bg-black/50 p-2 backdrop-blur-md shadow-[0_0_100px_30px_rgba(99,102,241,0.15)] ring-1 ring-white/5"
          style={{ perspective: "1000px" }}
        >
          <motion.div
            initial={{ rotateX: 15 }}
            animate={{ rotateX: 0 }}
            transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
            className="overflow-hidden rounded-xl border border-premium-border bg-white dark:bg-[#09090b]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/mockup.png" 
              alt="Personal OS Dashboard Mockup" 
              className="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity duration-500"
            />
          </motion.div>
        </motion.div>
      </section>

      {/* Feature Bento Grid */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <div className="mb-16 text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Engineered for speed.</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-lg max-w-2xl mx-auto">Built with Next.js App Router, Edge Middleware, and SQLite for 0ms latency.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="col-span-1 md:col-span-2 relative overflow-hidden rounded-3xl border border-premium-border bg-black/5 dark:bg-white/5 p-8 backdrop-blur-sm group hover:border-white/20 transition-colors"
          >
            <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500">
              <Lock className="w-32 h-32 text-indigo-400" />
            </div>
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-6 border border-indigo-500/30">
                <Shield className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">Zero-Knowledge Vault</h3>
              <p className="text-zinc-500 dark:text-zinc-400 max-w-sm leading-relaxed">
                End-to-End Encryption (E2EE) powered by WebCrypto API. Your passwords are encrypted directly on your device. The server only sees ciphertext.
              </p>
            </div>
          </motion.div>

          {/* Card 2 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="col-span-1 relative overflow-hidden rounded-3xl border border-premium-border bg-black/5 dark:bg-white/5 p-8 backdrop-blur-sm group hover:border-white/20 transition-colors"
          >
            <div className="relative z-10 h-full flex flex-col">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-6 border border-purple-500/30">
                <Command className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">Omnibar</h3>
              <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed flex-1">
                Navigate the entire OS without touching your mouse. Press <kbd className="rounded bg-black/10 dark:bg-white/10 px-1 py-0.5 text-xs font-mono">⌘ K</kbd> anywhere.
              </p>
            </div>
          </motion.div>

          {/* Card 3 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="col-span-1 relative overflow-hidden rounded-3xl border border-premium-border bg-black/5 dark:bg-white/5 p-8 backdrop-blur-sm group hover:border-white/20 transition-colors"
          >
            <div className="relative z-10 h-full flex flex-col">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-6 border border-emerald-500/30">
                <Zap className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">Local-First</h3>
              <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed flex-1">
                Progressive Web App (PWA) with optimistic UI updates. Works offline and syncs seamlessly when connection is restored.
              </p>
            </div>
          </motion.div>

          {/* Card 4 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="col-span-1 md:col-span-2 relative overflow-hidden rounded-3xl border border-premium-border bg-black/5 dark:bg-white/5 p-8 backdrop-blur-sm group hover:border-white/20 transition-colors"
          >
            <div className="absolute bottom-0 right-8 opacity-20 group-hover:opacity-100 group-hover:-translate-y-4 transition-all duration-500">
              <Cpu className="w-32 h-32 text-pink-400" />
            </div>
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-pink-500/20 flex items-center justify-center mb-6 border border-pink-500/30">
                <Layers className="w-6 h-6 text-pink-400" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">Web Workers</h3>
              <p className="text-zinc-500 dark:text-zinc-400 max-w-md leading-relaxed">
                Heavy cryptographic operations and massive data processing are offloaded to background threads. The main UI thread never blocks, ensuring a butter-smooth 60FPS experience.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-premium-border bg-black/50 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <span className="font-semibold text-white">Personal OS</span>
          </div>
          <p className="text-zinc-500 text-sm">
            © {new Date().getFullYear()} Personal OS. Designed for speed.
          </p>
          <div className="flex gap-4">
            <a href="#" className="text-zinc-500 hover:text-premium-text transition-colors">
              <Globe className="w-5 h-5" />
            </a>
            <a href="#" className="text-zinc-500 hover:text-premium-text transition-colors">
              <Code className="w-5 h-5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
