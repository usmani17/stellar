import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/cn';

export interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export interface MenuProps {
  items: MenuItem[];
  trigger?: React.ReactNode;
  align?: 'left' | 'right';
  position?: 'bottom' | 'top';
  className?: string;
}

export const Menu: React.FC<MenuProps> = ({
  items,
  trigger,
  align = 'right',
  position = 'bottom',
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const alignClasses = {
    left: 'left-0',
    right: 'right-0',
  };

  const positionClasses = {
    bottom: 'top-full mt-1',
    top: 'bottom-full mb-1',
  };

  const defaultTrigger = (
    <button
      type="button"
      onClick={() => setIsOpen(!isOpen)}
      className="flex items-center justify-center p-3 rounded-[9.6px] hover:bg-gray-100 transition-colors"
    >
      <svg
        className="w-3 h-3 text-[#072929]"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
      </svg>
    </button>
  );

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {trigger ? (
        <div ref={triggerRef} onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      ) : (
        defaultTrigger
      )}

      {isOpen && (
        <div
          ref={menuRef}
          className={cn(
            'absolute z-[99999] bg-[#fcfcf9] border border-[#e3e3e3] rounded-[12px] shadow-[0px_20px_40px_0px_rgba(0,0,0,0.1)] overflow-hidden min-w-[175px]',
            alignClasses[align],
            positionClasses[position]
          )}
          style={{ zIndex: 99999 }}
        >
          <div className="flex flex-col items-center justify-center">
            {items.map((item, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick();
                    setIsOpen(false);
                  }
                }}
                disabled={item.disabled}
                className={cn(
                  'w-full flex gap-2 h-9 items-center px-4 hover:bg-gray-50 transition-colors',
                  item.disabled && 'opacity-50 cursor-not-allowed',
                  !item.disabled && 'cursor-pointer',
                  item.className
                )}
              >
                {item.icon && (
                  <div className="flex items-center justify-center w-5 h-5">
                    {item.icon}
                  </div>
                )}
                <span className="text-[12px] text-[#072929] font-normal">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

