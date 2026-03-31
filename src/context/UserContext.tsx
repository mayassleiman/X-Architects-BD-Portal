import React, { createContext, useContext, useState, useEffect } from "react";

export interface UserProfile {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: string;
  email: string;
  image?: string;
}

interface UserContextType {
  profile: UserProfile | null;
  isAuthenticated: boolean;
  users: UserProfile[];
  login: (username: string, password?: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (newProfile: UserProfile) => void;
  addUser: (newUser: UserProfile) => void;
  deleteUser: (id: string) => void;
}

const defaultAdmin: UserProfile = {
  id: "admin-1",
  username: "admin",
  password: "DHCP818ftp",
  name: "Director BD",
  role: "Business Development",
  email: "admin@x-arch.com"
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem("portalUsers");
    return saved ? JSON.parse(saved) : [defaultAdmin];
  });

  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem("userProfile");
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    localStorage.setItem("portalUsers", JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (profile) {
      localStorage.setItem("userProfile", JSON.stringify(profile));
    } else {
      localStorage.removeItem("userProfile");
    }
  }, [profile]);

  const login = async (username: string, password?: string) => {
    // Check local users first (admin, etc)
    const localUser = users.find(u => u.username === username && u.password === password);
    if (localUser) {
      setProfile(localUser);
      return true;
    }

    // Check registrations
    try {
      const res = await fetch('/api/registrations');
      if (res.ok) {
        const registrations = await res.json();
        const regUser = registrations.find((r: any) => r.username === username && r.password === password);
        if (regUser) {
          // Create a profile object for the registered user
          const regProfile: UserProfile = {
            id: `reg-${regUser.id}`,
            username: regUser.username,
            name: regUser.contact_name || regUser.client,
            role: "Client",
            email: "" // Registrations don't currently have email, could add later
          };
          setProfile(regProfile);
          return true;
        }
      }
    } catch (error) {
      console.error("Error checking registrations for login", error);
    }

    return false;
  };

  const logout = () => {
    setProfile(null);
  };

  const updateProfile = (newProfile: UserProfile) => {
    setProfile(newProfile);
    setUsers(prev => prev.map(u => u.id === newProfile.id ? newProfile : u));
  };

  const addUser = (newUser: UserProfile) => {
    setUsers(prev => [...prev, newUser]);
  };

  const deleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  return (
    <UserContext.Provider value={{ 
      profile, 
      isAuthenticated: !!profile, 
      users, 
      login, 
      logout, 
      updateProfile, 
      addUser,
      deleteUser
    }}>
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
