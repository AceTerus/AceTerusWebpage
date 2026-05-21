export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      class_sessions: {
        Row: {
          id: string
          teacher_id: string
          class_name: string
          subject: string
          objective_text: string
          key_concepts: string[]
          started_at: string | null
          ended_at: string | null
          transcript_text: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          class_name: string
          subject: string
          objective_text: string
          key_concepts?: string[]
          started_at?: string | null
          ended_at?: string | null
          transcript_text?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string
          class_name?: string
          subject?: string
          objective_text?: string
          key_concepts?: string[]
          started_at?: string | null
          ended_at?: string | null
          transcript_text?: string | null
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      classpulse_users: {
        Row: {
          user_id: string
          role: string
          school_name: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          role: string
          school_name?: string | null
          created_at?: string
        }
        Update: {
          user_id?: string
          role?: string
          school_name?: string | null
          created_at?: string
        }
        Relationships: []
      }
      conclusion_reports: {
        Row: {
          id: string
          session_id: string
          coverage_score: number | null
          teacher_talk_ratio: number | null
          student_participation_count: number | null
          concepts_covered: string[]
          concepts_missed: string[]
          ai_coaching_note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          coverage_score?: number | null
          teacher_talk_ratio?: number | null
          student_participation_count?: number | null
          concepts_covered?: string[]
          concepts_missed?: string[]
          ai_coaching_note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          coverage_score?: number | null
          teacher_talk_ratio?: number | null
          student_participation_count?: number | null
          concepts_covered?: string[]
          concepts_missed?: string[]
          ai_coaching_note?: string | null
          created_at?: string
        }
        Relationships: []
      }
      student_session_summaries: {
        Row: {
          id: string
          session_id: string
          class_name: string
          subject: string
          date: string
          covered_notes: string | null
          key_terms: Json
          gap_notes: Json
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          class_name: string
          subject: string
          date: string
          covered_notes?: string | null
          key_terms?: Json
          gap_notes?: Json
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          class_name?: string
          subject?: string
          date?: string
          covered_notes?: string | null
          key_terms?: Json
          gap_notes?: Json
          created_at?: string
        }
        Relationships: []
      }
      flagged_concepts: {
        Row: {
          id: string
          session_id: string
          class_name: string
          concept_name: string
          pushed_to_students_at: string | null
          resolved: boolean
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          class_name: string
          concept_name: string
          pushed_to_students_at?: string | null
          resolved?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          class_name?: string
          concept_name?: string
          pushed_to_students_at?: string | null
          resolved?: boolean
          created_at?: string
        }
        Relationships: []
      }
      authenthication: {
        Row: {
          email: string
          password: string
        }
        Insert: {
          email: string
          password: string
        }
        Update: {
          email?: string
          password?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      chat_unread_counts: {
        Row: {
          id: string
          sender_id: string
          unread_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          sender_id: string
          unread_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          sender_id?: string
          unread_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_unread_counts_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chat_unread_counts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          followed_id: string
          follower_id: string
          id: string
        }
        Insert: {
          created_at?: string
          followed_id: string
          follower_id: string
          id?: string
        }
        Update: {
          created_at?: string
          followed_id?: string
          follower_id?: string
          id?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          comments_count: number | null
          content: string
          created_at: string
          id: string
          image_url: string | null
          likes_count: number | null
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comments_count?: number | null
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          likes_count?: number | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comments_count?: number | null
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          likes_count?: number | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      post_images: {
        Row: {
          id: string
          post_id: string
          file_url: string
          position: number | null
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          file_url: string
          position?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          file_url?: string
          position?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_images_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          followers_count: number | null
          following_count: number | null
          id: string
          last_quiz_date: string | null
          streak: number | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          followers_count?: number | null
          following_count?: number | null
          id?: string
          last_quiz_date?: string | null
          streak?: number | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          followers_count?: number | null
          following_count?: number | null
          id?: string
          last_quiz_date?: string | null
          streak?: number | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      schools: {
        Row: {
          id: string
          name: string
          type: string
          level: string
          state: string
          district: string | null
          city: string | null
        }
        Insert: {
          id?: string
          name: string
          type: string
          level: string
          state: string
          district?: string | null
          city?: string | null
        }
        Update: {
          id?: string
          name?: string
          type?: string
          level?: string
          state?: string
          district?: string | null
          city?: string | null
        }
        Relationships: []
      }
      student_schools: {
        Row: {
          id: string
          user_id: string
          school_id: string | null
          school_name: string | null
          grade: string | null
          curricular: string | null
          school_type: string | null
          school_location: string | null
          class_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          school_id?: string | null
          school_name?: string | null
          grade?: string | null
          curricular?: string | null
          school_type?: string | null
          school_location?: string | null
          class_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          school_id?: string | null
          school_name?: string | null
          grade?: string | null
          curricular?: string | null
          school_type?: string | null
          school_location?: string | null
          class_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "student_schools_school_id_fkey"; columns: ["school_id"]; referencedRelation: "schools"; referencedColumns: ["id"] }
        ]
      }
      quiz_completions: {
        Row: {
          completed_at: string
          created_at: string
          exam_id: string
          id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          exam_id: string
          id?: string
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          exam_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      upload_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          updated_at: string
          upload_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          upload_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          upload_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "upload_comments_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      upload_likes: {
        Row: {
          created_at: string
          id: string
          upload_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          upload_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          upload_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "upload_likes_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      uploads: {
        Row: {
          comments_count: number | null
          created_at: string
          description: string | null
          download_count: number | null
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          likes_count: number | null
          rating: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comments_count?: number | null
          created_at?: string
          description?: string | null
          download_count?: number | null
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          likes_count?: number | null
          rating?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comments_count?: number | null
          created_at?: string
          description?: string | null
          download_count?: number | null
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          likes_count?: number | null
          rating?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      reset_unread_count: {
        Args: {
          target_user: string
          target_sender: string
        }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
