import MobileHeader from "@/components/mobile-header";
import BottomNavigation from "@/components/bottom-navigation";
import { SwissFungiPanel } from "@/components/SwissFungiPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { User, Settings, Award, MapPin, Bell, Download, Wifi, WifiOff } from "lucide-react";

export default function Profile() {
  return (
    <div className="min-h-screen bg-forest-50 pb-20">
      <MobileHeader />
      
      {/* Navigation Tab */}
      <nav className="bg-white border-b border-forest-200 sticky top-16 z-40">
        <div className="flex overflow-x-auto">
          <Button 
            variant="ghost" 
            className="flex-shrink-0 px-4 py-3 border-b-2 border-transparent text-gray-600 font-medium text-sm whitespace-nowrap"
            data-testid="nav-map-view"
          >
            <MapPin className="h-4 w-4 mr-2" />Map View
          </Button>
          <Button 
            variant="ghost" 
            className="flex-shrink-0 px-4 py-3 border-b-2 border-transparent text-gray-600 font-medium text-sm whitespace-nowrap"
            data-testid="nav-species-guide"
          >
            <Settings className="h-4 w-4 mr-2" />Species Guide
          </Button>
          <Button 
            variant="ghost" 
            className="flex-shrink-0 px-4 py-3 border-b-2 border-transparent text-gray-600 font-medium text-sm whitespace-nowrap"
            data-testid="nav-my-finds"
          >
            <Award className="h-4 w-4 mr-2" />My Finds
          </Button>
          <Button 
            variant="ghost" 
            className="flex-shrink-0 px-4 py-3 border-b-2 border-forest-600 bg-forest-50 text-forest-700 font-medium text-sm whitespace-nowrap"
            data-testid="nav-profile"
          >
            <User className="h-4 w-4 mr-2" />Profile
          </Button>
        </div>
      </nav>

      <div className="p-4 space-y-6">
        {/* Profile Info */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-forest-600 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900" data-testid="text-username">
                  Demo Forager
                </h2>
                <p className="text-gray-600" data-testid="text-member-since">
                  Member since December 2024
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge className="bg-forest-100 text-forest-700">
                    Intermediate Forager
                  </Badge>
                  <Badge variant="outline">
                    Zurich Region
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="h-5 w-5 text-forest-600 mr-2" />
              Foraging Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-forest-600" data-testid="stat-total-finds">0</div>
                <div className="text-sm text-gray-600">Total Finds</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-forest-600" data-testid="stat-species-found">0</div>
                <div className="text-sm text-gray-600">Species Found</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-forest-600" data-testid="stat-locations-visited">0</div>
                <div className="text-sm text-gray-600">Locations Visited</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-forest-600" data-testid="stat-verified-finds">0</div>
                <div className="text-sm text-gray-600">Verified Finds</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* App Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 text-forest-600 mr-2" />
              App Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">Location Services</label>
                <p className="text-xs text-gray-600">Allow app to access your GPS location</p>
              </div>
              <Switch defaultChecked data-testid="switch-location-services" />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">Weather Notifications</label>
                <p className="text-xs text-gray-600">Get alerts for optimal foraging conditions</p>
              </div>
              <Switch defaultChecked data-testid="switch-weather-notifications" />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">Offline Mode</label>
                <p className="text-xs text-gray-600">Download maps and guides for offline use</p>
              </div>
              <Switch data-testid="switch-offline-mode" />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">Safety Alerts</label>
                <p className="text-xs text-gray-600">Show warnings about dangerous look-alikes</p>
              </div>
              <Switch defaultChecked data-testid="switch-safety-alerts" />
            </div>
          </CardContent>
        </Card>

        {/* Offline Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Download className="h-5 w-5 text-forest-600 mr-2" />
              Offline Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-forest-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-forest-600" />
                <div>
                  <p className="font-medium text-gray-900">Current Area Maps</p>
                  <p className="text-sm text-gray-600">Zurich Region - 10km radius</p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-700 text-xs">
                Downloaded
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Settings className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">Species Database</p>
                  <p className="text-sm text-gray-600">Complete mushroom guide</p>
                </div>
              </div>
              <Button 
                size="sm" 
                className="bg-forest-600 hover:bg-forest-700"
                data-testid="button-download-species"
              >
                Download
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Bell className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">Weather Cache</p>
                  <p className="text-sm text-gray-600">7-day forecast data</p>
                </div>
              </div>
              <Button 
                size="sm" 
                className="bg-forest-600 hover:bg-forest-700"
                data-testid="button-download-weather"
              >
                Download
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Help & Support */}
        <Card>
          <CardHeader>
            <CardTitle>Help & Support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              data-testid="button-safety-guide"
            >
              Safety Guidelines & Best Practices
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              data-testid="button-mushroom-identification"
            >
              Mushroom Identification Tips
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              data-testid="button-legal-info"
            >
              Swiss Foraging Laws & Regulations
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              data-testid="button-contact-support"
            >
              Contact Support
            </Button>
          </CardContent>
        </Card>

        {/* Swiss Fungi Integration */}
        <SwissFungiPanel />

        {/* App Info */}
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-gray-600 mb-2">Pilztastic v1.0.0</p>
            <p className="text-xs text-gray-500">
              Made with ❤️ for Swiss mushroom foragers
            </p>
          </CardContent>
        </Card>
      </div>

      <BottomNavigation currentPage="profile" />
    </div>
  );
}
