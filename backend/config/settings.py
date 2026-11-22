import os
from datetime import timedelta
from pathlib import Path

from corsheaders.defaults import default_headers
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent
DEBUG = os.getenv("DJANGO_DEBUG", "true").lower() == "true"


def env_list(name, default=""):
    return [
        value.strip() for value in os.getenv(name, default).split(",") if value.strip()
    ]


DEV_SECRET_KEY = "django-insecure-reali-development-only-change-me"
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", DEV_SECRET_KEY if DEBUG else "")
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1" if DEBUG else "")
CSRF_TRUSTED_ORIGINS = env_list("DJANGO_CSRF_TRUSTED_ORIGINS")
CORS_ALLOWED_ORIGINS = env_list(
    "DJANGO_CORS_ALLOWED_ORIGINS",
    "http://localhost:8081,http://127.0.0.1:8081" if DEBUG else "",
)
CORS_ALLOW_HEADERS = (*default_headers, "x-organization-id", "idempotency-key")
CORS_URLS_REGEX = r"^/api/v1/"
if not DEBUG:
    if len(SECRET_KEY) < 50 or SECRET_KEY.startswith("django-insecure-"):
        raise ImproperlyConfigured("Configure DJANGO_SECRET_KEY com uma chave forte.")
    if not ALLOWED_HOSTS or "*" in ALLOWED_HOSTS:
        raise ImproperlyConfigured(
            "Configure DJANGO_ALLOWED_HOSTS com os hosts permitidos."
        )

SECURE_SSL_REDIRECT = not DEBUG
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_HSTS_SECONDS = 0 if DEBUG else int(os.getenv("DJANGO_HSTS_SECONDS", "0"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = bool(SECURE_HSTS_SECONDS) and (
    os.getenv("DJANGO_HSTS_INCLUDE_SUBDOMAINS", "false").lower() == "true"
)
SECURE_HSTS_PRELOAD = SECURE_HSTS_INCLUDE_SUBDOMAINS and (
    os.getenv("DJANGO_HSTS_PRELOAD", "false").lower() == "true"
)
if SECURE_HSTS_SECONDS < 0:
    raise ImproperlyConfigured("DJANGO_HSTS_SECONDS deve ser maior ou igual a zero.")
if os.getenv("DJANGO_TRUST_PROXY_HTTPS", "false").lower() == "true":
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "drf_spectacular",
    "apps.core",
    "apps.users",
    "apps.institutions",
    "apps.cameras",
    "apps.meals",
    "apps.counting",
    "apps.analytics",
    "apps.ai",
    "apps.api",
    "apps.notifications",
    "rest_framework_simplejwt.token_blacklist",
]
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "apps.api.audit.AuditRequestMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
ROOT_URLCONF = "config.urls"
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ]
        },
    }
]
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

if os.getenv("POSTGRES_DB"):
    if not os.getenv("POSTGRES_USER") or "POSTGRES_PASSWORD" not in os.environ:
        raise ImproperlyConfigured("Configure POSTGRES_USER e POSTGRES_PASSWORD.")
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ["POSTGRES_DB"],
            "USER": os.environ["POSTGRES_USER"],
            "PASSWORD": os.environ["POSTGRES_PASSWORD"],
            "HOST": os.getenv("POSTGRES_HOST", "localhost"),
            "PORT": os.getenv("POSTGRES_PORT", "5432"),
            "OPTIONS": {
                "connect_timeout": 5,
                "sslmode": os.getenv("POSTGRES_SSLMODE", "prefer"),
            },
        }
    }
elif DEBUG:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
else:
    raise ImproperlyConfigured(
        "Configure POSTGRES_DB para executar com DJANGO_DEBUG=false."
    )

