import tempfile
from tempfile import NamedTemporaryFile

from django.core.files.storage import FileSystemStorage
import os
from django.conf import settings
import boto3
import io


def remove_leading_and_ending_slashes(text):
    return str(text).strip().strip("/")


def handle_uploaded_file(uploaded_file, directory, file_name=None):
    # print("start uploading file")
    if not file_name:
        file_name = uploaded_file.name
    if settings.AWS_HOST:
        s3 = boto3.resource('s3')
        key = remove_leading_and_ending_slashes(directory) + "/" + str(file_name)
        s3.Bucket(settings.S3_BUCKET_NAME).put_object(Key=key, Body=uploaded_file)
        return settings.S3_BUCKET_ACCESS_URL + key
    else:
        fs = FileSystemStorage(location=os.path.join(settings.MEDIA_ROOT, directory))
        filename = fs.save(file_name, uploaded_file)
        url = '%s%s%s/%s' % (settings.APPLICATION_URL, settings.MEDIA_URL, remove_leading_and_ending_slashes(directory), filename)
        return url


def handle_file_read(key):

    if settings.AWS_HOST:
        s3 = boto3.client('s3')
        bucket = settings.S3_BUCKET_NAME
        key = remove_leading_and_ending_slashes(key)
        key = key.replace(settings.S3_BUCKET_ACCESS_URL, '')
        s3_data = s3.get_object(Bucket=bucket, Key=key)
        contents = s3_data['Body'].read()
        # content = io.BytesIO(contents)
        # content = None
        suffix = '.' + str(key.split('.')[-1])
        with tempfile.NamedTemporaryFile(mode='w+b', delete=False, suffix=suffix) as f:
            s3.download_fileobj(bucket, key, f)
            content = f.name
    else:
        key = remove_leading_and_ending_slashes(key.replace(settings.APPLICATION_URL, ''))
        content = key
    return content