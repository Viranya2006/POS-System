import React, { useState, useEffect } from 'react'
import { dbService } from '../../lib/database'
import { formatCurrency, formatDate } from '../../lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { 
  X, 
  Edit, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Star, 
  Package,
  DollarSign,
  Globe,
  FileText,
  AlertCircle
} from 'lucide-react'

const SupplierDetails = ({ supplier, onClose, onEdit }) => {
  const [supplierOrders, setSupplierOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSupplierOrders()
  }, [supplier.id])

  const loadSupplierOrders = async () => {
    try {
      setLoading(true)
      const grns = await dbService.readAll('grn', { supplierId: supplier.id })
      setSupplierOrders(grns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
    } catch (error) {
      console.error('Error loading supplier orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSupplierStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50 border-green-200'
      case 'inactive': return 'text-red-600 bg-red-50 border-red-200'
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getSupplierStatusIcon = (status) => {
    switch (status) {
      case 'active': return <Star className="h-5 w-5" />
      case 'inactive': return <AlertCircle className="h-5 w-5" />
      case 'pending': return <Calendar className="h-5 w-5" />
      default: return <Building2 className="h-5 w-5" />
    }
  }

  const getOrderStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50'
      case 'partial': return 'text-blue-600 bg-blue-50'
      case 'received': return 'text-green-600 bg-green-50'
      case 'cancelled': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <Building2 className="h-5 w-5 mr-2" />
            Supplier Details
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
          {/* Supplier Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Supplier Info */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Supplier Information</span>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center space-x-2 ${getSupplierStatusColor(supplier.status)}`}>
                      {getSupplierStatusIcon(supplier.status)}
                      <span className="capitalize">{supplier.status || 'active'}</span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Supplier ID</label>
                      <p className="font-mono text-sm">{supplier.supplierId}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Company Name</label>
                      <p className="font-semibold">{supplier.name}</p>
                    </div>
                    {supplier.contactPerson && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Contact Person</label>
                        <p>{supplier.contactPerson}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-gray-500">Member Since</label>
                      <p>{formatDate(supplier.createdAt, 'long')}</p>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {supplier.email && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Email</label>
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <p>{supplier.email}</p>
                        </div>
                      </div>
                    )}
                    {supplier.phone && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Phone</label>
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <p>{supplier.phone}</p>
                        </div>
                      </div>
                    )}
                    {supplier.website && (
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-500">Website</label>
                        <div className="flex items-center space-x-2">
                          <Globe className="h-4 w-4 text-gray-400" />
                          <a 
                            href={supplier.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {supplier.website}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Address */}
                  {(supplier.address || supplier.city || supplier.state) && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Address</label>
                      <div className="flex items-start space-x-2">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          {supplier.address && <p>{supplier.address}</p>}
                          {(supplier.city || supplier.state || supplier.zipCode) && (
                            <p>{[supplier.city, supplier.state, supplier.zipCode].filter(Boolean).join(', ')}</p>
                          )}
                          {supplier.country && <p>{supplier.country}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Business Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {supplier.paymentTerms && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Payment Terms</label>
                        <p className="capitalize">{supplier.paymentTerms.replace('-', ' ')}</p>
                      </div>
                    )}
                    {supplier.taxId && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Tax ID</label>
                        <p className="font-mono text-sm">{supplier.taxId}</p>
                      </div>
                    )}
                  </div>

                  {supplier.notes && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Notes</label>
                      <p className="text-sm bg-gray-50 p-3 rounded-lg">{supplier.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Supplier Stats */}
            <div className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Orders</p>
                      <p className="text-2xl font-bold text-blue-600">{supplier.totalOrders || 0}</p>
                    </div>
                    <Package className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Value</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(supplier.totalValue || 0)}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {supplier.totalOrders > 0 
                          ? formatCurrency((supplier.totalValue || 0) / supplier.totalOrders)
                          : formatCurrency(0)
                        }
                      </p>
                    </div>
                    <Star className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Last Order</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {supplier.lastOrder 
                          ? formatDate(supplier.lastOrder, 'short')
                          : 'Never'
                        }
                      </p>
                    </div>
                    <Calendar className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Order History */}
          <Card>
            <CardHeader>
              <CardTitle>Order History (GRNs)</CardTitle>
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
              ) : supplierOrders.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-500">No orders found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {supplierOrders.slice(0, 10).map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div>
                        <p className="font-medium">GRN #{order.grnNumber}</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(order.createdAt, 'long')} • {order.items?.length || 0} items
                        </p>
                        {order.poNumber && (
                          <p className="text-sm text-gray-500">PO: {order.poNumber}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(order.totalAmount || 0)}</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getOrderStatusColor(order.status)}`}>
                          {order.status || 'pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {supplierOrders.length > 10 && (
                    <div className="text-center pt-3">
                      <p className="text-sm text-gray-500">
                        Showing 10 of {supplierOrders.length} orders
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

export default SupplierDetails
