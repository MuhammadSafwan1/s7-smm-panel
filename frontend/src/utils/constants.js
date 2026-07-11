export const ACCOUNT_STATUS = {
  AVAILABLE: 'available',
  SOLD: 'sold',
  PENDING: 'pending',
};

export const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
};

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

export const ACCOUNT_TYPES = [
  { value: 'standard', label: 'Standard' },
  { value: 'premium', label: 'Premium' },
  { value: 'vip', label: 'VIP' },
  { value: 'ranked', label: 'Ranked' },
];

export const SEASONS = [
  { value: 'season1', label: 'Season 1' },
  { value: 'season2', label: 'Season 2' },
  { value: 'season3', label: 'Season 3' },
  { value: 'season4', label: 'Season 4' },
  { value: 'season5', label: 'Season 5' },
  { value: 'season6', label: 'Season 6' },
  { value: 'season7', label: 'Season 7' },
  { value: 'season8', label: 'Season 8' },
  { value: 'season9', label: 'Season 9' },
  { value: 'season10', label: 'Season 10' },
];

export const RANKS = [
  { value: 'bronze', label: 'Bronze' },
  { value: 'silver', label: 'Silver' },
  { value: 'gold', label: 'Gold' },
  { value: 'platinum', label: 'Platinum' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'heroic', label: 'Heroic' },
  { value: 'grandmaster', label: 'Grandmaster' },
];

export const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/accounts', label: 'Browse Accounts' },
];

export const DASHBOARD_LINKS = [
  { href: '/dashboard', label: 'Overview', icon: 'FiGrid' },
  { href: '/dashboard/orders', label: 'My Orders', icon: 'FiPackage' },
  { href: '/dashboard/settings', label: 'Settings', icon: 'FiSettings' },
];

export const ADMIN_LINKS = [
  { href: '/admin', label: 'Dashboard', icon: 'FiGrid' },
  { href: '/admin/accounts', label: 'Accounts', icon: 'FiServer' },
  { href: '/admin/orders', label: 'Orders', icon: 'FiPackage' },
  { href: '/admin/users', label: 'Users', icon: 'FiUsers' },
  { href: '/admin/categories', label: 'Categories', icon: 'FiFolder' },
];