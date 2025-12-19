import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TopAppBar, Button, ToggleSwitch } from '../../components/shared';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  bio: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export const UserProfileCreation: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [syncContacts, setSyncContacts] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      bio: user?.bio || '',
    },
  });

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Upload profile photo to S3 via backend
      const profilePhotoUrl = profilePhoto; // This should be the uploaded URL

      const response = await authService.setupProfile({
        name: data.name,
        bio: data.bio,
        profilePhotoUrl: profilePhotoUrl || undefined,
      });

      if (response.success && response.data) {
        updateUser(response.data);

        // Sync contacts if enabled
        if (syncContacts) {
          try {
            // Get contacts from browser (if available)
            // For now, we'll just call the API - in production, get from device
            await authService.syncContacts({ contacts: [] });
          } catch (err) {
            console.error('Failed to sync contacts:', err);
            // Don't block profile creation if contact sync fails
          }
        }

        navigate('/dashboard');
      } else {
        setError(response.error || 'Failed to save profile');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatMobile = (mobile?: string) => {
    if (!mobile) return '';
    return `+1 ${mobile.slice(0, 3)} ${mobile.slice(3, 6)} ${mobile.slice(6)}`;
  };

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto shadow-2xl bg-background-light dark:bg-background-dark">
      <TopAppBar title="Setup Profile" onBack={() => navigate(-1)} />

      <main className="flex-1 flex flex-col px-6 pb-24 overflow-y-auto no-scrollbar">
        {/* Headline */}
        <div className="pt-4 pb-2">
          <h1 className="text-text-main dark:text-text-light tracking-tight text-[28px] font-bold leading-tight text-center">
            Let's get to know you
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-base font-normal leading-normal pt-2 text-center">
            Please complete your profile to connect with your team.
          </p>
        </div>

        {/* Profile Photo Upload */}
        <div className="flex flex-col items-center py-6">
          <div className="relative group cursor-pointer" onClick={handlePhotoClick}>
            <div
              className="bg-center bg-no-repeat bg-cover rounded-full h-32 w-32 shadow-md border-4 border-white dark:border-surface-dark bg-gray-200 dark:bg-gray-700"
              style={
                profilePhoto
                  ? { backgroundImage: `url(${profilePhoto})` }
                  : {
                      backgroundImage:
                        'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDpVrjWG1e0Jsm9w9Yw-ZdsqhykKtN0bUmUYNwSuWeFN0HP4uprZ7I-Tp9IWwvBxkv9JEefN7Aeb9QDGkRjQ5YHQ3DTVFRRBF5V4lkqp0fw9yvW8BWEsimAcwSQovBSJkOFbXcTKHJYuamfQbFqetiUfEkwMAoTb8thrRyHViQHcBMWdcxNTaRJG_o2tQuvzhhBwiUcnqUMI6wjAUT26GDnCnTXBtofcNfIf9Wilj47Tj6SDULV3v1nB65qp1hXIpTA0Q0_RSnpFVTA")',
                    }
              }
            />
            <div className="absolute bottom-0 right-0 p-2 bg-primary rounded-full border-[3px] border-background-light dark:border-background-dark flex items-center justify-center shadow-lg transition-transform transform active:scale-95">
              <span className="material-symbols-outlined text-white text-[20px]">photo_camera</span>
            </div>
          </div>
          <p className="text-primary font-semibold mt-3 text-sm cursor-pointer" onClick={handlePhotoClick}>
            Change Photo
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 w-full">
          {/* Full Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-text-main dark:text-text-light text-sm font-medium">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              {...register('name')}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-surface-light dark:bg-surface-dark px-4 py-3.5 text-base text-text-main dark:text-text-light placeholder:text-gray-400 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-shadow"
              placeholder="e.g. Jane Doe"
              type="text"
            />
            {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
          </div>

          {/* Mobile Number (Locked) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-text-main dark:text-text-light text-sm font-medium">Mobile Number</label>
            <div className="relative">
              <input
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-4 py-3.5 text-base text-gray-500 dark:text-gray-400 cursor-not-allowed"
                disabled
                type="tel"
                value={formatMobile(user?.mobile)}
              />
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">
                lock
              </span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 px-1">Verified via OTP</p>
          </div>

          {/* Bio */}
          <div className="flex flex-col gap-1.5">
            <label className="text-text-main dark:text-text-light text-sm font-medium">
              Bio <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <textarea
              {...register('bio')}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-surface-light dark:bg-surface-dark px-4 py-3 text-base text-text-main dark:text-text-light placeholder:text-gray-400 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none resize-none transition-shadow"
              placeholder="Tell us a bit about your role..."
              rows={3}
            />
          </div>

          {/* Contact Sync Permission Card */}
          <div className="mt-2 rounded-xl border border-primary/20 bg-surface-light dark:bg-surface-dark p-4 shadow-sm flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <span className="material-symbols-outlined">contacts</span>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-text-main dark:text-text-light">Sync Contacts</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight mt-0.5">
                Find your team members easily.
              </p>
            </div>
            <ToggleSwitch checked={syncContacts} onChange={setSyncContacts} id="sync-contacts" />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </form>
      </main>

      {/* Bottom Action Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 max-w-md mx-auto z-40">
        <Button
          onClick={handleSubmit(onSubmit)}
          fullWidth
          disabled={isLoading}
          className="rounded-full py-4 text-lg shadow-lg shadow-primary/30"
        >
          {isLoading ? 'Saving...' : 'Save & Continue'}
        </Button>
      </div>
    </div>
  );
};

