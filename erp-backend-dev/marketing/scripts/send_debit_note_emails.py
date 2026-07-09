from marketing.models import DebitNote, DebitNoteMaterial, DebitNoteMaterialDetail
from shared import email
from shared.utils import get_object_or_none
from tempfile import NamedTemporaryFile
from marketing.utils.aws_utils import handle_uploaded_file
from shared.models import FileAttachment
from io import StringIO, FileIO
from xhtml2pdf import pisa
from django.template.loader import render_to_string
from materials.models import Material

class SupplierDebitNote:

    def process_debit_note(self, debit_note_id):
        debit_note = get_object_or_none(DebitNote, {'pk': debit_note_id})
        debit_note_materials = DebitNoteMaterial.objects.filter(debit_note__id=debit_note_id)
        # supplier = debit_note.commercial_invoice.get_supplier_pos().supplier
        supplier_pos = debit_note.commercial_invoice.get_supplier_pos()
        if supplier_pos.exists():
            supplier = supplier_pos[0].general_po_supplier.supplier
        self.create_debit_note_pdf(debit_note_materials, supplier, debit_note)
            

    def create_debit_note_pdf(self, debite_note_materials, supplier, debit_note):
        data = {}
        supplier_details = {
            'supplier_name': supplier.name,
            'address': supplier.supplier_location.get_verbose_address(),
            'svat_number': '',
            'vat_number': '',
            'warehouse_code': '',
            'contact_number': supplier.phone_number,
            'contact_person': '',
            'email': supplier.email,
            'invoice': debit_note.commercial_invoice.supplier_invoice_number
        }
        company_details = {
            'name': 'Ritz Desing Center (pvt) Ltd.',
            'address': 'NO 536, Bauddaloka Mawatha, Colombo 08',
            'contact_number': '0117596808',
            'email': '',
            'vat_number': '',
            'svat_number': '',
            'boi_registration': '5268/24/02/2022',
            'warehouse_code': '7852680X72BK0100'
        }
        general_details = {
            'date': '',
            'debit_note_number': debit_note.display_number,
            'goods_return_location': {
                'name': 'Ritz Clothing Yapahuwa',
                'address': 'Anuradhapura Road, Uduweriya, Ambanpola',
                'contact_person': '',
                'contact_number': '',
                'email': ''
            }
        }
        material_data = {}
        headers = [
            # {'name': 'sao', 'display_name': 'Sale Order'},
            # {'name': 'buyer', 'display_name': 'Buyer'},
            # {'name': 'po_number', 'display_name': 'PO NO'},
            # {'name': 'item_code', 'display_name': 'Item Code'},
            {'name': 'item_description', 'display_name': 'Item Description', 'width': '30%'},
            # {'name': 'invoice_number', 'display_name': 'Invoice No'},
            {'name': 'packing_list_number', 'display_name': 'Packing List No', 'width': '20%'},
            # {'name': 'quantity_units_display', 'display_name': 'Unit Measurement', 'width': '15%'},
            # {'name': 'receive_quantity', 'display_name': 'Receive Qty', 'width': '10%'},
            # {'name': 'rejection_quantity', 'display_name': 'Rejection Qty', 'width': '10%'},
            {'name': 'quantity', 'display_name': 'Quantity', 'width': '20%'},
            {'name': 'value', 'display_name': 'Value', 'width': '20%'},
            {'name': 'reason', 'display_name': 'Reason', 'width': '10%'}
        ]
        for debit_note_material in debite_note_materials:
            material_type = debit_note_material.supplier_po_grn_material.grn_material.customer_brand_material.material_type
            supplier_po_grn_material = debit_note_material.supplier_po_grn_material
            if not material_type in material_data:
                material_data[material_type]={
                    'display_name': material_type.title(),
                    'data': [],
                    'headers': headers
                }
            purchase_orders = ''
            order = None
            sao = ''
            for po in supplier_po_grn_material.supplier_po_grn.supplier_po.po_club.get_purchase_orders():
                purchase_orders = purchase_orders + po.display_number
                order = po.costing_version.order
            if order:
                sao = order.display_number
                general_details['buyer'] = order.customer.name
            supplier_material = debit_note_material.supplier_po_grn_material.grn_material
            tolarance = supplier_po_grn_material.supplier_po_grn.supplier_po.get_material_excess_threshold(supplier_material)
            customer_brand_material = supplier_po_grn_material.grn_material.customer_brand_material
            material_attributes = customer_brand_material.get_attributes()
            item_discription = [
                {
                    'label': 'Item Code',
                    'value': customer_brand_material.display_number
                },
                {
                    'label': 'Reference Code',
                    'value': material_attributes['reference_code']
                }
            ]
            if material_type == Material.FABRIC_MATERIAL:
                item_discription.extend(
                    [
                        {
                            'label': 'GSM',
                            'value': material_attributes['fabric_gsm']
                        },
                        {
                            'label': 'Texture',
                            'value': material_attributes['fabric_texture_description_display_value']
                        },
                        {
                            'label': 'Composition',
                            'value': material_attributes['fabric_composition_display_value']
                        }
                    ]
                )
            # print(customer_brand_material.get_attributes())
            reason = debit_note_material.get_reason_display() if debit_note_material.reason else ''
            # print(debit_note_material.get_total_price())
            material_data[material_type]['data'].append({
                # 'sao': sao,
                # 'po_number': purchase_orders,
                'quantity': debit_note_material.get_total_quantity(),
                # 'quantity_unit': debit_note_material.get_total_quantity()['quantity_units_display'],
                # 'buyer': order.customer.name,
                'tolarance': str(tolarance) + ' %',
                # 'item_code' : customer_brand_material.display_number,
                'item_description': item_discription,
                'packing_list_number': supplier_po_grn_material.supplier_po_grn.supplier_pack_list.supplier_display_number,
                'value': debit_note_material.get_total_price(),
                'reason': reason,
            })
        data['supplier_details'] = supplier_details
        data['material_details'] = material_data
        data['company_details'] = company_details
        data['general_details'] = general_details
        with NamedTemporaryFile(mode='w+', suffix='.pdf', delete=False) as tmp:
                pdf = pisa.CreatePDF(
                    StringIO(render_to_string('debit_note_template.html', data)),
                    FileIO(tmp.name, "wb"),
                )

                file = open(tmp.name, mode='rb')
                save_path = 'debit_note/%s' % (str(debit_note.id), )
                file_name = tmp.name.split('\\')[-1]
                saved_file = handle_uploaded_file(file, save_path, file_name)
                file.close()
                file_attachment = FileAttachment.objects.create(display_name='Ritz Supplier Debit Note', type='.pdf',
                                                                file_path=saved_file)
                debit_note.attachment = file_attachment
                print(file_attachment.file_path)
                debit_note.save()

    def send_supplier_debit_note_email(self):
        debit_notes = DebitNote.objects.filter(status=DebitNote.READY_TO_SEND)
        for debit_note in debit_notes:
            supplier = debit_note.commercial_invoice.get_supplier_po().supplier
            cc_emails = []
            primary_contacts = supplier.get_supplier_contacts()
            for primary_contact in primary_contacts:
                cc_emails.append(primary_contact.email)
            to_emails = [supplier.email]
            email_body = 'Attached is an email containing Debit Note'
            email_subject = 'RITZ Clothing - Supplier Debit Note'
            attachment = {
                    'mime_type': 'pdf',
                    'path': debit_note.attachment.file_path
                }
            debit_note_email = email.send_email(
                to=to_emails, cc=cc_emails, subject=email_subject,
                body=email_body, attachments=[attachment],
            )