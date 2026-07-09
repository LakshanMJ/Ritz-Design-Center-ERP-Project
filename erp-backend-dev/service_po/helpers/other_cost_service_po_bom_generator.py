from service_po.models import GeneralServicePO, ServicePO, GeneralServicePOService, GeneralServicePOServiceDelivery
from shared.models import FileAttachment, User
from tempfile import NamedTemporaryFile
from marketing.utils.aws_utils import handle_uploaded_file
from io import StringIO, FileIO
from xhtml2pdf import pisa
from django.template.loader import render_to_string
from datetime import datetime
from django.contrib.contenttypes.models import ContentType
from shared.utils import get_object_or_none

class OtherCostServicePOGenerator:
    general_service_po_supplier = None
    po_club = None
    plant = None
    plant_details = {}
    general_information = {}
    supplier = None

    def __init__(self, general_service_po_supplier):
        self.general_service_po_supplier = general_service_po_supplier
        self.po_club = general_service_po_supplier.general_service_po.po_club
        plant = general_service_po_supplier.general_service_po.po_club.plant
        if plant:
            self.plant = plant
        self.general_information = self.get_general_information()

    def get_general_service_po_services(self):
        general_service_po_services = GeneralServicePOService.objects.filter(id=self.general_service_po_supplier.general_service_po.id)
        return general_service_po_services
    
    def validate_po_club_services(self, general_service_po_supplier):
        from marketing.models import OtherCostType
        has_errors = False
        errors = {}
        other_cost_type_content_type = ContentType.objects.get_for_model(OtherCostType)
        return has_errors, errors
    
    def get_general_information(self):
        general_information = {}
        order_costing_version = self.po_club.get_costing()
        if self.po_club and self.plant:
            general_information = {
                'date': datetime.now().strftime('%d %B %Y'),
                'customer': self.po_club.customer_name,
                'style': self.po_club.style_number if self.po_club.style_number else ' ',
                'order_number': order_costing_version.display_number if order_costing_version else ' ',
                'billing_location_name': self.plant.billing_location_name if self.plant.billing_location_name else ' ',
                'billing_address_line_1': self.plant.billing_address.address_line_1 if self.plant.billing_address else ' ',
                'billing_address_line_2': self.plant.billing_address.address_line_2 if self.plant.billing_address else ' ',
                'billing_city': self.plant.billing_address.city if self.plant.billing_address else ' ',
                'billing_country': self.plant.billing_address.country.name if self.plant.billing_address else ' ',
                'value_added_tax_registration_number': self.plant.value_added_tax_registration_number if self.plant.value_added_tax_registration_number else ' ',
                'simplified_value_added_tax_registration_number': self.plant.simplified_value_added_tax_registration_number if self.plant.simplified_value_added_tax_registration_number else ' ',
                'billing_phone_number': self.plant.billing_phone_number if self.plant.billing_phone_number else ' ',
                'payment_term': self.general_service_po_supplier.get_payment_term_display,
            }
        return general_information

    def create_service_pos(self, user):
        from marketing.models import OtherCostType
        table_data = {}
        total_price = 0.00
        total_price_after_discount = 0.00
        total_quantity = 0
        supplier_details = self.get_supplier_details()
        general_service_po_service_deliveries = GeneralServicePOServiceDelivery.objects.filter(general_service_po_supplier_price__general_service_po_supplier=self.general_service_po_supplier)
        for general_service_po_service_delivery in general_service_po_service_deliveries:
            service_details = general_service_po_service_delivery.general_service_po_supplier_price.service_detail
            service_category = service_details.get('name', '')
            service_description = service_details.get('other_cost_type_description', '')
            self.add_table_data_key(table_data, service_category)
            service_categories = table_data[service_category]
            
            if self.add_table_data_key(service_categories['data'], service_description):
                service_categories['data'][service_description]['total_price'] = 0.00
                service_categories['data'][service_description]['total_price_after_discount'] = 0.00
                service_categories['data'][service_description]['total_quantity'] = 0
                service_categories['data'][service_description]['unit'] = ' '
            deliveries = service_categories['data'][service_description]
            planned_date = general_service_po_service_delivery.planned_send_date
            planned_quantity_units = general_service_po_service_delivery.get_planned_send_quantity_units_display
            price = general_service_po_service_delivery.general_service_po_supplier_price.price
            service_categories['data'][service_description]['unit'] = planned_quantity_units
                
            planned_quantity = general_service_po_service_delivery.planned_send_quantity
            value = round(planned_quantity * price, 2)
            total_quantity += planned_quantity
            total_price += value
            total_price_after_discount += value


            if not str(planned_date) in deliveries['data']:
                deliveries['data'][str(planned_date)] = {
                    'total_value': 0.00,
                    'total_value_after_discount': 0.00,
                    'total_quantity': 0,
                    'price': price,
                    'unit': planned_quantity_units,
                    'row_count': 0,
                    'data': []
                }

            delivery = deliveries['data'][str(planned_date)]
            service_categories['row_count'] += 1
            deliveries['row_count'] += 1
            delivery['row_count'] += 1
            delivery['total_value'] += value
            delivery['total_value'] = round(delivery['total_value'], 2)
            delivery['total_value_after_discount'] += value
            delivery['total_value_after_discount'] = round(delivery['total_value_after_discount'], 2)
            delivery['total_quantity'] += planned_quantity
            delivery['data'].append({
                'quantity': planned_quantity,
                'unit': planned_quantity_units,
                'price': price,
                'value': value
            })
        self.create_service_po_pdf(table_data, user=user, total_price=value, total_price_after_discount=total_price_after_discount, supplier_details=supplier_details)

    def get_supplier_details(self):
        supplier_details = {}
        if self.general_service_po_supplier:
            supplier = self.general_service_po_supplier.supplier
        if supplier:
            self.supplier = supplier
            supplier_details['name'] = supplier.name
            if supplier.supplierlocation_set.all().exists():
                supplier_details['address'] = supplier.supplierlocation_set.first().address.get_verbose_address()
            primary_contact = supplier.get_supplier_primary_contact()
            if primary_contact:
                supplier_details['attention'] = primary_contact.name
                if not supplier_details['attention']:
                    supplier_details['attention'] = ' '
            supplier_details['email'] = supplier.email
            supplier_details['contact_number'] = supplier.phone_number
        return supplier_details
    
    def add_table_data_key(self, dictionary:dict, key:str):
        new_key = False
        if not key in dictionary:
            new_key = True
            dictionary[key] = {
                'row_count': 0,
                'data': {}
            }
        return new_key
    
    def get_service_po_object(self, general_service_po_supplier, total_price):
        service_po = None
        if general_service_po_supplier:
            self.general_information['pay_mode'] = general_service_po_supplier.payment_term
            if not general_service_po_supplier.service_po:
                service_po, created = ServicePO.objects.get_or_create(
                    service_po_supplier=general_service_po_supplier,
                    total_price=total_price
                )
                service_po.total_price=total_price
                service_po.save()
        return service_po

    def create_service_po_pdf(self, table_data, *args, **kwargs):
        template = 'service_po_template_without_po_wise.html'
        total_price = kwargs.get('total_price', 0.00)
        total_price_after_discount = kwargs.get('total_price_after_discount', 0.00)
        user = kwargs.get('user', None)

        service_po = self.get_service_po_object(self.general_service_po_supplier, total_price)
        self.general_information['pay_mode'] = self.general_service_po_supplier.get_payment_term_display
        self.general_information['prepared_by'] = user.first_name

        discount = 0
        if total_price > 0 and discount > 0:
            discount = round((total_price - total_price_after_discount) / total_price * 100, 2)
        organized_data = {
            #'po_allocation_table_data': kwargs.get('po_allocation_table_data', {}),
            'general_information': self.general_information,
            'ritz_details': self.plant_details,
            'supplier_details': kwargs.get('supplier_details', {}),
            'table_data': table_data,
            'total_price': total_price,
            'total_price_after_discount': total_price_after_discount,
            'discount_percentage': discount,
            'service_order_number': service_po.display_number if service_po else ' ',
        }

        with NamedTemporaryFile(mode='w+', suffix='.pdf', delete=False) as temp:
            try:
                pdf = pisa.CreatePDF(
                    StringIO(render_to_string(template,organized_data)),
                    FileIO(temp.name, 'wb'),
                )
            except:
                pass
            file = open(temp.name, mode='rb')
            save_path = 'service_pos/%s' % (str(self.po_club.pk), )
            file_name = temp.name.split('\\')[-1]
            saved_file = handle_uploaded_file(file, save_path, file_name) #, 'Supplier PO - %s.xlsx' % (str(supplier.name)))
            file.close()
            file_attachment = FileAttachment.objects.create(display_name='Ritz Supplier PO', type='.pdf',
                                                            file_path=saved_file)
            if type(service_po) == ServicePO:
                service_po.set_new_service_po_file(file_attachment)
                service_po.state = ServicePO.DRAFT_STATE
                service_po.service_po_supplier = self.general_service_po_supplier
                service_po.payment_term = self.general_service_po_supplier.payment_term
                if user:
                    service_po.prepared_by = user
                service_po.save()
                self.general_service_po_supplier.service_po = service_po
                self.general_service_po_supplier.save()
            print(file_attachment.file_path)