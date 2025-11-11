import { ref, set, update, remove, push, get, onValue, off } from 'firebase/database'
import { database, auth } from './firebase'

/**
 * Firebase Sync Service
 * Handles all synchronization between local IndexedDB and Firebase Realtime Database
 */
class FirebaseSyncService {
  constructor() {
    this.isOnline = navigator.onLine
    this.syncListeners = {} // Track active listeners
  }

  /**
   * Get the current authenticated user
   */
  getCurrentUser() {
    return auth.currentUser
  }

  /**
   * Get Firebase path for a collection
   */
  getCollectionPath(collection) {
    const user = this.getCurrentUser()
    if (user) {
      // If authenticated, use user-specific path (optional - can use global path too)
      return `shoppos/${collection}`
    }
    return `shoppos/${collection}`
  }

  /**
   * Get Firebase path for a specific record
   */
  getRecordPath(collection, id) {
    return `${this.getCollectionPath(collection)}/${id}`
  }

  /**
   * Sync a single record to Firebase (CREATE or UPDATE)
   */
  async syncRecord(collection, id, data) {
    try {
      const user = this.getCurrentUser()
      if (!user && !this.isOnline) {
        throw new Error('User not authenticated or offline')
      }

      // Prepare data for Firebase (remove local-only fields)
      const firebaseData = { ...data }
      delete firebaseData.id // Remove IndexedDB auto-increment ID
      delete firebaseData.synced // Remove sync flag
      
      // Add sync metadata
      firebaseData.lastSynced = new Date().toISOString()
      firebaseData.syncedBy = user?.uid || 'system'

      const recordPath = this.getRecordPath(collection, id)
      await set(ref(database, recordPath), firebaseData)

      console.log(`✅ Synced ${collection}/${id} to Firebase`)
      return true
    } catch (error) {
      console.error(`❌ Error syncing ${collection}/${id}:`, error)
      throw error
    }
  }

  /**
   * Delete a record from Firebase
   */
  async deleteRecord(collection, id) {
    try {
      const recordPath = this.getRecordPath(collection, id)
      await remove(ref(database, recordPath))
      console.log(`✅ Deleted ${collection}/${id} from Firebase`)
      return true
    } catch (error) {
      console.error(`❌ Error deleting ${collection}/${id}:`, error)
      throw error
    }
  }

  /**
   * Process sync queue item
   */
  async syncQueueItem(item) {
    try {
      const { table, operation, data } = item

      switch (operation) {
        case 'create':
          // Use invoiceNo, grnNo, code, email, userId, or firebaseUid as ID if available
          let createId = data.invoiceNo || data.grnNo || data.code || data.jobNo || data.id
          
          // For users, prefer email, firebaseUid, or userId
          if (table === 'users') {
            createId = data.email || data.firebaseUid || data.userId || createId
          }
          
          // If still no ID, generate one
          if (!createId) {
            createId = push(ref(database, this.getCollectionPath(table))).key
          }
          
          await this.syncRecord(table, createId, { ...data, id: createId })
          return { success: true, id: createId }

        case 'update':
          let updateId = data.invoiceNo || data.grnNo || data.code || data.jobNo || data.id
          
          // For users, prefer email, firebaseUid, or userId
          if (table === 'users') {
            updateId = data.email || data.firebaseUid || data.userId || updateId
          }
          
          if (!updateId) {
            throw new Error('No ID found for update operation')
          }
          await this.syncRecord(table, updateId, data)
          return { success: true, id: updateId }

        case 'delete':
          let deleteId = data.id || data.invoiceNo || data.grnNo || data.code || data.jobNo
          
          // For users, prefer email, firebaseUid, or userId
          if (table === 'users') {
            deleteId = data.email || data.firebaseUid || data.userId || deleteId
          }
          
          if (!deleteId) {
            throw new Error('No ID found for delete operation')
          }
          await this.deleteRecord(table, deleteId)
          return { success: true, id: deleteId }

        default:
          throw new Error(`Unknown operation: ${operation}`)
      }
    } catch (error) {
      console.error('Error processing sync queue item:', error)
      throw error
    }
  }

