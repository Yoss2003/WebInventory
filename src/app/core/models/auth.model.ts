export interface LoginRequest {
  username: string;
  password?: string;
  twoFactorCode?: string;
  companyId: number;
  rememberMe?: boolean;
}

export interface AuthResponse {
  id: number;
  username: string;
  email?: string;
  token: string;
  roleId: number;
  companyId: number;
}