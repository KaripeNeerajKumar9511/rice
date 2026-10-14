export type Json = string | number | boolean | null | {[key: string]: Json | undefined} | Json[];

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type RelatedTable<Row, Insert, Update = Partial<Insert>, Relations extends Relationship[] = Relationship[]> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relations;
};

type Profile = {
  id: string;
  role: Database['public']['Enums']['seller_role'];
  full_name: string;
  email: string | null;
  phone: string | null;
  preferred_language: string;
  account_status: string;
  created_at: string;
  updated_at: string;
};

type SellerLocation = {
  id: string;
  seller_id: string;
  state_code: string;
  district: string;
  mandal: string | null;
  village: string | null;
  postal_code: string | null;
  location: unknown;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

type RiceListing = {
  id: string;
  seller_id: string;
  variety_id: string | null;
  location_id: string;
  title: string;
  title_te: string | null;
  description: string | null;
  rice_type: string;
  price_amount: number;
  price_unit: string;
  bag_weight_kg: number | null;
  stock_quantity: number;
  stock_unit: string;
  minimum_order_quantity: number | null;
  minimum_order_unit: string | null;
  fulfilment_options: string[];
  status: Database['public']['Enums']['listing_status'];
  published_at: string | null;
  last_stock_updated_at: string;
  created_at: string;
  updated_at: string;
};

type ListingImage = {
  id: string;
  listing_id: string;
  seller_id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
  created_at: string;
};

type Enquiry = {
  id: string;
  listing_id: string;
  seller_id: string;
  buyer_name: string;
  buyer_phone: string;
  buyer_location: string;
  buyer_address: string | null;
  requested_quantity: string | null;
  buyer_message: string | null;
  consent_at: string;
  status: Database['public']['Enums']['enquiry_status'];
  seller_notes: string | null;
  listing_title_snapshot: string;
  price_snapshot: number | null;
  price_unit_snapshot: string | null;
  created_at: string;
  updated_at: string;
};

type RiceVariety = {
  id: string;
  name_en: string;
  name_te: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

type Report = {
  id: string;
  listing_id: string;
  reason: string;
  details: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

type AuditLog = {
  id: string;
  actor_id: string | null;
  action: string;
  target_table: string;
  target_id: string | null;
  reason: string | null;
  metadata: Json;
  created_at: string;
};

type AdminNotification = {
  id: string;
  seller_id: string;
  listing_id: string | null;
  listing_title: string;
  note: string;
  created_by: string | null;
  created_at: string;
};

type PublicListing = Omit<RiceListing, 'updated_at'> & {
  seller_name: string;
  seller_role: Database['public']['Enums']['seller_role'];
  state_code: string;
  district: string;
  mandal: string | null;
  village: string | null;
  image_url: string | null;
};

type EnquiryView = Pick<
  Enquiry,
  | 'id'
  | 'listing_id'
  | 'seller_id'
  | 'buyer_name'
  | 'buyer_phone'
  | 'buyer_location'
  | 'buyer_address'
  | 'requested_quantity'
  | 'buyer_message'
  | 'status'
  | 'seller_notes'
  | 'created_at'
  | 'updated_at'
  | 'listing_title_snapshot'
  | 'price_snapshot'
  | 'price_unit_snapshot'
>;

type AdminReportView = Pick<Report, 'id' | 'listing_id' | 'reason' | 'details' | 'status' | 'created_at'> & {
  listing_title: string;
  seller_id: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, Omit<Profile, 'email' | 'created_at' | 'updated_at' | 'account_status'> & {
        email?: string | null;
        created_at?: string;
        updated_at?: string;
        account_status?: string;
      }>;
      seller_locations: Table<SellerLocation, Omit<SellerLocation, 'id' | 'location' | 'is_public' | 'created_at' | 'updated_at'> & {
        id?: string;
        location?: unknown;
        is_public?: boolean;
        created_at?: string;
        updated_at?: string;
      }>;
      rice_varieties: Table<RiceVariety, Omit<RiceVariety, 'id' | 'created_at' | 'is_active' | 'sort_order'> & {
        id?: string;
        created_at?: string;
        is_active?: boolean;
        sort_order?: number;
      }>;
      rice_listings: RelatedTable<
        RiceListing,
        Omit<RiceListing, 'id' | 'variety_id' | 'title_te' | 'description' | 'bag_weight_kg' | 'minimum_order_quantity' | 'minimum_order_unit' | 'published_at' | 'last_stock_updated_at' | 'created_at' | 'updated_at'> & {
          id?: string;
          variety_id?: string | null;
          title_te?: string | null;
          description?: string | null;
          bag_weight_kg?: number | null;
          minimum_order_quantity?: number | null;
          minimum_order_unit?: string | null;
          published_at?: string | null;
          last_stock_updated_at?: string;
          created_at?: string;
          updated_at?: string;
        },
        Omit<Partial<RiceListing>, 'status'> & {status?: string},
        [
          {
            foreignKeyName: 'rice_listings_location_id_fkey';
            columns: ['location_id'];
            isOneToOne: false;
            referencedRelation: 'seller_locations';
            referencedColumns: ['id'];
          }
        ]
      >;
      listing_images: Table<
        ListingImage,
        Omit<ListingImage, 'id' | 'alt_text' | 'sort_order' | 'created_at'> & {
          id?: string;
          alt_text?: string | null;
          sort_order?: number;
          created_at?: string;
        }
      >;
      enquiries: Table<
        Enquiry,
        Omit<Enquiry, 'id' | 'buyer_address' | 'requested_quantity' | 'buyer_message' | 'consent_at' | 'status' | 'seller_notes' | 'price_snapshot' | 'price_unit_snapshot' | 'created_at' | 'updated_at'> & {
          id?: string;
          buyer_address?: string | null;
          requested_quantity?: string | null;
          buyer_message?: string | null;
          consent_at?: string;
          status?: string;
          seller_notes?: string | null;
          price_snapshot?: number | null;
          price_unit_snapshot?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      reports: Table<
        Report,
        Omit<Report, 'id' | 'details' | 'status' | 'reviewed_by' | 'reviewed_at' | 'created_at'> & {
          id?: string;
          details?: string | null;
          status?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        },
        Partial<Report>
      >;
      admin_notifications: Table<
        AdminNotification,
        Omit<AdminNotification, 'id' | 'listing_id' | 'created_at'> & {
          id?: string;
          listing_id?: string | null;
          created_at?: string;
        },
        Partial<AdminNotification>
      >;
      audit_logs: Table<
        AuditLog,
        Omit<AuditLog, 'id' | 'actor_id' | 'target_id' | 'reason' | 'metadata' | 'created_at'> & {
          id?: string;
          actor_id?: string | null;
          target_id?: string | null;
          reason?: string | null;
          metadata?: Json;
          created_at?: string;
        }
      >;
    };
    Views: {
      public_listings: {Row: PublicListing; Relationships: []};
      seller_enquiries_view: {Row: EnquiryView; Relationships: []};
      admin_reports_view: {Row: AdminReportView; Relationships: []};
    };
    Functions: {
      create_buyer_enquiry: {
        Args: {
          p_listing_id: string;
          p_buyer_name: string;
          p_buyer_phone: string;
          p_buyer_location: string;
          p_buyer_address?: string | null;
          p_requested_quantity?: string | null;
          p_buyer_message?: string | null;
          p_consent?: boolean;
        };
        Returns: string;
      };
      submit_listing_report: {
        Args: {p_listing_id: string; p_reason: string; p_details?: string | null};
        Returns: string;
      };
      upsert_my_seller_location: {
        Args: {p_state_code: string; p_district: string; p_mandal: string; p_village: string};
        Returns: string;
      };
      admin_archive_listing: {
        Args: {p_listing_id: string; p_note: string};
        Returns: string;
      };
      admin_get_visitor_analytics: {
        Args: {p_days: number};
        Returns: {visit_date: string; unique_visitors: number; page_views: number}[];
      };
    };
    Enums: {
      seller_role: 'farmer' | 'retailer' | 'admin';
      listing_status: 'active' | 'paused' | 'unavailable' | 'hidden' | 'archived';
      enquiry_status: 'new' | 'contacted' | 'negotiating' | 'completed' | 'unreachable' | 'cancelled';
    };
    CompositeTypes: Record<string, never>;
  };
};
