import math
from datetime import datetime
from functools import cached_property
from django.contrib.contenttypes.models import ContentType

from django.core.exceptions import ObjectDoesNotExist
from django.db import models
from django.db.models import Sum

from tempfile import NamedTemporaryFile

import fitz

from marketing.utils.aws_utils import handle_uploaded_file, handle_file_read

from marketing.model_utils.grn_utils import calculate_material_delivery_quantity_summary
from materials.fieldmetadata.measuring_unit_helpers import MaterialUnitHelper, PerMeasuringUnitHelper
from materials.models import CustomerBrandMaterial, SupplierInquiryDetail, FabricColorTone, UserDefinedMaterialDefect, \
    Material, UserDefinedMaterial, SupplierInquiryMaterialCode, SupplierCustomerBrandMaterial
from shared.models import Approval, BaseAbstractModel, Plant, Supplier, FileAttachment, InHouseMaterial, PAYMENT_METHOD_TYPES, \
    SHIPPING_MODE_TYPES, COSTING_MODE_TYPES, SEA_TRANSPORT_METHOD
from shared.utils import get_quantity_dictionary, calculate_queryset_total_normalized_quantity, base64_encode_string, \
    get_object_or_none, convert_quantity_to_unit, round_if_number, get_object_or_none_qs, get_float_or_zero, calculate_queryset_total_amount_normalized_amount, \
    get_amount_dictionary
from supplier_po.model_utils.model_functions.grn_classes import SupplierPOGRNModelMixin
from finance.models import OutgoingPayment, SupplierPODeliveryInvoicePCL
from shared.helpers.currency_helper import CurrencyHelper
from reportlab.pdfgen.canvas import Canvas
from PyPDF2 import PdfReader, PdfWriter
from io import BytesIO


class GeneralPO(BaseAbstractModel):
    costing = models.ForeignKey('marketing.OrderCostingVersion', on_delete=models.SET_NULL, null=True)

    # If general po has a po club attached to it, this will have a value. For General POs raised from the costing this won't have a value
    po_club = models.ForeignKey('marketing.ActualPOClub', null=True, on_delete=models.SET_NULL)

    DRAFT = 'draft' 
    QUANTITY_VERIFICATION = 'quantity_verification'
    READY_TO_SENT_PO = 'ready_to_sent_po'
    PO_SENT = 'po_sent'
    CLOSED = 'closed'
    CANCELED = 'canceled'

    EDITABLE_STATES = [DRAFT, QUANTITY_VERIFICATION, READY_TO_SENT_PO]

    STATE_CHOICES = (
        (DRAFT, 'Draft'),
        (QUANTITY_VERIFICATION, 'Quantity Verification'),
        (READY_TO_SENT_PO, 'Ready to sent PO'),
        (PO_SENT, 'PO Sent'),
        (CLOSED, 'Closed'),
        (CANCELED, 'Canceled'),
    )
    state = models.CharField(max_length=100, choices=STATE_CHOICES, null=True)
    plant = models.ForeignKey(Plant, on_delete=models.CASCADE, null=True)

    def get_quantities(self):
        return self.generalpoquantity_set.all()
    
    def validate_delivery_quantities(self):
        not_complete = GeneralPOMaterialQuantity.objects.filter(general_po=self, completed=False, send_po_for_material=True).exists()
        return not_complete

    def move_to_next_state(self, new_state, user=None):  # TODO need to develop
        self.state = new_state
        errors = []
        if new_state == self.QUANTITY_VERIFICATION:
            from supplier_po.helpers.general_po_processor import GeneralPOBOM
            if self.po_club == None:
                general_po_bom = GeneralPOBOM(self)
                general_po_bom.create_general_po_bom()
                self.save()
        if new_state == self.READY_TO_SENT_PO:
            from supplier_po.helpers.supplier_po_bom_generator import GeneralSupplierPOBOMGenerator
            if not self.validate_delivery_quantities():
                if self.po_club == None:
                    general_supplier_po_bom_generator = GeneralSupplierPOBOMGenerator(self)
                    general_supplier_po_bom_generator.set_prepared_by(user)
                    general_supplier_po_bom_generator.create_supplier_pos()
                self.save()
            else:
                errors.append('Please make sure to complete every material')
        self.save()
        return errors

    def is_po_club_general_po(self):
        is_club_po = False
        if self.po_club:
            is_club_po = True
        return is_club_po
    
    def get_materials_in_general_po(self):
        material_ids = GeneralPOMaterialQuantity.objects.filter(general_po=self).values_list('material', flat=True)
        materials = CustomerBrandMaterial.objects.filter(id__in=material_ids).distinct().order_by(
            'material_detail__generic_material__user_material__display_order'
        )
        return materials

    def general_po_is_editable(self):
        is_editable = False
        if self.state in self.EDITABLE_STATES:
            is_editable = True
        return is_editable

    @property
    def display_number(self):
        return f"GENERALPO{self.id:06}"


class GeneralPOSupplier(BaseAbstractModel):
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE)
    general_po = models.ForeignKey(GeneralPO, on_delete=models.CASCADE)
    # supplier_po = models.ForeignKey('supplier_po.SupplierPO', null=True, on_delete=models.CASCADE) # this model is linked through SupplierPO
    GREIGE_PO_TYPE = 'greige_po'
    SUPPLIER_PO_TYPE = 'supplier_po'

    PO_TYPE_OPTIONS = (
        (GREIGE_PO_TYPE, 'Greige PO'),
        (SUPPLIER_PO_TYPE, 'Supplier PO'),
    )
    po_type = models.CharField(max_length=200, choices=PO_TYPE_OPTIONS, default=SUPPLIER_PO_TYPE)

    @cached_property
    def supplier_po(self):
        '''
            This is a cached property. If you need it refreshed you need to delete del general_poo_suppllier_object.supplier_po
        '''
        try:
            supplier_po = self.supplierpo
        except ObjectDoesNotExist:
            supplier_po = None
        return supplier_po
    
    @property
    def incoterm_type_display(self):
        return self.supplier.get_costing_mode_display()
    
    @property
    def incoterm_type(self):
        return self.supplier.costing_mode


class GeneralPOSupplierMaterialPrice(BaseAbstractModel):
    general_po_supplier = models.ForeignKey(GeneralPOSupplier, on_delete=models.CASCADE)
    # customer_brand_material = models.ForeignKey(CustomerBrandMaterial, on_delete=models.DO_NOTHING)
    supplier_material = models.ForeignKey(SupplierInquiryMaterialCode, on_delete=models.CASCADE) # the customer_brand_material from here and at material at GeneralPOSupplierMaterialPrice level could differ. The material_code must be the same.
    supplier_inquiry_detail = models.ForeignKey(SupplierInquiryDetail, on_delete=models.CASCADE, null=True)
    lead_time = models.IntegerField(null=True, blank=True)
    costing_price = models.FloatField(null=True)
    costing_price_units = models.CharField(max_length=200, choices=PerMeasuringUnitHelper.ALL_PER_LENGTH_MEASURING_UNITS, null=True)
    order_price = models.FloatField(null=True)
    order_price_units = models.CharField(max_length=200, choices=PerMeasuringUnitHelper.ALL_PER_LENGTH_MEASURING_UNITS, null=True)
    discount = models.FloatField(null=True)
    excess_threshold = models.FloatField(null=True)
    FOB_INCOTERM = 'fob'
    CIF_INCOTERM = 'cif'
    EXW_INCOTERM = 'exw'
    INCOTERM_CHOICE = (
        (FOB_INCOTERM, 'FOB'),
        (CIF_INCOTERM, 'CIF'),
        (EXW_INCOTERM, 'EXW'),
    )
    incoterm = models.CharField(max_length=200, choices=INCOTERM_CHOICE, null=True)
    transport_method = models.CharField(max_length=20, choices=SHIPPING_MODE_TYPES, null=True) # ship mode
    # Supplier inquiry detail data
    cutting_width = models.DecimalField(max_digits=20, decimal_places=4, null=True)
    cutting_width_unit = models.CharField(max_length=100, null=True, choices=MaterialUnitHelper.ALL_MEASURING_UNITS)
    costing_unit = models.CharField(max_length=200, choices=PerMeasuringUnitHelper.ALL_PER_LENGTH_MEASURING_UNITS, null=True)
    cost_per_unit = models.DecimalField(max_digits=20, decimal_places=6, default=None, blank=True, null=True)
    fob_price = models.DecimalField(max_digits=20, decimal_places=6, default=0, blank=True, null=True)
    cif_price = models.DecimalField(max_digits=20, decimal_places=6, default=0, blank=True, null=True)
    transport_charges = models.DecimalField(max_digits=20, decimal_places=6, default=0, blank=True, null=True)
    ex_work_price = models.DecimalField(max_digits=20, decimal_places=6, default=0, blank=True, null=True)
    expiration_date = models.DateField(null=True, blank=True)
    lead_time = models.IntegerField(null=True, blank = True)
    minimum_order_quantity = models.FloatField(null = True)
    minimum_order_quantity_units = models.CharField(max_length=100, null=True, choices=MaterialUnitHelper.ALL_MEASURING_UNITS)
    excess_threshold = models.FloatField(null=True)

    SHIP_MODE_CHOICES = SHIPPING_MODE_TYPES
    SEA_CHOICE = SEA_TRANSPORT_METHOD

    ship_mode = models.CharField(max_length=100, choices=SHIP_MODE_CHOICES, default=SEA_TRANSPORT_METHOD)
    pay_mode = models.CharField(max_length=200, choices=PAYMENT_METHOD_TYPES, null=True)
    cost_per_unit_type = models.CharField(max_length=200, choices=COSTING_MODE_TYPES, null=True)

    def get_deliveries(self):
        return self.supplierdeliverydatequantity_set.all()

    def get_delivery_type(self):
        no_of_deliveries = self.supplierdeliverydatequantity_set.all().count()
        if no_of_deliveries > 1:
            delivery_type = 'staggered'
        else:
            delivery_type = 'single'
        return delivery_type

    def get_delivery_count(self):
        deliveries_for_supplier = SupplierDeliveryDateQuantity.objects.filter(general_po_material_quantity__default_material_supplier=self).count()
        # deliveries_for_supplier = self.supplierdeliverydatequantity_set.all().count()
        # for aabc in self.supplierdeliverydatequantity_set.all():
        #     print(aabc.default_supplier.supplier_material.supplier.name)
        # print(self.supplier_material.supplier.name, deliveries_for_supplier)
        return deliveries_for_supplier


class GeneralPOQuantity(BaseAbstractModel):
    general_po = models.ForeignKey(GeneralPO, on_delete=models.CASCADE)
    pack = models.ForeignKey('marketing.OrderPack', on_delete=models.SET_NULL, null=True)
    quantity = models.IntegerField(null=True)


class GeneralPOMaterialQuantity(BaseAbstractModel):
    general_po = models.ForeignKey(GeneralPO, on_delete=models.CASCADE) # Keep this link because default_material_supplier is only for default and it can change
    material = models.ForeignKey(CustomerBrandMaterial, on_delete=models.CASCADE)
    quantity = models.FloatField(null=True)
    measuring_unit = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
    order_quantity = models.FloatField(null=True)
    order_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
    default_material_supplier = models.ForeignKey(GeneralPOSupplierMaterialPrice, on_delete=models.SET_NULL, null=True)
    completed = models.BooleanField(default=False)
    send_po_for_material = models.BooleanField(default=False)
    # unit_price = models.FloatField(null=True)
    # unit_price_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)

    FULFILL_FROM_LEFTOVER_DISCREPANCY_CHOICE = 'fulfill_from_leftover'
    OTHER_DISCREPANCY_CHOICE = 'other'  # order_quantity_discrepancy_other is mandatory if order_quantity_discrepancy_reason  is other
    CHANGE_EXPECTING_QUANTITY = 'change_expecting_quantity'

    DISCREPANCY_REASONS = (
        (FULFILL_FROM_LEFTOVER_DISCREPANCY_CHOICE, 'Fulfill from Leftover'),
        (OTHER_DISCREPANCY_CHOICE, 'Other'),
        (CHANGE_EXPECTING_QUANTITY,  'Change Expecting Quantity (Warning: This will impact quantity of other material quantities)'),
    )

    order_quantity_discrepancy_reason = models.CharField(max_length=500, null=True, choices=DISCREPANCY_REASONS)
    order_quantity_discrepancy_other = models.TextField(null=True)

    def get_delivery_date_status(self):
        # is_exist_delivery_date = self.supplierdeliverydatequantity_set.all().exclude(supplier_delivery_date=None).exists()
        return self.completed
    
    @property
    def generated_supplier_pos(self):
        supplier_pos = []
        if self.default_material_supplier:
            if self.default_material_supplier.general_po_supplier:
                supplier = self.default_material_supplier.general_po_supplier.supplier
                po_club = self.default_material_supplier.general_po_supplier.general_po.po_club
                supplier_pos = SupplierPO.objects.filter(
                    general_po_supplier=self.default_material_supplier.general_po_supplier,
                    general_po_supplier__supplier=supplier,
                    general_po_supplier__general_po__po_club=po_club,
                    state__in=[SupplierPO.DRAFT_STATE, SupplierPO.PENDING_EMAIL_STATE]
                )
        return supplier_pos
    
    @property
    def generated_all_supplier_pos(self):
        supplier_pos = []
        if self.default_material_supplier:
            if self.default_material_supplier.general_po_supplier:
                supplier = self.default_material_supplier.general_po_supplier.supplier
                po_club = self.default_material_supplier.general_po_supplier.general_po.po_club
                supplier_pos = SupplierPO.objects.filter(
                    general_po_supplier=self.default_material_supplier.general_po_supplier,
                    general_po_supplier__supplier=supplier,
                    general_po_supplier__general_po__po_club=po_club
                )
        return supplier_pos

    class Meta:
        ordering = ['material__material_detail__generic_material__user_material__display_order', 'material__id']


class SupplierRequestedDeliveryDate(BaseAbstractModel):
    requested_date = models.DateField()
    supplier_po = models.ForeignKey('supplier_po.SupplierPO', on_delete=models.SET_NULL, null=True)


