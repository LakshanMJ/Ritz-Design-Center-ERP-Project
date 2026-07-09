from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from shared.models import BaseAbstractModel
from django.db.models import Sum
from shared.models import Customer, FileAttachment, COSTING_MODE_TYPES
from shared.helpers.currency_helper import CurrencyHelper
from shared.utils import calculate_queryset_total_amount_normalized_amount, get_amount_dictionary, get_quantity_dictionary, calculate_queryset_total_normalized_quantity

class OutgoingCommercialInvoice(BaseAbstractModel):
	amount = models.FloatField(null=True)
	currency = models.CharField(max_length=100, choices=CurrencyHelper.CURRENCY_CHOICES, default=CurrencyHelper.USD_CURRENCY)
	customer = models.ForeignKey(Customer, on_delete=models.DO_NOTHING)
	due_date = models.DateField(null=True)
	invoice_file = models.ForeignKey(FileAttachment, on_delete=models.SET_NULL, null=True)
	incoterm = models.CharField(max_length=200, choices=COSTING_MODE_TYPES, null=True)

	DRAFT_STATE = 'draft'
	COMPLETE_STATE = 'complete'
	CANCELED_STATE = 'canceled'
	
	STATE_CHOICES = (
		(DRAFT_STATE, 'Draft'),
		(COMPLETE_STATE, 'Complete'),
		(CANCELED_STATE, 'Canceled')
	)
	state = models.CharField(max_length=100, choices=STATE_CHOICES, default=DRAFT_STATE)

	@property
	def display_number(self):
		return f"OUTCOMMERCIALINV{self.id:06}"


class IncomingPayment(BaseAbstractModel):
	amount = models.FloatField(null=True)
	payment_date = models.DateField()
	currency = models.CharField(max_length=100, choices=CurrencyHelper.CURRENCY_CHOICES, default=CurrencyHelper.USD_CURRENCY)
	complete = models.BooleanField(default=False)
	outgoing_commercial_invoice = models.ForeignKey(OutgoingCommercialInvoice, on_delete=models.SET_NULL, null=True)

	@property
	def display_number(self):
		return f"INPAYMENT{self.id:06}"
	
	def get_balance(self):
		data = {}
		balance = 0
		deductions = self.incomingpaymentdeduction_set.aggregate(
            total_deduction=Sum('amount')
        )['total_deduction'] or 0
		
		outgoings = self.outgoingpayment_set.aggregate(
			total_outgoing=Sum('amount')
        )['total_outgoing'] or 0
        
		balance = self.amount - (deductions + outgoings)
		data = {
			'total_deduction': deductions,
			'total_outgoing': outgoings,
			'balance': balance
		}
		return data
	

class IncomingPaymentDeduction(BaseAbstractModel):
	incomming_payment = models.ForeignKey(IncomingPayment, on_delete=models.CASCADE)
	amount = models.FloatField(null=True)
	currency = models.CharField(max_length=100, choices=CurrencyHelper.CURRENCY_CHOICES, default=CurrencyHelper.USD_CURRENCY)
	reason = models.CharField(max_length=500)


class PCLInterestRate(BaseAbstractModel):
	interest_rate = models.FloatField()
	active = models.BooleanField(default=True)


