import React from 'react'
import { formatDate } from '../../lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { 
  X, 
  Edit, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Shield,
  Crown,
  UserCheck,
  UserX,
  Key,
  Settings
} from 'lucide-react'

const UserDetails = ({ user, onClose, onEdit }) => {
  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'text-red-600 bg-red-50 border-red-200'
      case 'manager': return 'text-purple-600 bg-purple-50 border-purple-200'
      case 'cashier': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'staff': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <Crown className="h-5 w-5" />
      case 'manager': return <Shield className="h-5 w-5" />
      case 'cashier': return <User className="h-5 w-5" />
      case 'staff': return <Settings className="h-5 w-5" />
      default: return <User className="h-5 w-5" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50 border-green-200'
      case 'inactive': return 'text-red-600 bg-red-50 border-red-200'
      case 'suspended': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getRoleDescription = (role) => {
    switch (role) {
      case 'admin': return 'Full system access with all permissions'
      case 'manager': return 'Management access to sales, inventory, and reports'
      case 'cashier': return 'Sales and customer management access'
      case 'staff': return 'Basic sales access only'
      default: return 'Limited access'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            User Details
          </CardTitle>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* User Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* User Info */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>User Information</span>
                    <div className="flex space-x-2">
                      <div className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center space-x-2 ${getRoleColor(user.role)}`}>
                        {getRoleIcon(user.role)}
                        <span className="capitalize">{user.role}</span>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center space-x-2 ${getStatusColor(user.status)}`}>
                        {user.status === 'active' ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                        <span className="capitalize">{user.status}</span>
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">User ID</label>
                      <p className="font-mono text-sm">{user.userId}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Full Name</label>
                      <p className="font-semibold">{user.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Username</label>
                      <p className="font-mono">@{user.username}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Created Date</label>
                      <p>{formatDate(user.createdAt, 'long')}</p>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {user.email && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Email</label>
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <p>{user.email}</p>
                        </div>
                      </div>
                    )}
                    {user.phone && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Phone</label>
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <p>{user.phone}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Login Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Last Login</label>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <p>{user.lastLogin ? formatDate(user.lastLogin, 'long') : 'Never'}</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Last Updated</label>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <p>{user.updatedAt ? formatDate(user.updatedAt, 'long') : formatDate(user.createdAt, 'long')}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Role Summary */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Role Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-3">
                      {getRoleIcon(user.role)}
                    </div>
                    <h3 className="font-semibold text-lg capitalize mb-2">{user.role}</h3>
                    <p className="text-sm text-gray-600">{getRoleDescription(user.role)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Account Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-3">
                      {user.status === 'active' ? (
                        <UserCheck className="h-8 w-8 text-green-500" />
                      ) : (
                        <UserX className="h-8 w-8 text-red-500" />
                      )}
                    </div>
                    <h3 className="font-semibold text-lg capitalize mb-2">{user.status}</h3>
                    <p className="text-sm text-gray-600">
                      {user.status === 'active' 
                        ? 'User can access the system'
                        : user.status === 'inactive'
                        ? 'User cannot access the system'
                        : 'User access is temporarily suspended'
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="h-5 w-5 mr-2" />
                Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user.permissions ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(user.permissions).map(([permission, enabled]) => (
                    <div key={permission} className={`p-3 rounded-lg border ${enabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium capitalize">
                          {permission === 'users' ? 'User Management' : permission}
                        </span>
                        {enabled ? (
                          <UserCheck className="h-4 w-4 text-green-600" />
                        ) : (
                          <UserX className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {enabled ? 'Allowed' : 'Denied'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Key className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-500">No permissions configured</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Security Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Account Security</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Password Set</span>
                      <UserCheck className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Two-Factor Auth</span>
                      <UserX className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Email Verified</span>
                      {user.email ? (
                        <UserCheck className="h-4 w-4 text-green-600" />
                      ) : (
                        <UserX className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Access Information</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-500">Account Created:</span>
                      <p>{formatDate(user.createdAt, 'long')}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Last Login:</span>
                      <p>{user.lastLogin ? formatDate(user.lastLogin, 'long') : 'Never logged in'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Login Count:</span>
                      <p>{user.loginCount || 0} times</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}

export default UserDetails
