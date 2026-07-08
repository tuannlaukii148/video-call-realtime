import { motion } from 'motion/react';
import { Loader2, ShieldCheck } from 'lucide-react';

/**
 * Fullscreen waiting overlay shown when a user is pending
 * host approval to join the room.
 */
export function WaitingScreen() {
  return (
    <div className="fixed inset-0 z-[100] bg-surface flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center text-center max-w-sm px-8"
      >
        {/* Animated Shield */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-8"
        >
          <ShieldCheck size={48} className="text-primary" />
        </motion.div>

        {/* Text */}
        <h2 className="text-2xl font-extrabold tracking-tight text-on-surface mb-3">
          Waiting to be admitted
        </h2>
        <p className="text-on-surface-variant text-sm leading-relaxed mb-8">
          The host will let you in soon. Please wait while they review your
          request.
        </p>

        {/* Spinner */}
        <div className="flex items-center gap-3 text-primary">
          <Loader2 className="animate-spin" size={20} />
          <span className="text-sm font-bold">Waiting for host...</span>
        </div>

        {/* Decorative dots */}
        <div className="flex gap-2 mt-12">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.3,
              }}
              className="w-2 h-2 rounded-full bg-primary"
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
