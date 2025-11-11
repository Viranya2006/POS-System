import React, { useContext } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { AppContext } from '../App'
import { Button } from './ui/button'
import { canAccessMenu, getRoleDisplayName } from '../lib/permissions'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  TruckIcon,
  Users,
  Building2,
  Wrench,
  Shield,
  BarChart3,
  Settings,
  UserCog,
  RefreshCw,
  Info,
  LogOut,
  Sun,
  Moon,
  Wifi,
  WifiOff,
  Menu,
  X,
  DollarSign
} from 'lucide-react'

const Layout = ({ children }) => {
  const { user, userData, theme, toggleTheme, isOnline, syncStatus } = useContext(AppContext)
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  const handleLogout = async () => {
    try {
      await signOut(auth)
      navigate('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/sales', icon: ShoppingCart, label: 'Sales' },
    { path: '/inventory', icon: Package, label: 'Inventory' },
    { path: '/grn', icon: TruckIcon, label: 'GRN' },
    { path: '/customers', icon: Users, label: 'Customers' },
    { path: '/suppliers', icon: Building2, label: 'Suppliers' },
    { path: '/job-notes', icon: Wrench, label: 'Job Notes' },
    { path: '/warranty', icon: Shield, label: 'Warranty' },
    { path: '/reports', icon: BarChart3, label: 'Reports' },
    { path: '/cash-flow', icon: DollarSign, label: 'Cash Flow' },
    { path: '/settings', icon: Settings, label: 'Settings' },
    { path: '/users', icon: UserCog, label: 'Users' },
    { path: '/sync', icon: RefreshCw, label: 'Sync Center' },
    { path: '/about', icon: Info, label: 'About' },
  ]

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter(item => {
    // If no userData, check if user email contains admin (fallback)
    if (!userData) {
      const userEmail = user?.email?.toLowerCase() || ''
      if (userEmail.includes('admin@')) {
        return true // Admin emails get all menu items as fallback
      }
      return false
    }
    
    // Check access based on role
    return canAccessMenu(userData, item.label)
  })
  
  // Get user role display name
  const userRoleDisplay = userData 
    ? getRoleDisplayName(userData.role) 
    : (user?.email?.toLowerCase().includes('admin@') ? 'Administrator' : 'User')

  const getSyncStatusColor = () => {
    switch (syncStatus) {
      case 'syncing': return 'text-yellow-500'
      case 'offline': return 'text-red-500'
      default: return 'text-green-500'
    }
  }

  const getSyncStatusText = () => {
    switch (syncStatus) {
      case 'syncing': return 'Syncing...'
      case 'offline': return 'Offline'
      default: return 'Online'
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col`}>
        
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">SP</span>
            </div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">ShopPOS</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation Menu - No scrollbar, fits all items */}
        <nav className="flex-1 px-2 py-2 space-y-1 flex flex-col min-h-0">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors duration-200 text-sm ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-r-2 border-blue-600'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium truncate">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-2 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
            {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            <span className={getSyncStatusColor()}>{getSyncStatusText()}</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0 min-w-0">
        {/* Top Bar */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center justify-between px-6 py-3">
            {/* Left side - Mobile menu button */}
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              {/* Breadcrumb or page title */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white capitalize">
                  {location.pathname.replace('/', '').replace('-', ' ') || 'Dashboard'}
                </h2>
              </div>
            </div>

            {/* Right side - User info and controls */}
            <div className="flex items-center space-x-4">
              {/* Theme toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </Button>

              {/* User info */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {userData?.name || user?.email || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {userRoleDisplay}
                  </p>
                </div>
                
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {(user?.email || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Logout button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 min-h-0">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}

export default Layout
