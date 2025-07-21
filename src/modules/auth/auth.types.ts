// Auth module type definitions
export interface RegisterUserBody {
  username: string;
  email: string;
  password: string;
}

export interface LoginUserBody {
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  token?: string;
}

export interface UserPayload {
  userId: string;
  userName: string;
}

export interface UserResponse {
  _id: string;
  username: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

// Extend Fastify Request interface
declare module "fastify" {
  interface FastifyRequest {
    user?: any; // Keep as any for compatibility
    routerPath?: string;
  }
}
