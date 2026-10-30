export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      groups: {
        Row: {
          id: string;
          name: string;
          currency: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          currency?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          currency?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      group_members: {
        Row: {
          group_id: string;
          user_id: string;
          display_name: string;
          role: string;
          created_at: string;
        };
        Insert: {
          group_id: string;
          user_id: string;
          display_name: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          group_id?: string;
          user_id?: string;
          display_name?: string;
          role?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          group_id: string;
          description: string;
          category: string;
          amount_cents: number;
          expense_date: string;
          split_type: "equal" | "exact";
          paid_by_user_id: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          description: string;
          category: string;
          amount_cents: number;
          expense_date: string;
          split_type: "equal" | "exact";
          paid_by_user_id: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          description?: string;
          category?: string;
          amount_cents?: number;
          expense_date?: string;
          split_type?: "equal" | "exact";
          paid_by_user_id?: string;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      expense_shares: {
        Row: {
          expense_id: string;
          group_id: string;
          user_id: string;
          amount_cents: number;
        };
        Insert: {
          expense_id: string;
          group_id: string;
          user_id: string;
          amount_cents: number;
        };
        Update: {
          expense_id?: string;
          group_id?: string;
          user_id?: string;
          amount_cents?: number;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_group_expense: {
        Args: {
          p_group_id: string;
          p_description: string;
          p_category: string;
          p_expense_date: string;
          p_amount_cents: number;
          p_split_type: "equal" | "exact";
          p_paid_by_user_id: string;
          p_shares: Json;
        };
        Returns: string;
      };
      is_group_member: {
        Args: { p_group_id: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
