import React, { useState, useEffect, useRef } from 'react'
import { dbService, db } from '../../lib/database'
import { formatCurrency, formatDate, generateId, exportToCSV } from '../../lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import {
  Users,
  Plus,
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  ShoppingBag,
  Star
} from 'lucide-react'
import CustomerForm from './CustomerForm'
import CustomerDetails from './CustomerDetails'

const Customers = () => {
  const [customers, setCustomers] = useState([])
  const [filteredCustomers, setFilteredCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showCustomerForm, setShowCustomerForm] = useState(false)
  const [showCustomerDetails, setShowCustomerDetails] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const savingRef = useRef(false) // Prevent multiple simultaneous saves

  useEffect(() => {
    loadCustomerData()
  }, [])

  useEffect(() => {
    filterCustomers()
  }, [customers, searchQuery, typeFilter])

  const loadCustomerData = async () => {
    try {
      setLoading(true)
      const customerData = await dbService.readAll('customers')
      
      // Advanced deduplication: Remove duplicates by customerId, email, phone, or name+phone combination
      const seen = new Set()
      const uniqueCustomers = customerData.filter(customer => {
        // Create unique key based on multiple fields
        const key1 = customer.customerId ? `id:${customer.customerId}` : null
        const key2 = customer.email ? `email:${customer.email.toLowerCase().trim()}` : null
        const key3 = customer.phone ? `phone:${customer.phone.trim()}` : null
        const key4 = customer.name && customer.phone ? `name+phone:${customer.name.toLowerCase().trim()}+${customer.phone.trim()}` : null
        
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
      
      // Get all sales to calculate customer statistics
      const allSales = await dbService.readAll('sales')
      
      // Calculate customer statistics
      const customersWithStats = await Promise.all(
        uniqueCustomers.map(async (customer) => {
          // Filter sales for this customer (check both id and customerId)
          const sales = allSales.filter(sale => 
            sale.customerId === customer.id || 
            sale.customerId === customer.customerId ||
            sale.customerId?.toString() === customer.id?.toString()
          )
          const totalSpent = sales.reduce((sum, sale) => sum + (sale.total || 0), 0)
          const totalOrders = sales.length
          const lastPurchase = sales.length > 0 ? Math.max(...sales.map(s => new Date(s.date).getTime())) : null
          
          return {
            ...customer,
            totalSpent,
            totalOrders,
            lastPurchase: lastPurchase ? new Date(lastPurchase).toISOString() : null
          }
        })
      )
      
      setCustomers(customersWithStats)
    } catch (error) {
      console.error('Error loading customer data:', error)
      alert('Error loading customers: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const filterCustomers = () => {
    let filtered = [...customers]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(customer => 
        customer.name.toLowerCase().includes(query) ||
        customer.email?.toLowerCase().includes(query) ||
        customer.phone?.toLowerCase().includes(query) ||
        customer.address?.toLowerCase().includes(query)
      )
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(customer => customer.type === typeFilter)
    }

    setFilteredCustomers(filtered)
  }

  const handleAddCustomer = () => {
    setSelectedCustomer(null)
    setShowCustomerForm(true)
  }

  const handleEditCustomer = (customer) => {
    setSelectedCustomer(customer)
    setShowCustomerForm(true)
  }

  const handleViewCustomer = (customer) => {
    setSelectedCustomer(customer)
    setShowCustomerDetails(true)
  }

  const handleDeleteCustomer = async (customerId) => {
    if (!customerId) {
      alert('Invalid customer ID')
      return
    }
    
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await dbService.delete('customers', customerId)
        await loadCustomerData()
      } catch (error) {
        console.error('Error deleting customer:', error)
        alert('Error deleting customer: ' + (error.message || 'Unknown error'))
      }
    }
  }

  const handleCustomerSave = async (customerData) => {
    // Prevent multiple simultaneous saves
    if (savingRef.current) {
      console.warn('Save already in progress, ignoring duplicate call')
      return
    }
    
    try {
      savingRef.current = true
      
      // Check for duplicate customer by customerId, email, or phone before creating
      if (!selectedCustomer) {
        // Use toArray() and filter in memory to avoid index errors
        const allCustomers = await db.customers.toArray()
        
        // Normalize data for comparison
        const normalizedEmail = customerData.email?.toLowerCase().trim()
        const normalizedPhone = customerData.phone?.trim()
        const normalizedName = customerData.name?.toLowerCase().trim()
        
        const existingByCustomerId = customerData.customerId 
          ? allCustomers.find(c => c.customerId === customerData.customerId)
          : null
        
        const existingByEmail = normalizedEmail
          ? allCustomers.find(c => c.email?.toLowerCase().trim() === normalizedEmail)
          : null
        
        const existingByPhone = normalizedPhone
          ? allCustomers.find(c => c.phone?.trim() === normalizedPhone)
          : null
        
        // Also check name + phone combination
        const existingByNamePhone = normalizedName && normalizedPhone
          ? allCustomers.find(c => 
              c.name?.toLowerCase().trim() === normalizedName && 
              c.phone?.trim() === normalizedPhone
            )
          : null
        
        if (existingByCustomerId || existingByEmail || existingByPhone || existingByNamePhone) {
          alert('Customer already exists with this ID, email, phone number, or name+phone combination')
          throw new Error('Duplicate customer')
        }
      }
      
      if (selectedCustomer) {
        await dbService.update('customers', selectedCustomer.id, customerData)
      } else {
        const newCustomer = {
          ...customerData,
          customerId: customerData.customerId || generateId('CUST'),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        await dbService.create('customers', newCustomer)
      }
      
      // Reload data after a short delay to ensure database write is complete
      await new Promise(resolve => setTimeout(resolve, 100))
      await loadCustomerData()
      
      setShowCustomerForm(false)
      setSelectedCustomer(null)
    } catch (error) {
      console.error('Error saving customer:', error)
      if (!error.message.includes('Duplicate')) {
        alert('Error saving customer: ' + (error.message || 'Unknown error'))
      }
      throw error // Re-throw to let form handle it
    } finally {
      savingRef.current = false
    }
  }

  const handleExportCSV = () => {
    const exportData = filteredCustomers.map(customer => ({
      'Customer ID': customer.customerId,
      'Name': customer.name,
      'Email': customer.email || '',
      'Phone': customer.phone || '',
      'Address': customer.address || '',
      'Type': customer.type || 'regular',
      'Total Spent': customer.totalSpent || 0,
      'Total Orders': customer.totalOrders || 0,
      'Last Purchase': customer.lastPurchase ? formatDate(customer.lastPurchase, 'short') : 'Never',
      'Created Date': formatDate(customer.createdAt, 'short')
    }))
    
    exportToCSV(exportData, `customers_${new Date().toISOString().split('T')[0]}`)
  }

  const getCustomerTypeColor = (type) => {
    switch (type) {
      case 'vip': return 'text-purple-400 bg-purple-900/20 dark:bg-purple-900/30'
      case 'premium': return 'text-blue-400 bg-blue-900/20 dark:bg-blue-900/30'
      case 'regular': return 'text-green-400 bg-green-900/20 dark:bg-green-900/30'
      default: return 'text-gray-400 bg-gray-900/20 dark:bg-gray-900/30'
    }
  }

  const getCustomerTypeIcon = (type) => {
    switch (type) {
      case 'vip': return <Star className="h-4 w-4" />
      case 'premium': return <User className="h-4 w-4" />
      case 'regular': return <Users className="h-4 w-4" />
      default: return <User className="h-4 w-4" />
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

  const totalCustomers = customers.length
  const vipCustomers = customers.filter(c => c.type === 'vip').length
  const totalRevenue = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0)
  const avgOrderValue = totalCustomers > 0 ? totalRevenue / customers.reduce((sum, c) => sum + (c.totalOrders || 0), 0) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Customer Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage customer information and purchase history</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={handleAddCustomer}>
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Customers</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCustomers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">VIP Customers</p>
                <p className="text-2xl font-bold text-purple-600">{vipCustomers}</p>
              </div>
              <Star className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
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
              <ShoppingBag className="h-8 w-8 text-orange-500" />
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
                  placeholder="Search customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Customer Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="all">All Types</option>
                <option value="regular">Regular</option>
                <option value="premium">Premium</option>
                <option value="vip">VIP</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={loadCustomerData} className="w-full">
                <Search className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer List */}
      <Card>
        <CardHeader>
          <CardTitle>Customers ({filteredCustomers.length})</CardTitle>
          <CardDescription>
            Manage customer information and view purchase history
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No customers found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {customers.length === 0 
                  ? "Get started by adding your first customer"
                  : "Try adjusting your search or filter criteria"
                }
              </p>
              {customers.length === 0 && (
                <Button onClick={handleAddCustomer}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Customer
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">Customer</th>
                    <th className="text-left p-3 font-semibold">Contact</th>
                    <th className="text-center p-3 font-semibold">Type</th>
                    <th className="text-right p-3 font-semibold">Total Spent</th>
                    <th className="text-center p-3 font-semibold">Orders</th>
                    <th className="text-left p-3 font-semibold">Last Purchase</th>
                    <th className="text-center p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="p-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{customer.name}</p>
                          <p className="text-sm text-gray-500">ID: {customer.customerId}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          {customer.email && (
                            <div className="flex items-center text-sm">
                              <Mail className="h-3 w-3 mr-1 text-gray-400" />
                              {customer.email}
                            </div>
                          )}
                          {customer.phone && (
                            <div className="flex items-center text-sm">
                              <Phone className="h-3 w-3 mr-1 text-gray-400" />
                              {customer.phone}
                            </div>
                          )}
                          {customer.address && (
                            <div className="flex items-center text-sm">
                              <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                              {customer.address.substring(0, 30)}...
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center justify-center space-x-1 ${getCustomerTypeColor(customer.type)}`}>
                          {getCustomerTypeIcon(customer.type)}
                          <span className="capitalize">{customer.type || 'regular'}</span>
                        </span>
                      </td>
                      <td className="p-3 text-right font-semibold">
                        {formatCurrency(customer.totalSpent || 0)}
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-semibold">{customer.totalOrders || 0}</span>
                      </td>
                      <td className="p-3">
                        {customer.lastPurchase ? (
                          <div className="flex items-center text-sm">
                            <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                            {formatDate(customer.lastPurchase, 'short')}
                          </div>
                        ) : (
                          <span className="text-gray-500 text-sm">Never</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewCustomer(customer)}
                            title="View Details"
                            className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <User className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditCustomer(customer)}
                            title="Edit Customer"
                            className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCustomer(customer.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Delete Customer"
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

      {/* Customer Form Modal */}
      {showCustomerForm && (
        <CustomerForm
          customer={selectedCustomer}
          onSave={handleCustomerSave}
          onCancel={() => {
            setShowCustomerForm(false)
            setSelectedCustomer(null)
          }}
        />
      )}

      {/* Customer Details Modal */}
      {showCustomerDetails && selectedCustomer && (
        <CustomerDetails
          customer={selectedCustomer}
          onClose={() => {
            setShowCustomerDetails(false)
            setSelectedCustomer(null)
          }}
          onEdit={() => {
            setShowCustomerDetails(false)
            setShowCustomerForm(true)
          }}
        />
      )}
    </div>
  )
}

export default Customers
