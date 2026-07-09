from datetime import datetime
from io import BytesIO
from tempfile import NamedTemporaryFile
from reportlab.pdfgen.canvas import Canvas
from PyPDF2 import PdfReader, PdfWriter
from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from marketing.utils.aws_utils import handle_file_read, handle_uploaded_file
from shared.models import Approval, BaseAbstractModel, Supplier, FileAttachment
from finance.models import OutgoingPayment
from materials.fieldmetadata.measuring_unit_helpers import MaterialUnitHelper, PerMeasuringUnitHelper
from shared.helpers.currency_helper import CurrencyHelper
from shared.models import PAYMENT_METHOD_TYPES, Plant
import fitz


class GeneralServicePO(BaseAbstractModel):
	po_club = models.ForeignKey('marketing.ActualPOClub', on_delete=models.CASCADE)
	
	DRAFT = 'draft'
	QUANTITY_VERIFICATION = 'quantity_verification'
	READY_TO_SENT_PO = 'ready_to_sent_po'
	PO_SENT = 'po_sent'
	CLOSED = 'closed'
	CANCELED = 'canceled'
	
	STATE_CHOICES = (
        (DRAFT, 'Draft'),
        (QUANTITY_VERIFICATION, 'Quantity Verification'),
        (READY_TO_SENT_PO, 'Ready to sent PO'),
        (PO_SENT, 'PO Sent'),
        (CLOSED, 'Closed'),
        (CANCELED, 'Canceled'),
    )
	state = models.CharField(max_length=100, choices=STATE_CHOICES, null=True)



class GeneralServicePOSupplier(BaseAbstractModel):
	supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE)
	general_service_po  = models.ForeignKey(GeneralServicePO, on_delete=models.CASCADE)
	service_po = models.ForeignKey('ServicePO', on_delete=models.SET_NULL, null=True)
	discount = models.FloatField(null=True)
	payment_term = models.CharField(choices=PAYMENT_METHOD_TYPES, max_length=100, default=None, null=True)

	@property
	def pay_mode(self):
		general_service_po_supplier_price = self.generalserviceposupplierprice_set.first()
		if general_service_po_supplier_price:
			return general_service_po_supplier_price.supplier_inquiry_detail.pay_mode
		return None


class GeneralServicePOSupplierPrice(BaseAbstractModel):
	general_service_po_supplier = models.ForeignKey(GeneralServicePOSupplier, on_delete=models.CASCADE)
	supplier_inquiry_detail = models.ForeignKey('materials.SupplierInquiryDetail', on_delete=models.SET_NULL, null=True)
	entity_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
	entity_id = models.PositiveIntegerField()
	entity = GenericForeignKey('entity_type', 'entity_id')
	service_detail = models.JSONField()
	price = models.FloatField(null=True)
	price_currency = models.CharField(max_length=100, choices=CurrencyHelper.CURRENCY_CHOICES, default=CurrencyHelper.USD_CURRENCY)
	lead_time = models.IntegerField(null=True)
	costing_price = models.FloatField(null=True)
	costing_price_units = models.CharField(max_length=100, choices=CurrencyHelper.CURRENCY_CHOICES, default=CurrencyHelper.USD_CURRENCY)

	def get_entity(self):
		return self.entity
	
	@property
	def po_pack_item_wash_service(self):
		from marketing.models import POPackItemWashService
		return self.entity if isinstance(self.entity, POPackItemWashService) else None
	
	@property
	def po_pack_item_embellishment_service(self):
		from marketing.models import POPackItemEmbellishmentService
		return self.entity if isinstance(self.entity, POPackItemEmbellishmentService) else None
	
	@property
	def other_cost_type(self):
		from marketing.models import OtherCostType
		return self.entity if isinstance(self.entity, OtherCostType) else None
	

# Both models are needed to track diffrent suppliers
class  GeneralServicePOService(BaseAbstractModel):
	# general_service_po_supplier = models.ForeignKey(GeneralServicePOSupplier, on_delete=models.CASCADE)
	general_service_po = models.ForeignKey(GeneralServicePO, on_delete=models.CASCADE)
	entity_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
	entity_id = models.PositiveIntegerField()
	entity = GenericForeignKey('entity_type', 'entity_id')
	service_detail = models.JSONField()
	completed = models.BooleanField(default=False)
	# supplier_inquiry_detail = models.ForeignKey('materials.SupplierInquiryDetail', on_delete=models.SET_NULL, null=True)
	# price = models.FloatField(null=True)
	# price_currency = models.CharField(max_length=100, choices=CurrencyHelper.CURRENCY_CHOICES, default=CurrencyHelper.USD_CURRENCY)
	# lead_time = models.IntegerField(null=True)
	# costing_price = models.FloatField(null=True)
	# costing_price_units = models.CharField(max_length=100, choices=CurrencyHelper.CURRENCY_CHOICES, default=CurrencyHelper.USD_CURRENCY)

	def get_entity(self):
		return self.entity
	
	@property
	def po_pack_item_wash_service(self):
		from marketing.models import POPackItemWashService
		return self.entity if isinstance(self.entity, POPackItemWashService) else None
	
	@property
	def po_pack_item_embellishment_service(self):
		from marketing.models import POPackItemEmbellishmentService
		return self.entity if isinstance(self.entity, POPackItemEmbellishmentService) else None
	
	@property
	def quantity(self):
		from marketing.models import POPackItemWashService, POPackItemEmbellishmentService
		quantity = 0
		entity = self.get_entity()
		if isinstance(entity, POPackItemWashService) or isinstance(entity, POPackItemEmbellishmentService):
			quantity = entity.po_pack_item.po_pack.quantity
		return quantity


