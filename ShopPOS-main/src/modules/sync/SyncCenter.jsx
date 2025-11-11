import React, { useState, useEffect } from 'react'
import { dbService } from '../../lib/database'
import { formatDate } from '../../lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import {
  RefreshCw,
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  Database,
  Upload,
  Download,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Activity,
  Server,
  Smartphone,
  HardDrive
} from 'lucide-react'

const SyncCenter = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [syncStatus, setSyncStatus] = useState('idle')
  const [lastSync, setLastSync] = useState(null)
  const [syncQueue, setSyncQueue] = useState([])
  const [syncStats, setSyncStats] = useState({
    totalRecords: 0,
    pendingSync: 0,
    lastSyncSize: 0,
    syncErrors: 0
  })
  const [loading, setLoading] = useState(true)
  const [syncInterval, setSyncInterval] = useState('5')
  const [conflictResolution, setConflictResolution] = useState('server')

  useEffect(() => {
    loadSyncData()
    
    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const loadSyncData = async () => {
    try {
      setLoading(true)
      
      // Load sync queue and statistics
      const queue = await dbService.readAll('syncQueue') || []
      setSyncQueue(queue)
      
      // Calculate statistics
      const allTables = ['sales', 'inventory', 'customers', 'suppliers', 'jobNotes', 'warranty', 'users']
      let totalRecords = 0
      
      for (const table of allTables) {
        const records = await dbService.readAll(table)
        totalRecords += records.length
      }
      
      setSyncStats({
        totalRecords,
        pendingSync: queue.length,
        lastSyncSize: 0, // Would be stored from last sync
        syncErrors: queue.filter(item => item.status === 'error').length
      })
      
      // Load last sync time from localStorage
      const lastSyncTime = localStorage.getItem('lastSyncTime')
      if (lastSyncTime) {
        setLastSync(new Date(lastSyncTime))
      }
      
    } catch (error) {
      console.error('Error loading sync data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleManualSync = async () => {
    if (!isOnline) {
      alert('Cannot sync while offline. Please check your internet connection.')
      return
    }

    setSyncStatus('syncing')
    
    try {
      // Process sync queue - this will sync all pending changes to Firebase
      const synced = await dbService.processSyncQueue()
      
      // Download latest data from Firebase
      const { downloadFromFirebase } = await import('../../lib/database')
      await downloadFromFirebase()
      
      // Update last sync time
      const now = new Date()
      setLastSync(now)
      localStorage.setItem('lastSyncTime', now.toISOString())
      
      setSyncStatus('success')
      await loadSyncData()
      
      setTimeout(() => setSyncStatus('idle'), 3000)
      
    } catch (error) {
      console.error('Sync error:', error)
      setSyncStatus('error')
      alert('Sync failed: ' + error.message)
      setTimeout(() => setSyncStatus('idle'), 3000)
    }
  }

  const handleClearCache = async () => {
    if (!window.confirm('Are you sure you want to clear the local cache? This will remove all cached data but keep your sync queue. This action cannot be undone.')) {
      return
    }

    try {
      setLoading(true)
      
      // Clear IndexedDB cache (but keep settings, sync queue, and users for authentication)
      const cacheTables = ['sales', 'inventory', 'customers', 'suppliers', 'jobNotes', 'warranty', 'cashFlow', 'activityLog', 'grn']
      
      for (const table of cacheTables) {
        try {
          await dbService.deleteAll(table)
        } catch (error) {
          console.error(`Error clearing ${table}:`, error)
        }
      }
      
      // Clear localStorage cache items (but keep essential settings)
      const cacheKeys = ['lastSyncTime', 'offlineData', 'cachedData']
      cacheKeys.forEach(key => {
        try {
          localStorage.removeItem(key)
        } catch (error) {
          console.error(`Error clearing ${key}:`, error)
        }
      })
      
      // Reload sync data
      await loadSyncData()
      
      alert('Local cache cleared successfully! You may need to sync to restore data from Firebase.')
    } catch (error) {
      console.error('Error clearing cache:', error)
      alert('Error clearing cache: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClearQueue = async () => {
    if (window.confirm('Are you sure you want to clear the sync queue? This will remove all pending changes.')) {
      try {
        await dbService.deleteAll('syncQueue')
        await loadSyncData()
      } catch (error) {
        console.error('Error clearing sync queue:', error)
        alert('Error clearing sync queue')
      }
    }
  }

  const handleExportData = async () => {
    try {
      const allData = {}
      const tables = ['sales', 'inventory', 'customers', 'suppliers', 'jobNotes', 'warranty', 'users', 'settings']
      
      for (const table of tables) {
        allData[table] = await dbService.readAll(table)
      }
      
      const dataStr = JSON.stringify(allData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `shoppos_backup_${new Date().toISOString().split('T')[0]}.json`
      link.click()
      URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('Export error:', error)
      alert('Error exporting data')
    }
  }

  const handleImportData = async (event) => {
    const file = event.target.files[0]
    if (!file) {
      return
    }

    // Check file type
    if (!file.name.endsWith('.json')) {
      alert('Please select a valid JSON file.')
      event.target.value = '' // Reset file input
      return
    }

    const reader = new FileReader()
    
    reader.onerror = () => {
      alert('Error reading file. Please try again.')
      event.target.value = '' // Reset file input
    }

    reader.onload = async (e) => {
      try {
        setLoading(true)
        const importedData = JSON.parse(e.target.result)
        
        // Validate JSON structure
        if (!importedData || typeof importedData !== 'object') {
          throw new Error('Invalid file format. Expected a JSON object.')
        }

        // Check if data contains expected tables
        const expectedTables = ['sales', 'inventory', 'customers', 'suppliers', 'jobNotes', 'warranty', 'users', 'settings', 'grn', 'cashFlow']
        const hasValidTables = Object.keys(importedData).some(key => expectedTables.includes(key))
        
        if (!hasValidTables) {
          throw new Error('Invalid file format. File does not contain recognizable data tables.')
        }
        
        if (window.confirm('This will replace all existing data with imported data. Are you sure you want to continue?')) {
          // Use the importData method from dbService
          await dbService.importData(importedData)
          
          // Reload sync data
          await loadSyncData()
          
          alert('Data imported successfully!')
        }
      } catch (error) {
        console.error('Import error:', error)
        
        let errorMessage = 'Error importing data: '
        if (error.message) {
          errorMessage += error.message
        } else if (error.name === 'SyntaxError') {
          errorMessage += 'Invalid JSON format. Please check the file.'
        } else {
          errorMessage += 'Unknown error occurred.'
        }
        
        alert(errorMessage)
      } finally {
        setLoading(false)
        event.target.value = '' // Reset file input
      }
    }
    
    reader.readAsText(file)
  }

  const getSyncStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing': return <RefreshCw className="h-5 w-5 animate-spin" />
      case 'success': return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'error': return <XCircle className="h-5 w-5 text-red-600" />
      default: return <Clock className="h-5 w-5" />
    }
  }

  const getSyncStatusText = () => {
    switch (syncStatus) {
      case 'syncing': return 'Synchronizing...'
      case 'success': return 'Sync completed successfully'
      case 'error': return 'Sync failed'
      default: return 'Ready to sync'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sync Center</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage data synchronization and offline mode</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
            isOnline ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
          }`}>
            {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>
          <Button onClick={handleManualSync} disabled={!isOnline || syncStatus === 'syncing'}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            Sync Now
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Connection Status</p>
                <p className={`text-2xl font-bold ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                  {isOnline ? 'Online' : 'Offline'}
                </p>
              </div>
              {isOnline ? <Cloud className="h-8 w-8 text-green-500" /> : <CloudOff className="h-8 w-8 text-red-500" />}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Records</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{syncStats.totalRecords}</p>
              </div>
              <Database className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Sync</p>
                <p className="text-2xl font-bold text-yellow-600">{syncStats.pendingSync}</p>
              </div>
              <Upload className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Sync Errors</p>
                <p className="text-2xl font-bold text-red-600">{syncStats.syncErrors}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sync Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Sync Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-3">
              {getSyncStatusIcon()}
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{getSyncStatusText()}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Last sync: {lastSync ? formatDate(lastSync.toISOString(), 'long') : 'Never'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">Auto-sync: {isOnline ? 'Enabled' : 'Disabled'}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Interval: 5 minutes</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Upload className="h-5 w-5 mr-2" />
              Sync Queue ({syncQueue.length})
            </span>
            {syncQueue.length > 0 && (
              <Button variant="outline" onClick={handleClearQueue}>
                Clear Queue
              </Button>
            )}
          </CardTitle>
          <CardDescription>
            Pending changes waiting to be synchronized
          </CardDescription>
        </CardHeader>
        <CardContent>
          {syncQueue.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-400" />
              <p className="text-gray-500">All changes are synchronized</p>
            </div>
          ) : (
            <div className="space-y-3">
              {syncQueue.slice(0, 10).map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      item.status === 'pending' ? 'bg-yellow-500' : 
                      item.status === 'error' ? 'bg-red-500' : 'bg-green-500'
                    }`}></div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{item.operation} - {item.table}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(item.timestamp, 'short')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium capitalize text-gray-900 dark:text-white">{item.status}</p>
                    {item.error && (
                      <p className="text-xs text-red-600 dark:text-red-400">{item.error}</p>
                    )}
                  </div>
                </div>
              ))}
              
              {syncQueue.length > 10 && (
                <div className="text-center pt-3">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Showing 10 of {syncQueue.length} items
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <HardDrive className="h-5 w-5 mr-2" />
              Local Storage
            </CardTitle>
            <CardDescription>
              Manage offline data and storage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Database Size</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Estimated local storage usage</p>
              </div>
              <p className="font-semibold text-gray-900 dark:text-white">~2.5 MB</p>
            </div>
            
            <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Cache Status</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Application cache status</p>
              </div>
              <span className="px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded text-sm">Active</span>
            </div>

            <Button variant="outline" className="w-full" onClick={handleClearCache}>
              <Database className="h-4 w-4 mr-2" />
              Clear Local Cache
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Server className="h-5 w-5 mr-2" />
              Data Backup
            </CardTitle>
            <CardDescription>
              Export and import data for backup
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleExportData} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Export All Data
            </Button>
            
            <label className="cursor-pointer">
              <Button variant="outline" className="w-full" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Data
                </span>
              </Button>
              <input
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="hidden"
              />
            </label>

            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Backup includes all sales, inventory, customers, and settings
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sync Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <RefreshCw className="h-5 w-5 mr-2" />
            Sync Settings
          </CardTitle>
          <CardDescription>
            Configure synchronization preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Auto Sync</label>
                <input type="checkbox" checked={isOnline} readOnly className="rounded" />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sync on Startup</label>
                <input type="checkbox" defaultChecked className="rounded" />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Background Sync</label>
                <input type="checkbox" defaultChecked className="rounded" />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Sync Interval</label>
                <select 
                  value={syncInterval}
                  onChange={(e) => setSyncInterval(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                >
                  <option value="1">1 minute</option>
                  <option value="5">5 minutes</option>
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Conflict Resolution</label>
                <select 
                  value={conflictResolution}
                  onChange={(e) => setConflictResolution(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                >
                  <option value="server">Server wins</option>
                  <option value="client">Client wins</option>
                  <option value="manual">Manual resolution</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SyncCenter
