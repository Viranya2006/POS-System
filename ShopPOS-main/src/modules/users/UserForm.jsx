import React, { useState, useEffect } from 'react'
import { generateId } from '../../lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { X, Save, User } from 'lucide-react'

const UserForm = ({ user, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    userId: '',
    name: '',
    username: '',
    email: '',
    phone: '',
    role: 'staff',
    status: 'active',
    password: '',
    confirmPassword: '',
    permissions: {
      sales: true,
      inventory: false,
      customers: false,
      reports: false,
      settings: false,
      users: false
    }
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      setFormData({
        userId: user.userId || '',
        name: user.name || '',
        username: user.username || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || 'staff',
        status: user.status || 'active',
        password: '',
        confirmPassword: '',
        permissions: user.permissions || {
          sales: true,
          inventory: false,
          customers: false,
          reports: false,
          settings: false,
          users: false
        }
      })
    } else {
      setFormData(prev => ({
        ...prev,
        userId: generateId('USR')
      }))
    }
  }, [user])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handlePermissionChange = (permission, checked) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: checked
      }
    }))
  }

  const handleRoleChange = (e) => {
    const role = e.target.value
    setFormData(prev => ({
      ...prev,
      role
    }))

    // Auto-set permissions based on role
    let permissions = { ...formData.permissions }
    switch (role) {
      case 'admin':
        permissions = {
          sales: true,
          inventory: true,
          customers: true,
          reports: true,
          settings: true,
          users: true
        }
        break
      case 'manager':
        permissions = {
          sales: true,
          inventory: true,
          customers: true,
          reports: true,
          settings: false,
          users: false
        }
        break
      case 'cashier':
        permissions = {
          sales: true,
          inventory: false,
          customers: true,
          reports: false,
          settings: false,
          users: false
        }
        break
      case 'staff':
        permissions = {
          sales: true,
          inventory: false,
          customers: false,
          reports: false,
          settings: false,
          users: false
        }
        break
    }
    
    setFormData(prev => ({
      ...prev,
      permissions
    }))
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required'
    }

    // Email is required for Firebase Authentication
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Valid email address is required for login'
    }

    if (!user) { // New user
      if (!formData.password) {
        newErrors.password = 'Password is required'
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters'
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match'
      }
    } else { // Existing user
      if (formData.password && formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters'
      }

      if (formData.password && formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Prevent duplicate submissions
    if (loading) {
      return
    }
    
    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const userData = {
        ...formData,
        updatedAt: new Date().toISOString()
      }

      // Remove password fields if not changing password
      if (user && !formData.password) {
        delete userData.password
        delete userData.confirmPassword
      }

      await onSave(userData)
    } catch (error) {
      console.error('Error saving user:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            {user ? 'Edit User' : 'Add New User'}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="form-section">
              <h3 className="form-section-title">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    User ID
                  </label>
                  <Input
                    name="userId"
                    value={formData.userId}
                    onChange={handleInputChange}
                    placeholder="Auto-generated"
                    disabled
                    className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter full name"
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <Input
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Enter username"
                    className={errors.username ? 'border-red-500' : ''}
                  />
                  {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="user@example.com"
                    required
                    className={errors.email ? 'border-red-500' : ''}
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                  {!user && (
                    <p className="text-xs text-gray-500 mt-1">Used for login authentication</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Phone</label>
                  <Input
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Role & Permissions */}
            <div className="form-section">
              <h3 className="form-section-title">Role & Permissions</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Role</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleRoleChange}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  >
                    <option value="staff">Staff</option>
                    <option value="cashier">Cashier</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3">Permissions</label>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(formData.permissions).map(([permission, enabled]) => (
                      <div key={permission} className="flex items-center justify-between p-2 border rounded">
                        <label className="text-sm font-medium capitalize">
                          {permission === 'users' ? 'User Management' : permission}
                        </label>
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(e) => handlePermissionChange(permission, e.target.checked)}
                          className="rounded"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Password */}
            <div className="form-section">
              <h3 className="form-section-title">
                {user ? 'Change Password (Optional)' : 'Set Password'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Password {!user && <span className="text-red-500">*</span>}
                  </label>
                  <Input
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder={user ? "Leave blank to keep current" : "Enter password"}
                    className={errors.password ? 'border-red-500' : ''}
                  />
                  {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Confirm Password {!user && <span className="text-red-500">*</span>}
                  </label>
                  <Input
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder={user ? "Leave blank to keep current" : "Confirm password"}
                    className={errors.confirmPassword ? 'border-red-500' : ''}
                  />
                  {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {user ? 'Update User' : 'Create User'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default UserForm