class GeneralServicePOServiceDelivery(BaseAbstractModel):
	general_service_po_service = models.ForeignKey(GeneralServicePOService, on_delete=models.CASCADE)
	general_service_po_supplier_price = models.ForeignKey(GeneralServicePOSupplierPrice, on_delete=models.CASCADE)
	planned_send_date = models.DateField(null=True)
	planned_send_quantity = models.FloatField()
	planned_send_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
	actual_send_date = models.DateField(null=True)
	actual_send_date_quantity = models.FloatField(null=True)
	actual_send_date_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)

	def get_planned_send_quantity_from_po_allocations(self):
		po_allocations = self.generalservicepodeliverypoallocation_set.all()
		total_quantity = 0
		for allocation in po_allocations:
			if allocation.quantity:
				total_quantity += allocation.quantity
		return total_quantity


class GeneralServicePODeliveryPOAllocation(BaseAbstractModel):
	general_service_po_service_delivery = models.ForeignKey(GeneralServicePOServiceDelivery, on_delete=models.CASCADE)
	purchase_order = models.ForeignKey('marketing.PurchaseOrder', on_delete=models.CASCADE)
	quantity = models.FloatField(null=True)
	quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)

	def calculate_quantity_price(self):
		total_cost = 0
		if self.general_service_po_service_delivery.general_service_po_supplier_price:
			cost_per_unit = self.general_service_po_service_delivery.general_service_po_supplier_price.price
			costing_units = self.general_service_po_service_delivery.general_service_po_supplier_price.price_currency
			quantity = self.quantity
			total_cost = float(quantity) * float(cost_per_unit)
			total_cost = round(total_cost, 2)
			return total_cost
	
	
