# slackapp.py
import os
import json
import logging
import warnings
from typing import Any, Dict, List
import traceback
import sys

import requests
import pandas as pd
import snowflake.connector
from dotenv import load_dotenv
from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend



# ─── Suppress Slack SDK “missing text” warning ───────────────────────────────
warnings.filterwarnings(
    "ignore",
    message="The top-level text argument is missing",
    category=UserWarning
)

# ─── Load environment variables ───────────────────────────────────────────────
load_dotenv("dataagent.env.dev")

SLACK_BOT_TOKEN   = os.environ["SLACK_BOT_TOKEN"]
SLACK_APP_TOKEN   = os.environ["SLACK_APP_TOKEN"]

SNOWFLAKE_USER         = os.environ["SNOWFLAKE_USER"]
SNOWFLAKE_ACCOUNT      = os.environ["SNOWFLAKE_ACCOUNT_NAME"]
PRIVATE_KEY_PATH       = os.environ["SNOWFLAKE_PRIVATE_KEY_PATH"]
PRIVATE_KEY_PASSPHRASE = os.environ.get("SNOWFLAKE_PRIVATE_KEY_PASSPHRASE")

SNOWFLAKE_PAT = os.environ["SNOWFLAKE_PAT"]
SF_DATABASE   = os.environ["SF_DATABASE"]
SF_SCHEMA     = os.environ["SF_SCHEMA"]
SF_ROLE       = os.environ["SF_ROLE"]
SF_WAREHOUSE  = os.environ["SF_WAREHOUSE"]
SF_STAGE      = os.environ["SF_STAGE"]
SF_MODEL_FILE = os.environ["SF_MODEL_FILE"]
REQUEST_TIMEOUT = int(os.environ.get("SF_TIMEOUT", 60))

ANALYST_ENDPOINT = (
    f"https://{SNOWFLAKE_ACCOUNT}.snowflakecomputing.com"
    "/api/v2/cortex/analyst/message"
)
SEMANTIC_MODEL_FILE = f"@{SF_DATABASE}.{SF_SCHEMA}.{SF_STAGE}/{SF_MODEL_FILE}"

# ─── Initialize Slack Bolt ───────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
try:
    logger.debug("Initializing Slack app with token: %s", SLACK_BOT_TOKEN)
    app = App(token=SLACK_BOT_TOKEN)
    logger.info("Slack app initialized successfully.")
except Exception as e:
    traceback.print_exc()
    logger.error("Failed to initialize Slack app.")
    sys.exit(e)

# ─── Slack Listeners ─────────────────────────────────────────────────────────
@app.message("hello")
def greet(message, say):
    say(text=f"Hey there <@{message['user']}>! :snowflake:")
    say(text="Ask me anything—either with `/askcortex` or just type your question.")

@app.command("/askcortex")
def command_ask(ack, body, say):
    ack()
    prompt = body.get("text", "").strip()
    if not prompt:
        return say(text="Please include a question after `/askcortex`.")
    _process(prompt, say)

@app.event("message")
def catch_all(ack, body, say):
    # ignore bot echoes
    if body.get("event", {}).get("bot_id"):
        return ack()
    ack()

    raw_text = body["event"]["text"].strip()
    _process(raw_text, say)

# ─── Core Processing ─────────────────────────────────────────────────────────
def _process(prompt: str, say) -> None:
    say(text=f"*Question:* {prompt}")
    say(text="Snowflake Cortex Analyst is thinking… :hourglass_flowing_sand:")
    try:
        resp = _query_analyst(prompt)
        # If the response contains an error type, pass it directly
        if "message" in resp and "content" in resp["message"]:
            _render_response(resp["message"]["content"], say)
        else:
            # Handle unexpected response format
            _render_response(
                [{"type": "error", "text": "Unexpected response from Cortex Analyst."}],
                say
            )
    except Exception as e:
        # Pass the error message to _render_response
        _render_response(
            [{"type": "error", "text": f"Error communicating with Cortex Analyst: {str(e)}"}],
            say
        )

