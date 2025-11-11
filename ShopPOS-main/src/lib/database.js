import Dexie from 'dexie'

// Define the database schema
export class ShopPOSDB extends Dexie {
  constructor() {
    super('ShopPOSDB')
    
    this.version(1).stores({
      // Core data tables
      inventory: '++id, code, name, category, supplier, costPrice, sellPrice, qty, reorderLevel, barcode, expiry, createdAt, updatedAt, synced',
      sales: '++id, invoiceNo, customerId, items, subtotal, tax, discount, total, paymentMethod, cashReceived, change, date, userId, synced',
      customers: '++id, name, phone, email, address, createdAt, updatedAt, synced',
      suppliers: '++id, name, contact, address, email, createdAt, updatedAt, synced',
      grn: '++id, grnNo, supplierId, items, total, date, userId, synced',
      jobNotes: '++id, jobNo, customerId, device, issue, technician, charges, status, createdAt, updatedAt, synced',
      warranty: '++id, productId, saleId, startDate, endDate, terms, status, synced',
      users: '++id, email, role, name, phone, userId, firebaseUid, username, status, permissions, createdAt, updatedAt, synced',
      cashFlow: '++id, type, category, amount, description, date, referenceId, referenceType, userId, createdAt, updatedAt, synced',
      activityLog: '++id, userId, userName, action, entity, entityId, details, timestamp, synced',
      
      // Settings and configuration
      settings: '++id, key, value, updatedAt',
      
      // Sync queue for offline operations
      syncQueue: '++id, table, operation, data, timestamp, retries'
    })
    
    // Version 2: Add missing indexes for supplierId, phone, status, customerId
    this.version(2).stores({
      inventory: '++id, code, name, category, supplier, costPrice, sellPrice, qty, reorderLevel, barcode, expiry, createdAt, updatedAt, synced',
      sales: '++id, invoiceNo, customerId, items, subtotal, tax, discount, total, paymentMethod, cashReceived, change, date, userId, synced',
      customers: '++id, customerId, name, phone, email, address, createdAt, updatedAt, synced',
      suppliers: '++id, supplierId, name, phone, status, contact, address, email, createdAt, updatedAt, synced',
      grn: '++id, grnNo, supplierId, items, total, date, userId, synced',
      jobNotes: '++id, jobNo, customerId, device, issue, technician, charges, status, createdAt, updatedAt, synced',
      warranty: '++id, productId, saleId, startDate, endDate, terms, status, synced',
      users: '++id, email, role, name, phone, userId, firebaseUid, username, status, permissions, createdAt, updatedAt, synced',
      cashFlow: '++id, type, category, amount, description, date, referenceId, referenceType, userId, createdAt, updatedAt, synced',
      activityLog: '++id, userId, userName, action, entity, entityId, details, timestamp, synced',
      settings: '++id, key, value, updatedAt',
      syncQueue: '++id, table, operation, data, timestamp, retries'
    })
  }
}

// Create database instance
export const db = new ShopPOSDB()

// Database service class
export class DatabaseService {
  constructor() {
    this.isOnline = navigator.onLine
    this.isProcessingQueue = false
    this.setupEventListeners()
  }

  setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true
      this.processSyncQueue()
    })
    
    window.addEventListener('offline', () => {
      this.isOnline = false
    })
  }

  // Generic CRUD operations
  async create(table, data) {
    try {
      // Validate input
      if (!table || !data) {
        throw new Error('Table name and data are required')
      }
      
      if (!db[table]) {
        throw new Error(`Table "${table}" does not exist`)
      }
      
      // Check for duplicates for customers, suppliers, and warranties
      if (table === 'customers' || table === 'suppliers' || table === 'warranty') {
        const allRecords = await db[table].toArray()
        
        if (table === 'customers' || table === 'suppliers') {
          const keyField = table === 'customers' ? 'customerId' : 'supplierId'
          
          // Check by key field
          if (data[keyField]) {
            const existing = allRecords.find(r => r[keyField] === data[keyField])
            if (existing) {
              throw new Error(`${table === 'customers' ? 'Customer' : 'Supplier'} with this ID already exists`)
            }
          }
          
          // Check by email
          if (data.email) {
            const normalizedEmail = data.email.toLowerCase().trim()
            const existing = allRecords.find(r => r.email?.toLowerCase().trim() === normalizedEmail)
            if (existing) {
              throw new Error(`${table === 'customers' ? 'Customer' : 'Supplier'} with this email already exists`)
            }
          }
          
          // Check by phone
          if (data.phone) {
            const normalizedPhone = data.phone.trim()
            const existing = allRecords.find(r => r.phone?.trim() === normalizedPhone)
            if (existing) {
              throw new Error(`${table === 'customers' ? 'Customer' : 'Supplier'} with this phone already exists`)
            }
          }
        } else if (table === 'warranty') {
          // Check by warrantyNumber
          if (data.warrantyNumber) {
            const normalizedWarrantyNumber = data.warrantyNumber.trim()
            const existing = allRecords.find(r => r.warrantyNumber?.trim() === normalizedWarrantyNumber)
            if (existing) {
              throw new Error('Warranty with this warranty number already exists')
            }
          }
        }
      }
      
      const timestamp = new Date().toISOString()
      const record = {
        ...data,
        createdAt: timestamp,
        updatedAt: timestamp,
        synced: false
      }
      
      const id = await db[table].add(record)
      const recordWithId = { ...record, id }

      // Always queue sync to decouple network from UI; process in background
      await this.addToSyncQueue(table, 'create', recordWithId)
      if (this.isOnline) setTimeout(() => this.processSyncQueue().catch(() => {}), 0)

      return { id, ...record }
    } catch (error) {
      console.error(`Error creating ${table} record:`, error)
      throw error
    }
  }

  async read(table, id) {
    try {
      if (!table || id === undefined || id === null) {
        throw new Error('Table name and ID are required')
      }
      
      if (!db[table]) {
        throw new Error(`Table "${table}" does not exist`)
      }
      
      return await db[table].get(id)
    } catch (error) {
      console.error(`Error reading ${table} record:`, error)
      throw error
    }
  }

  async readAll(table, filter = {}) {
    try {
      if (!table) {
        throw new Error('Table name is required')
      }
      
      if (!db[table]) {
        throw new Error(`Table "${table}" does not exist`)
      }
      
      let collection = db[table]
      
      // Apply filters safely
      Object.keys(filter).forEach(key => {
        if (filter[key] !== undefined && filter[key] !== null) {
          try {
            collection = collection.where(key).equals(filter[key])
          } catch (filterError) {
            console.warn(`Filter by "${key}" failed, using full collection:`, filterError)
          }
        }
      })
      
      return await collection.toArray()
    } catch (error) {
      console.error(`Error reading ${table} records:`, error)
      throw error
    }
  }

  async update(table, id, data) {
    try {
      if (!table || id === undefined || id === null) {
        throw new Error('Table name and ID are required')
      }
      
      if (!db[table]) {
        throw new Error(`Table "${table}" does not exist`)
      }
      
      const existingRecord = await this.read(table, id)
      if (!existingRecord) {
        throw new Error('Record not found')
      }
      
      const updateData = {
        ...data,
        updatedAt: new Date().toISOString(),
        synced: false
      }
      
      await db[table].update(id, updateData)
      const updatedRecord = { ...existingRecord, ...updateData, id }

      // Always queue sync; process in background later
      await this.addToSyncQueue(table, 'update', updatedRecord)
      if (this.isOnline) setTimeout(() => this.processSyncQueue().catch(() => {}), 0)

      return updatedRecord
    } catch (error) {
      console.error(`Error updating ${table} record:`, error)
      throw error
    }
  }

  async deleteAll(table) {
    try {
      if (!table) {
        throw new Error('Table name is required')
      }
      
      if (!db[table]) {
        throw new Error(`Table "${table}" does not exist`)
      }
      
      await db[table].clear()
      return true
    } catch (error) {
      console.error(`Error clearing ${table} records:`, error)
      throw error
    }
  }

  async delete(table, id) {
    try {
      if (!table || id === undefined || id === null) {
        throw new Error('Table name and ID are required')
      }
      
      if (!db[table]) {
        throw new Error(`Table "${table}" does not exist`)
      }
      
      const record = await this.read(table, id)
      if (!record) {
        throw new Error('Record not found')
      }
      
      await db[table].delete(id)
      
      // Try to sync deletion to Firebase immediately if online
      if (this.isOnline) {
        try {
          const { firebaseSync } = await import('./firebaseSync')
          const syncId = record.invoiceNo || record.grnNo || record.code || record.jobNo || id
          if (syncId) {
            await firebaseSync.deleteRecord(table, syncId)
          }
        } catch (syncError) {
          console.warn('Firebase sync failed, adding to queue:', syncError)
          // If sync fails, add to queue for later
          await this.addToSyncQueue(table, 'delete', { ...record, id })
        }
      } else {
        // Add to sync queue if offline
        await this.addToSyncQueue(table, 'delete', { ...record, id })
      }
      
      return true
    } catch (error) {
      console.error(`Error deleting ${table} record:`, error)
      throw error
    }
  }

  // Sync queue operations
  async addToSyncQueue(table, operation, data) {
    try {
      // Don't queue if record is already marked synced
      if (data && data.synced === true) return
      // Compute a stable dedupe key for this record
      const dedupeId = this.getSyncIdFromRecord(table, data)

      // Try to find existing queued item for same table/op/id
      const existingForTable = await db.syncQueue.where('table').equals(table).toArray()
      // Prefer to dedupe across ANY operation for the same record id
      const sameId = existingForTable.find(q => this.getSyncIdFromRecord(table, q.data) === dedupeId)

      if (sameId) {
        // Merge operation: if either is 'create', keep 'create'; else 'update'
        const mergedOperation = (operation === 'create' || sameId.operation === 'create') ? 'create' : 'update'
        await db.syncQueue.update(sameId.id, {
          operation: mergedOperation,
          data,
          timestamp: new Date().toISOString()
        })
      } else {
        await db.syncQueue.add({
          table,
          operation,
          data,
          timestamp: new Date().toISOString(),
          retries: 0
        })
      }
    } catch (error) {
      console.error('Error adding to sync queue:', error)
    }
  }

  async processSyncQueue() {
    if (!this.isOnline) return
    if (this.isProcessingQueue) return

    try {
      this.isProcessingQueue = true
      // First, compact the queue to remove duplicates
      await this.compactSyncQueue()
      // Process in small batches to avoid long tasks
      const BATCH_SIZE = 20
      const queueItems = await db.syncQueue.orderBy('timestamp').limit(BATCH_SIZE).toArray()
      let processed = 0
      for (const item of queueItems) {
        try {
          await this.syncToFirebase(item)
          await db.syncQueue.delete(item.id)
        } catch (error) {
          console.error('Sync error for item:', item, error)
          await db.syncQueue.update(item.id, { retries: item.retries + 1 })
          if (item.retries >= 3) {
            await db.syncQueue.delete(item.id)
          }
        }
        processed++
        if (processed % 25 === 0) {
          // Yield to UI to avoid long tasks
          await new Promise(requestAnimationFrame)
        }
      }
      // If more items remain, schedule next slice
      const remaining = await db.syncQueue.count()
      if (remaining > 0) {
        setTimeout(() => this.processSyncQueue().catch(() => {}), 50)
      }
    } catch (error) {
      console.error('Error processing sync queue:', error)
    } finally {
      this.isProcessingQueue = false
    }
  }

  async syncToFirebase(item) {
    try {
      const { firebaseSync } = await import('./firebaseSync')
      const result = await firebaseSync.syncQueueItem(item)
      
      // Mark the record as synced in local DB if it has an ID
      if (item.data.id && result.id) {
        try {
          // IMPORTANT: update directly to avoid requeueing another sync item
          if (db[item.table]) {
            await db[item.table].update(item.data.id, { synced: true, updatedAt: new Date().toISOString() })
          }
        } catch (e) {
          // Ignore if record doesn't exist or update fails
        }
      }
      
      return result
    } catch (error) {
      console.error('Error syncing to Firebase:', error)
      throw error
    }
  }

  // Helper to compute stable sync id for a record
  getSyncIdFromRecord(table, data) {
    if (!data) return ''
    if (table === 'users') {
      return (data.email || data.firebaseUid || data.userId || data.id || '').toString()
    }
    return (
      data.invoiceNo ||
      data.grnNo ||
      data.code ||
      data.jobNo ||
      data.referenceId ||
      data.id ||
      ''
    ).toString()
  }

  // Remove duplicates in syncQueue, prefer 'create' and newest timestamp
  async compactSyncQueue() {
    try {
      const items = await db.syncQueue.toArray()
      const keepByKey = new Map()
      for (const it of items) {
        const key = `${it.table}:${this.getSyncIdFromRecord(it.table, it.data)}`
        const prev = keepByKey.get(key)
        if (!prev) {
          keepByKey.set(key, it)
          continue
        }
        // choose winner: prefer any 'create'; else latest timestamp
        const choose = (a, b) => {
          if (a.operation === 'create' && b.operation !== 'create') return a
          if (b.operation === 'create' && a.operation !== 'create') return b
          return new Date(a.timestamp) >= new Date(b.timestamp) ? a : b
        }
        keepByKey.set(key, choose(prev, it))
      }

      const keepIds = new Set(Array.from(keepByKey.values()).map(v => v.id))
      const deletions = items.filter(it => !keepIds.has(it.id)).map(it => db.syncQueue.delete(it.id))
      if (deletions.length) await Promise.all(deletions)
    } catch (e) {
      console.warn('compactSyncQueue failed:', e)
    }
  }

  // Inventory specific methods
  async getInventoryByBarcode(barcode) {
    try {
      return await db.inventory.where('barcode').equals(barcode).first()
    } catch (error) {
      console.error('Error getting inventory by barcode:', error)
      throw error
    }
  }

  async getLowStockItems(threshold = 10) {
    try {
      return await db.inventory.where('qty').below(threshold).toArray()
    } catch (error) {
      console.error('Error getting low stock items:', error)
      throw error
    }
  }

  async updateInventoryQuantity(productId, quantity, operation = 'subtract') {
    try {
      const product = await db.inventory.get(productId)
      if (!product) throw new Error('Product not found')

      const newQty = operation === 'add' 
        ? product.qty + quantity 
        : product.qty - quantity

      if (newQty < 0) throw new Error('Insufficient stock')

      return await this.update('inventory', productId, { qty: newQty })
    } catch (error) {
      console.error('Error updating inventory quantity:', error)
      throw error
    }
  }

  // Sales specific methods
  async getTodaysSales() {
    try {
      const today = new Date().toISOString().split('T')[0]
      return await db.sales.where('date').between(today, today + 'Z').toArray()
    } catch (error) {
      console.error('Error getting today\'s sales:', error)
      throw error
    }
  }

  async getSalesReport(startDate, endDate) {
    try {
      return await db.sales.where('date').between(startDate, endDate).toArray()
    } catch (error) {
      console.error('Error getting sales report:', error)
      throw error
    }
  }

  // Settings methods
  async getSetting(key, defaultValue = null) {
    try {
      const setting = await db.settings.where('key').equals(key).first()
      return setting ? setting.value : defaultValue
    } catch (error) {
      console.error('Error getting setting:', error)
      return defaultValue
    }
  }

  async setSetting(key, value) {
    try {
      const existing = await db.settings.where('key').equals(key).first()
      
      if (existing) {
        await db.settings.update(existing.id, {
          value,
          updatedAt: new Date().toISOString()
        })
      } else {
        await db.settings.add({
          key,
          value,
          updatedAt: new Date().toISOString()
        })
      }
      
      return true
    } catch (error) {
      console.error('Error setting value:', error)
      throw error
    }
  }

  // Utility methods
  async clearAllData() {
    try {
      await db.delete()
      await db.open()
      return true
    } catch (error) {
      console.error('Error clearing data:', error)
      throw error
    }
  }

  async exportData() {
    try {
      const data = {}
      const tables = ['inventory', 'sales', 'customers', 'suppliers', 'grn', 'jobNotes', 'warranty', 'users']
      
      for (const table of tables) {
        data[table] = await db[table].toArray()
      }
      
      return data
    } catch (error) {
      console.error('Error exporting data:', error)
      throw error
    }
  }

  async importData(data) {
    try {
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data format. Expected an object.')
      }

      const tables = Object.keys(data)
      
      if (tables.length === 0) {
        throw new Error('No data tables found in import file.')
      }

      for (const table of tables) {
        // Check if table exists in database
        if (!db[table]) {
          console.warn(`Table "${table}" does not exist in database, skipping...`)
          continue
        }

        // Validate data is an array
        if (!Array.isArray(data[table])) {
          console.warn(`Data for table "${table}" is not an array, skipping...`)
          continue
        }

        try {
          // Clear existing data
          await db[table].clear()
          
          // Bulk add imported data (only if there are records)
          if (data[table].length > 0) {
            // Remove auto-increment IDs from imported data to avoid conflicts
            const recordsToImport = data[table].map(record => {
              const { id, ...recordWithoutId } = record
              return recordWithoutId
            })
            
            await db[table].bulkAdd(recordsToImport)
            console.log(`✅ Imported ${recordsToImport.length} records to ${table}`)
          }
        } catch (tableError) {
          console.error(`Error importing ${table}:`, tableError)
          // Continue with other tables even if one fails
          throw new Error(`Failed to import ${table}: ${tableError.message}`)
        }
      }
      
      return true
    } catch (error) {
      console.error('Error importing data:', error)
      throw error
    }
  }
}

