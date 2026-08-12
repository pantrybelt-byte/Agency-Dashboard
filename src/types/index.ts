// ============================================
// AccessBelt Analytical Dashboard — Type Definitions
// ============================================

export type UserRole = 'Executive Director' | 'Regional Coordinator' | 'Data Analyst' | 'Field Inspector';
export type SubscriptionTier = 'community' | 'pro' | 'enterprise';

export interface AgencyUser {
  id: string;
  name: string;
  email: string;
  organization: string;
  role: UserRole;
  subscriptionTier?: SubscriptionTier;
  avatarUrl?: string;
  region: string;
  assignedCounties: string[];
  permissions: {
    canExport: boolean;
    canManageUsers: boolean;
    canConfigureAlerts: boolean;
  };
}

export interface DemographicsData {
  ageGroups: { group: string; count: number; percentage: number; color: string }[];
  householdSizes: { size: string; count: number; percentage: number }[];
  visitorTypes: { type: 'First-Time' | 'Repeat (Monthly)' | 'Repeat (Weekly)' | 'Emergency'; count: number; percentage: number; color: string }[];
  zipCodeBreakdown: { zip: string; community: string; county: string; familiesServed: number; growthRate: number }[];
  ethnicityBreakdown: { category: string; percentage: number }[];
}

export interface PantryMetric {
  id: string;
  name: string;
  county: string;
  address: string;
  city: string;
  state: string;
  zip?: string;
  coordinates: { lat: number; lng: number };
  type: 'Walk-in' | 'Drive-thru' | 'Mobile Distribution' | 'Walk-in & Drive-thru';
  totalVisits: number;
  totalItemsDistributed: number;
  familiesServed: number;
  avgDailyVisits: number;
  growthRate: number; // percentage
  topItems: string[];
  isActive: boolean;
  lastUpdated: string;
}

export interface RegionSummary {
  totalFamiliesServed: number;
  totalPantries: number;
  activePantries: number;
  totalItemsDistributed: number;
  avgFoodDesertScore: number;
  totalAppDownloads: number;
  totalInteractions: number;
  periodLabel: string;
  familiesServedTrend: number; // percentage change
  itemsDistributedTrend: number;
  interactionsTrend: number;
  previousPeriodFamilies?: number;
  previousPeriodItems?: number;
}

export interface FoodDesertZone {
  id: string;
  county: string;
  population: number;
  foodAccessScore: number; // 0-100, lower = worse access
  nearestPantryMiles: number;
  groceryStoresCount: number;
  medianIncome: number;
  percentBelowPoverty: number;
  status: 'Critical' | 'At Risk' | 'Moderate' | 'Adequate';
  coordinates: { lat: number; lng: number };
  zipCodes: string[];
}

export interface RequestedItem {
  id: string;
  name: string;
  category: 'Proteins & Meat' | 'Fresh Produce' | 'Canned Goods' | 'Dairy & Refrigerated' | 'Bakery & Grains' | 'Baby & Hygiene' | 'Prepared Meals' | 'Beverages';
  requestCount: number;
  trend: 'rising' | 'steady' | 'declining';
  trendPercentage: number;
  weeklyData: number[]; // last 7 days sparkline data
  lastRequested: string;
}

export interface InteractionEvent {
  id: string;
  timestamp: string;
  pantryId: string;
  pantryName: string;
  eventType: 'check-in' | 'item-scan' | 'notification-view' | 'search' | 'directions';
  county: string;
}

export interface DailyInteractionData {
  date: string;
  checkIns: number;
  itemScans: number;
  notificationViews: number;
  searches: number;
  directions: number;
  total: number;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'Monthly' | 'Quarterly' | 'Custom';
  icon: string;
  lastGenerated?: string;
  isProOnly?: boolean;
}

export interface GeneratedReport {
  id: string;
  name: string;
  templateId: string;
  dateRange: string;
  generatedAt: string;
  status: 'ready' | 'generating' | 'failed';
  fileSize: string;
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  previousValue?: number;
  label?: string;
}

export interface CategoryBreakdown {
  category: string;
  value: number;
  color: string;
}

export interface ThresholdAlert {
  id: string;
  metric: string;
  countyOrPantry: string;
  condition: 'less_than' | 'greater_than' | 'status_change';
  thresholdValue: number | string;
  notifyEmail: string;
  isTriggered: boolean;
  lastTriggered?: string;
}

export type ReportFrequency = 'weekly' | 'monthly' | 'quarterly';
export type ReportFormat = 'csv' | 'pdf';

export interface ScheduledReport {
  id: string;
  templateId: string;
  templateName: string;
  frequency: ReportFrequency;
  format: ReportFormat;
  sendOnDay: number;
  recipients: string[];
  countyScope: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  nextRunAt: string;
  lastRunAt?: string;
}

export type DemographicSegment = 'all' | 'children' | 'seniors' | 'first-time' | 'emergency';
export type DateRangePreset = '7d' | '30d' | '90d' | 'ytd' | 'custom';

export interface CustomDateRange {
  startDate: string;
  endDate: string;
}
