from rest_framework_simplejwt.exceptions import InvalidToken


class CustomInvalidToken(InvalidToken):
    default_code = 'refresh_token_expired'
