"""Maps an incoming request to a human-readable (module, sub_module) pair for
the System Health dashboard.

Reads `request.scope["route"]`, which Starlette's router populates during
`call_next()` for any matched route -- so this works for every endpoint in
the app with zero per-router code changes. `sub_module` lets closely-related
but independently-monitorable areas (Accounting > Bills vs Accounting >
Sales Orders, Products vs Search) show up as separate health entries instead
of one module failure red-flagging everything under it.
"""

_PREFIX_RULES = [
    ("/api/customer/checkout", "Checkout"),
    ("/api/customer/orders", "Checkout"),
    ("/api/customer/cart", "Cart"),
    ("/api/customer/wishlist", "Wishlist"),
    ("/api/customer/addresses", "Customer"),
    ("/api/customer/register", "Auth"),
    ("/api/customer/login", "Auth"),
    ("/api/customer/logout", "Auth"),
    ("/api/customer/forgot-password", "Auth"),
    ("/api/customer/reset-password", "Auth"),
    ("/api/customer/me", "Auth"),
    ("/api/customer", "Customer"),
    ("/api/auth", "Auth"),
    ("/api/admin/accounting", "Accounting"),
    ("/api/admin/labour", "Labour"),
    ("/api/admin/delivery", "Delivery"),
    ("/api/admin/system-health", "Admin"),
    ("/api/admin/activity-log", "Admin"),
    ("/api/admin/system-info", "Admin"),
    ("/api/admin/analytics", "Analytics"),
    ("/api/admin", "Admin"),
    ("/api/plants", "Products"),
    ("/api/categories", "Products"),
    ("/api/inquiries", "Website"),
    ("/api/settings", "Website"),
]

# Modules whose own router nests a further sub-path (/api/admin/<module>/<sub>/...)
# worth tracking as its own health entry -- e.g. Accounting > Bills failing
# shouldn't red-flag Accounting > Sales Orders. Same technique applied
# uniformly to every module that has this shape, not just Accounting.
_SUB_MODULE_PREFIXES = {
    "Accounting": "/api/admin/accounting/",
    "Labour": "/api/admin/labour/",
    "Delivery": "/api/admin/delivery/",
}


def _extract_sub_module(module: str, path: str) -> str | None:
    prefix = _SUB_MODULE_PREFIXES.get(module)
    if not prefix or not path.startswith(prefix):
        return None
    rest = path[len(prefix):].split("/")[0]
    return rest.replace("-", " ").title() if rest else None


def infer_module(request) -> tuple[str, str | None, str, str]:
    route = request.scope.get("route")
    endpoint = route.path if route is not None else request.url.path
    func_name = getattr(getattr(route, "endpoint", None), "__name__", "unknown")
    path = request.url.path

    if path == "/api/plants" and request.query_params.get("search"):
        return "Search", None, func_name, endpoint

    for prefix, module in _PREFIX_RULES:
        if not path.startswith(prefix):
            continue
        return module, _extract_sub_module(module, path), func_name, endpoint

    return "Website", None, func_name, endpoint
