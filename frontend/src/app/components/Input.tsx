import React from 'react';

interface SearchInputProps {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSubmit: () => void;
    onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void; // Optional
    placeholder?: string; // Optional
    disabled?: boolean; // Optional
    buttonContent?: React.ReactNode; // Optional, for icons etc.
  }
  
  export const Input: React.FC<SearchInputProps> = ({ 
    value, 
    onChange, 
    onSubmit, 
    onKeyPress, 
    placeholder = "Type something...", 
    disabled = false, 
    buttonContent }) => {
        return (
          // This container can be part of the component or left outside,
          // depending on reusability. We'll include it here.
          <div className="bg-[#DCDCDC] p-4 rounded-lg">
            <div className="flex space-x-2">
              <input
                type="text"
                value={value}
                onChange={onChange}
                onKeyPress={onKeyPress}
                placeholder={placeholder}
                disabled={disabled}
                className="flex-1 text-[#111111] rounded-lg px-4 py-2 focus:outline-none"
              />
              <button
                onClick={onSubmit}
                // The button's disabled logic now depends on the props
                disabled={!value.trim() || disabled}
                className="bg-[#ACC8E5] hover:bg-[#112A46] disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg transition-colors duration-200 flex items-center justify-center"
              > 
                {/* Render the icon or text passed in */}
                {buttonContent}
              </button>
            </div>
          </div>
        );
      };