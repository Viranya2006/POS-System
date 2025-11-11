import React, { useState, useEffect, Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './lib/firebase'
import { dbService, downloadFromFirebase } from './lib/database'
import { getCurrentUserData } from './lib/permissions'
import ProtectedRoute from './components/ProtectedRoute'

// Layout Components
import Layout from './components/Layout'
import LoginPage from './modules/auth/LoginPage'
import ErrorBoundary from './components/ErrorBoundary'

// Loading component for lazy loaded routes
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
      <p className="text-gray-600 dark:text-gray-400">Loading...</p>
    </div>
  </div>
)

// Lazy load modules for better performance on low-spec PCs

const Dashboard = lazy(() => import('./modules/dashboard/Dashboard'))
const Sales = lazy(() => import('./modules/sales/Sales'))
const Inventory = lazy(() => import('./modules/inventory/Inventory'))
const GRN = lazy(() => import('./modules/grn/GRN'))
const Customers = lazy(() => import('./modules/customers/Customers'))
const Suppliers = lazy(() => import('./modules/suppliers/Suppliers'))
const JobNotes = lazy(() => import('./modules/jobNotes/JobNotes'))
const Warranty = lazy(() => import('./modules/warranty/Warranty'))
const Reports = lazy(() => import('./modules/reports/Reports'))
const Settings = lazy(() => import('./modules/settings/Settings'))
const UserManagement = lazy(() => import('./modules/users/UserManagement'))
const SyncCenter = lazy(() => import('./modules/sync/SyncCenter'))
const CashFlow = lazy(() => import('./modules/cashFlow/CashFlow'))
const About = lazy(() => import('./modules/about/About'))

// Context for global state
export const AppContext = React.createContext()

function App() {
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null) // User data from database including permissions
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState('light')
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [syncStatus, setSyncStatus] = useState('idle')

  useEffect(() => {
    // Initialize theme from localStorage
    const savedTheme = localStorage.getItem('shoppos-theme') || 'light'
    setTheme(savedTheme)
    document.documentElement.classList.toggle('dark', savedTheme === 'dark')

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Check if we're in the process of creating a user - don't check or redirect if so
      const creatingUser = sessionStorage.getItem('creatingUser')
      const adminEmail = sessionStorage.getItem('adminEmail')
      
      // If creating a user, skip all auth checks and don't update state
      // This prevents redirects while user creation is in progress
      if (creatingUser) {
        console.log('⚠️ User creation in progress, skipping auth state check')
        
        // If admin was logged out and we're not authenticated, don't update state yet
        // Wait for the user creation process to complete
        if (!firebaseUser && adminEmail) {
          console.log('⚠️ Admin logged out during user creation, waiting for completion...')
          return
        }
        
        // If user creation completed but we're still showing the flag, 
        // don't redirect until flag is cleared
        return
      }
      
      setUser(firebaseUser)
      
      // Load user data from database if authenticated
      if (firebaseUser && firebaseUser.email) {
        try {
          const data = await getCurrentUserData(firebaseUser.email)
          
          // Check if user exists and is active
          if (data) {
            const userStatus = (data.status || 'active').toLowerCase()
            
            // If user is not active, sign them out
            if (userStatus !== 'active') {
              console.warn('User account is not active, signing out:', userStatus)
              const { signOut } = await import('firebase/auth')
              await signOut(auth)
              alert(`Your account has been ${userStatus}. Please contact administrator.`)
              setUserData(null)
              setLoading(false)
              return
            }
            
            setUserData(data)
          } else {
            // User not in database - check if admin email (fallback)
            const normalizedEmail = firebaseUser.email.toLowerCase()
            if (!normalizedEmail.includes('admin@')) {
              // Not admin and not in database - sign out
              console.warn('User not found in database, signing out')
              const { signOut } = await import('firebase/auth')
              await signOut(auth)
              alert('User account not found. Please contact administrator.')
              setUserData(null)
              setLoading(false)
              return
            }
            // Admin email fallback - allow access
            setUserData({ email: firebaseUser.email, role: 'admin', status: 'active' })
          }
          
          // Download data from Firebase on startup if authenticated and online
          if (navigator.onLine) {
            try {
              await downloadFromFirebase()
              // Process sync queue after downloading
              await dbService.processSyncQueue()
            } catch (error) {
              console.error('Error downloading from Firebase on startup:', error)
            }
          }
        } catch (error) {
          console.error('Error loading user data:', error)
          setUserData(null)
        }
      } else {
        setUserData(null)
      }
      
      setLoading(false)
    })

    // Listen for online/offline status
    const handleOnline = () => {
      setIsOnline(true)
      setSyncStatus('syncing')
      dbService.processSyncQueue().finally(() => {
        setSyncStatus('idle')
      })
    }

    const handleOffline = () => {
      setIsOnline(false)
      setSyncStatus('offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Listen for Electron menu events
    if (window.electronAPI) {
      window.electronAPI.onMenuAction((event, data) => {
        console.log('Menu action:', event, data)
        // Handle menu actions here
      })
    }

    return () => {
      unsubscribe()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('shoppos-theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }

  const contextValue = {
    user,
    userData, // Include user data with permissions
    theme,
    toggleTheme,
    isOnline,
    syncStatus,
    setSyncStatus
  }

  // Loading screen
  if (loading) {
    console.log('Showing loading screen')
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading ShopPOS...</p>
          <p className="text-sm text-gray-500 mt-2">Debug: Loading state active</p>
        </div>
      </div>
    )
  }

  console.log('Rendering main app, user:', !!user)
  
  // Check if we're creating a user - if so, don't redirect
  const creatingUser = sessionStorage.getItem('creatingUser')
  
  return (
    <AppContext.Provider value={contextValue}>
      <Router>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          
          {!user && !creatingUser ? (
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          ) : (
            <ErrorBoundary>
              <Layout>
                <Suspense fallback={<LoadingFallback />}>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<ProtectedRoute path="/dashboard"><Dashboard /></ProtectedRoute>} />
                    <Route path="/sales" element={<ProtectedRoute path="/sales"><Sales /></ProtectedRoute>} />
                    <Route path="/inventory" element={<ProtectedRoute path="/inventory"><Inventory /></ProtectedRoute>} />
                    <Route path="/grn" element={<ProtectedRoute path="/grn"><GRN /></ProtectedRoute>} />
                    <Route path="/customers" element={<ProtectedRoute path="/customers"><Customers /></ProtectedRoute>} />
                    <Route path="/suppliers" element={<ProtectedRoute path="/suppliers"><Suppliers /></ProtectedRoute>} />
                    <Route path="/job-notes" element={<ProtectedRoute path="/job-notes"><JobNotes /></ProtectedRoute>} />
                    <Route path="/warranty" element={<ProtectedRoute path="/warranty"><Warranty /></ProtectedRoute>} />
                    <Route path="/reports" element={<ProtectedRoute path="/reports"><Reports /></ProtectedRoute>} />
                    <Route path="/cash-flow" element={<ProtectedRoute path="/cash-flow"><CashFlow /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute path="/settings"><Settings /></ProtectedRoute>} />
                    <Route path="/users" element={<ProtectedRoute path="/users"><UserManagement /></ProtectedRoute>} />
                    <Route path="/sync" element={<ProtectedRoute path="/sync"><SyncCenter /></ProtectedRoute>} />
                    <Route path="/about" element={<ProtectedRoute path="/about"><About /></ProtectedRoute>} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </Suspense>
              </Layout>
            </ErrorBoundary>
          )}
        </div>
      </Router>
    </AppContext.Provider>
  )
}

export default App
