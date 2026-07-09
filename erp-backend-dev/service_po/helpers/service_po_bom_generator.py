from service_po.models import GeneralServicePO, ServicePO, GeneralServicePOService, GeneralServicePOServiceDelivery, GeneralServicePOSupplier
from shared.models import FileAttachment
from tempfile import NamedTemporaryFile
from marketing.utils.aws_utils import handle_uploaded_file
from io import StringIO, FileIO
from xhtml2pdf import pisa
from django.template.loader import render_to_string
from datetime import datetime
from shared.utils import get_object_or_none, set_attrs
from django.contrib.contenttypes.models import ContentType

class ServicePOGenerator:
    po_club = None
    plant = None
    plant_details = {}
    general_information = {}
    supplier = None
    user = None

    def __init__(self, po_club, user):
        self.po_club = po_club
        plant = po_club.plant
        self.user = user
        if plant:
            self.plant = plant
        self.general_information = self.get_general_information()

    def get_po_club_general_service_pos(self):
        return GeneralServicePO.objects.filter(po_club=self.po_club, state=GeneralServicePO.DRAFT)
    
    def validate_po_club_services(self):
        from marketing.models import POPackItemWashService, POPackItemEmbellishmentService
        has_errors = False
        errors = {}
        wash_content_type = ContentType.objects.get_for_model(POPackItemWashService)
        embellishment_content_type = ContentType.objects.get_for_model(POPackItemEmbellishmentService)
        po_club_general_service_po_services = GeneralServicePOService.objects.filter(
            general_service_po__po_club=self.po_club,
            entity_type__in=[wash_content_type, embellishment_content_type], completed=False
        )
        for po_club_general_service_po_service in po_club_general_service_po_services:
            if po_club_general_service_po_service.quantity > 0:
                has_errors = True
                errors['errors'] = 'Please complete all service po details'
                break
        if not has_errors:
            if GeneralServicePO.objects.filter(po_club=self.po_club).exclude(state=GeneralServicePO.DRAFT).exists():
                has_errors = True
                errors['errors'] = 'Invalid state in general service pos'
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
                'prepared_by': self.user.first_name,
                'checked_by': ' ',
            }

        return general_information

    def create_service_pos(self):
        for general_service_po in self.get_po_club_general_service_pos():

            po_allocation_table_data = {}
            general_service_po_supplier_ids = GeneralServicePOServiceDelivery.objects.filter(
                general_service_po_service__general_service_po=general_service_po
            ).distinct('general_service_po_supplier_price__general_service_po_supplier').values_list('general_service_po_supplier_price__general_service_po_supplier', flat=True)
            print(general_service_po_supplier_ids)
            for general_service_po_supplier in GeneralServicePOSupplier.objects.filter(id__in=general_service_po_supplier_ids):
                has_service = False
                table_data = {}
                total_price = 0.00
                total_price_after_discount = 0.00
                total_quantity = 0
                for general_service_po_service in general_service_po.generalserviceposervice_set.filter(completed=True):
                    service_details = general_service_po_service.service_detail
                    service_category = service_details.get('type', ' ')
                    service_description = service_details.get('sub_type', ' ')
                    self.add_table_data_key(table_data, service_category)
                    service_categories = table_data[service_category]
                    
                    if self.add_table_data_key(service_categories['data'], service_description):
                        service_categories['data'][service_description]['total_price'] = 0.00
                        service_categories['data'][service_description]['total_price_after_discount'] = 0.00
                        service_categories['data'][service_description]['total_quantity'] = 0
                        service_categories['data'][service_description]['unit'] = ' '
                    deliveries = service_categories['data'][service_description]
                    for general_service_po_service_delivery in general_service_po_service.generalserviceposervicedelivery_set.filter(general_service_po_supplier_price__general_service_po_supplier=general_service_po_supplier):
                        planned_date = general_service_po_service_delivery.planned_send_date
                        # planned_quantity = general_service_po_service_delivery.get_planned_send_quantity_from_po_allocations()
                        planned_quantity_po_allocations = general_service_po_service_delivery.generalservicepodeliverypoallocation_set.all()
                        planned_quantity_units = general_service_po_service_delivery.get_planned_send_quantity_units_display
                        price = general_service_po_service_delivery.general_service_po_supplier_price.price
                        service_categories['data'][service_description]['unit'] = planned_quantity_units
                            
                        for planned_quantity_po_allocation in planned_quantity_po_allocations:
                            has_service = True
                            purchase_order = planned_quantity_po_allocation.purchase_order.display_number
                            if not purchase_order in po_allocation_table_data:
                                po_allocation_table_data[purchase_order] = {}
                            if not service_category in po_allocation_table_data[purchase_order]:
                                po_allocation_table_data[purchase_order][service_category] = {}
                            if not service_description in po_allocation_table_data[purchase_order][service_category]:
                                po_allocation_table_data[purchase_order][service_category][service_description] = {}
                            if not str(planned_date) in po_allocation_table_data[purchase_order][service_category][service_description]:
                                po_allocation_table_data[purchase_order][service_category][service_description][str(planned_date)] = {
                                    'planned_quantity': 0,
                                    'unit': planned_quantity_po_allocation.quantity_units,
                                    'price': price,
                                    'value': 0.00
                                }
                            planned_quantity = planned_quantity_po_allocation.quantity
                            value = round(planned_quantity_po_allocation.calculate_quantity_price(), 2)
                            total_quantity += planned_quantity
                            total_price += value
                            total_price_after_discount += value
                            service_categories['data'][service_description]['total_price'] += value
                            service_categories['data'][service_description]['total_price'] = round(service_categories['data'][service_description]['total_price'], 2)

                            service_categories['data'][service_description]['total_price_after_discount'] += value
                            service_categories['data'][service_description]['total_price_after_discount'] = round(service_categories['data'][service_description]['total_price_after_discount'], 2)

                            service_categories['data'][service_description]['total_quantity'] += planned_quantity
                            po_allocation_table_data[purchase_order][service_category][service_description][str(planned_date)]['planned_quantity'] += planned_quantity
                            po_allocation_table_data[purchase_order][service_category][service_description][str(planned_date)]['value'] += value
                            po_allocation_table_data[purchase_order][service_category][service_description][str(planned_date)]['value'] = round(po_allocation_table_data[purchase_order][service_category][service_description][str(planned_date)]['value'], 2)

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
                        delivery['total_value'] = self.get_fraction_correct(delivery['total_value'])
                        delivery['total_value_after_discount'] += value
                        delivery['total_value_after_discount'] = self.get_fraction_correct(delivery['total_value_after_discount'])
                        delivery['total_quantity'] += planned_quantity
                        delivery['data'].append({
                            'quantity': planned_quantity,
                            'unit': planned_quantity_units,
                            'price': price,
                            'value': value
                        })
                if has_service:
                    supplier_details = self.get_supplier_details(general_service_po_supplier)
                    total_price = self.get_fraction_correct(total_price)
                    total_price_after_discount = self.get_fraction_correct(total_price_after_discount)
                    self.create_service_po_pdf(table_data, total_price=total_price, total_price_after_discount=total_price_after_discount, supplier_details=supplier_details, po_allocation_table_data=po_allocation_table_data, general_service_po_supplier=general_service_po_supplier)
            # break

    def get_fraction_correct(self, value):
        fraction_str = str(value).split('.')[-1] if '.' in str(value) else ''
        try:
            fraction_digits = len(fraction_str)
            if fraction_digits > 6 and len(set(fraction_str)) == 1:
                value = round(value, 2)
            elif fraction_digits > 6:
                value = round(value, 6)
            else:
                value = round(value, fraction_digits)
        except Exception:
            value = round(value, 2)
        return value    

    def get_supplier_details(self, general_service_po_supplier):
        supplier_details = {}
        if general_service_po_supplier:
            supplier = general_service_po_supplier.supplier
        if supplier:
            print(supplier.name)
            self.supplier = supplier
            supplier_details['name'] = supplier.name
            if supplier.supplierlocation_set.all().exists():
                if supplier.supplierlocation_set.first().address:
                    supplier_details['address'] = supplier.supplierlocation_set.first().address.get_verbose_address()
                    supplier_details['address_line_1'] = supplier.supplierlocation_set.first().address.address_line_1
                    supplier_details['address_line_2'] = supplier.supplierlocation_set.first().address.address_line_2
                    supplier_details['city'] = supplier.supplierlocation_set.first().address.city
                    supplier_details['country'] = supplier.supplierlocation_set.first().address.country.name
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
            self.general_information['pay_mode'] = general_service_po_supplier.pay_mode
            if not general_service_po_supplier.service_po:
                service_po = get_object_or_none(ServicePO, {'service_po_supplier': general_service_po_supplier})
                if service_po:
                    service_po.total_price = total_price
                    service_po.save()
                else:
                    service_po = ServicePO.objects.create(
                        service_po_supplier=general_service_po_supplier,
                        total_price=total_price
                    )
                general_service_po_supplier.service_po = service_po
                general_service_po_supplier.save()
            else:
                service_po = general_service_po_supplier.service_po
                service_po.total_price = total_price
                service_po.save()
        return service_po
    
    def set_service_po_information(self, service_po):
        if not service_po.plant:
            service_po.plant = self.plant
        service_po.prepared_by = self.user
        keys = [
            'payment_term',
            'value_added_tax_registration_number',
            'simplified_value_added_tax_registration_number',
            'board_of_investment_registration_number',

        ]
        for key in keys:
            data = getattr(service_po, key, None)
            if data:
                self.general_information[key] = data
            else:
                value = self.general_information.get(key, None)
                if value:
                    service_po.__setattr__(key, value)
        service_po.save()

    def create_service_po_pdf(self, table_data, *args, **kwargs):
        template = 'service_po_template_without_po_wise.html'
        total_price = kwargs.get('total_price', 0.00)
        total_price_after_discount = kwargs.get('total_price_after_discount', 0.00)
        general_service_po_supplier = kwargs.get('general_service_po_supplier', None)
        # general_service_po_supplier = general_service_po.generalserviceposupplier_set.first()
        service_po = self.get_service_po_object(general_service_po_supplier, total_price)
        if general_service_po_supplier:
            self.general_information['payment_term'] = general_service_po_supplier.pay_mode
        self.set_service_po_information(service_po)
        discount = 0
        if total_price > 0:
            discount = round((total_price - total_price_after_discount) / total_price * 100, 2)
        organized_data = {
            'po_allocation_table_data': kwargs.get('po_allocation_table_data', {}),
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
            save_path = 'service_pos/%s' % (str(self.po_club.display_number), )
            # file_name = temp.name.split('\\')[-1]
            file_name = service_po.get_service_po_file_name()
            saved_file = handle_uploaded_file(file, save_path, file_name) #, 'Supplier PO - %s.xlsx' % (str(supplier.name)))
            file.close()
            file_attachment = FileAttachment.objects.create(display_name='Ritz Supplier PO', type='.pdf',
                                                            file_path=saved_file)
            if type(service_po) == ServicePO:
                service_po.set_new_service_po_file(file_attachment)
                service_po.state = ServicePO.DRAFT_STATE
                service_po.save()