import argparse
import webbrowser

import folium
import requests


def fetch_isoline(lat, lon,
                  type_, mode, range_,
                  avoid=None, traffic="free_flow", route_type="balanced", max_speed=None,
                  units="metric",
                  api_key=None):
    """Fetch isoline data from Geoapify API."""
    url = "https://api.geoapify.com/v1/isoline"

    params = {
        "lat": lat,
        "lon": lon,
        "type": type_,
        "mode": mode,
        "range": range_,
        "traffic": traffic,
        "route_type": route_type,
        "units": units,
        "apiKey": api_key,
    }

    # Build avoid params as elements separated by |
    if avoid:
        params["avoid"] = "|".join(avoid)

    if max_speed:
        params["max_speed"] = max_speed

    response = requests.get(url, params=params)

    if response.status_code == 200:
        # Return isoline for on success
        return response.json()
    else:
        print(f"API request failed: {response.text}")
        exit(1)


def render_map(lat, lon, isoline_data, output_file):
    """Render isoline on a Folium map."""
    m = folium.Map(location=[lat, lon], zoom_start=13)

    # Extract coordinates and type from GeoJSON, skip empty data
    if "features" in isoline_data and len(isoline_data["features"]) > 0:
        folium.GeoJson(
            isoline_data,
            style_function=lambda feature: {
                "color": "orange" if feature["properties"].get("type") == "time" else "green",
                "fillColor": "orange" if feature["properties"].get("type") == "time" else "green",
                "fillOpacity": 0.4,
            },
            # Enable popup with isoline metadata
            popup=folium.features.GeoJsonPopup(fields=["id", "range", "mode"], aliases=['Id', 'Range', 'Mode'])
        ).add_to(m)

    m.save(output_file)
    print(f"Map saved to {output_file}")
    webbrowser.open(output_file)


def main():
    parser = argparse.ArgumentParser(description="Generate isoline maps using Geoapify API.")

    parser.add_argument("--lat", type=float, required=True, help="Latitude of the starting point.")
    parser.add_argument("--lon", type=float, required=True, help="Longitude of the starting point.")
    parser.add_argument("--type", type=str, choices=["time", "distance"], required=True,
                        help="Isochrone or isodistance.")
    parser.add_argument("--mode", type=str, required=True, help="Travel mode.")
    parser.add_argument("--range", type=int, required=True,
                        help="Isoline range (seconds for time, meters for distance).")
    parser.add_argument("--avoid", type=str, nargs="*", help="Avoid options (e.g., tolls, ferries).")
    parser.add_argument("--traffic", type=str, default="free_flow", choices=["free_flow", "approximated"],
                        help="Traffic model.")
    parser.add_argument("--route_type", type=str, default="balanced", choices=["balanced", "short", "less_maneuvers"],
                        help="Route optimization type.")
    parser.add_argument("--max_speed", type=int, help="Maximum vehicle speed in KPH.")
    parser.add_argument("--units", type=str, default="metric", choices=["metric", "imperial"],
                        help="Distance measurement system.")
    parser.add_argument("--output", type=str, default="map.html", help="Path to save the generated HTML file.")
    parser.add_argument('--api_key', required=True, type=str, help='Geoapify API KEY')

    args = parser.parse_args()

    try:
        # Fetch isoline data
        isoline_data = fetch_isoline(
            lat=args.lat,
            lon=args.lon,
            type_=args.type,
            mode=args.mode,
            range_=args.range,
            avoid=args.avoid,
            traffic=args.traffic,
            route_type=args.route_type,
            max_speed=args.max_speed,
            units=args.units,
            api_key=args.api_key
        )

        # Render the map
        render_map(args.lat, args.lon, isoline_data, args.output)

    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    main()