class SupplierDeliveryDate(BaseAbstractModel):
    # supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE)
    # general_po = models.ForeignKey('supplier_po.GeneralPO', on_delete=models.SET_NULL, null=True)
    general_po_supplier = models.ForeignKey('supplier_po.GeneralPOSupplier', on_delete=models.CASCADE)
    # po_club = models.ForeignKey('marketing.ActualPOClub', on_delete=models.CASCADE, null=True)  # This and supplier is needed because there is no way of identifying it without the supplier_po when it is initially created
    confirmed_delivery_date = models.DateField(null=True)
    actual_delivery_date = models.ForeignKey('supplier_po.SupplierActualDeliveryDate', on_delete=models.SET_NULL, null=True)
    # supplier_po = models.ForeignKey('supplier_po.SupplierPO', on_delete=models.SET_NULL, null=True)
    transport_tracking = models.ForeignKey('transport.TransportDeliveryDateTracking', on_delete=models.SET_NULL, null=True)
    last_ex_mill_date =models.DateField(null=True)
    supplier_port = models.ForeignKey('shared.Port', on_delete=models.SET_NULL, null=True)
    transport_method = models.CharField(max_length=20, choices=SHIPPING_MODE_TYPES, null=True)

    @property
    def display_number(self):
        return f"DELIVERY{self.id:06}"

    @property
    def is_grn_created(self):
        status = False
        grns = self.get_delivery_date_grns()
        if grns:
            status = True
        return status

    @property
    def has_free_of_charge_deliveries(self):
        return self.get_replacement_materials().exists()
    
    def set_last_ex_mill_date(self):
        dates = []
        for supplier_delivery_date_quantity in self.supplierdeliverydatequantity_set.all():
            date = supplier_delivery_date_quantity.ex_mill_date
            if date:
                dates.append(date)
        dates = list(set(dates))
        dates = sorted(dates, reverse=True)
        if len(dates) > 0:
            self.last_ex_mill_date = dates[0]
            self.save()

    def get_replacement_materials(self):
        return self.replacementquantitydeliverydate_set.filter()

    def get_delivery_invoice(self):
        invoice = None
        if self.actual_delivery_date:
            invoice = self.actual_delivery_date.supplier_po_delivery_invoice
        return invoice

    def get_delivery_pack_lists(self):
        invoice = self.get_delivery_invoice()
        pack_lists = []
        if invoice:
            pack_lists = invoice.get_invoice_pack_lists()
        return pack_lists

    def get_grns_from_pack_list(self):
        pack_lists = self.get_delivery_pack_lists()
        grns = SupplierPOGRN.objects.filter(supplier_pack_list=pack_lists)
        return grns

    def get_delivery_date_grns(self, completed=False):
        invoice = self.get_delivery_invoice()
        grns = SupplierPOGRN.objects.none()
        if invoice:
            grns = invoice.get_supplier_po_invoice_grns(self.general_po_supplier.supplier_po, completed)
        return grns

    def get_delivery_date_ordered_quantity(self, supplier_material):
        material_orders = self.supplierdeliverydatequantity_set.filter(material_supplier__supplier_material=supplier_material)
        normalized_unit = supplier_material.customer_brand_material.material_normalized_measuring_unit
        quantity = calculate_queryset_total_normalized_quantity(material_orders, normalized_unit, 'quantity', 'quantity_units')
        return get_quantity_dictionary(quantity, normalized_unit)

    # def get_replacement_materials(self):
    #     return self.replacementquantitydeliverydate_set.filter()

    def get_delivery_date_replacement_quantity(self, material):
        replacements = self.replacementquantitydeliverydate_set.filter(supplier_po_grn_material__grn_material=material)
        normalized_unit = material.customer_brand_material.material_normalized_measuring_unit
        quantity = calculate_queryset_total_normalized_quantity(replacements, normalized_unit, 'quantity', 'quantity_units')
        return get_quantity_dictionary(quantity, normalized_unit)

    def get_material_delivery_quantity_summary(self, material):
        delivery_grn_ids = self.get_delivery_date_grns().values_list('pk', flat=True)
        supplier_po_grn_materials = SupplierPOGRNMaterial.objects.filter(supplier_po_grn__in=delivery_grn_ids, grn_material=material, supplier_po_grn__state=SupplierPOGRN.GRN_COMPLETE)
        quantity_details = calculate_material_delivery_quantity_summary(self, supplier_po_grn_materials, material)
        return quantity_details

    # Review this if it is used
    # def get_allocations_for_po(self, purchase_order, material):
    #     from marketing.models import PurchaseOrderBom
    #     total_allocated_quantity = 0
    #     bom_ids = SupplierDeliveryDateQuantity.objects.filter(supplier_delivery_date=self, purchase_order_bom__purchase_order=purchase_order).values_list('purchase_order_bom', flat=True)
    #     boms = PurchaseOrderBom.objects.filter(id__in=bom_ids)
    #     for bom in boms:
    #         po_allocated_materials = bom.purchaseorderallocatedmaterial_set.filter(purchase_order_bom__material=material)
    #         for po_allocated_material in po_allocated_materials:
    #             total_allocated_quantity += po_allocated_material.normalized_allocated_quantity
    #     return total_allocated_quantity

    def get_settlement_po(self):
        from marketing.models import ActualPOClub
        po_clubs = None
        invoice = self.get_delivery_invoice()
        if invoice:
            #po_club_ids = invoice.supplierpodeliveryinvoicepcl_set.all().values_list('pcl_bank_information__po_club', flat=True)
            po_club_ids = [115]
            po_clubs = ActualPOClub.objects.filter(pk__in=po_club_ids)
        return po_clubs
    
    def get_incoterms(self):
        incoterms = []
        for supplier_delivery_date_quantity in self.supplierdeliverydatequantity_set.all():
            incoterm = {
                'incoterm': supplier_delivery_date_quantity.material_supplier.incoterm,
                'incoterms_display': supplier_delivery_date_quantity.material_supplier.get_incoterm_display()
            }
            if not incoterm in incoterms:
                incoterms.append(incoterm)
        return incoterms
    
    def get_plant(self):
        plant = self.general_po_supplier.general_po.plant
        return plant
    
    def get_costing_or_po_club(self):
        if self.general_po_supplier.general_po.po_club:
            return self.general_po_supplier.general_po.po_club
        else:
            return self.general_po_supplier.general_po.costing
    
    def get_materials(self):
        data = []
        for supplier_delivery_date_quantity in self.supplierdeliverydatequantity_set.all():
            material = supplier_delivery_date_quantity.material_supplier.supplier_material.customer_brand_material
            data.append(material)
        data = list(set(data))
        return data


# This is only PurchaseOrderBom - nothing to do with club. Type in name SupplierDeliveryDateQuantity
class SupplierDeliveryDateQuantity(BaseAbstractModel):
    # purchase_order_bom = models.ForeignKey('marketing.PurchaseOrderBom', on_delete=models.CASCADE, null=True)  # TODO remove this field and change model name
    general_po_material_quantity = models.ForeignKey('supplier_po.GeneralPOMaterialQuantity', on_delete=models.SET_NULL, null=True)
    quantity = models.FloatField(null=True)
    quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
    supplier_delivery_date = models.ForeignKey('supplier_po.SupplierDeliveryDate', on_delete=models.SET_NULL, null=True) #If null material not send in supplier po
    default_supplier = models.BooleanField(default=False) # TODO - do we need this??
    saved_in_house_material_status = models.BooleanField(default=False)
    requested_date = models.ForeignKey(SupplierRequestedDeliveryDate, on_delete=models.SET_NULL, null=True)
    proforma_invoice_quantity = models.FloatField(null=True) #TODO replace with the quantity
    proforma_invoice_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
    material_supplier = models.ForeignKey(GeneralPOSupplierMaterialPrice, on_delete=models.SET_NULL, null=True)
    transport_quantity = models.FloatField(null=True)
    transport_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
    ex_mill_date = models.DateField(null=True)
    # transport_method = models.CharField(max_length=20, choices=SHIPPING_MODE_TYPES, null=True)
    split_from = models.ForeignKey('self', on_delete=models.SET_NULL, null=True)

    def save(self, *args, **kwargs):
        if self.supplier_delivery_date:
            self.supplier_delivery_date.set_last_ex_mill_date()
        return super().save(*args, **kwargs)

    def get_normalized_quantity(self):
        quantity_data = get_quantity_dictionary(self.quantity, self.quantity_units)
        return quantity_data

    def calculate_quantity_price(self):
        if self.material_supplier.order_price:
            cost_per_unit = self.material_supplier.order_price
            costing_units = self.material_supplier.order_price_units
            quantity = self.quantity
            quantity_units = self.quantity_units
            if costing_units == PerMeasuringUnitHelper.PER_PIECE_UNIT:
                total_cost = float(quantity) * float(cost_per_unit)
            else:
                costing_unit_flat = MaterialUnitHelper.PER_UNIT_TO_UNIT_MAPPING.get(costing_units, None)
                costing_unit_conversion = MaterialUnitHelper().get_meter_conversion_amount(costing_unit_flat)
                quantity_units_conversion = MaterialUnitHelper().get_meter_conversion_amount(quantity_units)
                total_cost = (float(cost_per_unit) / float(costing_unit_conversion)) * (quantity * float(quantity_units_conversion))
            if self.material_supplier.discount:
                discount = self.material_supplier.discount/100
                discounted_price = total_cost * discount
                total_cost = round(total_cost-discounted_price, 2)
            total_cost = round(total_cost, 2)
            return total_cost
    
    def calculate_transport_quantity_price(self):
        total_cost = 0.00
        if self.material_supplier.order_price:
            cost_per_unit = self.material_supplier.order_price
            costing_units = self.material_supplier.order_price_units
            quantity = self.transport_quantity
            quantity_units = self.transport_quantity_units
            if costing_units == PerMeasuringUnitHelper.PER_PIECE_UNIT:
                total_cost = float(quantity) * float(cost_per_unit)
            else:
                costing_unit_flat = MaterialUnitHelper.PER_UNIT_TO_UNIT_MAPPING.get(costing_units, None)
                costing_unit_conversion = MaterialUnitHelper().get_meter_conversion_amount(costing_unit_flat)
                quantity_units_conversion = MaterialUnitHelper().get_meter_conversion_amount(quantity_units)
                total_cost = (float(cost_per_unit) / float(costing_unit_conversion)) * (quantity * float(quantity_units_conversion))
            if self.material_supplier.discount:
                discount = self.material_supplier.discount/100
                discounted_price = total_cost * discount
                total_cost = round(total_cost-discounted_price, 2)
            total_cost = round(total_cost, 2)
        return total_cost

    @property
    def material_display_name(self):
        return self.material_supplier.supplier_material.customer_brand_material.verbose_reference_code


PurchaseOrderClubBomSupplier = SupplierDeliveryDateQuantity  # This is an alias for legacy purposes. Can remove it once everything is cleaned up


class SupplierDeliveryDateQuantityPOAllocation(BaseAbstractModel):
    purchase_order = models.ForeignKey('marketing.PurchaseOrder', on_delete=models.CASCADE)
    supplier_delivery_date_quantity = models.ForeignKey(SupplierDeliveryDateQuantity, on_delete=models.CASCADE)
    quantity = models.FloatField(null=True)
    quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
    proforma_invoice_quantity = models.FloatField(null=True)
    proforma_invoice_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
    #add transport_quantity and transport_quantity_units
    
    
    # TODO Dasith Minor- change this to the new way
    def get_normalized_quantity(self):
        material_helper = MaterialUnitHelper()
        quantity_data = {
            'quantity': self.quantity,
            'quantity_unit': self.quantity_units,
            'quantity_units_display': material_helper.all_measuring_units_dictionary.get(self.quantity_units, "N/A")
        }
        if self.quantity_units != MaterialUnitHelper.PIECES_UNIT:
            quantity_data['quantity_unit'] = MaterialUnitHelper.METERS_UNIT
            quantity_data['quantity_units_display'] = material_helper.all_measuring_units_dictionary.get(MaterialUnitHelper.METERS_UNIT, "N/A")
            quantity_units_conversion = MaterialUnitHelper().get_meter_conversion_amount(self.quantity_units)
            quantity_data['quantity'] = self.quantity * float(quantity_units_conversion)
        quantity_data['quantity'] = round_if_number(quantity_data['quantity'], 2)
        return quantity_data

    def calculate_quantity_price(self):
        total_cost = 0
        if self.supplier_delivery_date_quantity.material_supplier and self.supplier_delivery_date_quantity.material_supplier.order_price:
            cost_per_unit = self.supplier_delivery_date_quantity.material_supplier.order_price
            costing_units = self.supplier_delivery_date_quantity.material_supplier.order_price_units
            quantity = self.quantity
            quantity_units = self.quantity_units
            if costing_units == PerMeasuringUnitHelper.PER_PIECE_UNIT:
                total_cost = float(quantity) * float(cost_per_unit)
            else:
                costing_unit_flat = MaterialUnitHelper.PER_UNIT_TO_UNIT_MAPPING.get(costing_units, None)
                costing_unit_conversion = MaterialUnitHelper().get_meter_conversion_amount(costing_unit_flat)
                quantity_units_conversion = MaterialUnitHelper().get_meter_conversion_amount(quantity_units)
                total_cost = (float(cost_per_unit) / float(costing_unit_conversion)) * (quantity * float(quantity_units_conversion))
            if self.supplier_delivery_date_quantity.material_supplier.discount:
                discount = self.supplier_delivery_date_quantity.material_supplier.discount / 100
                discounted_price = total_cost * discount
                total_cost = round(total_cost-discounted_price, 2)
            total_cost = round(total_cost, 2)
        return total_cost
         
    def get_order_quantity(self):
        qs = GeneralPOMaterialQuantity.objects.filter(
            material=self.supplier_delivery_date_quantity.material_supplier.supplier_material.customer_brand_material,
            general_po=self.supplier_delivery_date_quantity.material_supplier.general_po_supplier.general_po,
        )
        normalized_unit = self.supplier_delivery_date_quantity.material_supplier.supplier_material.customer_brand_material.material_normalized_measuring_unit
        quantity = calculate_queryset_total_normalized_quantity(qs, normalized_unit, 'order_quantity', 'order_quantity_units')
        return quantity
    
    def get_grn_quantity(self):
        return self.get_normalized_quantity()

    def get_price(self):
        price = self.calculate_quantity_price()
        data = get_amount_dictionary(price)
        return data