class OutgoingPayment(BaseAbstractModel):
	amount = models.FloatField(null=True)
	payment_date = models.DateField()
	currency = models.CharField(max_length=100, choices=CurrencyHelper.CURRENCY_CHOICES, default=CurrencyHelper.USD_CURRENCY)
	
	PCL_PAYMENT_METHOD = 'pcl'
	CASH_PAYMENT = 'cash'
	
	PAYMENT_METHOD_CHOICES = (
		(PCL_PAYMENT_METHOD, 'PCL'),
		(CASH_PAYMENT, 'Cash'),
	)

	payment_method = models.CharField(max_length=100, choices=PAYMENT_METHOD_CHOICES)
	#taken_from = models.ManyToManyField(IncomingPayment , through='OutgoingPaymentTakenFrom')
	#taken_pcl_po_club = models.ForeignKey('marketing.ActualPOClub', on_delete=models.SET_NULL, null=True) #TODO link to po_club
	complete = models.BooleanField(default=False)
	pcl_settle_date = models.DateField(null=True)
	pcl_create_date = models.DateField(null=True)
	pcl_end_date = models.DateField(null=True)
	interest_charge = models.FloatField(null=True)
	interest_charge_currency = models.CharField(max_length=100, choices=CurrencyHelper.CURRENCY_CHOICES, default=CurrencyHelper.USD_CURRENCY)
	interest_rate = models.FloatField(null=True)
	pcl_bank_information = models.ForeignKey('finance.PCLBankInformation', on_delete=models.SET_NULL, null=True)

	DRAFT_STATE = 'draft'
	COMPLETE_STATE = 'complete'
	CANCELED_STATE = 'canceled'
	
	STATE_CHOICES = (
		(DRAFT_STATE, 'Draft'),
		(COMPLETE_STATE, 'Complete'),
		(CANCELED_STATE, 'Canceled')
	)

	state = models.CharField(max_length=100, choices=STATE_CHOICES, default=DRAFT_STATE)

	@property
	def display_number(self):
		return f"PCL{self.id:06}"
	
	def get_supplier_po_delivery_invoice_pcls(self):
		return self.supplierpodeliveryinvoicepcl_set.all()
	
	def recalculate_amount(self):
		total_outgoing_amount = self.get_supplier_po_delivery_invoice_pcls().aggregate(total_outgoing=Sum('amount'))['total_outgoing'] or 0
		self.amount = total_outgoing_amount
		self.save()
	
	def calculate_interest_charge(self):
		if not self.pcl_end_date or not self.pcl_settle_date or not self.amount:
			return None
		
		date_diff = (self.pcl_settle_date - self.pcl_end_date).days
		if date_diff <= 0:
			return None
		interest_rate = PCLInterestRate.objects.filter(active=True).first()
		
		if not interest_rate:
			return None
		annual_interest_rate = interest_rate.interest_rate
		daily_interest_rate = annual_interest_rate / 365
		interest_charge = self.amount * daily_interest_rate * date_diff
		self.interest_charge = interest_charge
		self.save()
		return interest_charge
	
	def move_to_next_state(self, new_state):
		state_transition_errors = []
		if new_state == self.COMPLETE_STATE and self.state == self.DRAFT_STATE:
			self.state = self.COMPLETE_STATE
		elif new_state == self.CANCELED_STATE:
			self.state = self.CANCELED_STATE
		elif new_state == self.DRAFT_STATE:
			self.state = self.DRAFT_STATE
		else:
			state_transition_errors.append('Invalid selection of state')
		self.save()
		return state_transition_errors
	
	def get_supplier_po_delivery_invoices(self):
		from supplier_po.models import SupplierPODeliveryInvoice
		invoice_ct = ContentType.objects.get_for_model(SupplierPODeliveryInvoice)
		invoice_pcl_entries = SupplierPODeliveryInvoicePCL.objects.filter(
            outgoing_payment=self,
            entity_type=invoice_ct
        )
		invoices = SupplierPODeliveryInvoice.objects.filter(id__in=invoice_pcl_entries.values_list('entity_id', flat=True))
		return invoices
	
	def get_supplier_pos(self):
		from supplier_po.models import SupplierPO
		supplier_po_ct = ContentType.objects.get_for_model(SupplierPO)
		supplier_po_pcl_entries = SupplierPODeliveryInvoicePCL.objects.filter(
            outgoing_payment=self,
            entity_type=supplier_po_ct
        )
		pos = SupplierPO.objects.filter(id__in=supplier_po_pcl_entries.values_list('entity_id', flat=True))
		return pos
	

# class OutgoingPaymentTakenFrom(BaseAbstractModel):
# 	amount = models.FloatField(null=True)
# 	currency = models.CharField(max_length=100, choices=CurrencyHelper.CURRENCY_CHOICES, default=CurrencyHelper.USD_CURRENCY)
# 	outgoing_payment = models.ForeignKey(OutgoingPayment, on_delete=models.CASCADE)
# 	incoming_payment = models.ForeignKey(IncomingPayment, on_delete=models.CASCADE)


