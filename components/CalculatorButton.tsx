
import React from 'react';

interface CalculatorButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'dark' | 'light' | 'operator' | 'dark-gray';
  className?: string;
}

const CalculatorButton: React.FC<CalculatorButtonProps> = ({
  onClick,
  children,
  variant = 'dark',
  className = '',
}) => {
  const baseClasses =
    'rounded-full text-3xl sm:text-4xl aspect-square flex items-center justify-center transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-gray-400';

  const variantClasses = {
    dark: 'bg-gray-700 text-white hover:bg-gray-600 active:bg-gray-500',
    light: 'bg-gray-400 text-black hover:bg-gray-300 active:bg-gray-200',
    operator: 'bg-orange-500 text-white hover:bg-orange-400 active:bg-orange-300',
    'dark-gray': 'bg-gray-500 text-white hover:bg-gray-400 active:bg-gray-300',
  };

  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${className}`;

  return (
    <button className={combinedClasses} onClick={onClick}>
      {children}
    </button>
  );
};

export default CalculatorButton;
