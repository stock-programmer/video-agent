import { useState, useRef, useEffect } from 'react';

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
}

interface Props {
  id: string;
  name?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  className?: string;
}

/**
 * ComboboxInput - 可复用的自由输入 + 下拉建议组件
 *
 * 用户可以：
 * 1. 直接在输入框中输入任何内容
 * 2. 点击下拉按钮查看并选择预设选项
 */
export function ComboboxInput({
  id,
  name,
  label,
  value,
  onChange,
  options,
  placeholder = '自由输入或选择预设...',
  className = ''
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const isUserSelectingRef = useRef(false); // 标记用户是否正在选择

  // 同步外部 value 到内部 inputValue
  // 只有在非用户主动选择时才同步，避免覆盖用户刚选择的值
  useEffect(() => {
    // 如果用户正在选择，跳过同步
    if (isUserSelectingRef.current) {
      isUserSelectingRef.current = false;
      return;
    }
    // 只有当值真正不同时才更新
    if (value !== inputValue) {
      setInputValue(value);
    }
  }, [value, inputValue]);

  // 点击外部关闭下拉列表
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  const handleSelectOption = (optionValue: string) => {
    // 标记用户正在主动选择，防止 useEffect 覆盖
    isUserSelectingRef.current = true;
    setInputValue(optionValue);
    onChange(optionValue);
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={`combobox-container ${className}`}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-3">
        {label}
      </label>

      <div ref={containerRef} className="relative">
        {/* 输入框 + 下拉按钮 */}
        <div className="flex">
          <input
            type="text"
            id={id}
            name={name}
            value={inputValue}
            onChange={handleInputChange}
            placeholder={placeholder}
            className="flex-1 px-4 py-3 bg-slate-900/60 border border-r-0 border-slate-800/50 text-slate-50 placeholder-slate-600 rounded-l-lg focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/30 transition-all duration-200"
          />
          <button
            type="button"
            onClick={toggleDropdown}
            className="px-4 py-3 bg-slate-900/40 border border-l-0 border-slate-800/50 hover:bg-slate-900/60 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-rose-500 transition-colors duration-200 cursor-pointer"
            aria-label="显示预设选项"
          >
            <svg
              className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* 下拉选项列表 */}
        {isOpen && (
          <div className="absolute z-10 w-full mt-2 bg-slate-900/95 border border-slate-800/50 rounded-lg shadow-xl max-h-60 overflow-y-auto backdrop-blur-sm">
            {options.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-500">暂无预设选项</div>
            ) : (
              <ul className="py-2">
                {options.map((option) => (
                  <li key={option.value}>
                    <button
                      type="button"
                      onClick={() => handleSelectOption(option.value)}
                      className={`
                        w-full text-left px-4 py-3 text-sm transition-all duration-150 cursor-pointer border-l-2
                        ${inputValue === option.value
                          ? 'bg-rose-500/20 border-l-rose-500 text-rose-50 font-semibold'
                          : 'border-l-transparent text-slate-300 hover:bg-slate-800/50 hover:border-l-slate-700'
                        }
                      `}
                    >
                      <div className="font-medium">{option.label}</div>
                      {option.description && (
                        <div className="text-xs text-slate-500 mt-1">{option.description}</div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* 帮助文本 */}
      <p className="text-xs text-slate-500 mt-2">
        可直接输入或点击下拉按钮选择预设
      </p>
    </div>
  );
}
