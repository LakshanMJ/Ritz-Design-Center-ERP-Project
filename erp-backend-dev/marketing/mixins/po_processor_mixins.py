from django.db import transaction
from django.db.models import Q
from marketing.models import PurchaseOrder, POColorway, POCountry, POSize, POPack, OrderCostingVersion, OriginalPOClub, ActualPOClub, UploadedPurchaseOrder, \
                            PurchaseOrderDelivery, PurchaseOrderDeliveryPack
from shared.utils import get_object_or_none
from datetime import datetime, timedelta
from dateutil import parser

class POProcessorMixin:
    GENERAL_ERRORS_KEY = 'General Errors'
    have_errors = False
    errors = {}
    _SIZE_OBJECT_TYPE = 'size'
    _COUNTRY_OBJECT_TYPE = 'country'
    _COSTING_VERSION_OBJECT_TYPE = 'costing_version'
    _DISPLAY_VALUE = {
        _SIZE_OBJECT_TYPE: 'Size',
        _COUNTRY_OBJECT_TYPE: 'Country',
        _COSTING_VERSION_OBJECT_TYPE: 'Costing Version',
    }

    def __init__(self, *args, **kwargs):
        super().__init__(**kwargs)
        self.have_errors = False
        self.errors = {}

    def purchase_order_exists(self, po_number, customer_id):
        order_exists = PurchaseOrder.objects.filter(name=po_number, customer_id=customer_id)
        return order_exists.exists()

    def value_is_int(self, value):
        is_int = True
        try:
            int(value)
        except ValueError:
            is_int = False
        return is_int

    def get_order_costing_version(self, style_number, customer_id):
        costing_version = OrderCostingVersion.objects.filter(
            order__style_number=style_number,
            active=True,
            version_state=OrderCostingVersion.COMPLETED_VERSION_STATE,
            approved=True,
            order__customer_id=customer_id,
            costing_type=OrderCostingVersion.MARKETING_COSTING
        ).order_by('created')
        return costing_version

    def get_order_size(self, costing_version, size_name):
        order_sizes = costing_version.order.get_order_sizes()
        size_name = size_name.strip()
        matching_size_qs = order_sizes.filter(Q(size__name__iexact=size_name) | Q(size__abbreviation__iexact=size_name))
        return matching_size_qs

    def get_order_country(self, costing_version, country_name):
        order_countries = costing_version.order.get_order_countries()
        if country_name == None:
            matching_countries_qs = order_countries
            return matching_countries_qs
        else:
            country_name = country_name.strip()
            matching_countries_qs = order_countries.filter(country__name__iexact=country_name)
        return matching_countries_qs

    def add_error(self, po_number, error):
        self.have_errors = True
        if not self.errors.get(po_number, None):
            self.errors[po_number] = []

        if error not in self.errors[po_number]:
            self.errors[po_number].append(error)

    def get_matching_object(self, object_type, po_number,  **kwargs):
        if object_type == self._COSTING_VERSION_OBJECT_TYPE:
            excel_val = kwargs['style_number']
            customer_id = kwargs['customer_id']
            objects = self.get_order_costing_version(excel_val, customer_id)
        elif object_type == self._COUNTRY_OBJECT_TYPE:
            costing_version = kwargs['costing_version']
            excel_val = kwargs['country_name']
            objects = self.get_order_country(costing_version, excel_val)

        elif object_type == self._SIZE_OBJECT_TYPE:
            costing_version = kwargs['costing_version']
            excel_val = kwargs['size_name']
            objects = self.get_order_size(costing_version, excel_val)
        else:
            raise Exception('Invalid Object Type')

        field = self._DISPLAY_VALUE[object_type]
        return_object = None

        if not objects.exists():
            self.add_error(po_number, 'Matching Pre %s does not exist for %s' % (str(field), str(excel_val)))
        elif not objects.exists():
            self.add_error(po_number, 'Matching %s does not exist for %s' % (str(field), str(excel_val)))
        elif objects.count() > 1:
            self.add_error(po_number, 'Multiple %ss found for %s. Please check the costing version to see if fields are duplicated, or contact the admin.' % (field, str(excel_val)))
        else:
            return_object = objects.first()
        return return_object

    def get_processed_po_row_data(self, po_number, costing_version, style_number, country_name, size_name, colorway, quantity):
        country_object = self.get_matching_object(self._COUNTRY_OBJECT_TYPE, po_number, costing_version=costing_version, country_name=country_name)
        size_object = self.get_matching_object(self._SIZE_OBJECT_TYPE, po_number, costing_version= costing_version, size_name=size_name)
        data = {
            'country': country_object.country.name if country_object is not None else "N/A",
            'order_country_object': country_object if country_object is not None else None,
            'style': style_number,
            'colorway': colorway,
            'size': size_name,
            'order_size_object': size_object,
            'quantity': quantity,
        }
        return data
    
    def format_date(self, date_str):
        output_format = '%Y-%m-%d'
        # print('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>', output_format)
        if isinstance(date_str, str):
            try:
                date_datetime = parser.parse(date_str)
                return datetime.strptime(date_datetime.strftime(output_format), output_format)
            except ValueError:
                pass
        elif isinstance(date_str, datetime):
            return datetime.strptime(date_str.strftime(output_format), output_format)
        else:
            return None
        
    def po_clubbing(self, delivery_date, uploaded_purchase_order):
        end_delivery_date = delivery_date + timedelta(weeks=1)
        original_po_clubs = OriginalPOClub.objects.filter(start_delivery_date__lte=delivery_date, end_delivery_date__gte=delivery_date, uploaded_purchase_order=uploaded_purchase_order)
        
        if not original_po_clubs:
            po_club, created = OriginalPOClub.objects.get_or_create(start_delivery_date=delivery_date, end_delivery_date=end_delivery_date, uploaded_purchase_order=uploaded_purchase_order)
            actual_po_club = ActualPOClub.objects.create(original_po_club=po_club, uploaded_purchase_order=uploaded_purchase_order)
        else:
            po_club = original_po_clubs.first()
            actual_po_club = get_object_or_none(ActualPOClub, {'original_po_club':po_club, 'uploaded_purchase_order':uploaded_purchase_order})
        return po_club, actual_po_club
    
    def create_purchase_order_deliveries(self, purchase_order, delivery_date):
        po_packs = purchase_order.popack_set.all()
        if delivery_date:
            po_delivery, created = PurchaseOrderDelivery.objects.get_or_create(
                purchase_order=purchase_order,
                delivery_date=delivery_date
            )
            for pack in po_packs:
                po_delivery_pack, created = PurchaseOrderDeliveryPack.objects.get_or_create(
                    purchase_order_delivery=po_delivery,
                    po_pack=pack,
                )
                po_delivery_pack.quantity = pack.quantity
                po_delivery_pack.save()

    '''
    :param data: organized data from the excel file
    
    This function will take all the data and create Purchase orders. The data should be in the following format
    data = {
        'PO1234': {
            'costing_version': CostingVersion Object,
            'data': [
                {
                    'country': country_name,
                    'order_country_object': country_object,
                    'style': style_number,
                    'colorway': colorway,
                    'size': size_name,
                    'order_size_object': size_object,
                    'quantity': quantity,
                }
            
            ]            
        }    
    }
    '''
    def create_purchase_orders(self, data, customer_id, attachment_id):
        response = {}
        if not self.have_errors:
            uploaded_purchase_order = UploadedPurchaseOrder.objects.create(attachment_id=attachment_id)
            response = {
                'po_ids': [],
                'uploaded_purchase_order_id': uploaded_purchase_order.id
            }
            with transaction.atomic():
                for po_number, po_data in data.items():
                    po_size_list = []
                    costing_version = po_data['costing_version']
                    delivery_date = po_data['delivery_date']
                    po_data = po_data['data']
                    if not self.purchase_order_exists(po_number, customer_id):
                        po_club, actual_po_club = self.po_clubbing(delivery_date, uploaded_purchase_order)
                        po, created = PurchaseOrder.objects.get_or_create(
                            name=po_number,
                            customer_id=customer_id,
                            marketing_costing=costing_version,
                            delivery_date=delivery_date,
                            original_po_club=po_club,
                            actual_po_club=actual_po_club,
                            uploaded_purchase_order=uploaded_purchase_order
                        )
                        po.uploaded_purchase_order = uploaded_purchase_order
                        # if costing_version.costing_type == OrderCostingVersion.PRE_COSTING:
                        #     actual_po_club.pre_costing = costing_version
                        #     actual_po_club.save()
                        #     po.marketing_costing = costing_version.marketing_costing
                        po.save()
                        response['po_ids'].append(po.id)

                        if not po.ritz_code:
                            po.set_ritz_purchase_order_number()

                        # Process PO Sizes
                        po_sizes = []
                        for detail in po_data:
                            print(detail)
                            # Process po countries
                            order_country_object = detail['order_country_object']
                            # po_country = get_object_or_none(POCountry, {'purchase_order': po, 'order_country': order_country_object})
                            # if not po_country:
                            po_country = POCountry.objects.get_or_create(
                                po_country_name=detail.get('country'),
                                # order_country=detail.get('order_country_object'),
                                purchase_order=po
                            )[0]

                            # Process colorway
                            cw = POColorway.objects.get_or_create(colorway=detail.get('colorway'), purchase_order=po)[0]

                            # Process Size
                            # po_size = get_object_or_none(POSize, {'purchase_order': po, 'order_size': detail.get('order_size_object')})
                            # if not po_size:
                            po_size = POSize.objects.get_or_create(
                                po_size_name=detail.get('size'),
                                # order_size=detail.get('order_size_object'),
                                purchase_order=po
                            )[0]

                            po_sizes.append(po_size.id)
                            quantity = detail.get('quantity')
                            if not self.value_is_int(quantity):
                                self.add_error(po_number, "Quantity for %s (%s) should be a number" % (po_number, cw))
                            else:
                                POPack.objects.create(po_colorway=cw, po_size=po_size, po_country=po_country, quantity=quantity, purchase_order=po, reviewed=False)
                        # po.validate_po_items()
                        # po.create_po_colorway_items()
                        self.create_purchase_order_deliveries(po, delivery_date)
                    else:
                        self.add_error(po_number, "PO with customer PO number %s already exists" % str(po_number))
                if self.have_errors:
                    transaction.set_rollback(True)
        return response