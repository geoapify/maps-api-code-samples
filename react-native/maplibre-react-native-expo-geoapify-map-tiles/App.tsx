import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  Marker,
  type LngLat,
} from "@maplibre/maplibre-react-native";

// Your Geoapify API key, read from .env (EXPO_PUBLIC_GEOAPIFY_API_KEY=...)
const API_KEY = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY;

// Geoapify vector map styles: https://apidocs.geoapify.com/docs/maps/map-tiles/
const styleUrl = (style: string) =>
  `https://maps.geoapify.com/v1/styles/${style}/style.json?apiKey=${API_KEY}`;

// Santa Fe Plaza, New Mexico
const PLAZA: LngLat = [-105.9384, 35.6872];

export default function App() {
  const [dark, setDark] = useState(false);
  const [cafes, setCafes] = useState<GeoJSON.FeatureCollection | null>(null);
  const [placesError, setPlacesError] = useState(false);

  // Load up to 20 cafés within 800 m of the plaza from the Geoapify Places API (20 places = 1 credit)
  useEffect(() => {
    const controller = new AbortController();
    const [lon, lat] = PLAZA;
    const url =
      "https://api.geoapify.com/v2/places" +
      `?categories=catering.cafe` +
      `&filter=circle:${lon},${lat},800` +
      `&bias=proximity:${lon},${lat}` +
      `&limit=20&apiKey=${API_KEY}`;

    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Places API returned ${response.status}`);
        }
        const data: unknown = await response.json();
        if (
          !data ||
          typeof data !== "object" ||
          !("type" in data) ||
          data.type !== "FeatureCollection" ||
          !("features" in data) ||
          !Array.isArray(data.features)
        ) {
          throw new Error("Places API returned invalid GeoJSON");
        }
        return data as GeoJSON.FeatureCollection;
      })
      .then(setCafes)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error("Failed to load cafés:", error);
          setPlacesError(true);
        }
      });

    return () => controller.abort();
  }, []);

  return (
    <View style={styles.container}>
      <Map style={styles.map} mapStyle={styleUrl(dark ? "dark-matter" : "osm-bright")}>
        <Camera initialViewState={{ center: PLAZA, zoom: 15 }} />

        {cafes && (
          <GeoJSONSource id="cafes" data={cafes}>
            <Layer
              id="cafe-circles"
              type="circle"
              paint={{
                "circle-radius": 7,
                "circle-color": "#e8762d",
                "circle-stroke-width": 2,
                "circle-stroke-color": "#ffffff",
              }}
            />
          </GeoJSONSource>
        )}

        <Marker id="plaza" lngLat={PLAZA} anchor="bottom">
          <View style={styles.pin}>
            <Text style={styles.pinText}>Plaza</Text>
          </View>
        </Marker>
      </Map>

      <Pressable style={styles.button} onPress={() => setDark(!dark)}>
        <Text style={styles.buttonText}>{dark ? "Light map" : "Dark map"}</Text>
      </Pressable>

      {placesError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>Could not load cafés. Check your API key and connection.</Text>
        </View>
      )}

      <StatusBar style={dark ? "light" : "dark"} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  pin: {
    backgroundColor: "#7b3fbf",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pinText: { color: "#ffffff", fontWeight: "600" },
  button: {
    position: "absolute",
    top: 60,
    right: 16,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    elevation: 3,
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  buttonText: { fontWeight: "600" },
  errorBanner: {
    position: "absolute",
    top: 112,
    left: 16,
    right: 16,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 12,
  },
  errorText: { color: "#a52620", fontWeight: "600" },
});
