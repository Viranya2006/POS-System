import React, { useState, useEffect, useRef } from 'react'
import { dbService, db } from '../../lib/database'
import { formatCurrency, formatDate, generateId } from '../../lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import {
  Shield,
  Plus,
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Calendar,
  Package,
  User,
  Phone,
  FileText
} from 'lucide-react'
import WarrantyForm from './WarrantyForm'
import WarrantyDetails from './WarrantyDetails'

const Warranty = () => {
  const [warranties, setWarranties] = useState([])
  const [filteredWarranties, setFilteredWarranties] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showWarrantyForm, setShowWarrantyForm] = useState(false)
  const [showWarrantyDetails, setShowWarrantyDetails] = useState(false)
  const [selectedWarranty, setSelectedWarranty] = useState(null)
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const savingRef = useRef(false) // Prevent multiple simultaneous saves

  useEffect(() => {
    loadWarrantyData()
  }, [])

  useEffect(() => {
    filterWarranties()
  }, [warranties, searchQuery, statusFilter])

  const loadWarrantyData = async () => {
    try {
      setLoading(true)
      
      // Load warranties
      const warrantyData = await dbService.readAll('warranty')
      
      // Advanced deduplication: Remove duplicates by warrantyNumber, or id
      const seen = new Set()
      const uniqueWarranties = warrantyData.filter(warranty => {
        // Create unique key based on warrantyNumber or id
        const key1 = warranty.warrantyNumber ? `number:${warranty.warrantyNumber.trim()}` : null
        const key2 = warranty.id ? `id:${warranty.id}` : null
        
        // Check if we've seen any of these keys before
        if (key1 && seen.has(key1)) return false
        if (key2 && seen.has(key2)) return false
        
        // Add all keys to seen set
        if (key1) seen.add(key1)
        if (key2) seen.add(key2)
        
        return true
      })
      
      setWarranties(uniqueWarranties)
      
      // Load customers and products - deduplicate customers
      const customerData = await dbService.readAll('customers')
      const customerSeen = new Set()
      const uniqueCustomers = customerData.filter(customer => {
        const key1 = customer.customerId ? `id:${customer.customerId}` : null
        const key2 = customer.email ? `email:${customer.email.toLowerCase().trim()}` : null
        const key3 = customer.phone ? `phone:${customer.phone.trim()}` : null
        const key4 = customer.name && customer.phone ? `name+phone:${customer.name.toLowerCase().trim()}+${customer.phone.trim()}` : null
        
        if (key1 && customerSeen.has(key1)) return false
        if (key2 && customerSeen.has(key2)) return false
        if (key3 && customerSeen.has(key3)) return false
        if (key4 && customerSeen.has(key4)) return false
        
        if (key1) customerSeen.add(key1)
        if (key2) customerSeen.add(key2)
        if (key3) customerSeen.add(key3)
        if (key4) customerSeen.add(key4)
        
        return true
      })
      const productData = await dbService.readAll('inventory')
      setCustomers(uniqueCustomers)
      setProducts(productData)
      
    } catch (error) {
      console.error('Error loading warranty data:', error)
      alert('Error loading warranties: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const filterWarranties = () => {
    let filtered = [...warranties]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(warranty => 
        (warranty.warrantyNumber || warranty.id?.toString() || '').toLowerCase().includes(query) ||
        (warranty.customerName || '').toLowerCase().includes(query) ||
        (warranty.productName || '').toLowerCase().includes(query) ||
        (warranty.serialNumber || '').toLowerCase().includes(query)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(warranty => warranty.status === statusFilter)
    }

    setFilteredWarranties(filtered)
  }

  const handleAddWarranty = () => {
    setSelectedWarranty(null)
    setShowWarrantyForm(true)
  }

  const handleEditWarranty = (warranty) => {
    setSelectedWarranty(warranty)
    setShowWarrantyForm(true)
  }

  const handleViewWarranty = (warranty) => {
    setSelectedWarranty(warranty)
    setShowWarrantyDetails(true)
  }

  const handleDeleteWarranty = async (warrantyId) => {
    if (!warrantyId) {
      alert('Invalid warranty ID')
      return
    }
    
    if (window.confirm('Are you sure you want to delete this warranty?')) {
      try {
        await dbService.delete('warranty', warrantyId)
        await loadWarrantyData()
      } catch (error) {
        console.error('Error deleting warranty:', error)
        alert('Error deleting warranty: ' + (error.message || 'Unknown error'))
      }
    }
  }

  const handleWarrantySave = async (warrantyData) => {
    // Prevent multiple simultaneous saves
    if (savingRef.current) {
      console.warn('Save already in progress, ignoring duplicate call')
      return
    }
    
    try {
      savingRef.current = true
      
      // Check for duplicate warranty by warrantyNumber before creating
      if (!selectedWarranty) {
        // Use toArray() and filter in memory to avoid index errors
        const allWarranties = await db.warranty.toArray()
        
        // Normalize warranty number for comparison
        const normalizedWarrantyNumber = warrantyData.warrantyNumber?.trim()
        
        const existingWarranty = normalizedWarrantyNumber
          ? allWarranties.find(w => w.warrantyNumber?.trim() === normalizedWarrantyNumber)
          : null
        
        if (existingWarranty) {
          alert('Warranty already exists with this warranty number')
          throw new Error('Duplicate warranty')
        }
      }
      
      if (selectedWarranty) {
        await dbService.update('warranty', selectedWarranty.id, warrantyData)
      } else {
        const newWarranty = {
          ...warrantyData,
          warrantyNumber: warrantyData.warrantyNumber || generateId('WRN'),
          createdAt: new Date().toISOString(),
          createdBy: 'current-user'
        }
        await dbService.create('warranty', newWarranty)
      }
      
      // Reload data after a short delay to ensure database write is complete
      await new Promise(resolve => setTimeout(resolve, 100))
      await loadWarrantyData()
      
      setShowWarrantyForm(false)
      setSelectedWarranty(null)
    } catch (error) {
      console.error('Error saving warranty:', error)
      if (!error.message.includes('Duplicate')) {
        alert('Error saving warranty: ' + (error.message || 'Unknown error'))
      }
      throw error // Re-throw to let form handle it
    } finally {
      savingRef.current = false
    }
  }

  const handleStatusUpdate = async (warrantyId, newStatus) => {
    if (!warrantyId) {
      alert('Invalid warranty ID')
      return
    }
    
    try {
      const updateData = {
        status: newStatus,
        updatedAt: new Date().toISOString()
      }

      if (newStatus === 'approved') {
        updateData.approvedAt = new Date().toISOString()
      } else if (newStatus === 'completed') {
        updateData.completedAt = new Date().toISOString()
      }

      await dbService.update('warranty', warrantyId, updateData)
      await loadWarrantyData()
    } catch (error) {
      console.error('Error updating warranty status:', error)
      alert('Error updating warranty status: ' + (error.message || 'Unknown error'))
    }
  }

  const handleExportWarranties = () => {
    try {
      const csv = [
        ['Warranty Number', 'Customer Name', 'Product Name', 'Serial Number', 'Warranty Type', 'Duration', 'Start Date', 'Expiry Date', 'Status'].join(','),
        ...filteredWarranties.map(warranty => [
          warranty.warrantyNumber || '',
          `"${(warranty.customerName || '').replace(/"/g, '""')}"`,
          `"${(warranty.productName || '').replace(/"/g, '""')}"`,
          warranty.serialNumber || '',
          warranty.warrantyType || '',
          `${warranty.duration || 0} ${warranty.durationType || 'months'}`,
          warranty.startDate ? formatDate(warranty.startDate, 'short') : '',
          warranty.expiryDate ? formatDate(warranty.expiryDate, 'short') : '',
          getWarrantyStatus(warranty)
        ].join(','))
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `warranties_${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting warranties:', error)
      alert('Error exporting warranties: ' + error.message)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-900/20 dark:bg-green-900/30'
      case 'expired': return 'text-red-400 bg-red-900/20 dark:bg-red-900/30'
      case 'claimed': return 'text-blue-400 bg-blue-900/20 dark:bg-blue-900/30'
      case 'processing': return 'text-yellow-400 bg-yellow-900/20 dark:bg-yellow-900/30'
      case 'approved': return 'text-purple-400 bg-purple-900/20 dark:bg-purple-900/30'
      case 'rejected': return 'text-red-400 bg-red-900/20 dark:bg-red-900/30'
      case 'completed': return 'text-green-400 bg-green-900/20 dark:bg-green-900/30'
      default: return 'text-gray-400 bg-gray-900/20 dark:bg-gray-900/30'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <Shield className="h-4 w-4" />
      case 'expired': return <XCircle className="h-4 w-4" />
      case 'claimed': return <AlertTriangle className="h-4 w-4" />
      case 'processing': return <Clock className="h-4 w-4" />
      case 'approved': return <CheckCircle className="h-4 w-4" />
      case 'rejected': return <XCircle className="h-4 w-4" />
      case 'completed': return <CheckCircle className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getWarrantyStatus = (warranty) => {
    if (!warranty) return 'unknown'
    
    // If status is already set to a specific claim status, return it
    if (warranty.status === 'claimed' || warranty.status === 'processing' || warranty.status === 'approved' || warranty.status === 'completed') {
      return warranty.status
    }
    
    // Check expiry date if it exists
    if (!warranty.expiryDate) {
      return 'active' // Default to active if no expiry date
    }
    
    const now = new Date()
    const expiryDate = new Date(warranty.expiryDate)
    
    // Validate date
    if (isNaN(expiryDate.getTime())) {
      return 'active' // Default to active if invalid date
    }
    
    if (expiryDate < now) {
      return 'expired'
    }
    
    return 'active'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96"></div>
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

  const totalWarranties = warranties.length
  const activeWarranties = warranties.filter(w => getWarrantyStatus(w) === 'active').length
  const expiredWarranties = warranties.filter(w => getWarrantyStatus(w) === 'expired').length
  const claimedWarranties = warranties.filter(w => ['claimed', 'processing', 'approved'].includes(w.status)).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Warranty Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Track product warranties and manage claims</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handleExportWarranties}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleAddWarranty}>
            <Plus className="h-4 w-4 mr-2" />
            New Warranty
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Warranties</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalWarranties}</p>
              </div>
              <Shield className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active</p>
                <p className="text-2xl font-bold text-green-600">{activeWarranties}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Expired</p>
                <p className="text-2xl font-bold text-red-600">{expiredWarranties}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Claims</p>
                <p className="text-2xl font-bold text-yellow-600">{claimedWarranties}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search warranties..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
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
                <option value="expired">Expired</option>
                <option value="claimed">Claimed</option>
                <option value="processing">Processing</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={loadWarrantyData} className="w-full">
                <Search className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warranty List */}
      <Card>
        <CardHeader>
          <CardTitle>Warranties ({filteredWarranties.length})</CardTitle>
          <CardDescription>
            Manage product warranties and track claims
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredWarranties.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No warranties found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {warranties.length === 0 
                  ? "Get started by creating your first warranty"
                  : "Try adjusting your search or filter criteria"
                }
              </p>
              {warranties.length === 0 && (
                <Button onClick={handleAddWarranty}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Warranty
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">Warranty Details</th>
                    <th className="text-left p-3 font-semibold">Customer</th>
                    <th className="text-left p-3 font-semibold">Product</th>
                    <th className="text-center p-3 font-semibold">Status</th>
                    <th className="text-left p-3 font-semibold">Expiry Date</th>
                    <th className="text-center p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWarranties.map((warranty) => {
                    const currentStatus = getWarrantyStatus(warranty)
                    return (
                      <tr key={warranty.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="p-3">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{warranty.warrantyNumber || 'N/A'}</p>
                            <p className="text-sm text-gray-500">
                              {warranty.warrantyType || 'N/A'} • {warranty.duration || 0} {warranty.durationType || 'months'}
                            </p>
                          </div>
                        </td>
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{warranty.customerName || 'N/A'}</p>
                            {warranty.customerPhone && (
                              <div className="flex items-center text-sm text-gray-500">
                                <Phone className="h-3 w-3 mr-1" />
                                {warranty.customerPhone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{warranty.productName || 'N/A'}</p>
                            {warranty.serialNumber && (
                              <p className="text-sm text-gray-500 font-mono">{warranty.serialNumber}</p>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center justify-center space-x-1 ${getStatusColor(currentStatus)}`}>
                            {getStatusIcon(currentStatus)}
                            <span className="capitalize">{currentStatus}</span>
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center text-sm">
                            <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                            {warranty.expiryDate ? formatDate(warranty.expiryDate, 'short') : 'N/A'}
                          </div>
                          {currentStatus === 'expired' && (
                            <p className="text-xs text-red-600 dark:text-red-400">Expired</p>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewWarranty(warranty)}
                              title="View Details"
                              className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditWarranty(warranty)}
                              title="Edit Warranty"
                              className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {currentStatus === 'active' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleStatusUpdate(warranty.id, 'claimed')}
                                title="File Claim"
                                className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                              >
                                <AlertTriangle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteWarranty(warranty.id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                              title="Delete Warranty"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Warranty Form Modal */}
      {showWarrantyForm && (
        <WarrantyForm
          warranty={selectedWarranty}
          customers={customers}
          products={products}
          onSave={handleWarrantySave}
          onCancel={() => {
            setShowWarrantyForm(false)
            setSelectedWarranty(null)
          }}
        />
      )}

      {/* Warranty Details Modal */}
      {showWarrantyDetails && selectedWarranty && (
        <WarrantyDetails
          warranty={selectedWarranty}
          onClose={() => {
            setShowWarrantyDetails(false)
            setSelectedWarranty(null)
          }}
          onEdit={() => {
            setShowWarrantyDetails(false)
            setShowWarrantyForm(true)
          }}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </div>
  )
}

export default Warranty
