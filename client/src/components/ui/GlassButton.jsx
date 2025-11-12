import React from 'react';

const base = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed';

export default function GlassButton({ children, className = '', variant = 'primary', size = 'md', ...props }) {
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };
  // Unify all GlassButton variants to use the primary button styling
  const cls = [base, 'btn', 'btn-primary', sizes[size], className].join(' ');
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}