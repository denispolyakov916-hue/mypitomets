import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Вариант C: иконка «Редактировать» + меню «⋮» с дополнительными действиями.
 * Меню рендерится в Portal — вне overflow таблицы, чтобы клики работали.
 */
const RowActionsDropdown = ({
  row,
  primaryAction,
  dropdownActions,
  onAction,
  isOpen,
  onOpenChange
}) => {
  const containerRef = useRef(null);
  const menuTriggerRef = useRef(null);
  const menuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const actions = typeof dropdownActions === 'function' ? dropdownActions(row) : (dropdownActions || []);

  // Обновляем позицию меню при открытии
  useEffect(() => {
    if (isOpen && menuTriggerRef.current) {
      const rect = menuTriggerRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.left
      });
    }
  }, [isOpen]);

  // Закрытие при клике вне — используем click, не mousedown (чтобы клик по пункту успел обработаться)
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      const container = containerRef.current;
      const menu = menuRef.current;
      const target = event.target;
      if (
        container && !container.contains(target) &&
        menu && !menu.contains(target)
      ) {
        onOpenChange(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen, onOpenChange]);

  const handleActionClick = (actionKey) => {
    onAction?.(actionKey, row);
    onOpenChange(null);
  };

  const variantClasses = {
    danger: 'text-red-700 hover:bg-red-50',
    warning: 'text-yellow-700 hover:bg-yellow-50',
    success: 'text-green-700 hover:bg-green-50',
    primary: 'text-primary-700 hover:bg-primary-50'
  };

  const menuContent = isOpen && actions.length > 0 && (
    <div
      ref={menuRef}
      role="menu"
      className="fixed w-48 py-1 bg-white rounded-md shadow-lg border border-gray-200 z-[9999]"
      style={{ top: menuPosition.top, left: menuPosition.left }}
    >
      {actions.map((action) => (
        <button
          key={action.key}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleActionClick(action.key);
          }}
          role="menuitem"
          className={`block w-full text-left px-3 py-2 text-sm font-medium ${
            variantClasses[action.variant] || variantClasses.primary
          }`}
        >
          {action.icon && <span className="mr-2">{action.icon}</span>}
          {action.label}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <div className="relative flex items-center justify-center gap-1" ref={containerRef}>
        {/* Прямая кнопка «Редактировать» */}
        {primaryAction && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAction?.(primaryAction.key, row);
            }}
            className="p-1.5 rounded-md text-gray-400 hover:text-primary-600 hover:bg-primary-50 focus:outline-none focus:ring-1 focus:ring-primary-500"
            title={primaryAction.label}
            aria-label={primaryAction.label}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        )}

        {/* Кнопка меню «⋮» */}
        {actions.length > 0 && (
          <button
            ref={menuTriggerRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenChange(isOpen ? null : (row.id ?? row.pk));
            }}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
            title="Действия"
            aria-haspopup="menu"
            aria-expanded={isOpen}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>
        )}
      </div>

      {/* Меню в Portal — вне overflow таблицы */}
      {menuContent && createPortal(menuContent, document.body)}
    </>
  );
};

export default RowActionsDropdown;