class SupplierPO(BaseAbstractModel):
    # po_club = models.ForeignKey('marketing.ActualPOClub', on_delete=models.DO_NOTHING)
    # general_po = models.ForeignKey(GeneralPO, on_delete=models.DO_NOTHING)
    # supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE)
    general_po_supplier = models.OneToOneField(GeneralPOSupplier, on_delete=models.CASCADE)
    supplier_po_number = models.CharField(max_length=300)
    supplier_po_file = models.ForeignKey(FileAttachment, on_delete=models.CASCADE, null=True)
    supplier_po_file_with_po_wise_breakdown = models.ForeignKey(FileAttachment, on_delete=models.CASCADE, null=True, related_name='supplier_po_file_with_po_wise_breakdown')
    supplier_po_history_files = models.ManyToManyField(FileAttachment, related_name='supplier_po_history_files')
    proforma_invoice = models.ForeignKey(FileAttachment, on_delete=models.SET_NULL, null=True, related_name='proforma_invoices')
    proforma_invoice_supplier_display_number = models.CharField(max_length=300, null=True)
    total_price = models.FloatField(null=True)
    total_price_currency = models.CharField(max_length=100, choices=CurrencyHelper.CURRENCY_CHOICES, default=CurrencyHelper.USD_CURRENCY)
    advance_payment = models.FloatField(null=True)
    advance_payment_currency = models.CharField(max_length=100, choices=CurrencyHelper.CURRENCY_CHOICES, default=CurrencyHelper.USD_CURRENCY)
    advance_payment_due_date = models.DateField(null=True)
    advance_payment_outgoing_payment = models.ForeignKey(OutgoingPayment, on_delete=models.SET, null=True)
    #TODO chenge advance_payment_outgoing_payment to advance_payment_pcl and link SupplierPODeliveryInvoicePCL
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
        (REJECTED_STATE, 'Rejected'),
    )

    state = models.CharField(max_length=200, choices=STATE_OPTIONS, default=DRAFT_STATE)
    discount = models.FloatField(default=0)
    po_sent_date = models.DateTimeField(null=True)
    proforma_invoice_date = models.DateField(null=True)
    plant = models.ForeignKey(Plant, on_delete=models.CASCADE, null=True)
    email = models.CharField(max_length=500, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    contact_person = models.CharField(max_length=200, null=True)

    customer = models.ForeignKey('shared.Customer', on_delete=models.SET_NULL, null=True)
    delivery_mode = models.CharField(max_length=20, choices=SHIPPING_MODE_TYPES, null=True)
    payment_term = models.CharField(max_length=20, choices=PAYMENT_METHOD_TYPES, null=True)
    terms_of_delivery = models.CharField(choices=COSTING_MODE_TYPES, max_length=100, null=True)

    #VAT Reg No
    value_added_tax_registration_number = models.CharField(max_length=200, blank=True)
    #SVAT Reg No
    simplified_value_added_tax_registration_number = models.CharField(max_length=200, blank=True)
    #BOI Reg No
    board_of_investment_registration_number = models.CharField(max_length=200, blank=True)

    prepared_by = models.ForeignKey('shared.User', on_delete=models.SET_NULL, null=True, related_name='supplier_po_prepared_by')
    checked_by = models.ForeignKey('shared.User', on_delete=models.SET_NULL, null=True, related_name='supplier_po_checked_by')

    def get_supplier_po_file_name(self):
        str_date = datetime.today().strftime('%Y-%m-%d')
        file_name = f'SPO{self.id:06}_{str_date}.pdf'
        return file_name

    def get_supplier_po_file_po_wise_name(self):
        str_date = datetime.today().strftime('%Y-%m-%d')
        file_name = f'SPO{self.id:06}_PO_Wise_{str_date}.pdf'
        return file_name

    def set_supplier_po_number(self):
        str_date = datetime.today().strftime('%Y-%m-%d')
        po_number = f'SPO{self.id:06}'
        self.supplier_po_number = po_number
        self.save()

    def pi_display_number(self):
        pi_display  = '%s - %s' % (self.supplier_po_number, self.proforma_invoice_supplier_display_number)
        return pi_display
    
    def set_new_supplier_po_file(self, file: FileAttachment):
        if file:
            if self.supplier_po_file:
                self.supplier_po_history_files.add(self.supplier_po_file.id)
            self.supplier_po_file = file
            self.save()

    @property
    def display_number(self):
        return self.supplier_po_number

    @cached_property
    def general_po(self):
        return self.general_po_supplier.general_po

    @cached_property
    def po_club(self):
        return self.general_po.po_club

    @property
    def supplier_po_delivery_dates(self):
        # po_deliveries = SupplierDeliveryDate.objects.filter(general_po_supplier=self.general_po_supplier).order_by('confirmed_delivery_date')
        po_deliveries = self.general_po_supplier.supplierdeliverydate_set.all().order_by('confirmed_delivery_date')
        return po_deliveries

    def get_supplier_due_term(self):
        due_days = 60 # TODO Need to develop this to get from Supplier Model. This is to get how long to make a payment to the supplier.
        return due_days

    def get_material_excess_threshold(self, supplier_material):
        supplier_material_detail = get_object_or_none(GeneralPOSupplierMaterialPrice, {'general_po_supplier': self.general_po_supplier, 'supplier_material': supplier_material})
        excess = supplier_material_detail.excess_threshold
        return excess
    
    def get_material_order_price(self, supplier_material):
        supplier_material_detail = get_object_or_none(GeneralPOSupplierMaterialPrice, {'general_po_supplier': self.general_po_supplier, 'supplier_material': supplier_material})
        order_price = supplier_material_detail.order_price
        return order_price

    # This was reviewed 7/21 (remove comment after GRN completion)
    def get_supplier_po_material_list(self):
        delivery_dates = self.get_all_delivery_dates()
        material_ids = SupplierDeliveryDateQuantity.objects.filter(
            supplier_delivery_date__in=delivery_dates
        ).exclude(supplier_delivery_date=None).values_list('material_supplier__supplier_material', flat=True).distinct()
        materials = SupplierCustomerBrandMaterial.objects.filter(id__in=material_ids)
        return materials

    def get_all_delivery_dates(self):
        all_deliveries = SupplierDeliveryDate.objects.filter(
            general_po_supplier=self.general_po_supplier
        ).order_by('confirmed_delivery_date')
        return all_deliveries

    def get_pack_list(self):
        supplier_po_delivery_invoice_ids = self.supplier_po_delivery_dates.values_list('actual_delivery_date__supplier_po_delivery_invoice', flat=True)
        pack_list = SupplierPODeliveryInvoicePackList.objects.filter(supplier_po_delivery_note__supplier_po_delivery_invoice_id__in=supplier_po_delivery_invoice_ids)
        return pack_list

    # This was reviewed 7/26 (post model changes)
    def get_material_delivery_dates(self, supplier_material):
        all_deliveries = self.get_all_delivery_dates()
        delivery_ids = SupplierDeliveryDateQuantity.objects.filter(
            material_supplier__supplier_material=supplier_material,
            supplier_delivery_date__in=all_deliveries
        ).values_list('supplier_delivery_date_id', flat=True)
        deliveries = SupplierDeliveryDate.objects.filter(pk__in=delivery_ids).order_by('confirmed_delivery_date')
        return deliveries

    def get_invoices(self):
        supplier_po_delivery_invoice_ids = SupplierActualDeliveryDate.objects.filter(supplier_po=self).values_list('supplier_po_delivery_invoice', flat=True)
        invoices = SupplierPODeliveryInvoice.objects.filter(pk__in=supplier_po_delivery_invoice_ids)
        return invoices

    def get_material_categories(self):
        user_define_material_ids = self.get_supplier_po_material_list().values_list('customer_brand_material__material_detail__generic_material__user_material',flat=True).distinct()
        user_define_materials = UserDefinedMaterial.objects.filter(id__in=user_define_material_ids)
        return user_define_materials

    def get_material_category_flat_list(self):
        user_define_material_ids = self.get_supplier_po_material_list().values_list('customer_brand_material__material_detail__generic_material__user_material',flat=True).distinct()
        material_categories = UserDefinedMaterial.objects.filter(id__in=user_define_material_ids).order_by(
            'display_order'
        ).distinct().values_list('material', flat=True)
        return material_categories

    def get_materials(self, user_define_material):
        material_ids = SupplierDeliveryDateQuantity.objects.filter(
            material_supplier__general_po_supplier__supplierpo=self,
            material_supplier__supplier_material__customer_brand_material__material_detail__generic_material__user_material=user_define_material
        ).values_list('material_supplier__supplier_material__customer_brand_material', flat=True).distinct()
        materials = CustomerBrandMaterial.objects.filter(id__in=material_ids)
        return materials
    
    def get_material_types(self):
        supplier_materials = self.get_supplier_po_material_list()
        material_types = supplier_materials.values_list(
            'customer_brand_material__material_detail__generic_material__user_material__material', flat=True
        ).order_by('customer_brand_material__material_detail__generic_material__user_material__display_order').distinct()
        return list(material_types)

    def get_grns(self):
        return self.supplierpogrn_set.all()

    def get_completed_grns(self):
        return self.get_grns().filter(state=SupplierPOGRN.GRN_COMPLETE)

    # DS Reviewed 08/01
    def get_last_expected_delivery_for_material(self, supplier_material):
        delivery_dates = self.get_material_delivery_dates(supplier_material).order_by('-confirmed_delivery_date')
        last_delivery_date = None
        if delivery_dates.exists():
            last_delivery_date = delivery_dates[0]
        return last_delivery_date

    def copy_po_club_shades(self):
        from marketing.models import POClubShade
        po_club_ids = GeneralPO.objects.filter(
            costing=self.general_po_supplier.general_po.costing
        ).values_list('po_club', flat=True)
        if po_club_ids:
            club_shades = POClubShade.objects.filter(
                po_club__in=po_club_ids
            )
            for club_shade in club_shades:
                supplier_po_shade, created = SupplierPOFabricShade.objects.get_or_create(
                    supplier_po=self,
                    material=club_shade.material,
                    copied_from=club_shade,
                    shade_name=club_shade.shade_name
                )
                if created:
                    supplier_po_shade.shade_swatch=club_shade.shade_swatch,
                    supplier_po_shade.save()

    def copy_color_tones(self):
        from marketing.models import POClubMaterialColorTone
        po_club_ids = GeneralPO.objects.filter(
            costing=self.general_po_supplier.general_po.costing
        ).values_list('po_club', flat=True)
        if po_club_ids:
            club_tones = POClubMaterialColorTone.objects.filter(
                po_club__in=po_club_ids
            )
            for club_tone in club_tones:
                supplier_po_color_tone, created = SupplierPOFabricColorTone.objects.get_or_create(
                    supplier_po=self,
                    material=club_tone.material
                )
                supplier_po_color_tone.copied_from = club_tone
                supplier_po_color_tone.save()
                supplier_po_color_tone.acceptable_color_tones.set(club_tone.acceptable_color_tones.all())

    def get_fabric_acceptable_color_tone(self, material):
        acceptable_color_tones = None
        po_club_material_color_tone = get_object_or_none(SupplierPOFabricColorTone,
            {'supplier_po': self, 'material' :material.customer_brand_material}
        )
        if po_club_material_color_tone:
            acceptable_color_tones = po_club_material_color_tone.acceptable_color_tones.all()
        return acceptable_color_tones

    def get_po_club_or_none(self):
        po_club = None
        if self.general_po_supplier.general_po.po_club:
            po_club = self.general_po_supplier.general_po.po_club
        return po_club

    # This returns the quantity needed for something to be marked as an excess ir deficit
    def get_shortage_and_excess_quantity(self, supplier_material):
        threshold = self.get_material_excess_threshold(supplier_material)
        order_quantity = self.get_supplier_po_material_quantity(supplier_material)['pi_quantity']
        data = {
            'excess': {
                'quantity': order_quantity['quantity'],
                'quantity_units': order_quantity['quantity_units'],
            },
            'deficit': {
                'quantity': order_quantity['quantity'],
                'quantity_units': order_quantity['quantity_units'],
            }
        }
        if threshold:
            data['excess']['quantity'] = math.ceil(order_quantity['quantity'] * (100 + threshold) / 100)
            data['deficit']['quantity'] = math.ceil(order_quantity['quantity'] * (100 - threshold) / 100)
        return data

    def get_supplier_po_deliveries_replacement_quantity(self, supplier_material, delivery_date_qs):
        material_unit = supplier_material.customer_brand_material.material_normalized_measuring_unit
        po_planned_replacements = ReplacementQuantityDeliveryDate.objects.filter(
            replacement_expected_delivery_date__in=delivery_date_qs,
            supplier_po_grn_material__grn_material=supplier_material
        )
        po_planned_replacement_quantity = calculate_queryset_total_normalized_quantity(po_planned_replacements, material_unit, 'quantity', 'quantity_units')
        return get_quantity_dictionary(po_planned_replacement_quantity, material_unit)

    def get_supplier_po_grn_material_summary(self, supplier_material):
        from supplier_po.helpers.summary_calculator_helper import GRNMaterialSummaryCalculatorMixin
        supplier_po_grns = self.get_completed_grns()
        data = GRNMaterialSummaryCalculatorMixin().get_grns_data_summary(supplier_po_grns, supplier_material, supplier_material.customer_brand_material.material_normalized_measuring_unit)
        return data

    def get_supplier_po_material_quantity(self, supplier_material, deliveries_qs=None):
        material_unit = supplier_material.customer_brand_material.material_normalized_measuring_unit

        if deliveries_qs is None:
            deliveries_qs = self.get_material_delivery_dates(supplier_material)
        delivery_quantities = SupplierDeliveryDateQuantity.objects.filter(
            material_supplier__supplier_material=supplier_material,
            supplier_delivery_date__in=deliveries_qs
        )

        total_quantity = calculate_queryset_total_normalized_quantity(delivery_quantities, material_unit, 'quantity', 'quantity_units')
        pi_total_quantity = calculate_queryset_total_normalized_quantity(delivery_quantities, material_unit, 'proforma_invoice_quantity', 'proforma_invoice_quantity_units')
        quantity = {
            'requested_quantity': get_quantity_dictionary(total_quantity, material_unit),
            'pi_quantity': get_quantity_dictionary(pi_total_quantity, material_unit)
        }
        return quantity

    def get_material_purchase_order_allocated_quantity(self, supplier_material, purchase_order, delivery_dates_qs=None):
        material_normalized_unit = supplier_material.customer_brand_material.material_normalized_measuring_unit
        po_allocations = SupplierDeliveryDateQuantityPOAllocation.objects.filter(
            purchase_order=purchase_order,
            supplier_delivery_date_quantity__supplier_delivery_date__general_po_supplier=self.general_po_supplier,
            supplier_delivery_date_quantity__material_supplier__supplier_material__customer_brand_material=supplier_material.customer_brand_material
        )

        if delivery_dates_qs:
            po_allocations = po_allocations.filter(supplier_delivery_date_quantity__supplier_delivery_date__in=delivery_dates_qs)

        requested_quantity = calculate_queryset_total_normalized_quantity(po_allocations, material_normalized_unit, 'quantity', 'quantity_units')
        pi_quantity = calculate_queryset_total_normalized_quantity(po_allocations, material_normalized_unit, 'proforma_invoice_quantity', 'proforma_invoice_quantity_units')
        data = {
            'requested_quantity': get_quantity_dictionary(requested_quantity, material_normalized_unit),
            'pi_quantity': get_quantity_dictionary(pi_quantity, material_normalized_unit),
        }
        return data

    def get_payment_term_display_list(self):
        payment_terms = []
        payment_method_dict = dict(OutgoingPayment.PAYMENT_METHOD_CHOICES)
        if self.advance_payment_outgoing_payment:
            payment_terms.append('Advance')
        invoice_ids = self.get_invoices().values_list('id', flat=True)
        invoice_ct = ContentType.objects.get_for_model(SupplierPODeliveryInvoice)
        payment_methods = SupplierPODeliveryInvoicePCL.objects.filter(
            entity_id__in=invoice_ids,
            entity_type=invoice_ct
        ).values_list('outgoing_payment__payment_method', flat=True)
        for payment_method in payment_methods:
            display_value = payment_method_dict.get(payment_method)
            if display_value:
                payment_terms.append(display_value)
        return payment_terms

    def get_supplier_payment_term(self):
        payment_term = None
        payment_method_dict = dict(PAYMENT_METHOD_TYPES)
        payment_method = self.general_po_supplier.supplier.payment_term
        if payment_method:
            payment_term = payment_method_dict.get(payment_method)
        return payment_term

    def get_supplier_country(self):
        country = None
        supplier_location = self.general_po_supplier.supplier.supplier_location
        if supplier_location and supplier_location.country:
            country = supplier_location.country.name
        return country

    def get_shipment_time(self):
        shipment_time = 0
        if  self.general_po_supplier.supplier.ex_fty_to_inhouse:
            shipment_time = self.general_po_supplier.supplier.ex_fty_to_inhouse
        else:
            shipment_time = self.general_po_supplier.supplier.fob_to_inhouse
        return shipment_time
    
    def get_outgoing_payments(self):
        outgoing_payment_ids = SupplierPODeliveryInvoicePCL.objects.filter(
            entity_type=ContentType.objects.get_for_model(SupplierPO),
            entity_id=self.id
        ).values_list('outgoing_payment', flat=True)
        outgoing_payments = OutgoingPayment.objects.filter(pk__in=outgoing_payment_ids)
        return outgoing_payments
    
    def get_supplier_po_invoice_outgoing_payments(self):
        outgoing_payment_ids = SupplierPODeliveryInvoicePCL.objects.filter(
            entity_type=ContentType.objects.get_for_model(SupplierPODeliveryInvoice),
            entity_id__in=self.get_invoices().values_list('pk', flat=True)
        ).values_list('outgoing_payment', flat=True)
        outgoing_payments = OutgoingPayment.objects.filter(pk__in=outgoing_payment_ids)
        return outgoing_payments
    
    def get_supplier_po_all_outgoing_payments(self):
        from itertools import chain
        supplier_po_outgoing_payments = self.get_outgoing_payments()
        supplier_po_invoice_outgoing_payments = self.get_supplier_po_invoice_outgoing_payments()
        outgoing_payments = OutgoingPayment.objects.filter(
            pk__in=chain(
            supplier_po_outgoing_payments.values_list('pk', flat=True),
            supplier_po_invoice_outgoing_payments.values_list('pk', flat=True)
        )
        )
        return outgoing_payments
    
    def get_supplier_po_delivery_invoice_pcls(self):
        supplier_po_delivery_invoice_pcls = SupplierPODeliveryInvoicePCL.objects.filter(
            entity_type=ContentType.objects.get_for_model(SupplierPO),
            entity_id=self.id
        )
        return supplier_po_delivery_invoice_pcls
    
    def get_due_amount(self):
        due_amount = 0
        if self.advance_payment:
            due_amount = self.advance_payment
        data = get_amount_dictionary(due_amount)
        return data
    
    def get_balance_amount(self):
        balance_amount = 0
        total_outgoing_amount = self.get_supplier_po_delivery_invoice_pcls().aggregate(
            total_outgoing=Sum('amount')
        )['total_outgoing'] or 0
        if self.advance_payment:
            balance_amount = self.advance_payment - total_outgoing_amount
        data = get_amount_dictionary(balance_amount)
        return data
    
    def get_paid_amount(self):
        total_outgoing_amount = self.get_supplier_po_delivery_invoice_pcls().aggregate(total_outgoing=Sum('amount'))['total_outgoing'] or 0
        data = get_amount_dictionary(total_outgoing_amount)
        return data
    
    def get_costing_or_po_club(self):
        if self.general_po_supplier.general_po.po_club:
            return self.general_po_supplier.general_po.po_club
        else:
            return self.general_po_supplier.general_po.costing
        
    def get_customer(self):
        return self.general_po_supplier.general_po.costing.order.customer
        
    def get_payment_term(self):
        return self.get_supplier_payment_term()
    
    def get_po_approval_users(self):
        from shared.models import Role, User
        from shared.approvals.constants.approval_choices import SUPPLIER_PO_APPROVAL
        from shared.permissions.roles import SUPPLIER_PO_APPROVER
        role = Role.objects.get(name=SUPPLIER_PO_APPROVER)
        supplier_po_approver_users = role.users.all()
        customer = self.general_po_supplier.general_po.costing.order.customer

        customer_merchants = User.objects.filter(
            customermerchant__customer=customer,
            customermerchant__is_admin=True
        )
        users = supplier_po_approver_users.filter(id__in=customer_merchants.values_list('id', flat=True))
        return users

    def create_approval(self, users, action_user, approval):
        from shared.approvals.utils import ApprovalUtils
        from shared.approvals.constants.task_entities import SUPPLIER_PO_ENTITY
        from shared.approvals.constants.approval_choices import get_approval_display_value
        approval_entity_data = []
        approval_entity_data.append({
            'entity_id': self.id,
            'entity_name': SUPPLIER_PO_ENTITY
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
                print("found text ", found_text)
                if page_height:
                    y0 = page_height - y0
                    y1 = page_height - y1
                found = True
                break
        return found, ((x0, y0), (x1, y1))
    
    def set_approval(self, approval_status):
        if self.supplier_po_file:
            supplier_po_pdf_file_path_url = self.supplier_po_file.file_path
            file_path = handle_file_read(supplier_po_pdf_file_path_url)
            
            position_doc = fitz.open(file_path)
            position_doc_page = position_doc[0]
            checked_by = self.checked_by.first_name if self.checked_by else ' '
            with open(file_path, "rb") as original_file:
                original_pdf = PdfReader(original_file)
                packet = BytesIO()
                supplier_po_pdf_file = Canvas(packet)
                page_height = float(original_pdf.pages[0].mediabox.height)
                found, position = self.get_text_position_in_pdf('Checked', position_doc_page, page_height)
                if found:
                    x = position[1][0] + 17
                    y = position[1][1] + 2
                else:
                    x = 446
                    y = 506
                
                supplier_po_pdf_file.setFillColorRGB(0, 0, 0)
                supplier_po_pdf_file.setFontSize(8)
                supplier_po_pdf_file.drawString(x, y, checked_by)

                supplier_po_pdf_file.setFontSize(18)
                if found:
                    x = position[0][0] + 35
                    y = position[0][1] - 50
                else:
                    x = 440
                    y = 465
                if approval_status == Approval.APPROVED_APPROVAL:
                    supplier_po_pdf_file.setFillColorRGB(0, 0, 0)
                    supplier_po_pdf_file.drawString(x, y, "Approved")
                elif approval_status == Approval.REJECTED_APPROVAL:
                    supplier_po_pdf_file.setFillColorRGB(1, 0, 0)
                    supplier_po_pdf_file.drawString(x, y, "Rejected")
                supplier_po_pdf_file.save()
                packet.seek(0)
                overlay_pdf = PdfReader(packet)
                pdf_writer = PdfWriter()
                for i, page in enumerate(original_pdf.pages):
                    if i == 0:
                        page.merge_page(overlay_pdf.pages[0])
                    pdf_writer.add_page(page)

            if self.po_club:
                save_path = 'supplier_pos/%s' % (str(self.po_club.display_number), )
            elif self.general_po_supplier.general_po:
                save_path = 'general_supplier_pos/%s' % (str(self.general_po_supplier.general_po.display_number), )
            else:
                save_path = 'supplier_pos'

            file_name = self.get_supplier_po_file_name()
            
            with NamedTemporaryFile(mode='wb', suffix='.pdf', delete=False) as tmp:
                
                pdf_writer.write(tmp)
                tmp.flush()
                tmp_path = tmp.name
            
            with open(tmp_path, mode='rb') as file:
                saved_file = handle_uploaded_file(file, save_path, file_name)
                file_attachment = FileAttachment.objects.create(display_name='Ritz Supplier PO', type='.pdf',
                                                                file_path=saved_file)
                self.set_new_supplier_po_file(file_attachment)






class SupplierPOFabricShade(BaseAbstractModel):
    supplier_po = models.ForeignKey(SupplierPO, on_delete=models.CASCADE)
    material = models.ForeignKey(CustomerBrandMaterial, on_delete=models.DO_NOTHING)
    shade_name = models.CharField(max_length=500)
    shade_swatch = models.ForeignKey(FileAttachment, on_delete=models.CASCADE, null=True)
    display_order = models.IntegerField(null=True)
    copied_from = models.ForeignKey('marketing.POClubShade', on_delete=models.SET_NULL, null=True)


class SupplierPOClubMaterialShadeMapping(BaseAbstractModel):
    po_club_shade = models.ForeignKey('marketing.POClubShade', on_delete=models.CASCADE)
    supplier_po_shade = models.ForeignKey('supplier_po.SupplierPOFabricShade', on_delete=models.CASCADE)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields = ('po_club_shade', 'supplier_po_shade'),
                name='unique_po_club_shade_supplier_po_shade'
            )
        ]


class SupplierPOFabricColorTone(BaseAbstractModel):
    supplier_po = models.ForeignKey(SupplierPO, on_delete=models.CASCADE)
    material = models.ForeignKey(CustomerBrandMaterial, on_delete=models.DO_NOTHING)
    acceptable_color_tones = models.ManyToManyField(FabricColorTone)
    copied_from = models.ForeignKey('marketing.POClubMaterialColorTone', on_delete=models.SET_NULL, null=True)


class SupplierPODeliveryInvoice(BaseAbstractModel):
    invoice = models.ForeignKey(FileAttachment, on_delete=models.SET_NULL, null=True)
    supplier_invoice_number = models.CharField(max_length=500)

    OPEN_STATE = 'open'
    GRN_FINALIZED_STATE = 'grn_finalized'
    REMEDIATION_FINALIZED_STATE = 'remediation_finalized'
    CLOSED_STATE = 'closed'
    CANCELED_STATE = 'canceled'
    CI_STATE_CHOICES = (
        (OPEN_STATE, 'Open'),
        (GRN_FINALIZED_STATE, 'GRN Finalized'),
        (REMEDIATION_FINALIZED_STATE, 'Remediation Finalized'),
        (CLOSED_STATE, 'Closed'),
        (CANCELED_STATE, 'Canceled')
    )
    ci_state = models.CharField(max_length=100, choices=CI_STATE_CHOICES, default=OPEN_STATE)
    #payment = models.ForeignKey(OutgoingPayment, on_delete=models.SET_NULL, null=True)
    payment_due_date = models.DateField(null=True)
    calculated_total_price = models.FloatField(null=True)
    calculated_total_price_currency = models.CharField(max_length=100, choices=CurrencyHelper.CURRENCY_CHOICES, default=CurrencyHelper.USD_CURRENCY)
    calculated_debit_note_total_amount = models.FloatField(null=True)
    calculated_debit_note_total_amount_currency = models.CharField(max_length=100, choices=CurrencyHelper.CURRENCY_CHOICES, default=CurrencyHelper.USD_CURRENCY)
    debit_note_total_amount = models.FloatField(null=True)
    debit_note_total_amount_currency = models.CharField(max_length=100, choices=CurrencyHelper.CURRENCY_CHOICES, default=CurrencyHelper.USD_CURRENCY)
    total_price = models.FloatField(null=True)
    total_price_currency = models.CharField(max_length=100, choices=CurrencyHelper.CURRENCY_CHOICES, default=CurrencyHelper.USD_CURRENCY)

    @property
    def display_number(self):
        return f"INV{self.id:06}"
    
    def move_to_next_state(self, new_state):
        state_transition_errors = []
        if new_state == self.GRN_FINALIZED_STATE and self.ci_state == self.OPEN_STATE:
            self.ci_state = self.GRN_FINALIZED_STATE
            self.set_calculated_values()
        elif new_state == self.REMEDIATION_FINALIZED_STATE and self.ci_state == self.GRN_FINALIZED_STATE:
            self.ci_state = self.REMEDIATION_FINALIZED_STATE
        elif new_state == self.CLOSED_STATE and self.ci_state == self.REMEDIATION_FINALIZED_STATE:
            self.ci_state = self.CLOSED_STATE
        elif new_state == self.CANCELED_STATE and self.ci_state in [self.OPEN_STATE, self.GRN_FINALIZED_STATE, self.REMEDIATION_FINALIZED_STATE, self.CLOSED_STATE]:
            self.ci_state = self.CANCELED_STATE
        else:
            pass
        self.save()
        return state_transition_errors

    def get_invoice_delivery_notes(self):
        delivery_notes = self.supplierpoinvoicedeliverynote_set.all()
        return delivery_notes

    def get_invoice_pack_lists(self):
        dns = self.get_invoice_delivery_notes()
        pack_lists = SupplierPODeliveryInvoicePackList.objects.filter(supplier_po_delivery_note__in=dns)
        return pack_lists

    def get_all_invoice_grns(self, completed=False):
        pack_lists = self.get_invoice_pack_lists()
        grns = SupplierPOGRN.objects.filter(supplier_pack_list__in=pack_lists).order_by('id')
        if completed:
            grns = grns.filter(state=SupplierPOGRN.GRN_COMPLETE)
        return grns

    def get_supplier_po_invoice_grns(self, supplier_po, completed=True):
        grns = self.get_all_invoice_grns(completed).filter(supplier_po=supplier_po)
        return grns

    def get_supplier_pos(self):
        supplier_po_ids = self.supplieractualdeliverydate_set.all().values_list('supplier_po_id', flat=True)
        supplier_pos = SupplierPO.objects.filter(pk__in=supplier_po_ids)
        return supplier_pos
    
    def get_all_delivery_dates(self):
        supplier_actual_delivery_dates = self.supplieractualdeliverydate_set.all()
        all_deliveries = SupplierDeliveryDate.objects.filter(
            actual_delivery_date__in=supplier_actual_delivery_dates
        )
        return all_deliveries

    def get_supplier_po_actual_delivery_date(self, supplier_po):
        delivery_date = self.supplieractualdeliverydate_set.get(supplier_po=supplier_po)
        return delivery_date

    def get_invoice_supplier_delivery_dates(self, supplier_po):
        actual_delivery = self.get_supplier_po_actual_delivery_date(supplier_po)
        supplier_deliveries = SupplierDeliveryDate.objects.filter(actual_delivery_date=actual_delivery)
        return supplier_deliveries

    def get_invoice_material_delivery_dates(self, supplier_material, supplier_po):
        invoice_delivery_dates = self.get_invoice_supplier_delivery_dates(supplier_po).values_list('id', flat=True)
        deliveries = supplier_po.get_material_delivery_dates(supplier_material).filter(pk__in=invoice_delivery_dates)
        return deliveries

    def get_debit_notes(self):
        debit_notes = self.debitnote_set.all()
        return debit_notes

    def get_active_debit_note(self):
        active_states = DebitNote.ACTIVE_STATES
        debit_note = get_object_or_none_qs(self.get_debit_notes(), {'status__in': active_states})
        return debit_note

    def get_supplier_deliveries_from_replacement_deliveries(self, grn_material):
        supplier_delivery_ids = ReplacementQuantityDeliveryDate.objects.filter(
            supplier_po_grn_material=grn_material
        ).values_list('replacement_expected_delivery_date', flat=True)
        supplier_deliveries = SupplierDeliveryDate.objects.filter(id__in=supplier_delivery_ids)
        return supplier_deliveries

    def get_is_editable(self):
        is_editable = True
        if self.ci_state == SupplierPODeliveryInvoice.CLOSED_STATE:
            return False
        return is_editable
    
    def get_total_price_based_on_supplier_pos(self):
        total_price = 0
        supplier_pos = self.get_supplier_pos()
        grn_materials = SupplierPOGRNMaterial.objects.filter(
            supplier_po_grn__supplier_po__in=supplier_pos
        )
        calculated_total_price = calculate_queryset_total_amount_normalized_amount(grn_materials, 'total_price', CurrencyHelper.USD_CURRENCY)
        return calculated_total_price
    
    def get_calculated_total_price_based_on_supplier_pos(self):
        total_price = 0
        supplier_pos = self.get_supplier_pos()
        grn_materials = SupplierPOGRNMaterial.objects.filter(
            supplier_po_grn__supplier_po__in=supplier_pos
        )
        for grn_material in grn_materials:
            order_price = grn_material.supplier_po_grn.supplier_po.get_material_order_price(grn_material.grn_material)
            materia_total_price = grn_material.total_indicated_quantity * order_price
            total_price += materia_total_price
        return total_price
    
    def get_calculated_debit_note_amount_for_all_supplier_pos(self): 
        debit_notes = self.get_debit_notes()
        total_debit_note_amount = 0
        for debit_note in debit_notes:
            debit_note_materials = debit_note.debitnotematerial_set.all()
            total_debit_note_amount += calculate_queryset_total_amount_normalized_amount(debit_note_materials, 'total_price', CurrencyHelper.USD_CURRENCY)
        return total_debit_note_amount
    
    def set_calculated_values(self):
        total_price = self.get_total_price_based_on_supplier_pos()
        calculated_total_price = self.get_calculated_total_price_based_on_supplier_pos()
        calculated_debit_note_amount = self.get_calculated_debit_note_amount_for_all_supplier_pos()
        self.total_price = total_price
        self.calculated_total_price = calculated_total_price
        self.calculated_debit_note_total_amount = calculated_debit_note_amount
        self.save()

    def get_outgoing_payments(self):
        outgoing_payment_ids = SupplierPODeliveryInvoicePCL.objects.filter(
            entity_type=ContentType.objects.get_for_model(SupplierPODeliveryInvoice),
            entity_id=self.id
        ).values_list('outgoing_payment', flat=True)
        outgoing_payments = OutgoingPayment.objects.filter(pk__in=outgoing_payment_ids)
        return outgoing_payments
    
    def get_supplier_po_delivery_invoice_pcl(self):
        pcls = SupplierPODeliveryInvoicePCL.objects.filter(
            entity_type=ContentType.objects.get_for_model(SupplierPODeliveryInvoice),
            entity_id=self.id
        )
        return pcls
    
    def get_covered_po_clubs(self):
        from marketing.models import ActualPOClub, PCLBankInformationLinkedPOClub
        pcl_bank_information_ids = self.get_outgoing_payments().values_list('pcl_bank_information', flat=True)
        po_club_ids = PCLBankInformationLinkedPOClub.objects.filter(pcl_bank_information_id__in=pcl_bank_information_ids).values_list('po_club', flat=True)
        po_clubs = ActualPOClub.objects.filter(pk__in=po_club_ids)
        return po_clubs
    
    def get_due_amount(self):
        total_price = 0
        if self.total_price:
            total_price = self.total_price
        data = get_amount_dictionary(total_price)
        return data
    
    def get_balance_amount(self):
        total_balance_amount = 0
        supplier_pos = self.get_supplier_pos()
        #total_advance_amount = supplier_pos.filter().aggregate(total_advance=Sum('advance_payment'))['total_advance'] or 0
        total_outgoing_amount = self.get_supplier_po_delivery_invoice_pcl().aggregate(total_outgoing=Sum('amount'))['total_outgoing'] or 0
        total_debit_note_amount = self.get_calculated_debit_note_amount_for_all_supplier_pos()
        if self.total_price:
            total_balance_amount = self.total_price - (total_outgoing_amount + total_debit_note_amount)
        data = get_amount_dictionary(total_balance_amount)
        return data
    
    def get_paid_amount(self):
        total_outgoing_amount = self.get_supplier_po_delivery_invoice_pcl().aggregate(total_outgoing=Sum('amount'))['total_outgoing'] or 0
        data = get_amount_dictionary(total_outgoing_amount)
        return data

    def get_delivery_invoice_material_list(self):
        delivery_dates = self.get_all_delivery_dates()
        material_ids = SupplierDeliveryDateQuantity.objects.filter(
            supplier_delivery_date__in=delivery_dates
        ).exclude(supplier_delivery_date=None).values_list('material_supplier__supplier_material', flat=True).distinct()
        materials = SupplierCustomerBrandMaterial.objects.filter(id__in=material_ids)
        return materials

    def get_material_types(self):
        supplier_materials = self.get_delivery_invoice_material_list()
        material_types = supplier_materials.values_list(
            'customer_brand_material__material_detail__generic_material__user_material__material', flat=True
        ).order_by('customer_brand_material__material_detail__generic_material__user_material__display_order').distinct()
        return list(material_types)
    
    def get_costing_or_po_club(self):
        supplier_pos = self.get_supplier_pos()
        if supplier_pos:
            supplier_po = self.get_supplier_pos()[0]
            if supplier_po.general_po_supplier.general_po.po_club:
                return supplier_po.general_po_supplier.general_po.po_club
            else:
                return supplier_po.general_po_supplier.general_po.costing
        else:
            return None

    def get_invoice_supplier(self):
        supplier_pos = self.get_supplier_pos()
        if supplier_pos:
            supplier_po = self.get_supplier_pos()[0]
            return supplier_po.general_po_supplier.supplier
        else:
            return None
        
    def get_customer(self):
        supplier_pos = self.get_supplier_pos()
        if supplier_pos:
            supplier_po = self.get_supplier_pos()[0]
            return supplier_po.general_po_supplier.general_po.costing.order.customer
        else:
            return None

    def get_payment_term(self):
        supplier_pos = self.get_supplier_pos()
        if supplier_pos:
            supplier_po = self.get_supplier_pos()[0]
            return supplier_po.get_supplier_payment_term()
        else:
            return None

class SupplierPOInvoiceDeliveryNote(BaseAbstractModel):
    supplier_po_delivery_invoice = models.ForeignKey(SupplierPODeliveryInvoice, on_delete=models.SET_NULL, null=True)
    delivery_note = models.ForeignKey(FileAttachment, on_delete=models.SET_NULL, null=True)
    supplier_display_number = models.CharField(max_length=500, null=True)

    def get_delivery_note_pack_list(self):
        pack_lists = self.supplierpodeliveryinvoicepacklist_set.all().order_by('id')
        return pack_lists

    def get_all_delivery_note_grns(self, completed=False):
        pack_lists = self.get_delivery_note_pack_list().order_by('id')
        grns = SupplierPOGRN.objects.filter(supplier_pack_list__in=pack_lists).order_by('id')

        if completed:
            grns = grns.filter(state=SupplierPOGRN.GRN_COMPLETE)
        return grns

    def get_supplier_po_delivery_note_grns(self, supplier_po, completed=False):
        grns = self.get_all_delivery_note_grns(completed).filter(supplier_po=supplier_po)
        return grns


    # # TODO 7/14 - review this
    # def get_po_club(self):
    #     from marketing.models import ActualPOClub
    #     grns = self.get_delivery_note_grns()
    #     po_club_ids = grns.values_list('supplier_po__po_club', flat=True).distinct()
    #     if len(po_club_ids) > 1:
    #         raise Exception("Supplier PO cannot belong to multiple POClubs")
    #     po_club = ActualPOClub.objects.get(pk=po_club_ids[0])
    #     return po_club

    @property
    def display_number(self):
        return f"DNOTE{self.id:06}"


class SupplierPODeliveryInvoicePackList(BaseAbstractModel):
    supplier_po_delivery_note = models.ForeignKey(SupplierPOInvoiceDeliveryNote, on_delete=models.SET_NULL, null=True)
    pack_list = models.ForeignKey(FileAttachment, on_delete=models.SET_NULL, null=True)
    supplier_display_number = models.CharField(max_length=500, null=True)

    def get_material_delivery_quantity_summary(self, delivery_date, material):
        grn_ids = self.supplierpogrn_set.all().values_list('id', flat=True)
        supplier_po_grn_materials = SupplierPOGRNMaterial.objects.filter(supplier_po_grn__in=grn_ids, grn_material=material, supplier_po_grn__state=SupplierPOGRN.GRN_COMPLETE)
        summary = calculate_material_delivery_quantity_summary(delivery_date, supplier_po_grn_materials, material)
        return summary

    def get_all_pack_list_grns(self, completed=False):
        grns = self.supplierpogrn_set.all().order_by('id')
        if completed:
            grns = grns.filter(state=SupplierPOGRN.GRN_COMPLETE)
        return grns

    def get_supplier_po_pack_list_grns(self, supplier_po, completed=False):
        grns = self.get_all_pack_list_grns(completed).filter(supplier_po=supplier_po)
        return grns


    def get_invoice(self):
        return self.supplier_po_delivery_note.supplier_po_delivery_invoice

    def get_delivery_dates(self):
        actual_delivery_dates = SupplierActualDeliveryDate.objects.filter(supplier_po_delivery_invoice=self.supplier_po_delivery_note.supplier_po_delivery_invoice)
        delivery_dates = SupplierDeliveryDate.objects.filter(actual_delivery_date__in=actual_delivery_dates).order_by('id')
        return delivery_dates

    # TODO 7/14 - review this is this also needed. Cant you get it from delivery note?
    def get_po_club(self):
        from marketing.models import ActualPOClub
        grns = self.get_pack_list_grns()
        po_club_ids = grns.values_list('supplier_po__po_club', flat=True).distinct()
        if len(po_club_ids) > 1:
            raise Exception("Supplier PO cannot belong to multiple POClubs")
        po_club = ActualPOClub.objects.get(pk=po_club_ids[0])
        return po_club

    def get_material_total_excess_quantity(self, material):
        normalized_unit = material.customer_brand_material.material_normalized_measuring_unit
        quantity = 0
        grn_material_details = SupplierPOGRNMaterialDetail.objects.filter(supplier_po_grn_material__grn_material=material, supplier_po_grn_material__supplier_po_grn__supplier_pack_list=self)
        if grn_material_details:
            quantity = calculate_queryset_total_normalized_quantity(grn_material_details, normalized_unit, 'excess_quantity', 'excess_quantity_units')
        data = get_quantity_dictionary(quantity, normalized_unit)
        return data

    @property
    def display_number(self):
        return f"PL{self.id:06}"


class SupplierActualDeliveryDate(BaseAbstractModel):
    delivery_date = models.DateField(auto_now_add=True)
    supplier_po = models.ForeignKey(SupplierPO, on_delete=models.SET_NULL, null=True)
    supplier_po_delivery_invoice = models.ForeignKey(SupplierPODeliveryInvoice, on_delete=models.SET_NULL, null=True)

    def get_actual_delivery_grns(self):
        return self.supplier_po.supplierpogrn_set.all()

    def get_po_club(self):
        return self.supplier_po.po_club

    def get_supplier_delivery_dates(self):
        return self.supplierdeliverydate_set.all().order_by('id')

    def is_last_delivery_for_supplier_po_and_material(self, material):
        last_expected_delivery_date = self.supplier_po.get_last_expected_delivery_for_material(material)
        last_delivery = True
        if last_expected_delivery_date:
            last_delivery = self.supplierdeliverydate_set.filter(pk=last_expected_delivery_date.pk).exists()
        return last_delivery

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields = ('supplier_po', 'supplier_po_delivery_invoice',),
                name='unique_supplier_po_delivery_invoice'
            )
        ]


