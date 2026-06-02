export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_at: string;
}

export interface UserResponse {
  id: string;
  email: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  is_admin: boolean;
}
