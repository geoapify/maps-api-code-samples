import folium

# Variables for map configuration
location = [48.8584, 2.2945]  # Latitude and Longitude of the Eiffel Tower
zoom_level = 15
marker_popup = "Eiffel Tower"
marker_color = "red"
output_file = "../../../geoapfiy-maps/pythonProject/folium_map.html"

# Create a Folium map centered on the location
map_folium = folium.Map(location=location, zoom_start=zoom_level)

# Add a marker at the specified location
folium.Marker(
    location=location,
    popup=marker_popup,
    icon=folium.Icon(color=marker_color),
).add_to(map_folium)

# Save the map as an HTML file
map_folium.save(output_file)

print(f"Map created! Open {output_file} to view it.")