class SupplierPOGRN(BaseAbstractModel, SupplierPOGRNModelMixin):
    supplier_po = models.ForeignKey(SupplierPO, on_delete=models.CASCADE)
    supplier_pack_list = models.ForeignKey(SupplierPODeliveryInvoicePackList, on_delete=models.SET_NULL, null=True)
    # supplier_delivery_date = models.ForeignKey(SupplierDeliveryDate, on_delete=models.SET_NULL, null=True)
    attachments = models.ManyToManyField(FileAttachment, blank=True)
    remarks = models.CharField(max_length=500, null=True)
    replacement_grn = models.ManyToManyField("self")

    DRAFT_STATE = 'draft'
    QUANTITY_VERIFICATION_STATE = 'quantity_verification'
    QA_VERIFICATION_STATE = 'qa_verification'
    GRN_VERIFICATION = 'grn_verification'
    GRN_COMPLETE = 'grn_complete'
    GRN_CANCEL = 'grn_cancel'
    GRN_REJECTED  = 'grn_rejected'

    STATE_OPTIONS = (
        (DRAFT_STATE, 'Draft'),
        (QUANTITY_VERIFICATION_STATE, 'Quantity Verification'),
        (QA_VERIFICATION_STATE, 'QA Verification'),
        (GRN_VERIFICATION, 'GRN Verification'),
        (GRN_COMPLETE, 'GRN Complete'),
        (GRN_CANCEL, 'GRN Cancel'),
        (GRN_REJECTED, 'GRN Rejected')
    )
    state = models.CharField(max_length=200, choices=STATE_OPTIONS, default=DRAFT_STATE)
    complete_date = models.DateField(null=True)
    calculated_summary = models.BooleanField(default=False)
    warehouse = models.ForeignKey('shared.PlantWarehouse', on_delete=models.SET_NULL, null=True)

    @property
    def grn_number(self):
        return f"GRN{self.id:06}"

    def get_delivery_note(self):
        return self.supplier_pack_list.supplier_po_delivery_note

    def get_invoice(self):
        return self.supplier_pack_list.supplier_po_delivery_note.supplier_po_delivery_invoice

    # def get_supplier_po_from_commercial_invoice(self):
    #     po = self.supplier_pack_list.supplier_po_delivery_note.supplier_po_delivery_invoice.get_supplier_po()
    #     return po

    def get_supplier_po_previous_completed_summary_for_material(self, material):
        from supplier_po.helpers.summary_calculator_helper import GRNMaterialSummaryCalculatorMixin
        po_grns = self.supplier_po.get_completed_grns().exclude(pk__gte=self.pk)
        normalized_unit = material.customer_brand_material.material_normalized_measuring_unit
        summary_data = GRNMaterialSummaryCalculatorMixin().get_grns_data_summary(po_grns, material, normalized_unit)
        return summary_data

    def get_debit_note(self):
        debit_note = get_object_or_none(DebitNote, {'commercial_invoice': self.get_invoice()})
        return debit_note

    def get_actual_delivery_date(self):
        actual_delivery_date = None
        if self.supplier_pack_list.supplier_po_delivery_note.supplier_po_delivery_invoice:
            actual_delivery_date = get_object_or_none(SupplierActualDeliveryDate, {'supplier_po': self.supplier_po, 'supplier_po_delivery_invoice': self.supplier_pack_list.supplier_po_delivery_note.supplier_po_delivery_invoice})
        return actual_delivery_date

    def get_shades(self):
        shade_ids = SupplierPOGRNMaterialDetail.objects.filter(supplier_po_grn_material__supplier_po_grn=self).values_list('shade__supplier_po_shade', flat=True)
        shades = SupplierPOFabricShade.objects.filter(id__in=shade_ids)
        return shades

    def get_grn_fabric_materials(self):
        material_ids = self.supplierpogrnmaterial_set.all().filter(
            grn_material__customer_brand_material__material_detail__generic_material__user_material__category=Material.FABRIC_MATERIAL
        ).values_list('grn_material__customer_brand_material')
        materials = CustomerBrandMaterial.objects.filter(id__in=material_ids).distinct().order_by(
            'material_detail__generic_material__user_material__display_order'
        )
        return materials

    def get_material_categories(self):
        material_ids = SupplierPOGRNMaterial.objects.filter(supplier_po_grn=self).values_list('grn_material__customer_brand_material', flat=True)
        material_categories = CustomerBrandMaterial.objects.filter(id__in=material_ids).distinct().order_by(
            'material_detail__generic_material__user_material__display_order'
        ).values_list('material_detail__generic_material__user_material__material', flat=True)
        return material_categories
    
    def create_approval(self, users, action_user, approval):
        from shared.approvals.utils import ApprovalUtils
        from shared.approvals.constants.task_entities import SUPPLIER_PO_GRN_ENTITY
        from shared.approvals.constants.approval_choices import get_approval_display_value
        approval_entity_data = []
        approval_entity_data.append({
            'entity_id': self.id,
            'entity_name': SUPPLIER_PO_GRN_ENTITY
        })
        approval_display_value = get_approval_display_value(approval)
        ApprovalUtils.assign_approval(users, action_user, approval_entity_data, approval, approval_display_value)
        return True


