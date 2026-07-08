import { User } from "./user";

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;

  clearState: () => void;

  signUp: (fullname: string, email: string, password: string) => Promise<{ success: boolean; error?: any }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: any }>;
  signInWithGoogle: (id_token: string) => Promise<{ success: boolean; error?: any }>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}
