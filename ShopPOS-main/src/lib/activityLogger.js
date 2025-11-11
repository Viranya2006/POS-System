import { dbService } from './database'

/**
 * Activity Logger Service
 * Tracks user actions and changes in the system
 */
class ActivityLogger {
  /**
   * Get current user info (from auth context or localStorage)
   */
  getCurrentUser() {
    try {
      // Try to get from localStorage (demo mode)
      const demoUser = localStorage.getItem('demoUser')
      if (demoUser) {
        const user = JSON.parse(demoUser)
        return {
          id: user.uid || 'demo-user',
          name: user.displayName || user.email || 'Demo User',
          email: user.email || 'demo@shoppos.com'
        }
      }
      
      // Try to get from Firebase Auth (if available)
      if (window.firebaseAuth) {
        const user = window.firebaseAuth.currentUser
        if (user) {
          return {
            id: user.uid,
            name: user.displayName || user.email,
            email: user.email
          }
        }
      }
      
      // Fallback
      return {
        id: 'unknown',
        name: 'Unknown User',
        email: 'unknown@shoppos.com'
      }
    } catch (error) {
      console.error('Error getting current user:', error)
      return {
        id: 'unknown',
        name: 'Unknown User',
        email: 'unknown@shoppos.com'
      }
    }
  }

  /**
   * Log an activity
   */
  async log(action, entity, entityId = null, details = {}) {
    try {
      const user = this.getCurrentUser()
      
      const activity = {
        userId: user.id,
        userName: user.name,
        action, // 'create', 'update', 'delete', 'view', 'export', etc.
        entity, // 'sale', 'inventory', 'grn', 'customer', etc.
        entityId,
        details: typeof details === 'string' ? { message: details } : details,
        timestamp: new Date().toISOString(),
        synced: false
      }

      await dbService.create('activityLog', activity)
      
      // Don't block execution if logging fails
      return true
    } catch (error) {
      console.error('Error logging activity:', error)
      // Don't throw - logging should not break functionality
      return false
    }
  }

  /**
   * Log a sale creation
   */
  async logSale(saleId, invoiceNo, total, details = {}) {
    return await this.log('create', 'sale', saleId, {
      invoiceNo,
      total,
      ...details
    })
  }

  /**
   * Log a GRN creation/receipt
   */
  async logGRN(grnId, grnNo, total, details = {}) {
    return await this.log('create', 'grn', grnId, {
      grnNo,
      total,
      ...details
    })
  }

  /**
   * Log inventory update
   */
  async logInventory(productId, code, action, details = {}) {
    return await this.log(action, 'inventory', productId, {
      code,
      ...details
    })
  }

  /**
   * Log user login
   */
  async logLogin(userId, email) {
    return await this.log('login', 'auth', userId, { email })
  }

  /**
   * Log user logout
   */
  async logLogout(userId) {
    return await this.log('logout', 'auth', userId)
  }

  /**
   * Log report export
   */
  async logExport(reportType, format, details = {}) {
    return await this.log('export', 'report', null, {
      reportType,
      format, // 'pdf', 'csv', etc.
      ...details
    })
  }

  /**
   * Log setting change
   */
  async logSettingChange(settingKey, oldValue, newValue) {
    return await this.log('update', 'settings', settingKey, {
      oldValue,
      newValue
    })
  }

  /**
   * Get activity logs
   */
  async getLogs(filters = {}) {
    try {
      let logs = await dbService.readAll('activityLog')
      
      // Apply filters
      if (filters.userId) {
        logs = logs.filter(log => log.userId === filters.userId)
      }
      
      if (filters.entity) {
        logs = logs.filter(log => log.entity === filters.entity)
      }
      
      if (filters.action) {
        logs = logs.filter(log => log.action === filters.action)
      }
      
      if (filters.startDate && filters.endDate) {
        const start = new Date(filters.startDate)
        const end = new Date(filters.endDate)
        end.setHours(23, 59, 59, 999)
        
        logs = logs.filter(log => {
          const logDate = new Date(log.timestamp)
          return logDate >= start && logDate <= end
        })
      }
      
      // Sort by timestamp (newest first)
      return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    } catch (error) {
      console.error('Error getting activity logs:', error)
      return []
    }
  }
}

// Export singleton instance
export const activityLogger = new ActivityLogger()

