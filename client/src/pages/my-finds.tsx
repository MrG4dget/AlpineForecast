import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MobileHeader from "@/components/mobile-header";
import BottomNavigation from "@/components/bottom-navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, MapPin, Camera, Plus, Search, BookmarkCheck } from "lucide-react";
import type { UserFind, MushroomSpecies, ForagingLocation } from "@shared/schema";

export default function MyFinds() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddingFind, setIsAddingFind] = useState(false);

  // Mock user ID for demo
  const userId = "demo-user";

  const { data: finds, isLoading } = useQuery<UserFind[]>({
    queryKey: ["/api/finds", userId],
  });

  const { data: species } = useQuery<MushroomSpecies[]>({
    queryKey: ["/api/species"],
  });

  const { data: locations } = useQuery<ForagingLocation[]>({
    queryKey: ["/api/locations"],
  });

  const getSpeciesName = (speciesId: string | null) => {
    if (!speciesId || !species) return "Unknown Species";
    const specie = species.find(s => s.id === speciesId);
    return specie?.name || "Unknown Species";
  };

  const getLocationName = (locationId: string | null) => {
    if (!locationId || !locations) return "Unknown Location";
    const location = locations.find(l => l.id === locationId);
    return location?.name || "Unknown Location";
  };

  const filteredFinds = finds?.filter((find) => {
    const speciesName = getSpeciesName(find.speciesId);
    const locationName = getLocationName(find.locationId);
    const searchLower = searchTerm.toLowerCase();
    
    return speciesName.toLowerCase().includes(searchLower) ||
           locationName.toLowerCase().includes(searchLower) ||
           (find.notes && find.notes.toLowerCase().includes(searchLower));
  });

  const formatDate = (date: Date | null) => {
    if (!date) return "Unknown Date";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

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
            <BookmarkCheck className="h-4 w-4 mr-2" />Species Guide
          </Button>
          <Button 
            variant="ghost" 
            className="flex-shrink-0 px-4 py-3 border-b-2 border-forest-600 bg-forest-50 text-forest-700 font-medium text-sm whitespace-nowrap"
            data-testid="nav-my-finds"
          >
            <Calendar className="h-4 w-4 mr-2" />My Finds
          </Button>
        </div>
      </nav>

      {/* Header with Add Button */}
      <div className="bg-white border-b border-forest-200">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">My Mushroom Finds</h1>
            <Dialog open={isAddingFind} onOpenChange={setIsAddingFind}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-forest-600 hover:bg-forest-700"
                  data-testid="button-add-find"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Find
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Record New Find</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Species</label>
                    <select className="w-full mt-1 p-2 border border-gray-300 rounded-md" data-testid="select-species">
                      <option value="">Select species...</option>
                      {species?.map((specie) => (
                        <option key={specie.id} value={specie.id}>
                          {specie.name} ({specie.scientificName})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Location</label>
                    <select className="w-full mt-1 p-2 border border-gray-300 rounded-md" data-testid="select-location">
                      <option value="">Select location...</option>
                      {locations?.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Quantity</label>
                    <Input 
                      type="number" 
                      placeholder="How many did you find?" 
                      data-testid="input-quantity"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Notes</label>
                    <Textarea 
                      placeholder="Add any notes about your find..." 
                      data-testid="textarea-notes"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setIsAddingFind(false)}
                      data-testid="button-cancel-find"
                    >
                      Cancel
                    </Button>
                    <Button 
                      className="flex-1 bg-forest-600 hover:bg-forest-700"
                      data-testid="button-save-find"
                    >
                      Save Find
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search your finds..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-finds"
            />
          </div>
        </div>
      </div>

      {/* Finds List */}
      <div className="p-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="h-5 bg-gray-200 rounded w-1/2 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                      <div className="w-16 h-16 bg-gray-200 rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        ) : filteredFinds && filteredFinds.length > 0 ? (
          <div className="space-y-4">
            {filteredFinds.map((find) => (
              <Card key={find.id} className="hover:shadow-md transition-shadow" data-testid={`find-card-${find.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-gray-900" data-testid={`text-species-${find.id}`}>
                          {getSpeciesName(find.speciesId)}
                        </h3>
                        {find.verified && (
                          <Badge className="bg-green-100 text-green-700 text-xs">
                            Verified
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          <span data-testid={`text-location-${find.id}`}>
                            {getLocationName(find.locationId)}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          <span data-testid={`text-date-${find.id}`}>
                            {formatDate(find.foundAt)}
                          </span>
                        </div>
                        {find.quantity && (
                          <div className="flex items-center">
                            <span className="font-medium">Quantity: </span>
                            <span data-testid={`text-quantity-${find.id}`}>
                              {find.quantity}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {find.notes && (
                        <p className="text-sm text-gray-700 mt-2" data-testid={`text-notes-${find.id}`}>
                          {find.notes}
                        </p>
                      )}
                    </div>
                    
                    <div className="ml-4">
                      {find.photoUrl ? (
                        <img 
                          src={find.photoUrl} 
                          alt="Mushroom find" 
                          className="w-16 h-16 object-cover rounded"
                          data-testid={`img-photo-${find.id}`}
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                          <Camera className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <BookmarkCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? "No Matching Finds" : "No Finds Yet"}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? "Try adjusting your search terms." 
                : "Start recording your mushroom discoveries to build your foraging journal."}
            </p>
            {searchTerm ? (
              <Button
                variant="outline"
                onClick={() => setSearchTerm("")}
                data-testid="button-clear-search"
              >
                Clear Search
              </Button>
            ) : (
              <Button
                className="bg-forest-600 hover:bg-forest-700"
                onClick={() => setIsAddingFind(true)}
                data-testid="button-add-first-find"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Find
              </Button>
            )}
          </Card>
        )}
      </div>

      <BottomNavigation currentPage="finds" />
    </div>
  );
}
