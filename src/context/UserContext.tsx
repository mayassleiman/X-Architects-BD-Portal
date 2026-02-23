import React, { createContext, useContext, useState, useEffect } from "react";

interface UserProfile {
  name: string;
  role: string;
  email: string;
}

interface UserContextType {
  profile: UserProfile;
  updateProfile: (newProfile: UserProfile) => void;
}

const defaultProfile: UserProfile = {
  name: "Director BD",
  role: "Business Development",
  email: "admin@x-arch.com"
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem("userProfile");
    return saved ? JSON.parse(saved) : defaultProfile;
  });

  useEffect(() => {
    localStorage.setItem("userProfile", JSON.stringify(profile));
  }, [profile]);

  const updateProfile = (newProfile: UserProfile) => {
    setProfile(newProfile);
  };

  return (
    <UserContext.Provider value={{ profile, updateProfile }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
