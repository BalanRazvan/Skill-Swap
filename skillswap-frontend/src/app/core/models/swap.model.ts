export type SwapStatus = 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';

export interface SwapProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

export interface SwapSkill {
  id: string;
  name: string;
  category: string;
}

export interface Swap {
  id: string;
  requester_id: string;
  responder_id: string;
  requester_skill_id: string;
  responder_skill_id: string;
  status: SwapStatus;
  message: string;
  created_at: string;
  updated_at: string | null;
  requester: SwapProfile;
  responder: SwapProfile;
  requester_skill: SwapSkill;
  responder_skill: SwapSkill;
}

export interface SwapCreate {
  responder_id: string;
  requester_skill_id: string;
  responder_skill_id: string;
  message: string;
}
