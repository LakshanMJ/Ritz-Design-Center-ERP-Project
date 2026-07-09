from rest_framework import serializers

from django.db import models
from finance.models import *
from marketing.models import ActualPOClub, PurchaseOrderDelivery, SupplierPO, SupplierDeliveryDate, SupplierDeliveryDateQuantity, PurchaseOrder, SupplierDeliveryDateQuantityPOAllocation, PurchaseOrderBom
from supplier_po.models import SupplierPO, SupplierPODeliveryInvoice, SupplierPOGRN, SupplierPOGRNMaterial
from materials.models import CustomerBrandMaterial, FABRIC_TRIM_TYPES, SEWING_TRIM_TYPES, PACKAGING_TYPES, UserDefinedMaterial, SupplierInquiryMaterialCode
from materials.serializers.material_serializers import SupplierInquiryMaterialCodeSerilizer, CustomerBrandMaterialBasicSerializer
from shared.utils import calculate_queryset_total_amount_normalized_amount, get_amount_dictionary, get_quantity_dictionary, calculate_queryset_total_normalized_quantity
from rest_framework.generics import get_object_or_404
from marketing.serializers import PurchaseOrderDeliverySerializer, PurchaseOrderDeliveryUpdateSerializer
from shared.utils import get_quantity_dictionary
from shared.helpers.general_results_set_pagination import GeneralLargeResultsSetPagination
from shared.models import Supplier
from datetime import date
from shared.utils import get_quantity_dictionary
from materials.fieldmetadata.measuring_unit_helpers import MaterialUnitHelper
from shared.utils import get_object_or_none


class OutgoingCommercialInvoiceBasicSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = OutgoingCommercialInvoice
        fields = ('id', 'display_number')


