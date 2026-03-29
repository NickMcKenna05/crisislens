from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
import httpx

from config import settings

router = APIRouter(
    prefix="/auth",
    tags=["authentication"]
)


class ConfirmationRequest(BaseModel):
    email: str
    password: str


@router.post("/send-confirmation")
async def send_confirmation_email(request: ConfirmationRequest):
    """
    Generate a Supabase confirmation link via Admin API,
    then send it to the user via Resend.
    """
    if not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Service role key not configured"
        )
    if not settings.RESEND_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Resend API key not configured"
        )

    async with httpx.AsyncClient() as client:
        # Step 1: Generate confirmation link via Supabase Admin API
        generate_response = await client.post(
            f"{settings.SUPABASE_URL}/auth/v1/admin/generate_link",
            headers={
                "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "type": "signup",
                "email": request.email,
                "password": request.password,
            }
        )

        if generate_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to generate confirmation link"
            )

        link_data = generate_response.json()
        confirmation_link = link_data.get("action_link")

        if not confirmation_link:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No confirmation link returned"
            )

        # Step 2: Send the email via Resend API
        email_response = await client.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "from": "CrisisLens <onboarding@resend.dev>",
                "to": [request.email],
                "subject": "Confirm your CrisisLens account",
                "html": f"""
                    <h2>Welcome to CrisisLens!</h2>
                    <p>Click the link below to confirm your email address and activate your account:</p>
                    <p><a href="{confirmation_link}" style="
                        display: inline-block;
                        background-color: #2563eb;
                        color: white;
                        padding: 12px 24px;
                        text-decoration: none;
                        border-radius: 6px;
                        font-weight: 600;
                    ">Confirm Email</a></p>
                    <p>If you didn't create an account, you can safely ignore this email.</p>
                    <p style="color: #64748b; font-size: 14px;">— The CrisisLens Team</p>
                """
            }
        )

        if email_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send confirmation email"
            )

    return {"message": "Confirmation email sent"}