class PCLBankInformation(BaseAbstractModel):
	total_amount = models.FloatField(null=True)
	total_amount_currency = models.CharField(max_length=100, choices=CurrencyHelper.CURRENCY_CHOICES, default=CurrencyHelper.USD_CURRENCY)
	pcl_threshold_amount = models.FloatField(null=True)
	pcl_threshold_amount_currency = models.CharField(max_length=100, choices=CurrencyHelper.CURRENCY_CHOICES, default=CurrencyHelper.USD_CURRENCY)
	
	DRAFT_STATE = 'draft'
	SENT_TO_BANK_STATE = 'sent_to_bank'
	CLOSED_STATE = 'closed'
	
	STATE_CHOICES = (
		(DRAFT_STATE, 'Draft'),
		(SENT_TO_BANK_STATE, 'Send to bank'),
		(CLOSED_STATE, 'Closed'),
	)
	state = models.CharField(max_length=100, choices=STATE_CHOICES, default='draft')
	pcl_facility_start_date = models.DateField(null=True)
	pcl_facility_end_date = models.DateField(null=True)
	
	def get_suppliers(self):
		pass
		# Write logic to get all of the suppliers for self.purchase_order and all suppliers in ExternalPCLBankInformation below

	def set_pcl_threshold_amount(self):
		total_pcl_threshold_amount = 0
		for pcl_bank_information_linked_po_club in self.pclbankinformationlinkedpoclub_set.all():
			total_pcl_threshold_amount += pcl_bank_information_linked_po_club.po_club.max_pcl_value
		self.pcl_threshold_amount = total_pcl_threshold_amount
		self.save()

	def set_total_amount(self):
		from marketing.models import ActualPOClub
		total_amount = 0
		po_clubs = ActualPOClub.objects.filter(id__in=self.pclbankinformationlinkedpoclub_set.all().values_list('po_club', flat=True))
		for po_club in po_clubs:
			total_amount += po_club.total_fob_value
		self.total_amount = total_amount
		self.save()

	def set_amount_values(self):
		self.set_pcl_threshold_amount()
		self.set_total_amount()

	def calculate_merged_po_club_pcl_data(self):
		from finance.helpers.pcl_bank_information_helper import PCLBankInformationHelper
		pcl_data = PCLBankInformationHelper().calculate_pcl_data(self)
		return pcl_data
	
	def get_outgoing_payments(self):
		return self.outgoingpayment_set.all()
	
	def get_used_amount(self):
		total_outgoing_amount = self.get_outgoing_payments().aggregate(total_outgoing=Sum('amount'))['total_outgoing'] or 0
		return total_outgoing_amount
	
	def get_due_amount(self):
		due_amount = 0
		if self.pcl_threshold_amount:
			due_amount = self.pcl_threshold_amount
		return due_amount

	def get_balance_amount(self):
		balance_amount = 0
		used_amount = self.get_used_amount()
		if self.pcl_threshold_amount:
			balance_amount = self.pcl_threshold_amount - used_amount
		return balance_amount

	@property
	def display_number(self):
		return f"PCLFACILITY{self.id:06}"
      
	def move_to_next_state(self, new_state):
		state_transition_errors = []
		if new_state == self.SENT_TO_BANK_STATE and self.state == self.DRAFT_STATE:
			self.state = self.SENT_TO_BANK_STATE
		elif new_state == self.CLOSED_STATE and self.state == self.SENT_TO_BANK_STATE:
			self.state = self.CLOSED_STATE
		else:
			state_transition_errors.append('Invalid selection of state')
		self.save()
		return state_transition_errors
	
	def get_outgoing_payments(self):
		outgoing_payments = OutgoingPayment.objects.filter(pcl_bank_information=self)
		return outgoing_payments
	
	def get_pcl_balance_amount(self):
		pcl_used_amount = self.get_pcl_used_amount()

		return self.pcl_threshold_amount - pcl_used_amount
	
	def get_pcl_used_amount(self):
		used_value = 0
		outgoing_payments = self.get_outgoing_payments()
		used_value = calculate_queryset_total_amount_normalized_amount(outgoing_payments, 'amount', 'amount_currency')
		return used_value
	
	def get_supplier_po_delivery_invoices(self):
		from supplier_po.models import SupplierPODeliveryInvoice
		invoice_ct = ContentType.objects.get_for_model(SupplierPODeliveryInvoice)
		invoice_pcl_entries = SupplierPODeliveryInvoicePCL.objects.filter(
            outgoing_payment__pcl_bank_information=self,
            entity_type=invoice_ct
        )
		invoices = SupplierPODeliveryInvoice.objects.filter(id__in=invoice_pcl_entries.values_list('entity_id', flat=True))
		return invoices
	
	def get_supplier_pos(self):
		from supplier_po.models import SupplierPO
		supplier_po_ct = ContentType.objects.get_for_model(SupplierPO)
		supplier_po_pcl_entries = SupplierPODeliveryInvoicePCL.objects.filter(
            outgoing_payment__pcl_bank_information=self,
            entity_type=supplier_po_ct
        )
		pos = SupplierPO.objects.filter(id__in=supplier_po_pcl_entries.values_list('entity_id', flat=True))
		return pos
	
	def get_supplier_po_delivery_invoice_pcl(self):
		supplier_po_delivery_invoice_pcls = SupplierPODeliveryInvoicePCL.objects.filter(outgoing_payment__pcl_bank_information=self)
		return supplier_po_delivery_invoice_pcls
	
	def get_linked_po_club_invoice_supplier_po_pcls(self):
		from marketing.models import SupplierPO, SupplierPODeliveryInvoice, ActualPOClub
		from django.db.models import Q
		all_pcls = SupplierPODeliveryInvoicePCL.objects.none()
		mapped_po_clubs = ActualPOClub.objects.filter(id__in=self.pclbankinformationlinkedpoclub_set.all().values_list('po_club', flat=True))
		for po_club in mapped_po_clubs:
			pcls = SupplierPODeliveryInvoicePCL.objects.filter(
				Q(entity_type=ContentType.objects.get_for_model(SupplierPO),
				entity_id__in=po_club.get_supplier_pos().values_list('pk', flat=True)) |
				Q(entity_type=ContentType.objects.get_for_model(SupplierPODeliveryInvoice),
				entity_id__in=po_club.get_invoices().values_list('pk', flat=True))
			)
			all_pcls = all_pcls.union(pcls)
		return all_pcls
			
	def get_foreign_pcls(self):
		supplier_po_delivery_invoice_pcls = SupplierPODeliveryInvoicePCL.objects.filter(outgoing_payment__pcl_bank_information=self)
		foreign_pcls = supplier_po_delivery_invoice_pcls.exclude(id__in=self.get_linked_po_club_invoice_supplier_po_pcls().values_list('pk', flat=True))
		return foreign_pcls

	def get_foreign_pcl_po_clubs(self):
		from marketing.models import ActualPOClub
		foreign_pcls = self.get_foreign_pcls()
		club_ids  = []
		for foreign_pcl in foreign_pcls:
			
			if foreign_pcl.supplier_po:
				po_club = foreign_pcl.supplier_po.po_club
				club_ids.append(po_club.pk)
			elif foreign_pcl.invoice:
				po_club = foreign_pcl.invoice.get_costing_or_po_club()
				if isinstance(po_club, ActualPOClub):
					club_ids.append(po_club.pk)
		all_clubs = ActualPOClub.objects.filter(pk__in=club_ids).distinct()
		return all_clubs
	

class PCLBankInformationLinkedPOClub(BaseAbstractModel):
	po_club = models.ForeignKey('marketing.ActualPOClub', on_delete=models.CASCADE)
	pcl_bank_information = models.ForeignKey(PCLBankInformation, on_delete=models.CASCADE)


class SupplierPODeliveryInvoicePCL(BaseAbstractModel):
	entity_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
	entity_id = models.PositiveIntegerField()
	entity = GenericForeignKey('entity_type', 'entity_id')
	amount = models.FloatField(null=True)
	currency = models.CharField(max_length=100, choices=CurrencyHelper.CURRENCY_CHOICES, default=CurrencyHelper.USD_CURRENCY)
	outgoing_payment = models.ForeignKey(OutgoingPayment, on_delete=models.CASCADE)

	def get_entity(self):
		return self.entity
	
	@property
	def supplier_po(self):
		from supplier_po.models import SupplierPO
		return self.entity if isinstance(self.entity, SupplierPO) else None
	
	@property
	def invoice(self):
		from supplier_po.models import SupplierPODeliveryInvoice
		return self.entity if isinstance(self.entity, SupplierPODeliveryInvoice) else None