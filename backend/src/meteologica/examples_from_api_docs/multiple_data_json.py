import json
import os

import api_manager

# The names of the contents we want to retrieve their IDs in order to check for their data
desired_content_names = [
    "USA US48 wind power generation forecast Meteologica hourly",
    "USA US48 photovoltaic power generation forecast Meteologica hourly",
    "USA US48 power demand forecast Meteologica hourly",
    "USA US48 power demand forecast ECMWF ENS hourly",
    "USA US48 power demand observation",
    "USA US48 photovoltaic power generation normal hourly",
    "USA US48 photovoltaic power generation forecast ARPEGE hourly",
    "USA US48 photovoltaic power generation forecast GFS hourly",
    "USA US48 photovoltaic power generation forecast ECMWF HRES hourly",
    "USA US48 photovoltaic power generation forecast GEFS hourly",
    "USA US48 photovoltaic power generation forecast NWP hourly",
    "USA US48 photovoltaic power generation forecast NWP hourly",
]

# Get or refresh the stored token
token = api_manager.get_or_refresh_stored_token()

# Check if the available_contents.json file exists
if not os.path.exists("available_contents.json"):
    # Parse the JSON data from the response
    available_contents = api_manager.make_get_request(
        "contents", {"token": token}
    ).json()

    # Write the data to a .json file
    with open("available_contents.json", "w") as f:
        json.dump(available_contents, f)
else:
    # Load the JSON data from the file
    with open("available_contents.json", "r") as f:
        available_contents = json.load(f)

# Create a dictionary that maps the "id" field of each item in the available_contents list
# to the value in the dictionary if it is present in the desired_content_names list
desired_contents = {
    item["id"]: value
    for item in available_contents["contents"]
    # Iterate over the key-value pairs in each item
    for key, value in item.items()
    # Check if the value is in the list of desired content names
    if value in desired_content_names
}

for i, (id, name) in enumerate(desired_contents.items()):
    # Make a GET request to the "contents/{id}/data" endpoint
    response = api_manager.make_get_request(f"contents/{id}/data", {"token": token})

    # If the request was successful (status code 200)
    if response.status_code == 200:
        # Build the file name based on the content name and the update ID
        filename = f"{name.replace(' ','_').lower()}_latest.json"

        # Write the data to a .json file
        with open(filename, "w") as f:
            json.dump(response.json(), f)
        # If the request returned an error status code other than 404 (not found)
    elif response.status_code != 404:
        # Print the error message from the response
        print(response.json())