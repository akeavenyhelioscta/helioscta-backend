import json
import os
import time

import api_manager

# The names of the contents we want to retrieve their IDs in order to check for their data
desired_content_names = [
    "France day ahead power price forecast Meteologica hourly",
    "Spain day ahead power price forecast Meteologica hourly",
    "Austria day ahead power price forecast Meteologica hourly",
    "Portugal day ahead power price forecast Meteologica hourly",
    "Belgium day ahead power price forecast Meteologica hourly",
    "Finland day ahead power price forecast Meteologica hourly",
    "Italy CALA day ahead power price forecast Meteologica hourly",
    "Greece day ahead power price forecast Meteologica hourly",
    "Denmark DK2 day ahead power price forecast Meteologica hourly",
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

# Keep running the loop indefinitely
while True:
    # Get or refresh the stored token
    token = api_manager.get_or_refresh_stored_token()

    # Make a GET request to the "latest" endpoint
    response = api_manager.make_get_request("latest", {"token": token, "seconds": 180})

    # If the request was successful (status code 200)
    if response.status_code == 200:
        # Get the latest updates from the response
        latest_updates = response.json()["latest_updates"]

        for id, name in desired_contents.items():
            # Iterate over the updates
            for update in latest_updates:
                # If the update corresponds to the content with the given ID
                if update["content_id"] == id:
                    # Make a GET request to the "contents/{id}/data" endpoint
                    content_data = api_manager.make_get_request(
                        f"contents/{id}/data",
                        {"token": token, "update_id": update["update_id"]},
                    )

                    # Build the file name based on the content name and the update ID
                    filename = (
                        f"{name.replace(' ','_').lower()}_{update['update_id']}.json"
                    )

                    # Write the data to a .json file
                    with open(filename, "w") as f:
                        json.dump(content_data.json(), f)
    # If the request returned an error status code other than 404 (not found)
    elif response.status_code != 404:
        # Print the error message from the response
        print(response.json())

    # Sleep for 3 minutes before making the next request
    time.sleep(180)