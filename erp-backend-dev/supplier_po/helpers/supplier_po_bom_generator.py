import math
from materials.fieldmetadata.measuring_unit_helpers import MaterialUnitHelper
from supplier_po.models import GeneralPOMaterialQuantity, SupplierDeliveryDate, SupplierDeliveryDateQuantity, SupplierPO, SupplierRequestedDeliveryDate, GeneralPOSupplierMaterialPrice, SupplierInquiryDetail, SupplierDeliveryDateQuantityPOAllocation, GeneralPOSupplier, GeneralPO, SupplierPOGeneralPOMaterialQuantity
from tempfile import NamedTemporaryFile

from marketing.utils.aws_utils import handle_uploaded_file
from shared.models import FileAttachment, Supplier, InHouseMaterial
from materials.models import GenericMaterial, Material
import io
from datetime import datetime
from django.shortcuts import get_object_or_404
from io import StringIO, FileIO
from xhtml2pdf import pisa
from django.template.loader import render_to_string
from django.db.models import Q
from marketing.models import POClubShade
from shared.helpers.currency_helper import CurrencyHelper
from shared.utils import get_attributes, get_object_or_none, convert_quantity_to_unit
from shared.models import Size


class SupplierPOBOM():
    po_club = None
    def process_boms(self, po_club):
        self.po_club = po_club
        supplier_po_club_bom_generator = SupplierPOClubBOMGenerator(po_club)
        supplier_po_club_bom_generator.create_supplier_pos([75, 65], combined=True)
    
    # def general_process_boms(self, po_club):
    #     general_pos = po_club.get_costing().generalpo_set.filter(po_club=None,
    #                                                              state__in=[GeneralPO.QUANTITY_VERIFICATION, GeneralPO.DRAFT])
    #     for general_po in general_pos:
    #         GeneralSupplierPOBOMGenerator(general_po).create_supplier_pos()


