import type {
  AgencyUser,
  PantryMetric,
  RegionSummary,
  FoodDesertZone,
  RequestedItem,
  DailyInteractionData,
  TimeSeriesDataPoint,
  CategoryBreakdown,
  ReportTemplate,
  GeneratedReport,
  DemographicsData,
  ThresholdAlert,
} from '../types';
import { createSeededRandom } from '../utils/seededRandom';

// ============================================
// Agency Users with Scoped Permissions
// ============================================

export const mockAgencyUsers: AgencyUser[] = [
  {
    id: 'ag_01',
    name: 'Dr. Patricia Hawkins',
    email: 'p.hawkins@uwriverregion.org',
    organization: 'United Way River Region',
    role: 'Executive Director',
    subscriptionTier: 'pro',
    region: 'Central Alabama River Region',
    assignedCounties: ['Montgomery', 'Autauga', 'Elmore', 'Lowndes', 'Macon', 'Dallas', 'Wilcox', 'Perry'],
    permissions: {
      canExport: true,
      canManageUsers: true,
      canConfigureAlerts: true,
    },
  },
  {
    id: 'ag_02',
    name: 'Marcus Coleman',
    email: 'm.coleman@usda.gov',
    organization: 'USDA Food & Nutrition Service',
    role: 'Regional Coordinator',
    subscriptionTier: 'pro',
    region: 'Alabama District 7',
    assignedCounties: ['Lowndes', 'Macon', 'Dallas', 'Wilcox', 'Perry'],
    permissions: {
      canExport: true,
      canManageUsers: false,
      canConfigureAlerts: true,
    },
  },
  {
    id: 'ag_03',
    name: 'Teresa Nguyen',
    email: 't.nguyen@cacaa.org',
    organization: 'Community Action Committee',
    role: 'Data Analyst',
    subscriptionTier: 'pro',
    region: 'River Region Counties',
    assignedCounties: ['Montgomery', 'Elmore'],
    permissions: {
      canExport: true,
      canManageUsers: false,
      canConfigureAlerts: false,
    },
  },
];

export const mockCurrentUser: AgencyUser = mockAgencyUsers[0];

// ============================================
// Region Summary (KPIs with Period Comparison)
// ============================================

export const mockRegionSummary: RegionSummary = {
  totalFamiliesServed: 14827,
  totalPantries: 8,
  activePantries: 7,
  totalItemsDistributed: 186420,
  avgFoodDesertScore: 42.3,
  totalAppDownloads: 3248,
  totalInteractions: 52840,
  periodLabel: 'Last 30 Days',
  familiesServedTrend: 12.4,
  itemsDistributedTrend: 8.7,
  interactionsTrend: 23.1,
  previousPeriodFamilies: 13190,
  previousPeriodItems: 171500,
};

// ============================================
// Demographics Data (Age, Household, Visitor Types, ZIP Codes)
// ============================================

export const mockDemographics: DemographicsData = {
  ageGroups: [
    { group: 'Children (0–17)', count: 5486, percentage: 37.0, color: '#6366f1' },
    { group: 'Adults (18–59)', count: 6227, percentage: 42.0, color: '#10b981' },
    { group: 'Seniors (60+)', count: 3114, percentage: 21.0, color: '#f59e0b' },
  ],
  householdSizes: [
    { size: '1-2 Persons', count: 3855, percentage: 26.0 },
    { size: '3-4 Persons', count: 6672, percentage: 45.0 },
    { size: '5-6 Persons', count: 3262, percentage: 22.0 },
    { size: '7+ Persons', count: 1038, percentage: 7.0 },
  ],
  visitorTypes: [
    { type: 'First-Time', count: 2817, percentage: 19.0, color: '#3b82f6' },
    { type: 'Repeat (Monthly)', count: 7414, percentage: 50.0, color: '#10b981' },
    { type: 'Repeat (Weekly)', count: 3262, percentage: 22.0, color: '#8b5cf6' },
    { type: 'Emergency', count: 1334, percentage: 9.0, color: '#ef4444' },
  ],
  zipCodeBreakdown: [
    { zip: '36104', community: 'Downtown Montgomery', county: 'Montgomery', familiesServed: 3240, growthRate: 14.8 },
    { zip: '36067', community: 'Prattville Central', county: 'Autauga', familiesServed: 2150, growthRate: 11.2 },
    { zip: '36092', community: 'Wetumpka East', county: 'Elmore', familiesServed: 1840, growthRate: 8.5 },
    { zip: '36040', community: 'Hayneville South', county: 'Lowndes', familiesServed: 1490, growthRate: 28.4 },
    { zip: '36083', community: 'Tuskegee North', county: 'Macon', familiesServed: 1380, growthRate: 19.1 },
    { zip: '36701', community: 'Selma Historic Center', county: 'Dallas', familiesServed: 1290, growthRate: 6.7 },
    { zip: '36054', community: 'Millbrook West', county: 'Elmore', familiesServed: 980, growthRate: -2.1 },
    { zip: '36116', community: 'East Montgomery', county: 'Montgomery', familiesServed: 2457, growthRate: 16.3 },
  ],
  ethnicityBreakdown: [
    { category: 'Black / African American', percentage: 56.4 },
    { category: 'White / Caucasian', percentage: 31.2 },
    { category: 'Hispanic / Latino', percentage: 7.8 },
    { category: 'Asian / Pacific Islander', percentage: 2.1 },
    { category: 'Other / Multi-Racial', percentage: 2.5 },
  ],
};

