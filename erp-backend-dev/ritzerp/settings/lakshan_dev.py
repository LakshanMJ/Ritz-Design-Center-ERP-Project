from .base import *
import dj_database_url
import os

# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.postgresql',
#         'NAME': 'DummyDB',
#         'USER' : 'postgres',
#         'PASSWORD' : '1234@qwer',
#         'HOST' : 'localhost',
#         'PORT' : '5432',
#     }
# }

if os.environ.get("DATABASE_URL"):
    # Render / Neon
    DATABASES = {
        "default": dj_database_url.config(
            default=os.environ["DATABASE_URL"],
            conn_max_age=600,
            ssl_require=True,
        )
    }
else:
    # Local PostgreSQL
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("DB_NAME"),
            "USER": os.getenv("DB_USER"),
            "PASSWORD": os.getenv("DB_PASSWORD"),
            "HOST": os.getenv("DB_HOST"),
            "PORT": os.getenv("DB_PORT", "5432"),
        }
    }

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '13.235.82.221', 'ec2-3-109-1-192.ap-south-1.compute.amazonaws.com', '*', '192.168.1.12','192.168.1.31']
# CORS_ALLOWED_ORIGINS = [
#     'http://localhost:3000',
#     'https://nexa-erp-project.vercel.app',
# ]
CORS_ALLOW_ALL_ORIGINS = True
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.BasicAuthentication',
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        #'rest_framework.permissions.IsAdminUser',
    ],
}