"""Email service — sends transactional emails via AWS SES or SMTP fallback"""

import structlog
from src.config import settings

logger = structlog.get_logger()


class EmailService:

    async def send(self, to: str, subject: str, html_body: str) -> bool:
        if settings.environment == "development":
            logger.info("email_sent_dev", to=to, subject=subject, body_preview=html_body[:100])
            return True

        try:
            import boto3
            ses = boto3.client("ses", region_name=settings.aws_region)
            ses.send_email(
                Source="HealthBridge AI <noreply@healthbridge.ai>",
                Destination={"ToAddresses": [to]},
                Message={
                    "Subject": {"Data": subject},
                    "Body": {"Html": {"Data": html_body}},
                },
            )
            logger.info("email_sent", to=to, subject=subject)
            return True
        except Exception as e:
            logger.error("email_failed", to=to, error=str(e)[:200])
            return False

    async def send_password_reset(self, to: str, reset_token: str, reset_url: str):
        html = (
            '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">'
            '<h2 style="color: #0d9488;">HealthBridge AI - Password Reset</h2>'
            '<p>You requested a password reset. Click the link below:</p>'
            f'<a href="{reset_url}?token={reset_token}" '
            'style="display: inline-block; padding: 12px 24px; background: #0d9488; color: white; text-decoration: none; border-radius: 8px;">'
            'Reset Password</a>'
            '<p style="color: #64748b; font-size: 14px; margin-top: 20px;">'
            'This link expires in 1 hour. If you did not request this, ignore this email.</p>'
            '</div>'
        )
        return await self.send(to, "Reset your password - HealthBridge AI", html)

    async def send_invitation(self, to: str, tenant_name: str, inviter_email: str, temp_password: str, login_url: str):
        html = (
            '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">'
            '<h2 style="color: #0d9488;">Welcome to HealthBridge AI</h2>'
            f'<p>{inviter_email} invited you to join <strong>{tenant_name}</strong>.</p>'
            '<p>Your temporary credentials:</p>'
            '<div style="background: #f1f5f9; padding: 16px; border-radius: 8px;">'
            f'<p><strong>Email:</strong> {to}</p>'
            f'<p><strong>Temporary Password:</strong> {temp_password}</p>'
            '</div>'
            f'<a href="{login_url}" '
            'style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #0d9488; color: white; text-decoration: none; border-radius: 8px;">'
            'Login Now</a>'
            '<p style="color: #64748b; font-size: 14px;">Please change your password after first login.</p>'
            '</div>'
        )
        return await self.send(to, f"You are invited to {tenant_name} - HealthBridge AI", html)

    async def send_welcome(self, to: str, tenant_name: str):
        html = (
            '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">'
            '<h2 style="color: #0d9488;">Welcome to HealthBridge AI!</h2>'
            f'<p>Your organization <strong>{tenant_name}</strong> has been created.</p>'
            '<p>Start migrating your healthcare integrations to IRIS/TrackCare.</p>'
            '</div>'
        )
        return await self.send(to, f"Welcome to HealthBridge AI - {tenant_name}", html)


email_service = EmailService()