// ============================================
// Pantry Metrics (8 pantries across River Region)
// ============================================

export const mockPantryMetrics: PantryMetric[] = [
  {
    id: 'pm_01',
    name: 'Hope Community Food Pantry',
    county: 'Montgomery',
    address: '1428 Elmwood Drive',
    city: 'Montgomery',
    state: 'AL',
    zip: '36104',
    coordinates: { lat: 32.3668, lng: -86.3000 },
    type: 'Walk-in & Drive-thru',
    totalVisits: 4280,
    totalItemsDistributed: 52100,
    familiesServed: 3420,
    avgDailyVisits: 142,
    growthRate: 14.2,
    topItems: ['Canned Black Beans', 'Fresh Apples', 'Whole Milk'],
    isActive: true,
    lastUpdated: '10 minutes ago',
  },
  {
    id: 'pm_02',
    name: 'River Region Food Bank',
    county: 'Montgomery',
    address: '521 Trade Center St',
    city: 'Montgomery',
    state: 'AL',
    zip: '36116',
    coordinates: { lat: 32.3792, lng: -86.3077 },
    type: 'Walk-in',
    totalVisits: 3650,
    totalItemsDistributed: 44200,
    familiesServed: 2890,
    avgDailyVisits: 121,
    growthRate: 9.8,
    topItems: ['Rice (5lb bags)', 'Peanut Butter', 'Chicken Breasts'],
    isActive: true,
    lastUpdated: '25 minutes ago',
  },
  {
    id: 'pm_03',
    name: 'Prattville Community Cupboard',
    county: 'Autauga',
    address: '310 West Main St',
    city: 'Prattville',
    state: 'AL',
    zip: '36067',
    coordinates: { lat: 32.4640, lng: -86.4597 },
    type: 'Walk-in',
    totalVisits: 1890,
    totalItemsDistributed: 22800,
    familiesServed: 1560,
    avgDailyVisits: 63,
    growthRate: 18.5,
    topItems: ['Infant Formula', 'Diapers', 'Fresh Vegetables'],
    isActive: true,
    lastUpdated: '1 hour ago',
  },
  {
    id: 'pm_04',
    name: 'Wetumpka Sharing Center',
    county: 'Elmore',
    address: '408 South Main St',
    city: 'Wetumpka',
    state: 'AL',
    zip: '36092',
    coordinates: { lat: 32.5439, lng: -86.2117 },
    type: 'Walk-in & Drive-thru',
    totalVisits: 1420,
    totalItemsDistributed: 18900,
    familiesServed: 1180,
    avgDailyVisits: 47,
    growthRate: 7.3,
    topItems: ['Canned Soup', 'Bread', 'Eggs'],
    isActive: true,
    lastUpdated: '2 hours ago',
  },
  {
    id: 'pm_05',
    name: 'Lowndes County Mobile Pantry',
    county: 'Lowndes',
    address: 'Hayneville Courthouse Square',
    city: 'Hayneville',
    state: 'AL',
    zip: '36040',
    coordinates: { lat: 32.1835, lng: -86.5800 },
    type: 'Mobile Distribution',
    totalVisits: 890,
    totalItemsDistributed: 14200,
    familiesServed: 740,
    avgDailyVisits: 30,
    growthRate: 32.1,
    topItems: ['Fresh Produce Box', 'Canned Meat', 'Cooking Oil'],
    isActive: true,
    lastUpdated: '3 hours ago',
  },
  {
    id: 'pm_06',
    name: 'Tuskegee Area Food Ministry',
    county: 'Macon',
    address: '200 North Main St',
    city: 'Tuskegee',
    state: 'AL',
    zip: '36083',
    coordinates: { lat: 32.4302, lng: -85.6916 },
    type: 'Walk-in',
    totalVisits: 1180,
    totalItemsDistributed: 15800,
    familiesServed: 980,
    avgDailyVisits: 39,
    growthRate: 11.6,
    topItems: ['Rice', 'Canned Vegetables', 'Pasta'],
    isActive: true,
    lastUpdated: '45 minutes ago',
  },
  {
    id: 'pm_07',
    name: 'Selma Community Provisions',
    county: 'Dallas',
    address: '1015 Broad St',
    city: 'Selma',
    state: 'AL',
    zip: '36701',
    coordinates: { lat: 32.4074, lng: -87.0211 },
    type: 'Drive-thru',
    totalVisits: 1020,
    totalItemsDistributed: 12400,
    familiesServed: 850,
    avgDailyVisits: 34,
    growthRate: 5.2,
    topItems: ['Frozen Meals', 'Juice', 'Cereal'],
    isActive: true,
    lastUpdated: '1 hour ago',
  },
  {
    id: 'pm_08',
    name: 'Millbrook Mercy Center',
    county: 'Elmore',
    address: '3700 Main St',
    city: 'Millbrook',
    state: 'AL',
    zip: '36054',
    coordinates: { lat: 32.4779, lng: -86.3619 },
    type: 'Walk-in',
    totalVisits: 497,
    totalItemsDistributed: 6020,
    familiesServed: 407,
    avgDailyVisits: 17,
    growthRate: -3.2,
    topItems: ['Canned Beans', 'Toilet Paper', 'Soap'],
    isActive: false,
    lastUpdated: '3 days ago',
  },
];

