import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { authInputClass, authInputStyle } from './AuthFormCard';

type PasswordInputProps = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  placeholder?: string;
};

export function PasswordInput({
  value,
  onChange,
  required = true,
  minLength,
  autoComplete = 'current-password',
  placeholder,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={authInputClass}
        style={{
          ...authInputStyle(),
          paddingRight: '2.75rem',
        }}
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 opacity-50 hover:opacity-100 transition-opacity bg-transparent border-0 cursor-pointer flex items-center justify-center"
        aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        style={{ color: 'inherit' }}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
