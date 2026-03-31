"""Plan enforcer — checks tenant limits before allowing operations"""

from datetime import datetime, timezone

from fastapi import HTTPException

from src.models.tenant import Tenant
from src.models.tenant_plan import check_limit, get_limit_message, get_plan


def enforce_tenant_active(tenant: Tenant):
    """Check tenant is active and trial hasn't expired."""
    if not tenant.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated. Contact support.")

    if tenant.trial_expires_at and datetime.now(timezone.utc) > tenant.trial_expires_at:
        raise HTTPException(
            status_code=403,
            detail="Trial expired. Contact us to upgrade your plan.",
        )


def enforce_limit(tenant: Tenant, limit_name: str, current_count: int):
    """Check if operation is within plan limits."""
    plan = get_plan(tenant.plan)
    if not check_limit(plan, limit_name, current_count):
        msg = get_limit_message(plan, limit_name)
        raise HTTPException(status_code=403, detail=msg)


def enforce_feature(tenant: Tenant, feature: str):
    """Check if feature is available in tenant's plan."""
    plan = get_plan(tenant.plan)
    features = plan.get("features", [])
    if "all" not in features and feature not in features:
        raise HTTPException(
            status_code=403,
            detail=f"Feature '{feature}' not available in {plan['name']} plan. Upgrade to access.",
        )