AUTH_USER_MODEL = "users.User"
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
    },
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"
USE_I18N = True
USE_TZ = True
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# Reali API - JWT para aplicativo mobile
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ("apps.api.session_auth.SessionAuthentication",),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
    "NUM_PROXIES": int(os.getenv("DJANGO_THROTTLE_NUM_PROXIES", "0")),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "apps.api.exceptions.audit_exception_handler",
    "DEFAULT_THROTTLE_RATES": {
        "institution-request": "10/hour",
        "invitation-activation": "30/hour",
        "invitation-management": "60/hour",
        "password-reset-request": "10/hour",
        "password-reset-confirm": "30/hour",
        "device-traffic": "120/min",
        "device-counts": os.getenv("DEVICE_COUNT_RATE", "120/min"),
        "device-credential-management": "20/hour",
        "login": "30/hour",
        "session-refresh": "600/hour",
        "session-logout": "600/hour",
        "analytics-rebuild": "12/hour",
        "analytics-export": "20/hour",
        "realinova-chat": "30/min",
        "realinova-conversation": "90/hour",
        "push-registration": "60/hour",
    },
}
COUNT_BATCH_LIMIT = int(os.getenv("COUNT_BATCH_LIMIT", "100"))
COUNT_MAX_BODY_BYTES = int(os.getenv("COUNT_MAX_BODY_BYTES", "131072"))
COUNT_MAX_DELAY_SECONDS = int(os.getenv("COUNT_MAX_DELAY_SECONDS", "86400"))
COUNT_MAX_FUTURE_SECONDS = int(os.getenv("COUNT_MAX_FUTURE_SECONDS", "300"))
if not (
    1 <= COUNT_BATCH_LIMIT <= 500
    and COUNT_MAX_BODY_BYTES > 0
    and COUNT_MAX_DELAY_SECONDS > 0
    and COUNT_MAX_FUTURE_SECONDS >= 0
):
    raise ImproperlyConfigured("Revise os limites de ingestão de contagens.")
SPECTACULAR_SETTINGS = {
    "TITLE": "Reali API",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "ENUM_NAME_OVERRIDES": {
        "InstitutionRequestStatus": "apps.api.serializers.INSTITUTION_STATUS_CHOICES",
        "MealServiceStatus": "apps.api.serializers.MEAL_STATUS_CHOICES",
        "RealInovaConversationStatus": "apps.ai.models.CONVERSATION_STATUS_CHOICES",
        "RealInovaExecutionStatus": "apps.ai.models.EXECUTION_STATUS_CHOICES",
        "RealInovaMessageRole": "apps.ai.models.MESSAGE_ROLE_CHOICES",
        "InstitutionMembershipRole": "apps.users.models.MEMBERSHIP_ROLE_CHOICES",
        "CameraOperationalStatus": "apps.cameras.models.OPERATIONAL_STATUS_CHOICES",
        "MealDataQuality": "apps.meals.models.DATA_QUALITY_CHOICES",
    },
}
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "convites@reali.invalid")
EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend"
)
EMAIL_HOST = os.getenv("EMAIL_HOST", "localhost")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "true").lower() == "true"
EMAIL_TIMEOUT = 10
NOTIFICATION_PUSH_KEYS = env_list("NOTIFICATION_PUSH_KEYS")
NOTIFICATION_EXPO_ACCESS_TOKEN = os.getenv("NOTIFICATION_EXPO_ACCESS_TOKEN", "")
NOTIFICATION_PUSH_PROXY = os.getenv("NOTIFICATION_PUSH_PROXY") or None
NOTIFICATION_ALERT_DELAY_SECONDS = int(os.getenv("NOTIFICATION_ALERT_DELAY_SECONDS", "120"))
NOTIFICATION_ESCALATION_SECONDS = int(os.getenv("NOTIFICATION_ESCALATION_SECONDS", "1800"))
NOTIFICATION_REMINDER_MINUTES = int(os.getenv("NOTIFICATION_REMINDER_MINUTES", "20"))
NOTIFICATION_STALE_MINUTES = int(os.getenv("NOTIFICATION_STALE_MINUTES", "60"))
NOTIFICATION_FORECAST_MIN_DIFFERENCE = int(os.getenv("NOTIFICATION_FORECAST_MIN_DIFFERENCE", "20"))
NOTIFICATION_FORECAST_DIFFERENCE_PERCENT = int(os.getenv("NOTIFICATION_FORECAST_DIFFERENCE_PERCENT", "30"))
NOTIFICATION_RETENTION_DAYS = int(os.getenv("NOTIFICATION_RETENTION_DAYS", "180"))
ADMIN_AUDIT_RETENTION_DAYS = int(os.getenv("ADMIN_AUDIT_RETENTION_DAYS", "730"))
if not (
    0 < NOTIFICATION_ALERT_DELAY_SECONDS < NOTIFICATION_ESCALATION_SECONDS
    and NOTIFICATION_REMINDER_MINUTES <= 1440
    and min(NOTIFICATION_REMINDER_MINUTES, NOTIFICATION_STALE_MINUTES,
            NOTIFICATION_FORECAST_MIN_DIFFERENCE, NOTIFICATION_FORECAST_DIFFERENCE_PERCENT,
            NOTIFICATION_RETENTION_DAYS, ADMIN_AUDIT_RETENTION_DAYS) > 0
):
    raise ImproperlyConfigured("Confira os limites de alertas e retenção.")
