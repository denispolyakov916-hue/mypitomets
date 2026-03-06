import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Components
import Sidebar from './Sidebar';
import Header from './Header';

// Routes that need full-bleed layout (no padding, no max-width)
const FULL_BLEED_PATTERNS = ['/edit'];

const pageTransition = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] },
};

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const isFullBleed = FULL_BLEED_PATTERNS.some(p => location.pathname.includes(p));

  const content = (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={pageTransition.initial}
        animate={pageTransition.animate}
        exit={pageTransition.exit}
        transition={pageTransition.transition}
        className={isFullBleed ? 'h-full' : ''}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Sidebar для мобильных устройств */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Основной layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Боковая панель для десктопа */}
        <div className="hidden lg:flex lg:w-64 lg:flex-col lg:flex-shrink-0">
          <Sidebar
            isOpen={true}
            desktop={true}
          />
        </div>

        {/* Основной контент */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Заголовок */}
          <Header onMenuClick={() => setSidebarOpen(true)} />

          {/* Основной контент */}
          {isFullBleed ? (
            <main className="flex-1 overflow-hidden">
              {content}
            </main>
          ) : (
            <main className="flex-1 overflow-y-auto p-6">
              <div className="max-w-7xl mx-auto">
                {content}
              </div>
            </main>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
