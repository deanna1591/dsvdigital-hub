export type Role = "employee" | "admin";

export type OrderStatus = "pending" | "processing" | "delivered" | "rejected";

export interface Profile {
  id: string;
  name: string;
  role: Role;
  is_active: boolean;
}

export interface EmployeeBalance {
  id: string;
  name: string;
  role: Role;
  is_active: boolean;
  earned_total: number;
  redeemed_total: number;
  balance: number;
}

export interface PointCategory {
  id: string;
  name: string;
  default_points: number;
  description: string | null;
  max_per_year: number | null;
  is_active: boolean;
}

export interface PointActivity {
  id: string;
  employee_id: string;
  category_id: string;
  points: number;
  note: string | null;
  awarded_by: string | null;
  created_at: string;
  // joined fields
  category?: PointCategory;
  employee?: Profile;
}

export interface CatalogItem {
  id: string;
  name: string;
  icon: string;
  points: number;
  peso_value: number;
  source_url: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface RedemptionOrder {
  id: string;
  employee_id: string;
  item_id: string;
  item_name: string;
  item_icon: string;
  points_spent: number;
  peso_value: number;
  status: OrderStatus;
  admin_note: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
  // joined
  employee?: Profile;
}

export type MissionType = "social-post" | "review" | "survey" | "video" | "referral" | "custom";
export type ProofType = "url" | "screenshot" | "text" | "none";
export type SubmissionStatus = "pending" | "approved" | "rejected";

export interface Mission {
  id: string;
  title: string;
  description: string;
  points: number;
  mission_type: MissionType;
  platform: string | null;
  proof_type: ProofType;
  cover_color: string;
  cover_emoji: string;
  external_link: string | null;
  instructions: string | null;
  is_pinned: boolean;
  is_active: boolean;
  max_per_user: number;
  expires_at: string | null;
  sort_order: number;
  created_at: string;
}

export interface MissionSubmission {
  id: string;
  mission_id: string;
  employee_id: string;
  proof_url: string | null;
  proof_text: string | null;
  status: SubmissionStatus;
  reviewed_by: string | null;
  review_note: string | null;
  awarded_activity_id: string | null;
  created_at: string;
  updated_at: string;
  // joined
  mission?: Mission;
  employee?: Profile;
}

// ============ DAILY SPARKS ============

export interface DailySpark {
  id: string;
  day_of_year: number;
  title: string;
  prompt: string;
  emoji: string;
  color: string;
  points: number;
  proof_type: ProofType;
  is_active: boolean;
}

export interface DailySparkClaim {
  id: string;
  spark_id: string;
  employee_id: string;
  claim_date: string;
  proof_url: string | null;
  proof_text: string | null;
  status: SubmissionStatus;
  reviewed_by: string | null;
  review_note: string | null;
  awarded_activity_id: string | null;
  created_at: string;
  updated_at: string;
}

// ============ BINGO ============

export interface BingoEvent {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  bonus_row_points: number;
  bonus_blackout_points: number;
  cover_color: string;
  cover_emoji: string;
  created_at: string;
}

export interface BingoSquare {
  id: string;
  event_id: string;
  position: number;
  label: string;
  prompt: string | null;
  points: number;
  proof_type: ProofType;
}

export interface BingoClaim {
  id: string;
  event_id: string;
  square_id: string;
  employee_id: string;
  proof_url: string | null;
  proof_text: string | null;
  status: SubmissionStatus;
  reviewed_by: string | null;
  review_note: string | null;
  awarded_activity_id: string | null;
  created_at: string;
  updated_at: string;
}

// ============ SLOT MACHINE ============

export type SpinWinType = "jackpot" | "three_of_kind" | "pair" | "none";

export interface SpinBalance {
  employee_id: string;
  name: string;
  balance: number;
  total_earned: number;
  total_spent: number;
}

export interface SlotSpin {
  id: string;
  employee_id: string;
  reel_1: string;
  reel_2: string;
  reel_3: string;
  win_type: SpinWinType;
  win_label: string | null;
  payout_points: number;
  awarded_activity_id: string | null;
  created_at: string;
}

export interface SpinLedgerEntry {
  id: string;
  employee_id: string;
  delta: number;
  source: string;
  source_id: string | null;
  source_note: string | null;
  created_at: string;
}

export interface SlotPullResult {
  spin_id: string;
  reel_1: string;
  reel_2: string;
  reel_3: string;
  win_type: SpinWinType;
  win_label: string;
  payout_points: number;
  new_balance: number;
}