// ============================================
// Food Desert Zones (Full Alabama Coverage with Lat/Lng & Relative Map Positions)
// ============================================

export const mockFoodDesertZones: FoodDesertZone[] = [
  // River Region (Primary Focus)
  {
    id: 'fd_01',
    county: 'Lowndes',
    population: 9726,
    foodAccessScore: 18,
    nearestPantryMiles: 14.2,
    groceryStoresCount: 1,
    medianIncome: 26840,
    percentBelowPoverty: 34.8,
    status: 'Critical',
    coordinates: { lat: 32.1835, lng: -86.5800 },
    zipCodes: ['36040', '36032', '36047'],
  },
  {
    id: 'fd_02',
    county: 'Macon',
    population: 18068,
    foodAccessScore: 24,
    nearestPantryMiles: 11.8,
    groceryStoresCount: 2,
    medianIncome: 28150,
    percentBelowPoverty: 31.2,
    status: 'Critical',
    coordinates: { lat: 32.4302, lng: -85.6916 },
    zipCodes: ['36083', '36089'],
  },
  {
    id: 'fd_03',
    county: 'Dallas',
    population: 38462,
    foodAccessScore: 31,
    nearestPantryMiles: 8.4,
    groceryStoresCount: 4,
    medianIncome: 29680,
    percentBelowPoverty: 28.6,
    status: 'At Risk',
    coordinates: { lat: 32.4074, lng: -87.0211 },
    zipCodes: ['36701', '36703'],
  },
  {
    id: 'fd_04',
    county: 'Montgomery',
    population: 228954,
    foodAccessScore: 58,
    nearestPantryMiles: 3.2,
    groceryStoresCount: 28,
    medianIncome: 46720,
    percentBelowPoverty: 19.4,
    status: 'Moderate',
    coordinates: { lat: 32.3668, lng: -86.3000 },
    zipCodes: ['36104', '36116', '36108'],
  },
  {
    id: 'fd_05',
    county: 'Autauga',
    population: 58805,
    foodAccessScore: 62,
    nearestPantryMiles: 4.8,
    groceryStoresCount: 8,
    medianIncome: 54210,
    percentBelowPoverty: 12.8,
    status: 'Moderate',
    coordinates: { lat: 32.4640, lng: -86.4597 },
    zipCodes: ['36067', '36066'],
  },
  {
    id: 'fd_06',
    county: 'Elmore',
    population: 87977,
    foodAccessScore: 71,
    nearestPantryMiles: 5.1,
    groceryStoresCount: 12,
    medianIncome: 58400,
    percentBelowPoverty: 10.2,
    status: 'Adequate',
    coordinates: { lat: 32.5439, lng: -86.2117 },
    zipCodes: ['36092', '36054'],
  },
  // Additional Black Belt / State Reference Counties
  {
    id: 'fd_07',
    county: 'Wilcox',
    population: 10350,
    foodAccessScore: 14,
    nearestPantryMiles: 16.5,
    groceryStoresCount: 1,
    medianIncome: 24100,
    percentBelowPoverty: 38.2,
    status: 'Critical',
    coordinates: { lat: 31.9863, lng: -87.3105 },
    zipCodes: ['36726', '36769'],
  },
  {
    id: 'fd_08',
    county: 'Perry',
    population: 8520,
    foodAccessScore: 19,
    nearestPantryMiles: 13.8,
    groceryStoresCount: 1,
    medianIncome: 25400,
    percentBelowPoverty: 35.1,
    status: 'Critical',
    coordinates: { lat: 32.6371, lng: -87.2917 },
    zipCodes: ['36756', '36793'],
  },
  {
    id: 'fd_09',
    county: 'Jefferson',
    population: 674721,
    foodAccessScore: 54,
    nearestPantryMiles: 2.8,
    groceryStoresCount: 65,
    medianIncome: 55800,
    percentBelowPoverty: 16.1,
    status: 'Moderate',
    coordinates: { lat: 33.5186, lng: -86.8104 },
    zipCodes: ['35203', '35205'],
  },
  {
    id: 'fd_10',
    county: 'Madison',
    population: 388153,
    foodAccessScore: 79,
    nearestPantryMiles: 2.1,
    groceryStoresCount: 48,
    medianIncome: 71200,
    percentBelowPoverty: 11.4,
    status: 'Adequate',
    coordinates: { lat: 34.7304, lng: -86.5861 },
    zipCodes: ['35801', '35806'],
  },
  {
    id: 'fd_11',
    county: 'Mobile',
    population: 414254,
    foodAccessScore: 61,
    nearestPantryMiles: 3.5,
    groceryStoresCount: 42,
    medianIncome: 49500,
    percentBelowPoverty: 18.9,
    status: 'Moderate',
    coordinates: { lat: 30.6954, lng: -88.0399 },
    zipCodes: ['36602', '36608'],
  },
  {
    id: 'fd_12',
    county: 'Houston',
    population: 107202,
    foodAccessScore: 36,
    nearestPantryMiles: 7.2,
    groceryStoresCount: 14,
    medianIncome: 45100,
    percentBelowPoverty: 22.4,
    status: 'At Risk',
    coordinates: { lat: 31.2232, lng: -85.4023 },
    zipCodes: ['36301', '36303'],
  },
];

