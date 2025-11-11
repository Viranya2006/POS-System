# ShopPOS - Professional Point of Sale System

A complete, production-ready Electron + React + Firebase desktop POS system with barcode scanning, inventory management, offline support, and modern UI.

## 🚀 Features

### Core Functionality
- **Sales Processing** - Fast barcode scanning, product lookup, payment processing
- **Inventory Management** - Complete product catalog with stock tracking
- **Customer Management** - Customer database with purchase history
- **Supplier Management** - Vendor information and purchase orders
- **GRN (Goods Received Notes)** - Stock receiving and updates
- **Job Notes** - Service job tracking and management
- **Warranty Management** - Product warranty tracking
- **Reports & Analytics** - Comprehensive business reporting

### Technical Features
- **Offline-First** - Works without internet, syncs when connected
- **Barcode/QR Scanning** - Built-in camera support for product scanning
- **Receipt Printing** - A4 and thermal receipt printing
- **Multi-User Support** - Role-based access (Admin/Cashier)
- **Cloud Sync** - Real-time Firebase synchronization
- **Modern UI** - Beautiful glassmorphism design with dark/light themes

## 🛠️ Technology Stack

- **Frontend**: React 18, TailwindCSS, shadcn/ui, Framer Motion
- **Desktop**: Electron 28
- **Database**: Firebase Realtime Database + IndexedDB (offline)
- **Authentication**: Firebase Auth
- **Barcode**: ZXing Library + JsBarcode
- **Charts**: Recharts
- **Build**: Vite + Electron Builder

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone [<repository-url>](https://github.com/Viranya2006/POS-System)
   cd ShopPOS
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Create a Firebase project at https://console.firebase.google.com
   - Enable Authentication and Realtime Database
   - Copy your Firebase config to `src/lib/firebase.js`

4. **Development mode**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build:electron
   ```

## 🔧 Configuration

### Firebase Setup
1. Create a new Firebase project
2. Enable Authentication (Email/Password)
3. Enable Realtime Database
4. Update `src/lib/firebase.js` with your config:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
}
```

### Default Users
Create these users in Firebase Authentication:
- **Admin**: admin@gmail.com / admin123

## 🎯 Usage

### Getting Started
1. Launch the application
2. Login with admin credentials
3. Add your first products in Inventory
4. Configure settings (shop info, tax rates, etc.)
5. Start processing sales!

### Key Shortcuts
- `F1` - Dashboard
- `F2` - Sales (Focus barcode scanner)
- `F3` - Inventory
- `F4` - Payment modal (in sales)
- `Ctrl+P` - Print receipt
- `Ctrl+N` - New sale
- `Ctrl+S` - Save sale

### Barcode Scanning
- Use any USB barcode scanner
- Built-in camera scanning available
- Supports Code128, EAN, UPC formats
- Auto-generates barcodes for new products

## 📱 Modules

### 1. Dashboard
- Real-time sales overview
- Low stock alerts
- Business analytics
- Quick action buttons

### 2. Sales
- Barcode scanning interface
- Product search and selection
- Multiple payment methods
- Receipt generation and printing

### 3. Inventory
- Product catalog management
- Stock level tracking
- Barcode generation
- Category organization

### 4. Reports
- Sales reports by date range
- Inventory valuation
- Profit/loss analysis
- Export to CSV/PDF

### 5. Settings
- Shop information
- Tax configuration
- User preferences
- System settings

## 🔒 Security & Permissions

### User Roles
- **Admin**: Full system access
- **Cashier**: Sales and basic inventory view

### Data Security
- Firebase Authentication
- Role-based access control
- Encrypted local storage
- Secure API communications

## 📊 Database Schema

### Firebase Structure
```
/Inventory/{ProductCode}
/Sales/{InvoiceId}
/Customers/{CustomerId}
/Suppliers/{SupplierId}
/Users/{UserId}
/GRN/{GRNId}
/JobNotes/{JobId}
/Warranty/{WarrantyId}
```

### Local IndexedDB
- Mirrors Firebase structure
- Handles offline operations
- Sync queue for pending changes

## 🖨️ Printing

### Supported Formats
- **A4 Receipts** - Full-page invoices
- **Thermal Receipts** - 80mm thermal printers
- **Barcode Labels** - Product labels

### Print Features
- Silent printing option
- Custom receipt templates
- QR codes on receipts
- Company branding

## 🌐 Offline Support

### Offline Capabilities
- Complete sales processing
- Inventory updates
- Customer management
- Data persistence

### Sync Behavior
- Auto-sync when online
- Conflict resolution
- Retry mechanism
- Sync status indicators

## 🏗️ Build & Distribution

### Development Build
```bash
npm run dev          # Start dev server
npm run dev:electron # Start Electron in dev mode
```

### Production Build
```bash
npm run build                # Build React app
npm run build:electron       # Build Electron app
```

### Distribution
- Generates Windows `.exe` installer
- NSIS installer with desktop shortcuts
- Auto-updater ready structure
- Code signing support

## 🐛 Troubleshooting

### Common Issues

**Camera not working**
- Check camera permissions
- Ensure camera is not used by other apps
- Try different camera if multiple available

**Firebase connection issues**
- Verify Firebase config
- Check internet connection
- Ensure Firebase services are enabled

**Print not working**
- Check printer drivers
- Verify printer is set as default
- Test with different paper sizes

### Debug Mode
- Open DevTools with `Ctrl+Shift+I`
- Check console for errors
- Monitor network requests

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- React team for the amazing framework
- Electron team for desktop capabilities
- Firebase team for backend services
- TailwindCSS for utility-first CSS
- All open-source contributors

## 📞 Support

- **Email**: support@shoppos.com
- **Website**: https://www.shoppos.com
- **Documentation**: https://docs.shoppos.com

---

**Made with ❤️ for small businesses worldwide**
