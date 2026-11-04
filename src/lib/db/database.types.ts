export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      activity: {
        Row: {
          action: string;
          actor_id: string | null;
          amount_cents: number | null;
          created_at: string;
          description: string;
          group_id: string;
          id: string;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          amount_cents?: number | null;
          created_at?: string;
          description: string;
          group_id: string;
          id?: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          amount_cents?: number | null;
          created_at?: string;
          description?: string;
          group_id?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activity_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      alerts: {
        Row: {
          alert_month: string | null;
          budget_id: string | null;
          created_at: string;
          group_id: string | null;
          id: string;
          kind: string;
          message: string;
          read_at: string | null;
          threshold_percent: number | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          alert_month?: string | null;
          budget_id?: string | null;
          created_at?: string;
          group_id?: string | null;
          id?: string;
          kind: string;
          message: string;
          read_at?: string | null;
          threshold_percent?: number | null;
          user_id: string;
        };
        Update: {
          alert_month?: string | null;
          budget_id?: string | null;
          created_at?: string;
          group_id?: string | null;
          id?: string;
          kind?: string;
          message?: string;
          read_at?: string | null;
          threshold_percent?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alerts_budget_id_fkey";
            columns: ["budget_id"];
            isOneToOne: false;
            referencedRelation: "budgets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alerts_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alerts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      budgets: {
        Row: {
          category_id: string;
          created_at: string;
          effective_from: string;
          group_id: string;
          id: string;
          limit_cents: number;
        };
        ComputedFields: never;
        Insert: {
          category_id: string;
          created_at?: string;
          effective_from: string;
          group_id: string;
          id?: string;
          limit_cents: number;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          effective_from?: string;
          group_id?: string;
          id?: string;
          limit_cents?: number;
        };
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "budgets_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          created_at: string;
          group_id: string;
          id: string;
          is_archived: boolean;
          name: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          group_id: string;
          id?: string;
          is_archived?: boolean;
          name: string;
        };
        Update: {
          created_at?: string;
          group_id?: string;
          id?: string;
          is_archived?: boolean;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categories_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      default_categories: {
        Row: {
          created_at: string;
          id: string;
          is_archived: boolean;
          name: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          is_archived?: boolean;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_archived?: boolean;
          name?: string;
        };
        Relationships: [];
      };
      expense_shares: {
        Row: {
          amount_cents: number;
          expense_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          amount_cents: number;
          expense_id: string;
          user_id: string;
        };
        Update: {
          amount_cents?: number;
          expense_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expense_shares_expense_id_fkey";
            columns: ["expense_id"];
            isOneToOne: false;
            referencedRelation: "expenses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expense_shares_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      expenses: {
        Row: {
          amount_cents: number;
          category_id: string | null;
          created_at: string;
          created_by: string;
          description: string;
          expense_date: string;
          group_id: string;
          id: string;
          paid_by: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          amount_cents: number;
          category_id?: string | null;
          created_at?: string;
          created_by: string;
          description: string;
          expense_date: string;
          group_id: string;
          id?: string;
          paid_by: string;
          updated_at?: string;
        };
        Update: {
          amount_cents?: number;
          category_id?: string | null;
          created_at?: string;
          created_by?: string;
          description?: string;
          expense_date?: string;
          group_id?: string;
          id?: string;
          paid_by?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_paid_by_fkey";
            columns: ["paid_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      group_members: {
        Row: {
          group_id: string;
          joined_at: string;
          role: Database["public"]["Enums"]["group_member_role"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          group_id: string;
          joined_at?: string;
          role?: Database["public"]["Enums"]["group_member_role"];
          user_id: string;
        };
        Update: {
          group_id?: string;
          joined_at?: string;
          role?: Database["public"]["Enums"]["group_member_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      groups: {
        Row: {
          created_at: string;
          created_by: string;
          currency: string;
          id: string;
          name: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by: string;
          currency?: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          currency?: string;
          id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      invites: {
        Row: {
          created_at: string;
          created_by: string;
          expires_at: string;
          group_id: string;
          id: string;
          revoked_at: string | null;
          token: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by: string;
          expires_at?: string;
          group_id: string;
          id?: string;
          revoked_at?: string | null;
          token?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          expires_at?: string;
          group_id?: string;
          id?: string;
          revoked_at?: string | null;
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invites_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invites_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount_cents: number;
          created_at: string;
          group_id: string;
          id: string;
          note: string;
          paid_by: string;
          paid_to: string;
          payment_date: string;
        };
        ComputedFields: never;
        Insert: {
          amount_cents: number;
          created_at?: string;
          group_id: string;
          id?: string;
          note?: string;
          paid_by: string;
          paid_to: string;
          payment_date: string;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          group_id?: string;
          id?: string;
          note?: string;
          paid_by?: string;
          paid_to?: string;
          payment_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_paid_by_fkey";
            columns: ["paid_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_paid_to_fkey";
            columns: ["paid_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      personal_expenses: {
        Row: {
          amount_cents: number;
          category: string;
          created_at: string;
          description: string;
          expense_date: string;
          id: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          amount_cents: number;
          category: string;
          created_at?: string;
          description: string;
          expense_date: string;
          id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount_cents?: number;
          category?: string;
          created_at?: string;
          description?: string;
          expense_date?: string;
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "personal_expenses_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          id: string;
          is_site_admin: boolean;
          suspended_at: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          display_name?: string;
          id: string;
          is_site_admin?: boolean;
          suspended_at?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          id?: string;
          is_site_admin?: boolean;
          suspended_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_invite: { Args: { p_token: string }; Returns: string };
      create_expense: {
        Args: { p_expense: Json; p_shares: Json };
        Returns: string;
      };
      is_group_admin: { Args: { p_group_id: string }; Returns: boolean };
      is_group_member: { Args: { p_group_id: string }; Returns: boolean };
      is_site_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      platform_counts: {
        Args: Record<PropertyKey, never>;
        Returns: {
          expense_count: number;
          group_count: number;
          user_count: number;
        }[];
      };
      update_expense: {
        Args: { p_expense: Json; p_expense_id: string; p_shares: Json };
        Returns: string;
      };
    };
    Enums: {
      group_member_role: "member" | "admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      group_member_role: ["member", "admin"],
    },
  },
} as const;
