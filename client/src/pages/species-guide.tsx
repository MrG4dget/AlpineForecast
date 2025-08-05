import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MobileHeader from "@/components/mobile-header";
import BottomNavigation from "@/components/bottom-navigation";
import SpeciesCard from "@/components/species-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Filter, BookOpen, AlertTriangle } from "lucide-react";
import type { MushroomSpecies } from "@shared/schema";

export default function SpeciesGuide() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSeason, setSelectedSeason] = useState<string>("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("");

  const { data: species, isLoading } = useQuery<MushroomSpecies[]>({
    queryKey: ["/api/species"],
  });

  const filteredSpecies = species?.filter((specie) => {
    const matchesSearch = specie.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         specie.scientificName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeason = !selectedSeason || specie.season === selectedSeason;
    const matchesDifficulty = !selectedDifficulty || specie.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesSeason && matchesDifficulty;
  });

  const seasons = ["Spring", "Summer", "Fall", "Winter", "All Year"];
  const difficulties = ["beginner", "intermediate", "expert"];

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
            className="flex-shrink-0 px-4 py-3 border-b-2 border-forest-600 bg-forest-50 text-forest-700 font-medium text-sm whitespace-nowrap"
            data-testid="nav-species-guide"
          >
            <BookOpen className="h-4 w-4 mr-2" />Species Guide
          </Button>
        </div>
      </nav>

      {/* Search and Filters */}
      <div className="bg-white shadow-sm border-b border-forest-200">
        <div className="p-4 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search mushrooms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-species"
            />
          </div>

          {/* Filter Pills */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Season</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedSeason === "" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSeason("")}
                  className={selectedSeason === "" ? "bg-forest-600 hover:bg-forest-700" : ""}
                  data-testid="filter-season-all"
                >
                  All Seasons
                </Button>
                {seasons.map((season) => (
                  <Button
                    key={season}
                    variant={selectedSeason === season ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSeason(season)}
                    className={selectedSeason === season ? "bg-forest-600 hover:bg-forest-700" : ""}
                    data-testid={`filter-season-${season.toLowerCase().replace(' ', '-')}`}
                  >
                    {season}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Difficulty</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedDifficulty === "" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedDifficulty("")}
                  className={selectedDifficulty === "" ? "bg-forest-600 hover:bg-forest-700" : ""}
                  data-testid="filter-difficulty-all"
                >
                  All Levels
                </Button>
                {difficulties.map((difficulty) => (
                  <Button
                    key={difficulty}
                    variant={selectedDifficulty === difficulty ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedDifficulty(difficulty)}
                    className={selectedDifficulty === difficulty ? "bg-forest-600 hover:bg-forest-700" : ""}
                    data-testid={`filter-difficulty-${difficulty}`}
                  >
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Species Grid */}
      <div className="p-4">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="h-48 bg-gray-200"></div>
                  <div className="p-4">
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                    <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredSpecies && filteredSpecies.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {filteredSpecies.length} Species Found
              </h2>
              <Badge variant="outline" className="text-forest-600 border-forest-600">
                {searchTerm && `"${searchTerm}"`}
                {selectedSeason && ` ${selectedSeason}`}
                {selectedDifficulty && ` ${selectedDifficulty}`}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSpecies.map((specie) => (
                <div key={specie.id} className="transform transition-transform hover:scale-105">
                  <SpeciesCard species={specie} detailed />
                </div>
              ))}
            </div>
          </>
        ) : (
          <Card className="p-8 text-center">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Species Found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedSeason || selectedDifficulty
                ? "Try adjusting your search or filters."
                : "No mushroom species data available."}
            </p>
            {(searchTerm || selectedSeason || selectedDifficulty) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedSeason("");
                  setSelectedDifficulty("");
                }}
                data-testid="button-clear-filters"
              >
                Clear Filters
              </Button>
            )}
          </Card>
        )}
      </div>

      {/* Safety Information */}
      <div className="bg-yellow-50 border border-yellow-200 m-4 rounded-lg">
        <div className="p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
            <div>
              <h4 className="text-yellow-800 font-medium text-sm mb-2">Important Safety Guidelines</h4>
              <ul className="text-yellow-700 text-xs space-y-1">
                <li>• Never eat a mushroom unless you are 100% certain of its identification</li>
                <li>• Consult multiple field guides and experts before consuming wild mushrooms</li>
                <li>• Some edible mushrooms have toxic look-alikes</li>
                <li>• When in doubt, don't risk it - your safety is paramount</li>
                <li>• Always cook wild mushrooms thoroughly before eating</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <BottomNavigation currentPage="species" />
    </div>
  );
}