// ============================================
// Most Requested Items (25+)
// ============================================

export const mockRequestedItems: RequestedItem[] = [
  { id: 'ri_01', name: 'Canned Black Beans (15oz)', category: 'Canned Goods', requestCount: 4820, trend: 'rising', trendPercentage: 18.3, weeklyData: [580, 620, 710, 690, 740, 760, 720], lastRequested: '12 min ago' },
  { id: 'ri_02', name: 'Whole Milk (1 gallon)', category: 'Dairy & Refrigerated', requestCount: 4210, trend: 'rising', trendPercentage: 22.1, weeklyData: [480, 520, 590, 610, 640, 680, 690], lastRequested: '8 min ago' },
  { id: 'ri_03', name: 'Fresh Apples & Pears', category: 'Fresh Produce', requestCount: 3890, trend: 'rising', trendPercentage: 15.7, weeklyData: [420, 480, 530, 560, 580, 620, 600], lastRequested: '22 min ago' },
  { id: 'ri_04', name: 'Frozen Chicken Breasts (2lb)', category: 'Proteins & Meat', requestCount: 3670, trend: 'rising', trendPercentage: 28.4, weeklyData: [350, 410, 480, 520, 560, 610, 640], lastRequested: '5 min ago' },
  { id: 'ri_05', name: 'Peanut Butter (16oz)', category: 'Canned Goods', requestCount: 3420, trend: 'steady', trendPercentage: 2.1, weeklyData: [490, 480, 500, 495, 488, 510, 492], lastRequested: '15 min ago' },
  { id: 'ri_06', name: 'White Rice (5lb bag)', category: 'Bakery & Grains', requestCount: 3180, trend: 'rising', trendPercentage: 11.2, weeklyData: [380, 410, 440, 460, 470, 500, 520], lastRequested: '30 min ago' },
  { id: 'ri_07', name: 'Infant Formula (Stage 1)', category: 'Baby & Hygiene', requestCount: 2940, trend: 'rising', trendPercentage: 34.6, weeklyData: [280, 340, 380, 420, 460, 510, 550], lastRequested: '3 min ago' },
  { id: 'ri_08', name: 'Eggs (1 dozen)', category: 'Dairy & Refrigerated', requestCount: 2810, trend: 'steady', trendPercentage: 4.3, weeklyData: [400, 395, 410, 405, 390, 415, 395], lastRequested: '18 min ago' },
  { id: 'ri_09', name: 'Canned Tuna (5oz)', category: 'Proteins & Meat', requestCount: 2650, trend: 'declining', trendPercentage: -5.8, weeklyData: [420, 400, 390, 380, 370, 355, 335], lastRequested: '45 min ago' },
  { id: 'ri_10', name: 'Whole Wheat Bread', category: 'Bakery & Grains', requestCount: 2480, trend: 'steady', trendPercentage: 1.4, weeklyData: [350, 358, 345, 360, 352, 365, 350], lastRequested: '20 min ago' },
  { id: 'ri_11', name: 'Diapers (Size 3-5)', category: 'Baby & Hygiene', requestCount: 2320, trend: 'rising', trendPercentage: 19.8, weeklyData: [260, 290, 310, 330, 350, 380, 400], lastRequested: '10 min ago' },
  { id: 'ri_12', name: 'Fresh Sweet Corn', category: 'Fresh Produce', requestCount: 2190, trend: 'rising', trendPercentage: 42.3, weeklyData: [180, 240, 280, 310, 350, 400, 430], lastRequested: '1 hr ago' },
  { id: 'ri_13', name: 'Canned Soup (Chicken Noodle)', category: 'Canned Goods', requestCount: 2080, trend: 'steady', trendPercentage: -0.8, weeklyData: [300, 295, 305, 298, 290, 302, 290], lastRequested: '35 min ago' },
  { id: 'ri_14', name: 'Ground Beef (1lb)', category: 'Proteins & Meat', requestCount: 1960, trend: 'rising', trendPercentage: 16.9, weeklyData: [220, 250, 270, 290, 300, 320, 310], lastRequested: '40 min ago' },
  { id: 'ri_15', name: 'Fresh Tomatoes', category: 'Fresh Produce', requestCount: 1840, trend: 'rising', trendPercentage: 38.2, weeklyData: [150, 200, 240, 260, 290, 330, 370], lastRequested: '55 min ago' },
  { id: 'ri_16', name: 'Vegetable Cooking Oil (48oz)', category: 'Canned Goods', requestCount: 1720, trend: 'steady', trendPercentage: 3.5, weeklyData: [240, 248, 250, 245, 242, 255, 240], lastRequested: '1 hr ago' },
  { id: 'ri_17', name: 'Pasta (Spaghetti 16oz)', category: 'Bakery & Grains', requestCount: 1650, trend: 'declining', trendPercentage: -8.2, weeklyData: [280, 260, 250, 240, 230, 210, 180], lastRequested: '2 hrs ago' },
  { id: 'ri_18', name: 'Orange Juice (64oz)', category: 'Beverages', requestCount: 1580, trend: 'steady', trendPercentage: 1.9, weeklyData: [225, 228, 220, 232, 225, 230, 220], lastRequested: '1 hr ago' },
  { id: 'ri_19', name: 'Toilet Paper (4-pack)', category: 'Baby & Hygiene', requestCount: 1490, trend: 'rising', trendPercentage: 12.4, weeklyData: [180, 190, 200, 210, 220, 240, 250], lastRequested: '25 min ago' },
  { id: 'ri_20', name: 'Canned Corn (15oz)', category: 'Canned Goods', requestCount: 1380, trend: 'declining', trendPercentage: -3.1, weeklyData: [210, 205, 200, 198, 190, 195, 182], lastRequested: '2 hrs ago' },
  { id: 'ri_21', name: 'Breakfast Cereal (Family Size)', category: 'Bakery & Grains', requestCount: 1260, trend: 'steady', trendPercentage: 0.6, weeklyData: [180, 178, 182, 180, 179, 183, 178], lastRequested: '3 hrs ago' },
  { id: 'ri_22', name: 'Fresh Peaches', category: 'Fresh Produce', requestCount: 1140, trend: 'rising', trendPercentage: 56.8, weeklyData: [80, 110, 140, 160, 190, 220, 240], lastRequested: '1 hr ago' },
  { id: 'ri_23', name: 'Baby Wipes (80ct)', category: 'Baby & Hygiene', requestCount: 1050, trend: 'rising', trendPercentage: 14.2, weeklyData: [120, 130, 140, 148, 155, 170, 187], lastRequested: '30 min ago' },
  { id: 'ri_24', name: 'Hot Prepared Soup Kits', category: 'Prepared Meals', requestCount: 980, trend: 'rising', trendPercentage: 21.5, weeklyData: [100, 120, 130, 140, 150, 170, 170], lastRequested: '2 hrs ago' },
  { id: 'ri_25', name: 'Bottled Water (24-pack)', category: 'Beverages', requestCount: 920, trend: 'steady', trendPercentage: 2.8, weeklyData: [130, 132, 128, 135, 130, 133, 132], lastRequested: '4 hrs ago' },
];

