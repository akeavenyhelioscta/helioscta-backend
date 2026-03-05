import calendar
import json
import logging
import os
import zipfile
from datetime import datetime, timedelta

import api_manager

# The name of the content we want to retrieve the ID in order to check for its data
desired_content_name = "USA US48 wind power generation forecast Meteologica hourly"

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
desired_content = [
    item["id"]
    for item in available_contents["contents"]
    # Iterate over the key-value pairs in each item
    for key, value in item.items()
    # Check if the value is in the list of desired content names
    if value == desired_content_name
][0]

# Create a directory based on the content name where the data will be stored if it does not already exist
dirname = f"{desired_content_name.replace(' ','_').lower()}"
if not os.path.isdir(dirname):
    os.mkdir(dirname)

# Start with the current month in last year and the next month
loop_date = datetime.now().date() - timedelta(days=365)

# Loop until a year has been completed
while loop_date < datetime.now().date():
    # Get the formatted date strings needed for the API request
    month = loop_date.strftime("%#m")
    year = loop_date.strftime("%Y")

    logging.info(f"downloading historical data for {year}/{month}")

    # Make a GET request to the "contents/{id}/historical_data" endpoint
    response = api_manager.make_get_request(
        f"contents/{desired_content}/historical_data/{year}/{month}",
        {"token": token},
    )

    # If the request was successful (status code 200)
    if response.status_code == 200:
        # Save the month zip
        month_zipname = f"{dirname}/{year}{month}.zip"
        with open(month_zipname, "wb") as f:
            for chunk in response.iter_content(chunk_size=512):
                if chunk:
                    f.write(chunk)

        # Extract the month zip into the folder
        with zipfile.ZipFile(month_zipname) as zf:
            zf.extractall(dirname)

        # Delete the zipfile
        os.remove(month_zipname)
        # If the request returned an error status code other than 404 (not found)
    elif response.status_code != 404:
        # Print the error message from the response
        logging.error(response.json())

    # Set the start date to the month next to the current start date
    loop_date = loop_date + timedelta(
        days=calendar.monthrange(loop_date.year, loop_date.month)[1]
    )