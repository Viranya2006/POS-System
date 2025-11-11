import React, { useState, useEffect, useContext } from 'react'
import { dbService, db } from '../../lib/database'
import { AppContext } from '../../App'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import {
  Settings as SettingsIcon,
  Store,
  Receipt,
  Palette,
  Bell,
  Shield,
  Database,
  Printer,
  Globe,
  Save,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  Clock,
  Calendar
} from 'lucide-react'

const Settings = () => {
  const { userData, user } = useContext(AppContext)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [settings, setSettings] = useState({
    // Store Information
    storeName: 'ShopPOS Store',
    storeAddress: '',
    storePhone: '',
    storeEmail: '',
    storeLogo: '',
    taxRate: 10,
    currency: 'LKR',
    
    // Receipt Settings
    receiptHeader: '',
    receiptFooter: 'Thank you for your business!',
    showLogo: true,
    showTax: true,
    showBarcode: true,
    
    // System Settings
    theme: 'light',
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12',
    
    // Notifications
    lowStockAlert: true,
    lowStockThreshold: 5,
    emailNotifications: true,
    soundNotifications: true,
    
    // Security
    sessionTimeout: 30,
    requirePassword: true,
    autoBackup: true,
    backupFrequency: 'daily',
    
    // Printer Settings
    printerName: '',
    paperSize: 'A4',
    printMargins: 10,
    
    // Advanced
    debugMode: false,
    apiEndpoint: '',
    syncInterval: 5
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      // Settings are stored as key-value pairs
      const savedSettings = await dbService.readAll('settings')
      
      // Convert array of settings to object
      const settingsObj = {}
      savedSettings.forEach(setting => {
        if (setting.key && setting.value !== undefined) {
          settingsObj[setting.key] = setting.value
        }
      })
      
      if (Object.keys(settingsObj).length > 0) {
        setSettings(prev => ({ ...prev, ...settingsObj }))
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSaveSettings = async () => {
    try {
      setSaving(true)
      
      // Save each setting as key-value pair
      const existingSettings = await dbService.readAll('settings')
      const existingKeys = new Set(existingSettings.map(s => s.key))
      
      // Update or create each setting
      for (const [key, value] of Object.entries(settings)) {
        const existing = existingSettings.find(s => s.key === key)
        if (existing) {
          await dbService.update('settings', existing.id, { 
            key, 
            value, 
            updatedAt: new Date().toISOString() 
          })
        } else {
          await dbService.create('settings', { 
            key, 
            value, 
            updatedAt: new Date().toISOString() 
          })
        }
      }
      
      // Apply theme change
      if (settings.theme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      
      // Save theme to localStorage
      localStorage.setItem('shoppos-theme', settings.theme)
      
      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Error saving settings')
    } finally {
      setSaving(false)
    }
  }

  const handleResetSettings = () => {
    if (window.confirm('Are you sure you want to reset all settings to default? This action cannot be undone.')) {
      setSettings({
        storeName: 'ShopPOS Store',
        storeAddress: '',
        storePhone: '',
        storeEmail: '',
        storeLogo: '',
        taxRate: 10,
        currency: 'LKR',
        receiptHeader: '',
        receiptFooter: 'Thank you for your business!',
        showLogo: true,
        showTax: true,
        showBarcode: true,
        theme: 'light',
        language: 'en',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12',
        lowStockAlert: true,
        lowStockThreshold: 5,
        emailNotifications: true,
        soundNotifications: true,
        sessionTimeout: 30,
        requirePassword: true,
        autoBackup: true,
        backupFrequency: 'daily',
        printerName: '',
        paperSize: 'A4',
        printMargins: 10,
        debugMode: false,
        apiEndpoint: '',
        syncInterval: 5
      })
    }
  }

  const handleExportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `shoppos_settings_${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleImportSettings = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const importedSettings = JSON.parse(e.target.result)
          setSettings(prev => ({ ...prev, ...importedSettings }))
          alert('Settings imported successfully!')
        } catch (error) {
          alert('Error importing settings: Invalid file format')
        }
      }
      reader.readAsText(file)
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
      
      alert('Local cache cleared successfully! You may need to sync to restore data from Firebase.')
      window.location.reload()
    } catch (error) {
      console.error('Error clearing cache:', error)
      alert('Error clearing cache: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const isAdmin = () => {
    if (!userData && !user) return false
    const role = userData?.role?.toLowerCase() || ''
    const email = user?.email?.toLowerCase() || ''
    return role === 'admin' || email.includes('admin@')
  }

  const handleDeleteDataByPeriod = async (period) => {
    if (!isAdmin()) {
      alert('Only administrators can delete data.')
      return
    }

    const periodNames = {
      'hour': 'Last Hour',
      'day': 'Last Day',
      'month': 'Last Month',
      'year': 'Last Year',
      'all': 'All Data'
    }

    const periodName = periodNames[period] || period
    if (!window.confirm(`⚠️ WARNING: This will permanently delete all data from the ${periodName.toLowerCase()}!\n\nThis action CANNOT be undone. Are you absolutely sure?`)) {
      return
    }

    try {
      setDeleting(true)
      
      const now = new Date()
      let cutoffDate = new Date()
      
      switch (period) {
        case 'hour':
          cutoffDate.setHours(now.getHours() - 1)
          break
        case 'day':
          cutoffDate.setDate(now.getDate() - 1)
          break
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1)
          break
        case 'year':
          cutoffDate.setFullYear(now.getFullYear() - 1)
          break
        case 'all':
          cutoffDate = new Date(0) // Beginning of time
          break
        default:
          alert('Invalid period specified')
          return
      }

      const tables = ['sales', 'inventory', 'customers', 'suppliers', 'jobNotes', 'warranty', 'cashFlow', 'activityLog', 'grn']
      let deletedCount = 0

      for (const tableName of tables) {
        try {
          const table = db[tableName]
          if (!table) continue

          let records = await table.toArray()
          
          if (period === 'all') {
            // Delete all records
            await table.clear()
            deletedCount += records.length
          } else {
            // Delete records based on date field
            const recordsToDelete = records.filter(record => {
              const recordDate = record.createdAt || record.date || record.updatedAt || record.timestamp
              if (!recordDate) return false
              const recordDateObj = new Date(recordDate)
              return recordDateObj >= cutoffDate
            })

            for (const record of recordsToDelete) {
              try {
                await table.delete(record.id)
                deletedCount++
              } catch (e) {
                console.error(`Error deleting record ${record.id} from ${tableName}:`, e)
              }
            }
          }
        } catch (error) {
          console.error(`Error processing table ${tableName}:`, error)
        }
      }

      alert(`Successfully deleted ${deletedCount} records from ${periodName.toLowerCase()}.`)
      window.location.reload()
    } catch (error) {
      console.error('Error deleting data:', error)
      alert('Error deleting data: ' + error.message)
    } finally {
      setDeleting(false)
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
                <div className="space-y-3">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                </div>
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">Configure system preferences and options</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handleExportSettings}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <label className="cursor-pointer">
            <Button variant="outline" asChild>
              <span>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </span>
            </Button>
            <input
              type="file"
              accept=".json"
              onChange={handleImportSettings}
              className="hidden"
            />
          </label>
          <Button onClick={handleSaveSettings} disabled={saving}>
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Store Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Store className="h-5 w-5 mr-2" />
              Store Information
            </CardTitle>
            <CardDescription>
              Configure your store details and business information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Store Name</label>
              <Input
                value={settings.storeName}
                onChange={(e) => handleInputChange('store', 'storeName', e.target.value)}
                placeholder="Enter store name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Address</label>
              <textarea
                value={settings.storeAddress}
                onChange={(e) => handleInputChange('store', 'storeAddress', e.target.value)}
                placeholder="Enter store address"
                rows="3"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Phone</label>
                <Input
                  value={settings.storePhone}
                  onChange={(e) => handleInputChange('store', 'storePhone', e.target.value)}
                  placeholder="Store phone"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <Input
                  type="email"
                  value={settings.storeEmail}
                  onChange={(e) => handleInputChange('store', 'storeEmail', e.target.value)}
                  placeholder="Store email"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Tax Rate (%)</label>
                <Input
                  type="number"
                  value={settings.taxRate}
                  onChange={(e) => handleInputChange('store', 'taxRate', parseFloat(e.target.value))}
                  placeholder="10"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Currency</label>
                <select
                  value={settings.currency}
                  onChange={(e) => handleInputChange('store', 'currency', e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                >
                  <option value="LKR">LKR (Rs.)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="JPY">JPY (¥)</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Receipt Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Receipt className="h-5 w-5 mr-2" />
              Receipt Settings
            </CardTitle>
            <CardDescription>
              Customize receipt appearance and content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Receipt Header</label>
              <Input
                value={settings.receiptHeader}
                onChange={(e) => handleInputChange('receipt', 'receiptHeader', e.target.value)}
                placeholder="Welcome to our store!"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Receipt Footer</label>
              <Input
                value={settings.receiptFooter}
                onChange={(e) => handleInputChange('receipt', 'receiptFooter', e.target.value)}
                placeholder="Thank you for your business!"
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Show Logo on Receipt</label>
                <input
                  type="checkbox"
                  checked={settings.showLogo}
                  onChange={(e) => handleInputChange('receipt', 'showLogo', e.target.checked)}
                  className="rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Show Tax Details</label>
                <input
                  type="checkbox"
                  checked={settings.showTax}
                  onChange={(e) => handleInputChange('receipt', 'showTax', e.target.checked)}
                  className="rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Show Barcode</label>
                <input
                  type="checkbox"
                  checked={settings.showBarcode}
                  onChange={(e) => handleInputChange('receipt', 'showBarcode', e.target.checked)}
                  className="rounded"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Palette className="h-5 w-5 mr-2" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize the look and feel of the application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Theme</label>
              <select
                value={settings.theme}
                onChange={(e) => handleInputChange('appearance', 'theme', e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto (System)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Language</label>
              <select
                value={settings.language}
                onChange={(e) => handleInputChange('appearance', 'language', e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Date Format</label>
                <select
                  value={settings.dateFormat}
                  onChange={(e) => handleInputChange('appearance', 'dateFormat', e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Time Format</label>
                <select
                  value={settings.timeFormat}
                  onChange={(e) => handleInputChange('appearance', 'timeFormat', e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                >
                  <option value="12">12 Hour</option>
                  <option value="24">24 Hour</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="h-5 w-5 mr-2" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure alert and notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Low Stock Alerts</label>
                <input
                  type="checkbox"
                  checked={settings.lowStockAlert}
                  onChange={(e) => handleInputChange('notifications', 'lowStockAlert', e.target.checked)}
                  className="rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Email Notifications</label>
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => handleInputChange('notifications', 'emailNotifications', e.target.checked)}
                  className="rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Sound Notifications</label>
                <input
                  type="checkbox"
                  checked={settings.soundNotifications}
                  onChange={(e) => handleInputChange('notifications', 'soundNotifications', e.target.checked)}
                  className="rounded"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Low Stock Threshold</label>
              <Input
                type="number"
                value={settings.lowStockThreshold}
                onChange={(e) => handleInputChange('notifications', 'lowStockThreshold', parseInt(e.target.value))}
                placeholder="5"
                min="1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Security
            </CardTitle>
            <CardDescription>
              Configure security and backup settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Session Timeout (minutes)</label>
              <Input
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => handleInputChange('security', 'sessionTimeout', parseInt(e.target.value))}
                placeholder="30"
                min="5"
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Require Password</label>
                <input
                  type="checkbox"
                  checked={settings.requirePassword}
                  onChange={(e) => handleInputChange('security', 'requirePassword', e.target.checked)}
                  className="rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Auto Backup</label>
                <input
                  type="checkbox"
                  checked={settings.autoBackup}
                  onChange={(e) => handleInputChange('security', 'autoBackup', e.target.checked)}
                  className="rounded"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Backup Frequency</label>
              <select
                value={settings.backupFrequency}
                onChange={(e) => handleInputChange('security', 'backupFrequency', e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Printer Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Printer className="h-5 w-5 mr-2" />
              Printer Settings
            </CardTitle>
            <CardDescription>
              Configure receipt and report printing options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Default Printer</label>
              <Input
                value={settings.printerName}
                onChange={(e) => handleInputChange('printer', 'printerName', e.target.value)}
                placeholder="Select printer"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Paper Size</label>
                <select
                  value={settings.paperSize}
                  onChange={(e) => handleInputChange('printer', 'paperSize', e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                >
                  <option value="A4">A4</option>
                  <option value="Letter">Letter</option>
                  <option value="Thermal">Thermal (80mm)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Margins (mm)</label>
                <Input
                  type="number"
                  value={settings.printMargins}
                  onChange={(e) => handleInputChange('printer', 'printMargins', parseInt(e.target.value))}
                  placeholder="10"
                  min="0"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="h-5 w-5 mr-2" />
            System Actions
          </CardTitle>
          <CardDescription>
            Manage system data and configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button variant="outline" onClick={handleResetSettings}>
              <Trash2 className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
            <Button variant="outline">
              <Database className="h-4 w-4 mr-2" />
              Backup Database
            </Button>
            <Button variant="outline" onClick={handleClearCache} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Clear Cache
            </Button>
          </div>
          
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800 dark:text-yellow-300">Important Notes</h4>
                <ul className="text-sm text-yellow-700 dark:text-yellow-400 mt-1 space-y-1">
                  <li>• Changes to store information will affect all future receipts</li>
                  <li>• Theme changes take effect immediately</li>
                  <li>• Security settings may require re-authentication</li>
                  <li>• Always backup your data before making major changes</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin Data Management */}
      {isAdmin() && (
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600 dark:text-red-400">
              <Trash2 className="h-5 w-5 mr-2" />
              Admin: Data Deletion (Danger Zone)
            </CardTitle>
            <CardDescription>
              Permanently delete data from the database by time period. This action cannot be undone!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-800 dark:text-red-300">⚠️ Warning</h4>
                    <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                      Deleting data is permanent and cannot be recovered. This will affect: Sales, Inventory, Customers, Suppliers, Job Notes, Warranty, Cash Flow, Activity Logs, and GRN records.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleDeleteDataByPeriod('hour')}
                  disabled={deleting}
                  className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Last Hour
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDeleteDataByPeriod('day')}
                  disabled={deleting}
                  className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Last Day
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDeleteDataByPeriod('month')}
                  disabled={deleting}
                  className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Last Month
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDeleteDataByPeriod('year')}
                  disabled={deleting}
                  className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Last Year
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDeleteDataByPeriod('all')}
                  disabled={deleting}
                  className="border-red-500 text-red-700 hover:bg-red-100 dark:border-red-600 dark:text-red-500 dark:hover:bg-red-900/30 font-semibold"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete All
                </Button>
              </div>

              {deleting && (
                <div className="flex items-center justify-center py-4">
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin text-red-600" />
                  <span className="text-red-600 dark:text-red-400">Deleting data...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default Settings
