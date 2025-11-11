import React, { useState } from 'react'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth } from '../../lib/firebase'
import { dbService } from '../../lib/database'
import { activityLogger } from '../../lib/activityLogger'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Eye, EyeOff, Store, Loader2 } from 'lucide-react'

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    setError('')

    try {
      // First, authenticate with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password)
      
      // Check if user exists in database and is active
      try {
        const users = await dbService.readAll('users')
        const userData = users.find(u => {
          const userEmail = (u.email || '').toLowerCase()
          return userEmail === formData.email.toLowerCase()
        })
        
        // If user not found in database, check if admin email (fallback)
        if (!userData) {
          const normalizedEmail = formData.email.toLowerCase()
          if (!normalizedEmail.includes('admin@')) {
            // User not in database and not admin - sign them out
            await signOut(auth)
            setError('User account not found. Please contact administrator.')
            setLoading(false)
            return
          }
          // Admin email fallback - allow login
          await activityLogger.logLogin(userCredential.user.uid, userCredential.user.email)
          return
        }
        
        // Check user status
        const userStatus = (userData.status || 'active').toLowerCase()
        
        if (userStatus !== 'active') {
          // User is inactive or suspended - sign them out immediately
          await signOut(auth)
          
          let statusMessage = 'Your account has been '
          if (userStatus === 'inactive') {
            statusMessage += 'deactivated. Please contact administrator.'
          } else if (userStatus === 'suspended') {
            statusMessage += 'suspended. Please contact administrator.'
          } else {
            statusMessage += 'locked. Please contact administrator.'
          }
          
          setError(statusMessage)
          setLoading(false)
          return
        }
        
        // User is active - allow login
        await activityLogger.logLogin(userCredential.user.uid, userCredential.user.email)
        // Navigation will be handled by the auth state change in App.jsx
      } catch (dbError) {
        console.error('Error checking user status:', dbError)
        // If database check fails, still allow login but log the error
        await activityLogger.logLogin(userCredential.user.uid, userCredential.user.email)
      }
    } catch (error) {
      console.error('Login error:', error)
      
      // Provide specific error messages
      let errorMessage = 'Login failed. Please check your credentials and try again.'
      
      if (error.code) {
        switch (error.code) {
          case 'auth/user-not-found':
            errorMessage = 'No account found with this email. Please create an account in Firebase Console first.'
            break
          case 'auth/wrong-password':
            errorMessage = 'Incorrect password. Please check your password and try again.'
            break
          case 'auth/invalid-email':
            errorMessage = 'Invalid email address. Please enter a valid email.'
            break
          case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your internet connection.'
            break
          case 'auth/too-many-requests':
            errorMessage = 'Too many failed login attempts. Please try again later.'
            break
          case 'auth/invalid-credential':
            errorMessage = 'Invalid credentials. Please check your email and password.'
            break
          default:
            errorMessage = `Login error: ${error.message || 'Please check your credentials and try again.'}`
        }
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo and branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
            <Store className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">ShopPOS</h1>
          <p className="text-gray-600 dark:text-gray-400">Professional Point of Sale System</p>
        </div>

        {/* Login form */}
        <Card className="glass-card backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 border-white/20 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Sign in to your ShopPOS account
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email field */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email Address
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email"
                  required
                  className="w-full"
                  disabled={loading}
                />
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter your password"
                    required
                    className="w-full pr-10"
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Login button */}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-2.5"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>

            </form>

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ShopPOS v1.0.0 - Professional Point of Sale System
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick access info */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Offline Ready</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Cloud Sync</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
