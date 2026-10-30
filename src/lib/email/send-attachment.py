#!/usr/bin/env python3
"""Send report attachments through Gmail SMTP."""

import argparse
import mimetypes
import smtplib
import ssl
import sys
from email.message import EmailMessage
from pathlib import Path

from dworshak_secret import DworshakSecret


# Configure these to match the service/item names in your vault.
VAULT_SERVICE = "email"
VAULT_SENDER_ADDRESS_ITEM = "send-address"
VAULT_PASSWORD_ITEM = "send-password"
CONFIG_SERVICE = "email"
CONFIG_SMTP_HOST_ITEM = "smpt-host"
CONFIG_SMTP_PORT_ITEM = "smpt-port"
CONFIG_SMTP_SECURITY_ITEM = "smpt-security"

# Recipient and sender can be supplied on the command line.
# Alternatively, make them configuration values for your environment.


def main():
    parser = argparse.ArgumentParser(
        description="Send report attachments through Gmail."
    )
    parser.add_argument(
        "--attachment",
        action="append",
        required=True,
        help="File to attach; repeat this option for multiple files.",
    )
    #parser.add_argument("--from", dest="sender", required=True)
    parser.add_argument("--to", dest="recipient", required=True)
    parser.add_argument("--subject", default="Automated report")
    parser.add_argument(
        "--body",
        default="Please find the requested reports attached.",
    )
    args = parser.parse_args()
    return args

# ---

def resolve_attachments(paths: list[str]) -> list[Path]:
    resolved = []

    for raw_path in paths:
        path = Path(raw_path).expanduser().resolve(strict=True)

        if not path.is_file():
            raise ValueError(f"Attachment is not a file: {path}")

        if path.stat().st_size == 0:
            raise ValueError(f"Attachment is empty: {path}")

        resolved.append(path)

    return resolved


def add_attachments(
    message: EmailMessage,
    paths: list[str],
) -> None:
    for path in resolve_attachments(paths):
        message.add_attachment(
            path.read_bytes(),
            maintype="application",
            subtype="octet-stream",
            filename=path.name,
        )

# ---

def send_email_with_attachment(
    attachments:list[str],
    recipient:str,
    subject:str,
    body:str
)->None:


    # Retrieve credentials from the local Dworshak vault.
    vault = DworshakSecret()
    sender_address = vault.get(VAULT_SERVICE, VAULT_SENDER_ADDRESS_ITEM, fail=True)
    password = vault.get(VAULT_SERVICE, VAULT_PASSWORD_ITEM, fail=True)
    config = DworshakSecret()
    smtp_host=config.get(CONFIG_SERVICE, CONFIG_SMTP_HOST_ITEM, default = "smtp.gmail.com")
    smtp_port=config.get(CONFIG_SERVICE, CONFIG_SMTP_PORT_ITEM, default = "587")
    smtp_security=config.get(CONFIG_SERVICE, CONFIG_SMTP_SECURITY_ITEM, default = "starttls")

    if not sender_address or not password:
        raise RuntimeError("Gmail SMTP credentials are missing from the vault.")

    # Build the email.
    message = EmailMessage()
    message["From"] = sender_address # sender
    message["To"] = recipient
    message["Subject"] = subject
    message.set_content(body)

    attachments = resolve_attachments(attachments)
    #add_attachments(message, attachments)

    for path in attachments:
        content_type, _ = mimetypes.guess_type(path.name)
        if content_type:
            maintype, subtype = content_type.split("/", 1)
        else:
            maintype, subtype = "application", "octet-stream"

        message.add_attachment(
            path.read_bytes(),
            maintype=maintype,
            subtype=subtype,
            filename=path.name,
        )

    # Send via Gmail using implicit TLS.
    context = ssl.create_default_context()

    with smtplib.SMTP(
        smtp_host,
        smtp_port,
        timeout=30,
    ) as smtp:
        smtp.ehlo()
        # if smtp_security == "starttls": 
        smtp.starttls(context=context)
        #else:
        #
        smtp.ehlo()
        smtp.login(sender_address, password)
        smtp.send_message(message)

    print(f"Email sent successfully to {recipient}")


if __name__ == "__main__":
    try:
        args = main()
        send_email_with_attachment(
            attachments = args.attachment,
            #sender = args.sender,
            recipient = args.recipient,
            subject = args.subject,
            body = args.body
        )

    except Exception as exc:
        print(f"Email failed: {exc}", file=sys.stderr)
        sys.exit(1)
