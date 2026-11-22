from django.shortcuts import render
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_safe


@never_cache
@require_safe
def account_page(request, mode):
    response = render(request, "account/continue.html", {"mode": mode})
    response["Referrer-Policy"] = "no-referrer"
    response["Content-Security-Policy"] = (
        "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; "
        "form-action 'none'; base-uri 'none'; frame-ancestors 'none'"
    )
    return response
