import React, { useState } from 'react';
import { Button } from './index';

const Sidebar = ({ 
  items = [],
  isOpen = true,
  onToggle,
  className = '',
  ...props 
}) => {
  const [activeItem, setActiveItem] = useState(null);

  const handleItemClick = (item) => {
    setActiveItem(item.id);
    if (item.onClick) {
      item.onClick(item);
    }
  };

  return (
    <aside 
      className={`bg-slate-900 border-r border-slate-800 transition-all duration-300 ${
        isOpen ? 'w-64' : 'w-16'
      } ${className}`}
      {...props}
    >
      <div className="p-4">
        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="w-full mb-4"
        >
          {isOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          )}
        </Button>

        {/* Navigation Items */}
        <nav className="space-y-2">
          {items.map((item) => (
            <Button
              key={item.id}
              variant={activeItem === item.id ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => handleItemClick(item)}
              className={`w-full justify-start ${
                isOpen ? 'px-4' : 'px-2'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {isOpen && (
                <span className="ml-3">{item.label}</span>
              )}
            </Button>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