class OutgoingCommercialInvoiceSerializer(serializers.ModelSerializer):
    amount = serializers.SerializerMethodField()
    customer_id = serializers.IntegerField(source='customer.id', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    incoming_payments = serializers.SerializerMethodField(read_only=True)
    purchaseorderdelivery_set = PurchaseOrderDeliverySerializer(many=True, read_only=True)

    def get_amount(self, instance):
        amount = 0
        if instance.amount:
            amount = instance.amount
        data = get_amount_dictionary(amount)
        return data

    def get_incoming_payments(self, instance):
        data = IncomingPaymentSerializer(instance.incomingpayment_set.all(), many=True).data
        return data
    
    class Meta:
        model = OutgoingCommercialInvoice
        fields = ('id', 'display_number', 'amount', 'currency', 'customer', 'customer_id', 'customer_name', 'due_date', 'incoming_payments', 'purchaseorderdelivery_set')
        sorted = '-id'


class IncomingPaymentDeductionSerializer(serializers.ModelSerializer):
    amount = serializers.SerializerMethodField()

    def get_amount(self, instance):
        amount = 0
        if instance.amount:
            amount = instance.amount
        data = get_amount_dictionary(amount)
        return data
    
    class Meta:
        model = IncomingPaymentDeduction
        fields = '__all__'


class PaymentSupplierPOSerializer(serializers.ModelSerializer):
    supplier = serializers.IntegerField(source='general_po_supplier.supplier.id', read_only=True)
    supplier_name = serializers.CharField(source='general_po_supplier.supplier.name', read_only=True)
    delivery_dates = serializers.SerializerMethodField()
    attachment_file_path = serializers.CharField(source='supplier_po_file.file_path',read_only=True)

    def get_delivery_dates(self, instance):
        delivery_dates = instance.get_all_delivery_dates()
        data = SupplierPODeliveryDateSerializer(delivery_dates, many=True)
        return data.data

    class Meta:
        model = SupplierPO
        fields = (
            'id', 'supplier_name', 'supplier_po_number', 'supplier', 'supplier_po_file', 'delivery_dates', 'attachment_file_path',
          )


class PaymentSummaryMaterialSerializer(serializers.ModelSerializer):
    supplier_id = serializers.IntegerField(source='supplier_delivery_date_quantity.material_supplier.general_po_supplier.supplier.id')
    supplier_name = serializers.CharField(source='supplier_delivery_date_quantity.material_supplier.general_po_supplier.supplier.name')
    supplier_po_id = serializers.IntegerField(source='supplier_delivery_date_quantity.material_supplier.general_po_supplier.supplier_po.id', allow_null=True)
    supplier_po = serializers.CharField(source='supplier_delivery_date_quantity.material_supplier.general_po_supplier.supplier_po.supplier_po_number', allow_null=True)
    attachment_display_name = serializers.CharField(source='supplier_delivery_date_quantity.material_supplier.general_po_supplier.supplier_po.supplier_po_file.display_name' ,read_only=True)
    attachment_file_path = serializers.CharField(source='supplier_delivery_date_quantity.material_supplier.general_po_supplier.supplier_po.supplier_po_file.file_path',read_only=True)
    price = serializers.SerializerMethodField()
    required_quantity = serializers.SerializerMethodField()
    order_quantity = serializers.SerializerMethodField()
    grn_quantity = serializers.SerializerMethodField()
    receiving_type = serializers.SerializerMethodField()
    purchase_order_id = serializers.CharField(source='purchase_order.id')
    purchase_order = serializers.CharField(source='purchase_order.display_number')
    gantt_chart = serializers.SerializerMethodField()

    def get_gantt_chart_payment_data(self, supplier_po):
        outgoing_payments = supplier_po.get_supplier_po_all_outgoing_payments()
        pcl_activities = []
        for outgoing_payment in outgoing_payments:
            invoice_supplier_po_data = []
            invoices = supplier_po.get_invoices()
            supplier_pos = outgoing_payment.get_supplier_pos()
            grns = SupplierPOGRN.objects.filter(supplier_pack_list__supplier_po_delivery_note__supplier_po_delivery_invoice__in=invoices)

            for invoice in invoices:
                invoice_supplier_po_data.append({'id': invoice.id, 'display_number': invoice.display_number, 'type': 'outgoing'})

            for supplier_po in supplier_pos:
                invoice_supplier_po_data.append({'id': supplier_po.id, 'display_number': supplier_po.proforma_invoice_supplier_display_number, 'type': 'advance' })


            for invoice in invoices:
                ci_display  = '%s / %s' % ('CI Created Date', invoice.display_number)
                pcl_activities.append(
                    {'id': invoice.id, 'date': invoice.created.date(), 'activity': ci_display, 'key': 'ci_create_date'}
                )

            for po in supplier_pos:
                pi_display  = '%s / %s - %s' % ('PI Created Date', po.supplier_po_number, po.proforma_invoice_supplier_display_number)
                pcl_activities.append(
                    {'id': po.id, 'date': po.proforma_invoice_date, 'activity': pi_display, 'key': 'pi_create_date'}
                )

            if grns:
                complete_date = grns[0].complete_date
                pcl_activities.append(
                    {'id': outgoing_payment.id, 'date': complete_date, 'activity': 'GRN Complete Date', 'key': 'grn_complete_date'}
                )


            pcl_activities.append(
                {'id': outgoing_payment.id, 'date': outgoing_payment.pcl_create_date, 'activity': 'PCL Open', 'key': 'pcl_open_date'}
            )

            pcl_activities.append(
                {'id': outgoing_payment.id, 'date': outgoing_payment.pcl_end_date, 'activity': 'PCL End', 'key': 'pcl_end_date'}
            )

            pcl_activities.append(
                {'id': outgoing_payment.id, 'date': outgoing_payment.pcl_settle_date, 'activity': 'PCL Settle', 'key': 'pcl_settle_date'}
            )

        return pcl_activities
    
    def get_gantt_chart(self, instance):
        supplier_po = instance.supplier_delivery_date_quantity.material_supplier.general_po_supplier.supplier_po
        data = {
            'shipment_dates': {},
            'pcl_activities': []
        }
        clubs = SupplierPO.objects.filter(general_po_supplier__supplierpo=supplier_po).values_list('general_po_supplier__general_po__po_club', flat=True)
        shipment_dates = PurchaseOrderDelivery.objects.filter(
            purchase_order__actual_po_club__in=clubs
        ).order_by('delivery_date')
        for shipment_date in shipment_dates:
            delivery_date_str = str(shipment_date.delivery_date)
            if delivery_date_str not in data['shipment_dates']:
                data['shipment_dates'][delivery_date_str] = []

            data['shipment_dates'][delivery_date_str].append({
                'id': shipment_date.id,
                'amount': get_amount_dictionary(shipment_date.total_amount),
                'display_number': shipment_date.display_number,
                'purchase_order_display_number': shipment_date.purchase_order.display_number,
                'outgoing_commercial_invoice_due_date': shipment_date.outgoing_commercial_invoice.due_date if shipment_date.outgoing_commercial_invoice else None,
                'outgoing_commercial_invoice_amount': get_amount_dictionary(shipment_date.outgoing_commercial_invoice.amount) if shipment_date.outgoing_commercial_invoice else None
            })
        data['pcl_activities'] = self.get_gantt_chart_payment_data(supplier_po)
        return data

    def get_required_quantity(self, instance):
        data = None
        if hasattr(instance.supplier_delivery_date_quantity, 'material_supplier'):
            normalized_unit = instance.supplier_delivery_date_quantity.material_supplier.supplier_material.customer_brand_material.material_normalized_measuring_unit
            purchase_order_bom = get_object_or_none(PurchaseOrderBom, 
                {
                    'purchase_order': instance.purchase_order,
                    'supplier_inquiry_detail': instance.supplier_delivery_date_quantity.material_supplier.supplier_inquiry_detail,
                    'material': instance.supplier_delivery_date_quantity.material_supplier.supplier_material.customer_brand_material
                }
            )
            if purchase_order_bom:
                data = get_quantity_dictionary(purchase_order_bom.quantity, purchase_order_bom.measuring_unit)
        return data
    
    def get_order_quantity(self, instance):
        # qs = SupplierPOGRNMaterial.objects.filter(
        #     grn_material=instance.supplier_delivery_date_quantity.material_supplier.supplier_material,
        #     supplier_po_grn__supplier_po=instance.supplier_delivery_date_quantity.material_supplier.general_po_supplier.supplierpo,
        # )
        normalized_unit = instance.supplier_delivery_date_quantity.material_supplier.supplier_material.customer_brand_material.material_normalized_measuring_unit
        # quantity = calculate_queryset_total_normalized_quantity(qs, normalized_unit, 'total_actual_quantity', 'total_actual_quantity_units')
        order_quantity = instance.get_order_quantity()
        data = get_quantity_dictionary(order_quantity, normalized_unit)
        return data
    
    def get_grn_quantity(self, instance):
        return instance.get_normalized_quantity()

    def get_price(self, instance):
        price = instance.calculate_quantity_price()
        data = get_amount_dictionary(price)
        return data
    
    def get_receiving_type(self, instance):
        if instance.supplier_delivery_date_quantity.general_po_material_quantity.general_po.po_club:
            return 'GRN'
        else:
            return 'General PO'

    class Meta:
        model = SupplierDeliveryDateQuantityPOAllocation
        fields = (
            'id', 'supplier_id', 'supplier_name', 'supplier_po_id', 'supplier_po', 'required_quantity', 'order_quantity', 'grn_quantity', 'price', 'attachment_display_name', 'attachment_file_path', 'receiving_type', 'purchase_order_id', 'purchase_order', 'gantt_chart'
          )
        

class POClubProfitabilitySupplierPOSerializer(serializers.ModelSerializer):
    supplier_id = serializers.IntegerField(source='general_po_supplier.supplier.id', read_only=True)
    supplier_name = serializers.CharField(source='general_po_supplier.supplier.name', read_only=True)
    attachment_display_name = serializers.CharField(source='supplier_po_file.display_name' ,read_only=True)
    attachment_file_path = serializers.CharField(source='supplier_po_file.file_path',read_only=True)
    material_types = serializers.SerializerMethodField()
    total_price = serializers.SerializerMethodField()
    payments = serializers.SerializerMethodField()

    def get_total_price(self, instance):
        data = get_amount_dictionary(instance.total_price)
        return data

    def get_material_types(self, instance):
        supplier_materials = instance.get_supplier_po_material_list()
        material_types = supplier_materials.values_list(
            'customer_brand_material__material_detail__generic_material__user_material__material', flat=True
        ).order_by('customer_brand_material__material_detail__generic_material__user_material__display_order').distinct()
        return list(material_types)
    
    def get_advance_payment(self, instance):
        data = {}
        settlement = None
        if instance.advance_payment_outgoing_payment:
            if instance.advance_payment_outgoing_payment.taken_pcl_purchase_order:
                settlement = instance.advance_payment_outgoing_payment.taken_pcl_purchase_order.display_number
                amount = get_amount_dictionary(instance.advance_payment_outgoing_payment.amount)
                data = {
                    'payment_term': 'Advance',
                    'payment_date': instance.advance_payment_outgoing_payment.payment_date,
                    'amount': amount,
                    'settlement': settlement
                }
        return data
    
    def get_payments(self, instance):
        data = []
        advance_payment = self.get_advance_payment(instance)
        if advance_payment:
            data.append(advance_payment)
        return data
    
    class Meta:
        model = SupplierPO
        fields = (
            'id', 'supplier_id', 'supplier_name', 'supplier_po_number', 'supplier_po_file', 'attachment_display_name',
            'attachment_file_path', 'material_types', 'total_price', 'payments'
          )


class OutgoingPaymentSerializer(serializers.ModelSerializer):
    display_number = serializers.CharField()
    payment_method_display = serializers.CharField(source='get_payment_method_display')
    amount = serializers.SerializerMethodField()

    def get_amount(self, instance):
        amount = 0
        if instance.amount:
            amount = instance.amount
        data = get_amount_dictionary(amount)
        return data
    
    def get_supplier_po_id(self, invoice):
        supplier_po = invoice.get_supplier_po()
        if supplier_po:
            return supplier_po.id
        return None
    
    def get_supplier(self, invoice):
        supplier_po = invoice.get_supplier_po()
        if supplier_po:
            return supplier_po.general_po_supplier.supplier.name
        return None
    
    def get_supplier_po_display_number(self, invoice):
        supplier_po = invoice.get_supplier_po()
        if supplier_po:
            return supplier_po.supplier_po_number
        return None
    
    def get_supplier_po_file_path(self, invoice):
        supplier_po = invoice.get_supplier_po()
        if supplier_po:
            return supplier_po.supplier_po_file.file_path
        return None
    
    def get_general_po_id(self, invoice):
        supplier_po = invoice.get_supplier_po()
        if supplier_po:
            if supplier_po.general_po_supplier:
                return supplier_po.general_po_supplier.general_po.id
        return None
    
    def get_general_po_display_number(self, invoice):
        supplier_po = invoice.get_supplier_po()
        if supplier_po:
            if supplier_po.general_po_supplier:
                return supplier_po.general_po_supplier.general_po.display_number
        return None


    class Meta:
        model = OutgoingPayment
        fields = ('id', 'display_number', 'amount', 'currency', 'payment_date', 'payment_method', 'payment_method_display', 'complete',  )



class IncomingPaymentSerializer(serializers.ModelSerializer):
    display_number = serializers.CharField()
    purchase_order_payments = serializers.SerializerMethodField()
    amount = serializers.SerializerMethodField()
    currency = serializers.CharField()

    def get_amount(self, instance):
        amount = 0
        if instance.amount:
            amount = instance.amount
        data = get_amount_dictionary(amount)
        return data

    def get_purchase_order_payments(self, instance):
        data = []
        po_deliveries = PurchaseOrderDelivery.objects.filter(outgoing_commercial_invoice=instance.outgoing_commercial_invoice)
        for po_delivery in po_deliveries:
            purchase_order_amount = 0
            if po_delivery.outgoing_commercial_invoice:
                purchase_order_amount = po_delivery.outgoing_commercial_invoice.amount
            amount_data = get_amount_dictionary(purchase_order_amount)
            data.append({
                'id': po_delivery.id,
                'display_number': po_delivery.display_number,
                'purchase_order': po_delivery.purchase_order.display_number,
                'purchase_order_id': po_delivery.purchase_order.id,
                'delivery_date': po_delivery.delivery_date,
                'po_club': po_delivery.purchase_order.actual_po_club.display_number,
                'outgoing_commercial_invoice': po_delivery.outgoing_commercial_invoice.id if po_delivery.outgoing_commercial_invoice else None,
                'amount': amount_data,
                'due_date': po_delivery.outgoing_commercial_invoice.due_date if po_delivery.outgoing_commercial_invoice else None,
            })
        return data
    
    def get_outgoing_commercial_invoice_display_number(self, instance):
        display_number = None
        if instance.outgoing_commercial_invoice:
            display_number = instance.outgoing_commercial_invoice.display_number
        return display_number
    
    class Meta:
        model = IncomingPayment
        fields = ('id', 'display_number', 'amount', 'currency', 'payment_date', 'complete', 'purchase_order_payments')


class SupplierPODeliveryDateSerializer(serializers.ModelSerializer):
    display_number = serializers.CharField()
    materials = serializers.SerializerMethodField()
    pcl_value = serializers.SerializerMethodField()
    pcl_date = serializers.SerializerMethodField()
    covered_customer_po = serializers.SerializerMethodField()
    invoice = serializers.SerializerMethodField()

    def get_pcl_value(self, instance):
        pcl_value = 0
        invoice = instance.get_delivery_invoice()
        if invoice:
            outgoing_payments = invoice.get_outgoing_payments()
            pcl_value = calculate_queryset_total_amount_normalized_amount(outgoing_payments, 'amount', CurrencyHelper.USD_CURRENCY)
        data = get_amount_dictionary(pcl_value)
        return data
    
    def get_pcl_date(self, instance):
        pcl_dates = []
        invoice = instance.get_delivery_invoice()
        if invoice:
            outgoing_payments = invoice.get_outgoing_payments()
            for outgoing_payment in outgoing_payments:
                pcl_dates.append(
                    outgoing_payment.pcl_create_date
                )
        return pcl_dates
    
    def get_covered_customer_po(self, instance):
        data = []
        invoice = instance.get_delivery_invoice()
        if invoice:
            po_clubs = invoice.get_covered_po_clubs()
            po_deliveries = PurchaseOrderDelivery.objects.filter(purchase_order__actual_po_club__in=po_clubs)
            for purchase_order_delivery in po_deliveries:
                data.append({
                    'id': purchase_order_delivery.id,
                    'display_number': purchase_order_delivery.purchase_order.display_number
                })
        return data
    
    def get_invoice(self, instance):
        data = {}
        invoice = instance.get_delivery_invoice()
        if invoice:
            data = {
                'id': invoice.id,
                'display_number': invoice.display_number,
                'file_path': invoice.invoice.file_path if invoice.invoice else None
            }
        return data

    def get_materials(self, instance):
        material_ids = SupplierDeliveryDateQuantity.objects.filter(
            supplier_delivery_date=instance
        ).values_list('material_supplier__supplier_material', flat=True)
        materials = SupplierInquiryMaterialCode.objects.filter(id__in=material_ids)
        data = SupplierInquiryMaterialCodeSerilizer(materials, many=True).data
        return data

    class Meta:
        fields = ('id', 'display_number', 'confirmed_delivery_date', 'materials', 'pcl_value', 'pcl_date', 'covered_customer_po', 'invoice')
        model = SupplierDeliveryDate

class POClubPaymentSerializer(serializers.ModelSerializer):
    buyer_name = serializers.SerializerMethodField()
    purchase_orders = serializers.SerializerMethodField()
    incoming_payments = serializers.SerializerMethodField()
    supplier_pos = serializers.SerializerMethodField()
    amount = serializers.SerializerMethodField()

    def get_buyer_name(self, instance):
        buyer_name = instance.purchaseorder_set.filter()[0].costing_version.order.customer.name
        return buyer_name

    def get_purchase_orders(self, instance):
        data = []
        for purchase_order in instance.purchaseorder_set.all():
            data.append({
                'id': purchase_order.id,
                'display_number': purchase_order.display_number,
            })
        return data
    
    def get_incoming_payments(self, instance):
        outgoing_commercial_invoice_ids = PurchaseOrderDelivery.objects.filter(purchase_order__actual_po_club=instance).values_list(
            'outgoing_commercial_invoice', flat=True
        )
        incoming_payments = IncomingPayment.objects.filter(outgoing_commercial_invoice_id__in=outgoing_commercial_invoice_ids)
        data = IncomingPaymentSerializer(incoming_payments, many=True).data
        return data
    
    def get_amount(self, instance):
        outgoing_commercial_invoice_ids = PurchaseOrderDelivery.objects.filter(purchase_order__actual_po_club=instance).values_list(
            'outgoing_commercial_invoice', flat=True
        )
        incomming_payments = IncomingPayment.objects.filter(outgoing_commercial_invoice_id__in=outgoing_commercial_invoice_ids)
        amount = calculate_queryset_total_amount_normalized_amount(incomming_payments, 'amount')
        data = get_amount_dictionary(amount)
        return data

    def get_supplier_pos(self, instance):
        spos = SupplierPO.objects.filter(
            general_po_supplier__general_po__po_club=instance
        )
        data = PaymentSupplierPOSerializer(spos, many=True).data
        return data

    class Meta:
        model = ActualPOClub
        fields = ('id', 'display_number', 'buyer_name', 'purchase_orders', 'amount', 'incoming_payments', 'supplier_pos')



class IncomingPaymentActionSerializer(serializers.ModelSerializer):
    amount = serializers.FloatField()
    payment_date = serializers.DateField()
    currency = serializers.CharField()
    complete = serializers.BooleanField(default=False)
    outgoing_commercial_invoice_id = serializers.PrimaryKeyRelatedField(queryset=OutgoingCommercialInvoice.objects.all(), write_only=True)

    def to_internal_value(self, data):
        if 'amount' in data and isinstance(data['amount'], dict):
            data['amount'] = data['amount'].get('amount')
        #self.purchase_order_delivery_id = data.get('purchase_order_delivery_id')
        return super().to_internal_value(data)
    
    def create(self, validated_data):
        outgoing_commercial_invoice_id = validated_data.pop('outgoing_commercial_invoice_id', None)
        # outgoing_commercial_invoice = get_object_or_404(OutgoingCommercialInvoice, pk=outgoing_commercial_invoice_id)
        incoming_payment = IncomingPayment.objects.create(**validated_data)
        if outgoing_commercial_invoice_id:
            incoming_payment.outgoing_commercial_invoice = outgoing_commercial_invoice_id
            incoming_payment.save()
        return incoming_payment
    
    class Meta:
        model = IncomingPayment
        fields = '__all__'

# class OutgoingPaymentActionSerializer(serializers.ModelSerializer):
#     amount = serializers.FloatField()
#     payment_date = serializers.DateField()
#     complete = serializers.BooleanField()
#     pcl_settle_date = serializers.DateField(required=False, allow_null=True)
#     pcl_create_date = serializers.DateField(required=False, allow_null=True)
#     complete = serializers.BooleanField()
#     taken_from = serializers.PrimaryKeyRelatedField(queryset=IncomingPayment.objects.all(), many=True, write_only=True)
    
#     def to_internal_value(self, data):
#         if 'amount' in data and isinstance(data['amount'], dict):
#             data['amount'] = data['amount'].get('amount')
#         return super().to_internal_value(data)
    
#     def create(self, validated_data):
#         taken_from_data = validated_data.pop('taken_from', [])
#         outgoing_payment = super().create(validated_data)
#         for incoming_payment in taken_from_data:
#             OutgoingPaymentTakenFrom.objects.create(
#                 amount=incoming_payment.amount,
#                 currency=incoming_payment.currency,
#                 outgoing_payment=outgoing_payment,
#                 incoming_payment=incoming_payment
#             )
#         return outgoing_payment
    
#     class Meta:
#         model = OutgoingPayment
#         fields = '__all__'


# class OutgoingPaymentTakenFromSerializer(serializers.ModelSerializer):
#     id = serializers.IntegerField(required=False, allow_null=True)
#     incoming_payment_id = serializers.IntegerField()
#     amount = serializers.FloatField()
#     currency = serializers.CharField()

#     def to_internal_value(self, data):
#         if 'amount' in data and isinstance(data['amount'], dict):
#             data['amount'] = data['amount'].get('amount')
#         return super().to_internal_value(data)

#     class Meta:
#         model = OutgoingPaymentTakenFrom
#         fields = ['id', 'incoming_payment_id', 'amount', 'currency']


class OutgoingPaymentActionSerializer(serializers.ModelSerializer):
    amount = serializers.FloatField()
    payment_date = serializers.DateField()
    complete = serializers.BooleanField()
    complete = serializers.BooleanField()
    type = serializers.CharField(write_only=True, required=False)
    supplier_po_or_delivery_invoice_id = serializers.IntegerField(write_only=True, required=False) #This is not outgoing payment id. it may be supplier po id or supplierpodeliveryinvoice id to map outgoing payment 

    def to_internal_value(self, data):
        if 'amount' in data and isinstance(data['amount'], dict):
            data['amount'] = data['amount'].get('amount')
        return super().to_internal_value(data)

    def create(self, validated_data):
        type = validated_data.pop('type', None)
        supplier_po_or_delivery_invoice_id = validated_data.pop('supplier_po_or_delivery_invoice_id', None)
        outgoing_payment = super().create(validated_data)
        if type == 'advance':
            supplier_po = get_object_or_404(SupplierPO, pk=supplier_po_or_delivery_invoice_id)
            supplier_po.advance_payment = outgoing_payment.amount
            supplier_po.advance_payment_currency = outgoing_payment.currency
            supplier_po.advance_payment_outgoing_payment = outgoing_payment
            supplier_po.save()
        elif type == 'outgoing':
            supplier_po_delivery_invoice = get_object_or_404(SupplierPODeliveryInvoice, pk=supplier_po_or_delivery_invoice_id)
            supplier_po_delivery_invoice.payment = outgoing_payment
            supplier_po_delivery_invoice.save()
        return outgoing_payment
    
    def update(self, instance, validated_data):
        outgoing_payment = super().update(instance, validated_data)
        return outgoing_payment

    class Meta:
        model = OutgoingPayment
        fields = '__all__'


class IncomingPaymentDeductionActionSerializer(serializers.ModelSerializer):
    amount = serializers.FloatField()
    currency = serializers.CharField()
    reason = serializers.CharField()

    def to_internal_value(self, data):
        if 'amount' in data and isinstance(data['amount'], dict):
            data['amount'] = data['amount'].get('amount')
        return super().to_internal_value(data)
    
    class Meta:
        model = IncomingPaymentDeduction
        fields = '__all__'


class OutgoingCommercialInvoiceActionSerializer(serializers.ModelSerializer):
    amount = serializers.FloatField()
    due_date = serializers.DateField()
    #purchaseorderdelivery_set = PurchaseOrderDeliveryUpdateSerializer(many=True)
    purchase_order_delivery_id = serializers.IntegerField(write_only=True, allow_null=True)

    def to_internal_value(self, data):
        if 'amount' in data and isinstance(data['amount'], dict):
            data['amount'] = data['amount'].get('amount')
        return super().to_internal_value(data)
    
    def get_incoming_payments(self, instance):
        data = IncomingPaymentSerializer(instance.incomingpayment_set.all(), many=True).data
        return data

    def validate(self, data):
        purchase_order_delivery_id = data.pop('purchase_order_delivery_id')
        super().validate(data)
        data['purchase_order_delivery_id'] = purchase_order_delivery_id
        return data
    
    def create(self, validated_data):
        purchase_order_delivery_id = validated_data.pop('purchase_order_delivery_id')
        outgoing_invoice = OutgoingCommercialInvoice.objects.create(**validated_data)
        purchase_order_delivery = get_object_or_404(PurchaseOrderDelivery, pk=purchase_order_delivery_id)
        purchase_order_delivery.outgoing_commercial_invoice = outgoing_invoice
        purchase_order_delivery.save()
        return outgoing_invoice
    
    class Meta:
        model = OutgoingCommercialInvoice
        fields = ('id', 'display_number', 'amount', 'customer', 'currency', 'due_date', 'purchase_order_delivery_id')
        sorted = '-id'


class CustomerPaymentSummarySerilaizer(serializers.ModelSerializer):
    pcl_categories = serializers.SerializerMethodField()

    def get_pcl_categories(self, instance):
        EQUAL_TO_70_PRECENT_KEY = 'euqal_to_70_precent'
        GREATER_THAN_70_PRECENT_KEY = 'greater_than_70_precent'
        LESS_THAN_70_PRECENT_KEY = 'less_than_70_present'
        
        data = [
            {'name': EQUAL_TO_70_PRECENT_KEY, 'po_clubs': []},
            {'name': GREATER_THAN_70_PRECENT_KEY, 'po_clubs': []},
            {'name': LESS_THAN_70_PRECENT_KEY, 'po_clubs': []}
        ]

        po_clubs = ActualPOClub.objects.filter(
            id__in=PurchaseOrder.objects.filter(costing_version__order__customer=instance).values_list('actual_po_club', flat=True)
        ).exclude(state__in=[ActualPOClub.CANCELED_STATE, ActualPOClub.COMPLETE_STATE]).order_by('-id')
        
        for po_club in po_clubs:
            paid_percentage = 0
            if po_club.material_fob_presentage:
                paid_percentage = po_club.material_fob_presentage
            
            po_club_data = {
                'po_club_id': po_club.id,
                'po_club': po_club.display_number,
                'short_code': po_club.short_code,
                'long_code': po_club.long_code,
                'is_create_supplier_pos': po_club.is_create_supplier_pos()
            }

            if paid_percentage == 70:
                data[0]['po_clubs'].append(po_club_data)
            elif paid_percentage > 70:
                data[1]['po_clubs'].append(po_club_data)
            elif paid_percentage < 70:
                data[2]['po_clubs'].append(po_club_data)

        return data
    
    class Meta:
        model = Customer
        fields = ('id', 'name', 'phone_number', 'email', 'code', 'pcl_categories')


class TestSerilaizerPagination(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    is_new_precentage = serializers.SerializerMethodField()
    is_new_customer = serializers.SerializerMethodField()
    previous_object_id = serializers.SerializerMethodField()

    
    def get_is_new_precentage(self, instance):
        is_new_precentage = False
        previous_actual_po_club = self.get_previous_record(instance)
        if previous_actual_po_club:
            previous_precentage = previous_actual_po_club.material_fob_presentage
            current_precentage = instance.material_fob_presentage
            if previous_precentage == 70 and current_precentage==70:
                is_new_precentage = False
            elif previous_precentage > 70 and current_precentage  > 70:
                is_new_precentage = False
            elif previous_precentage < 70 and current_precentage  < 70:
                is_new_precentage = False
            else:
                is_new_precentage =True
        return is_new_precentage
    
    def get_previous_record(self, instance):
        previous_actual_po_club = get_object_or_none(ActualPOClub, {'pk':self.context.get('previous_id')})
        return previous_actual_po_club
    
    def get_customer_name(self, instance):
        customer = instance.customer_name
        return customer
    
    def get_is_new_customer(self, instance):
        is_new_customer = False
        previous_actual_po_club = self.get_previous_record(instance)
        if previous_actual_po_club:
            previous_customer = previous_actual_po_club.customer_name
            current_customer = instance.customer_name
            if previous_customer != current_customer:
                is_new_customer = True
        return is_new_customer

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        self.context['previous_id'] = representation['id'] 
        return representation
    
    def get_previous_object_id(self, instance):
        return self.context.get('previous_id')


    class Meta:
        model = ActualPOClub
        fields = ('id', 'display_number', 'material_fob_presentage', 'is_new_precentage', 'is_new_customer', 'customer_name', 'previous_object_id', )


class ProfitabilitySupplierDeliveryDateSerializer(serializers.ModelSerializer):

    class Meta:
        model = SupplierDeliveryDate
        fields = ('id', 'display_number', 'created', )



class ActualClubCustomerPaymentSummarySerilaizer(serializers.ModelSerializer):
    fob_total_value = serializers.SerializerMethodField()
    supplier_po_raw_material_total_cost = serializers.SerializerMethodField()
    supplier_po_raw_material_total_paid = serializers.SerializerMethodField()
    fob_presentage = serializers.SerializerMethodField()
    max_pcl_value = serializers.SerializerMethodField()
    purchase_orders = serializers.SerializerMethodField()
    supplier_pos = serializers.SerializerMethodField()
    supplier_pos_summary = serializers.SerializerMethodField()
    profitability_details = serializers.SerializerMethodField()
    delivery_payments = serializers.SerializerMethodField()
    incoming_payments = serializers.SerializerMethodField()
    outgoing_payments = serializers.SerializerMethodField()
    pcl_matching_details = serializers.SerializerMethodField()
    pcl_bank_information = serializers.SerializerMethodField()
    is_pcl_create = serializers.SerializerMethodField()
    pcl_bank_information_id = serializers.SerializerMethodField()
    gantt_chart = serializers.SerializerMethodField()
    
    def get_payment_data(self, instance):
        outgoing_payments = instance.get_outgoing_payments()

        grouped_data = {}
        for outgoing_payment in outgoing_payments:
            invoice_data = []
            supplier_po_data = []
            invoices = outgoing_payment.get_supplier_po_delivery_invoices()
            supplier_pos = outgoing_payment.get_supplier_pos()
            grns = SupplierPOGRN.objects.filter(supplier_pack_list__supplier_po_delivery_note__supplier_po_delivery_invoice__in=invoices)

            for invoice in invoices:
                invoice_data.append({'id': invoice.id, 'display_number': invoice.display_number})

            for supplier_po in supplier_pos:
                invoice_data.append({'id': supplier_po.id, 'display_number': supplier_po.proforma_invoice_supplier_display_number })
           

            activity_type = outgoing_payment.display_number
            
            if activity_type not in grouped_data:
                grouped_data[activity_type] = {
                    'id': outgoing_payment.id,
                    'display_number': activity_type,
                    'invoice_data': invoice_data,
                    'supplier_po_data': supplier_po_data,
                    'pcl_activities': [],
                    'invoice_spo_data': self.get_gantt_chart_material_data(outgoing_payment)
                }

            for invoice in invoices:
                grouped_data[activity_type]['pcl_activities'].append(
                    {'id': invoice.id, 'date': invoice.created.date(), 'activity': 'CI Created Date', 'key': 'ci_create_date'}
                )

            for po in supplier_pos:
                grouped_data[activity_type]['pcl_activities'].append(
                    {'id': po.id, 'date': po.proforma_invoice_date, 'activity': 'PI Created Date', 'key': 'pi_create_date'}
                )

            if grns:
                complete_date = grns[0].complete_date
                grouped_data[activity_type]['pcl_activities'].append(
                    {'id': outgoing_payment.id, 'date': complete_date, 'activity': 'GRN Complete Date', 'key': 'grn_complete_date'}
                )


            grouped_data[activity_type]['pcl_activities'].append(
                {'id': outgoing_payment.id, 'date': outgoing_payment.pcl_create_date, 'activity': 'PCL Open', 'key': 'pcl_open_date'}
            )

            grouped_data[activity_type]['pcl_activities'].append(
                {'id': outgoing_payment.id, 'date': outgoing_payment.pcl_end_date, 'activity': 'PCL End', 'key': 'pcl_end_date'}
            )

            grouped_data[activity_type]['pcl_activities'].append(
                {'id': outgoing_payment.id, 'date': outgoing_payment.pcl_settle_date, 'activity': 'PCL Settle', 'key': 'pcl_settle_date'}
            )

        return list(grouped_data.values())
    
    def get_gantt_chart_material_data(self, outgoing_payment):
        data = {}
        supplier_pos = outgoing_payment.get_supplier_pos()
        invoices = outgoing_payment.get_supplier_po_delivery_invoices()

        for supplier_po in supplier_pos:
            materials = supplier_po.get_supplier_po_material_list()
            po_club = supplier_po.po_club
            date_key = str(supplier_po.advance_payment_due_date)

            if date_key not in data:
                data[date_key] = []

            supplier_data = {
                'id': supplier_po.id,
                'display_number': supplier_po.pi_display_number(),
                'type': 'advance',
                'club_id': po_club.id if po_club else None,
                'club_display_number': po_club.short_code if po_club else None,
                'materials': []
            }
            for material in materials:
                material_data = {
                    'material_id': material.id,
                    'headers': material.customer_brand_material.material_detail.generic_material.user_material.get_material_headers(material.customer_brand_material.material_detail.generic_material.user_material.name),
                    'attributes': material.customer_brand_material.get_attributes()
                }
                supplier_data['materials'].append(material_data)

            data[date_key].append(supplier_data)

        for invoice in invoices:
            materials = invoice.get_delivery_invoice_material_list()
            po_club = invoice.get_costing_or_po_club()
            date_key = str(invoice.created.date())

            if date_key not in data:
                data[date_key] = []

            invoice_data = {
                'id': invoice.id,
                'display_number': invoice.display_number,
                'type': 'invoice',
                'club_id': po_club.id if po_club else None,
                'club_display_number': po_club.short_code if po_club else None,
                'materials': []
            }
            for material in materials:
                material_data = {
                    'material_id': material.id,
                    'headers': material.customer_brand_material.material_detail.generic_material.user_material.get_material_headers(material.customer_brand_material.material_detail.generic_material.user_material.name),
                    'attributes': material.customer_brand_material.get_attributes()
                }
                invoice_data['materials'].append(material_data)

            data[date_key].append(invoice_data)

        return data
    
    def get_gantt_chart(self, instance):
        pcl_bank_information = None
        pcl_bank_information_linked_po_clubs = instance.pclbankinformationlinkedpoclub_set.all()
        if pcl_bank_information_linked_po_clubs:
            pcl_bank_information = pcl_bank_information_linked_po_clubs[0].pcl_bank_information
        data = {
            'shipment_dates': {},
            'pcl_facility_data': [],
            'data': []
        }
        shipment_dates = PurchaseOrderDelivery.objects.filter(
            purchase_order__actual_po_club=instance
        ).order_by('delivery_date')
        for shipment_date in shipment_dates:
            delivery_date_str = str(shipment_date.delivery_date)
            if delivery_date_str not in data['shipment_dates']:
                data['shipment_dates'][delivery_date_str] = []

            data['shipment_dates'][delivery_date_str].append({
                'id': shipment_date.id,
                'amount': get_amount_dictionary(shipment_date.total_amount),
                'display_number': shipment_date.display_number,
                'purchase_order_display_number': shipment_date.purchase_order.display_number,
                'outgoing_commercial_invoice_due_date': shipment_date.outgoing_commercial_invoice.due_date if shipment_date.outgoing_commercial_invoice else None,
                'outgoing_commercial_invoice_amount': get_amount_dictionary(shipment_date.outgoing_commercial_invoice.amount) if shipment_date.outgoing_commercial_invoice else None
            })
        data['data'] = self.get_payment_data(instance)
        if pcl_bank_information:
            data['pcl_facility_data'].append({'date': pcl_bank_information.pcl_facility_start_date, 'activity': 'PCL Facility Start'})
            data['pcl_facility_data'].append({'date': pcl_bank_information.pcl_facility_end_date, 'activity': 'PCL Facility End'})
        return data
    
    def get_materials(self, instance):
        material_ids = SupplierDeliveryDateQuantityPOAllocation.objects.filter(
            purchase_order__in=instance.get_purchase_orders()
        ).values_list('supplier_delivery_date_quantity__material_supplier__supplier_material__customer_brand_material', flat=True)
        materials = CustomerBrandMaterial.objects.filter(id__in=material_ids)
        return materials
    
    def set_supplier_po_data(self, supplier_delivery_date_quantity_po_allocations, material):
        filter_data = supplier_delivery_date_quantity_po_allocations.filter(supplier_delivery_date_quantity__material_supplier__supplier_material__customer_brand_material=material)
        serialize_data = PaymentSummaryMaterialSerializer(filter_data, many=True).data
        data = {
            'id': material.id,
            'headers': UserDefinedMaterial.get_material_headers(material.material_detail.generic_material.user_material.name),
            'attributes': material.get_attributes(),
            'supplier_data': serialize_data
        }
        return data

    def get_supplier_pos(self, instance):
        data = []
        fabric_data = {
            'category': FABRIC_TRIM_TYPES,
            'material_data': []
        }
        sewing_trim_data = {
            'category': SEWING_TRIM_TYPES,
            'material_data': []
        }
        packaging_data = {
            'category': PACKAGING_TYPES,
            'material_data': []
        }

        supplier_delivery_date_quantity_po_allocations = SupplierDeliveryDateQuantityPOAllocation.objects.filter(
            supplier_delivery_date_quantity__general_po_material_quantity__general_po__po_club=instance
        ).order_by('id')

        materials = self.get_materials(instance)
        for material in materials:
            if material.material_category == FABRIC_TRIM_TYPES:
                supplier_po_data = self.set_supplier_po_data(supplier_delivery_date_quantity_po_allocations, material)
                fabric_data['material_data'].append(supplier_po_data)
            elif material.material_category == SEWING_TRIM_TYPES:
                supplier_po_data = self.set_supplier_po_data(supplier_delivery_date_quantity_po_allocations, material)
                sewing_trim_data['material_data'].append(supplier_po_data)
            elif material.material_category == PACKAGING_TYPES:
                supplier_po_data = self.set_supplier_po_data(supplier_delivery_date_quantity_po_allocations, material)
                packaging_data['material_data'].append(supplier_po_data)

        data.append(fabric_data)
        data.append(sewing_trim_data)
        data.append(packaging_data)
        return data
    
    def get_supplier_pos_summary(self, instance):
        data = {}
        supplier_pos = instance.get_supplier_pos()
        supplier_pos_total_amount = calculate_queryset_total_amount_normalized_amount(supplier_pos, 'total_price')
        supplier_pos_total_amount_data = get_amount_dictionary(supplier_pos_total_amount)

        outging_payments = instance.get_outgoing_payments()
        supplier_pos_total_paid_amount = calculate_queryset_total_amount_normalized_amount(outging_payments, 'amount')
        supplier_pos_total_paid_amount_data = get_amount_dictionary(supplier_pos_total_paid_amount)

        advance_payment_outgoing_payment_ids = supplier_pos.filter().values_list('advance_payment_outgoing_payment', flat=True)
        advance_payment_outgoing_payments = OutgoingPayment.objects.filter(id__in=advance_payment_outgoing_payment_ids)

        supplier_pos_total_advance_amount = calculate_queryset_total_amount_normalized_amount(advance_payment_outgoing_payments, 'amount')
        supplier_pos_total_advance_amount_data = get_amount_dictionary(supplier_pos_total_advance_amount)
        data = {
            'supplier_pos_total_amount': supplier_pos_total_amount_data,
            'supplier_pos_total_paid_amount': supplier_pos_total_paid_amount_data,
            'supplier_pos_total_advance_amount': supplier_pos_total_advance_amount_data,
        }
        return data
    
    def get_material_types(self, qs, material_category):
        material_types = qs.filter(
            supplier_delivery_date_quantity__material_supplier__supplier_material__customer_brand_material__material_detail__generic_material__user_material__category=material_category
        ).values_list(
            'supplier_delivery_date_quantity__general_po_material_quantity__material__material_detail__generic_material__user_material__material', flat=True
        ).order_by('supplier_delivery_date_quantity__general_po_material_quantity__material__material_detail__generic_material__user_material__display_order').distinct()
        return list(material_types)
    
    def get_total_amount_of_selected_delivery_date_quantity_po_allocation_price_by_material_category(self, qs, material_category, supplier_po, delivery_date):
        total_amount = 0
        filtered_qs = qs.filter(
            supplier_delivery_date_quantity__material_supplier__supplier_material__customer_brand_material__material_detail__generic_material__user_material__category=material_category,
            supplier_delivery_date_quantity__material_supplier__general_po_supplier__supplierpo=supplier_po,
            supplier_delivery_date_quantity__supplier_delivery_date=delivery_date
        )
        for row in filtered_qs:
            total_amount += row.calculate_quantity_price()
        data = get_amount_dictionary(total_amount)
        return data
    
    def get_total_quantity_of_selected_delivery_date_quantity_po_allocation_price_by_material_category(self, qs, material_category, supplier_po):
        total_quantity = 0
        filtered_qs = qs.filter(
            supplier_delivery_date_quantity__material_supplier__supplier_material__customer_brand_material__material_detail__generic_material__user_material__category=material_category,
            supplier_delivery_date_quantity__material_supplier__general_po_supplier__supplierpo=supplier_po
        )
        
        for row in filtered_qs:
            total_quantity += row.get_normalized_quantity()['quantity']
        data = get_quantity_dictionary(total_quantity, MaterialUnitHelper.METERS_UNIT)
        return data
    
    def set_profitability_data(self, supplier_delivery_date_quantity_po_allocations, category, supplier_pos):
        data = []
        for supplier_po in supplier_pos:
            supplier_po_data = {
                'id': supplier_po.id,
                'display_number': supplier_po.supplier_po_number,
                'file_path': supplier_po.supplier_po_file.file_path if supplier_po.supplier_po_file else None,
                'supplier_name': supplier_po.general_po_supplier.supplier.name,
                'payment_terms': supplier_po.get_payment_term_display_list(),
                'delivery_dates': []
            }
            delivery_dates = supplier_po.supplier_po_delivery_dates
            for delivery_date in delivery_dates:
                total_amount = self.get_total_amount_of_selected_delivery_date_quantity_po_allocation_price_by_material_category(supplier_delivery_date_quantity_po_allocations, category, supplier_po, delivery_date)
                total_quantity = self.get_total_quantity_of_selected_delivery_date_quantity_po_allocation_price_by_material_category(supplier_delivery_date_quantity_po_allocations, category, supplier_po)
                date_data = {
                    'id': delivery_date.id,
                    'confirmed_delivery_date': delivery_date.confirmed_delivery_date,
                    'quantity': total_quantity,
                    'amount': total_amount,
                    'settlement_po_id': None,# delivery_date.get_settlement_po().id if delivery_date.get_settlement_po() else None,
                    'settlement_po_display_number': None#delivery_date.get_settlement_po().display_number if delivery_date.get_settlement_po() else None
                }
                supplier_po_data['delivery_dates'].append(date_data)
            data.append(supplier_po_data)
        return data

    def get_profitability_details(self, instance):
        data = []
        fabric_data = {
            'category': FABRIC_TRIM_TYPES,
            'material_categories': [],
            'supplier_data': []
        }
        sewing_trim_data = {
            'category': SEWING_TRIM_TYPES,
            'material_categories': [],
            'supplier_data': []
        }
        packaging_data = {
            'category': PACKAGING_TYPES,
            'material_categories': [],
            'supplier_data': []
        }
        
        supplier_delivery_date_quantity_po_allocations = SupplierDeliveryDateQuantityPOAllocation.objects.filter(
            supplier_delivery_date_quantity__general_po_material_quantity__general_po__po_club=instance
        )

        fabric_data['material_categories'] = self.get_material_types(supplier_delivery_date_quantity_po_allocations, FABRIC_TRIM_TYPES)
        sewing_trim_data['material_categories'] = self.get_material_types(supplier_delivery_date_quantity_po_allocations, SEWING_TRIM_TYPES)
        packaging_data['material_categories'] = self.get_material_types(supplier_delivery_date_quantity_po_allocations, PACKAGING_TYPES)

        fabric_supplier_pos = instance.get_material_category_supplier_pos(supplier_delivery_date_quantity_po_allocations, FABRIC_TRIM_TYPES)
        sewing_trim_supplier_pos = instance.get_material_category_supplier_pos(supplier_delivery_date_quantity_po_allocations, SEWING_TRIM_TYPES)
        packaging_trim_supplier_pos = instance.get_material_category_supplier_pos(supplier_delivery_date_quantity_po_allocations, PACKAGING_TYPES)
        
        fabric_data['supplier_data'] = self.set_profitability_data(supplier_delivery_date_quantity_po_allocations, FABRIC_TRIM_TYPES, fabric_supplier_pos)
        sewing_trim_data['supplier_data'] = self.set_profitability_data(supplier_delivery_date_quantity_po_allocations, SEWING_TRIM_TYPES, sewing_trim_supplier_pos)
        packaging_data['supplier_data'] = self.set_profitability_data(supplier_delivery_date_quantity_po_allocations, PACKAGING_TYPES, packaging_trim_supplier_pos)

        data.append(fabric_data)
        data.append(sewing_trim_data)
        data.append(packaging_data)

        return data
    
    def get_fob_total_value(self, instance):
        fob_total_value = instance.total_fob_value
        data = get_amount_dictionary(fob_total_value)
        return data
    
    def get_supplier_po_raw_material_total_cost(self, instance):
        supplier_po_raw_material_total_cost = instance.total_raw_material_cost
        data = get_amount_dictionary(supplier_po_raw_material_total_cost)
        return data
    
    def get_supplier_po_raw_material_total_paid(self, instance):
        supplier_po_raw_material_total_paid = instance.get_supplier_po_raw_material_total_paid()
        data = get_amount_dictionary(supplier_po_raw_material_total_paid)
        return data
    
    def get_fob_presentage(self, instance):
        precentage = instance.material_fob_presentage
        return precentage
    
    def get_max_pcl_value(self, instance):
        max_pcl_value = instance.max_pcl_value
        data = get_amount_dictionary(max_pcl_value)
        return data
    
    def get_purchase_orders(self, instance):
        data = []
        for purchase_order in instance.get_purchase_orders():
            fob_total_value = purchase_order.total_fob_value
            max_pcl_value = purchase_order.max_pcl_value
            data.append({
                'id': purchase_order.id,
                'display_number': purchase_order.display_number,
                'fob_total_value':  get_amount_dictionary(fob_total_value),
                'max_pcl_value':  get_amount_dictionary(max_pcl_value)
            })
        return data
    
    def get_delivery_payments(self, instance):
        delivery_dates = instance.get_delivery_dates()
        data = PaymentGanttChartSerializer(delivery_dates, many=True).data
        return data
    
    def get_incoming_payments(self, instance):
        data = []
        purchase_order_deliveries = instance.get_purchase_order_deliveries()
        for purchase_order_delivery in purchase_order_deliveries:
            delivery_data = {
                'id': purchase_order_delivery.id,
                'display_number': purchase_order_delivery.display_number,
                'delivery_date': purchase_order_delivery.delivery_date,
                'purchase_order_id': purchase_order_delivery.purchase_order.id,
                'customer': purchase_order_delivery.purchase_order.costing_version.order.customer.id,
                'purchase_order_display_number': purchase_order_delivery.purchase_order.display_number,
                'outgoing_commercial_invoice_id': purchase_order_delivery.outgoing_commercial_invoice.id if purchase_order_delivery.outgoing_commercial_invoice else None,
                'outgoing_commercial_invoice_display_number': purchase_order_delivery.outgoing_commercial_invoice.display_number if purchase_order_delivery.outgoing_commercial_invoice else None,
                'amount': get_amount_dictionary(purchase_order_delivery.total_amount),
                'balance': get_amount_dictionary(purchase_order_delivery.get_balance()),
                'incoming_payments': []
            }
            
            if purchase_order_delivery.outgoing_commercial_invoice:
                incoming_payments = IncomingPayment.objects.filter(outgoing_commercial_invoice=purchase_order_delivery.outgoing_commercial_invoice)

                for incoming_payment in incoming_payments:
                    delivery_data['incoming_payments'].append({
                        'id': incoming_payment.id,
                        'display_number': incoming_payment.display_number,
                        'payment_date': incoming_payment.payment_date,
                        'amount': get_amount_dictionary(incoming_payment.amount),
                    })
            data.append(delivery_data)
        return data
    
    def get_outgoing_payments(self, instance):
        data = []
        supplier_pos = instance.get_supplier_pos().filter().order_by('proforma_invoice_supplier_display_number')
        invoices = instance.get_invoices()
        
        for po in supplier_pos:
            outgoing_payments = po.get_outgoing_payments()
            if po.advance_payment and po.advance_payment_currency:
                data.append({
                    'id': po.id,
                    'display_number': '%s - %s' % (po.supplier_po_number, po.proforma_invoice_supplier_display_number),
                    'file_path': po.proforma_invoice.get_object_data() if po.proforma_invoice else None,
                    'outgoing_payments': OutgoingPaymentSerializer(outgoing_payments, many=True).data,
                    'type': 'advance'
                })
        for invoice in invoices:
            outgoing_payments = invoice.get_outgoing_payments()
            data.append({
                'id': invoice.id,
                'display_number': invoice.display_number,
                'file_path': invoice.invoice.get_object_data() if invoice.invoice else None,
                'outgoing_payments': OutgoingPaymentSerializer(outgoing_payments, many=True).data,
                'type': 'outgoing'
            })
        return data
    
    def get_pcl_matching_details(self, instance):
        data = {}
        if hasattr(instance, 'pclbankinformation'):
            base_po_club_data = PCLBankInformationSerializer(instance.pclbankinformation, many=False).data
            derived_po_clubs = instance.pclbankinformation.pclbankinformationlinkedpoclub_set.all()
            derived_po_clubs_data = PCLBankInformationLinkedPOClubSerializer(derived_po_clubs, many=True).data

            data = {
                'base_po_club_data': base_po_club_data,
                'derived_po_clubs_data': derived_po_clubs_data
            }
        return data
    
    def get_pcl_bank_information(self, instance):
        if hasattr(instance, 'pclbankinformation'):
            pcl_bank_information = instance.pclbankinformation
            data = PCLBankInformationSerializer(pcl_bank_information, many=False).data
            return data
        return {}
    
    def get_is_pcl_create(self, instance):
        is_exist = instance.pclbankinformationlinkedpoclub_set.filter().exists()
        return is_exist
    
    def get_pcl_bank_information_id(self, instance):
        pcl_bank_information_id = None
        is_exist = self.get_is_pcl_create(instance)
        if is_exist:
            pcl_bank_information_id = instance.pclbankinformationlinkedpoclub_set.filter()[0].pcl_bank_information.id
        return pcl_bank_information_id

    class Meta:
        model = ActualPOClub
        fields = ('id', 'display_number', 'long_code', 'short_code', 'fob_total_value', 'supplier_po_raw_material_total_cost', 
            'supplier_po_raw_material_total_paid', 'fob_presentage', 'max_pcl_value', 'purchase_orders', 'supplier_pos', 'supplier_pos_summary', 'profitability_details',
            'delivery_payments', 'incoming_payments', 'outgoing_payments', 'pcl_matching_details', 'pcl_bank_information', 'is_pcl_create', 'pcl_bank_information_id', 'gantt_chart'
        )


class CommercialInvoiceBasicSerializer(serializers.ModelSerializer):

    class Meta:
        model = SupplierPODeliveryInvoice
        fields = ('id', 'display_number', 'created', )


class SupplierPOGRNBasicSerializer(serializers.ModelSerializer):
    total_price = serializers.SerializerMethodField()

    def get_total_price(self, instance):
        total_price = calculate_queryset_total_amount_normalized_amount(instance.supplierpogrnmaterial_set.all(), 'total_price')
        data = get_amount_dictionary(total_price)
        return data

    class Meta:
        model = SupplierPOGRN
        fields = ('id', 'grn_number', 'created', 'total_price', )


class PaymentGanttChartSerializer(serializers.ModelSerializer):
    actual_delivery_date = serializers.DateField(source='actual_delivery_date.delivery_date', allow_null=True)
    data = serializers.SerializerMethodField()

    def get_proforma_invoices(self, instance):
        pass

    def get_invoices(self, instance):
        data = {}
        invoice = instance.get_delivery_invoice()
        if invoice:
            data = {
                'id': invoice.id,
                'date': invoice.created.date(),
                'activity': 'CI',
            }
        return data

    def get_grns(self, instance):
        data = {}
        grns = instance.get_delivery_date_grns(True)
        if grns:
            grn = grns.filter().order_by('complete_date')[0]
            data = {
                'id': grn.id,
                'date': grn.complete_date,
                'activity': 'GRN Complete',
            }
        return data
    
    def get_payments(self, instance):
        data = []
        invoice = instance.get_delivery_invoice()
        if invoice:
            for outgoing_payment in invoice.get_outgoing_payments():
                data.append({
                'id': outgoing_payment.id,
                'date': outgoing_payment.payment_date,
                'activity': 'Full Payment',
                'amount': get_amount_dictionary(outgoing_payment.amount)
                })
        return data
    
    def get_data(self, instance):
        data = []
        if self.get_grns(instance):
            data.append(self.get_grns(instance))
        if self.get_invoices(instance):
            data.append(self.get_invoices(instance))
        if self.get_payments(instance):
            data.extend(self.get_payments(instance))
        return data
    
    class Meta:
        model = SupplierDeliveryDate
        fields = ('id', 'display_number', 'confirmed_delivery_date', 'actual_delivery_date', 'data')
        ordering = ['pk']



class POClubPCLBankInformationSerilaizer(serializers.ModelSerializer):
    fob_total_value = serializers.SerializerMethodField()
    total_raw_material_cost = serializers.SerializerMethodField()
    fob_presentage = serializers.SerializerMethodField()
    max_pcl_value =  serializers.SerializerMethodField()
    pcl_excess_value = serializers.SerializerMethodField()
    pcl_short_value = serializers.SerializerMethodField()
    pcl_utilized_value = serializers.SerializerMethodField()
    earliest_pcl_date = serializers.SerializerMethodField()
    purchase_orders = serializers.SerializerMethodField()
    shipments = serializers.SerializerMethodField()
    reason = serializers.SerializerMethodField()

    def get_fob_total_value(self, instance):
        fob_total_value = instance.total_fob_value
        data = get_amount_dictionary(fob_total_value)
        return data
    
    def get_total_raw_material_cost(self, instance):
        total_raw_material_cost = instance.total_raw_material_cost
        data = get_amount_dictionary(total_raw_material_cost)
        return data
    
    def get_fob_presentage(self, instance):
        precentage = instance.material_fob_presentage
        return precentage
    
    def get_max_pcl_value(self, instance):
        max_pcl_value = instance.max_pcl_value
        data = get_amount_dictionary(max_pcl_value)
        return data
    
    def get_pcl_excess_value(self, instance):
        #max_pcl_value = instance.get_pcl_short_value()
        data = get_amount_dictionary(0)
        return data
    
    def get_pcl_short_value(self, instance):
        #max_pcl_value = instance.get_pcl_short_value()
        data = get_amount_dictionary(0)
        return data
    
    def get_pcl_utilized_value(self, instance):
        return get_amount_dictionary(0)
    
    def get_earliest_pcl_date(self, instance):
        data = None
        return data
    
    def get_reason(self, instance):
        data = 'Test'
        return data
    
    def get_purchase_orders(self, instance):
        data = []
        purchase_orders = instance.get_purchase_orders()
        for purchase_order in purchase_orders:
            data.append(
                {
                    'id': purchase_order.id,
                    'display_number': purchase_order.display_number,
                    'short_code': purchase_order.short_code,
                    'long_code': purchase_order.long_code
                }
            )
        return data
    
    def get_shipments(self, instance):
        data = []
        shipments = instance.get_purchase_order_deliveries()
        for shipment in shipments:
            data.append(
                {
                    'id': shipment.id,
                    'display_number': shipment.display_number,
                    'shipment_date': shipment.delivery_date
                }
            )
        return data

    class Meta:
        model = ActualPOClub
        fields = ('id', 'display_number', 'short_code', 'long_code', 'customer_name', 'style_number', 'fob_total_value', 'total_raw_material_cost', 'fob_presentage', 'max_pcl_value', 'pcl_excess_value',
                  'pcl_short_value', 'pcl_utilized_value', 'earliest_pcl_date', 'purchase_orders', 'shipments', 'reason')
        
        
class PCLBankInformationSerializer(serializers.ModelSerializer):
    total_amount_currency_display = serializers.CharField(source='get_total_amount_currency_display')
    state_display = serializers.CharField(source='get_state_display')
    pcl_used_amount = serializers.SerializerMethodField()
    pcl_balance_amount = serializers.SerializerMethodField()
    pcl_threshold_amount = serializers.SerializerMethodField()

    def get_pcl_used_amount(self, instance):
        data = get_amount_dictionary(instance.get_pcl_used_amount())
        return data
    
    def get_pcl_balance_amount(self, instance):
        data = get_amount_dictionary(instance.get_pcl_balance_amount())
        return data
    
    def get_pcl_threshold_amount(self, instance):
        data = get_amount_dictionary(instance.pcl_threshold_amount)
        return data

    class Meta:
        model = PCLBankInformation
        fields = ('id', 'display_number', 'total_amount', 'total_amount_currency', 'total_amount_currency_display', 'pcl_threshold_amount',
                   'pcl_threshold_amount_currency', 'pcl_used_amount', 'pcl_balance_amount', 'state', 'state_display')
        
        
class PCLBankInformationLinkedPOClubSerializer(serializers.ModelSerializer):
    po_club = serializers.SerializerMethodField()
    pcl_bank_information = models.ForeignKey(PCLBankInformation, on_delete=models.CASCADE)

    def get_po_club(self, instance):
        base_po_club =  instance.pcl_bank_information.po_club
        context = {'base_po_club': base_po_club}
        po_club = POClubPCLBankInformationSerilaizer(instance.po_club, many=False, context=context).data
        return po_club
    
    class Meta:
        model = PCLBankInformationLinkedPOClub
        fields = ('id', 'po_club', )


class SupplierCommercialInvoiceBasicSerializer(serializers.ModelSerializer):
    supplier_name = serializers.SerializerMethodField()
    supplier_pos = serializers.SerializerMethodField()
    invoice = serializers.SerializerMethodField()

    def get_supplier_pos(self, instance):
        data = []
        supplier_pos = instance.get_supplier_pos()
        for supplier_po in supplier_pos:
            data.append({
                'id': supplier_po.id,
                'display_number': supplier_po.supplier_po_number,
                'supplier_po': supplier_po.supplier_po_file.get_object_data() if supplier_po.supplier_po_file else None,
            })
        return data
    
    def get_invoice(self, instance):
        return instance.invoice.get_object_data() if instance.invoice else None
    
    def get_supplier_name(self, instance):
        supplier_name = None
        supplier_pos = instance.get_supplier_pos()
        if supplier_pos:
            supplier_po = supplier_pos.filter()[0]
            supplier_name = supplier_po.general_po_supplier.supplier.name
        return supplier_name

   
    class Meta:
        model = SupplierPODeliveryInvoice
        fields = ('id', 'display_number', 'supplier_invoice_number', 'supplier_name', 'invoice', 'supplier_pos', 'payment_due_date', 'ci_state', 'get_ci_state_display', )


class SupplierCommercialInvoiceDetailSerializer(serializers.ModelSerializer):
    supplier_name = serializers.SerializerMethodField()
    grn_details = serializers.SerializerMethodField()
    supplier_pos = serializers.SerializerMethodField()
    invoice = serializers.SerializerMethodField()
    total_price = serializers.SerializerMethodField()
    calculated_total_price = serializers.SerializerMethodField()
    debit_note_total_amount = serializers.SerializerMethodField()
    calculated_debit_note_total_amount = serializers.SerializerMethodField()
    balance_amount = serializers.SerializerMethodField()
    outgoing_payments = serializers.SerializerMethodField()

    def get_supplier_pos(self, instance):
        data = []
        supplier_pos = instance.get_supplier_pos()
        for supplier_po in supplier_pos:
            data.append({
                'id': supplier_po.id,
                'display_number': supplier_po.supplier_po_number,
                'supplier_po': supplier_po.supplier_po_file.get_object_data() if supplier_po.supplier_po_file else None,
            })
        return data
    
    def get_invoice(self, instance):
        return instance.invoice.get_object_data() if instance.invoice else None
    
    def get_supplier_name(self, instance):
        supplier_name = None
        supplier_pos = instance.get_supplier_pos()
        if supplier_pos:
            supplier_po = supplier_pos.filter()[0]
            supplier_name = supplier_po.general_po_supplier.supplier.name
        return supplier_name
    
    def get_costing_or_po_club_display_number(self, grn_material):
        if grn_material.supplier_po_grn.supplier_po.general_po.po_club:
            return grn_material.supplier_po_grn.supplier_po.general_po.po_club.display_number
        else:
            return grn_material.supplier_po_grn.supplier_po.general_po.costing.display_number

    def get_grn_details(self, instance):
        data = []
        grns = instance.get_all_invoice_grns(True)
        grn_materials = SupplierPOGRNMaterial.objects.filter(supplier_po_grn__in=grns).order_by('supplier_po_grn__supplier_po', 'supplier_po_grn')
        for grn_material in grn_materials:
            costing_or_po_club_display_number = self.get_costing_or_po_club_display_number(grn_material)
            data.append({
                'id': grn_material.id,
                'grn_id': grn_material.supplier_po_grn.id,
                'costing_or_po_club_display_number': costing_or_po_club_display_number,
                'material': grn_material.grn_material.get_attributes(),
                'material': CustomerBrandMaterialBasicSerializer(grn_material.grn_material.customer_brand_material).data,        
                'supplier_po_number': grn_material.supplier_po_grn.supplier_po.supplier_po_number,
                'supplier_po_file': grn_material.supplier_po_grn.supplier_po.supplier_po_file.get_object_data() if grn_material.supplier_po_grn.supplier_po.supplier_po_file else None,
                'grn_display_number': grn_material.supplier_po_grn.grn_number,
                'total_actual_quantity': round(grn_material.total_actual_quantity, 2),
                'total_actual_quantity_units': grn_material.get_total_actual_quantity_units_display(),
                'total_qa_rejected_quantity': round(grn_material.total_qa_rejected_quantity, 2),
                'total_qa_rejected_quantity_units': grn_material.get_total_qa_rejected_quantity_units_display(),
                'total_indicated_quantity': round(grn_material.total_indicated_quantity, 2),
                'total_indicated_quantity_units': grn_material.get_total_indicated_quantity_units_display(),
                'total_excess_quantity': round(grn_material.total_excess_quantity, 2),
                'total_excess_quantity_units': grn_material.get_total_excess_quantity_units_display(),
                'total_deficit_quantity': round(grn_material.total_deficit_quantity, 2),
                'total_deficit_quantity_units': grn_material.get_total_deficit_quantity_units_display(),
                'usable_quantity': round(grn_material.usable_quantity, 2),
                'usable_quantity_units': grn_material.get_usable_quantity_units_display(),
                'mismatch_quantity': round(grn_material.mismatch_quantity, 2),
                'mismatch_quantity_units': grn_material.get_mismatch_quantity_units_display(),
                'width_replacement_quantity': round(grn_material.width_replacement_quantity, 2),
                'width_replacement_quantity_units': grn_material.get_width_replacement_quantity_units_display(),
                'debit_note_amount': get_amount_dictionary(grn_material.get_debit_note_amount())
            })
        return data
    
    def get_total_price(self, instance):
        total_price = 0
        if instance.total_price:
            total_price = instance.total_price
        data = get_amount_dictionary(total_price)
        return data
    
    def get_calculated_total_price(self, instance):
        calculated_total_price = 0
        if instance.calculated_total_price:
            calculated_total_price = instance.calculated_total_price
        data = get_amount_dictionary(calculated_total_price)
        return data

    def get_debit_note_total_amount(self, instance):
        debit_note_total_amount = 0
        if instance.debit_note_total_amount:
            debit_note_total_amount = instance.debit_note_total_amount
        data = get_amount_dictionary(debit_note_total_amount)
        return data
    
    def get_calculated_debit_note_total_amount(self, instance):
        calculated_debit_note_total_amount = 0
        if instance.calculated_debit_note_total_amount:
            calculated_debit_note_total_amount = instance.calculated_debit_note_total_amount
        data = get_amount_dictionary(calculated_debit_note_total_amount)
        return data
    
    def get_balance_amount(self, instance):
        balance_amount = instance.get_balance_amount()
        return balance_amount
    
    def get_outgoing_payments(self, instance):
        outgoing_payments = instance.get_outgoing_payments()
        data = OutgoingPaymentSerializer(outgoing_payments, many=True).data
        return data
   
    class Meta:
        model = SupplierPODeliveryInvoice
        fields = ('id', 'display_number', 'supplier_invoice_number', 'supplier_name', 'invoice', 'supplier_pos', 'grn_details', 'total_price', 
                  'calculated_total_price', 'debit_note_total_amount', 'calculated_debit_note_total_amount', 'payment_due_date', 'ci_state', 'get_ci_state_display', 'balance_amount', 'outgoing_payments')
        

class PCLMatchingOutgoingPaymentListViewSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    display_number = serializers.CharField()
    file_path = serializers.DictField()
    type = serializers.CharField()
    supplier_name = serializers.CharField()
    costing_or_po_club = serializers.CharField(allow_null=True)
    customer_name = serializers.CharField()
    amount = serializers.DictField()
    due_amount = serializers.DictField()
    balance_display = serializers.DictField()
    balance = serializers.DictField()
    paid_amount = serializers.DictField()
    payment_term = serializers.CharField()
    payment_due_date = serializers.DateField()
    material_types = serializers.ListField()
    index = serializers.IntegerField(allow_null=True)
    outgoing_payment_data = serializers.ListField(allow_null=True)

    class Meta:
        fields = ('id', 'display_number', 'file_path', 'type', 'supplier_name', 'costing_or_po_club', 'customer_name', 'amount', 'due_amount', 'balance', 'balance_display', 'paid_amount', 'payment_due_date', 'material_types', 'index', 'outgoing_payment_data')


class PaymentAmountSerializer(serializers.Serializer):
    amount = serializers.FloatField()
    amount_currency = serializers.CharField(max_length=10)
    amount_currency_display = serializers.CharField(max_length=50)


class FilePathSerializer(serializers.Serializer):
    file_path = serializers.URLField(allow_null=True)
    id = serializers.IntegerField()
    type = serializers.CharField(max_length=10)
    display_name = serializers.CharField(max_length=100)


class CustomPCLPaymentSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    supplier_name = serializers.CharField(max_length=100)
    material_types = serializers.ListField(child=serializers.CharField(max_length=50))
    costing_or_po_club = serializers.CharField(max_length=50)
    customer_name = serializers.CharField(max_length=100)
    display_number = serializers.CharField(max_length=50)
    file_path = FilePathSerializer(allow_null=True)
    payment_term = serializers.CharField(max_length=50)
    type = serializers.CharField(max_length=20)
    amount = PaymentAmountSerializer()
    payment_due_date = serializers.DateField()


class CustomPCLSettlementPOClubSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    dispaly_name = serializers.CharField(max_length=50)  # Fix typo if necessary
    payments = CustomPCLPaymentSerializer(many=True)


class CustomPCLSettlementSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField(max_length=100)
    po_clubs = CustomPCLSettlementPOClubSerializer(many=True)


class PCLBankInformationDetailSerializer(serializers.ModelSerializer):
    #po_club = POClubPCLMatchingBaseSerializer(many=False)
    total_amount_currency_display = serializers.CharField(source='get_total_amount_currency_display')
    state_display = serializers.CharField(source='get_state_display')
    po_clubs = serializers.SerializerMethodField()
    supplier_po_delivery_invoice_pcl = serializers.SerializerMethodField()

    def get_po_clubs(self, instance):
        po_club_ids = instance.pclbankinformationlinkedpoclub_set.filter().values_list('po_club', flat=True)
        po_clubs = ActualPOClub.objects.filter(id__in=po_club_ids)
        response = ActualClubCustomerPaymentSummarySerilaizer(po_clubs, many=False).data
        data = []
        for po_club in po_clubs:
            data.append({
                'id': po_club.id,
                'display_number': po_club.display_number
            })
        return response
    
    def get_supplier_po_delivery_invoice_pcl(self, instance):
        data = []
        supplier_po_delivery_invoice_pcls = instance.supplierpodeliveryinvoicepcl_set.all()
        for supplier_po_delivery_invoice_pcl in supplier_po_delivery_invoice_pcls:
            data.append({
                'id': supplier_po_delivery_invoice_pcl.id
            })
        return data

    class Meta:
        model = PCLBankInformation
        fields = ('id', 'display_number', 'total_amount', 'total_amount_currency', 'total_amount_currency_display', 
                  'pcl_threshold_amount', 'pcl_threshold_amount_currency', 'state', 'state_display', 'po_clubs', 'supplier_po_delivery_invoice_pcl')
        

class SupplierPODeliveryInvoicePCLSerializer(serializers.ModelSerializer):

    class Meta:
        model = SupplierPODeliveryInvoicePCL
        fields = ('__all__')


class PCLBankInformationDashBoardSerializer(serializers.ModelSerializer):
    po_club_data = serializers.SerializerMethodField()
    foreign_pcl_po_clubs = serializers.SerializerMethodField()
    total_amount = serializers.SerializerMethodField()
    pcl_threshold_amount = serializers.SerializerMethodField()
    used_amount = serializers.SerializerMethodField()
    balance_amount = serializers.SerializerMethodField()

    def get_total_amount(self, instance):
        return get_amount_dictionary(instance.total_amount)
    
    def get_pcl_threshold_amount(self, instance):
        return get_amount_dictionary(instance.pcl_threshold_amount)
    
    def get_used_amount(self, instance):
        return get_amount_dictionary(instance.get_used_amount())
    
    def get_balance_amount(self, instance):
        return get_amount_dictionary(instance.get_balance_amount())
    
    def get_foreign_pcl_used_amount(self, instance, po_club):
        #outgoing_payments = po_club.get_outgoing_payments().filter(pcl_bank_information=instance)
        pcls = po_club.get_supplier_po_delivery_invoice_pcls().filter(outgoing_payment__pcl_bank_information=instance)
        used_value = calculate_queryset_total_amount_normalized_amount(pcls, 'amount', 'amount_currency')
        return used_value
    
    def get_pcl_used_amount(self, instance, po_club):
        #outgoing_payments = po_club.get_outgoing_payments().filter(pcl_bank_information=instance)
        pcls = po_club.get_supplier_po_delivery_invoice_pcls().filter(outgoing_payment__pcl_bank_information=instance)
        used_value = calculate_queryset_total_amount_normalized_amount(pcls, 'amount', 'amount_currency')
        return used_value
    
    def get_po_club_data(self, instance):
        data = []
        po_clubs = ActualPOClub.objects.filter(id__in=instance.pclbankinformationlinkedpoclub_set.all().values_list('po_club', flat=True))
        for po_club in po_clubs:
            pcl_used_amount = self.get_foreign_pcl_used_amount(instance, po_club)
            po_club_data = {
                'id': po_club.id,
                'material_fob_presentage': po_club.material_fob_presentage,
                'display_name': po_club.display_number,
                'short_code': po_club.short_code,
                'long_code': po_club.long_code,
                'total_fob_value': po_club.total_fob_value,
                'max_pcl_value': get_amount_dictionary(po_club.max_pcl_value),
                'customer_name': po_club.customer_name,
                'used_amount': get_amount_dictionary(pcl_used_amount),
                'total_raw_material_cost': get_amount_dictionary(po_club.total_raw_material_cost)
            }
            data.append(po_club_data)
        return data

    def get_foreign_pcl_po_clubs(self, instance):
        data = []
        foreign_pcl_po_clubs = instance.get_foreign_pcl_po_clubs()
        for foreign_pcl_po_club in foreign_pcl_po_clubs:
            foreign_pcl_used_amount = self.get_foreign_pcl_used_amount(instance, foreign_pcl_po_club)
            foreign_pcl_po_club_data = {
                'id': foreign_pcl_po_club.id,
                'material_fob_presentage': foreign_pcl_po_club.material_fob_presentage,
                'display_name': foreign_pcl_po_club.display_number,
                'short_code': foreign_pcl_po_club.short_code,
                'long_code': foreign_pcl_po_club.long_code,
                'total_fob_value': foreign_pcl_po_club.total_fob_value,
                'max_pcl_value': get_amount_dictionary(foreign_pcl_po_club.max_pcl_value),
                'customer_name': foreign_pcl_po_club.customer_name,
                'used_amount': get_amount_dictionary(foreign_pcl_used_amount),
            }
            data.append(foreign_pcl_po_club_data)
        return data

    class Meta:
        model = PCLBankInformation
        fields = ('id', 'display_number', 'total_amount', 'pcl_threshold_amount', 'used_amount', 'balance_amount', 'po_club_data', 'foreign_pcl_po_clubs')