import React from 'react'
import { formatCurrency, formatDate } from '../../lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { 
  X, 
  Edit, 
  Shield, 
  User, 
  Phone, 
  Mail, 
  Package,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileText
} from 'lucide-react'

const WarrantyDetails = ({ warranty, onClose, onEdit, onStatusUpdate }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50 border-green-200'
      case 'expired': return 'text-red-600 bg-red-50 border-red-200'
      case 'claimed': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'processing': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'approved': return 'text-purple-600 bg-purple-50 border-purple-200'
      case 'rejected': return 'text-red-600 bg-red-50 border-red-200'
      case 'completed': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <Shield className="h-5 w-5" />
      case 'expired': return <XCircle className="h-5 w-5" />
      case 'claimed': return <AlertTriangle className="h-5 w-5" />
      case 'processing': return <Clock className="h-5 w-5" />
      case 'approved': return <CheckCircle className="h-5 w-5" />
      case 'rejected': return <XCircle className="h-5 w-5" />
      case 'completed': return <CheckCircle className="h-5 w-5" />
      default: return <FileText className="h-5 w-5" />
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

  const handleStatusChange = (newStatus) => {
    if (window.confirm(`Are you sure you want to change status to ${newStatus}?`)) {
      onStatusUpdate(warranty.id, newStatus)
    }
  }

  const currentStatus = getWarrantyStatus(warranty)
  const isExpired = warranty?.expiryDate ? new Date(warranty.expiryDate) < new Date() : false
  const daysRemaining = warranty?.expiryDate ? Math.ceil((new Date(warranty.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)) : 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Warranty Details
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
          {/* Warranty Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Warranty Information */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Warranty Information</span>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center space-x-2 ${getStatusColor(currentStatus)}`}>
                      {getStatusIcon(currentStatus)}
                      <span className="capitalize">{currentStatus}</span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Warranty Number</label>
                      <p className="font-mono text-sm">{warranty.warrantyNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Warranty Type</label>
                      <p className="capitalize">{warranty.warrantyType || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Duration</label>
                      <p>{warranty.duration || 0} {warranty.durationType || 'months'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Created Date</label>
                      <p>{warranty.createdAt ? formatDate(warranty.createdAt, 'long') : 'N/A'}</p>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div>
                    <h4 className="font-semibold mb-3">Customer Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Name</label>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <p>{warranty.customerName || 'N/A'}</p>
                        </div>
                      </div>
                      {warranty.customerPhone && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Phone</label>
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <p>{warranty.customerPhone}</p>
                          </div>
                        </div>
                      )}
                      {warranty.customerEmail && (
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium text-gray-500">Email</label>
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <p>{warranty.customerEmail}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Product Information */}
                  <div>
                    <h4 className="font-semibold mb-3">Product Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Product Name</label>
                        <div className="flex items-center space-x-2">
                          <Package className="h-4 w-4 text-gray-400" />
                          <p>{warranty.productName || 'N/A'}</p>
                        </div>
                      </div>
                      {warranty.serialNumber && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Serial Number</label>
                          <p className="font-mono text-sm">{warranty.serialNumber}</p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-gray-500">Purchase Date</label>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <p>{warranty.purchaseDate ? formatDate(warranty.purchaseDate, 'long') : 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Warranty Status */}
            <div className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-3">
                      <Calendar className="h-8 w-8 text-blue-500" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">Start Date</p>
                    <p className="text-lg font-bold text-gray-900">{formatDate(warranty.startDate, 'short')}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-3">
                      <Calendar className="h-8 w-8 text-red-500" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">Expiry Date</p>
                    <p className="text-lg font-bold text-gray-900">{formatDate(warranty.expiryDate, 'short')}</p>
                    {!isExpired && daysRemaining > 0 && (
                      <p className="text-sm text-green-600 mt-1">{daysRemaining} days remaining</p>
                    )}
                    {isExpired && (
                      <p className="text-sm text-red-600 mt-1">Expired</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {warranty.claimAmount > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-3">
                        <DollarSign className="h-8 w-8 text-green-500" />
                      </div>
                      <p className="text-sm font-medium text-gray-600">Claim Amount</p>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(warranty.claimAmount)}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Status Actions */}
              {currentStatus !== 'completed' && currentStatus !== 'expired' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {currentStatus === 'active' && (
                      <Button 
                        onClick={() => handleStatusChange('claimed')} 
                        className="w-full"
                        size="sm"
                      >
                        File Claim
                      </Button>
                    )}
                    {currentStatus === 'claimed' && (
                      <>
                        <Button 
                          onClick={() => handleStatusChange('processing')} 
                          className="w-full"
                          size="sm"
                        >
                          Start Processing
                        </Button>
                        <Button 
                          onClick={() => handleStatusChange('rejected')} 
                          variant="outline"
                          className="w-full"
                          size="sm"
                        >
                          Reject Claim
                        </Button>
                      </>
                    )}
                    {currentStatus === 'processing' && (
                      <>
                        <Button 
                          onClick={() => handleStatusChange('approved')} 
                          className="w-full"
                          size="sm"
                        >
                          Approve Claim
                        </Button>
                        <Button 
                          onClick={() => handleStatusChange('rejected')} 
                          variant="outline"
                          className="w-full"
                          size="sm"
                        >
                          Reject Claim
                        </Button>
                      </>
                    )}
                    {currentStatus === 'approved' && (
                      <Button 
                        onClick={() => handleStatusChange('completed')} 
                        className="w-full"
                        size="sm"
                      >
                        Mark Complete
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Claim Information */}
          {warranty.claimDescription && (
            <Card>
              <CardHeader>
                <CardTitle>Claim Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Claim Description</label>
                  <p className="text-sm bg-blue-50 p-3 rounded-lg">{warranty.claimDescription}</p>
                </div>
                
                {warranty.claimAmount > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Claim Amount</label>
                    <p className="text-lg font-semibold text-green-600">{formatCurrency(warranty.claimAmount)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Terms and Notes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {warranty.terms && (
              <Card>
                <CardHeader>
                  <CardTitle>Warranty Terms</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm bg-gray-50 p-3 rounded-lg">{warranty.terms}</p>
                </CardContent>
              </Card>
            )}

            {warranty.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm bg-yellow-50 p-3 rounded-lg">{warranty.notes}</p>
                </CardContent>
              </Card>
            )}

            {!warranty.terms && !warranty.notes && (
              <Card className="lg:col-span-2">
                <CardContent className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-500">No additional terms or notes</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Warranty Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">Warranty Created</p>
                    <p className="text-sm text-gray-500">{formatDate(warranty.createdAt, 'long')}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">Warranty Started</p>
                    <p className="text-sm text-gray-500">{formatDate(warranty.startDate, 'long')}</p>
                  </div>
                </div>

                {warranty.status === 'claimed' && (
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">Claim Filed</p>
                      <p className="text-sm text-gray-500">Warranty claim has been submitted</p>
                    </div>
                  </div>
                )}

                {warranty.status === 'processing' && (
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">Claim Processing</p>
                      <p className="text-sm text-gray-500">Claim is being reviewed</p>
                    </div>
                  </div>
                )}

                {warranty.approvedAt && (
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">Claim Approved</p>
                      <p className="text-sm text-gray-500">{formatDate(warranty.approvedAt, 'long')}</p>
                    </div>
                  </div>
                )}

                {warranty.completedAt && (
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">Warranty Completed</p>
                      <p className="text-sm text-gray-500">{formatDate(warranty.completedAt, 'long')}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${isExpired ? 'bg-red-500' : 'bg-gray-300'}`}></div>
                  <div>
                    <p className="font-medium">Warranty {isExpired ? 'Expired' : 'Expires'}</p>
                    <p className="text-sm text-gray-500">{formatDate(warranty.expiryDate, 'long')}</p>
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

export default WarrantyDetails
