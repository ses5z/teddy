import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useStoredState } from '../hooks/useStoredState';
import type { Profile } from '../types';

interface ProfileValue {
  onboarded: boolean;
  setOnboarded: (value: boolean) => void;
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;
}

const ProfileContext = createContext<ProfileValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [onboarded, setOnboarded] = useStoredState('onboarded', false);
  const [profile, setProfile] = useStoredState<Profile | null>('profile', null);

  const value = useMemo(
    () => ({ onboarded, setOnboarded, profile, setProfile }),
    [onboarded, setOnboarded, profile, setProfile],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const value = useContext(ProfileContext);
  if (!value) throw new Error('useProfile must be used inside ProfileProvider');
  return value;
}
