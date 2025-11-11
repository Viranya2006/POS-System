import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { canAccessRoute, getCurrentUserData } from '../lib/permissions'

/**
 * Protected Route Component - Checks user permissions before rendering
 */
const ProtectedRoute = ({ children, path }) => {
  const [isAuthorized, setIsAuthorized] = useState(null) // null = loading, true/false = result
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkPermission = async () => {
      try {
        // Get current user email from Firebase auth
        const { auth } = await import('../lib/firebase')
        const currentUser = auth.currentUser
        
        if (!currentUser || !currentUser.email) {
          console.warn('No current user found')
          setIsAuthorized(false)
          setLoading(false)
          return
        }

        const userEmail = currentUser.email.toLowerCase()

        // Get user data from database including role
        const userData = await getCurrentUserData(currentUser.email)
        
        if (!userData) {
          // If user not in database but authenticated, check if admin email
          if (userEmail.includes('admin@')) {
            // Fallback: admin emails get access if not in database
            setIsAuthorized(true)
            setLoading(false)
            return
          }
          setIsAuthorized(false)
          setLoading(false)
          return
        }

        // Check if user can access this route based on their role
        const canAccess = canAccessRoute(userData, path)
        setIsAuthorized(canAccess)
      } catch (error) {
        console.error('Error checking permission:', error)
        setIsAuthorized(false)
      } finally {
        setLoading(false)
      }
    }

    checkPermission()
  }, [path])

  if (loading || isAuthorized === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600 dark:text-gray-400">Checking permissions...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You don't have permission to access this page.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return children
}

export default ProtectedRoute