class ServicePO(BaseAbstractModel):
	service_po_supplier = models.OneToOneField(GeneralServicePOSupplier, on_delete=models.CASCADE)
	service_po_file = models.ForeignKey(FileAttachment, on_delete=models.SET_NULL, null=True)
	service_po_history_files = models.ManyToManyField(FileAttachment, related_name='service_po_history_files')
	total_price = models.FloatField()
	total_price_currency = models.CharField(max_length=100, choices=CurrencyHelper.CURRENCY_CHOICES, default=CurrencyHelper.USD_CURRENCY)
	advance_payment = models.FloatField(null=True)
	advance_payment_currency = models.CharField(max_length=100, choices=CurrencyHelper.CURRENCY_CHOICES, default=CurrencyHelper.USD_CURRENCY)
	advance_payment_due_date = models.DateField(null=True)
	advance_payment_outgoing_payment = models.ForeignKey(OutgoingPayment, on_delete=models.SET_NULL, null=True)
	
	DRAFT_STATE = 'draft'
	PENDING_EMAIL_STATE = 'pending_email'
	EMAIL_SENT_STATE = 'email_sent'
	COMPLETE_STATE = 'complete'
	CANCEL_STATE = 'cancel'
	REJECTED_STATE = 'rejected'
	
	STATE_OPTIONS = (
        (DRAFT_STATE, 'Draft'),
        (PENDING_EMAIL_STATE, 'Pending Email'),
        (EMAIL_SENT_STATE, 'Email Sent'),
        (COMPLETE_STATE, 'Complete'),
        (CANCEL_STATE, 'Cancel'),
		(REJECTED_STATE, 'Rejected')
    )
	state = models.CharField(max_length=200, choices=STATE_OPTIONS, default=DRAFT_STATE)

	po_sent_date = models.DateTimeField(null=True)
	proforma_invoice_date = models.DateField(null=True)
	plant = models.ForeignKey(Plant, on_delete=models.CASCADE, null=True)
	email = models.CharField(max_length=500, blank=True)
	phone_number = models.CharField(max_length=20, blank=True)
	contact_person = models.CharField(max_length=200, null=True)

	customer = models.ForeignKey('shared.Customer', on_delete=models.SET_NULL, null=True)
	payment_term = models.CharField(max_length=20, choices=PAYMENT_METHOD_TYPES, null=True)

    #VAT Reg No
	value_added_tax_registration_number = models.CharField(max_length=200, blank=True)
	#SVAT Reg No
	simplified_value_added_tax_registration_number = models.CharField(max_length=200, blank=True)
	#BOI Reg No
	board_of_investment_registration_number = models.CharField(max_length=200, blank=True)

	prepared_by = models.ForeignKey('shared.User', on_delete=models.SET_NULL, null=True, related_name='service_po_prepared_by')
	checked_by = models.ForeignKey('shared.User', on_delete=models.SET_NULL, null=True, related_name='service_po_checked_by')

	@property
	def display_number(self):
		return f"SO-{self.id:06}"
	@property
	def po_club(self):
		return self.service_po_supplier.general_service_po.po_club
	
	def get_service_po_file_name(self):
		str_date = datetime.today().strftime('%Y-%m-%d')
		file_name = self.display_number + f"_{str_date}.pdf"
		return file_name
	
	def get_service_po_file_name(self):
		str_date = datetime.today().strftime('%Y-%m-%d')
		file_name = f'SO-{self.id:06}_{str_date}.pdf'
		return file_name
	
	def set_new_service_po_file(self, file: FileAttachment):
		if file:
			if self.service_po_file:
				self.service_po_history_files.add(self.service_po_file.id)
			self.service_po_file = file
			self.save()

	def create_approval(self, users, action_user, approval):
		from shared.approvals.utils import ApprovalUtils
		from shared.approvals.constants.task_entities import SERVICE_PO_ENTITY
		from shared.approvals.constants.approval_choices import get_approval_display_value
		approval_entity_data = []
		approval_entity_data.append({
			'entity_id': self.id,
			'entity_name': SERVICE_PO_ENTITY
		})
		approval_display_value = get_approval_display_value(approval)
		ApprovalUtils.assign_approval(users, action_user, approval_entity_data, approval, approval_display_value)
		return True
	
	def get_text_position_in_pdf(self, text: str, pdf_page: fitz.Page, page_height=None):
		found = False
		x0 = None
		y0 = None
		x1 = None
		y1 = None
		for word in pdf_page.get_text("words"):
			x0, y0, x1, y1, found_text, *_ = word
			if found_text == text:
				if page_height:
					y0 = page_height - y0
					y1 = page_height - y1
				found = True
				break
		return found, ((x0, y0), (x1, y1))

	
	def set_approval(self, approval_status):
		if self.service_po_file:
			service_po_pdf_file_path_url = self.service_po_file.file_path
			file_path = handle_file_read(service_po_pdf_file_path_url)
			position_doc = fitz.open(file_path)
			position_doc_page = position_doc[0]
			checked_by = self.checked_by.first_name if self.checked_by else ' '
			with open(file_path, "rb") as original_file:
				original_pdf = PdfReader(original_file)
				packet = BytesIO()
				service_po_po_pdf_file = Canvas(packet)
				page_height = float(original_pdf.pages[0].mediabox.height)
				found, position = self.get_text_position_in_pdf('Checked', position_doc_page, page_height)
				service_po_po_pdf_file.setFillColorRGB(0, 0, 0)
				service_po_po_pdf_file.setFontSize(8)
				if found:
					x = position[1][0] + 17
					y = position[1][1] + 2
				else:
					x = 500
					y = 600
				service_po_po_pdf_file.drawString(x, y, checked_by)
				if found:
					x = position[0][0] + 10
					y = position[0][1] - 40
				else:
					x = 440
					y = 465
				service_po_po_pdf_file.setFontSize(15)
				if approval_status == Approval.APPROVED_APPROVAL:
					service_po_po_pdf_file.setFillColorRGB(0, 0, 0)
					service_po_po_pdf_file.drawString(x, y, "Approved SO")
				elif approval_status == Approval.REJECTED_APPROVAL:
					service_po_po_pdf_file.setFillColorRGB(1, 0, 0)
					service_po_po_pdf_file.drawString(x, y, "Rejected SO")
				service_po_po_pdf_file.save()
				packet.seek(0)
				overlay_pdf = PdfReader(packet)
				pdf_writer = PdfWriter()
				for i, page in enumerate(original_pdf.pages):
					if i == 0:
						page.merge_page(overlay_pdf.pages[0])
					pdf_writer.add_page(page)

			save_path = 'service_pos/%s' % (str(self.po_club.display_number), )

			file_name = self.get_service_po_file_name()
			
			with NamedTemporaryFile(mode='wb', suffix='.pdf', delete=False) as tmp:
				
				pdf_writer.write(tmp)
				tmp.flush()
				tmp_path = tmp.name
			
			with open(tmp_path, mode='rb') as file:
				saved_file = handle_uploaded_file(file, save_path, file_name)
				file_attachment = FileAttachment.objects.create(display_name='Ritz Supplier PO', type='.pdf',
																file_path=saved_file)
				self.set_new_service_po_file(file_attachment)