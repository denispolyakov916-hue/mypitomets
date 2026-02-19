import React, { useEffect, useRef, useCallback } from 'react';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true
}) => {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Обработка клавиши Escape
  const handleEscape = useCallback((e) => {
    if (closeOnEscape && e.key === 'Escape') {
      onClose();
    }
  }, [closeOnEscape, onClose]);

  // Управление фокусом и скроллом
  useEffect(() => {
    if (isOpen) {
      // Сохраняем текущий активный элемент
      previousActiveElement.current = document.activeElement;
      
      // Блокируем скролл body
      document.body.style.overflow = 'hidden';
      
      // Добавляем слушатель Escape
      document.addEventListener('keydown', handleEscape);
      
      // Устанавливаем фокус на модальное окно
      setTimeout(() => {
        if (modalRef.current) {
          const focusable = modalRef.current.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable) {
            focusable.focus();
          } else {
            modalRef.current.focus();
          }
        }
      }, 10);
      
      return () => {
        document.body.style.overflow = 'unset';
        document.removeEventListener('keydown', handleEscape);
        
        // Возвращаем фокус на предыдущий элемент
        if (previousActiveElement.current) {
          previousActiveElement.current.focus();
        }
      };
    }
  }, [isOpen, handleEscape]);

  // Ловушка фокуса
  const handleKeyDown = useCallback((e) => {
    if (e.key !== 'Tab' || !modalRef.current) return;
    
    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }, []);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
    full: 'max-w-full mx-4'
  };

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalTitleId = title ? `modal-title-${Math.random().toString(36).substr(2, 9)}` : undefined;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      role="presentation"
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div 
          ref={modalRef}
          className={`
            relative w-full ${sizeClasses[size]}
            bg-white rounded-lg shadow-xl transform transition-all
            max-h-[90vh] overflow-hidden
          `}
          role="dialog"
          aria-modal="true"
          aria-labelledby={modalTitleId}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              {title && (
                <h3 id={modalTitleId} className="text-lg font-medium text-gray-900">{title}</h3>
              )}

              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                  aria-label="Закрыть модальное окно"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