class SupplierPOGRNMaterial(BaseAbstractModel):
    supplier_po_grn = models.ForeignKey(SupplierPOGRN, on_delete=models.CASCADE)
    # grn_material = models.ForeignKey(CustomerBrandMaterial, on_delete=models.CASCADE)
    grn_material = models.ForeignKey(SupplierInquiryMaterialCode, on_delete=models.CASCADE)
    material_pack_list_attachment = models.ForeignKey(FileAttachment, on_delete=models.CASCADE, null=True)
    total_expected_quantity = models.FloatField(null=True)  # This is indicated quantity/ pack list
    total_expected_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)

    grn_price = models.FloatField(null=True)  # Unit Price
    total_price = models.FloatField(null=True)

    # Calculated fields
    total_actual_quantity = models.FloatField(null=True)
    total_actual_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
    total_qa_rejected_quantity = models.FloatField(null=True)
    total_qa_rejected_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
    total_indicated_quantity = models.FloatField(null=True)
    total_indicated_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)

    # total_qa_passed_quantity = models.FloatField(null=True)
    # total_qa_passed_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
    total_excess_quantity = models.FloatField(null=True, default=0)
    total_excess_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
    total_deficit_quantity = models.FloatField(null=True, default=0)  # Short quantity
    total_deficit_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
    usable_quantity = models.FloatField(null=True, default=0)  # This will be total_grnable_quantity when you in house it
    usable_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
    mismatch_quantity = models.FloatField(null=True, default=0)
    mismatch_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
    width_replacement_quantity = models.FloatField(null=True, default=0)
    width_replacement_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
    calculated_values = models.JSONField(null=True)
    calculated_value_status = models.BooleanField(default=False)
    # End of calculated fields

    # Based on supplier input
    # total_replacement_quantity = models.FloatField(null=True, default=0)
    # total_replacement_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)

    ATTACHMENT_KEY = 'material_pack_list_attachment'
    TOTAL_EXPECTED_QUANTITY_VALUE_KEY = 'total_expected_quantity'
    TOTAL_EXPECTED_QUANTITY_UNITS_VALUE_KEY = 'total_expected_quantity_units'
    ACTUAL_QUANTITY_VALUE_KEY = 'total_actual_quantity'
    ACTUAL_QUANTITY_UNITS_VALUE_KEY = 'total_actual_quantity_units'
    GRN_PRICE_VALUE_KEY = 'grn_price'

    @property
    def total_in_housed_quantity(self):
        # This will return all the accepted quantity
        mh = MaterialUnitHelper()
        material_unit = mh.get_normalized_unit(self.total_actual_quantity_units)
        in_housed_materials = InHouseMaterial.objects.filter(grn_material_detail__supplier_po_grn_material=self, state=InHouseMaterial.ACCEPTED_STATUS)
        total = calculate_queryset_total_normalized_quantity(in_housed_materials, material_unit, 'quantity', 'quantity_units')
        data = {
            'quantity': total,
            'quantity_units': material_unit
        }
        return data

    # @property
    # def total_grnable_quantity(self):  # Change this to total_grned_quantity and add if the excess is in housed
    #     '''
    #     This returns what we can take in to our system after removing any excess and rejected
    #     '''
    #     mh = MaterialUnitHelper()
    #     material_unit = mh.get_normalized_unit(self.total_actual_quantity_units)
    #
    #     qa_passed_quantity = self.total_qa_passed_quantity
    #
    #     normalized_qa_passed_quantity = mh.convert_to_units(material_unit, qa_passed_quantity['total_qa_passed_quantity'], qa_passed_quantity['total_qa_passed_quantity_units'])
    #     grnable_quantity = normalized_qa_passed_quantity
    #     if self.total_excess_quantity > 0:
    #         normalized_excess_quantity = mh.convert_to_units(material_unit, self.total_excess_quantity, self.total_excess_quantity_units)
    #         grnable_quantity = normalized_qa_passed_quantity - normalized_excess_quantity
    #     data = {
    #         'grnable_quantity': grnable_quantity,
    #         'grnable_quantity_units': material_unit,
    #     }
    #     return data

    @property
    def total_qa_passed_quantity(self):
        mh = MaterialUnitHelper()
        material_unit = self.grn_material.customer_brand_material.material_normalized_measuring_unit
        data = {
            'total_qa_passed_quantity': None,
            'total_qa_passed_quantity_units': None,
        }
        if self.supplier_po_grn.state in [SupplierPOGRN.GRN_COMPLETE, SupplierPOGRN.GRN_VERIFICATION]:
            total_actual_quantity = mh.convert_to_units(material_unit, get_float_or_zero(self.total_actual_quantity), self.total_actual_quantity_units)
            total_rejected_quantity = mh.convert_to_units(material_unit, get_float_or_zero(self.total_qa_rejected_quantity), self.total_qa_rejected_quantity_units)
            data['total_qa_passed_quantity'] = total_actual_quantity - total_rejected_quantity
        data['total_qa_passed_quantity_units'] = material_unit
        return data

    def get_quantity_attribute(self, quantity_attribute, quantity_unit_attribute, default_quantity=None):
        quantity = getattr(self, quantity_attribute, None)
        quantity_unit = getattr(self, quantity_unit_attribute, None)
        normalized_unit = self.grn_material.customer_brand_material.material_normalized_measuring_unit
        data = convert_quantity_to_unit(normalized_unit, quantity, quantity_unit)
        # data = {'quantity': quantity, 'quantity_unit': quantity_unit, 'quantity_unit_display': material_helper.all_measuring_units_dictionary.get(quantity_unit, "N/A")}
        return data

    def get_all_material_details(self):
        material_details = self.supplierpogrnmaterialdetail_set.all()
        return material_details

    def get_inspection_passed_material_details(self):
        material_details = self.get_all_material_details().filter(qa_inspection_passed=True)
        return material_details

    def get_inspection_failed_material_details(self):
        material_details = self.get_all_material_details().filter(qa_inspection_passed=False)
        return material_details

    def mark_material_detail_excess_quantity(self, excess_quantity, excess_quantity_units, supplier_po_grn_material_details, quantity_field, quantity_field_units):
        # TODO major - mark only if ci is still open
        total_marked_rolls_quantity = 0
        excess_marked = False
        if excess_quantity > 0:
            for supplier_po_grn_material_detail in supplier_po_grn_material_details:
                remaining_excess_quantity = excess_quantity - total_marked_rolls_quantity
                if quantity_field == 'qa_passed_quantity':
                    qa_passed_quantity = supplier_po_grn_material_detail.qa_passed_quantity
                    quantity = qa_passed_quantity['qa_passed_quantity']
                    quantity_units = qa_passed_quantity['qa_passed_quantity_units']
                else:
                    quantity = getattr(supplier_po_grn_material_detail, quantity_field)
                    quantity_units = getattr(supplier_po_grn_material_detail, quantity_field_units)
                material_detail_quantity = convert_quantity_to_unit(excess_quantity_units, quantity, quantity_units)['quantity']

                # Set full quantity as failed and if it is greater than what is needed only set the partial amount
                roll_excess_quantity = material_detail_quantity
                if remaining_excess_quantity <= material_detail_quantity:
                    roll_excess_quantity = remaining_excess_quantity
                    excess_marked = True

                total_marked_rolls_quantity += roll_excess_quantity
                roll_excess_quantity += supplier_po_grn_material_detail.excess_quantity  # Add any previously marked excess quantity

                supplier_po_grn_material_detail.excess_quantity = roll_excess_quantity
                supplier_po_grn_material_detail.excess_quantity_units = excess_quantity_units
                supplier_po_grn_material_detail.save()

                if excess_marked:
                    break

        data = {
            'quantity': total_marked_rolls_quantity,
            'quantity_units': excess_quantity_units
        }
        return data

    def reset_excess_material_details(self):
        all_material_details = self.get_all_material_details().exclude(excess_quantity=0)
        all_material_details.update(excess_quantity=0)

    def mark_excess_quantity(self, excess_quantity, excess_quantity_units):
        self.reset_excess_material_details()
        all_material_details = self.get_all_material_details().all()  # .all to prevent caching
        marked_quantity = calculate_queryset_total_normalized_quantity(all_material_details, excess_quantity_units, 'excess_quantity', 'excess_quantity_units')
        remaining_excess_quantity = excess_quantity - marked_quantity
        if remaining_excess_quantity > 0:
            if self.grn_material.customer_brand_material.get_user_defined_material().name == Material.FABRIC_MATERIAL:
                failed_batches = self.get_inspection_failed_material_details().all().order_by('batch_number', '-actual_quantity')  # .all to prevent caching
                total_marked_rolls_quantity = self.mark_material_detail_excess_quantity(remaining_excess_quantity, excess_quantity_units, failed_batches, 'actual_quantity', 'actual_quantity_units')
                normalized_total_marked_rolls_quantity = convert_quantity_to_unit(excess_quantity_units, total_marked_rolls_quantity['quantity'], total_marked_rolls_quantity['quantity_units'])
                remaining_excess_quantity = remaining_excess_quantity - normalized_total_marked_rolls_quantity['quantity']

                if remaining_excess_quantity > 0:
                    qa_passed_batches = self.get_inspection_passed_material_details().all().order_by('batch_number', '-actual_quantity')
                    self.mark_material_detail_excess_quantity(remaining_excess_quantity, excess_quantity_units, qa_passed_batches, 'actual_quantity', 'actual_quantity_units')
            else:
                material_details = self.get_all_material_details().all().order_by('qa_failed_quantity')
                total_marked_rolls_quantity = self.mark_material_detail_excess_quantity(remaining_excess_quantity,excess_quantity_units, material_details, 'qa_failed_quantity', 'qa_failed_quantity_units')
                remaining_excess_quantity = excess_quantity - total_marked_rolls_quantity['quantity']
                self.mark_material_detail_excess_quantity(remaining_excess_quantity, excess_quantity_units, material_details, 'qa_passed_quantity', None)

    def calculate_commercial_invoice_mismatch_quantity(self):
        normalized_unit = self.grn_material.customer_brand_material.material_normalized_measuring_unit
        normalized_actual_quantity = convert_quantity_to_unit(normalized_unit, self.total_actual_quantity, self.total_actual_quantity_units)
        total_indicated_quantity = convert_quantity_to_unit(normalized_unit, self.total_indicated_quantity, self.total_indicated_quantity_units)
        quantity_difference = normalized_actual_quantity['quantity'] - total_indicated_quantity['quantity']
        self.mismatch_quantity = quantity_difference
        self.mismatch_quantity_units = normalized_unit
        self.save()

    def set_material_details_grn_quantity(self):
        spo_grn_material_details = self.get_all_material_details().all()  # .all To prevent caching
        normalized_unit = self.grn_material.customer_brand_material.material_normalized_measuring_unit
        for spo_grn_material_detail in spo_grn_material_details:
            # normalized_qa_passed_quantity = convert_quantity_to_unit(normalized_unit, spo_grn_material_detail.actual_quantity, spo_grn_material_detail.actual_quantity_units)
            qa_passed_quantity = spo_grn_material_detail.qa_passed_quantity
            normalized_qa_passed_quantity = convert_quantity_to_unit(normalized_unit, qa_passed_quantity['qa_passed_quantity'], qa_passed_quantity['qa_passed_quantity_units'])
            normalized_excess_quantity = convert_quantity_to_unit(normalized_unit, spo_grn_material_detail.excess_quantity, spo_grn_material_detail.excess_quantity_units)
            grn_quantity = normalized_qa_passed_quantity['quantity'] - normalized_excess_quantity['quantity']
            spo_grn_material_detail.grn_quantity = grn_quantity
            spo_grn_material_detail.grn_quantity_units = normalized_unit
            spo_grn_material_detail.save()

    def calculate_and_mark_excess_quantity(self):
        from supplier_po.helpers.summary_calculator_helper import GRNMaterialSummaryCalculatorMixin
        customer_brand_material = self.grn_material.customer_brand_material
        supplier_po = self.supplier_po_grn.supplier_po
        commercial_invoice = self.supplier_po_grn.get_invoice()
        actual_delivery_date = commercial_invoice.get_supplier_po_actual_delivery_date(supplier_po)

        self.calculate_material_quantity_summary()
        self.refresh_from_db()

        normalized_unit = customer_brand_material.material_normalized_measuring_unit

        qa_passed_quantity = self.total_qa_passed_quantity
        normalized_qa_passed_quantity = convert_quantity_to_unit(normalized_unit, qa_passed_quantity['total_qa_passed_quantity'], qa_passed_quantity['total_qa_passed_quantity_units'])
        normalized_actual_quantity = convert_quantity_to_unit(normalized_unit, self.total_actual_quantity, self.total_actual_quantity_units)

        previous_supplier_po_grns_data = self.supplier_po_grn.get_supplier_po_previous_completed_summary_for_material(self.grn_material)

        previous_usable_quantity = previous_supplier_po_grns_data[GRNMaterialSummaryCalculatorMixin.GRN_USABLE_QUANTITY_KEY]
        normalized_previous_grn_usable_quantity = convert_quantity_to_unit(normalized_unit, previous_usable_quantity['quantity'], previous_usable_quantity['quantity_units'])
        total_quantity_of_supplier_po = normalized_actual_quantity['quantity'] + normalized_previous_grn_usable_quantity['quantity']   # TODO major - this should take into account total actual quantity?

        excess_and_deficit_quantity = supplier_po.get_shortage_and_excess_quantity(self.grn_material)

        excess_quantity = convert_quantity_to_unit(normalized_unit, excess_and_deficit_quantity['excess']['quantity'], excess_and_deficit_quantity['excess']['quantity_units'])['quantity']
        deficit_quantity = convert_quantity_to_unit(normalized_unit, excess_and_deficit_quantity['deficit']['quantity'], excess_and_deficit_quantity['deficit']['quantity_units'])['quantity']

        if total_quantity_of_supplier_po > excess_quantity:
            excess_quantity_value = total_quantity_of_supplier_po - excess_quantity
            self.mark_excess_quantity(excess_quantity_value, normalized_unit)
            self.total_excess_quantity = excess_quantity_value
        else:
            self.reset_excess_material_details()
            self.total_excess_quantity = 0

        if actual_delivery_date.is_last_delivery_for_supplier_po_and_material(self.grn_material) and total_quantity_of_supplier_po < deficit_quantity:
            deficit_quantity_value = deficit_quantity - total_quantity_of_supplier_po
            self.total_deficit_quantity = deficit_quantity_value
        else:
            self.total_deficit_quantity = 0

        self.set_material_details_grn_quantity()
        self.refresh_from_db()
        self.usable_quantity = normalized_qa_passed_quantity['quantity'] - self.total_excess_quantity
        self.usable_quantity_units = normalized_unit


        self.total_deficit_quantity_units = normalized_unit
        self.total_excess_quantity_units = normalized_unit
        self.save()

    def set_grnable_material_details(self):
        self.calculate_and_mark_excess_quantity()
        self.calculate_commercial_invoice_mismatch_quantity()

    def calculate_material_detail_field_total(self, field_name):
        material_details = self.get_all_material_details().all() # All is needed to refresh data from db
        normalized_unit = self.grn_material.customer_brand_material.material_normalized_measuring_unit
        material = self.grn_material.customer_brand_material.user_defined_material
        field_unit_mapping = {
            'actual_quantity': 'actual_quantity_units',
            'indicated_quantity': 'indicated_quantity_units',
            'qa_failed_quantity': 'qa_failed_quantity_units' # changes based on material
        }

        if field_name == 'qa_failed_quantity' and material.name == Material.FABRIC_MATERIAL: # If fabric, qa failed is calculated differntly
            rejected_batches = self.fabricgrnbatchnumber_set.filter(inspection_status=FabricGRNBatchNumber.INSPECTION_STATUS_INSPECTION_FAILED)
            rejected_material_details = material_details.filter(batch_number__in=rejected_batches)
            field_quantity = calculate_queryset_total_normalized_quantity(rejected_material_details, normalized_unit, 'actual_quantity', 'actual_quantity_units')
        else:
            field_units = field_unit_mapping[field_name]
            field_quantity = calculate_queryset_total_normalized_quantity(material_details, normalized_unit, field_name, field_units)
        data = {
            'quantity': field_quantity,
            'quantity_units': normalized_unit
        }
        return data

    def calculate_material_quantity_summary(self):
        # TODO major - calculate color tone rejection quantity
        total_actual_quantity = self.calculate_material_detail_field_total('actual_quantity')
        rejected_quantity = self.calculate_material_detail_field_total('qa_failed_quantity')
        indicated_quantity = self.calculate_material_detail_field_total('indicated_quantity')
        self.total_actual_quantity = total_actual_quantity['quantity']
        self.total_actual_quantity_units = total_actual_quantity['quantity_units']
        self.total_qa_rejected_quantity = rejected_quantity['quantity']
        self.total_qa_rejected_quantity_units = rejected_quantity['quantity_units']
        self.total_indicated_quantity = indicated_quantity['quantity']
        self.total_indicated_quantity_units = indicated_quantity['quantity_units']
        self.save()

    
    def set_material_inistial_quantity(self):
        for detail in self.get_all_material_details():
            if not detail.actual_quantity:
                detail.actual_quantity = detail.indicated_quantity
                detail.actual_quantity_units = detail.indicated_quantity_units
                detail.save()

    def get_color_tone_rejected_material_details(self):
        grn_material_details = None
        is_fabric = self.grn_material.customer_brand_material.material_type == Material.FABRIC_MATERIAL
        acceptable_color_tones = self.supplier_po_grn.supplier_po.get_fabric_acceptable_color_tone(self.grn_material)
        if is_fabric and acceptable_color_tones:
            grn_material_details = self.get_all_material_details().filter().exclude(fabricgrndetail__color_tone__in=acceptable_color_tones)
        return grn_material_details

    def get_color_tone_rejected_total_replacement_quantity(self):
        rejected_color_tone_rolls = self.get_color_tone_rejected_material_details()
        normalized_unit = self.grn_material.customer_brand_material.material_normalized_measuring_unit
        quantity = 0
        if rejected_color_tone_rolls:
            quantity = calculate_queryset_total_normalized_quantity(rejected_color_tone_rolls, normalized_unit,'actual_quantity', 'actual_quantity_units')
        data = get_quantity_dictionary(quantity, normalized_unit)
        return data

    def get_mismatch_remediation_quantity(self):
        quantity = 0
        if self.mismatch_quantity < 0:
            quantity = abs(self.mismatch_quantity)
        data = get_quantity_dictionary(quantity, self.mismatch_quantity_units)
        return data

    def get_total_replacement_quantity(self, reason):
        replacement_quantities = self.get_replacement_delivery_details(reason)
        normalized_unit = self.grn_material.customer_brand_material.material_normalized_measuring_unit
        quantity = 0
        if replacement_quantities:
            quantity = calculate_queryset_total_normalized_quantity(replacement_quantities, normalized_unit, 'quantity', 'quantity_units')
        data = get_quantity_dictionary(quantity, normalized_unit)
        return data

    def get_total_replacement_quantity_all(self):
        replacement_quantities = self.replacementquantitydeliverydate_set.all()
        normalized_unit = self.grn_material.customer_brand_material.material_normalized_measuring_unit
        quantity = 0
        if replacement_quantities:
            quantity = calculate_queryset_total_normalized_quantity(replacement_quantities, normalized_unit, 'quantity', 'quantity_units')
        data = get_quantity_dictionary(quantity, normalized_unit)
        return data

    def get_price_from_quantity(self, quantity):
        price = None
        if self.grn_price and quantity:
            price = self.grn_price * quantity  # TODO Major - this needs to be normalized
        return price

    def get_replacement_delivery_details(self, reason):
        deliveries = self.replacementquantitydeliverydate_set.filter(reason=reason)
        return deliveries

    def is_replacements_created(self, reason):
        is_created = self.replacementquantitydeliverydate_set.filter(
            reason=reason
        ).exists()
        return is_created

    @cached_property
    def active_commercial_invoice_debit_note(self):
        commercial_invoice = self.supplier_po_grn.get_invoice()
        return commercial_invoice.get_active_debit_note()

    def get_active_debit_note_supplier_po_grn_material(self, reason):
        debit_note = self.active_commercial_invoice_debit_note
        debit_note_material = get_object_or_none(
            DebitNoteMaterial,
            {
                'debit_note': debit_note,
                'supplier_po_grn_material': self,
                'reason': reason
            }
        )
        return debit_note_material
    
    def get_debit_note_amount(self):
        debit_note_amount = 0
        active_debit_note = self.active_commercial_invoice_debit_note
        if active_debit_note:
            debit_note_materials = active_debit_note.debitnotematerial_set.all()
            debit_note_amount = calculate_queryset_total_amount_normalized_amount(debit_note_materials, 'total_price', CurrencyHelper.USD_CURRENCY)
        return debit_note_amount
    
    def set_material_quantities(self):
        material_details = self.supplierpogrnmaterialdetail_set.all()
        normalized_unit = self.grn_material.customer_brand_material.material_normalized_measuring_unit
        total_quantity = calculate_queryset_total_normalized_quantity(material_details, normalized_unit, 'indicated_quantity', 'indicated_quantity_units')
        order_price = self.supplier_po_grn.supplier_po.get_material_order_price(self.grn_material)
        self.total_expected_quantity = total_quantity
        self.total_expected_quantity_units = normalized_unit
        self.grn_price = order_price
        self.save()     
    