def _query_analyst(prompt: str) -> Dict[str, Any]:
    """
    Sends a prompt to the Snowflake Cortex Analyst endpoint and returns the response.

    Args:
        prompt (str): The user prompt to be sent for analysis.

    Returns:
        Dict[str, Any]: The JSON response from the Cortex Analyst endpoint. If the request times out,
            returns a dictionary with an error message in the expected response format.

    Raises:ç
        requests.HTTPError: If the HTTP request to the Cortex Analyst endpoint fails with a non-OK status code.

    Logs:
        - The request payload and headers at debug level.
        - The endpoint being contacted at info level.
        - Errors for timeouts and non-OK responses.
    """
    payload = {
        "messages": [
            {"role": "user", "content": [{"type": "text", "text": prompt}]}
        ],
        "semantic_model_file": SEMANTIC_MODEL_FILE #Adjust if you are doing a view
    }
    headers = {
        "X-Snowflake-Authorization-Token-Type": "PROGRAMMATIC_ACCESS_TOKEN",
        "Authorization":               f"Bearer {SNOWFLAKE_PAT}",
        "Content-Type":                "application/json",
        "Accept":                      "application/json",
        "X-Snowflake-User":            SNOWFLAKE_USER,
        "X-Snowflake-Account":         SNOWFLAKE_ACCOUNT,
        "X-Snowflake-Database":        SF_DATABASE,
        "X-Snowflake-Schema":          SF_SCHEMA,
        "X-Snowflake-Role":            SF_ROLE,
    }

    logger.debug("Cortex request payload:\n%s", json.dumps(payload, indent=2))
    logger.debug("Cortex request headers:\n%s", json.dumps(headers, indent=2))
    logger.info("Sending request to Cortex Analyst endpoint: %s", ANALYST_ENDPOINT)
    logger.debug(headers)
    logger.debug(payload)
    
    try:
        r = requests.post(ANALYST_ENDPOINT, json=payload, headers=headers, timeout=REQUEST_TIMEOUT)
    except requests.Timeout:
        logger.error(f"Request to Cortex Analyst endpoint timed out after {REQUEST_TIMEOUT} seconds.")
        # Return a response in the same format as Cortex Analyst would
        return {
            "message": {
            "content": [
                {
                "type": "error",
                "text": "Sorry, the request to Snowflake Cortex Analyst timed out. Please try again later."
                }
            ]
            }
        }
    if not r.ok:
        logger.error("Cortex response %s:\n%s", r.status_code, r.text)
        r.raise_for_status()
    return r.json()

def _render_response(content: List[Dict[str, str]], say) -> None:
    """
    Renders a response to Slack based on a list of content blocks.

    Each block in the content list should be a dictionary with a "type" key, which determines how the block is processed:
    - If type is "error", sends an error message. This is custom to timeouts/errors from the Cortex Analyst API.
    - If type is "text", sends a formatted analyst interpretation message.
    - If type is "sql", executes the SQL statement, sends the result as a formatted table, and collects the SQL for optional display.
    - If type is "suggestions", sends a list of follow-up suggestions as bullet points.

    If any SQL statements were executed, sends an interactive Slack message with a button to reveal the generated SQL.

    Args:
        content (List[Dict[str, str]]): List of content blocks to render, each specifying a type and relevant data.
        say (Callable): Function to send messages to Slack (typically provided by the Slack SDK).

    Returns:
        None
    """
    sqls: List[str] = []
    for block in content:
        t = block["type"]
        if t == "error":
            say(text=f"*Snowflake Cortex Analyst Error:*\n>`{block['text']}`")
        if t == "text":
            say(text=f"*Snowflake Cortex Analyst Interpretation:*\n> {block['text']}")
        elif t == "sql":
            stmt = block["statement"]
            sqls.append(stmt)
            # use low-level connector to avoid SQLAlchemy-2.0 issues
            conn = _sf_conn()
            try:
                df = pd.read_sql(stmt, conn)
            finally:
                conn.close()
            say(text=f"*Answer:*\n```{df.to_string(index=False, max_cols=5, max_rows=10)}```")
        elif t == "suggestions":
            bullets = "\n• ".join(block["suggestions"])
            say(text=f"*Try these follow-ups:*\n• {bullets}")

    if sqls:
        joined = "\n\n".join(sqls)
        say(
            text="Here’s the SQL I ran:",  # fallback text
            blocks=[
                {
                    "type": "section",
                    "text": {"type": "mrkdwn", "text": "Would you like to see the generated SQL?"}
                },
                {
                    "type": "actions",
                    "elements": [
                        {
                            "type":     "button",
                            "text":     {"type": "plain_text", "text": "Show SQL"},
                            "action_id":"show_sql",
                            "value":    joined
                        }
                    ]
                }
            ]
        )

@app.action("show_sql")
def show_sql(ack, body, say):
    ack()
    sql  = body["actions"][0]["value"]
    user = body["user"]["id"]
    say(text=f"<@{user}>, here’s the SQL I ran:\n```{sql}```")

# ─── Snowflake Connector Helper ─────────────────────────────────────────────
def _sf_conn():
    # Load & decrypt PEM private key
    try:
        with open(PRIVATE_KEY_PATH, "rb") as f:
            pkey = serialization.load_pem_private_key(
                f.read(),
                password=(PRIVATE_KEY_PASSPHRASE.encode() if PRIVATE_KEY_PASSPHRASE else None),
                backend=default_backend()
            )
    except FileNotFoundError:
        logger.error(f"Private key file not found at path: {PRIVATE_KEY_PATH}")
        raise
    except Exception as e:
        logger.error(f"Failed to load private key: {e}")
        raise
    pkb = pkey.private_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )

    conn = snowflake.connector.connect(
        user=        SNOWFLAKE_USER,
        private_key= pkb,
        account=     SNOWFLAKE_ACCOUNT,
        authenticator="SNOWFLAKE_JWT",
        warehouse=   SF_WAREHOUSE,
        database=    SF_DATABASE,
        schema=      SF_SCHEMA,
        role=        SF_ROLE
    )
    conn.cursor().execute(f"USE WAREHOUSE {SF_WAREHOUSE}")
    return conn

# ─── Entrypoint ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("🚀  Snowflake Data-Agent is running!")
    SocketModeHandler(app, SLACK_APP_TOKEN).start()