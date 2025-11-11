import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Info, ExternalLink, Mail, Globe, Heart } from 'lucide-react'

const About = () => {
  const appVersion = '1.0.0'
  const buildDate = new Date().toLocaleDateString()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">About ShopPOS</h1>
        <p className="text-gray-600 dark:text-gray-400">Information about this application</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* App Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Info className="h-5 w-5 mr-2" />
              Application Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-2xl">SP</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">ShopPOS</h2>
              <p className="text-gray-600 dark:text-gray-400">Professional Point of Sale System</p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Version:</span>
                <span className="font-semibold">{appVersion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Build Date:</span>
                <span className="font-semibold">{buildDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Platform:</span>
                <span className="font-semibold">Electron + React</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">License:</span>
                <span className="font-semibold">MIT License</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>Key Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Barcode & QR Code Scanning</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Inventory Management</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Sales Processing</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Receipt Printing</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Cloud Synchronization</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Offline Mode Support</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Multi-user Support</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Business Analytics</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technology Stack */}
        <Card>
          <CardHeader>
            <CardTitle>Technology Stack</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Frontend</h4>
                <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                  <li>• React 18</li>
                  <li>• TailwindCSS</li>
                  <li>• shadcn/ui</li>
                  <li>• Framer Motion</li>
                  <li>• Recharts</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Backend</h4>
                <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                  <li>• Electron</li>
                  <li>• Firebase</li>
                  <li>• IndexedDB</li>
                  <li>• Dexie.js</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Tools</h4>
                <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                  <li>• Vite</li>
                  <li>• ZXing Library</li>
                  <li>• JsBarcode</li>
                  <li>• React Router</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Build</h4>
                <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                  <li>• Electron Builder</li>
                  <li>• PostCSS</li>
                  <li>• ESLint</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Support & Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Support & Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Mail className="h-4 w-4 mr-2" />
                support@shoppos.com
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Globe className="h-4 w-4 mr-2" />
                www.shoppos.com
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <ExternalLink className="h-4 w-4 mr-2" />
                Documentation
              </Button>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                Made with <Heart className="h-4 w-4 inline text-red-500" /> for small businesses
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Runtime Environment</h4>
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-600 dark:text-gray-400">Platform:</span> {window.electronAPI?.platform || 'Web'}</p>
                <p><span className="text-gray-600 dark:text-gray-400">Node.js:</span> Available</p>
                <p><span className="text-gray-600 dark:text-gray-400">Electron:</span> v28.0.0</p>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Database</h4>
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-600 dark:text-gray-400">Local:</span> IndexedDB</p>
                <p><span className="text-gray-600 dark:text-gray-400">Cloud:</span> Firebase</p>
                <p><span className="text-gray-600 dark:text-gray-400">Sync:</span> Real-time</p>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Features Status</h4>
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-600 dark:text-gray-400">Offline Mode:</span> ✅ Enabled</p>
                <p><span className="text-gray-600 dark:text-gray-400">Printing:</span> ✅ Available</p>
                <p><span className="text-gray-600 dark:text-gray-400">Camera:</span> ✅ Supported</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credits */}
      <Card>
        <CardHeader>
          <CardTitle>Credits & Acknowledgments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <p>ShopPOS is built using open-source technologies and libraries:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>React - A JavaScript library for building user interfaces</li>
              <li>Electron - Build cross-platform desktop apps with web technologies</li>
              <li>TailwindCSS - A utility-first CSS framework</li>
              <li>Firebase - Google's mobile and web application development platform</li>
              <li>Lucide React - Beautiful & consistent icon toolkit</li>
              <li>ZXing - Multi-format 1D/2D barcode image processing library</li>
            </ul>
            <p className="pt-4">
              Special thanks to all the open-source contributors who made this project possible.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default About
