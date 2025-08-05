import { useState, useEffect } from "react";

interface GeolocationState {
  location: {
    latitude: number;
    longitude: number;
  } | null;
  accuracy: number | null;
  error: string | null;
  isLoading: boolean;
}

interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean;
}

export function useGeolocation(options: GeolocationOptions = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 15000,
    maximumAge = 60000,
    watch = true,
  } = options;

  const [state, setState] = useState<GeolocationState>({
    location: null,
    accuracy: null,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    let watchId: number | null = null;
    let mounted = true;

    if (!navigator.geolocation) {
      setState({
        location: null,
        accuracy: null,
        error: "Geolocation is not supported by this browser",
        isLoading: false,
      });
      return;
    }

    const handleSuccess = (position: GeolocationPosition) => {
      if (!mounted) return;

      setState({
        location: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
        accuracy: position.coords.accuracy,
        error: null,
        isLoading: false,
      });
    };

    const handleError = (error: GeolocationPositionError) => {
      if (!mounted) return;

      let errorMessage: string;
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = "Location access denied. Please enable location services and refresh the page.";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = "Location information is unavailable. Please check your GPS settings.";
          break;
        case error.TIMEOUT:
          errorMessage = "Location request timed out. Please try again.";
          break;
        default:
          errorMessage = "An unknown error occurred while retrieving location.";
          break;
      }

      setState({
        location: null,
        accuracy: null,
        error: errorMessage,
        isLoading: false,
      });
    };

    const geoOptions: PositionOptions = {
      enableHighAccuracy,
      timeout,
      maximumAge,
    };

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleError,
      geoOptions
    );

    // Set up watching if requested
    if (watch) {
      watchId = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        geoOptions
      );
    }

    return () => {
      mounted = false;
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [enableHighAccuracy, timeout, maximumAge, watch]);

  const refreshLocation = () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          accuracy: position.coords.accuracy,
          error: null,
          isLoading: false,
        });
      },
      (error) => {
        let errorMessage: string;
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied. Please enable location services.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
          default:
            errorMessage = "An unknown error occurred while retrieving location.";
            break;
        }

        setState({
          location: null,
          accuracy: null,
          error: errorMessage,
          isLoading: false,
        });
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge: 0, // Force fresh reading
      }
    );
  };

  return {
    ...state,
    refreshLocation,
  };
}
