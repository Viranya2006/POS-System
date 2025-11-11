import React from 'react'
import { formatCurrency, formatDate } from '../../lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { 
  X, 
  Edit, 
  Wrench, 
  User, 
  Phone, 
  Mail, 
  Smartphone,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  Settings,
  FileText
} from 'lucide-react'

const JobDetails = ({ job, onClose, onEdit, onStatusUpdate }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'in-progress': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'waiting-parts': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'completed': return 'text-green-600 bg-green-50 border-green-200'
      case 'cancelled': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="h-5 w-5" />
      case 'in-progress': return <Settings className="h-5 w-5" />
      case 'waiting-parts': return <AlertTriangle className="h-5 w-5" />
      case 'completed': return <CheckCircle className="h-5 w-5" />
      case 'cancelled': return <X className="h-5 w-5" />
      default: return <FileText className="h-5 w-5" />
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50'
      case 'high': return 'text-orange-600 bg-orange-50'
      case 'medium': return 'text-blue-600 bg-blue-50'
      case 'low': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const handleStatusChange = (newStatus) => {
    if (window.confirm(`Are you sure you want to change status to ${newStatus}?`)) {
      onStatusUpdate(job.id, newStatus)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <Wrench className="h-5 w-5 mr-2" />
            Service Job Details
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
          {/* Job Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Job Information */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Job Information</span>
                    <div className="flex space-x-2">
                      <div className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center space-x-2 ${getStatusColor(job.status)}`}>
                        {getStatusIcon(job.status)}
                        <span className="capitalize">{job.status?.replace('-', ' ')}</span>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(job.priority)}`}>
                        <span className="capitalize">{job.priority}</span>
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Job Number</label>
                      <p className="font-mono text-sm">{job.jobNumber}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Created Date</label>
                      <p>{formatDate(job.createdAt, 'long')}</p>
                    </div>
                    {job.completedAt && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Completed Date</label>
                        <p>{formatDate(job.completedAt, 'long')}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-gray-500">Estimated Days</label>
                      <p>{job.estimatedDays || 1} days</p>
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
                          <p>{job.customerName}</p>
                        </div>
                      </div>
                      {job.customerPhone && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Phone</label>
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <p>{job.customerPhone}</p>
                          </div>
                        </div>
                      )}
                      {job.customerEmail && (
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium text-gray-500">Email</label>
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <p>{job.customerEmail}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Device Information */}
                  <div>
                    <h4 className="font-semibold mb-3">Device Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Device Type</label>
                        <div className="flex items-center space-x-2">
                          <Smartphone className="h-4 w-4 text-gray-400" />
                          <p>{job.deviceType}</p>
                        </div>
                      </div>
                      {job.deviceModel && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Model</label>
                          <p>{job.deviceModel}</p>
                        </div>
                      )}
                      {job.deviceSerial && (
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium text-gray-500">Serial Number</label>
                          <p className="font-mono text-sm">{job.deviceSerial}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cost Summary */}
            <div className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Labor Cost</p>
                      <p className="text-2xl font-bold text-blue-600">{formatCurrency(job.laborCost || 0)}</p>
                    </div>
                    <Settings className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Parts Cost</p>
                      <p className="text-2xl font-bold text-orange-600">{formatCurrency(job.partsCost || 0)}</p>
                    </div>
                    <Wrench className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Cost</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(job.totalCost || 0)}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              {/* Status Actions */}
              {job.status !== 'completed' && job.status !== 'cancelled' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {job.status === 'pending' && (
                      <Button 
                        onClick={() => handleStatusChange('in-progress')} 
                        className="w-full"
                        size="sm"
                      >
                        Start Job
                      </Button>
                    )}
                    {job.status === 'in-progress' && (
                      <>
                        <Button 
                          onClick={() => handleStatusChange('waiting-parts')} 
                          variant="outline"
                          className="w-full"
                          size="sm"
                        >
                          Waiting for Parts
                        </Button>
                        <Button 
                          onClick={() => handleStatusChange('completed')} 
                          className="w-full"
                          size="sm"
                        >
                          Mark Complete
                        </Button>
                      </>
                    )}
                    {job.status === 'waiting-parts' && (
                      <Button 
                        onClick={() => handleStatusChange('in-progress')} 
                        className="w-full"
                        size="sm"
                      >
                        Resume Job
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Service Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Issue & Diagnosis */}
            <Card>
              <CardHeader>
                <CardTitle>Issue & Diagnosis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Reported Issue</label>
                  <p className="text-sm bg-gray-50 p-3 rounded-lg">{job.issue}</p>
                </div>
                
                {job.diagnosis && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Technical Diagnosis</label>
                    <p className="text-sm bg-blue-50 p-3 rounded-lg">{job.diagnosis}</p>
                  </div>
                )}

                {job.solution && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Solution Applied</label>
                    <p className="text-sm bg-green-50 p-3 rounded-lg">{job.solution}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {job.notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Customer Notes</label>
                    <p className="text-sm bg-gray-50 p-3 rounded-lg">{job.notes}</p>
                  </div>
                )}

                {job.technicianNotes && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Technician Notes</label>
                    <p className="text-sm bg-yellow-50 p-3 rounded-lg">{job.technicianNotes}</p>
                  </div>
                )}

                {!job.notes && !job.technicianNotes && (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-500">No additional notes</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Job Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">Job Created</p>
                    <p className="text-sm text-gray-500">{formatDate(job.createdAt, 'long')}</p>
                  </div>
                </div>

                {job.status === 'in-progress' && (
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">Job In Progress</p>
                      <p className="text-sm text-gray-500">Currently being worked on</p>
                    </div>
                  </div>
                )}

                {job.status === 'waiting-parts' && (
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">Waiting for Parts</p>
                      <p className="text-sm text-gray-500">Job paused pending parts arrival</p>
                    </div>
                  </div>
                )}

                {job.completedAt && (
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">Job Completed</p>
                      <p className="text-sm text-gray-500">{formatDate(job.completedAt, 'long')}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}

export default JobDetails
