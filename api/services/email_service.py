import os
import logging

import httpx

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "GymTracker <onboarding@resend.dev>")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


async def _send(to: str, subject: str, text: str) -> None:
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set — skipping email to %s", to)
        return
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
                json={"from": FROM_EMAIL, "to": to, "subject": subject, "text": text},
            )
            resp.raise_for_status()
    except Exception as exc:
        logger.error("Email send failed to %s: %s", to, exc)


async def send_welcome_email(email: str, username: str) -> None:
    await _send(
        email,
        "Welcome to GymTracker!",
        f"""\
Hi {username},

Welcome to GymTracker! You're all set to start logging workouts, tracking your PRs, and building your personal exercise library.

Get started: {FRONTEND_URL}

— The GymTracker team
""",
    )


async def send_reset_email(email: str, username: str, token: str) -> None:
    link = f"{FRONTEND_URL}/reset-password?token={token}"
    await _send(
        email,
        "Reset your GymTracker password",
        f"""\
Hi {username},

Someone requested a password reset for your GymTracker account.

Reset your password here (link expires in 30 minutes):
{link}

If you didn't request this, you can safely ignore this email. Your password won't change.

— The GymTracker team
""",
    )


async def send_account_recovery_email(email: str, username: str) -> None:
    await _send(
        email,
        "Your GymTracker account",
        f"""\
Hi,

A GymTracker account with the username "{username}" is registered to this email address.

Log in here: {FRONTEND_URL}/login

— The GymTracker team
""",
    )