class SupplierPOClubBOMGenerator():

    po_club = None
    create_file_po_ids = []
    template = 'supplier_po_template_without_po_wise.html'
    template_with_po_wise = 'supplier_po_template_with_po_wise.html'
    prepared_by = None

    def __init__(self, po_club):
        self.po_club = po_club
        self.create_file_po_ids = []
    
    def set_prepared_by(self, user):
        self.prepared_by = user
    
    def all_purchase_order_has_plant(self):
        has_plant = True

        pos = self.po_club.get_purchase_orders()
        for po in pos:
            if not po.plant:
                has_plant = False
        if not pos.exists():
            has_plant = False

        return has_plant
    
    def get_table_merged_data(self, table_data):
        table_rows = []
        table_row = {}
        
        for sao in table_data:
            sao_data = table_data[sao]
            table_row['sao'] = sao_data['sao']
            table_row['sao_rowspan'] = sao_data['sao_rowspan']
            for purchase_order in sao_data['sao_data']:
                purchase_order_data = sao_data['sao_data'][purchase_order]
                table_row['purchase_order_number'] = purchase_order_data['purchase_order_number']
                table_row['purchase_order_rowspan'] = purchase_order_data['purchase_order_rowspan']
                for item_code in purchase_order_data['purchase_order_data']:
                    item_data = purchase_order_data['purchase_order_data'][item_code]
                    table_row['item_code'] = item_data['item_code']
                    table_row['item_rowspan'] = item_data['item_rowspan']
                    table_row['total_order_quantity'] = round(item_data['total_order_quantity'],2)
                    for item_row in item_data['item_data']:
                        if 'item_code' in table_row:
                            table_row['item_description'] = item_row['item_description']
                        table_row['delivery_date'] = item_row['delivery_date']
                        table_row['accepted_delivery_tolarance'] = item_row['accepted_delivery_tolarance']
                        table_row['delivery_split'] = item_row['delivery_split']
                        table_row['unit'] = item_row['unit']
                        table_row['unit_price'] = item_row['unit_price']
                        table_row['costing_unit'] = item_row['costing_unit']
                        table_row['value'] = item_row['value']
                        table_row['discount'] = item_row['discount']
                        table_row['value_after_discount'] = item_row['value_after_discount']
                        table_rows.append(table_row)
                        table_row = {}
        return table_rows
    
    def get_fraction_correct(self, value):
        fraction_str = str(value).split('.')[-1] if '.' in str(value) else ''
        try:
            fraction_digits = len(fraction_str)
            if fraction_digits > 6 and len(fraction_str) - len(set(fraction_str)) < 4:
                value = round(value, 2)
            elif fraction_digits > 6:
                value = round(value, 6)
            else:
                value = round(value, fraction_digits)
        except Exception:
            value = round(value, 2)
        return value
    
    def get_width(self, supplier_delivery_date_quantity):
        cutting_width = 0
        if supplier_delivery_date_quantity.general_po_material_quantity.default_material_supplier.cutting_width:
            cutting_width = supplier_delivery_date_quantity.general_po_material_quantity.default_material_supplier.cutting_width
        elif supplier_delivery_date_quantity.material_supplier.supplier_inquiry_detail:
            cutting_width = supplier_delivery_date_quantity.material_supplier.supplier_inquiry_detail.cutting_width
        return cutting_width
    
    def get_width_units(self, supplier_delivery_date_quantity):
        cutting_width_unit = ''
        if supplier_delivery_date_quantity.general_po_material_quantity.default_material_supplier.cutting_width:
            cutting_width_unit = supplier_delivery_date_quantity.general_po_material_quantity.default_material_supplier.get_cutting_width_unit_display()
        elif supplier_delivery_date_quantity.material_supplier.supplier_inquiry_detail:
            cutting_width_unit = supplier_delivery_date_quantity.material_supplier.supplier_inquiry_detail.get_cutting_width_unit_display()
        return cutting_width_unit
    
    def get_table_data(self, materials, supplier_po):
        table_data = {}
        delivery_instructions = {}
        total_value = 0
        total_value_after_discount = 0
        for supplier_delivery_date_quantity_po_allocation in materials.order_by('supplier_delivery_date_quantity__material_supplier__supplier_material__customer_brand_material__material_detail__generic_material__id'):
            customer_brand_material = supplier_delivery_date_quantity_po_allocation.supplier_delivery_date_quantity.material_supplier.supplier_material.customer_brand_material
            generic_material = customer_brand_material.material_detail.generic_material
            color_data = {}
            # proforma invoice data copying
            supplier_delivery_date_quantity = supplier_delivery_date_quantity_po_allocation.supplier_delivery_date_quantity
            if not supplier_delivery_date_quantity.proforma_invoice_quantity:
                supplier_delivery_date_quantity.proforma_invoice_quantity_units = supplier_delivery_date_quantity.quantity_units
                supplier_delivery_date_quantity.proforma_invoice_quantity = supplier_delivery_date_quantity.quantity
                supplier_delivery_date_quantity.save()
            #
            #SupplierRequestedDeliveryDate creating
            if not supplier_delivery_date_quantity.requested_date:
                supplier_requested_delivery_date, created = SupplierRequestedDeliveryDate.objects.get_or_create(supplier_po=supplier_po,
                                                            requested_date=supplier_delivery_date_quantity.supplier_delivery_date.confirmed_delivery_date)
                supplier_delivery_date_quantity.requested_date = supplier_requested_delivery_date
                supplier_delivery_date_quantity.save()
            #
            sao = supplier_delivery_date_quantity_po_allocation.supplier_delivery_date_quantity.general_po_material_quantity.general_po.costing.version_display_number#.ritz_code
            purchase_order_number = supplier_delivery_date_quantity_po_allocation.purchase_order.display_number
            item_code = supplier_delivery_date_quantity_po_allocation.supplier_delivery_date_quantity.general_po_material_quantity.material.display_number
            attributes = supplier_delivery_date_quantity_po_allocation.supplier_delivery_date_quantity.general_po_material_quantity.material.material_detail.generic_material.user_material.get_user_defined_material_fields()
            attribute_values = supplier_delivery_date_quantity_po_allocation.supplier_delivery_date_quantity.general_po_material_quantity.material.get_attributes()
            material_discount = supplier_delivery_date_quantity.material_supplier.discount

            
            material_type = supplier_delivery_date_quantity.general_po_material_quantity.material.material_type
            material_type_display = supplier_delivery_date_quantity.general_po_material_quantity.material.material_label

            description = supplier_delivery_date_quantity.general_po_material_quantity.material.material_description
            if supplier_delivery_date_quantity.general_po_material_quantity.material.material_type == Material.FABRIC_MATERIAL:
                description += ' Width ' + str(round(self.get_width(supplier_delivery_date_quantity),2)) + ' ' + self.get_width_units(supplier_delivery_date_quantity)
            if not sao in table_data:
                table_data[sao] = {
                    'sao': sao,
                    'sao_rowspan': 0,
                    'sao_data': {}
                }
            table_data[sao]['sao_rowspan'] += 1
            if not purchase_order_number in table_data[sao]['sao_data']:
                table_data[sao]['sao_data'][purchase_order_number] = {
                    'purchase_order_number': purchase_order_number,
                    'purchase_order_rowspan': 0,
                    'purchase_order_data': {}
                }
            table_data[sao]['sao_data'][purchase_order_number]['purchase_order_rowspan'] += 1
            if not item_code in table_data[sao]['sao_data'][purchase_order_number]['purchase_order_data']:
                table_data[sao]['sao_data'][purchase_order_number]['purchase_order_data'][item_code] = {
                    'item_code': item_code,
                    'item_rowspan': 0,
                    'total_order_quantity': 0,
                    'item_data': []
                }
            table_data[sao]['sao_data'][purchase_order_number]['purchase_order_data'][item_code]['item_rowspan'] += 1
            delivery_date = ' '
            if supplier_delivery_date_quantity_po_allocation.supplier_delivery_date_quantity.supplier_delivery_date:
                if supplier_delivery_date_quantity_po_allocation.supplier_delivery_date_quantity.supplier_delivery_date.confirmed_delivery_date:
                    delivery_date = supplier_delivery_date_quantity_po_allocation.supplier_delivery_date_quantity.supplier_delivery_date.confirmed_delivery_date
            
            unit_display = supplier_delivery_date_quantity_po_allocation.get_quantity_units_display()
            unit = supplier_delivery_date_quantity_po_allocation.quantity_units
            unit_price = supplier_delivery_date_quantity_po_allocation.supplier_delivery_date_quantity.material_supplier.order_price#supplier_inquiry_detail.cost_per_unit
            costing_unit_display = supplier_delivery_date_quantity_po_allocation.supplier_delivery_date_quantity.material_supplier.get_order_price_units_display#supplier_inquiry_detail.get_costing_unit_display
            costing_unit = supplier_delivery_date_quantity_po_allocation.supplier_delivery_date_quantity.material_supplier.order_price_units
            costing_unit_flat = MaterialUnitHelper.PER_UNIT_TO_UNIT_MAPPING.get(costing_unit, None)
            costing_unit_flat_display = MaterialUnitHelper().all_measuring_units_dictionary.get(costing_unit_flat, None)
            
            unit_display = costing_unit_flat_display

            quantity = round(supplier_delivery_date_quantity_po_allocation.quantity,2)
            if not unit in MaterialUnitHelper.PIECE_UNITS:
                quantity_meter = MaterialUnitHelper().convert_to_meters(unit, quantity)
                quantity_units_conversion = MaterialUnitHelper().get_meter_conversion_amount(costing_unit_flat)
                quantity = quantity_meter/quantity_units_conversion

            discount = supplier_delivery_date_quantity_po_allocation.supplier_delivery_date_quantity.material_supplier.discount
            discount_deduction = (100-discount)/100 if discount else 1
            
            # Print the fractional part of unit_price if it exists
            if unit_price:
                unit_price = self.get_fraction_correct(unit_price)
            if quantity:
                quantity = self.get_fraction_correct(quantity)
            value = quantity*unit_price
            if value:
                value = self.get_fraction_correct(value)
            if value:
                total_value += value
                value_after_discount = value*discount_deduction
                total_value_after_discount += value_after_discount
            item_data = {
                'item_description': description,
                'delivery_date': delivery_date,
                'material_type': material_type_display,
                'accepted_delivery_tolarance': '5%', # Accepted tolerance TODO
                'delivery_split': str(quantity),
                'unit': unit_display,
                'unit_price': unit_price,
                'costing_unit': costing_unit_display,
                'value': value,
                'value_after_discount': value_after_discount,
                'discount': discount
            }

            if not delivery_date in delivery_instructions:
                delivery_instructions[delivery_date] = {
                    'delivery_date': delivery_date,
                    'delivery_data': {}
                }
            if customer_brand_material.is_size_dependent():
                size_display_value = customer_brand_material.get_size_dependent_value()
                self.add_size_dependent_data(
                    delivery_instructions[delivery_date]['delivery_data'],
                    {
                        'item_code': item_code,
                        'size_dependent': customer_brand_material.is_size_dependent(),
                        'generic_material_id': generic_material.id,
                        'material_type': material_type_display,
                        'item_description': description,
                        'size': size_display_value,
                        'size_sorting_order': self.get_size_sorting_order(size_display_value),
                        'quantity': quantity,
                        'unit': unit_display,
                        'unit_price': unit_price,
                        'costing_unit': costing_unit_display,
                        'value': value,
                        'value_after_discount': value_after_discount,
                        'discount': discount
                    }
                )
            else:
                if not item_code in delivery_instructions[delivery_date]['delivery_data']:
                    delivery_instructions[delivery_date]['delivery_data'][item_code] = {
                        'item_code': item_code,
                        'size_dependent': customer_brand_material.is_size_dependent(),
                        'material_type': material_type_display,
                        'generic_material_id': generic_material.id,
                        'item_data': {
                            'item_description': description,
                            'quantity': quantity,
                            'unit': unit_display,
                            'unit_price': unit_price,
                            'costing_unit': costing_unit_display,
                            'value': value,
                            'value_after_discount': value_after_discount,
                            'discount': discount
                        }
                    }
                else:
                    delivery_instructions[delivery_date]['delivery_data'][item_code]['item_data']['quantity'] += quantity
                    delivery_instructions[delivery_date]['delivery_data'][item_code]['item_data']['value'] += value
                    delivery_instructions[delivery_date]['delivery_data'][item_code]['item_data']['value_after_discount'] += value_after_discount
                    delivery_instructions[delivery_date]['delivery_data'][item_code]['item_data']['quantity'] = self.get_fraction_correct(delivery_instructions[delivery_date]['delivery_data'][item_code]['item_data']['quantity'])
                    delivery_instructions[delivery_date]['delivery_data'][item_code]['item_data']['value'] = self.get_fraction_correct(delivery_instructions[delivery_date]['delivery_data'][item_code]['item_data']['value'])
                    delivery_instructions[delivery_date]['delivery_data'][item_code]['item_data']['value_after_discount'] = self.get_fraction_correct(delivery_instructions[delivery_date]['delivery_data'][item_code]['item_data']['value_after_discount'])
            table_data[sao]['sao_data'][purchase_order_number]['purchase_order_data'][item_code]['item_data'].append(item_data)
            table_data[sao]['sao_data'][purchase_order_number]['purchase_order_data'][item_code]['total_order_quantity'] += quantity
            table_data[sao]['sao_data'][purchase_order_number]['purchase_order_data'][item_code]['total_order_quantity'] = self.get_fraction_correct(table_data[sao]['sao_data'][purchase_order_number]['purchase_order_data'][item_code]['total_order_quantity'])
        total_value, total_value_after_discount, delivery_instructions = self.thread_quantity_ceil(delivery_instructions)

        # delivery_instructions = self.get_sorted_delivery_intructions(delivery_instructions)
        return table_data, total_value, total_value_after_discount, delivery_instructions
    
    def get_size_sorting_order(self, size_display_value):
        sorting_order = 0
        size = get_object_or_none(Size, {'name': size_display_value})
        if size:
            sorting_order = size.sorting_order
        return sorting_order
    
    def add_size_dependent_data(self, delivery_data, delivery_details):
        found = False
        for item_code in delivery_data:
            generic_material_id = delivery_data[item_code]['generic_material_id']
            if generic_material_id == delivery_details['generic_material_id']:
                found = True
                delivery_data[item_code]['item_data']['quantity'] += delivery_details['quantity']
                delivery_data[item_code]['item_data']['value'] += delivery_details['value']
                delivery_data[item_code]['item_data']['value_after_discount'] += delivery_details['value_after_discount']
                size_found = False
                for index in range(0, len(delivery_data[item_code]['size_data'])):
                    if delivery_data[item_code]['size_data'][index]['size'] == delivery_details['size']:
                        size_found = True
                        delivery_data[item_code]['size_data'][index]['quantity'] += delivery_details['quantity']
                        break
                if not size_found:
                    delivery_data[item_code]['size_data'].append({
                        'item_code': delivery_details['item_code'],
                        'size': delivery_details['size'],
                        'quantity': delivery_details['quantity'],
                        'unit': delivery_details['unit'],
                        'size_sorting_order': delivery_details['size_sorting_order']
                    })
                    size_data = delivery_data[item_code]['size_data']
                    delivery_data[item_code]['size_data'] = sorted(size_data, key=lambda x: x['size_sorting_order'])
                break
        if not found:
            delivery_data[delivery_details['item_code']] = {
                'item_code': delivery_details['item_code'],
                'size_dependent': delivery_details['size_dependent'],
                'material_type': delivery_details['material_type'],
                'generic_material_id': delivery_details['generic_material_id'],
                'item_data': {
                    'item_description': delivery_details['item_description'],
                    'quantity': delivery_details['quantity'],
                    'unit': delivery_details['unit'],
                    'unit_price': delivery_details['unit_price'],
                    'costing_unit': delivery_details['costing_unit'],
                    'value': delivery_details['value'],
                    'value_after_discount': delivery_details['value_after_discount'],
                    'discount': delivery_details['discount']
                },
                'size_data': [
                    {
                        'item_code': delivery_details['item_code'],
                        'size': delivery_details['size'],
                        'quantity': delivery_details['quantity'],
                        'unit': delivery_details['unit'],
                        'size_sorting_order': delivery_details['size_sorting_order']
                    }
                ]
            }

    def get_sorted_delivery_intructions(self, delivery_instructions):
        # print(delivery_instructions)
        for delivery_date in delivery_instructions:
            delivery_data = [data for key, data in delivery_instructions[delivery_date]['delivery_data'].items()]
            delivery_data = sorted(delivery_data, key=lambda x: x['material_type'])

            delivery_instructions[delivery_date]['delivery_data'] = {data['item_code']: data for data in delivery_data}
        return delivery_instructions


    def thread_quantity_ceil(self, delivery_instructions):
        total_value = 0.00
        total_value_after_discount = 0.00
        for delivery_date in delivery_instructions:
            for item_code in delivery_instructions[delivery_date]['delivery_data']:
                quantity = delivery_instructions[delivery_date]['delivery_data'][item_code]['item_data']['quantity']
                unit_price = delivery_instructions[delivery_date]['delivery_data'][item_code]['item_data']['unit_price']
                discount = delivery_instructions[delivery_date]['delivery_data'][item_code]['item_data']['discount']
                discount_deduction = (100-discount)/100 if discount else 1

                if delivery_instructions[delivery_date]['delivery_data'][item_code]['material_type'] == 'Thread':
                    quantity = self.get_fraction_correct(math.ceil(quantity))
                value = round(quantity*unit_price, 2)
                value_after_discount = round(value*discount_deduction, 2)

                delivery_instructions[delivery_date]['delivery_data'][item_code]['item_data']['quantity'] = quantity
                delivery_instructions[delivery_date]['delivery_data'][item_code]['item_data']['value'] = value
                delivery_instructions[delivery_date]['delivery_data'][item_code]['item_data']['value_after_discount'] = value_after_discount

                total_value += value
                total_value_after_discount += value_after_discount

        
        return total_value, total_value_after_discount, delivery_instructions



    def get_organized_data(self, supplier_data):
        remarks = ''
        organized_data = {}
        supplier_details = {}
        ritz_details = {}
        general_information = {}
        table_data = {}
        delivery_instructions = {}
        #supplier details
        supplier = supplier_data['supplier_object']
        supplier_po = supplier_data['supplier_po_object']
        supplier_details = {'supplier_object': supplier,
                            'supplier_company_name': supplier.name}
        supplier_locations = supplier.supplierlocation_set.all()
        if supplier_locations.exists():
            supplier_details['supplier_address'] = supplier_locations.first().address.get_verbose_address()
        primary_contact = supplier.get_supplier_primary_contact()
        if primary_contact:
            supplier_details['supplier_attention']= primary_contact.name
            if not supplier_details['supplier_attention']:
                supplier_details['supplier_attention'] = ' '
        supplier_details['supplier_email']= supplier.email
        supplier_details['supplier_contact_number']= supplier.phone_number

        # #general information
        
        
        general_information = {'customer': supplier_po.customer.name if supplier_po.customer else ' ',
                                'style_number': supplier_po.general_po_supplier.general_po.costing.order.style_number,
                                'delivery_mode': supplier_po.get_delivery_mode_display() if supplier_po.delivery_mode else 'Sea',
                                'method_of_payment': supplier_po.get_payment_term_display() if supplier_po.payment_term else ' ',
                                'terms_of_delivery': supplier_po.get_terms_of_delivery_display() if supplier_po.terms_of_delivery else ' ',
                                'prepared_by': supplier_po.prepared_by.first_name if supplier_po.prepared_by else ' ',
                                'checked_by': ' ',
                                'date': datetime.now().strftime('%d/%m/%Y'),
                                'pr_number': supplier_po.supplier_po_number,
                                'currency': CurrencyHelper.USD_CURRENCY,
                                'order_number': supplier_po.general_po_supplier.general_po.costing.order.display_number
                                }
        
        #ritz details
        plant = supplier_po.general_po_supplier.general_po.plant
        po_club = supplier_po.general_po_supplier.general_po.po_club

        po_nums = ''

        if po_club:
            pos = supplier_po.general_po_supplier.general_po.po_club.get_purchase_orders()
            if not plant and len(pos) > 0:
                plant = pos[0].plant
        ritz_details = {}
        if plant:
            detail_mapping = {
                'ritz_company_name': 'name',
                'ritz_attention': 'contact_person',
                'ritz_email': 'email',
                'ritz_contact_number': 'phone_number',
                'ritz_vat_reg_number': 'value_added_tax_registration_number',
                'ritz_svat_reg_number': 'simplified_value_added_tax_registration_number',
                'ritz_boi_registration_number': 'board_of_investment_registration_number',
                'ritz_warehouse_code': 'warehouse_code',
                'billing_location_name': 'billing_location_name',
                'billing_address_line_1': 'billing_address__address_line_1',
                'billing_address_line_2': 'billing_address__address_line_2',
                'billing_address_city': 'billing_address__city',
                'billing_address_country_name': 'billing_address__country__name',
                'billing_email': 'billing_email',
                'billing_phone_number': 'billing_phone_number'
            }
            ritz_details = {'ritz_address': plant.address.get_verbose_address() if plant else ' ', #TODO
                            **{key: get_attributes(plant, value) for key, value in detail_mapping.items()}
                            }
            if self.prepared_by:
                if self.prepared_by.email:
                    ritz_details['ritz_email'] = self.prepared_by.email if self.prepared_by else ' '
        
        if po_club:
            for po in pos:
                po_nums += ', ' + po.name
            po_nums = po_nums.strip(', ')
            general_information['po_number'] = po_nums
        # general_information['currency'] = 'USD' #TODO

        #table data
        materials = supplier_data['materials']
        # print(materials)
        table_data, total_value, total_value_after_discount, delivery_instructions = self.get_table_data(materials, supplier_po)
        total_value = round(total_value,2)
        total_value_after_discount = round(total_value_after_discount, 2)
        general_information['total'] = total_value
        general_information['grand_total'] = total_value_after_discount
        general_information['total_after_discount'] = total_value_after_discount
        discount = (total_value - total_value_after_discount)*100/total_value if total_value > 0 else 0
        discount = round(discount, 2)
        general_information['discount'] = discount
        organized_data = {
            'supplier_details': supplier_details,
            'ritz_details': ritz_details,
            'general_information': general_information,
            'table_data': self.get_table_merged_data(table_data),
            'delivery_instructions': delivery_instructions,
            'remarks': remarks
        }
        supplier_po.total_price = total_value_after_discount
        supplier_po.total_price_currency = CurrencyHelper.USD_CURRENCY
        supplier_po.save()
        return organized_data


    def create_po_file(self, supplier_po, supplier_delivery_date_quantity_data):
        po_topic = 'Purchase Order'
        if supplier_po.general_po_supplier.po_type == GeneralPOSupplier.GREIGE_PO_TYPE:
            po_topic = 'Purchase Request'

        supplier_data = {'supplier_object': supplier_po.general_po_supplier.supplier,
                         'supplier_id': supplier_po.general_po_supplier.supplier.id,
                         'supplier_po_object': supplier_po,
                         'materials': supplier_delivery_date_quantity_data}
        organized_data = self.get_organized_data(supplier_data)
        organized_data['po_topic'] = po_topic
        with NamedTemporaryFile(mode='w+', suffix='.pdf', delete=False) as tmp:
            tmp_po_wise = NamedTemporaryFile(mode='w+', suffix='.pdf', delete=False)
            try:
                pdf = pisa.CreatePDF(
                    StringIO(render_to_string(self.template, organized_data)),
                    FileIO(tmp.name, "wb"),
                )
                pdf_po_wise = pisa.CreatePDF(
                    StringIO(render_to_string(self.template_with_po_wise, organized_data)),
                    FileIO(tmp_po_wise.name, "wb"),
                )

                #without po wise
                file = open(tmp.name, mode='rb')
                if self.po_club:
                    save_path = 'supplier_pos/%s' % (str(self.po_club.display_number), )
                elif self.general_po:
                    save_path = 'general_supplier_pos/%s' % (str(self.general_po.display_number), )
                else:
                    save_path = 'supplier_pos'
                # file_name = tmp.name.split('\\')[-1]
                file_name = supplier_po.get_supplier_po_file_name()
                saved_file = handle_uploaded_file(file, save_path, file_name) #, 'Supplier PO - %s.xlsx' % (str(supplier.name)))
                file.close()
                file_attachment = FileAttachment.objects.create(display_name='Ritz Supplier PO', type='.pdf',
                                                                file_path=saved_file)
                supplier_po.set_new_supplier_po_file(file_attachment)

                #with po wise
                file_po_wise = open(tmp_po_wise.name, mode='rb')
                file_name_po_wise = supplier_po.get_supplier_po_file_po_wise_name()
                saved_file_po_wise = handle_uploaded_file(file_po_wise, save_path, file_name_po_wise)
                file_po_wise.close()
                file_attachment_po_wise = FileAttachment.objects.create(display_name='Ritz Supplier PO With PO Wise Breakdown', type='.pdf',
                                                                file_path=saved_file_po_wise)
                supplier_po.supplier_po_file_with_po_wise_breakdown = file_attachment_po_wise

                supplier_po.state = supplier_po.DRAFT_STATE
                discount = organized_data['general_information']['discount']
                if supplier_po.discount == 0 and discount > 0:
                    supplier_po.discount = discount
                supplier_po.save()
                print(file_attachment.file_path)
            except IOError:
                print(IOError.errno)
                pass
    
    # def get_general_po_supplier_material_quantities(self, supplier_delivery_date_quantity_data):
    #     return list(set([supplier_delivery_date_quantity_element.supplier_delivery_date_quantity.general_po_material_quantity
    #             for supplier_delivery_date_quantity_element in supplier_delivery_date_quantity_data]))

    def get_merged_supplier_delivery_date_quantity_data(self, supplier_delivery_date_quantity_data, supplier_po):
        merged_supplier_delivery_date_quantity_data = None
        supplier_po_general_po_material_quantities = supplier_po.supplierpogeneralpomaterialquantity_set.all().values_list('general_po_material_quantity', flat=True)
        general_po = supplier_po.general_po_supplier.general_po
        if supplier_po_general_po_material_quantities.exists():
            supplier_delivery_date_quantity_data_ids = supplier_delivery_date_quantity_data.values_list('id', flat=True)
            supplier_po_supplier_delivery_date_quantity_data_ids = SupplierDeliveryDateQuantityPOAllocation.objects.filter(supplier_delivery_date_quantity__general_po_material_quantity__general_po=general_po,
                                                                                                      supplier_delivery_date_quantity__general_po_material_quantity__in=supplier_po_general_po_material_quantities).values_list('id', flat=True)
            supplier_delivery_date_quantity_data_ids = [*supplier_delivery_date_quantity_data_ids, *supplier_po_supplier_delivery_date_quantity_data_ids]
            supplier_delivery_date_quantity_data_ids = list(set(supplier_delivery_date_quantity_data_ids))
            merged_supplier_delivery_date_quantity_data = SupplierDeliveryDateQuantityPOAllocation.objects.filter(pk__in=supplier_delivery_date_quantity_data_ids)
        else:
            merged_supplier_delivery_date_quantity_data = supplier_delivery_date_quantity_data
        merged_supplier_delivery_date_quantity_data = merged_supplier_delivery_date_quantity_data
        return merged_supplier_delivery_date_quantity_data

    def get_generated_supplier_pos(self, supplier):
        has_generated_supplier_po = False
        generated_supplier_pos = []
        supplier_po_general_po_material_quantities = SupplierPOGeneralPOMaterialQuantity.objects.filter(supplier_po__state__in=[SupplierPO.DRAFT_STATE],
                                                                                                        supplier_po__general_po_supplier__supplier=supplier)
        if supplier_po_general_po_material_quantities.exists():
            has_generated_supplier_po = True
            generated_supplier_pos = [supplier_po_general_po_material_quantity.supplier_po for supplier_po_general_po_material_quantity in supplier_po_general_po_material_quantities]    
        return has_generated_supplier_po, list(set(generated_supplier_pos))
    
    def create_supplier_po(self, general_po, supplier, general_po_material_quantity_ids):
        # general_po_supplier, created = GeneralPOSupplier.objects.get_or_create(supplier=supplier,
        #                                                        general_po=general_po)
        general_po_suppliers = GeneralPOSupplier.objects.filter(
            supplier=supplier,
            general_po=general_po,
            supplierpo__isnull=True
        )
        if general_po_suppliers.exists():
            general_po_supplier = general_po_suppliers.first()
        else:
            general_po_supplier = GeneralPOSupplier.objects.create(
                general_po=general_po,
                supplier=supplier
            )
            self.change_general_po_supplier(general_po_supplier, general_po_material_quantity_ids)
        supplier_po = SupplierPO.objects.create(general_po_supplier=general_po_supplier)
        general_po = general_po_supplier.general_po
        supplier = general_po_supplier.supplier
        supplier_po.set_supplier_po_number()
        supplier_po.prepared_by = self.prepared_by
        plant = self.po_club.get_purchase_orders()[0].plant ##################
        supplier_po.plant = plant
        # if general_po.plant:
        if plant:
            for attribute in ['email', 'phone_number', 'contact_person', 'value_added_tax_registration_number',
                                'simplified_value_added_tax_registration_number', 'board_of_investment_registration_number']:
                setattr(supplier_po, attribute, getattr(plant, attribute))  ###################
        for attribute in [('delivery_mode', 'shipping_mode'),
                            ('payment_term', 'payment_term'),
                            ('terms_of_delivery', 'costing_mode')]:
            setattr(supplier_po, attribute[0], getattr(supplier, attribute[1]))
        pos = self.po_club.get_purchase_orders()
        if pos:
            supplier_po.customer = pos[0].customer
        supplier_po.save()
        return supplier_po

    def get_supplier_po(self, supplier, general_po, supplier_general_po_material_quantity_details, combined: bool=False):
        has_generated_supplier_po, generated_supplier_pos = self.get_generated_supplier_pos(supplier)
        supplier_po_details = []

        if combined:
            if has_generated_supplier_po and len(generated_supplier_pos) == 1:
                supplier_po_details.append({
                    'supplier_po': generated_supplier_pos[0],
                    'general_po_material_quantity_ids': [data.get('id') for data in supplier_general_po_material_quantity_details]
                })
                
            elif has_generated_supplier_po and len(generated_supplier_pos) > 1:
                for generated_supplier_po in generated_supplier_pos:
                    supplier_po_detail = {
                        'supplier_po': generated_supplier_po,
                        'general_po_material_quantity_ids': []
                    }
                    for supplier_general_po_material_quantity_detail in supplier_general_po_material_quantity_details:
                        if generated_supplier_po.id == supplier_general_po_material_quantity_detail.get('combine_supplier_po_id', None):
                            supplier_po_detail['general_po_material_quantity_ids'].append(supplier_general_po_material_quantity_detail.get('id'))
                    supplier_po_details.append(supplier_po_detail)
            elif not has_generated_supplier_po:
                general_po_material_quantity_ids = [data.get('id') for data in supplier_general_po_material_quantity_details]
                supplier_po = self.create_supplier_po(general_po, supplier, general_po_material_quantity_ids)
                supplier_po_details.append({
                    'supplier_po': supplier_po,
                    'general_po_material_quantity_ids': general_po_material_quantity_ids
                })        
        else:
            general_po_material_quantity_ids = [data.get('id') for data in supplier_general_po_material_quantity_details]
            supplier_po = self.create_supplier_po(general_po, supplier, general_po_material_quantity_ids)
            supplier_po_details.append({
                    'supplier_po': supplier_po,
                    'general_po_material_quantity_ids': general_po_material_quantity_ids
                })
        return supplier_po_details
    
    def change_general_po_supplier_in_material_supplier(self, new_general_po_supplier, supplier_delivery_date_quantities):
        supplier_delivery_dates = []
        for supplier_delivery_date_quantity in supplier_delivery_date_quantities:
            material_supplier = supplier_delivery_date_quantity.material_supplier
            material_supplier.general_po_supplier = new_general_po_supplier
            material_supplier.save()
            supplier_delivery_dates.append(supplier_delivery_date_quantity.supplier_delivery_date)
        return list(set(supplier_delivery_dates))
    
    def create_new_supplier_delivery_date(self, new_general_po_supplier, old_supplier_delivery_date):
        copy_fields = ['confirmed_delivery_date', 'transport_tracking', 'last_ex_mill_date', 'supplier_port', 'transport_method']
        return SupplierDeliveryDate.objects.create(
            general_po_supplier=new_general_po_supplier,
            **{
                copy_field: getattr(old_supplier_delivery_date, copy_field)
                for copy_field in copy_fields
            }
        )
    
    def change_supplier_delivery_date_in_supplier_delivery_date_quantity(self, new_supplier_delivery_date, supplier_delivery_date_quantities):

        for supplier_delivery_date_quantity in supplier_delivery_date_quantities:
            supplier_delivery_date_quantity.supplier_delivery_date = new_supplier_delivery_date
            supplier_delivery_date_quantity.save()
    
    def change_general_po_supplier_or_create_supplier_delivery_date(self, new_general_po_supplier, supplier_delivery_dates, supplier_delivery_date_quantity_ids):
        for supplier_delivery_date in supplier_delivery_dates:
            supplier_delivery_date_quantities = supplier_delivery_date.supplierdeliverydatequantity_set.all()
            if supplier_delivery_date_quantities.exclude(id__in=supplier_delivery_date_quantity_ids).exists():
                new_supplier_delivery_date = self.create_new_supplier_delivery_date(new_general_po_supplier, supplier_delivery_date)
                self.change_supplier_delivery_date_in_supplier_delivery_date_quantity(new_supplier_delivery_date,
                                                                                      supplier_delivery_date_quantities.filter(id__in=supplier_delivery_date_quantity_ids))
            else:
                supplier_delivery_date.general_po_supplier = new_general_po_supplier
                supplier_delivery_date.save()

    
    def change_general_po_supplier(self, new_general_po_supplier, general_po_material_quantity_ids):
        general_po_material_quantities = GeneralPOMaterialQuantity.objects.filter(id__in=general_po_material_quantity_ids)
        supplier_delivery_date_quantity_ids = []
        for general_po_material_quantity in general_po_material_quantities:
            supplier_delivery_date_quantity_ids.extend(
                general_po_material_quantity.supplierdeliverydatequantity_set.all().values_list('id', flat=True)
            )
        supplier_delivery_date_quantity_ids = list(set(supplier_delivery_date_quantity_ids))
        supplier_delivery_date_quantities = SupplierDeliveryDateQuantity.objects.filter(id__in=supplier_delivery_date_quantity_ids)
        supplier_delivery_dates = self.change_general_po_supplier_in_material_supplier(new_general_po_supplier, supplier_delivery_date_quantities)
        self.change_general_po_supplier_or_create_supplier_delivery_date(new_general_po_supplier, supplier_delivery_dates, supplier_delivery_date_quantity_ids)

    
    def update_supplier_po_material_data(self, supplier_po, supplier_delivery_date_quantity_data):

        general_po_material_quantities = list(set([supplier_delivery_date_quantity.supplier_delivery_date_quantity.general_po_material_quantity for supplier_delivery_date_quantity in supplier_delivery_date_quantity_data]))
        for general_po_material_quantity in general_po_material_quantities:
            supplier_po_general_po_material_quantity, created = SupplierPOGeneralPOMaterialQuantity.objects.get_or_create(
                general_po_material_quantity=general_po_material_quantity,
            )
            supplier_po_general_po_material_quantity.supplier_po = supplier_po
            supplier_po_general_po_material_quantity.save()        
    
    def get_quantity_data(self, general_po_material_quantity_details, general_po_material_quantity_id):
        quantity_data = {}
        for general_po_material_quantity_detail in general_po_material_quantity_details:
            if general_po_material_quantity_detail.get('id', None) == general_po_material_quantity_id:
                quantity_data = general_po_material_quantity_detail
                break
        return quantity_data

    def get_supplier_general_po_material_quantity_details(self, supplier_delivery_date_quantity_data, general_po_material_quantity_details):
        supplier_general_po_material_quantity_details = []
        for supplier_delivery_date_quantity_details in supplier_delivery_date_quantity_data:
            general_po_material_quantity_id = supplier_delivery_date_quantity_details.supplier_delivery_date_quantity.general_po_material_quantity.id
            quantity_data = self.get_quantity_data(general_po_material_quantity_details, general_po_material_quantity_id)
            if not quantity_data == {}:
                found = False
                for data in supplier_general_po_material_quantity_details:
                    if data.get('id', None) == general_po_material_quantity_id:
                        found = True
                        break
                if not found:
                    supplier_general_po_material_quantity_details.append(quantity_data)
        return supplier_general_po_material_quantity_details
    
    def validate_general_po_material_quantity_details(self, general_po_material_quantity_details):
        errors = []
        has_errors = False
        for general_po_material_quantity_detail in general_po_material_quantity_details:
            if get_object_or_none(SupplierPOGeneralPOMaterialQuantity, {'general_po_material_quantity__id': general_po_material_quantity_detail.get('id')}):
                errors.append({str(general_po_material_quantity_detail.get('id')): "this material has supplier po already"})
                has_errors = True
            else:
                errors.append({})
        return has_errors, errors

    def create_supplier_pos(self, general_po_material_quantity_details: list, combined: bool = False):
        general_po_material_quantity_ids = [detail['id'] for detail in general_po_material_quantity_details]
        general_po_material_quantities = GeneralPOMaterialQuantity.objects.filter(pk__in=general_po_material_quantity_ids, general_po__po_club=self.po_club)
        general_pos = [general_po_material_quantity.general_po for general_po_material_quantity in general_po_material_quantities]
        general_pos = list(set(general_pos))
        for general_po in general_pos:
            supplier_delivery_date_quantity = SupplierDeliveryDateQuantityPOAllocation.objects.filter(supplier_delivery_date_quantity__general_po_material_quantity__general_po=general_po,
                                                                                                      supplier_delivery_date_quantity__general_po_material_quantity__in=general_po_material_quantities)
            distinct_field = 'supplier_delivery_date_quantity__material_supplier__general_po_supplier__supplier'
            supplier_ids = supplier_delivery_date_quantity.distinct(distinct_field).values_list(distinct_field, flat=True)
            for supplier in Supplier.objects.filter(pk__in=supplier_ids):
                
                supplier_delivery_date_quantity_data = supplier_delivery_date_quantity.filter(**{distinct_field: supplier})
                supplier_general_po_material_quantity_details = self.get_supplier_general_po_material_quantity_details(supplier_delivery_date_quantity_data, general_po_material_quantity_details)
                supplier_po_details = self.get_supplier_po(supplier, general_po, supplier_general_po_material_quantity_details, combined)
                for supplier_po_detail in supplier_po_details:
                    supplier_po = supplier_po_detail.get('supplier_po')
                    delivery_date_quantity_data = supplier_delivery_date_quantity_data.filter(supplier_delivery_date_quantity__general_po_material_quantity__id__in=supplier_po_detail['general_po_material_quantity_ids'])
                    # if combined:
                    supplier_delivery_date_quantity_data = self.get_merged_supplier_delivery_date_quantity_data(delivery_date_quantity_data, supplier_po)
                    if supplier_po.state in [SupplierPO.DRAFT_STATE]:
                        self.update_supplier_po_material_data(supplier_po, supplier_delivery_date_quantity_data)
                        self.create_po_file(supplier_po=supplier_po,
                                            supplier_delivery_date_quantity_data=supplier_delivery_date_quantity_data)
                        general_po.state = general_po.READY_TO_SENT_PO


    def re_generate_supplier_po(self, supplier_po):
        general_po_material_quantity_ids = supplier_po.supplierpogeneralpomaterialquantity_set.all().values_list('general_po_material_quantity__id', flat=True)
        general_po = supplier_po.general_po_supplier.general_po
        supplier_delivery_date_quantity_po_allocations = SupplierDeliveryDateQuantityPOAllocation.objects.filter(supplier_delivery_date_quantity__general_po_material_quantity__general_po=general_po,
                                                                                                      supplier_delivery_date_quantity__general_po_material_quantity__id__in=general_po_material_quantity_ids)
        self.update_supplier_po_material_data(supplier_po, supplier_delivery_date_quantity_po_allocations)
        self.create_po_file(supplier_po, supplier_delivery_date_quantity_po_allocations)


