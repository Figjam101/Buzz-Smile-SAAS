import React from 'react';

const base = 'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed';

const variants = {
  primary: 'bg-blue-600/90 text-white hover:bg-blue-600 focus:ring-blue-300 shadow-sm',
  secondary: 'bg-white/20 text-white hover:bg-white/25 focus:ring-white/30 border border-white/20',
  ghost: 'bg-transparent text-blue-700 hover:bg-blue-50 focus:ring-blue-200',
  destructive: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-300',
};

export default function GlassButton({ children, className = '', variant = 'primary', size = 'md', ...props }) {
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };
  const cls = [base, variants[variant] || variants.primary, sizes[size], className].join(' ');
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}