// Create and export database service instance
export const dbService = new DatabaseService()

// Method to download data from Firebase on startup
export async function downloadFromFirebase() {
  try {
    const { firebaseSync } = await import('./firebaseSync')
    const firebaseData = await firebaseSync.downloadAllCollections()
    
    // Merge Firebase data with local data (Firebase takes precedence for conflicts)
    for (const [table, records] of Object.entries(firebaseData)) {
      if (Array.isArray(records) && records.length > 0 && db[table]) {
        for (const record of records) {
          try {
            // Try to find existing record by key fields
            let existingId = null
            if (record.invoiceNo) {
              const existing = await db[table].where('invoiceNo').equals(record.invoiceNo).first()
              existingId = existing?.id
            } else if (record.grnNo) {
              const existing = await db[table].where('grnNo').equals(record.grnNo).first()
              existingId = existing?.id
            } else if (record.code) {
              const existing = await db[table].where('code').equals(record.code).first()
              existingId = existing?.id
            } else if (record.jobNo) {
              const existing = await db[table].where('jobNo').equals(record.jobNo).first()
              existingId = existing?.id
            } else if (record.email && table === 'users') {
              // For users, match by email to prevent duplicates
              const existing = await db[table].where('email').equals(record.email).first()
              existingId = existing?.id
            } else if (record.userId && table === 'users') {
              // Also try userId for users
              const existing = await db[table].where('userId').equals(record.userId).first()
              existingId = existing?.id
            } else if (record.firebaseUid && table === 'users') {
              // Match by Firebase UID for users
              const existing = await db[table].where('firebaseUid').equals(record.firebaseUid).first()
              existingId = existing?.id
            }
            
            if (existingId) {
              // Update existing record
              await db[table].update(existingId, { ...record, synced: true })
            } else {
              // Add new record (without Firebase ID to avoid duplicates)
              const { firebaseId, ...recordData } = record
              await db[table].add({ ...recordData, synced: true })
            }
          } catch (error) {
            console.error(`Error merging ${table} record:`, error)
          }
        }
      }
    }
    
    console.log('✅ Downloaded and merged data from Firebase')
    return firebaseData
  } catch (error) {
    console.error('Error downloading from Firebase:', error)
    throw error
  }
}