class GeneralSupplierPOBOMGenerator(SupplierPOClubBOMGenerator):

    general_po = None
    template = 'general_supplier_po_template.html'

    def __init__(self, general_po):
        self.general_po = general_po

    def create_supplier_pos(self):
        supplier_delivery_date_quantity_data = SupplierDeliveryDateQuantity.objects.filter(general_po_material_quantity__general_po=self.general_po).exclude(supplier_delivery_date=None)
        distinct_field = 'material_supplier__general_po_supplier__supplier'
        supplier_ids = supplier_delivery_date_quantity_data.distinct(distinct_field).values_list(distinct_field, flat=True)
        for supplier in Supplier.objects.filter(pk__in=supplier_ids):
            general_po_supplier, created = GeneralPOSupplier.objects.get_or_create(supplier=supplier,
                                                                            general_po=self.general_po)
            supplier_po, created = SupplierPO.objects.get_or_create(general_po_supplier=general_po_supplier)
            if created:
                supplier_po.set_supplier_po_number()
                supplier_po.prepared_by = self.prepared_by
                supplier_po.save()
            elif self.prepared_by:
                    supplier_po.prepared_by = self.prepared_by
                    supplier_po.save()
            if supplier_po.state == SupplierPO.DRAFT_STATE:
                self.update_supplier_po_material_data(supplier_po, supplier_delivery_date_quantity_data.filter(**{distinct_field: supplier}))
                self.create_po_file(supplier_po=supplier_po,
                                    supplier_delivery_date_quantity_data=supplier_delivery_date_quantity_data.filter(**{distinct_field: supplier}))
                self.general_po.state = self.general_po.READY_TO_SENT_PO
    
    def update_supplier_po_material_data(self, supplier_po, supplier_delivery_date_quantity_data):

        general_po_material_quantities = list(set([supplier_delivery_date_quantity.general_po_material_quantity for supplier_delivery_date_quantity in supplier_delivery_date_quantity_data]))
        for general_po_material_quantity in general_po_material_quantities:
            supplier_po_general_po_material_quantity, created = SupplierPOGeneralPOMaterialQuantity.objects.get_or_create(
                general_po_material_quantity=general_po_material_quantity,
            )
            supplier_po_general_po_material_quantity.supplier_po = supplier_po
            supplier_po_general_po_material_quantity.save()

    def get_table_data(self, materials, supplier_po):
        delivery_instructions = {}
        total_value = 0
        total_value_after_discount = 0
        for supplier_delivery_date_quantity in materials:
            # proforma invoice data copying
            if not supplier_delivery_date_quantity.proforma_invoice_quantity:
                supplier_delivery_date_quantity.proforma_invoice_quantity_units = supplier_delivery_date_quantity.quantity_units
                supplier_delivery_date_quantity.proforma_invoice_quantity = supplier_delivery_date_quantity.quantity
                supplier_delivery_date_quantity.save()
            #
            #SupplierRequestedDeliveryDate creating
            if not supplier_delivery_date_quantity.requested_date:
                supplier_requested_delivery_date, created = SupplierRequestedDeliveryDate.objects.get_or_create(supplier_po=supplier_po,
                                                            requested_date=supplier_delivery_date_quantity.supplier_delivery_date.confirmed_delivery_date)
                supplier_delivery_date_quantity.requested_date = supplier_requested_delivery_date
                supplier_delivery_date_quantity.save()
            #
            material_type = supplier_delivery_date_quantity.general_po_material_quantity.material.material_type
            material_type_display = supplier_delivery_date_quantity.general_po_material_quantity.material.material_label

            item_code = supplier_delivery_date_quantity.general_po_material_quantity.material.display_number
            attributes = supplier_delivery_date_quantity.general_po_material_quantity.material.material_detail.generic_material.user_material.get_user_defined_material_fields()
            attribute_values = supplier_delivery_date_quantity.general_po_material_quantity.material.get_attributes()
            description = supplier_delivery_date_quantity.general_po_material_quantity.material.material_description
            if supplier_delivery_date_quantity.general_po_material_quantity.material.material_type == Material.FABRIC_MATERIAL:
                description += ' Width ' + str(round(supplier_delivery_date_quantity.material_supplier.supplier_inquiry_detail.cutting_width,2)) + ' ' + supplier_delivery_date_quantity.material_supplier.supplier_inquiry_detail.get_cutting_width_unit_display()
            delivery_date = ' '
            if supplier_delivery_date_quantity.supplier_delivery_date:
                if supplier_delivery_date_quantity.supplier_delivery_date.confirmed_delivery_date:
                    delivery_date = supplier_delivery_date_quantity.supplier_delivery_date.confirmed_delivery_date
            quantity = round(supplier_delivery_date_quantity.quantity,2)
            unit = supplier_delivery_date_quantity.get_quantity_units_display()
            unit_price = supplier_delivery_date_quantity.material_supplier.supplier_inquiry_detail.cost_per_unit
            costing_unit = supplier_delivery_date_quantity.material_supplier.supplier_inquiry_detail.get_costing_unit_display
            discount = supplier_delivery_date_quantity.material_supplier.discount
            discount_deduction = (100-discount)/100 if discount else 0
            if unit_price:
                unit_price = round(unit_price,2)
            value = supplier_delivery_date_quantity.calculate_quantity_price()
            if value:
                value = round(value, 2)
                value_after_discount = round(value - discount_deduction, 2)
                total_value += value
                total_value_after_discount += value_after_discount
            if not delivery_date in delivery_instructions:
                delivery_instructions[delivery_date] = {
                    'delivery_date': delivery_date,
                    'delivery_data': {}
                }
            if not item_code in delivery_instructions[delivery_date]['delivery_data']:
                delivery_instructions[delivery_date]['delivery_data'][item_code] = {
                    'item_code': item_code,
                    'material_type': material_type_display,
                    'item_data': {
                        'item_description': description,
                        'quantity': quantity,
                        'unit': unit,
                        'unit_price': unit_price,
                        'costing_unit': costing_unit,
                        'value': value,
                        'value_after_discount': value_after_discount,
                        'discount': discount
                    }
                }
            else:
                delivery_instructions[delivery_date]['delivery_data'][item_code]['item_data']['quantity'] += quantity
                delivery_instructions[delivery_date]['delivery_data'][item_code]['item_data']['value'] += value
                delivery_instructions[delivery_date]['delivery_data'][item_code]['item_data']['value_after_discount'] += value_after_discount
                delivery_instructions[delivery_date]['delivery_data'][item_code]['item_data']['value'] = round(delivery_instructions[delivery_date]['delivery_data'][item_code]['item_data']['value'], 2)
                delivery_instructions[delivery_date]['delivery_data'][item_code]['item_data']['value_after_discount'] = round(delivery_instructions[delivery_date]['delivery_data'][item_code]['item_data']['value_after_discount'], 2)
        return {}, total_value, total_value_after_discount, delivery_instructions