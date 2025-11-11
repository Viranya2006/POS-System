import React, { useState, useEffect } from 'react'
import { dbService } from '../../lib/database'
import { formatCurrency, formatDate } from '../../lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { 
  X, 
  Edit, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Star, 
  ShoppingBag,
  DollarSign,
  Gift
} from 'lucide-react'

const CustomerDetails = ({ customer, onClose, onEdit }) => {
  const [customerSales, setCustomerSales] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCustomerSales()
  }, [customer.id])

  const loadCustomerSales = async () => {
    try {
      setLoading(true)
      const sales = await dbService.readAll('sales', { customerId: customer.id })
      setCustomerSales(sales.sort((a, b) => new Date(b.date) - new Date(a.date)))
    } catch (error) {
      console.error('Error loading customer sales:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCustomerTypeColor = (type) => {
    switch (type) {
      case 'vip': return 'text-purple-600 bg-purple-50 border-purple-200'
      case 'premium': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'regular': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getCustomerTypeIcon = (type) => {
    switch (type) {
      case 'vip': return <Star className="h-5 w-5" />
      case 'premium': return <Gift className="h-5 w-5" />
      case 'regular': return <User className="h-5 w-5" />
      default: return <User className="h-5 w-5" />
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            Customer Details
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
          {/* Customer Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Customer Info */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Customer Information</span>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center space-x-2 ${getCustomerTypeColor(customer.type)}`}>
                      {getCustomerTypeIcon(customer.type)}
                      <span className="capitalize">{customer.type || 'regular'}</span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Customer ID</label>
                      <p className="font-mono text-sm">{customer.customerId}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Full Name</label>
                      <p className="font-semibold">{customer.name}</p>
                    </div>
                    {customer.email && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Email</label>
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <p>{customer.email}</p>
                        </div>
                      </div>
                    )}
                    {customer.phone && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Phone</label>
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <p>{customer.phone}</p>
                        </div>
                      </div>
                    )}
                    {customer.dateOfBirth && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Date of Birth</label>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <p>{formatDate(customer.dateOfBirth, 'long')}</p>
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-gray-500">Member Since</label>
                      <p>{formatDate(customer.createdAt, 'long')}</p>
                    </div>
                  </div>

                  {(customer.address || customer.city || customer.state) && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Address</label>
                      <div className="flex items-start space-x-2">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          {customer.address && <p>{customer.address}</p>}
                          {(customer.city || customer.state || customer.zipCode) && (
                            <p>{[customer.city, customer.state, customer.zipCode].filter(Boolean).join(', ')}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {customer.notes && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Notes</label>
                      <p className="text-sm bg-gray-50 p-3 rounded-lg">{customer.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Customer Stats */}
            <div className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Spent</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(customer.totalSpent || 0)}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Orders</p>
                      <p className="text-2xl font-bold text-blue-600">{customer.totalOrders || 0}</p>
                    </div>
                    <ShoppingBag className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {customer.totalOrders > 0 
                          ? formatCurrency((customer.totalSpent || 0) / customer.totalOrders)
                          : formatCurrency(0)
                        }
                      </p>
                    </div>
                    <Star className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              {customer.loyaltyPoints > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Loyalty Points</p>
                        <p className="text-2xl font-bold text-orange-600">{customer.loyaltyPoints}</p>
                      </div>
                      <Gift className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Purchase History */}
          <Card>
            <CardHeader>
              <CardTitle>Purchase History</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : customerSales.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-500">No purchase history found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {customerSales.slice(0, 10).map((sale) => (
                    <div key={sale.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div>
                        <p className="font-medium">Invoice #{sale.invoiceNo}</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(sale.date, 'long')} • {sale.items?.length || 0} items
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(sale.total)}</p>
                        <p className="text-sm text-gray-500 capitalize">{sale.paymentMethod}</p>
                      </div>
                    </div>
                  ))}
                  
                  {customerSales.length > 10 && (
                    <div className="text-center pt-3">
                      <p className="text-sm text-gray-500">
                        Showing 10 of {customerSales.length} transactions
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}

export default CustomerDetails