REALI_ACTIVATION_URL = os.getenv("REALI_ACTIVATION_URL", "")
REALI_PASSWORD_RESET_URL = os.getenv("REALI_PASSWORD_RESET_URL", "")
PASSWORD_RESET_TIMEOUT = 3600

CAMERA_HEARTBEAT_INTERVAL_SECONDS = int(
    os.getenv("CAMERA_HEARTBEAT_INTERVAL_SECONDS", "30")
)
CAMERA_OFFLINE_TIMEOUT_SECONDS = int(os.getenv("CAMERA_OFFLINE_TIMEOUT_SECONDS", "90"))
CAMERA_HEARTBEAT_MAX_CLOCK_SKEW_SECONDS = int(
    os.getenv("CAMERA_HEARTBEAT_MAX_CLOCK_SKEW_SECONDS", "30")
)
CAMERA_HEARTBEAT_MAX_AGE_SECONDS = int(
    os.getenv("CAMERA_HEARTBEAT_MAX_AGE_SECONDS", "300")
)
CAMERA_MIN_PROCESSING_FPS = float(os.getenv("CAMERA_MIN_PROCESSING_FPS", "10"))
CAMERA_PENDING_EVENTS_LIMIT = int(os.getenv("CAMERA_PENDING_EVENTS_LIMIT", "100"))
CAMERA_HEALTH_RETENTION_DAYS = int(os.getenv("CAMERA_HEALTH_RETENTION_DAYS", "90"))
DEVICE_AUTH_FAILURE_LIMIT = int(os.getenv("DEVICE_AUTH_FAILURE_LIMIT", "20"))
CAMERA_LEGACY_AUTH_ENABLED = (
    os.getenv("CAMERA_LEGACY_AUTH_ENABLED", "true").lower() == "true"
)
if not (
    0 < CAMERA_HEARTBEAT_INTERVAL_SECONDS < CAMERA_OFFLINE_TIMEOUT_SECONDS
    and CAMERA_HEARTBEAT_MAX_CLOCK_SKEW_SECONDS >= 0
    and CAMERA_HEARTBEAT_MAX_AGE_SECONDS >= CAMERA_OFFLINE_TIMEOUT_SECONDS
    and 0 <= CAMERA_MIN_PROCESSING_FPS <= 1000
    and min(
        CAMERA_PENDING_EVENTS_LIMIT,
        CAMERA_HEALTH_RETENTION_DAYS,
        DEVICE_AUTH_FAILURE_LIMIT,
    )
    > 0
):
    raise ImproperlyConfigured(
        "Revise os limites de monitoramento e autenticação de câmeras."
    )


# Resolve configuration for the agent only when the feature is used.
REALINOVA = {
    key.removeprefix("REALINOVA_"): value
    for key, value in os.environ.items()
    if key.startswith("REALINOVA_")
}


LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "realinova_console": {"class": "logging.StreamHandler"},
        "notifications_console": {"class": "logging.StreamHandler"},
    },
    "loggers": {
        "apps.ai": {
            "handlers": ["realinova_console"],
            "level": "INFO",
            "propagate": False,
        },
        "apps.notifications": {
            "handlers": ["notifications_console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}
