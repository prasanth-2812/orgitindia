import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TopAppBar, Button } from '../../components/shared';
import { authService } from '../../services/authService';
import { COUNTRY_CODES, CountryCode } from '../../constants/countryCodes';

const mobileSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    countryCode: z.string().nonempty('Country code is required'),
    mobile: z.string().regex(/^\d{6,15}$/, 'Mobile number must be between 6 and 15 digits'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .optional()
      .or(z.literal('')),
    confirmPassword: z.string().optional().or(z.literal('')),
  })
  .refine((data) => !data.password || data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type MobileFormData = z.infer<typeof mobileSchema>;

export const MobileNumberRegistration: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MobileFormData>({
    resolver: zodResolver(mobileSchema),
  });

  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(
    COUNTRY_CODES.find((c) => c.isoCode === 'IN') || COUNTRY_CODES[0]
  );

  const onSubmit = async (data: MobileFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const fullMobile = `${selectedCountry.dialCode}${data.mobile}`;
      const response = await authService.requestOTP({ mobile: fullMobile });
      if (response.success) {
        navigate('/otp-verification', {
          state: {
            mobile: fullMobile,
            dialCode: selectedCountry.dialCode,
            countryName: selectedCountry.name,
            rawMobile: data.mobile,
            name: data.name,
            password: data.password || undefined, // Pass password if provided
          },
        });
      } else {
        setError(response.error || 'Failed to send OTP');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col bg-background-light dark:bg-background-dark overflow-x-hidden font-display">
      <TopAppBar title="Register" onBack={() => navigate(-1)} />

      <div className="flex flex-col flex-1 w-full max-w-md mx-auto">
        {/* Header Image */}
        <div className="px-4 py-3">
          <div
            className="w-full bg-center bg-no-repeat bg-cover flex flex-col justify-end overflow-hidden bg-white dark:bg-white/5 rounded-xl min-h-[220px] shadow-sm relative"
            style={{
              backgroundImage:
                'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAPQVP8vXSeuHY6n8innftEZL3YSizIfMwAOz5zy_sYIDKvHPBxRfTOuY-swonDt62qT-fJ3PVZIpvfXHH-HtoQEAHUer0stwpi8X-Pa9rn32IM4kHkyHRK5cIhvx8xwHqnSlMKHqsrQT1ONFgNLH9k-gzh0Lg9iX4T4P7QfNB0BhwPUEdIJO_NL9afI373oBOAjPS430nSZ-LW0X8TuETXRoE9YjVuU7OlVfB26Hevu0arKSeWaw2CxssA0xdXcUw-PPI0n37alFqV")',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background-light dark:from-background-dark to-transparent opacity-60" />
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-slate-900 dark:text-white tracking-tight text-[32px] font-bold leading-tight px-6 text-center pt-4">
          Let's get you started
        </h1>

        {/* Body Text */}
        <p className="text-slate-500 dark:text-slate-400 text-base font-normal leading-normal py-3 px-6 text-center">
          Enter your mobile number and set a password to get started.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-6 py-4 w-full">
          {/* Name Field */}
          <label className="flex flex-col min-w-40 flex-1">
            <p className="text-slate-900 dark:text-white text-base font-medium leading-normal pb-2">
              Full Name
            </p>
            <input
              {...register('name')}
              className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/20 focus:border-primary h-14 placeholder:text-slate-400 p-[15px] text-lg font-normal leading-normal tracking-wide"
              placeholder="Enter your full name"
              type="text"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </label>

          <label className="flex flex-col min-w-40 flex-1">
            <p className="text-slate-900 dark:text-white text-base font-medium leading-normal pb-2">
              Mobile Number
            </p>
            <div className="flex w-full flex-1 items-stretch rounded-lg shadow-sm">
              {/* Country Code Selector */}
              <select
                {...register('countryCode')}
                value={selectedCountry.dialCode}
                onChange={(e) => {
                  const dialCode = e.target.value;
                  const found = COUNTRY_CODES.find((c) => c.dialCode === dialCode) || COUNTRY_CODES[0];
                  setSelectedCountry(found);
                }}
                className="flex items-center justify-center px-3 border border-r-0 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-l-lg text-slate-900 dark:text-white min-w-[110px] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {COUNTRY_CODES.map((code) => (
                  <option key={code.isoCode} value={code.dialCode}>
                    {code.name} ({code.dialCode})
                  </option>
                ))}
              </select>
              {/* Input Field */}
              <input
                {...register('mobile')}
                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/20 focus:border-primary h-14 placeholder:text-slate-400 p-[15px] text-lg font-normal leading-normal tracking-wide"
                placeholder="Enter mobile number"
                type="tel"
                maxLength={15}
              />
            </div>
            {errors.mobile && (
              <p className="text-red-500 text-sm mt-1">{errors.mobile.message}</p>
            )}
            {errors.countryCode && (
              <p className="text-red-500 text-sm mt-1">{errors.countryCode.message}</p>
            )}
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </label>

          {/* Password Field */}
          <label className="flex flex-col min-w-40 flex-1">
            <p className="text-slate-900 dark:text-white text-base font-medium leading-normal pb-2">
              Password <span className="text-slate-500 text-sm font-normal">(Optional)</span>
            </p>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                className="form-input flex w-full resize-none overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/20 focus:border-primary h-14 placeholder:text-slate-400 p-[15px] pr-12 text-lg font-normal leading-normal tracking-wide"
                placeholder="Enter password (min 8 chars, 1 letter, 1 number)"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <span className="material-symbols-outlined">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
            )}
          </label>

          {/* Confirm Password Field */}
          <label className="flex flex-col min-w-40 flex-1">
            <p className="text-slate-900 dark:text-white text-base font-medium leading-normal pb-2">
              Confirm Password
            </p>
            <div className="relative">
              <input
                {...register('confirmPassword')}
                type={showConfirmPassword ? 'text' : 'password'}
                className="form-input flex w-full resize-none overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/20 focus:border-primary h-14 placeholder:text-slate-400 p-[15px] pr-12 text-lg font-normal leading-normal tracking-wide"
                placeholder="Confirm your password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <span className="material-symbols-outlined">
                  {showConfirmPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>
            )}
          </label>

          {/* CTA Button */}
          <div className="px-0 pb-4 w-full mt-2">
            <Button type="submit" fullWidth disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Get OTP'}
            </Button>
          </div>
        </form>

        {/* Login Link */}
        <div className="px-6 py-2">
          <p className="text-center text-sm text-slate-600 dark:text-slate-400">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-primary font-semibold hover:text-primary/80 underline decoration-primary/30 underline-offset-2 transition-colors"
            >
              Login
            </button>
          </p>
        </div>

        {/* Terms Footer */}
        <div className="px-6 py-4 mt-auto mb-6">
          <p className="text-center text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
            By continuing, you agree to our{' '}
            <a
              className="text-primary hover:text-primary/80 underline decoration-primary/30 underline-offset-2 transition-colors"
              href="#"
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              className="text-primary hover:text-primary/80 underline decoration-primary/30 underline-offset-2 transition-colors"
              href="#"
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>

        {/* Spacer */}
        <div className="h-4 w-full" />
      </div>
    </div>
  );
};