  /**
   * Download all data from Firebase for a collection
   */
  async downloadCollection(collection) {
    try {
      const collectionPath = this.getCollectionPath(collection)
      const snapshot = await get(ref(database, collectionPath))
      
      if (snapshot.exists()) {
        const data = snapshot.val()
        // Convert Firebase object to array
        const records = Object.keys(data).map(key => ({
          ...data[key],
          firebaseId: key, // Keep Firebase ID reference
          synced: true // Mark as synced
        }))
        return records
      }
      return []
    } catch (error) {
      console.error(`Error downloading ${collection}:`, error)
      throw error
    }
  }

  /**
   * Download all collections from Firebase (on startup)
   */
  async downloadAllCollections() {
    try {
      const collections = ['sales', 'inventory', 'customers', 'suppliers', 'grn', 'jobNotes', 'warranty', 'users', 'cashFlow']
      const allData = {}

      for (const collection of collections) {
        try {
          allData[collection] = await this.downloadCollection(collection)
          console.log(`✅ Downloaded ${collection}: ${allData[collection].length} records`)
        } catch (error) {
          console.error(`❌ Error downloading ${collection}:`, error)
          allData[collection] = []
        }
      }

      return allData
    } catch (error) {
      console.error('Error downloading all collections:', error)
      throw error
    }
  }

  /**
   * Sync all local records to Firebase (one-time sync)
   */
  async syncAllToFirebase(dbService) {
    try {
      const collections = ['sales', 'inventory', 'customers', 'suppliers', 'grn', 'jobNotes', 'warranty', 'users', 'cashFlow']
      let syncedCount = 0

      for (const collection of collections) {
        try {
          const records = await dbService.readAll(collection)
          
          for (const record of records) {
            try {
              // Determine ID
              const id = record.invoiceNo || record.grnNo || record.code || record.jobNo || record.id
              if (id) {
                await this.syncRecord(collection, id, record)
                // Mark as synced in local DB
                if (record.id) {
                  await dbService.update(collection, record.id, { synced: true })
                }
                syncedCount++
              }
            } catch (error) {
              console.error(`Error syncing ${collection} record:`, error)
            }
          }
        } catch (error) {
          console.error(`Error syncing ${collection}:`, error)
        }
      }

      console.log(`✅ Synced ${syncedCount} records to Firebase`)
      return syncedCount
    } catch (error) {
      console.error('Error syncing all to Firebase:', error)
      throw error
    }
  }

  /**
   * Setup real-time listener for a collection
   */
  setupRealtimeListener(collection, callback) {
    const collectionPath = this.getCollectionPath(collection)
    const collectionRef = ref(database, collectionPath)

    const listener = onValue(collectionRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        const records = Object.keys(data).map(key => ({
          ...data[key],
          firebaseId: key,
          synced: true
        }))
        callback(records)
      } else {
        callback([])
      }
    }, (error) => {
      console.error(`Error in realtime listener for ${collection}:`, error)
    })

    // Store listener reference for cleanup
    if (!this.syncListeners[collection]) {
      this.syncListeners[collection] = []
    }
    this.syncListeners[collection].push({ ref: collectionRef, listener })

    return () => {
      off(collectionRef)
      this.syncListeners[collection] = this.syncListeners[collection].filter(
        l => l.ref !== collectionRef
      )
    }
  }

  /**
   * Cleanup all listeners
   */
  cleanupListeners() {
    Object.keys(this.syncListeners).forEach(collection => {
      this.syncListeners[collection].forEach(({ ref }) => {
        off(ref)
      })
    })
    this.syncListeners = {}
  }
}

// Export singleton instance
export const firebaseSync = new FirebaseSyncService()