class SupplierPOGRNMaterialDetail(BaseAbstractModel):
    supplier_po_grn_material = models.ForeignKey(SupplierPOGRNMaterial, on_delete=models.CASCADE)
    indicated_quantity = models.FloatField(null=True)
    indicated_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
    actual_quantity = models.FloatField(null=True)
    actual_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
    indicated_grn_field_value = models.JSONField(null=True)
    actual_grn_field_value = models.JSONField(null=True)
    barcode = models.CharField(max_length=300, null=True)
    qa_inspection_passed = models.BooleanField(null=True)
    attachments = models.ManyToManyField(FileAttachment, blank=True)
    supplier_barcode = models.CharField(max_length=500, null=True)
    shade = models.ForeignKey('supplier_po.GRNBatchNumberShade', on_delete=models.SET_NULL, null=True)
    batch_number = models.ForeignKey('supplier_po.FabricGRNBatchNumber', on_delete=models.DO_NOTHING, null=True)

    qa_failed_quantity = models.FloatField(null=True, default=0)
    qa_failed_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)

    # These will be calculated once GRN is set to complete
    excess_quantity = models.FloatField(null=True) # This need to be stored, to track what exactly happened
    excess_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)

    grn_quantity = models.FloatField(null=True) # This is the amount that will be grn'd. It is there to track excess values
    grn_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
    replacement_quantity = models.FloatField(null=True) # TODO - is this needed?
    replacement_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True) # TODO - is this needed?
    # End of calculated fields

    INSPECTION_STATE_INSPECTION_NOT_NEED = 'inspection_not_need'
    INSPECTION_STATE_READY_FOR_INSPECTION = 'ready_for_inspection'
    INSPECTION_STATE_INSPECTION_IN_PROGRESS = 'inspection_in_progress'
    INSPECTION_STATE_INSPECTION_COMPLETE = 'inspection_complete'
    INSPECTION_STATE_CHOICES = (
        (INSPECTION_STATE_INSPECTION_NOT_NEED, 'Inspection Not Need'),
        (INSPECTION_STATE_READY_FOR_INSPECTION, 'Ready For Inspection'),
        (INSPECTION_STATE_INSPECTION_IN_PROGRESS, 'Inspection In Progress'),
        (INSPECTION_STATE_INSPECTION_COMPLETE, 'Inspection Complete')
    )

    inspection_state = models.CharField(max_length=200, choices=INSPECTION_STATE_CHOICES, default=INSPECTION_STATE_INSPECTION_NOT_NEED)
    inspection_attempt = models.IntegerField(null=True)

    SHADE_CATEGORY_ROLL_TO_ROLL_SHADING = 'roll_to_roll_shading'
    SHADE_CATEGORY_WITHIN_THE_ROLL_SHADING = 'within_the_roll_shading'
    SHADE_CATEGORY_CHOICES = (
        (SHADE_CATEGORY_ROLL_TO_ROLL_SHADING, 'Roll To Roll Shading'),
        (SHADE_CATEGORY_WITHIN_THE_ROLL_SHADING, 'Within The Roll Shading')
    )
    shade_category = models.CharField(max_length=200, choices=SHADE_CATEGORY_CHOICES, null = True)
    defect_rate_per_100_square_yards = models.FloatField(null=True)

    # Keeps track of in housed quantity
    in_housed_quantity = models.FloatField(default=0)
    in_housed_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
    diameter = models.FloatField(null=True)
    bin_location = models.ForeignKey('shared.PlantWarehouseRackBin', on_delete=models.SET_NULL, null=True)
    material_bin_allocation_details = models.JSONField(null=True)

    #TODO IF key value changes from the field name get_grn_editable_fileds() will break
    INDICATED_QUANTITY_VALUE_KEY = 'indicated_quantity'
    INDICATED_QUANTITY_UNITS_VALUE_KEY = 'indicated_quantity_units'
    ACTUAL_QUANTITY_VALUE_KEY = 'actual_quantity'
    ACTUAL_QUANTITY_UNITS_VALUE_KEY = 'actual_quantity_units'
    INDICATED_GRN_FIELD_VALUE_KEY = 'indicated_grn_field_value'
    ACTUAL_GRN_FIELD_VALUE_KEY = 'actual_grn_field_value'
    BARCODE_VALUE_KEY = 'barcode'
    SUPPLIER_BARCODE_VALUE_KEY = 'supplier_barcode'
    QA_INSPECTION_VALUE_KEY = 'qa_inspection_passed'
    ATTACHMENTS_VALUE_KEY = 'attachments'
    SHADE_VALUE_KEY = 'shade'
    BATCH_NUMBER_VALUE_KEY = 'batch_number'
    SHADE_CATEGORY_VALUE_KEY = 'shade_category'
    QA_FAILED_QUANTITY_KEY = 'qa_failed_quantity'
    QA_FAILED_QUANTITY_UNITS_KEY = 'qa_failed_quantity_units'
    DIAMETER_KEY = 'diameter'

    material_helper = MaterialUnitHelper()

    @property
    def qa_passed_quantity(self):
        mh = MaterialUnitHelper()
        material = self.supplier_po_grn_material.grn_material.customer_brand_material.get_user_defined_material()
        material_unit = mh.get_normalized_unit_based_on_category(material.consumption_measurement_unit)
        actual_quantity = mh.convert_to_units(material_unit, self.actual_quantity, self.actual_quantity_units)
        if material.name == Material.FABRIC_MATERIAL:
            if self.batch_number and self.batch_number.inspection_status == FabricGRNBatchNumber.INSPECTION_STATUS_INSPECTION_FAILED:
                qa_passed_quantity = 0
            else:
                qa_passed_quantity = actual_quantity

        else:
            qa_rejected_quantity = self.qa_failed_quantity
            if self.qa_failed_quantity:
                qa_rejected_quantity = mh.convert_to_units(material_unit, get_float_or_zero(self.qa_failed_quantity), self.qa_failed_quantity_units)
            qa_passed_quantity = actual_quantity - qa_rejected_quantity
        data = {
            'qa_passed_quantity': qa_passed_quantity,
            'qa_passed_quantity_units': material_unit,
        }
        return data

    @property
    def passed_qa(self):
        return self.qa_inspection_passed

    @property
    def normalized_actual_quantity_unit(self):
        return self.material_helper.get_normalized_unit(self.actual_quantity_units)

    @property
    def normalized_actual_quantity(self):
        normalized_unit = self.normalized_actual_quantity_unit
        value = 0
        if self.actual_quantity:
            value = self.material_helper.convert_to_units(normalized_unit, self.actual_quantity, self.actual_quantity_units)
        return value

    @property
    def normalized_actual_quantity_display_value(self):
        measuring_units_dict = self.material_helper.all_measuring_units_dictionary
        unit_display_value = measuring_units_dict.get(self.normalized_actual_quantity_unit, self.normalized_actual_quantity_unit)
        return f'{self.normalized_actual_quantity} {unit_display_value}'

    def set_barcode(self):
        if not self.barcode:
            barcode_string = f"GRNMATD-{self.pk}".upper()
            self.barcode = base64_encode_string(barcode_string)
            self.save()

    def calculate_defect_rate(self):
        defect_rate_sum = float(self.supplierpogrnmaterialqa_set.all().aggregate(Sum("defect", default=0))['defect__sum'])
        fabric_grn_detail = get_object_or_none(FabricGRNDetail, {'grn_material_detail': self.id})
        result = None
        if fabric_grn_detail:
            length = self.actual_quantity * self.material_helper.get_yard_conversion_amount(self.actual_quantity_units)
            width = fabric_grn_detail.actual_width.actual_width * self.material_helper.get_yard_conversion_amount(fabric_grn_detail.actual_width.actual_width_units)
            role_square_yards = length * width
            defect_rate_per_100_square_yards = round((defect_rate_sum / role_square_yards) * 100,2)
            self.defect_rate_per_100_square_yards = defect_rate_per_100_square_yards
            # print(role_square_yards, defect_rate_per_100_square_yards)
            if defect_rate_per_100_square_yards >= 28:
                self.qa_inspection_passed = False
            else:
                self.qa_inspection_passed = True
            self.save()
        return result


