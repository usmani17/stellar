import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-[14px] font-medium text-[#0b0f16] mb-1.5">
          {label}
        </label>
      )}
      <input
        className={`
          w-full px-4 py-2.5
          bg-white
          border border-[#E6E6E6]
          rounded-lg
          text-[14px] text-[#0b0f16]
          placeholder:text-[#bfbfbf]
          focus:outline-none focus:ring-2 focus:ring-[#136d6d] focus:border-[#136d6d]
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-red-500 focus:ring-red-500' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-h700 text-red-600">{error}</p>
      )}
    </div>
  );
};

