export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      resources: {
        Row: Resource;
        Insert: Omit<Resource, 'id' | 'created_at' | 'updated_at' | 'upvote_count'>;
        Update: Partial<Omit<Resource, 'id' | 'created_at' | 'uploader_id'>>;
      };
      votes: {
        Row: Vote;
        Insert: Omit<Vote, 'id' | 'created_at'>;
        Update: never;
      };
    };
  };
}

export interface Profile {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Resource {
  id: string;
  title: string;
  subject: string;
  resource_type: string;
  link: string;
  description: string | null;
  uploader_id: string;
  upvote_count: number;
  created_at: string;
  updated_at: string;
}

export interface Vote {
  id: string;
  resource_id: string;
  user_id: string;
  created_at: string;
}

// Extended types with relations
export interface ResourceWithProfile extends Resource {
  profiles: Profile;
}

export interface ResourceWithVotes extends Resource {
  votes: Vote[];
  user_voted: boolean;
}

// Form types
export interface CreateResourceInput {
  title: string;
  subject: string;
  resource_type: string;
  link: string;
  description?: string;
}

export interface UpdateResourceInput {
  title?: string;
  subject?: string;
  resource_type?: string;
  link?: string;
  description?: string;
}

// Made with Bob