class FabricGRNDetail(BaseAbstractModel):
    grn_material_detail = models.OneToOneField(SupplierPOGRNMaterialDetail, on_delete=models.CASCADE)
    pack_number = models.CharField(max_length=300, null=True)
    actual_width = models.ForeignKey('supplier_po.FabricGRNWidth', on_delete=models.DO_NOTHING, null=True)
    indicated_width = models.FloatField(null=True)
    indicated_width_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
    actual_gsm = models.FloatField(null=True)
    indicated_gsm = models.FloatField(null=True)
    shrink_lot = models.FloatField(null=True)
    shrink_width = models.FloatField(null=True)
    shrink_length = models.FloatField(null=True)
    remarks = models.CharField(max_length=300, null=True, blank=True)
    color_tone = models.ForeignKey(FabricColorTone, on_delete=models.DO_NOTHING, null=True)
    indicated_weight = models.FloatField(null=True)
    actual_weight = models.FloatField(null=True)

    COLOR_TONE_MISMATCH = 'color_tone_mismatch'
    BATCH_HIGH_FAILURE = 'batch_high_failure'
    COLOR_TONE_MISMATCH_AND_BATCH_HIGH_FAILURE = 'color_tone_mismatch_batch_high_failure'
    OTHER_REASON = 'other'

    INSPECTION_FAILED_REASON_CHICES = (
        (COLOR_TONE_MISMATCH, "Color Tone Mismatch"),
        (BATCH_HIGH_FAILURE, "Batch High Failure"),
        (COLOR_TONE_MISMATCH_AND_BATCH_HIGH_FAILURE, "Color Tone Mismatch Batch High Failure"),
        (OTHER_REASON, "Other Reason")
    )

    qa_inspection_failed_reason = models.CharField(max_length=100, choices=INSPECTION_FAILED_REASON_CHICES, null=True)

    #TODO IF key value changes from the field name get_grn_editable_fileds() will break
    PACK_NUMBER_VALUE_KEY = 'pack_number'
    ACTUAL_WIDTH_VALUE_KEY = 'actual_width'
    ACTUAL_WIDTH_UNITS_VALUE_KEY = 'actual_width_units'
    INDICATED_WIDTH_VALUE_KEY = 'indicated_width'
    INDICATED_WIDTH_UNITS_VALUE_KEY = 'indicated_width_units'
    ACTUAL_GSM_VALUE_KEY = 'actual_gsm'
    INDICATED_GSM_VALUE_KEY = 'indicated_gsm'
    SHRINK_LOT_VALUE_KEY = 'shrink_lot'
    SHRINK_WIDTH_VALUE_KEY = 'shrink_width'
    SHRINK_LENGTH_VALUE_KEY = 'shrink_length'
    REMARKS_VALUE_KEY = 'remarks'
    COLOR_TONE_VALUE_KEY = 'color_tone'
    INDICATED_WEIGHT_VALUE_KEY = 'indicated_weight'
    ACTUAL_WEIGHT_VALUE_KEY = 'actual_weight'

    @property
    def is_valid_color_tone(self):
        valid = True
        supplier_po = self.grn_material_detail.supplier_po_grn_material.supplier_po_grn.supplier_po
        material = self.grn_material_detail.supplier_po_grn_material.grn_material.customer_brand_material
        if self.color_tone:
            valid = SupplierPOFabricColorTone.objects.filter(
                supplier_po=supplier_po,
                material=material,
                acceptable_color_tones=self.color_tone
            ).exists()
        return valid

    def set_qa_inspection_failed_reason(self):
        if self.color_tone:
            valid_color_tone = self.is_valid_color_tone
            if self.grn_material_detail.batch_number.inspection_status == FabricGRNBatchNumber.INSPECTION_STATUS_INSPECTION_FAILED and not valid_color_tone:
                self.qa_inspection_failed_reason = FabricGRNDetail.COLOR_TONE_MISMATCH_AND_BATCH_HIGH_FAILURE
            elif self.grn_material_detail.batch_number.inspection_status == FabricGRNBatchNumber.INSPECTION_STATUS_INSPECTION_HIGH_FAIL_RATE and valid_color_tone:
                self.qa_inspection_failed_reason = FabricGRNDetail.BATCH_HIGH_FAILURE
            elif self.grn_material_detail.batch_number.inspection_status == FabricGRNBatchNumber.INSPECTION_STATUS_INSPECTION_PASSED and not valid_color_tone:
                self.qa_inspection_failed_reason = FabricGRNDetail.COLOR_TONE_MISMATCH
                self.grn_material_detail.qa_inspection_passed = False
            elif valid_color_tone and self.grn_material_detail.inspection_state == self.grn_material_detail.INSPECTION_STATE_INSPECTION_NOT_NEED:
                self.grn_material_detail.qa_inspection_passed = None
            self.grn_material_detail.save()
            self.save()


