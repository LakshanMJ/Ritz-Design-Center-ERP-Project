#EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
#EMAIL_HOST = 'email-smtp.us-west-2.amazonaws.com' # Replace with the SMTP endpoint for your SES region
#EMAIL_PORT = 587
#EMAIL_USE_TLS = True
#EMAIL_HOST_USER = '<your-aws-access-key>'
#EMAIL_HOST_PASSWORD = '<your-aws-secret-key>'
#DEFAULT_FROM_EMAIL = '<verified-email-address>'

# SES Config


# EMAIL_BACKEND = 'django.core.mail.backends.filebased.EmailBackend'
# EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
# EMAIL_HOST_PASSWORD = ''

# AWS Settings
AWS_SES_REGION_NAME = 'ap-south-1'

AWS_SES_REGION_ENDPOINT = 'email.ap-south-1.amazonaws.com'


# Email settings
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_HOST_USER = 'dummy@gmail.com'
EMAIL_HOST_PASSWORD = 'rzkvyqnroudohtuq'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_USE_SSL = False
EMAIL_FILE_PATH = 'shared/email_files'
