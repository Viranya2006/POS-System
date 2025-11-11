// Permission checking utility
import { dbService } from './database'

// Define role-based permissions
export const rolePermissions = {
  'staff': ['sales'], // Staff can only access Sales
  'cashier': ['sales', 'customers'], // Cashier can access Sales and Customers
  'manager': ['sales', 'customers', 'inventory', 'reports'], // Manager can access Sales, Customers, Inventory, Reports
  'admin': ['sales', 'customers', 'inventory', 'reports', 'settings', 'users'] // Admin has access to everything
}

// Map routes to feature keys
export const routeFeatures = {
  '/dashboard': 'sales', // Dashboard accessible if sales permission
  '/sales': 'sales',
  '/inventory': 'inventory',
  '/grn': 'inventory', // GRN requires inventory permission
  '/customers': 'customers',
  '/suppliers': 'inventory', // Suppliers management requires inventory
  '/job-notes': 'customers', // Job notes requires customers permission
  '/warranty': 'customers', // Warranty requires customers permission
  '/reports': 'reports',
  '/cash-flow': 'reports', // Cash flow requires reports permission
  '/settings': 'settings',
  '/users': 'users',
  '/sync': 'settings', // Sync requires settings permission
  '/about': 'sales' // About accessible to all logged in users
}

// Map menu items to feature keys
export const menuFeatures = {
  'Dashboard': 'sales',
  'Sales': 'sales',
  'Inventory': 'inventory',
  'GRN': 'inventory',
  'Customers': 'customers',
  'Suppliers': 'inventory',
  'Job Notes': 'customers',
  'Warranty': 'customers',
  'Reports': 'reports',
  'Cash Flow': 'reports',
  'Settings': 'settings',
  'Users': 'users',
  'Sync Center': 'settings',
  'About': 'sales'
}

/**
 * Check if user has access to a specific feature based on their role
 * @param {string} userRole - User role (staff, cashier, manager, admin)
 * @param {string} feature - Feature key to check (sales, customers, inventory, reports, settings, users)
 * @returns {boolean} - True if user has access to the feature
 */
export function hasFeatureAccess(userRole, feature) {
  if (!userRole) return false
  
  const role = userRole.toLowerCase()
  
  // Admin always has access to everything
  if (role === 'admin') {
    return true
  }
  
  // Get allowed features for this role
  const allowedFeatures = rolePermissions[role] || []
  
  // Check if the requested feature is in the allowed list
  return allowedFeatures.includes(feature)
}

/**
 * Check if user can access a route based on their role
 * @param {Object} userData - User data object with role property
 * @param {string} route - Route path
 * @returns {boolean} - True if user can access route
 */
export function canAccessRoute(userData, route) {
  if (!userData) return false
  
  const userRole = (userData.role || '').toLowerCase()
  
  // Admin always has access to everything
  if (userRole === 'admin') {
    return true
  }
  
  // Get required feature for this route
  const requiredFeature = routeFeatures[route]
  if (!requiredFeature) return true // Unknown routes are accessible
  
  // Check if user's role has access to this feature
  return hasFeatureAccess(userRole, requiredFeature)
}

/**
 * Check if user can access a menu item based on their role
 * @param {Object} userData - User data object with role property
 * @param {string} menuLabel - Menu item label
 * @returns {boolean} - True if user can access menu item
 */
export function canAccessMenu(userData, menuLabel) {
  if (!userData) return false
  
  const userRole = (userData.role || '').toLowerCase()
  
  // Admin always has access to everything
  if (userRole === 'admin') {
    return true
  }
  
  // Get required feature for this menu item
  const requiredFeature = menuFeatures[menuLabel]
  if (!requiredFeature) return true // Unknown menu items are accessible
  
  // Check if user's role has access to this feature
  return hasFeatureAccess(userRole, requiredFeature)
}

/**
 * Get current user data from database including permissions
 * @param {string} email - User email
 * @returns {Promise<Object|null>} - User object with permissions or null
 */
export async function getCurrentUserData(email) {
  try {
    if (!email) {
      console.warn('No email provided to getCurrentUserData')
      return null
    }
    
    const normalizedEmail = email.toLowerCase()
    
    const users = await dbService.readAll('users')
    
    const user = users.find(u => {
      const userEmail = (u.email || '').toLowerCase()
      return userEmail === normalizedEmail
    })
    
    if (!user) {
      console.warn('User not found in database:', normalizedEmail)
      return null
    }
    
    // Normalize role to lowercase for consistent checking
    const role = (user.role || 'staff').toLowerCase()
    
    // Return user data with role (permissions are now role-based, not stored)
    const userData = {
      ...user,
      role: role
    }
    
    return userData
  } catch (error) {
    console.error('Error getting current user data:', error)
    return null
  }
}

/**
 * Get user role display name
 * @param {string} role - User role
 * @returns {string} - Display name
 */
export function getRoleDisplayName(role) {
  const roleMap = {
    'admin': 'Administrator',
    'manager': 'Manager',
    'cashier': 'Cashier',
    'staff': 'Staff'
  }
  return roleMap[role] || role || 'Staff'
}

