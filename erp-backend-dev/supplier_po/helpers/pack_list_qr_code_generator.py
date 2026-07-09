from marketing.models import PurchaseOrder
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from django.http import HttpResponse
import qrcode
import os
import io

class PackListQRGenerator():

    qr_detail_font_size = 7
    qr_detail_row_height = 10
      
    def __init__(self, grn_material):
        super().__init__()
        self.grn_material = grn_material
        self.po = PurchaseOrder.objects.filter(actual_po_club=grn_material.supplier_po_grn.supplier_po.po_club)[0]

    def draw_qr_details(self, canvas, material_detail, offset_x=0):

        details = {
            'PO Club': self.po.actual_po_club.display_number,
            'Length': f'{material_detail.indicated_quantity} {material_detail.get_indicated_quantity_units_display()}',
            # 'Shade': material_detail.shade.shade if material_detail.shade else "", # Shade is not inspected at the QR code pasting at with measuring in GRN
            'Width': f'{material_detail.fabricgrndetail.indicated_width} {material_detail.fabricgrndetail.get_indicated_width_units_display()}',
            'Style': self.po.costing_version.order.style_number,
            'Color': material_detail.supplier_po_grn_material.grn_material.customer_brand_material.get_attributes().get('fabric_color', '')
        }
        side_details = {
            'Roll': material_detail.fabricgrndetail.pack_number,
            'Batch': material_detail.batch_number.batch_number,
            'Item Code': material_detail.supplier_po_grn_material.grn_material.customer_brand_material.reference_code
        }

        y = 70
        for label, value in details.items():
            x = 8 + offset_x
            canvas.setFont("Courier", self.qr_detail_font_size)
            canvas.drawString(x, y, label)
            x += 30 if label in ['PO Club'] else 25
            canvas.drawString(x, y, ':')
            x += 5
            canvas.setFont("Courier-Bold", self.qr_detail_font_size)
            if isinstance(value, str) and len(value) > 20:
                max_length = 24
                lines = [value[i:i+max_length] for i in range(0, len(value), max_length)]
                for line in lines:
                    canvas.drawString(x, y, line)
                    y -= self.qr_detail_row_height
            else:
                canvas.drawString(x, y, str(value))
            y -= self.qr_detail_row_height
        
        y = 130
        for label, value in side_details.items():
            x = 70 + offset_x
            canvas.setFont("Courier", self.qr_detail_font_size)
            canvas.drawString(x, y, label)
            canvas.setFont("Courier-Bold", self.qr_detail_font_size)
            y -= self.qr_detail_font_size
            canvas.drawString(x, y, value)
            y -= self.qr_detail_row_height

    def set_location_one_text(self, material_detail, canvas):
        
        if hasattr(material_detail, 'fabricgrndetail'):
            self.draw_qr_details(canvas, material_detail)
        
    def set_location_two_text(self, material_detail, canvas):
        if hasattr(material_detail, 'fabricgrndetail'):
            self.draw_qr_details(canvas, material_detail, 145)

    def process_qr(self):
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=(4*inch, 2*inch))

        qr_size = 1 * inch
        margin_x = 0 * inch
        margin_y = 0 * inch
        x, y = margin_x, 1 * inch

        for i, code in enumerate(self.grn_material.supplierpogrnmaterialdetail_set.all()):
            qr = qrcode.make(code.barcode)
            qr_path = f"qr_code_{i}.png"
            qr.save(qr_path)

            p.drawInlineImage(qr_path, x, y, width=qr_size, height=qr_size)

            x += qr_size + 1 * inch
            if (i + 1) % 2 == 0: 
                self.set_location_two_text(code, p)
                x = margin_x
                y = 1 * inch
                p.showPage()
            else:
                self.set_location_one_text(code, p)
            os.remove(qr_path)
        
        p.save()
        buffer.seek(0)
        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="qrcode.pdf"'
        return response
    