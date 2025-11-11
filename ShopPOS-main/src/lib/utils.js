import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount, currency = 'LKR') {
  if (currency === 'LKR') {
    // Custom formatting for Sri Lankan Rupees to show "Rs." instead of "LKR"
    return `Rs. ${new Intl.NumberFormat('en-LK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)}`
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

export function formatDate(date, format = 'short') {
  const options = {
    short: { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    },
    long: { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    },
    time: {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }
  }
  
  return new Intl.DateTimeFormat('en-US', options[format]).format(new Date(date))
}

export function generateId(prefix = '') {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substr(2, 5)
  return `${prefix}${timestamp}${random}`.toUpperCase()
}

export function generateInvoiceNumber() {
  const date = new Date()
  const year = date.getFullYear().toString().substr(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const time = Date.now().toString().substr(-4)
  return `INV${year}${month}${day}${time}`
}

export function generateBarcode(length = 12) {
  // Generate EAN-13 compatible barcode (13 digits)
  // Format: 12 digits + 1 check digit
  if (length === 13) {
    let barcode = ''
    // Generate 12 random digits
    for (let i = 0; i < 12; i++) {
      barcode += Math.floor(Math.random() * 10).toString()
    }
    
    // Calculate EAN-13 check digit
    let sum = 0
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(barcode[i])
      sum += (i % 2 === 0) ? digit : digit * 3
    }
    const checkDigit = (10 - (sum % 10)) % 10
    return barcode + checkDigit.toString()
  }
  
  // Generate CODE128 compatible barcode (alphanumeric, any length)
  // For shorter codes, use random digits
  let result = ''
  const characters = '0123456789'
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

export function calculateTax(amount, taxRate) {
  return (amount * taxRate) / 100
}

export function calculateDiscount(amount, discountRate, isPercentage = true) {
  if (isPercentage) {
    return (amount * discountRate) / 100
  }
  return discountRate
}

export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

export function validatePhone(phone) {
  const re = /^[\+]?[1-9][\d]{0,15}$/
  return re.test(phone.replace(/\s/g, ''))
}

export function debounce(func, wait, immediate) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      timeout = null
      if (!immediate) func(...args)
    }
    const callNow = immediate && !timeout
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    if (callNow) func(...args)
  }
}

export function throttle(func, limit) {
  let inThrottle
  return function() {
    const args = arguments
    const context = this
    if (!inThrottle) {
      func.apply(context, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

export function exportToCSV(data, filename) {
  const csvContent = "data:text/csv;charset=utf-8," 
    + data.map(e => Object.values(e).join(",")).join("\n")
  
  const encodedUri = encodeURI(csvContent)
  const link = document.createElement("a")
  link.setAttribute("href", encodedUri)
  link.setAttribute("download", `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function printElement(elementId, title = 'Print') {
  const printContent = document.getElementById(elementId)
  if (!printContent) return
  
  const windowUrl = 'about:blank'
  const uniqueName = new Date()
  const windowName = 'Print' + uniqueName.getTime()
  const printWindow = window.open(windowUrl, windowName, 'width=800,height=600')
  
  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          @media print {
            body { margin: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
    </html>
  `)
  
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
  printWindow.close()
}

export function getStorageItem(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch (error) {
    console.error('Error reading from localStorage:', error)
    return defaultValue
  }
}

export function setStorageItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.error('Error writing to localStorage:', error)
    return false
  }
}

export function removeStorageItem(key) {
  try {
    localStorage.removeItem(key)
    return true
  } catch (error) {
    console.error('Error removing from localStorage:', error)
    return false
  }
}
