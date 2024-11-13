import React, { useEffect, useRef, useState } from "react";
import {
  GoogleMap,
  Marker,
  DirectionsRenderer,
  useLoadScript,
} from "@react-google-maps/api";
import {
  IonPage,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  useIonRouter,
} from "@ionic/react";
import { locate, location } from "ionicons/icons";
import { Geolocation } from "@capacitor/geolocation"; // Import Geolocation
import "./Ambulancemainpage.css";

const containerStyle = {
  width: "100%",
  height: "370px",
};

const center = {
  lat: 18.516726,
  lng: 73.856255,
};

const libraries = ["places", "directions"];

const AmbulanceMainPage = () => {
  const [map, setMap] = useState<any>(null);
  const [sourceMarker, setSourceMarker] = useState<any>(null);
  const [destinationMarker, setDestinationMarker] = useState<any>(null);
  const [directions, setDirections] = useState<any>(null); // State for storing directions
  const [error, setError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<any>(null); // State for current location
  const [distance, setDistance] = useState(""); // Distance state
  const [duration, setDuration] = useState(""); // Duration state
  const router = useIonRouter();

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const sourceRef = useRef<HTMLIonInputElement | null>(null);
  const destinationRef = useRef<HTMLIonInputElement | null>(null);

  useEffect(() => {
    if (loadError) {
      setError("Google Maps API could not be loaded.");
      console.error(loadError);
    }

    if (
      !localStorage.getItem("authToken") &&
      !localStorage.getItem("userType")
    ) {
      router.push("/", "root", "replace");
    }
  }, [loadError, router]);

  const fetchCurrentLocation = async () => {
    try {
      let position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true, // Provides a more accurate position
      });
      // Request permissions
      const permission = await Geolocation.requestPermissions();

      if (permission.location === "granted") {
        position = await Geolocation.getCurrentPosition();
        const { latitude, longitude } = position.coords;

        setCurrentLocation({ lat: latitude, lng: longitude });

        if (sourceRef.current) {
          sourceRef.current.value = `${latitude}, ${longitude}`;
        }

        if (sourceMarker) {
          sourceMarker.setMap(null);
        }

        const newSourceMarker = new window.google.maps.Marker({
          position: { lat: latitude, lng: longitude },
          map,
          title: "Current Location",
        });
        setSourceMarker(newSourceMarker);

        map.panTo(new window.google.maps.LatLng(latitude, longitude));
      } else {
        setError("Location permission denied.");
      }
    } catch (error) {
      console.error("Error getting location:", error);
      setError("Failed to get current location");
    }
  };

  useEffect(() => {
    const initializeAutocomplete = async () => {
      if (isLoaded && sourceRef.current && destinationRef.current) {
        const sourceInput = await sourceRef.current.getInputElement();
        const destinationInput = await destinationRef.current.getInputElement();

        const sourceAutocomplete = new window.google.maps.places.Autocomplete(
          sourceInput,
          { types: ["geocode"] }
        );
        const destinationAutocomplete =
          new window.google.maps.places.Autocomplete(destinationInput, {
            types: ["geocode"],
          });

        sourceAutocomplete.addListener("place_changed", () => {
          const place = sourceAutocomplete.getPlace();
          if (place.geometry && place.geometry.location) {
            // Clear previous source marker
            if (sourceMarker) {
              sourceMarker.setMap(null);
            }
            // Set new source marker
            const newSourceMarker = new window.google.maps.Marker({
              position: place.geometry.location,
              map,
              title: "Source",
            });
            setSourceMarker(newSourceMarker);
            map.panTo(place.geometry.location);
          }
        });

        destinationAutocomplete.addListener("place_changed", () => {
          const place = destinationAutocomplete.getPlace();
          if (place.geometry && place.geometry.location) {
            // Clear previous destination marker
            if (destinationMarker) {
              destinationMarker.setMap(null);
            }
            // Set new destination marker
            const newDestinationMarker = new window.google.maps.Marker({
              position: place.geometry.location,
              map,
              title: "Destination",
            });
            setDestinationMarker(newDestinationMarker);
            map.panTo(place.geometry.location);
          }
        });
      }
    };

    initializeAutocomplete();
  }, [isLoaded, map, sourceMarker, destinationMarker]);

  const calculateRoute = () => {
    if (sourceMarker && destinationMarker) {
      const directionsService = new window.google.maps.DirectionsService();
      const request = {
        origin: sourceMarker.getPosition(),
        destination: destinationMarker.getPosition(),
        travelMode: window.google.maps.TravelMode.DRIVING, // You can choose other modes if necessary
        unitSystem: window.google.maps.UnitSystem.METRIC,
      };

      directionsService.route(request, (result, status) => {
        if (status === "OK") {
          setDirections(result);
          // Extract distance and duration from the result
          const route = result.routes[0].legs[0];
          setDistance(route.distance.text);
          setDuration(route.duration.text);
        } else {
          setError("Directions request failed due to " + status);
        }
      });
    }
  };

  const handleStartTrip = () => {
    // Ensure that both source and destination markers are set
    if (sourceMarker && destinationMarker) {
      // Get the coordinates of source and destination
      const sourceCoords = sourceMarker.getPosition();
      const destinationCoords = destinationMarker.getPosition();

      // Construct the Google Maps URL
      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${sourceCoords.lat()},${sourceCoords.lng()}&destination=${destinationCoords.lat()},${destinationCoords.lng()}`;

      // Open the Google Maps URL in a new tab
      window.open(googleMapsUrl, "_blank");
    } else {
      // Show an error if source or destination is missing
      setError(
        "Please set both source and destination before starting the trip."
      );
    }
  };

  const logout = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const confirmLogout = window.confirm("Are you sure you want to log out?");
    if (!confirmLogout) return;

    localStorage.removeItem("authToken");
    localStorage.removeItem("userType");
    router.push("/ambulance-signin", "root", "replace");
  };

  if (!isLoaded) return <div>Loading Maps...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;

  return (
    <IonPage>
      <IonContent>
        <div className="container">
          <h1 className="title">Ambulance Portal</h1>

          {/* Source - Destination Inputs */}
          <div className="input-container">
            <IonList className="input-list" style={{ background: "white" }}>
              <IonItem lines="none" className="input-box">
                <IonInput
                  ref={sourceRef}
                  labelPlacement="stacked"
                  label="Source"
                  className="input-label"
                >
                  <IonIcon
                    style={{ color: "black", scale: "1.5" }}
                    slot="start"
                    icon={location}
                    aria-hidden="true"
                  />
                </IonInput>
              </IonItem>
            </IonList>
            <IonList className="input-list" style={{ background: "white" }}>
              <IonItem lines="none" className="input-box">
                <IonInput
                  ref={destinationRef}
                  labelPlacement="stacked"
                  label="Destination"
                  className="input-label"
                >
                  <IonIcon
                    style={{ color: "black", scale: "1.5" }}
                    slot="start"
                    icon={location}
                    aria-hidden="true"
                  />
                </IonInput>
              </IonItem>
            </IonList>
          </div>

          <div className="button-container">
            <div>
              <IonIcon
                onClick={fetchCurrentLocation}
                className="locate-icon"
                icon={locate}
              />
            </div>
            <button className="route-button" onClick={calculateRoute}>
              Show Route
            </button>
            <button onClick={handleStartTrip} className="start-button">
              Start
            </button>
          </div>

          {/* Logout Button */}
          <div className="logout-container">
            <p>Duration: {duration}</p>
            <p>Distance: {distance}</p>
            <button onClick={logout} className="logout-button">
              Logout
            </button>
          </div>

          {/* Map Display */}
          <div className="map-container">
            <GoogleMap
              id="map"
              mapContainerStyle={containerStyle}
              center={center}
              zoom={6}
              onLoad={(mapInstance) => setMap(mapInstance)}
              options={{ gestureHandling: "greedy" }}
            >
              {sourceMarker && <Marker position={sourceMarker.getPosition()} />}
              {destinationMarker && (
                <Marker position={destinationMarker.getPosition()} />
              )}
              {directions && <DirectionsRenderer directions={directions} />}
            </GoogleMap>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AmbulanceMainPage;
