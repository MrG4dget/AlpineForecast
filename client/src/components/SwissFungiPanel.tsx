import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Database, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface SyncStatus {
  inProgress: boolean;
  lastSyncDate?: string;
}

interface SyncReport {
  totalSwissSpecies: number;
  existingSpecies: number;
  newSpeciesAdded: number;
  updatedSpecies: number;
  errors: Array<{
    species: string;
    error: string;
  }>;
  missingSpecies: Array<{
    scientificName: string;
    commonName?: string;
    priority: 'high' | 'medium' | 'low';
    reason: string;
  }>;
}

interface ComparisonReport {
  localSpeciesCount: number;
  swissSpeciesCount: number;
  commonSpecies: string[];
  localOnlySpecies: string[];
  swissOnlySpecies: string[];
}

export function SwissFungiPanel() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [comparisonReport, setComparisonReport] = useState<ComparisonReport | null>(null);
  const [lastSyncReport, setLastSyncReport] = useState<SyncReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial data
  useEffect(() => {
    fetchSyncStatus();
    fetchComparisonReport();
  }, []);

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/swiss-fungi/status');
      if (response.ok) {
        const status = await response.json();
        setSyncStatus(status);
      }
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
    }
  };

  const fetchComparisonReport = async () => {
    try {
      const response = await fetch('/api/swiss-fungi/comparison');
      if (response.ok) {
        const report = await response.json();
        setComparisonReport(report);
      }
    } catch (error) {
      console.error('Failed to fetch comparison report:', error);
    }
  };

  const handleAddCuratedSpecies = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/swiss-fungi/add-curated', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const report = await response.json();
        setLastSyncReport(report);
        await fetchComparisonReport(); // Refresh comparison
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to add curated species');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncWithSwissFungi = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/swiss-fungi/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maxSpecies: 10, // Limit for demo
          addMissing: true,
          updateExisting: false
        }),
      });

      if (response.ok) {
        const report = await response.json();
        setLastSyncReport(report);
        await fetchSyncStatus();
        await fetchComparisonReport();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to sync with Swiss Fungi');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Swiss Fungi Integration
          </CardTitle>
          <CardDescription>
            Integrate mushroom species data from the Swiss Fungi database (SwissFungi.wsl.ch)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Sync Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-semibold">Sync Status</h3>
              <p className="text-sm text-muted-foreground">
                {syncStatus?.inProgress ? 'Sync in progress...' : 
                 syncStatus?.lastSyncDate ? `Last synced: ${new Date(syncStatus.lastSyncDate).toLocaleString()}` :
                 'Never synced'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {syncStatus?.inProgress ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
            </div>
          </div>

          {/* Species Comparison */}
          {comparisonReport && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {comparisonReport.localSpeciesCount}
                </div>
                <div className="text-sm text-muted-foreground">Local Species</div>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">
                  {comparisonReport.swissSpeciesCount}
                </div>
                <div className="text-sm text-muted-foreground">Swiss Species</div>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {comparisonReport.commonSpecies.length}
                </div>
                <div className="text-sm text-muted-foreground">Common Species</div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              onClick={handleAddCuratedSpecies}
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              Add Curated Swiss Species
            </Button>
            
            <Button 
              onClick={handleSyncWithSwissFungi}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              Sync with Swiss Fungi (Demo)
            </Button>
          </div>

          {/* Missing Species from Swiss DB */}
          {comparisonReport && comparisonReport.swissOnlySpecies.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Info className="h-4 w-4" />
                Missing Swiss Species ({comparisonReport.swissOnlySpecies.length})
              </h3>
              <div className="grid gap-2 max-h-60 overflow-y-auto">
                {comparisonReport.swissOnlySpecies.slice(0, 10).map((species, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm font-medium">{species}</span>
                    <Badge variant="outline" className="text-xs">
                      Missing
                    </Badge>
                  </div>
                ))}
                {comparisonReport.swissOnlySpecies.length > 10 && (
                  <div className="text-sm text-muted-foreground text-center py-2">
                    ... and {comparisonReport.swissOnlySpecies.length - 10} more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Last Sync Report */}
          {lastSyncReport && (
            <div className="space-y-3">
              <h3 className="font-semibold">Last Sync Report</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-3 bg-blue-50 rounded">
                  <div className="text-lg font-bold text-blue-600">
                    {lastSyncReport.totalSwissSpecies}
                  </div>
                  <div className="text-xs text-blue-800">Total Processed</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded">
                  <div className="text-lg font-bold text-green-600">
                    {lastSyncReport.newSpeciesAdded}
                  </div>
                  <div className="text-xs text-green-800">Added</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded">
                  <div className="text-lg font-bold text-yellow-600">
                    {lastSyncReport.existingSpecies}
                  </div>
                  <div className="text-xs text-yellow-800">Existing</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded">
                  <div className="text-lg font-bold text-red-600">
                    {lastSyncReport.errors.length}
                  </div>
                  <div className="text-xs text-red-800">Errors</div>
                </div>
              </div>

              {/* Missing Species with Priority */}
              {lastSyncReport.missingSpecies.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">High Priority Missing Species</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {lastSyncReport.missingSpecies
                      .filter(s => s.priority === 'high')
                      .slice(0, 5)
                      .map((species, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded text-sm">
                          <div>
                            <div className="font-medium">{species.scientificName}</div>
                            {species.commonName && (
                              <div className="text-muted-foreground text-xs">{species.commonName}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getPriorityColor(species.priority)}>
                              {species.priority}
                            </Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Errors */}
              {lastSyncReport.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-red-600">Sync Errors</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {lastSyncReport.errors.slice(0, 3).map((error, index) => (
                      <div key={index} className="p-2 bg-red-50 border border-red-200 rounded text-sm">
                        <div className="font-medium text-red-800">{error.species}</div>
                        <div className="text-red-600 text-xs">{error.error}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}