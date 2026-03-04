export type PlanType = 'free' | 'paid';

export interface Profile {
  id: string;
  email: string | null;
  plan: PlanType;
  plan_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export type CatStatus = 'Living' | 'Angel';

export interface Cat {
  id: string;
  user_id: string;
  cat_name: string;
  breed: string | null;
  age: number | null;
  personality: string[];
  preferences: string | null;
  dislikes: string | null;
  habits: string | null;
  self_ref: string | null;
  status: CatStatus;
  avatar_url: string | null;
  memory_summary: string | null;
  memory_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  cat_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface CatInsert {
  user_id: string;
  cat_name: string;
  breed?: string | null;
  age?: number | null;
  personality: string[];
  preferences?: string | null;
  dislikes?: string | null;
  habits?: string | null;
  self_ref?: string | null;
  status?: CatStatus;
  avatar_url?: string | null;
}

export interface CatUpdate {
  cat_name?: string;
  breed?: string | null;
  age?: number | null;
  personality?: string[];
  preferences?: string | null;
  dislikes?: string | null;
  habits?: string | null;
  self_ref?: string | null;
  status?: CatStatus;
  avatar_url?: string | null;
}