class FabricGRNBatchNumber(BaseAbstractModel):
    batch_number = models.CharField(max_length=300)
    grn_material = models.ForeignKey(SupplierPOGRNMaterial, on_delete=models.CASCADE, null=True)
    # TODO - major grn batch number
    INSPECTION_STATUS_INSPECTION_INPROGRESS = 'inspection_in_progress'
    INSPECTION_STATUS_INSPECTION_PASSED = 'inspection_passed'
    INSPECTION_STATUS_INSPECTION_FAILED = 'inspection_failed'
    INSPECTION_STATUS_INSPECTION_HIGH_FAIL_RATE = 'inspection_high_fail_rate'

    INSPECTION_STATUS_CHOICES = (
        (INSPECTION_STATUS_INSPECTION_INPROGRESS, 'Inspection In Progress'),
        (INSPECTION_STATUS_INSPECTION_PASSED, 'Inspection Passed'),
        (INSPECTION_STATUS_INSPECTION_FAILED, 'Inspection Failed'),
        (INSPECTION_STATUS_INSPECTION_HIGH_FAIL_RATE, 'Inspection High Fail Rate')
    )

    inspection_status = models.CharField(max_length=200, choices=INSPECTION_STATUS_CHOICES, null=True, default=None)
    inspection_percentage = models.FloatField(default=0)
    avg_defect_rate_per_100_square_yards = models.FloatField(null=True)

    @property
    def shade_category(self):
        shade_category = None
        supplier_po_grn_material_details = self.supplierpogrnmaterialdetail_set.exclude(
            inspection_state=SupplierPOGRNMaterialDetail.INSPECTION_STATE_INSPECTION_NOT_NEED)
        for supplier_po_grn_material_detail in supplier_po_grn_material_details:
            if supplier_po_grn_material_detail.shade_category:
                shade_category = supplier_po_grn_material_detail.shade_category
            if shade_category == SupplierPOGRNMaterialDetail.SHADE_CATEGORY_WITHIN_THE_ROLL_SHADING:
                break
        
        return shade_category

    def set_supplier_po_grn_material_detail_qa_inspection_passed(self, qa_inspection_passed):
        supplier_po_grn_material_details = self.supplierpogrnmaterialdetail_set.all()
        for supplier_po_grn_material_detail in supplier_po_grn_material_details:
            supplier_po_grn_material_detail.save()

    def set_inspection_status(self):
        supplier_po_grn_material_details = self.supplierpogrnmaterialdetail_set.exclude(
            inspection_state=SupplierPOGRNMaterialDetail.INSPECTION_STATE_INSPECTION_NOT_NEED)
        if supplier_po_grn_material_details.exclude(
                inspection_state=SupplierPOGRNMaterialDetail.INSPECTION_STATE_INSPECTION_COMPLETE).exists():
            self.inspection_status = self.INSPECTION_STATUS_INSPECTION_INPROGRESS
        else:
            inspection_attempts = [supplier_po_grn_material_detail.inspection_attempt for
                                   supplier_po_grn_material_detail in
                                   supplier_po_grn_material_details.exclude(inspection_attempt=None).distinct(
                                       'inspection_attempt')]
            try:
                latest_attempt = max(inspection_attempts)
            except ValueError:
                latest_attempt = 0
            total_defect_value = 0
            number_of_rolls = 0
            inspected_supplier_po_grn_material_details = supplier_po_grn_material_details.filter(
                inspection_attempt=latest_attempt)
            for inspected_supplier_po_grn_material_detail in inspected_supplier_po_grn_material_details:
                defect_value = inspected_supplier_po_grn_material_detail.defect_rate_per_100_square_yards
                if defect_value >= 0:
                    total_defect_value += defect_value
                    number_of_rolls += 1
            if number_of_rolls > 0:
                batch_defect_rate = round(total_defect_value / number_of_rolls, 2)
                self.avg_defect_rate_per_100_square_yards = batch_defect_rate
                if batch_defect_rate >= 28:
                    self.inspection_status = self.INSPECTION_STATUS_INSPECTION_FAILED
                    self.set_supplier_po_grn_material_detail_qa_inspection_passed(False)
                elif batch_defect_rate >= 25 and batch_defect_rate < 28:
                    self.inspection_status = self.INSPECTION_STATUS_INSPECTION_HIGH_FAIL_RATE
                elif batch_defect_rate < 25:
                    self.inspection_status = self.INSPECTION_STATUS_INSPECTION_PASSED
                    self.set_supplier_po_grn_material_detail_qa_inspection_passed(True)

        self.save()
        return self.inspection_status

    def get_rejected_color_tones(self):
        from marketing.models import POClubMaterialColorTone
        rejected_color_tones = None
        po_club = self.grn_material.supplier_po_grn.supplier_po.po_club
        material = self.grn_material.grn_material
        po_club_material_color_tone = POClubMaterialColorTone.objects.filter( po_club=po_club, material=material.customer_brand_material).first()
        if po_club_material_color_tone:
            accepted_color_tones = po_club_material_color_tone.acceptable_color_tones.all()
        else:
            accepted_color_tones = FabricColorTone.objects.none()

        rejected_color_tone_ids = SupplierPOGRNMaterialDetail.objects.filter(batch_number=self, supplier_po_grn_material__grn_material=material).exclude(
            fabricgrndetail__color_tone__in=accepted_color_tones
        ).exclude(fabricgrndetail__color_tone=None).values_list('fabricgrndetail__color_tone', flat=True)

        if rejected_color_tone_ids:
            rejected_color_tones = FabricColorTone.objects.filter(id__in=rejected_color_tone_ids)
        return rejected_color_tones

    def get_color_tone_rejected_rolls(self, grn_material_details):
        from django.db.models import Q
        from marketing.models import POClubMaterialColorTone
        po_club = self.grn_material.supplier_po_grn.supplier_po.po_club
        material = self.grn_material.grn_material
        po_club_material_color_tone = POClubMaterialColorTone.objects.filter(
            po_club=po_club,
            material=material.customer_brand_material
        ).first()
        if po_club_material_color_tone:
            accepted_color_tones = po_club_material_color_tone.acceptable_color_tones.all()
        else:
            accepted_color_tones = FabricColorTone.objects.none()

        rejected_color_tone_rolls = grn_material_details.filter(
            batch_number=self, supplier_po_grn_material__grn_material=material
        ).exclude(Q(fabricgrndetail__color_tone__in=accepted_color_tones) &
                  Q(fabricgrndetail__color_tone__isnull=False)
                  )

        return rejected_color_tone_rolls

    def get_defected_batches_remediation(self, grn_material_details):
        material = self.grn_material.grn_material

        rejected_qa_failed_rolls = grn_material_details.filter(
            batch_number=self, supplier_po_grn_material__grn_material=material,
            qa_inspection_passed=False,
            batch_number__inspection_status=self.INSPECTION_STATUS_INSPECTION_FAILED
        )
        return rejected_qa_failed_rolls

    def get_excess_batches_remediation(self, grn_material_details):
        material = self.grn_material.grn_material

        excess_rolls = grn_material_details.filter(
            batch_number=self, supplier_po_grn_material__grn_material=material,
            excess_quantity__gt=0
        )
        return excess_rolls
    
    def get_short_batches_remediation(self, grn_material_details):
        material = self.grn_material.grn_material

        short_rolls = grn_material_details.filter(
            batch_number=self, supplier_po_grn_material__grn_material=material,
            short_quantity__gt=0
        )
        return short_rolls
    
    def get_width_batches_remediation(self, grn_material_details):
        material = self.grn_material.grn_material

        width_rolls = grn_material_details.filter(
            batch_number=self, supplier_po_grn_material__grn_material=material,
            supplier_po_grn_material__width_replacement_quantity__gt=0
        )
        return width_rolls

    def get_cpi_rolls(self, grn_material_details):
        material_detail_ids = InHouseMaterial.objects.filter(
            grn_material_detail__in=grn_material_details,
            required_cpi=True
        ).values_list('grn_material_detail', flat=True)
        cpi_rolls = grn_material_details.filter(id__in=material_detail_ids, batch_number=self)
        return cpi_rolls

    def get_total_quantity(self, grn_material_details):
        normalized_unit = self.grn_material.grn_material.customer_brand_material.material_normalized_measuring_unit
        quantity = 0
        if grn_material_details:
            quantity = calculate_queryset_total_normalized_quantity(grn_material_details, normalized_unit, 'actual_quantity', 'actual_quantity_units')
        data = get_quantity_dictionary(quantity, normalized_unit)
        return data


class SupplierPOGRNMaterialQA(BaseAbstractModel):
    supplier_po_grn_material_detail = models.ForeignKey(SupplierPOGRNMaterialDetail, on_delete=models.CASCADE)
    defect = models.ForeignKey(UserDefinedMaterialDefect, on_delete=models.DO_NOTHING, null=True)
    remarks = models.TextField(null=True)
    defect_distance_from_start = models.FloatField(null=True)
    defect_distance_from_start_units = models.CharField(max_length=200, null=True, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, default=MaterialUnitHelper.CENTIMETERS_UNIT)
    defect_width_from_left = models.FloatField(null=True)
    defect_width_from_left_units = models.CharField(max_length=200, null=True, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, default=MaterialUnitHelper.CENTIMETERS_UNIT)

    DEFECT_RATING_CHOICES = (
        (1, 1),
        (2, 2),
        (3, 3),
        (4, 4),
    )
    defect_rating = models.IntegerField(null=True, choices=DEFECT_RATING_CHOICES, default=1)


class GRNBatchNumberShade(BaseAbstractModel):
    batch_number = models.ForeignKey(FabricGRNBatchNumber, on_delete=models.CASCADE)
    shade = models.CharField(max_length=200)
    supplier_po_shade = models.ForeignKey(SupplierPOFabricShade, on_delete=models.SET_NULL, null=True)
    club_shade_display_order = models.IntegerField(null=True)
    split_from = models.ForeignKey("self", null=True, on_delete=models.CASCADE)


class FabricGRNWidth(BaseAbstractModel):
    actual_width = models.FloatField()
    actual_width_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True, default=MaterialUnitHelper.INCHES_UNIT)
    grn = models.ForeignKey(SupplierPOGRN, on_delete=models.CASCADE)
    material_helper = MaterialUnitHelper()

    @property
    def normalized_actual_width_unit(self):
        return MaterialUnitHelper.INCHES_UNIT

    @property
    def normalized_actual_width(self):
        value = self.actual_width
        if value:
            inch_conversion = self.material_helper.get_inch_conversion(self.actual_width_units)
            value = value * inch_conversion
        return value

    @property
    def actual_width_display_value(self):
        measuring_units_dict = self.material_helper.all_measuring_units_dictionary
        unit_display_value = measuring_units_dict.get(self.normalized_actual_width_unit, self.normalized_actual_width_unit)
        return f'{self.normalized_actual_width} {unit_display_value}'
    

class SupplierPOMaterialShrinkage(BaseAbstractModel):
    supplier_po = models.ForeignKey(SupplierPO, on_delete=models.CASCADE)
    supplier_material = models.ForeignKey(SupplierInquiryMaterialCode, on_delete=models.CASCADE)
    SHRINKAGE_TIME_FRAME_24_HOURS = '24_hours'
    SHRINKAGE_TIME_FRAME_48_HOURS = '48_hours'

    SHRINKAGE_TIMES = (
        (SHRINKAGE_TIME_FRAME_24_HOURS, '24 Hours'),
        (SHRINKAGE_TIME_FRAME_48_HOURS, '48 Hours'),
    )

    shrinkage_test_time_frame = models.CharField(max_length=200, choices=SHRINKAGE_TIMES, null=True)

class SupplierPOShrinkLot(BaseAbstractModel):
    supplier_po = models.ForeignKey(SupplierPO, on_delete=models.CASCADE)
    supplier_material = models.ForeignKey(SupplierInquiryMaterialCode, on_delete=models.CASCADE)
    shrink_lot_name = models.CharField(max_length=400)

class SupplierPOShrinkageValue(BaseAbstractModel):
    supplier_po_shrinkage = models.ForeignKey(SupplierPOMaterialShrinkage, on_delete=models.CASCADE)
    grn_material_detail = models.OneToOneField(SupplierPOGRNMaterialDetail, on_delete=models.CASCADE)
    residual_shrinkage_length = models.FloatField(null=True)
    residual_shrinkage_width = models.FloatField(null=True)
    steam_shrinkage_length = models.FloatField(null=True)
    steam_shrinkage_width = models.FloatField(null=True)
    wash_shrinkage_length = models.FloatField(null=True)
    wash_shrinkage_width = models.FloatField(null=True)
    panel_before_shrinking = models.ForeignKey(FileAttachment, on_delete=models.CASCADE, null=True, related_name='panel_before_shrinking')
    panel_after_shrinking = models.ForeignKey(FileAttachment, on_delete=models.CASCADE, null=True, related_name='panel_after_shrinking')
    shrinkage_unit = models.CharField(max_length=400, choices=MaterialUnitHelper.ALL_LENGTH_UNITS, default=MaterialUnitHelper.INCHES_UNIT, null=True)
    shrinkage_lot = models.ForeignKey(SupplierPOShrinkLot, on_delete=models.DO_NOTHING, null=True)


class DebitNote(BaseAbstractModel):
    commercial_invoice = models.ForeignKey(SupplierPODeliveryInvoice, on_delete=models.CASCADE)
    DRAFT_STATE = 'draft'
    READY_TO_SEND = 'ready_to_send'
    DEBIT_NOTE_SEND = 'debit_note_sent'
    COMPLETE_STATE = 'complete'
    CANCELED_STATE = 'canceled'

    STATE_CHOICES = (
        (DRAFT_STATE, 'Draft'),
        (READY_TO_SEND, 'Ready To Send'),
        (DEBIT_NOTE_SEND, 'Debit Note Sent'),
        (COMPLETE_STATE, 'Complete'),
        (CANCELED_STATE, 'Canceled')
    )
    ACTIVE_STATES = [
        DRAFT_STATE,
        READY_TO_SEND,
        DEBIT_NOTE_SEND,
        COMPLETE_STATE
    ]
    status = models.CharField(max_length=100, choices=STATE_CHOICES, default=DRAFT_STATE)

    FREE_OF_CHARGE = 'free_of_charge'
    RETURN = 'return'

    REMEDIATION_STATUS = (
        (FREE_OF_CHARGE, 'free_of_charge'),
        (RETURN, 'return')
    )
    remediation_action = models.CharField(max_length=100, choices=REMEDIATION_STATUS, null=True) # TODO MAJOR - Move this to debit note material

    attachment = models.ForeignKey(FileAttachment, on_delete=models.CASCADE, null=True)
    free_of_charge = models.BooleanField(null=True)

    @property
    def display_number(self):
        return f"DEBNOTE{self.id:06}"

    @property
    def debit_note_editable(self):
        editable = self.status in [
            self.DRAFT_STATE,
        ]
        return editable


class ReplacementQuantityDeliveryDate(BaseAbstractModel):
    supplier_po_grn_material = models.ForeignKey(SupplierPOGRNMaterial, on_delete=models.CASCADE)
    quantity = models.FloatField(null=True, default=0)
    quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
    replacement_expected_delivery_date = models.ForeignKey(SupplierDeliveryDate, on_delete=models.SET_NULL, null=True)

    COLOR_TONE_REJECTED_REPLACEMENT_REASON = 'color_tone_rejected_replacement'
    DEFECT_REJECTED_REPLACEMENT_REASON = 'defect_rejected_replacement'
    SHORT_REPLACEMENT_REASON = 'short_replacement'
    WIDTH_MISMATCH_REPLACEMENT_REASON = 'width_mismatch_replacement'

    REASON_CHOICES = (
        (COLOR_TONE_REJECTED_REPLACEMENT_REASON, 'Color Tone Rejected Replacement'),
        (DEFECT_REJECTED_REPLACEMENT_REASON, 'Defect Rejected Replacement'),
        (SHORT_REPLACEMENT_REASON, 'Short Replacement'),
        (WIDTH_MISMATCH_REPLACEMENT_REASON, 'Width Mismatch Replacement'),
    )

    reason = models.CharField(max_length=1000, choices=REASON_CHOICES, null=True)

    def get_quantity_details(self):
        normalized_unit = self.supplier_po_grn_material.grn_material.customer_brand_material.material_normalized_measuring_unit
        data = get_quantity_dictionary(self.quantity, normalized_unit)
        return data
    
    # def get_reason_display(self, reason):
    #     reason = None
    #     reason = dict(self.REASON_CHOICES).get(reason)
    #     return reason


class DebitNoteMaterial(BaseAbstractModel):
    debit_note = models.ForeignKey(DebitNote, on_delete=models.CASCADE)
    #debit_note_material = models.ForeignKey(CustomerBrandMaterial, on_delete=models.CASCADE) # TODO - remove this field
    supplier_po_grn_material = models.ForeignKey(SupplierPOGRNMaterial, on_delete=models.SET_NULL, null=True)

    REJECTED_COLOR_TONE_REASON = 'color_tone_rejected_debit_note'
    REJECTED_DEFECT_DEBIT_NOTE_REASON = 'defect_rejected_debit_note'
    REJECTED_DEFECT_CPI_REASON = 'defect_rejected_cpi'

    EXCESS_REASON = 'excess'
    SHORT_REASON = 'short'
    MISMATCH_REASON = 'mismatch'

    REASON_CHOICES = (
        (REJECTED_COLOR_TONE_REASON, 'Color Tone Rejected'),
        (REJECTED_DEFECT_CPI_REASON, 'Defect Rejected CPI'),
        (REJECTED_DEFECT_DEBIT_NOTE_REASON, 'Defect Rejected'),
        (EXCESS_REASON, 'Excess'),
        (SHORT_REASON, 'Short'),
        (MISMATCH_REASON, 'Mismatch'),
    )

    reason = models.CharField(max_length=100, choices=REASON_CHOICES, null=True)
    unit_price = models.FloatField(null=True)
    unit_price_units = models.CharField(max_length=100, choices=PerMeasuringUnitHelper.ALL_PER_LENGTH_MEASURING_UNITS, null=True)
    total_price = models.FloatField(null=True)
    total_quantity = models.FloatField(null=True)
    total_quantity_units =  models.CharField(max_length=100, choices=PerMeasuringUnitHelper.ALL_PER_LENGTH_MEASURING_UNITS, null=True)

    def get_total_quantity(self):
        data = None
        if self.total_quantity:
            data = get_quantity_dictionary(self.total_quantity, self.total_quantity_units)
        return data
    
    def get_total_price(self):
        data = None
        if self.total_price:
            data = get_amount_dictionary(self.total_price, self.unit_price_units)
        return data


class DebitNoteMaterialDetail(BaseAbstractModel):
    debit_note_material = models.ForeignKey(DebitNoteMaterial, on_delete=models.CASCADE)
    quantity = models.FloatField(null=True)
    quanity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
    grn_material_detail = models.ForeignKey(SupplierPOGRNMaterialDetail, on_delete=models.CASCADE)


class SupplierPOGeneralPOMaterialQuantity(BaseAbstractModel):

    supplier_po = models.ForeignKey(SupplierPO, on_delete=models.CASCADE, null=True)
    general_po_material_quantity = models.OneToOneField(GeneralPOMaterialQuantity, on_delete=models.CASCADE)