// ============================================
// Daily Interaction Data (30 days)
// ============================================

function generateDailyInteractions(): DailyInteractionData[] {
  const random = createSeededRandom(20260811);
  const data: DailyInteractionData[] = [];
  const startDate = new Date('2026-07-12');

  for (let i = 0; i < 30; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const baseFactor = isWeekend ? 0.6 : 1.0;
    const trendFactor = 1 + (i / 30) * 0.15;
    const noise = 0.85 + random() * 0.3;

    const checkIns = Math.round(180 * baseFactor * trendFactor * noise);
    const itemScans = Math.round(320 * baseFactor * trendFactor * noise);
    const notificationViews = Math.round(450 * baseFactor * trendFactor * (0.8 + random() * 0.4));
    const searches = Math.round(95 * baseFactor * trendFactor * noise);
    const directions = Math.round(65 * baseFactor * trendFactor * noise);

    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      checkIns,
      itemScans,
      notificationViews,
      searches,
      directions,
      total: checkIns + itemScans + notificationViews + searches + directions,
    });
  }
  return data;
}

export const mockDailyInteractions = generateDailyInteractions();

// ============================================
// Families Served Time Series with Period Comparison (30 days)
// ============================================

function generateFamiliesServedTimeSeries(): TimeSeriesDataPoint[] {
  const random = createSeededRandom(48271);
  const data: TimeSeriesDataPoint[] = [];
  const startDate = new Date('2026-07-12');

  for (let i = 0; i < 30; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const base = isWeekend ? 320 : 480;
    const trend = 1 + (i / 30) * 0.12;
    const noise = 0.88 + random() * 0.24;

    const currentVal = Math.round(base * trend * noise);
    const prevVal = Math.round(base * (trend - 0.1) * (noise * 0.95));

    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: currentVal,
      previousValue: prevVal,
    });
  }
  return data;
}

