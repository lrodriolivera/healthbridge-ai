"""Tenant plan/tier system — controls limits for trial and paid customers"""

# Plan definitions with limits
PLANS = {
    "trial": {
        "name": "Trial",
        "max_projects": 2,
        "max_components_per_project": 5,
        "max_code_generations": 10,
        "max_analysis_calls": 20,
        "max_upload_size_mb": 10,
        "max_users": 2,
        "trial_days": 14,
        "features": ["analysis", "mapping", "codegen"],
        # NOT included: deploy, testing, export, templates
    },
    "starter": {
        "name": "Starter",
        "max_projects": 5,
        "max_components_per_project": 20,
        "max_code_generations": 50,
        "max_analysis_calls": 100,
        "max_upload_size_mb": 50,
        "max_users": 5,
        "trial_days": None,  # No expiry
        "features": ["analysis", "mapping", "codegen", "deploy", "testing"],
    },
    "professional": {
        "name": "Professional",
        "max_projects": 20,
        "max_components_per_project": 100,
        "max_code_generations": 500,
        "max_analysis_calls": 1000,
        "max_upload_size_mb": 100,
        "max_users": 20,
        "trial_days": None,
        "features": ["analysis", "mapping", "codegen", "deploy", "testing", "export", "templates"],
    },
    "enterprise": {
        "name": "Enterprise",
        "max_projects": None,  # Unlimited
        "max_components_per_project": None,
        "max_code_generations": None,
        "max_analysis_calls": None,
        "max_upload_size_mb": 500,
        "max_users": None,
        "trial_days": None,
        "features": ["all"],
    },
}


def get_plan(plan_name: str) -> dict:
    return PLANS.get(plan_name, PLANS["trial"])


def check_limit(plan: dict, limit_name: str, current_count: int) -> bool:
    """Check if current usage is within plan limits. Returns True if OK."""
    limit = plan.get(limit_name)
    if limit is None:  # Unlimited
        return True
    return current_count < limit


def get_limit_message(plan: dict, limit_name: str) -> str:
    limit = plan.get(limit_name)
    plan_name = plan.get("name", "Trial")
    if limit is None:
        return ""
    return f"Plan {plan_name} limit: {limit_name.replace('_', ' ')} = {limit}. Upgrade for more."
