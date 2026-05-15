// Supabase DB 타입 정의
// supabase gen types typescript 로 자동 생성 가능하나, 수동으로 관리

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          slug: string;
          name: string;
          phone: string | null;
          address: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["tenants"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["tenants"]["Insert"]>;
      };
      pilots: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          phone: string | null;
          email: string | null;
          license_no: string | null;
          license_expiry: string | null;
          status: "active" | "inactive";
          rate_per_flight: number;
          memo: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["pilots"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["pilots"]["Insert"]>;
      };
      products: {
        Row: {
          id: string;
          tenant_id: string;
          slug: string;
          name: string;
          subtitle: string | null;
          price: number;
          duration_min: number | null;
          features: string[] | null;
          badge: string | null;
          is_featured: boolean;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["products"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
      };
      product_options: {
        Row: {
          id: string;
          tenant_id: string;
          product_id: string;
          name: string;
          price: number;
          is_active: boolean;
        };
        Insert: Omit<Database["public"]["Tables"]["product_options"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["product_options"]["Insert"]>;
      };
      bookings: {
        Row: {
          id: string;
          tenant_id: string;
          booking_no: string;
          customer_name: string;
          customer_phone: string;
          product_id: string | null;
          product_name: string;
          product_price: number;
          headcount: number;
          flight_date: string;
          flight_time: string;
          options: Json;
          total_price: number;
          deposit_amount: number;
          balance_amount: number;
          status: "pending" | "confirmed" | "flying" | "completed" | "cancelled";
          channel: "online" | "phone" | "walk-in";
          pilot_id: string | null;
          memo: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["bookings"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["bookings"]["Insert"]>;
      };
      payments: {
        Row: {
          id: string;
          tenant_id: string;
          booking_id: string;
          type: "deposit" | "balance" | "refund";
          amount: number;
          method: string | null;
          pg_order_id: string | null;
          pg_payment_key: string | null;
          status: "pending" | "paid" | "cancelled" | "refunded";
          paid_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["payments"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>;
      };
      flight_records: {
        Row: {
          id: string;
          tenant_id: string;
          booking_id: string;
          pilot_id: string | null;
          flight_date: string;
          takeoff_at: string | null;
          landing_at: string | null;
          weather_grade: string | null;
          memo: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["flight_records"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["flight_records"]["Insert"]>;
      };
      booking_pilots: {
        Row: {
          id: string;
          tenant_id: string;
          booking_id: string;
          pilot_id: string;
          slot_no: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["booking_pilots"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["booking_pilots"]["Insert"]>;
      };
      settlements: {
        Row: {
          id: string;
          tenant_id: string;
          pilot_id: string;
          year_month: string;
          flight_count: number;
          rate_per_flight: number;
          total_amount: number;
          status: "calculating" | "confirmed" | "paid";
          paid_at: string | null;
          memo: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["settlements"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["settlements"]["Insert"]>;
      };
      pilot_schedules: {
        Row: {
          id: string;
          tenant_id: string;
          pilot_id: string;
          date: string;
          type: "work" | "off" | "standby" | "other";
          memo: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["pilot_schedules"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["pilot_schedules"]["Insert"]>;
      };
      costs: {
        Row: {
          id: string;
          tenant_id: string;
          date: string;
          category: string;
          description: string | null;
          amount: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["costs"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["costs"]["Insert"]>;
      };
      reviews: {
        Row: {
          id: string;
          tenant_id: string;
          booking_id: string | null;
          name: string;
          rating: number;
          product: string | null;
          body: string;
          images: string[] | null;
          status: "pending" | "approved" | "rejected";
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["reviews"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["reviews"]["Insert"]>;
      };
    };
  };
}

// 편의 타입 aliases
export type Tenant        = Database["public"]["Tables"]["tenants"]["Row"];
export type Pilot         = Database["public"]["Tables"]["pilots"]["Row"];
export type Product       = Database["public"]["Tables"]["products"]["Row"];
export type ProductOption = Database["public"]["Tables"]["product_options"]["Row"];
export type Booking       = Database["public"]["Tables"]["bookings"]["Row"];
export type Payment       = Database["public"]["Tables"]["payments"]["Row"];
export type FlightRecord  = Database["public"]["Tables"]["flight_records"]["Row"];
export type Settlement    = Database["public"]["Tables"]["settlements"]["Row"];
export type PilotSchedule = Database["public"]["Tables"]["pilot_schedules"]["Row"];
export type Cost          = Database["public"]["Tables"]["costs"]["Row"];
export type Review        = Database["public"]["Tables"]["reviews"]["Row"];