export const mockFamiliesServedSeries = generateFamiliesServedTimeSeries();

// ============================================
// Threshold Alerts
// ============================================

export const mockThresholdAlerts: ThresholdAlert[] = [
  {
    id: 'alt_01',
    metric: 'Food Access Score',
    countyOrPantry: 'Lowndes County',
    condition: 'less_than',
    thresholdValue: 20,
    notifyEmail: 'p.hawkins@uwriverregion.org',
    isTriggered: true,
    lastTriggered: '2 days ago',
  },
  {
    id: 'alt_02',
    metric: 'Active Status',
    countyOrPantry: 'Millbrook Mercy Center',
    condition: 'status_change',
    thresholdValue: 'Inactive > 48 hrs',
    notifyEmail: 'p.hawkins@uwriverregion.org',
    isTriggered: true,
    lastTriggered: '3 days ago',
  },
  {
    id: 'alt_03',
    metric: 'Demand Spike',
    countyOrPantry: 'Infant Formula (Stage 1)',
    condition: 'greater_than',
    thresholdValue: '+30% weekly',
    notifyEmail: 'm.coleman@usda.gov',
    isTriggered: true,
    lastTriggered: '1 day ago',
  },
];

// ============================================
// Category Breakdown for Charts
// ============================================

export const mockCategoryBreakdown: CategoryBreakdown[] = [
  { category: 'Canned Goods', value: 42800, color: '#10b981' },
  { category: 'Fresh Produce', value: 35200, color: '#6366f1' },
  { category: 'Proteins & Meat', value: 28600, color: '#f59e0b' },
  { category: 'Dairy & Refrigerated', value: 24100, color: '#3b82f6' },
  { category: 'Bakery & Grains', value: 21400, color: '#ec4899' },
  { category: 'Baby & Hygiene', value: 18200, color: '#8b5cf6' },
  { category: 'Beverages', value: 9800, color: '#14b8a6' },
  { category: 'Prepared Meals', value: 6320, color: '#f97316' },
];

