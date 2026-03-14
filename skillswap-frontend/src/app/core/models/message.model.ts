export interface Message {
  id: string;
  swap_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  };
}

export interface ConversationUser {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

export interface Conversation {
  swap_id: string;
  swap_status: string;
  other_user: ConversationUser;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}
