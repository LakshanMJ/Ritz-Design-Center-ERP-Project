from shared.models import EmailEvent, Role
from marketing.models import OrderCostingVersion, ActualPOClub
from shared.permissions.roles import MERCHANT_ROLE, MERCHANT_ADMIN_ROLE, CAD_USER_ROLE, IE_USER_ROLE, BUSINESS_ADMIN_ROLE
from shared import email
from django.template.loader import render_to_string
from django.apps import apps
import base64

class EmailNotification:

    OBJECT_TYPE_ACTUAL_PO_CLUB = '%s.%s' % (ActualPOClub._meta.app_label, ActualPOClub.__name__)
    OBJECT_TYPE_ORDER_COSTING_VERSION = '%s.%s' % (OrderCostingVersion._meta.app_label, OrderCostingVersion.__name__)

    EMAIL_TYPE_CAD_NOTIFICATION = 'cad_notification'
    EMAIL_TYPE_MERCHANT_NOTIFICATION = 'merchant_notification'


    def get_instance(self, object_type, object_id):
        app_name, model_name = object_type.split('.')
        model = apps.get_model(app_name, model_name)
        instance = model.objects.get(pk=object_id)
        return instance
    
    def get_logo(self):
        image_path = './materials/templates/RITZ-LOGO.jpg' 
        with open(image_path, 'rb') as image_file:
            binary_data = base64.b64encode(image_file.read()).decode('utf-8')
            return binary_data

    def create_event(self, email_type, status, object_type, object_id):
        event = EmailEvent.objects.get_or_create(email_type, object_type=object_type, object_id=object_id)
        event.status = status
        event.save()

    def get_primary_contract(self, role):
        role = Role.objects.get(name=role)
        primary_contact_list = role.users.all().values_list('email', flat=True)
        return primary_contact_list
    
    def send_notifications(self, pending_events):
        for pending_event in pending_events:
            instance = self.get_instance(pending_event.object_type, pending_event.object_id)
            template_data = {}
            cc_emails = []
            attachments = []

            if pending_event.email_type == self.EMAIL_TYPE_CAD_NOTIFICATION:
                primary_contact_list = self.get_primary_contract(CAD_USER_ROLE)
                if pending_event.object_type == self.OBJECT_TYPE_ORDER_COSTING_VERSION:
                    template_data = {
                        'url': '%s%s%s%s' %('http://localhost:3000/costing/add/', instance.order.id,'/version/', instance.id, '?tab=6')
                    }
                elif pending_event.object_type == self.OBJECT_TYPE_ACTUAL_PO_CLUB:
                    template_data = {
                        'url': '%s%s%s' %('http://localhost:3000/purchase_order/purchase_order_club/', instance.id, '?tab=3')
                    }
                else:
                    template_data = {
                    }
                email_body = render_to_string('../templates/user_notification_template.html', template_data)

            elif pending_event.object_type == self.EMAIL_TYPE_MERCHANT_NOTIFICATION:
                primary_contact_list = self.get_primary_contract(MERCHANT_ROLE)
                if pending_event.object_type == self.OBJECT_TYPE_ORDER_COSTING_VERSION:
                    template_data = {
                        'url': ''#TODO need to develop
                    }
                elif pending_event.object_type == self.OBJECT_TYPE_ACTUAL_PO_CLUB:
                    template_data = {
                        'url': ''#TODO need to develop
                    }
                else:
                    template_data = {
                    }
                email_body = render_to_string('../templates/user_notification_template.html', template_data)

            else:
                email_body = render_to_string('../templates/user_notification_template.html', template_data)

            send_email = email.send_email(
                to=[primary_contact_list], cc=cc_emails, subject="RITZ Clothing - CAD Reminder",
                body=email_body, attachments=attachments)
            
            pending_event.email_status = EmailEvent.SENT_STATUS
            #pending_event.save()

    def process_notifications(self):
        events = EmailEvent.objects.filter(email_status=EmailEvent.PENDING_STATUS)
        # print(events)
        self.send_notifications(events)