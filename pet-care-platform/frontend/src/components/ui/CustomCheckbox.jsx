import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export function CustomCheckbox({ checked, onChange, variant = 'purple' }) {
  const gradientClass = variant === 'orange' 
    ? 'from-orange-500 to-red-500' 
    : 'from-purple-500 to-orange-500';

  return (
    <div onClick={onChange} className="relative w-5 h-5 cursor-pointer">
      <motion.div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          checked 
            ? `bg-gradient-to-r ${gradientClass} border-transparent` 
            : 'border-gray-300 bg-white hover:border-purple-400'
        }`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          initial={false}
          animate={{ scale: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
        </motion.div>
      </motion.div>
    </div>
  );
}