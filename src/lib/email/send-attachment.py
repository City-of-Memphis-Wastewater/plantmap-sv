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
VAULT_SERVICE = "gmail-smtp"
VAULT_USERNAME_ITEM = "email-address"
VAULT_PASSWORD_ITEM = "app-password"

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
    parser.add_argument("--from", dest="sender", required=True)
    parser.add_argument("--to", dest="recipient", required=True)
    parser.add_argument("--subject", default="Automated report")
    parser.add_argument(
        "--body",
        default="Please find the requested reports attached.",
    )
    args = parser.parse_args()
    return args

def send_email_with_attachment(
    attachment:str,
    sender:str,
    recipient:str,
    subject:str,
    body:str
)->None:

    # Validate all attachments before sending.
    attachments = []
    for filename in attachment:
        path = Path(filename)

        if not path.is_file():
            raise FileNotFoundError(f"Attachment not found: {path}")

        if path.stat().st_size == 0:
            raise ValueError(f"Attachment is empty: {path}")

        attachments.append(path)

    # Retrieve credentials from the local Dworshak vault.
    vault = DworshakSecret()
    username = vault.get(VAULT_SERVICE, VAULT_USERNAME_ITEM, fail=True)
    password = vault.get(VAULT_SERVICE, VAULT_PASSWORD_ITEM, fail=True)

    if not username or not password:
        raise RuntimeError("Gmail SMTP credentials are missing from the vault.")

    # Build the email.
    message = EmailMessage()
    message["From"] = sender
    message["To"] = recipient
    message["Subject"] = subject
    message.set_content(body)

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

    with smtplib.SMTP_SSL(
        "smtp.gmail.com",
        465,
        context=context,
        timeout=30,
    ) as smtp:
        smtp.login(username, password)
        smtp.send_message(message)

    print(f"Email sent successfully to {args.recipient}")


if __name__ == "__main__":
    try:
        args = main()
        send_email_with_attachment(
            attachment = args.attachment,
            sender = args.sender,
            recipient = args.recipient,
            subject = args.subject,
            body = args.body
        )

    except Exception as exc:
        print(f"Email failed: {exc}", file=sys.stderr)
        sys.exit(1)
