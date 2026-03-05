import os
import time
import logging
import sys

import dotenv
import jwt
import requests
from dotenv import load_dotenv

# Configure log
logging.basicConfig(
    stream=sys.stdout, format="%(asctime)s %(message)s", level=logging.INFO
)

# Load the environment variables from the .env file
dotenv_file = dotenv.find_dotenv()
load_dotenv(dotenv_file)

# Set the base URL for the API
baseurl = "https://api-markets.meteologica.com/api/v1/"


def make_get_request(endpoint, query_params):
    """Function to make a GET request to the API"""
    # Construct the full URL by combining the base URL, endpoint, and query parameters
    url = baseurl + endpoint

    # Perform the API request
    response = requests.get(url, params=query_params)

    # Return the response
    return response


def make_post_request(endpoint, json_body):
    """Function to make a POST request to the API"""
    # Construct the full URL by combining the base URL, endpoint, and query parameters
    url = baseurl + endpoint

    # Perform the API request
    response = requests.post(url, json=json_body)

    # Return the response
    return response


def get_new_token(user, password):
    """Function to get a new token from the API"""
    # Make a POST request to the login endpoint with the user's credentials
    # Return the token from the response
    response = make_post_request("login", {"user": user, "password": password})

    try:
        return response.json()["token"]
    except (KeyError, RuntimeError) as e:
        raise RuntimeError(
            f"Could not get the token from the response: {response.text} ({response.status_code})"
        ) from e


def refresh_token():
    """Function to refresh an existing token"""
    # Make a GET request to the keepalive endpoint with the current token
    # Return the new token from the response
    response = make_get_request("keepalive", {"token": os.getenv("API_TOKEN")})

    try:
        return response.json()["token"]
    except (KeyError, RuntimeError) as e:
        raise RuntimeError(
            f"Could not get the token from the response: {response.text} ({response.status_code})"
        ) from e


def get_or_refresh_stored_token():
    """Function to get a new token if the existing one is invalid or refresh it if it is close to expiring"""
    token = os.getenv("API_TOKEN")

    # Check if the current token is not set or has already expired
    if not token or (
        token is not None
        and time.time() > jwt.decode(token, options={"verify_signature": False})["exp"]
    ):
        logging.info("getting new token")

        user = os.getenv("API_USER")
        password = os.getenv("API_PASSWORD")

        if user is None or password is None:
            raise RuntimeError(
                "User and password must be specified. Check your '.env' file."
            )

        new_token = get_new_token(user, password)

        # If the token is not set or has expired, get a new one using the user's credentials from the .env file
        dotenv.set_key(dotenv_file, "API_TOKEN", new_token)

        # Load the updated environment variables
        load_dotenv(dotenv_file, override=True)

        return os.getenv("API_TOKEN")

    # If the current token is set and has not yet expired, check if it is close to expiring
    exp = jwt.decode(token, options={"verify_signature": False})["exp"]
    now = time.time()

    # If the token is close to expiring (less than 5 minutes), refresh it
    if exp - now < 300 and exp - now > 0:
        logging.info("refreshing token")

        # Refresh the token and update the .env file
        dotenv.set_key(dotenv_file, "API_TOKEN", refresh_token())
        load_dotenv(dotenv_file, override=True)

        return os.getenv("API_TOKEN")
    else:
        # Return the current token
        return token