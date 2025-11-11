import React, { useState, useEffect } from 'react'
import { dbService } from '../../lib/database'
import { formatCurrency, formatDate, generateId } from '../../lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import {
  Wrench,
  Plus,
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Phone,
  Calendar,
  DollarSign,
  FileText,
  Settings
} from 'lucide-react'
import JobForm from './JobForm'
import JobDetails from './JobDetails'

const JobNotes = () => {
  const [jobs, setJobs] = useState([])
  const [filteredJobs, setFilteredJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showJobForm, setShowJobForm] = useState(false)
  const [showJobDetails, setShowJobDetails] = useState(false)
  const [selectedJob, setSelectedJob] = useState(null)
  const [customers, setCustomers] = useState([])

  useEffect(() => {
    loadJobData()
  }, [])

  useEffect(() => {
    filterJobs()
  }, [jobs, searchQuery, statusFilter])

  const loadJobData = async () => {
    try {
      setLoading(true)
      
      // Load jobs
      const jobData = await dbService.readAll('jobNotes')
      
      // Deduplicate jobs - remove duplicates by jobNumber or id
      const seen = new Set()
      const uniqueJobs = jobData.filter(job => {
        const jobNumber = job.jobNumber?.trim()
        const id = job.id
        
        // Check if we've seen this job before
        if (jobNumber && seen.has(`number:${jobNumber}`)) return false
        if (id && seen.has(`id:${id}`)) return false
        
        // Add to seen set
        if (jobNumber) seen.add(`number:${jobNumber}`)
        if (id) seen.add(`id:${id}`)
        
        return true
      })
      
      setJobs(uniqueJobs)
      
      // Load customers and deduplicate
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
      setCustomers(uniqueCustomers)
      
    } catch (error) {
      console.error('Error loading job data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterJobs = () => {
    let filtered = [...jobs]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(job => 
        (job.jobNumber || job.jobNo || '').toLowerCase().includes(query) ||
        (job.customerName || '').toLowerCase().includes(query) ||
        (job.deviceModel || job.device || '').toLowerCase().includes(query) ||
        (job.issue || '').toLowerCase().includes(query)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(job => job.status === statusFilter)
    }

    setFilteredJobs(filtered)
  }

  const handleAddJob = () => {
    setSelectedJob(null)
    setShowJobForm(true)
  }

  const handleEditJob = (job) => {
    setSelectedJob(job)
    setShowJobForm(true)
  }

  const handleViewJob = (job) => {
    setSelectedJob(job)
    setShowJobDetails(true)
  }

  const handleDeleteJob = async (jobId) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      try {
        await dbService.delete('jobNotes', jobId)
        await loadJobData()
      } catch (error) {
        console.error('Error deleting job:', error)
        alert('Error deleting job')
      }
    }
  }

  const handleJobSave = async (jobData) => {
    try {
      if (selectedJob) {
        await dbService.update('jobNotes', selectedJob.id, jobData)
      } else {
        const newJob = {
          ...jobData,
          jobNumber: jobData.jobNumber || generateId('JOB'),
          createdAt: new Date().toISOString(),
          createdBy: 'current-user'
        }
        await dbService.create('jobNotes', newJob)
      }
      
      await loadJobData()
      setShowJobForm(false)
      setSelectedJob(null)
    } catch (error) {
      console.error('Error saving job:', error)
      alert('Error saving job')
    }
  }

  const handleStatusUpdate = async (jobId, newStatus) => {
    try {
      const updateData = {
        status: newStatus,
        updatedAt: new Date().toISOString()
      }

      if (newStatus === 'completed') {
        updateData.completedAt = new Date().toISOString()
      }

      await dbService.update('jobNotes', jobId, updateData)
      await loadJobData()
    } catch (error) {
      console.error('Error updating job status:', error)
      alert('Error updating job status')
    }
  }

  const handleExportJobs = () => {
    try {
      const csv = [
        ['Job Number', 'Customer', 'Device Type', 'Device Model', 'Issue', 'Status', 'Total Cost', 'Created Date', 'Completed Date'].join(','),
        ...filteredJobs.map(job => [
          job.jobNumber || '',
          `"${(job.customerName || '').replace(/"/g, '""')}"`,
          job.deviceType || '',
          job.deviceModel || '',
          `"${(job.issue || '').replace(/"/g, '""')}"`,
          job.status || '',
          job.totalCost || 0,
          formatDate(job.createdAt, 'short'),
          job.completedAt ? formatDate(job.completedAt, 'short') : ''
        ].join(','))
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `job_notes_${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting jobs:', error)
      alert('Error exporting jobs: ' + error.message)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-900/20 dark:bg-yellow-900/30'
      case 'in-progress': return 'text-blue-400 bg-blue-900/20 dark:bg-blue-900/30'
      case 'waiting-parts': return 'text-orange-400 bg-orange-900/20 dark:bg-orange-900/30'
      case 'completed': return 'text-green-400 bg-green-900/20 dark:bg-green-900/30'
      case 'cancelled': return 'text-red-400 bg-red-900/20 dark:bg-red-900/30'
      default: return 'text-gray-400 bg-gray-900/20 dark:bg-gray-900/30'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />
      case 'in-progress': return <Settings className="h-4 w-4" />
      case 'waiting-parts': return <AlertTriangle className="h-4 w-4" />
      case 'completed': return <CheckCircle className="h-4 w-4" />
      case 'cancelled': return <Trash2 className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
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

  const totalJobs = jobs.length
  const pendingJobs = jobs.filter(j => j.status === 'pending').length
  const inProgressJobs = jobs.filter(j => j.status === 'in-progress').length
  const completedJobs = jobs.filter(j => j.status === 'completed').length
  const totalRevenue = jobs.filter(j => j.status === 'completed').reduce((sum, j) => sum + (j.totalCost || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Job Notes</h1>
          <p className="text-gray-600 dark:text-gray-400">Track service jobs and repair orders</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handleExportJobs}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleAddJob}>
            <Plus className="h-4 w-4 mr-2" />
            New Job
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Jobs</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalJobs}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingJobs}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{inProgressJobs}</p>
              </div>
              <Settings className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-green-600">{completedJobs}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Revenue</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(totalRevenue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-500" />
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
                  placeholder="Search jobs..."
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
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="waiting-parts">Waiting Parts</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={loadJobData} className="w-full">
                <Search className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job List */}
      <Card>
        <CardHeader>
          <CardTitle>Service Jobs ({filteredJobs.length})</CardTitle>
          <CardDescription>
            Manage service jobs and track repair progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredJobs.length === 0 ? (
            <div className="text-center py-12">
              <Wrench className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No jobs found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {jobs.length === 0 
                  ? "Get started by creating your first service job"
                  : "Try adjusting your search or filter criteria"
                }
              </p>
              {jobs.length === 0 && (
                <Button onClick={handleAddJob}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Job
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Job Details</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Customer</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Device</th>
                    <th className="text-center p-3 font-semibold text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-right p-3 font-semibold text-gray-700 dark:text-gray-300">Cost</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Date</th>
                    <th className="text-center p-3 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((job) => (
                    <tr key={job.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="p-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{job.jobNumber}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{job.issue}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{job.customerName}</p>
                          {job.customerPhone && (
                            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                              <Phone className="h-3 w-3 mr-1" />
                              {job.customerPhone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{job.deviceType}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{job.deviceModel}</p>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center justify-center space-x-1 ${getStatusColor(job.status)}`}>
                          {getStatusIcon(job.status)}
                          <span className="capitalize">{job.status?.replace('-', ' ')}</span>
                        </span>
                      </td>
                      <td className="p-3 text-right font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(job.totalCost || 0)}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center text-sm text-gray-900 dark:text-white">
                          <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                          {formatDate(job.createdAt, 'short')}
                        </div>
                        {job.completedAt && (
                          <p className="text-xs text-green-600 dark:text-green-400">
                            Completed: {formatDate(job.completedAt, 'short')}
                          </p>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewJob(job)}
                            title="View Details"
                            className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditJob(job)}
                            title="Edit Job"
                            className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {job.status !== 'completed' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleStatusUpdate(job.id, 'completed')}
                              title="Mark Complete"
                              className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteJob(job.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Delete Job"
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

      {/* Job Form Modal */}
      {showJobForm && (
        <JobForm
          job={selectedJob}
          customers={customers}
          onSave={handleJobSave}
          onCancel={() => {
            setShowJobForm(false)
            setSelectedJob(null)
          }}
        />
      )}

      {/* Job Details Modal */}
      {showJobDetails && selectedJob && (
        <JobDetails
          job={selectedJob}
          onClose={() => {
            setShowJobDetails(false)
            setSelectedJob(null)
          }}
          onEdit={() => {
            setShowJobDetails(false)
            setShowJobForm(true)
          }}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </div>
  )
}

export default JobNotes
