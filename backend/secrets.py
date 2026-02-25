import os
import os
from dotenv import load_dotenv
from pathlib import Path

# init logging
import logging
logging.basicConfig(level=logging.INFO)
logging.getLogger().handlers[0].setLevel(logging.INFO)

"""
"""

# Get the directory where this config file lives
CONFIG_DIR = Path(__file__).parent
logging.info(f"CONFIG_DIR: {CONFIG_DIR}")
load_dotenv(dotenv_path=CONFIG_DIR / ".env", override=False)


# ────── Azure PostgreSQL ──────
AZURE_POSTGRESQL_DB_HOST = os.getenv("AZURE_POSTGRESQL_DB_HOST")
AZURE_POSTGRESQL_DB_USER = os.getenv("AZURE_POSTGRESQL_DB_USER")
AZURE_POSTGRESQL_DB_PASSWORD = os.getenv("AZURE_POSTGRESQL_DB_PASSWORD")
AZURE_POSTGRESQL_DB_PORT = os.getenv("AZURE_POSTGRESQL_DB_PORT")

# ────── Azure Access Tokens for Outlook Emails ──────
AZURE_OUTLOOK_CLIENT_ID = os.getenv("AZURE_OUTLOOK_CLIENT_ID")
AZURE_OUTLOOK_TENANT_ID = os.getenv("AZURE_OUTLOOK_TENANT_ID")
AZURE_OUTLOOK_CLIENT_SECRET = os.getenv("AZURE_OUTLOOK_CLIENT_SECRET")

# ────── Slack ──────
SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN")
SLACK_DEFAULT_GROUP_ID = os.getenv("SLACK_DEFAULT_GROUP_ID")
SLACK_DEFAULT_CHANNEL_NAME = os.getenv("SLACK_DEFAULT_CHANNEL_NAME")
SLACK_DEFAULT_WEBHOOK_URL = os.getenv("SLACK_DEFAULT_WEBHOOK_URL")

# ────── Positions and Trades ──────

# CLEAR_STREET
CLEAR_STREET_SFTP_HOST = os.getenv("CLEAR_STREET_SFTP_HOST")
CLEAR_STREET_SFTP_USER = os.getenv("CLEAR_STREET_SFTP_USER")
CLEAR_STREET_SSH_KEY_PATH = os.getenv("CLEAR_STREET_SSH_KEY_PATH")
CLEAR_STREET_SFTP_PORT = int(os.getenv("CLEAR_STREET_SFTP_PORT"))
CLEAR_STREET_SFTP_REMOTE_DIR = r'/'

# MUFG
MUFG_SFTP_HOST = os.getenv("MUFG_SFTP_HOST")
MUFG_SFTP_USER = os.getenv("MUFG_SFTP_USER")
MUFG_SFTP_PASSWORD = os.getenv("MUFG_SFTP_PASSWORD")
MUFG_SFTP_PORT = int(os.getenv("MUFG_SFTP_PORT"))
MUFG_SFTP_REMOTE_DIR = r'/'

# MAREX
MAREX_SFTP_HOST = os.getenv("MAREX_SFTP_HOST")
MAREX_SFTP_USER = os.getenv("MAREX_SFTP_USER")
MAREX_SFTP_PASSWORD = os.getenv("MAREX_SFTP_PASSWORD")
MAREX_SFTP_PORT = int(os.getenv("MAREX_SFTP_PORT"))
MAREX_SFTP_REMOTE_DIR = r'/'

# NAV
NAV_SFTP_HOST = os.getenv("NAV_SFTP_HOST")
NAV_SFTP_USER = os.getenv("NAV_SFTP_USER")
NAV_SFTP_PASSWORD = os.getenv("NAV_SFTP_PASSWORD")
NAV_SFTP_PORT = int(os.getenv("NAV_SFTP_PORT"))
NAV_SFTP_REMOTE_DIR = r'/'