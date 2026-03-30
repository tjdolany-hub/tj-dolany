export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string;
          role: "admin" | "editor";
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          role?: "admin" | "editor";
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          role?: "admin" | "editor";
          created_at?: string;
        };
      };
      articles: {
        Row: {
          id: string;
          title: string;
          slug: string;
          content: string;
          summary: string | null;
          category: "aktuality" | "fotbal" | "sokolovna" | "oznameni";
          published: boolean;
          author_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          content?: string;
          summary?: string | null;
          category?: "aktuality" | "fotbal" | "sokolovna" | "oznameni";
          published?: boolean;
          author_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          slug?: string;
          content?: string;
          summary?: string | null;
          category?: "aktuality" | "fotbal" | "sokolovna" | "oznameni";
          published?: boolean;
          author_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      article_images: {
        Row: {
          id: string;
          article_id: string;
          url: string;
          alt: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          article_id: string;
          url: string;
          alt?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          article_id?: string;
          url?: string;
          alt?: string | null;
          sort_order?: number;
          created_at?: string;
        };
      };
      players: {
        Row: {
          id: string;
          name: string;
          position: "brankar" | "obrance" | "zaloznik" | "utocnik";
          number: number | null;
          photo: string | null;
          description: string | null;
          sort_order: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          position: "brankar" | "obrance" | "zaloznik" | "utocnik";
          number?: number | null;
          photo?: string | null;
          description?: string | null;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          position?: "brankar" | "obrance" | "zaloznik" | "utocnik";
          number?: number | null;
          photo?: string | null;
          description?: string | null;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
        };
      };
      calendar_events: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          date: string;
          end_date: string | null;
          event_type: "zapas" | "trenink" | "akce" | "pronajem" | "volne";
          location: string | null;
          is_public: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          date: string;
          end_date?: string | null;
          event_type?: "zapas" | "trenink" | "akce" | "pronajem" | "volne";
          location?: string | null;
          is_public?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          date?: string;
          end_date?: string | null;
          event_type?: "zapas" | "trenink" | "akce" | "pronajem" | "volne";
          location?: string | null;
          is_public?: boolean;
          created_at?: string;
        };
      };
      match_results: {
        Row: {
          id: string;
          date: string;
          opponent: string;
          score_home: number;
          score_away: number;
          is_home: boolean;
          competition: string | null;
          summary: string | null;
          article_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          date: string;
          opponent: string;
          score_home?: number;
          score_away?: number;
          is_home?: boolean;
          competition?: string | null;
          summary?: string | null;
          article_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          date?: string;
          opponent?: string;
          score_home?: number;
          score_away?: number;
          is_home?: boolean;
          competition?: string | null;
          summary?: string | null;
          article_id?: string | null;
          created_at?: string;
        };
      };
      season_draws: {
        Row: {
          id: string;
          season: string;
          title: string;
          image: string;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          season: string;
          title: string;
          image: string;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          season?: string;
          title?: string;
          image?: string;
          active?: boolean;
          created_at?: string;
        };
      };
      future_events: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          date: string;
          poster: string | null;
          published: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          date: string;
          poster?: string | null;
          published?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          date?: string;
          poster?: string | null;
          published?: boolean;
          sort_order?: number;
          created_at?: string;
        };
      };
      photo_albums: {
        Row: {
          id: string;
          title: string;
          slug: string;
          description: string | null;
          cover_url: string | null;
          event_date: string | null;
          published: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          description?: string | null;
          cover_url?: string | null;
          event_date?: string | null;
          published?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          slug?: string;
          description?: string | null;
          cover_url?: string | null;
          event_date?: string | null;
          published?: boolean;
          created_at?: string;
        };
      };
      photos: {
        Row: {
          id: string;
          album_id: string;
          url: string;
          alt: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          album_id: string;
          url: string;
          alt?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          album_id?: string;
          url?: string;
          alt?: string | null;
          sort_order?: number;
          created_at?: string;
        };
      };
    };
  };
}
