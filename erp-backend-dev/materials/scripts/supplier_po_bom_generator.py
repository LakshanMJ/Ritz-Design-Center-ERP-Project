from django.conf import settings
from tempfile import NamedTemporaryFile
# from openpyxl import load_workbook
# from openpyxl.cell import MergedCell
# from openpyxl.styles import Alignment, Border, Side

from marketing.models import ActualPOClub, SupplierBOMFile, SupplierPO, PurchaseOrderClubBomSupplier, SupplierRequestedDeliveryDate, ServicePO
from marketing.utils.aws_utils import handle_uploaded_file
from materials.models import CustomerBrandMaterial, UserDefinedMaterial, GenericMaterial, Material
from service_po.models import GeneralServicePO
from shared import email
from shared.models import Supplier, FileAttachment
# from PyPDF2 import PdfReader, PdfWriter
# from reportlab.pdfgen import canvas
# from reportlab.lib.pagesizes import A4
# from reportlab.lib.textsplit import stringWidth
import io
from datetime import datetime
from django.shortcuts import get_object_or_404
from io import StringIO, FileIO
from xhtml2pdf import pisa
from django.template.loader import render_to_string


class ActualPOBOMSupplierBOM:

    def send_supplier_boms(self):
        clubs = ActualPOClub.objects.filter(state=ActualPOClub.READY_TO_SEND_BOM_EMAIL)
        for club in clubs:
            supplier_pos = SupplierPO.objects.filter(po_club = club, state = SupplierPO.PENGING_EMAIL_STATE)
            for supplier_po in supplier_pos:
                cc_emails = []
                primary_contacts = supplier_po.supplier.get_supplier_contacts()
                for primary_contact in primary_contacts:
                    cc_emails.append(primary_contact.email)
                to_emails = [supplier_po.supplier.email]
                email_body = 'Attached is an email containing Purchase Orders. Please review the POs and reply with the PIs.\n\nThank you!'
                attachments = {
                    'mime_type': 'pdf',
                    'path': supplier_po.supplier_po_file.file_path
                }
                bom_file = email.send_email(
                    to=to_emails, cc=cc_emails, subject="RITZ Clothing - Supplier Purchase Order",
                    body=email_body, attachments=[attachments])
                supplier_po.state = supplier_po.EMAIL_SENT_STATE
                supplier_po.po_sent_date = datetime.now()
                supplier_po.save()
            club.move_to_next_state(ActualPOClub.BOM_EMAILS_SENT)

    def process_boms(self, club_id):
        club = get_object_or_404(ActualPOClub, id = club_id)
        if club:
            generator_supplier_pos = NewGenerateSupplierPOs(club)
            generator_supplier_pos.create_supplier_pos()


