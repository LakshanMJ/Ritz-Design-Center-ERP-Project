import imaplib
import uuid
from tempfile import NamedTemporaryFile

from django.core import mail
from django.template.loader import render_to_string
import re

from marketing.utils.aws_utils import handle_file_read, handle_uploaded_file
from shared.models import Email, FileAttachment
from ritzerp.settings.email_settings import EMAIL_HOST_USER
from django.conf import settings
import email
import openpyxl
import os
from email.mime.image import MIMEImage

def read_mailbox():
    connection = imaplib.IMAP4_SSL(settings.EMAIL_HOST)

    # logging the user in
    connection.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)

    connection.select('INBOX')

    status, response = connection.search(None, '(UNSEEN)')
    unread_msg_nums = response[0].split()

    # Print the count of all unread messages
    # if b.is_multipart():
    #     for part in b.walk():
    #         ctype = part.get_content_type()
    #         cdispo = str(part.get('Content-Disposition'))
    #
    #         # skip any text/plain (txt) attachments
    #         if ctype == 'text/plain' and 'attachment' not in cdispo:
    #             body = part.get_payload(decode=True)  # decode
    #             break
    # # not multipart - i.e. plain text, no attachments, keeping fingers crossed
    # else:
    #     body = b.get_payload(decode=True)


    email_data = []
    for e_id in unread_msg_nums:
        data_dict = {}
        _, response = connection.fetch(e_id, '(RFC822)')
        html = response[0][1]
        decoded_html = html.decode('utf-8')

        data_dict['body'] = decoded_html


        email_message = email.message_from_string(decoded_html)


        data_dict['mail_to'] = email_message['To']
        data_dict['mail_subject'] = email_message['Subject']
        data_dict['mail_from'] = email_message['From']

        email_object = Email.objects.create(body=data_dict['body'], email_id=e_id, type=Email.EMAIL_RECEIVED)
        if email_message.is_multipart():
            part_index = 0

            for part in email_message.walk():
                part_index += 1
                ctype = part.get_content_type()
                if ctype == 'text/html':
                    data_dict['body'] = part.get_payload(decode=True).decode("utf-8")

                file_name = part.get_filename()

                if bool(file_name):
                    suffix = '.' + str(file_name.split(".")[-1])
                    with NamedTemporaryFile(mode='w+', encoding='utf8', delete=False, suffix=suffix) as tmp:
                        file = open(tmp.name, mode='rb+')
                        file.write(part.get_payload(decode=True))
                        file.seek(0)
                        # file_obj = File(file=file)
                        save_path = 'emails/%s/attachments/' % (email_object.pk)
                        save_file_name = '%s - %s' % (str(part_index), file_name)
                        saved_file = handle_uploaded_file(file, save_path, save_file_name)
                        file.close()
                        attachment = FileAttachment.objects.create(display_name=file_name, file_path=saved_file, type=suffix)
                        # print("attachment", attachment.pk)
                        email_object.attachments.add(attachment)
                        # print(email_object.pk)
        try:
            msg_id = re.search('MSG_CODE_(\w+)', data_dict['body']).group(1)
            msg_code = 'MSG_CODE_' + str(msg_id)
        except:
            msg_code = None

        email_object.body = data_dict['body']
        email_object.email_hash_tag = msg_code
        email_object.save()

        # print("Email received and read")

def get_logo():
    image_path = './materials/templates/RITZ-LOGO.jpg'
    image = 'RITZ-LOGO.jpg'
    with open(image_path, 'rb') as f:
        img = MIMEImage(f.read())
        img.add_header('Content-ID', '<{name}>'.format(name=image))
        img.add_header('Content-Disposition', 'inline', filename=image)
    return img

def send_email(to, cc, subject, body, attachments):
    hash_tag = str(uuid.uuid4())[0:12]
    # hash_tag = '%s_%s_%s' % (str(uuid.uuid4())[0:12], email_entity, entity_id)
    
    body += """
        <p>MSG_CODE_%s</p>
    """ % str(hash_tag)
    # print("repeat check")
    if settings.USE_BUCKET_EMAIL:
        to = settings.BUCKET_EMAIL_ADDRESSES

    message = mail.EmailMultiAlternatives(
        subject=subject,
        from_email=EMAIL_HOST_USER,
        to=to,
        cc=cc,
    )
    message.attach(get_logo())
    if attachments:

        for attachment in attachments:
            path = handle_file_read(attachment['path'])
            # print(attachment['path'], path, 'Attachment path')
            message.attach_file(path) # attachment['mime_type']

    message.attach_alternative(body, "text/html")
    message.send()

    new_email = Email.objects.create(subject=subject, body=body, type=Email.EMAIL_SENT, to='; '.join(to), cc='; '.join(cc or []), email_hash_tag=hash_tag)
    return new_email

