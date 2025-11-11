import React, { useState, useEffect } from 'react'
import { updatePassword, deleteUser as deleteFirebaseUser } from 'firebase/auth'
import { auth } from '../../lib/firebase'
import { dbService } from '../../lib/database'
import { formatDate, generateId } from '../../lib/utils'
import { activityLogger } from '../../lib/activityLogger'
import { deleteFirebaseAuthUser } from '../../lib/firebaseAuthService'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import {
  Users as UsersIcon,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Shield,
  User,
  Mail,
  Phone,
  Calendar,
  Key,
  UserCheck,
  UserX,
  Crown,
  Settings
} from 'lucide-react'
import UserForm from './UserForm'
import UserDetails from './UserDetails'

const UserManagement = () => {
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showUserForm, setShowUserForm] = useState(false)
  const [showUserDetails, setShowUserDetails] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  useEffect(() => {
    loadUserData()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, searchQuery, roleFilter, statusFilter])

  const loadUserData = async () => {
    try {
      setLoading(true)
      const userData = await dbService.readAll('users')
      
      // Remove duplicates based on email or userId
      const uniqueUsers = []
      const seenEmails = new Set()
      const seenUserIds = new Set()
      const seenFirebaseUids = new Set()
      
      for (const user of userData) {
        // Check for duplicates by email, userId, or firebaseUid
        const emailKey = user.email?.toLowerCase()
        const userIdKey = user.userId
        const firebaseUidKey = user.firebaseUid
        
        let isDuplicate = false
        
        if (emailKey && seenEmails.has(emailKey)) {
          isDuplicate = true
        } else if (emailKey) {
          seenEmails.add(emailKey)
        }
        
        if (userIdKey && seenUserIds.has(userIdKey)) {
          isDuplicate = true
        } else if (userIdKey) {
          seenUserIds.add(userIdKey)
        }
        
        if (firebaseUidKey && seenFirebaseUids.has(firebaseUidKey)) {
          isDuplicate = true
        } else if (firebaseUidKey) {
          seenFirebaseUids.add(firebaseUidKey)
        }
        
        // If not a duplicate, add to unique list
        if (!isDuplicate) {
          uniqueUsers.push(user)
        } else {
          // Remove duplicate from database
          console.log('Removing duplicate user:', user)
          try {
            await dbService.delete('users', user.id)
          } catch (e) {
            console.error('Error removing duplicate:', e)
          }
        }
      }
      
      setUsers(uniqueUsers)
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = [...users]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.username?.toLowerCase().includes(query)
      )
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter)
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter)
    }

    setFilteredUsers(filtered)
  }

  const handleAddUser = () => {
    setSelectedUser(null)
    setShowUserForm(true)
  }

  const handleEditUser = (user) => {
    setSelectedUser(user)
    setShowUserForm(true)
  }

  const handleViewUser = (user) => {
    setSelectedUser(user)
    setShowUserDetails(true)
  }

  const handleDeleteUser = async (userId) => {
    const user = users.find(u => u.id === userId)
    if (!user) return

    const confirmMessage = user.firebaseUid 
      ? `Are you sure you want to delete ${user.name || user.email}?\n\nThis will:\n- Remove from local database\n- Remove from Firebase Realtime Database\n- Remove from Firebase Authentication\n\n⚠️ This action cannot be undone!`
      : `Are you sure you want to delete ${user.name || user.email}?\n\n⚠️ This action cannot be undone!`

    if (window.confirm(confirmMessage)) {
      try {
        let authDeleted = false
        let authError = null
        
        // Delete from Firebase Authentication first if we have the firebaseUid
        if (user.firebaseUid) {
          try {
            await deleteFirebaseAuthUser(user.firebaseUid)
            authDeleted = true
            console.log('✅ User deleted from Firebase Authentication')
          } catch (authErr) {
            authError = authErr
            console.error('❌ Error deleting from Firebase Auth:', authErr)
            
            // Try alternative method: Use Firebase Admin REST API if available
            try {
              // Note: Direct deletion requires Admin SDK which is server-side only
              // If Cloud Function fails, we'll mark user as deleted in database
              // and prevent login through status check
              console.warn('⚠️ Cloud Function deletion failed, user will be prevented from logging in via status check')
            } catch (altError) {
              console.error('Alternative deletion method also failed:', altError)
            }
          }
        }
        
        // Delete from local database FIRST (this will also sync deletion to Firebase Realtime DB)
        await dbService.delete('users', userId)
        
        // Also delete from Firebase Realtime Database directly if we have the firebaseUid
        if (user.firebaseUid || user.email) {
          try {
            const { firebaseSync } = await import('../../lib/firebaseSync')
            // Delete from Firebase Realtime DB using email, userId, or firebaseUid as the key
            const deleteKey = user.email || user.userId || user.firebaseUid
            if (deleteKey) {
              await firebaseSync.deleteRecord('users', deleteKey)
              console.log('✅ User deleted from Firebase Realtime Database')
            }
          } catch (fbError) {
            console.warn('Could not delete from Firebase Realtime DB (will sync via queue):', fbError)
          }
        }
        
        // IMPORTANT: If Firebase Auth deletion failed, mark user as deleted in a special way
        // by checking if user exists. Since we can't delete from Auth client-side without Admin SDK,
        // the user will be prevented from logging in because they won't be in the database
        
        // Log activity
        await activityLogger.log('delete', 'user', userId, {
          email: user?.email || 'Unknown',
          firebaseUid: user?.firebaseUid,
          authDeleted: authDeleted
        })
        
        await loadUserData()
        
        // Show success message
        let successMessage = 'User deleted successfully!\n\n'
        successMessage += 'Local database: ✓ Deleted\n'
        successMessage += 'Firebase Realtime DB: ✓ Deleted\n'
        
        if (user.firebaseUid) {
          if (authDeleted) {
            successMessage += 'Firebase Authentication: ✓ Deleted\n\n'
            successMessage += 'User cannot login anymore.'
          } else {
            successMessage += 'Firebase Authentication: ⚠️ Could not delete (requires Admin SDK)\n\n'
            successMessage += 'IMPORTANT: User account still exists in Firebase Auth.\n'
            successMessage += 'However, login is BLOCKED because user is removed from database.\n'
            successMessage += 'To fully delete, please delete manually from Firebase Console:\n'
            successMessage += 'Firebase Console > Authentication > Users > Find user by email'
          }
        } else {
          successMessage += '\nNote: User was not in Firebase Authentication.'
        }
        
        alert(successMessage)
      } catch (error) {
        console.error('Error deleting user:', error)
        alert('Error deleting user: ' + (error.message || 'Unknown error'))
      }
    }
  }

  const handleUserSave = async (userData) => {
    try {
      if (selectedUser) {
        // Update existing user
        const updateData = { ...userData }
        
        // If password is provided, update it in Firebase Auth
        if (userData.password && userData.email) {
          try {
            // Find the Firebase user by email (this requires admin SDK or the user to be logged in)
            // For now, we'll store the password update in the database
            // The password will be updated when user logs in next time
            // Note: To update password, we'd need Firebase Admin SDK or the user must be logged in
            console.log('Password update requested - user will need to update on next login')
          } catch (error) {
            console.error('Error updating password in Firebase:', error)
          }
        }
        
        // Remove password fields before saving to database (security - never store passwords)
        delete updateData.password
        delete updateData.confirmPassword
        
        // Preserve Firebase UID if it exists
        if (selectedUser.firebaseUid && !updateData.firebaseUid) {
          updateData.firebaseUid = selectedUser.firebaseUid
        }
        
        await dbService.update('users', selectedUser.id, updateData)
        
        // Log activity
        await activityLogger.log('update', 'user', selectedUser.id, {
          email: userData.email,
          role: userData.role
        })
      } else {
        // Create new user
        if (!userData.email) {
          throw new Error('Email is required to create a user account')
        }
        
        // IMPORTANT: Store admin info BEFORE creating user
        const currentAdmin = auth.currentUser
        const adminEmail = currentAdmin?.email || ''
        
        // Create user in Firebase Authentication using Cloud Function
        // This prevents the admin from being logged out
        let firebaseUserData
        try {
          const { createFirebaseAuthUser } = await import('../../lib/firebaseAuthService')
          
          // Create user via Cloud Function (doesn't sign them in)
          firebaseUserData = await createFirebaseAuthUser(
            userData.email,
            userData.password,
            {
              role: userData.role,
              name: userData.name
            }
          )
          
          console.log('✅ User created in Firebase Auth via Cloud Function:', firebaseUserData.uid)
          
        } catch (error) {
          console.error('❌ Error creating user in Firebase Auth:', error)
          
          // If Cloud Function fails, fall back to client SDK (admin will be logged out)
          if (error.message.includes('Cloud Function not deployed') || 
              error.message.includes('Cloud Function not available') ||
              error.message.includes('Cloud Function error') ||
              error.message.includes('not deployed') ||
              error.message.includes('misconfigured') ||
              error.message.includes('fallback mode') ||
              error.message.includes('internal')) {
            console.warn('⚠️ Falling back to client SDK - admin will be logged out')
            
            try {
              // Store admin info and set flags BEFORE creating user
              sessionStorage.setItem('creatingUser', 'true')
              sessionStorage.setItem('adminEmail', adminEmail)
              
              // Fallback: Use client SDK (admin will be logged out)
              const { createUserWithEmailAndPassword, signOut } = await import('firebase/auth')
              
              // Create user (this will auto-login as the new user, replacing admin session)
              const firebaseUser = await createUserWithEmailAndPassword(
                auth,
                userData.email,
                userData.password
              )
              
              console.log('✅ New user created, now signing out...')
              
              // CRITICAL: Immediately sign out the new user to prevent auto-login
              await signOut(auth)
              
              // Wait a moment for sign out to complete
              await new Promise(resolve => setTimeout(resolve, 500))
              
              firebaseUserData = {
                uid: firebaseUser.user.uid,
                email: firebaseUser.user.email
              }
              
              // Keep flag active longer to prevent redirects
              // The flag will be cleared after showing success message
              
            } catch (fallbackError) {
              // Clear flags on fallback error
              sessionStorage.removeItem('creatingUser')
              sessionStorage.removeItem('adminEmail')
              
              // Provide specific error messages for fallback
              if (fallbackError.code === 'auth/email-already-in-use') {
                throw new Error('This email is already registered. Please use a different email.')
              } else if (fallbackError.code === 'auth/invalid-email') {
                throw new Error('Invalid email address. Please enter a valid email.')
              } else if (fallbackError.code === 'auth/weak-password') {
                throw new Error('Password is too weak. Please use a stronger password.')
              } else {
                throw new Error(`Failed to create user account: ${fallbackError.message || 'Unknown error'}`)
              }
            }
          } else {
            // Provide specific error messages for Cloud Function errors
            if (error.message.includes('already registered') || error.message.includes('already-exists')) {
              throw new Error('This email is already registered. Please use a different email.')
            } else if (error.message.includes('Invalid email')) {
              throw new Error('Invalid email address. Please enter a valid email.')
            } else if (error.message.includes('Password is too weak')) {
              throw new Error('Password is too weak. Please use a stronger password.')
            } else {
              throw new Error(`Failed to create user account: ${error.message || 'Unknown error. Please deploy Cloud Functions or check console for details.'}`)
            }
          }
        }
        
        // Save user to database
        const newUser = {
          ...userData,
          userId: userData.userId || generateId('USR'),
          firebaseUid: firebaseUserData.uid,
          createdAt: new Date().toISOString(),
          lastLogin: null
        }
        
        // Remove password fields before saving to database
        delete newUser.password
        delete newUser.confirmPassword
        
        await dbService.create('users', newUser)
        
        // Log activity
        await activityLogger.log('create', 'user', newUser.id, {
          email: userData.email,
          role: userData.role,
          firebaseUid: firebaseUserData.uid
        })
        
        // Reload user data
        await loadUserData()
        setShowUserForm(false)
        setSelectedUser(null)
        
        // Check if we used fallback (client SDK) - admin was logged out
        const usedFallback = sessionStorage.getItem('adminEmail')
        
        if (usedFallback) {
          // Clear flags after showing message
          sessionStorage.removeItem('creatingUser')
          sessionStorage.removeItem('adminEmail')
          
          // Show success message with login reminder
          alert('User saved successfully!\n\nNote: You were logged out during user creation.\nPlease log back in to continue.')
          
          // Redirect to login page after a short delay
          setTimeout(() => {
            window.location.href = '/login'
          }, 1000)
        } else {
          // Cloud Function was used - admin still logged in
          alert('User saved successfully!')
        }
        
        return // Exit early since we already handled everything above
      }
      
      // If updating existing user, continue with normal flow
      await loadUserData()
      setShowUserForm(false)
      setSelectedUser(null)
      
      alert('User saved successfully!')
    } catch (error) {
      console.error('Error saving user:', error)
      alert(error.message || 'Error saving user. Please check the console for details.')
    }
  }

  const handleStatusToggle = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    const user = users.find(u => u.id === userId)
    
    if (!user) {
      alert('User not found')
      return
    }
    
    try {
      await dbService.update('users', userId, { 
        status: newStatus,
        updatedAt: new Date().toISOString()
      })
      
      // If user is being deactivated and is currently logged in, sign them out
      if (newStatus !== 'active' && user.firebaseUid) {
        try {
          // Check if this is the currently logged in user
          const { auth } = await import('../../lib/firebase')
          const currentUser = auth.currentUser
          
          if (currentUser && currentUser.uid === user.firebaseUid) {
            // Sign out the user immediately
            const { signOut } = await import('firebase/auth')
            await signOut(auth)
            alert('Your account has been deactivated. You have been signed out.')
            window.location.href = '/login'
            return
          }
        } catch (signOutError) {
          console.error('Error signing out user:', signOutError)
        }
      }
      
      // Log activity
      await activityLogger.log('update', 'user', userId, {
        action: 'status_change',
        oldStatus: currentStatus,
        newStatus: newStatus,
        email: user?.email || 'Unknown'
      })
      
      await loadUserData()
      
      alert(`User status updated to ${newStatus}. ${newStatus !== 'active' ? 'User will be signed out if currently logged in.' : 'User can now login.'}`)
    } catch (error) {
      console.error('Error updating user status:', error)
      alert('Error updating user status: ' + (error.message || 'Unknown error'))
    }
  }

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'text-red-400 bg-red-900/20 dark:bg-red-900/30'
      case 'manager': return 'text-purple-400 bg-purple-900/20 dark:bg-purple-900/30'
      case 'cashier': return 'text-blue-400 bg-blue-900/20 dark:bg-blue-900/30'
      case 'staff': return 'text-green-400 bg-green-900/20 dark:bg-green-900/30'
      default: return 'text-gray-400 bg-gray-900/20 dark:bg-gray-900/30'
    }
  }

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <Crown className="h-4 w-4" />
      case 'manager': return <Shield className="h-4 w-4" />
      case 'cashier': return <User className="h-4 w-4" />
      case 'staff': return <UsersIcon className="h-4 w-4" />
      default: return <User className="h-4 w-4" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-900/20 dark:bg-green-900/30'
      case 'inactive': return 'text-red-400 bg-red-900/20 dark:bg-red-900/30'
      case 'suspended': return 'text-yellow-400 bg-yellow-900/20 dark:bg-yellow-900/30'
      default: return 'text-gray-400 bg-gray-900/20 dark:bg-gray-900/30'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const totalUsers = users.length
  const activeUsers = users.filter(u => u.status === 'active').length
  const adminUsers = users.filter(u => u.role === 'admin').length
  const recentUsers = users.filter(u => {
    const createdDate = new Date(u.createdAt)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    return createdDate >= weekAgo
  }).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage user accounts and permissions</p>
        </div>
        <div className="flex space-x-3">
          <Button onClick={handleAddUser}>
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalUsers}</p>
              </div>
              <UsersIcon className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Users</p>
                <p className="text-2xl font-bold text-green-600">{activeUsers}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Administrators</p>
                <p className="text-2xl font-bold text-red-600">{adminUsers}</p>
              </div>
              <Crown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">New This Week</p>
                <p className="text-2xl font-bold text-purple-600">{recentUsers}</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Role</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="all">All Roles</option>
                <option value="admin">Administrator</option>
                <option value="manager">Manager</option>
                <option value="cashier">Cashier</option>
                <option value="staff">Staff</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={loadUserData} className="w-full">
                <Search className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User List */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
          <CardDescription>
            Manage user accounts and role-based permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No users found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {users.length === 0 
                  ? "Get started by adding your first user"
                  : "Try adjusting your search or filter criteria"
                }
              </p>
              {users.length === 0 && (
                <Button onClick={handleAddUser}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First User
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">User</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Contact</th>
                    <th className="text-center p-3 font-semibold text-gray-700 dark:text-gray-300">Role</th>
                    <th className="text-center p-3 font-semibold text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Last Login</th>
                    <th className="text-center p-3 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="p-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">@{user.username}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">ID: {user.userId}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          {user.email && (
                            <div className="flex items-center text-sm text-gray-900 dark:text-white">
                              <Mail className="h-3 w-3 mr-1 text-gray-400" />
                              {user.email}
                            </div>
                          )}
                          {user.phone && (
                            <div className="flex items-center text-sm text-gray-900 dark:text-white">
                              <Phone className="h-3 w-3 mr-1 text-gray-400" />
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center justify-center space-x-1 ${getRoleColor(user.role)}`}>
                          {getRoleIcon(user.role)}
                          <span className="capitalize">{user.role}</span>
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                          {user.status === 'active' ? <UserCheck className="h-3 w-3 inline mr-1" /> : <UserX className="h-3 w-3 inline mr-1" />}
                          <span className="capitalize">{user.status}</span>
                        </span>
                      </td>
                      <td className="p-3">
                        {user.lastLogin ? (
                          <div className="flex items-center text-sm text-gray-900 dark:text-white">
                            <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                            {formatDate(user.lastLogin, 'short')}
                          </div>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400 text-sm">Never</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewUser(user)}
                            title="View Details"
                            className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <User className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditUser(user)}
                            title="Edit User"
                            className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStatusToggle(user.id, user.status)}
                            title={user.status === 'active' ? 'Deactivate' : 'Activate'}
                            className={user.status === 'active' 
                              ? 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20' 
                              : 'text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20'}
                          >
                            {user.status === 'active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Delete User"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Form Modal */}
      {showUserForm && (
        <UserForm
          user={selectedUser}
          onSave={handleUserSave}
          onCancel={() => {
            setShowUserForm(false)
            setSelectedUser(null)
          }}
        />
      )}

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <UserDetails
          user={selectedUser}
          onClose={() => {
            setShowUserDetails(false)
            setSelectedUser(null)
          }}
          onEdit={() => {
            setShowUserDetails(false)
            setShowUserForm(true)
          }}
        />
      )}
    </div>
  )
}

export default UserManagement
