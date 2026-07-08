export interface User {
  _id: string;
  full_name: string;
  email: string;
  role?: "user" | "admin" | string;
  avatar?: string | null;
  created_at?: string;
  updated_at?: string;
  createdAt?: string;
  updatedAt?: string;
}