class NewGenerateSupplierPOs:

    def __init__(self, po_club, *args, **kwargs):
        self.po_club = po_club
        self.create_file_po_ids = []
    
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
                    for color in item_data['item_data']:
                        color_data = item_data['item_data'][color]
                        table_row['color'] = color_data['color']
                        table_row['color_rowspan'] = color_data['color_rowspan']
                        for color_row in color_data['color_data']:
                            if 'item_code' in table_row:
                                table_row['item_description'] = color_row['item_description']
                            table_row['delivery_date'] = color_row['delivery_date']
                            table_row['accepted_delivery_tolarance'] = color_row['accepted_delivery_tolarance']
                            table_row['delivery_split'] = color_row['delivery_split']
                            table_row['unit'] = color_row['unit']
                            table_row['unit_price'] = color_row['unit_price']
                            table_row['costing_unit'] = color_row['costing_unit']
                            table_row['value'] = color_row['value']
                            table_rows.append(table_row)
                            table_row = {}
        return table_rows

    def get_organized_data(self, supplier_data):
        organized_data = {}
        supplier_details = {}
        ritz_details = {}
        general_information = {}
        table_data = {}
        delivery_instructions = {}
        #supplier details
        supplier = supplier_data['supplier_object']
        supplier_details = {'supplier_object': supplier,
                            'supplier_company_name': supplier.name}
        if supplier.supplier_location:
            supplier_details['supplier_address'] = supplier.supplier_location.get_verbose_address()
        primary_contact = supplier.get_supplier_primary_contact()
        if primary_contact:
            supplier_details['supplier_attention']= primary_contact.name
            if not supplier_details['supplier_attention']:
                supplier_details['supplier_attention'] = ' '
        supplier_details['supplier_email']= supplier.email
        supplier_details['supplier_contact_number']= supplier.phone_number

        #general information
        pos = self.po_club.get_purchase_orders()
        general_information = {'customer': pos[0].customer if pos else ' ',
                                'style': pos[0].style_number if pos else ' ',
                                'delivery_mode': supplier.get_shipping_mode_display() or 'Sea',
                                'method_of_payment': supplier.get_payment_term_display(),
                                'order_number': pos[0].costing_version.order.display_number
                                }
        
        #ritz details
        plant = pos[0]
        ritz_details = {'ritz_company_name': plant.name if plant else ' ',
                        'ritz_address': plant.address.get_verbose_address() if plant else ' ', #TODO
                        'ritz_attention': plant.contact_person if plant.contact_person else ' ',
                        'ritz_email': plant.email if plant.email else ' ',
                        'ritz_contact_number': plant.phone_number if plant.phone_number else ' ',
                        'ritz_vat_reg_number': plant.value_added_tax_registration_number if plant.value_added_tax_registration_number else ' ',
                        'ritz_svat_reg_number': plant.simplified_value_added_tax_registration_number if plant.simplified_value_added_tax_registration_number else  ' ',
                        'ritz_boi_registration_number': plant.board_of_investment_registration_number if plant.board_of_investment_registration_number else ' ',
                        'ritz_warehouse_code': ' '
                        }
        
        po_nums = ''
        for po in pos:
            po_nums += ', ' + po.name
        po_nums = po_nums.strip(', ')
        general_information['po_number'] = po_nums
        general_information['currency'] = 'USD' #TODO

        #table data
        materials = supplier_data['materials']
        # print(materials)
        total_value = 0
        for material in materials:
            color_data = {}
            supplier_bom_object = material['supplier_bom_object']
            sao = supplier_bom_object.purchase_order_bom.purchase_order.costing_version.id#.ritz_code
            purchase_order_number = supplier_bom_object.purchase_order_bom.purchase_order.name
            item_code = supplier_bom_object.supplier_inquiry_detail.supplier_inquiry.customer_brand_material.verbose_reference_code
            attributes = supplier_bom_object.purchase_order_bom.material.material_detail.generic_material.user_material.get_user_defined_material_fields()
            attribute_values = supplier_bom_object.purchase_order_bom.material.get_attributes()
            description = []
            color = ' '
            for attribute in attributes:
                display_field = attribute.name + GenericMaterial.DROPDOWN_POSTFIX
                if display_field in attribute_values:
                    display_value = attribute_values.get(display_field, None)
                else:
                    display_value = attribute_values.get(attribute.name, None)
                if attribute.label == 'Color':
                    color = str(display_value)
                else:
                    description.append({'label': attribute.label, 'value': str(display_value)})
            if supplier_bom_object.purchase_order_bom.material.material_type == Material.FABRIC_MATERIAL:
                description.append({'label': 'Cutting width', 'value': str(round(supplier_bom_object.supplier_inquiry_detail.cutting_width,2)) + ' ' + supplier_bom_object.supplier_inquiry_detail.get_cutting_width_unit_display()})
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
                    'item_data': {}
                }
            table_data[sao]['sao_data'][purchase_order_number]['purchase_order_data'][item_code]['item_rowspan'] += 1
            if not color in table_data[sao]['sao_data'][purchase_order_number]['purchase_order_data'][item_code]['item_data']:
                table_data[sao]['sao_data'][purchase_order_number]['purchase_order_data'][item_code]['item_data'][color] = {
                    'color': color,
                    'color_rowspan': 0,
                    'color_data': []
                }
            table_data[sao]['sao_data'][purchase_order_number]['purchase_order_data'][item_code]['item_data'][color]['color_rowspan'] += 1
            delivery_date = ' '
            if supplier_bom_object.supplier_delivery_date:
                if supplier_bom_object.supplier_delivery_date.confirmed_delivery_date:
                    delivery_date = supplier_bom_object.supplier_delivery_date.confirmed_delivery_date
            quantity = round(supplier_bom_object.quantity,2)
            unit = supplier_bom_object.get_quantity_units_display()
            unit_price = supplier_bom_object.supplier_inquiry_detail.cost_per_unit
            costing_unit = supplier_bom_object.supplier_inquiry_detail.get_costing_unit_display
            if unit_price:
                unit_price = round(unit_price,2)
            value = supplier_bom_object.calculate_quantity_price()
            if value:
                value = round(value, 2)
                total_value += value
            color_data = {
                'item_description': description,
                'delivery_date': delivery_date,
                'accepted_delivery_tolarance': '5%', # Accepted tolerance TODO
                'delivery_split': str(quantity),
                'unit': unit,
                'unit_price': unit_price,
                'costing_unit': costing_unit,
                'value': value
            }
            if not delivery_date in delivery_instructions:
                delivery_instructions[delivery_date] = {
                    'delivery_date': delivery_date,
                    'delivery_data': {}
                }
            if not item_code in delivery_instructions[delivery_date]['delivery_data']:
                delivery_instructions[delivery_date]['delivery_data'][item_code] = {
                    'item_code': item_code,
                    'item_data': {}
                }
            if not color in delivery_instructions[delivery_date]['delivery_data'][item_code]['item_data']:
                delivery_instructions[delivery_date]['delivery_data'][item_code]['item_data'][color] = {
                    'color': color,
                    'color_data': {
                        'item_description': description,
                        'quantity': quantity,
                        'unit': unit,
                        'unit_price': unit_price,
                        'costing_unit': costing_unit,
                        'value': value
                    }
                }
            else:
                delivery_instructions[delivery_date]['delivery_data'][item_code]['item_data'][color]['color_data']['quantity'] += quantity
                delivery_instructions[delivery_date]['delivery_data'][item_code]['item_data'][color]['color_data']['value'] += value
                delivery_instructions[delivery_date]['delivery_data'][item_code]['item_data'][color]['color_data']['value'] = round(delivery_instructions[delivery_date]['delivery_data'][item_code]['item_data'][color]['color_data']['value'], 2)
            table_data[sao]['sao_data'][purchase_order_number]['purchase_order_data'][item_code]['item_data'][color]['color_data'].append(color_data)
        general_information['total'] = total_value
        organized_data = {
            'supplier_details': supplier_details,
            'ritz_details': ritz_details,
            'general_information': general_information,
            'table_data': self.get_table_merged_data(table_data),
            'delivery_instructions': delivery_instructions
        }
        return organized_data

    def create_po_files(self):
        supplier_pos = SupplierPO.objects.filter(id__in = self.create_file_po_ids)

        for supplier_po in supplier_pos:
            # po_boms = supplier_po.purchaseorderclubbomsupplier_set.all()
            po_boms = PurchaseOrderClubBomSupplier.objects.filter(supplier_delivery_date__supplier_po=supplier_po)
            supplier_data = {}
            for po_bom in po_boms:
                if not supplier_data:
                    supplier_data = {
                        'supplier_object': po_bom.supplier,
                        'supplier_id': po_bom.supplier_id,
                        'materials': [
                        ]
                    }

                supplier_data['materials'].append({
                    'quantity': po_bom.quantity,
                    'quantity_units': po_bom.get_quantity_units_display(),
                    'supplier_bom_object': po_bom
                })
            organized_data = self.get_organized_data(supplier_data)
            with NamedTemporaryFile(mode='w+', suffix='.pdf', delete=False) as tmp:
                try:
                    pdf = pisa.CreatePDF(
                        StringIO(render_to_string('supplier_po_template.html', organized_data)),
                        FileIO(tmp.name, "wb"),
                    )
                except:
                    pass

                file = open(tmp.name, mode='rb')
                save_path = 'supplier_pos/%s' % (str(self.po_club.display_number), )
                # file_name = tmp.name.split('\\')[-1]
                file_name = supplier_po.get_supplier_po_file_name()
                saved_file = handle_uploaded_file(file, save_path, file_name) #, 'Supplier PO - %s.xlsx' % (str(supplier.name)))
                file.close()
                file_attachment = FileAttachment.objects.create(display_name='Ritz Supplier PO', type='.pdf',
                                                                file_path=saved_file)
                supplier_po.supplier_po_file = file_attachment
                supplier_po.state = supplier_po.PENGING_EMAIL_STATE
                supplier_po.save()
                # print(supplier_po.supplier_po_file.file_path)


    def create_supplier_pos(self):
        po_boms = PurchaseOrderClubBomSupplier.objects.filter(
            purchase_order_bom__purchase_order__actual_po_club=self.po_club
        )
        supplier_po_ids = []
        # TODO major - this will overwrite supplier POs
        for po_bom in po_boms:
            #print(po_bom.supplier_po)
            if po_bom.supplier_delivery_date and po_bom.supplier_delivery_date.supplier_po:
                supplier_po_ids.append(po_bom.supplier_delivery_date.supplier_po.id) # TODO - keep history of old files
            po_bom.supplier_po = None
            po_bom.save()
        SupplierPO.objects.filter(pk__in=supplier_po_ids).delete()

        for po_bom in po_boms:
            if not po_bom.supplier_po:
                supplier_po, created = SupplierPO.objects.get_or_create(
                    po_club=self.po_club,
                    supplier=po_bom.supplier,
                    state = SupplierPO.DRAFT_STATE
                )
                supplier_requested_delivery_date, created = SupplierRequestedDeliveryDate.objects.get_or_create(
                        requested_date=po_bom.supplier_delivery_date.confirmed_delivery_date,
                        supplier_po=supplier_po
                    )
                po_bom.requested_date = supplier_requested_delivery_date
                if created:
                    supplier_po.set_supplier_po_number()
                    supplier_po.plant = self.po_club.plant
                    if self.po_club.plant:
                        for attribute in ['email', 'phone_number', 'contact_person', 'value_added_tax_registration_number',
                                          'simplified_value_added_tax_registration_number', 'board_of_investment_registration_number']:
                            setattr(supplier_po, attribute, getattr(self.po_club.plant, attribute))
                    for attribute in [('delivery_mode', 'shipping_mode'),
                                      ('payment_term', 'payment_term'),
                                      ('terms_of_delivery', 'costing_mode')]:
                        setattr(supplier_po, attribute[0], getattr(po_bom.supplier, attribute[1]))
                    pos = self.po_club.get_purchase_orders()
                    if pos:
                        supplier_po.customer = pos[0].customer
                po_bom.save()
                self.create_file_po_ids.append(supplier_po.pk)
                if po_bom.supplier_delivery_date:
                    supplier_delivery_date = po_bom.supplier_delivery_date
                    supplier_delivery_date.supplier_po = supplier_po
                    supplier_delivery_date.save()
                po_bom.supplier_po = supplier_po
                po_bom.save()
        self.create_po_files()