export const mockDistributionByType: CategoryBreakdown[] = [
  { category: 'Walk-in', value: 42, color: '#10b981' },
  { category: 'Drive-thru', value: 28, color: '#6366f1' },
  { category: 'Walk-in & Drive-thru', value: 22, color: '#3b82f6' },
  { category: 'Mobile Distribution', value: 8, color: '#f59e0b' },
];

// ============================================
// Report Templates & Generated Reports (Clean Vector Icons)
// ============================================

export const mockReportTemplates: ReportTemplate[] = [
  {
    id: 'rpt_01',
    name: 'Monthly Community Impact Summary',
    description: 'Comprehensive overview of families served, items distributed, and pantry performance across the entire region.',
    category: 'Monthly',
    icon: 'bar-chart',
    lastGenerated: 'Aug 1, 2026',
  },
  {
    id: 'rpt_02',
    name: 'Food Desert Assessment Report',
    description: 'Detailed analysis of food access scores, poverty rates, and grocery store density by county.',
    category: 'Quarterly',
    icon: 'map-pin',
    lastGenerated: 'Jul 1, 2026',
  },
  {
    id: 'rpt_03',
    name: 'Pantry Performance Scorecard',
    description: 'Individual pantry metrics including visit trends, item distribution volumes, and growth rates.',
    category: 'Monthly',
    icon: 'store',
    lastGenerated: 'Aug 1, 2026',
  },
  {
    id: 'rpt_04',
    name: 'Item Demand & Inventory Intelligence',
    description: 'Most-requested items, demand trends, and supply gap analysis across all partner pantries.',
    category: 'Monthly',
    icon: 'package',
    lastGenerated: 'Aug 5, 2026',
  },
  {
    id: 'rpt_05',
    name: 'Quarterly Grant Impact Report',
    description: 'Formatted for grant reporting — includes all required metrics for United Way and USDA submissions.',
    category: 'Quarterly',
    icon: 'file-text',
    lastGenerated: 'Jul 1, 2026',
  },
  {
    id: 'rpt_06',
    name: 'Custom Date Range Analysis',
    description: 'Build a custom report for any date range with selected metrics and pantry filters.',
    category: 'Custom',
    icon: 'sliders',
  },
];

export const mockGeneratedReports: GeneratedReport[] = [
  { id: 'gen_01', name: 'Monthly Impact Summary — July 2026', templateId: 'rpt_01', dateRange: 'Jul 1–31, 2026', generatedAt: 'Aug 1, 2026 at 9:00 AM', status: 'ready', fileSize: '2.4 MB' },
  { id: 'gen_02', name: 'Food Desert Assessment — Q2 2026', templateId: 'rpt_02', dateRange: 'Apr 1–Jun 30, 2026', generatedAt: 'Jul 1, 2026 at 8:30 AM', status: 'ready', fileSize: '3.8 MB' },
  { id: 'gen_03', name: 'Pantry Scorecard — July 2026', templateId: 'rpt_03', dateRange: 'Jul 1–31, 2026', generatedAt: 'Aug 1, 2026 at 9:15 AM', status: 'ready', fileSize: '1.9 MB' },
  { id: 'gen_04', name: 'Item Demand Report — August W1', templateId: 'rpt_04', dateRange: 'Aug 1–7, 2026', generatedAt: 'Aug 5, 2026 at 10:00 AM', status: 'ready', fileSize: '1.2 MB' },
  { id: 'gen_05', name: 'Grant Impact — Q2 2026 (United Way)', templateId: 'rpt_05', dateRange: 'Apr 1–Jun 30, 2026', generatedAt: 'Jul 1, 2026 at 11:00 AM', status: 'ready', fileSize: '4.1 MB' },
];
