import React, { useState, useEffect, useRef } from 'react'
import { dbService, db } from '../../lib/database'
import { formatCurrency, formatDate, generateId, exportToCSV } from '../../lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import {
  Building2,
  Plus,
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  Package,
  Star,
  AlertCircle
} from 'lucide-react'
import SupplierForm from './SupplierForm'
import SupplierDetails from './SupplierDetails'

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([])
  const [filteredSuppliers, setFilteredSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showSupplierForm, setShowSupplierForm] = useState(false)
  const [showSupplierDetails, setShowSupplierDetails] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const savingRef = useRef(false) // Prevent multiple simultaneous saves

  useEffect(() => {
    loadSupplierData()
  }, [])

  useEffect(() => {
    filterSuppliers()
  }, [suppliers, searchQuery, statusFilter])

  const loadSupplierData = async () => {
    try {
      setLoading(true)
      const supplierData = await dbService.readAll('suppliers')
      
      // Advanced deduplication: Remove duplicates by supplierId, email, phone, or name+phone combination
      const seen = new Set()
      const uniqueSuppliers = supplierData.filter(supplier => {
        // Create unique key based on multiple fields
        const key1 = supplier.supplierId ? `id:${supplier.supplierId}` : null
        const key2 = supplier.email ? `email:${supplier.email.toLowerCase().trim()}` : null
        const key3 = supplier.phone ? `phone:${supplier.phone.trim()}` : null
        const key4 = supplier.name && supplier.phone ? `name+phone:${supplier.name.toLowerCase().trim()}+${supplier.phone.trim()}` : null
        
        // Check if we've seen any of these keys before
        if (key1 && seen.has(key1)) return false
        if (key2 && seen.has(key2)) return false
        if (key3 && seen.has(key3)) return false
        if (key4 && seen.has(key4)) return false
        
        // Add all keys to seen set
        if (key1) seen.add(key1)
        if (key2) seen.add(key2)
        if (key3) seen.add(key3)
        if (key4) seen.add(key4)
        
        return true
      })
      
      // Get all GRNs to calculate supplier statistics
      const allGrns = await dbService.readAll('grn')
      
      // Calculate supplier statistics
      const suppliersWithStats = await Promise.all(
        uniqueSuppliers.map(async (supplier) => {
          // Filter GRNs for this supplier (check both id and supplierId)
          const grns = allGrns.filter(grn => 
            grn.supplierId === supplier.id || 
            grn.supplierId === supplier.supplierId ||
            grn.supplierId?.toString() === supplier.id?.toString()
          )
          const totalOrders = grns.length
          const totalValue = grns.reduce((sum, grn) => sum + (grn.totalAmount || grn.total || 0), 0)
          const lastOrder = grns.length > 0 ? Math.max(...grns.map(g => new Date(g.createdAt || g.date).getTime())) : null
          
          return {
            ...supplier,
            totalOrders,
            totalValue,
            lastOrder: lastOrder ? new Date(lastOrder).toISOString() : null
          }
        })
      )
      
      setSuppliers(suppliersWithStats)
    } catch (error) {
      console.error('Error loading supplier data:', error)
      alert('Error loading suppliers: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const filterSuppliers = () => {
    let filtered = [...suppliers]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(supplier => 
        supplier.name.toLowerCase().includes(query) ||
        supplier.email?.toLowerCase().includes(query) ||
        supplier.phone?.toLowerCase().includes(query) ||
        supplier.contactPerson?.toLowerCase().includes(query)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(supplier => supplier.status === statusFilter)
    }

    setFilteredSuppliers(filtered)
  }

  const handleAddSupplier = () => {
    setSelectedSupplier(null)
    setShowSupplierForm(true)
  }

  const handleEditSupplier = (supplier) => {
    setSelectedSupplier(supplier)
    setShowSupplierForm(true)
  }

  const handleViewSupplier = (supplier) => {
    setSelectedSupplier(supplier)
    setShowSupplierDetails(true)
  }

  const handleDeleteSupplier = async (supplierId) => {
    if (!supplierId) {
      alert('Invalid supplier ID')
      return
    }
    
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        await dbService.delete('suppliers', supplierId)
        await loadSupplierData()
      } catch (error) {
        console.error('Error deleting supplier:', error)
        alert('Error deleting supplier: ' + (error.message || 'Unknown error'))
      }
    }
  }

  const handleSupplierSave = async (supplierData) => {
    // Prevent multiple simultaneous saves
    if (savingRef.current) {
      console.warn('Save already in progress, ignoring duplicate call')
      return
    }
    
    try {
      savingRef.current = true
      
      // Check for duplicate supplier by supplierId, email, or phone before creating
      if (!selectedSupplier) {
        // Use toArray() and filter in memory to avoid index errors
        const allSuppliers = await db.suppliers.toArray()
        
        // Normalize data for comparison
        const normalizedEmail = supplierData.email?.toLowerCase().trim()
        const normalizedPhone = supplierData.phone?.trim()
        const normalizedName = supplierData.name?.toLowerCase().trim()
        
        const existingBySupplierId = supplierData.supplierId 
          ? allSuppliers.find(s => s.supplierId === supplierData.supplierId)
          : null
        
        const existingByEmail = normalizedEmail
          ? allSuppliers.find(s => s.email?.toLowerCase().trim() === normalizedEmail)
          : null
        
        const existingByPhone = normalizedPhone
          ? allSuppliers.find(s => s.phone?.trim() === normalizedPhone)
          : null
        
        // Also check name + phone combination
        const existingByNamePhone = normalizedName && normalizedPhone
          ? allSuppliers.find(s => 
              s.name?.toLowerCase().trim() === normalizedName && 
              s.phone?.trim() === normalizedPhone
            )
          : null
        
        if (existingBySupplierId || existingByEmail || existingByPhone || existingByNamePhone) {
          alert('Supplier already exists with this ID, email, phone number, or name+phone combination')
          throw new Error('Duplicate supplier')
        }
      }
      
      if (selectedSupplier) {
        await dbService.update('suppliers', selectedSupplier.id, supplierData)
      } else {
        const newSupplier = {
          ...supplierData,
          supplierId: supplierData.supplierId || generateId('SUP'),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        await dbService.create('suppliers', newSupplier)
      }
      
      // Reload data after a short delay to ensure database write is complete
      await new Promise(resolve => setTimeout(resolve, 100))
      await loadSupplierData()
      
      setShowSupplierForm(false)
      setSelectedSupplier(null)
    } catch (error) {
      console.error('Error saving supplier:', error)
      if (!error.message.includes('Duplicate')) {
        alert('Error saving supplier: ' + (error.message || 'Unknown error'))
      }
      throw error // Re-throw to let form handle it
    } finally {
      savingRef.current = false
    }
  }

  const handleExportCSV = () => {
    const exportData = filteredSuppliers.map(supplier => ({
      'Supplier ID': supplier.supplierId,
      'Name': supplier.name,
      'Contact Person': supplier.contactPerson || '',
      'Email': supplier.email || '',
      'Phone': supplier.phone || '',
      'Address': supplier.address || '',
      'Status': supplier.status || 'active',
      'Total Orders': supplier.totalOrders || 0,
      'Total Value': supplier.totalValue || 0,
      'Last Order': supplier.lastOrder ? formatDate(supplier.lastOrder, 'short') : 'Never',
      'Created Date': formatDate(supplier.createdAt, 'short')
    }))
    
    exportToCSV(exportData, `suppliers_${new Date().toISOString().split('T')[0]}`)
  }

  const getSupplierStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-900/20 dark:bg-green-900/30'
      case 'inactive': return 'text-red-400 bg-red-900/20 dark:bg-red-900/30'
      case 'pending': return 'text-yellow-400 bg-yellow-900/20 dark:bg-yellow-900/30'
      default: return 'text-gray-400 bg-gray-900/20 dark:bg-gray-900/30'
    }
  }

  const getSupplierStatusIcon = (status) => {
    switch (status) {
      case 'active': return <Star className="h-4 w-4" />
      case 'inactive': return <AlertCircle className="h-4 w-4" />
      case 'pending': return <Calendar className="h-4 w-4" />
      default: return <Building2 className="h-4 w-4" />
    }
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

  const totalSuppliers = suppliers.length
  const activeSuppliers = suppliers.filter(s => s.status === 'active').length
  const totalValue = suppliers.reduce((sum, s) => sum + (s.totalValue || 0), 0)
  const avgOrderValue = suppliers.reduce((sum, s) => sum + (s.totalOrders || 0), 0) > 0 
    ? totalValue / suppliers.reduce((sum, s) => sum + (s.totalOrders || 0), 0) 
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Supplier Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage supplier information and purchase orders</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={handleAddSupplier}>
            <Plus className="h-4 w-4 mr-2" />
            Add Supplier
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Suppliers</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalSuppliers}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Suppliers</p>
                <p className="text-2xl font-bold text-green-600">{activeSuppliers}</p>
              </div>
              <Star className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Purchase Value</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(totalValue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Order Value</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(avgOrderValue)}</p>
              </div>
              <Package className="h-8 w-8 text-orange-500" />
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
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search suppliers..."
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
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={loadSupplierData} className="w-full">
                <Search className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supplier List */}
      <Card>
        <CardHeader>
          <CardTitle>Suppliers ({filteredSuppliers.length})</CardTitle>
          <CardDescription>
            Manage supplier information and track purchase orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSuppliers.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No suppliers found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {suppliers.length === 0 
                  ? "Get started by adding your first supplier"
                  : "Try adjusting your search or filter criteria"
                }
              </p>
              {suppliers.length === 0 && (
                <Button onClick={handleAddSupplier}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Supplier
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Supplier</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Contact</th>
                    <th className="text-center p-3 font-semibold text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-right p-3 font-semibold text-gray-700 dark:text-gray-300">Total Value</th>
                    <th className="text-center p-3 font-semibold text-gray-700 dark:text-gray-300">Orders</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Last Order</th>
                    <th className="text-center p-3 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="p-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{supplier.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">ID: {supplier.supplierId}</p>
                          {supplier.contactPerson && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">Contact: {supplier.contactPerson}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          {supplier.email && (
                            <div className="flex items-center text-sm text-gray-900 dark:text-white">
                              <Mail className="h-3 w-3 mr-1 text-gray-400" />
                              {supplier.email}
                            </div>
                          )}
                          {supplier.phone && (
                            <div className="flex items-center text-sm text-gray-900 dark:text-white">
                              <Phone className="h-3 w-3 mr-1 text-gray-400" />
                              {supplier.phone}
                            </div>
                          )}
                          {supplier.address && (
                            <div className="flex items-center text-sm text-gray-900 dark:text-white">
                              <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                              {supplier.address.substring(0, 30)}...
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center justify-center space-x-1 ${getSupplierStatusColor(supplier.status)}`}>
                          {getSupplierStatusIcon(supplier.status)}
                          <span className="capitalize">{supplier.status || 'active'}</span>
                        </span>
                      </td>
                      <td className="p-3 text-right font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(supplier.totalValue || 0)}
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-semibold text-gray-900 dark:text-white">{supplier.totalOrders || 0}</span>
                      </td>
                      <td className="p-3">
                        {supplier.lastOrder ? (
                          <div className="flex items-center text-sm text-gray-900 dark:text-white">
                            <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                            {formatDate(supplier.lastOrder, 'short')}
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
                            onClick={() => handleViewSupplier(supplier)}
                            title="View Details"
                            className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Building2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditSupplier(supplier)}
                            className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            title="Edit Supplier"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteSupplier(supplier.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Delete Supplier"
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

      {/* Supplier Form Modal */}
      {showSupplierForm && (
        <SupplierForm
          supplier={selectedSupplier}
          onSave={handleSupplierSave}
          onCancel={() => {
            setShowSupplierForm(false)
            setSelectedSupplier(null)
          }}
        />
      )}

      {/* Supplier Details Modal */}
      {showSupplierDetails && selectedSupplier && (
        <SupplierDetails
          supplier={selectedSupplier}
          onClose={() => {
            setShowSupplierDetails(false)
            setSelectedSupplier(null)
          }}
          onEdit={() => {
            setShowSupplierDetails(false)
            setShowSupplierForm(true)
          }}
        />
      )}
    </div>
  )
}

export default Suppliers
