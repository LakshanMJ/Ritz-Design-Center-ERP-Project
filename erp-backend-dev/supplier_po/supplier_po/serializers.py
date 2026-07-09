from django.utils.functional import cached_property
from rest_framework import serializers
from rest_framework.serializers import ModelSerializer

from materials.serializers.material_serializers import SupplierCustomerBrandMaterialSerializer, CustomerBrandMaterialBasicSerializer, LeftOverMaterialSerializer
from supplier_po.helpers.summary_calculator_helper import InvoiceSummary
from marketing.models import ActualClubBom, PurchaseOrder, OrderCostingVersion, ActualPOClub
from materials.models import CustomerBrandMaterial, SupplierCustomerBrandMaterial, InHouseMaterialVerificationMaterial, UserDefinedMaterial
from supplier_po.models import SupplierDeliveryDateQuantity, SupplierPO, SupplierDeliveryDate, SupplierPOGRN, \
    SupplierDeliveryDateQuantity, SupplierRequestedDeliveryDate, SupplierPODeliveryInvoice, SupplierActualDeliveryDate, \
    SupplierPOInvoiceDeliveryNote, SupplierPODeliveryInvoicePackList, SupplierDeliveryDateQuantityPOAllocation, SupplierPOGRNMaterial, SupplierPOGeneralPOMaterialQuantity
from shared.utils import get_quantity_dictionary
from shared.models import InHouseMaterial, Approval
from shared.approvals.constants.task_entities import SUPPLIER_PO_ENTITY
from shared.approvals.constants.approval_choices import SUPPLIER_PO_APPROVAL

class SupplierDeliveryDateSerializer(ModelSerializer):
    materials = serializers.SerializerMethodField()
    is_grn_created = serializers.CharField()
    is_foc = serializers.BooleanField(source='has_free_of_charge_deliveries')

    def get_materials(self, instance):
        materials = instance.supplierdeliverydatequantity_set.all().values_list('material_supplier__supplier_material', flat=True)
        if instance.has_free_of_charge_deliveries:
            foc_material = instance.get_replacement_materials().values_list('supplier_po_grn_material__grn_material', flat=True)
            materials = list(materials) + list(foc_material)
        supplier_materials = SupplierCustomerBrandMaterial.objects.filter(pk__in=materials)
        data = SupplierCustomerBrandMaterialSerializer(supplier_materials, many=True).data
        return data

    class Meta:
        model = SupplierDeliveryDate
        fields = ('__all__')


class SupplierDeliveryDateQuantityPOAllocationSerializer(ModelSerializer):
    purchase_order_display_number = serializers.CharField(source='purchase_order.display_number')
    quantity_units_display = serializers.CharField(source='get_quantity_units_display')
    proforma_invoice_quantity_units_display = serializers.CharField(source='get_proforma_invoice_quantity_units_display')

    class Meta:
        model = SupplierDeliveryDateQuantityPOAllocation
        fields = ('__all__')


class SupplierDeliveryDateQuantitySerializer(ModelSerializer):
    supplier_name = serializers.CharField(source='general_po_supplier.supplier.name', read_only=True)
    bom_details = serializers.SerializerMethodField()
    quantity = serializers.SerializerMethodField()
    confirmed_delivery_date = serializers.SerializerMethodField()
    supplierdeliverydatequantitypoallocation_set = SupplierDeliveryDateQuantityPOAllocationSerializer(many=True)
    supplier = serializers.IntegerField(source='material_supplier.general_po_supplier.supplier.id', read_only=True)
    quantity_units_display = serializers.CharField(source='get_quantity_units_display', read_only=True)
    exmill_date = serializers.DateField(source='ex_mill_date')
    transport_method = serializers.CharField(source='supplier_delivery_date.transport_method', allow_null=True)
    port = serializers.IntegerField(source='supplier_delivery_date.supplier_port_id', allow_null=True)

    def get_confirmed_delivery_date(self, instance):
        try:
            return instance.supplier_delivery_date.confirmed_delivery_date
        except AttributeError:
            return None

    def get_quantity(self, instance):
        return instance.get_normalized_quantity()

    def get_bom_details(self, instance):
        from marketing.serializers import PurchaseOrderBomSerializer
        data = []
        # if instance.purchase_order_bom:
        #     data = PurchaseOrderBomSerializer(instance.purchase_order_bom, read_only=True).data
        return data

    class Meta:
        model = SupplierDeliveryDateQuantity
        fields = ('__all__')


class SupplierDeliveryDateQuantityListSerializer(ModelSerializer):
    supplier_name = serializers.CharField(source='general_po_supplier.supplier.name', read_only=True)
    quantity = serializers.SerializerMethodField()
    confirmed_delivery_date = serializers.SerializerMethodField()
    po_breakdown = serializers.SerializerMethodField()
    supplier = serializers.IntegerField(source='material_supplier.general_po_supplier.supplier.id', read_only=True)
    quantity_units_display = serializers.CharField(source='get_quantity_units_display', read_only=True)
    exmill_date = serializers.DateField(source='ex_mill_date')
    transport_method = serializers.CharField(source='supplier_delivery_date.transport_method', allow_null=True)
    port = serializers.IntegerField(source='supplier_delivery_date.supplier_port_id', allow_null=True)

    def get_confirmed_delivery_date(self, instance):
        try:
            return instance.supplier_delivery_date.confirmed_delivery_date
        except AttributeError:
            return None

    def get_quantity(self, instance):
        return instance.get_normalized_quantity()

    
    def get_po_breakdown(self, instance):
        from marketing.models import PurchaseOrderBom
        from marketing.serializers import PurchaseOrderBomBasicSerializer
        material = instance.general_po_material_quantity.material
        purchase_orders = instance.general_po_material_quantity.general_po.po_club.get_purchase_orders()
        purchase_order_boms = PurchaseOrderBom.objects.filter(purchase_order__in=purchase_orders, material=material).order_by('-id')
        return PurchaseOrderBomBasicSerializer(purchase_order_boms, many=True).data

    class Meta:
        model = SupplierDeliveryDateQuantity
        fields = ('__all__')


class SupplierPOGRNBasicSerializer(ModelSerializer):
    invoice_number = serializers.CharField(source='invoice_number.supplier_invoice_number', read_only=True)
    supplier_name = serializers.CharField(source='supplier_po.general_po_supplier.supplier.name', read_only=True)
    state_display = serializers.CharField(source='get_state_display', read_only=True)
    supplier_po_number = serializers.CharField(source='supplier_po.supplier_po_number', read_only=True)
    attachment_file_path = serializers.CharField(source='supplier_po.supplier_po_file.file_path',read_only=True)
    order_details = serializers.SerializerMethodField(read_only=True)
    customer_id = serializers.SerializerMethodField(read_only=True)
    customer_name = serializers.SerializerMethodField(read_only=True)
    brand_id = serializers.SerializerMethodField(read_only=True)
    brand_name = serializers.SerializerMethodField(read_only=True)

    def get_purchase_orders(self, instance):
        from marketing.serializers import PurchaseOrderBasicSerializer
        serializer = None
        if instance.supplier_po.general_po_supplier.general_po.is_po_club_general_po():
            pos = instance.supplier_po.general_po_supplier.general_po.po_club.get_purchase_orders()
            serializer = PurchaseOrderBasicSerializer(pos, many=True).data
        return serializer

    def get_order_details(self, instance):
        from marketing.models import OrderCostingVersion
        data = {}
        if instance.supplier_po.general_po_supplier.general_po.is_po_club_general_po():
            pos = instance.supplier_po.general_po_supplier.general_po.po_club.get_purchase_orders()
            costing_ids = pos.filter().values_list('costing_version').distinct()
        else:
            pos = None
            costing_ids = [instance.supplier_po.general_po_supplier.general_po.costing.id, ]
        costings = OrderCostingVersion.objects.filter(id__in=costing_ids)
        for costing in costings:
            data = {
                'order_id': costing.order.id,
                'costing_id': costing.id,
                'ritz_code': costing.order.ritz_code,
                'purchase_orders': self.get_purchase_orders(instance),
                'po_club': instance.supplier_po.general_po_supplier.general_po.po_club.id if instance.supplier_po.general_po_supplier.general_po.is_po_club_general_po() else None,
                'display_number': instance.supplier_po.general_po_supplier.general_po.po_club.display_number if instance.supplier_po.general_po_supplier.general_po.is_po_club_general_po() else None
            }
        return data

    def get_customer_id(self, instance):
        customer_id = instance.supplier_po.general_po_supplier.general_po.costing.order.customer.id
        return customer_id

    def get_customer_name(self, instance):
        customer_name = instance.supplier_po.general_po_supplier.general_po.costing.order.customer.name
        return customer_name

    def get_brand_id(self, instance):
        brand_id = instance.supplier_po.general_po_supplier.general_po.costing.order.brand.id
        return brand_id

    def get_brand_name(self, instance):
        brand_name = instance.supplier_po.general_po_supplier.general_po.costing.order.brand.name
        return brand_name

    class Meta:
        model = SupplierPOGRN
        fields = ('id', 'grn_number',  'invoice_number', 'state', 'state_display', 'supplier_name', 'customer_id', 'customer_name', 'brand_id', 'brand_name', 'supplier_po_id', 'supplier_po_number', 'attachment_file_path', 'order_details', 'remarks')


class SupplierPOSerializer(ModelSerializer):
    supplier = serializers.IntegerField(source='general_po_supplier.supplier.id', read_only=True)
    po_club_id = serializers.IntegerField(source='general_po_supplier.general_po.po_club.id', read_only=True)
    supplier_name = serializers.CharField(source='general_po_supplier.supplier.name', read_only=True)
    attachment_display_name = serializers.CharField(source='supplier_po_file.display_name' ,read_only=True)
    attachment_file_path = serializers.CharField(source='supplier_po_file.file_path',read_only=True)
    po_wise_attachment_display_name = serializers.CharField(source='supplier_po_file_with_po_wise_breakdown.display_name', read_only=True)
    po_wise_attachment_file_path = serializers.CharField(source='supplier_po_file_with_po_wise_breakdown.file_path', read_only=True)
    purchaseorderclubbomsupplier_set = SupplierDeliveryDateQuantitySerializer(many=True, read_only=True)
    material_headers = serializers.SerializerMethodField(read_only=True)
    materials = serializers.SerializerMethodField(read_only=True, method_name='get_supplier_po_materials')
    state = serializers.SerializerMethodField(read_only=True)
    supplierdeliverydate_set = SupplierDeliveryDateSerializer(read_only=True, many=True)
    purchase_orders = serializers.SerializerMethodField(read_only=True)
    grns = serializers.SerializerMethodField(read_only=True)
    material_types = serializers.SerializerMethodField(read_only=True)
    approvals = serializers.SerializerMethodField()
    is_approval_created = serializers.SerializerMethodField()
    approval = serializers.SerializerMethodField()
    terms_of_delivery = serializers.SerializerMethodField(read_only=True)
    payment_term_display = serializers.CharField(source='get_payment_term_display', read_only=True)
    delivery_mode_display = serializers.CharField(source='get_delivery_mode_display', read_only=True)
    terms_of_delivery_display = serializers.CharField(source='get_terms_of_delivery_display', read_only=True)

    state_display = serializers.CharField(source='get_state_display', read_only=True)

    def get_material_types(self, instance):
        # material_ids = SupplierDeliveryDateQuantity.objects.filter(material_supplier__general_po_supplier=instance.general_po_supplier).values_list('material_supplier__material', flat=True).distinct()
        # material_types = CustomerBrandMaterial.objects.filter(pk__in=material_ids).values_list('material_detail__generic_material__user_material__material', flat=True).distinct()
        supplier_materials = instance.get_supplier_po_material_list()
        material_types = supplier_materials.values_list('customer_brand_material__material_detail__generic_material__user_material__material', flat=True).distinct()
        return list(material_types)

    def get_state(self, instance):
        data = {
            'value': instance.state,
            'display_value': instance.get_state_display()
        }
        return data

    def get_supplier_po_materials(self, instance):
        material_list = []
        general_po_material_quantity_ids = instance.supplierpogeneralpomaterialquantity_set.all().values_list('general_po_material_quantity__id', flat=True)
        boms = SupplierDeliveryDateQuantity.objects.filter(
            general_po_material_quantity__id__in=general_po_material_quantity_ids
        ).exclude(supplier_delivery_date=None).order_by('material_supplier__supplier_material__customer_brand_material__material_detail__generic_material__user_material', 'material_supplier__supplier_material__customer_brand_material__material_detail__generic_material__user_material__display_order')
        for bom in boms:
            attributes = bom.general_po_material_quantity.material.get_attributes()
            attributes['quantity'] = bom.get_normalized_quantity()
            attributes['requested_date'] = bom.requested_date.requested_date if bom.requested_date else None
            attributes['proforma_invoice_quantity'] = get_quantity_dictionary(bom.proforma_invoice_quantity, bom.proforma_invoice_quantity_units)
            material_list.append(attributes)
        return material_list

    def get_material_headers(self, instance):
        from materials.fieldmetadata.material_metadata import get_grn_meta_material_headers
        headers = get_grn_meta_material_headers()
        return headers

    def get_purchase_orders(self, instance):
        from marketing.serializers import PurchaseOrderBasicSerializer
        serializer = None
        if instance.general_po_supplier.general_po.is_po_club_general_po():
            pos = instance.general_po_supplier.general_po.po_club.get_purchase_orders()
            serializer = PurchaseOrderBasicSerializer(pos, many=True).data
        return serializer

    def get_grns(self, instance):
        grns = instance.supplierpogrn_set.all()
        serializer = SupplierPOGRNBasicSerializer(grns, many=True).data
        return serializer

    def get_approvals(self, instance):
        data = []
        approvals = Approval.objects.filter(entity__contains=[{"entity_id": instance.id, "entity_name": SUPPLIER_PO_ENTITY}], approval_name=SUPPLIER_PO_APPROVAL)
        for approval in approvals:
            data.append({
                'id': approval.id,
                'approval_name': approval.approval_name,
                'state': approval.action
            })
        return data

    def get_is_approval_created(self, instance):
        from shared.models import Approval
        is_exists = Approval.objects.filter(entity__contains=[{"entity_id": instance.id, "entity_name": SUPPLIER_PO_ENTITY}], approval_name=SUPPLIER_PO_APPROVAL).exists()
        return is_exists

    def get_approval(self, instance):
        data = {}
        approvals = Approval.objects.filter(entity__contains=[{"entity_id": instance.id, "entity_name": SUPPLIER_PO_ENTITY}], approval_name=SUPPLIER_PO_APPROVAL)
        if approvals:
            data = {
                'id': approvals[0].id,
                'approval_name': approvals[0].approval_name,
                'state': approvals[0].action,
                'state_display': approvals[0].get_action_display()
            }
        return data

    def get_terms_of_delivery(self, instance):
        return getattr(instance, 'terms_of_delivery', None)

    def get_payment_terms(self, instance):
        return getattr(instance, 'payment_terms', None)


    class Meta:
        model = SupplierPO
        fields = (
            'id', 'supplier_name', 'po_club_id', 'supplier_po_number', 'supplier', 'supplier_po_file', 'attachment_display_name',
            'attachment_file_path', 'material_headers', 'materials', 'purchaseorderclubbomsupplier_set', 'state',
            'state_display', 'board_of_investment_registration_number', 'value_added_tax_registration_number', 'simplified_value_added_tax_registration_number', 'terms_of_delivery_display', 'terms_of_delivery', 'payment_term', 'payment_term_display', 'delivery_mode', 'delivery_mode_display',
            'supplierdeliverydate_set', 'purchase_orders', 'grns', 'material_types', 'approvals', 'is_approval_created', 'approval',
            'po_wise_attachment_display_name', 'po_wise_attachment_file_path'
        )


class SupplierPODetailsSerializer(ModelSerializer):


    class Meta:
        model = SupplierPO
        fields = '__all__'


class SupplierPOBasicListSerializer(ModelSerializer):
    supplier = serializers.IntegerField(source='general_po_supplier.supplier.id')
    po_club_id = serializers.SerializerMethodField()
    supplier_name = serializers.CharField(source='general_po_supplier.supplier.name', read_only=True)
    attachment_display_name = serializers.CharField(source='supplier_po_file.display_name' ,read_only=True)
    attachment_file_path = serializers.CharField(source='supplier_po_file.file_path',read_only=True)
    state = serializers.SerializerMethodField(read_only=True)
    supplierdeliverydate_set = serializers.SerializerMethodField()# SupplierDeliveryDateSerializer(read_only=True, many=True)
    grns = serializers.SerializerMethodField(read_only=True)
    material_types = serializers.SerializerMethodField(read_only=True)
    order_details = serializers.SerializerMethodField(read_only=True)
    customer_id = serializers.SerializerMethodField(read_only=True)
    customer_name = serializers.SerializerMethodField(read_only=True)
    brand_id = serializers.SerializerMethodField(read_only=True)
    brand_name = serializers.SerializerMethodField(read_only=True)

    def get_po_club_id(self, instance):
        po_club_id = None
        if instance.general_po_supplier.general_po.po_club:
            po_club_id = instance.general_po_supplier.general_po.po_club.id
        return po_club_id

    def get_supplierdeliverydate_set(self, instance):
        deliveries = SupplierDeliveryDateSerializer(instance.get_all_delivery_dates(), many=True).data
        return deliveries

    def get_purchase_orders(self, instance):
        from marketing.serializers import PurchaseOrderBasicSerializer
        serializer = None
        if instance.general_po_supplier.general_po.is_po_club_general_po():
            pos = instance.general_po_supplier.general_po.po_club.get_purchase_orders()
            serializer = PurchaseOrderBasicSerializer(pos, many=True).data
        return serializer

    def get_grns(self, instance):
        grns = instance.supplierpogrn_set.all()
        serializer = SupplierPOGRNBasicSerializer(grns, many=True).data
        return serializer

    def get_state(self, instance):
        data = {
            'value': instance.state,
            'display_value': instance.get_state_display()
        }
        return data

    def get_material_types(self, instance):
        supplier_materials = instance.get_supplier_po_material_list()
        material_types = supplier_materials.values_list('customer_brand_material__material_detail__generic_material__user_material__material', flat=True).distinct()
        return list(material_types)

    def get_order_details(self, instance):
        data = {}
        if instance.general_po_supplier.general_po.is_po_club_general_po():
            pos = instance.general_po_supplier.general_po.po_club.get_purchase_orders()
            costing_ids = pos.filter().values_list('costing_version').distinct()
        else:
            pos = None
            costing_ids = [instance.general_po_supplier.general_po.costing.id, ]
        costings = OrderCostingVersion.objects.filter(id__in=costing_ids)
        for costing in costings:
            data = {
                'order_id': costing.order.id,
                'costing_id': costing.id,
                'ritz_code': costing.order.ritz_code,
                'purchase_orders': self.get_purchase_orders(instance),
                'po_club': instance.general_po_supplier.general_po.po_club.id if instance.general_po_supplier.general_po.is_po_club_general_po() else None,
                'po_club_display_number':  instance.general_po_supplier.general_po.po_club.display_number if instance.general_po_supplier.general_po.is_po_club_general_po() else None,
            }
        return data

    def get_customer_id(self, instance):
        customer_id = instance.general_po_supplier.general_po.costing.order.customer.id
        return customer_id

    def get_customer_name(self, instance):
        customer_name = instance.general_po_supplier.general_po.costing.order.customer.name
        return customer_name

    def get_brand_id(self, instance):
        brand_id = instance.general_po_supplier.general_po.costing.order.brand.id
        return brand_id

    def get_brand_name(self, instance):
        brand_name = instance.general_po_supplier.general_po.costing.order.brand.name
        return brand_name

    class Meta:
        model = SupplierPO
        fields = ('id', 'supplier_name', 'customer_id', 'customer_name', 'brand_id', 'brand_name', 'po_club_id',
                  'attachment_display_name', 'attachment_file_path', 'supplier_po_number', 'supplier', 'supplier_po_file',
                  'state', 'supplierdeliverydate_set', 'grns', 'material_types', 'order_details')


class SupplierPODeliveryDateMaterialSerializer(ModelSerializer):
    supplier_name = serializers.CharField(source='general_po_supplier.supplier.name', read_only=True)
    attachment_display_name = serializers.CharField(source='supplier_po_file.display_name', read_only=True)
    attachment_file_path = serializers.CharField(source='supplier_po_file.file_path', read_only=True)
    purchaseorderclubbomsupplier_set = SupplierDeliveryDateQuantitySerializer(many=True, read_only=True)
    # material_headers = serializers.SerializerMethodField(read_only=True)
    # materials = serializers.SerializerMethodField(read_only=True, method_name='get_supplier_po_materials')
    state = serializers.SerializerMethodField(read_only=True)
    # supplierdeliverydate_set = serializers.SerializerMethodField(read_only=True)
    # supplier_po_delivery_invoice_list = serializers.SerializerMethodField(read_only=True)
    purchase_orders = serializers.SerializerMethodField(read_only=True)
    grns = serializers.SerializerMethodField(read_only=True)
    pack_list = serializers.SerializerMethodField()
    replacement_grns = serializers.SerializerMethodField()
    club_display_number = serializers.SerializerMethodField()
    po_club_id = serializers.CharField(source='general_po_supplier.general_po.po_club_id')
    supplier = serializers.CharField(source='general_po_supplier_id')

    # def get_supplier_po_materials(self, instance):
    #     data = []
    #     materials = instance.get_supplier_po_material_list()
    #     for material in materials:
    #         data.append(material.get_attributes())
    #     return data

    def get_supplierdeliverydate_set(self, instance):
        delivery_dates = instance.supplierdeliverydate_set.all()
        data = SupplierDeliveryDateSerializer(delivery_dates, read_only=True, many=True).data
        return data

    def get_state(self, instance):
        data = {
            'value': instance.state,
            'display_value': instance.get_state_display()
        }
        return data

    def get_purchase_orders(self, instance):
        from marketing.serializers import PurchaseOrderBasicSerializer
        serializer = None
        if instance.general_po_supplier.general_po.po_club:
            pos = instance.general_po_supplier.general_po.po_club.get_purchase_orders()
            serializer = PurchaseOrderBasicSerializer(pos, many=True).data
        return serializer

    def get_grns(self, instance):
        grns = instance.supplierpogrn_set.all()
        serializer = SupplierPOGRNBasicSerializer(grns, many=True).data
        return serializer

    def get_pack_list(self, instance):
        pack_list = instance.get_pack_list().order_by('id')
        context = {'supplier_po': instance}
        data = GRNSupplierPODeliveryInvoicePackListSerializer(pack_list, context=context, many=True).data
        return data

    def get_replacement_grns(self, instance):
        po_grns = instance.supplierpogrn_set.all().filter(state=SupplierPOGRN.GRN_COMPLETE).exclude()

        data = []
        for grn in po_grns:
            actual_delivery_date = grn.get_actual_delivery_date()
            if actual_delivery_date:
                data.append({
                    'id': grn.id,
                    'display_name': '%s / %s / %s' % (
                    actual_delivery_date.delivery_date, grn.supplier_pack_list.display_number, grn.grn_number)
                })
        return data

    def get_club_display_number(self, instance):
        try:
            return instance.general_po_supplier.general_po.po_club.display_number
        except AttributeError:
            return None

    class Meta:
        model = SupplierPO
        fields = ('id', 'supplier_name', 'po_club_id', 'club_display_number', 'supplier_po_number', 'supplier',
                  'supplier_po_file', 'attachment_display_name', 'attachment_file_path', 'replacement_grns',
                  'purchaseorderclubbomsupplier_set', 'state', 'purchase_orders', 'grns', 'pack_list',)


class GRNSupplierPODeliveryInvoicePackListSerializer(ModelSerializer):
    pack_list = serializers.SerializerMethodField(read_only=True)
    grns = serializers.SerializerMethodField(read_only=True)
    invoice = serializers.SerializerMethodField()
    delivery_dates = serializers.SerializerMethodField()
    delivery_note = serializers.SerializerMethodField()
    display_number = serializers.SerializerMethodField()
    materials = serializers.SerializerMethodField()
    debit_note_display_number = serializers.SerializerMethodField()

    def get_pack_list(self, instance):
        data = None
        if instance.pack_list:
            data = instance.pack_list.get_object_data()
        return data

    def get_grns(self, instance):
        grns = instance.supplierpogrn_set.all()
        serializer = SupplierPOGRNBasicSerializer(grns, many=True).data
        return serializer

    def get_invoice(self, instance):
        invoice = instance.get_invoice()
        invoice_attachment = None
        if invoice.invoice:
            invoice_attachment = invoice.invoice.get_object_data()
        data = {
            'id': invoice.id,
            'invoice_number': invoice.supplier_invoice_number,
            'invoice': invoice_attachment
        }
        return data

    def get_delivery_dates(self, instance):
        data = []
        delivery_dates = instance.get_delivery_dates()
        for deliver_date in delivery_dates:
            data.append({
                'id': deliver_date.id,
                'delivery_date': deliver_date.confirmed_delivery_date
            })
        return data

    # def get_delivery_note(self, instance):
    #     data = []
    #     delivery_dates = instance.get_delivery_dates()
    #     for deliver_date in delivery_dates:
    #         data.append({
    #             'id': deliver_date.id,
    #             'delivery_date': deliver_date.confirmed_delivery_date
    #         })
    #     return data

    def get_delivery_note(self, instance):
        delivery_note = None
        if instance.supplier_po_delivery_note.delivery_note:
            delivery_note = instance.supplier_po_delivery_note.delivery_note.get_object_data()
        data = {
            'id': instance.supplier_po_delivery_note.id,
            'delivery_note': delivery_note
        }
        return data

    def get_material_headers(self):
        from materials.fieldmetadata.material_metadata import get_grn_meta_material_headers
        headers = get_grn_meta_material_headers()
        return headers

    def get_materials(self, instance):
        material_list = []
        headers = self.get_material_headers()
        #supplier_po = instance.get_invoice().get_supplier_po() # Old delveloped way
        supplier_po = self.context['supplier_po']
        materials = supplier_po.get_supplier_po_material_list()
        for material in materials:
            material_headers = material.customer_brand_material.material_detail.generic_material.user_material.get_material_headers(
                material.customer_brand_material.material_detail.generic_material.user_material.name
            )
            material_list_data = {
               'attributes': material.get_attributes(),
               'headers': material_headers
            }
            material_list.append(material_list_data)
        data = {
            'headers': headers,
            'materials': material_list
        }
        return data
    
    def get_display_number(self, instance):
        return '%s / %s' % (instance.display_number, instance.supplier_display_number)
    
    def get_debit_note_display_number(self, instance):
        return '%s / %s' % (instance.supplier_po_delivery_note.display_number, instance.supplier_po_delivery_note.supplier_display_number)

    class Meta:
        model = SupplierPODeliveryInvoicePackList
        fields = ('id', 'supplier_display_number', 'pack_list', 'grns', 'invoice', 'delivery_dates', 'delivery_note',
                  'display_number', 'materials', 'debit_note_display_number',)


class SupplierPackListDeliveryInvoiceSerializer(ModelSerializer):
    invoice = serializers.SerializerMethodField(read_only=True)

    def get_invoice(self, instance):
        data = None
        if instance.invoice:
            data = instance.invoice.get_object_data()
        return data

    class Meta:
        model = SupplierPODeliveryInvoice
        fields = ("__all__")


class SupplierPackListInvoiceDeliveryNoteBasicSerializer(ModelSerializer):
    supplier_po_delivery_invoice = SupplierPackListDeliveryInvoiceSerializer()
    delivery_note = serializers.SerializerMethodField()
    display_number = serializers.CharField()

    def get_delivery_note(self, instance):
        data = None
        if instance.delivery_note:
            data = instance.delivery_note.get_object_data()
        return data

    class Meta:
        model = SupplierPOInvoiceDeliveryNote
        fields = ("__all__")


class PackListMaterialDetailSerializer(serializers.ModelSerializer):
    headers = serializers.SerializerMethodField(read_only=True)
    material_details = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = CustomerBrandMaterial
        fields = '__all__'

    def get_headers(self, instance):
        headers = instance.material_code.material_definition.user_material.get_material_headers(
            instance.material_code.material_definition.user_material.name)
        return headers

    def get_material_details(self, instance):
        material_details = instance.get_customer_brand_material_details()
        return material_details


class SupplierPODeliveryInvoicePackListSerializer(ModelSerializer):
    grns = serializers.SerializerMethodField(read_only=True)
    pack_list = serializers.SerializerMethodField()
    # supplier_po_delivery_note = SupplierPackListInvoiceDeliveryNoteBasicSerializer()
    display_number = serializers.SerializerMethodField()

    def get_grns(self, instance):
        #pack_list_grns = instance.get_pack_list_grns()
        if self.context:
            supplier_po = self.context['supplier_po']
            pack_list_grns = instance.get_supplier_po_pack_list_grns(supplier_po)  #TODO Review this with data testing
        else:
            pack_list_grns = instance.get_all_pack_list_grns()
        grn_data = []

        for pack_list_grn in pack_list_grns:
            grn_data.append({
                'id': pack_list_grn.pk,
                'display_number': pack_list_grn.grn_number
            })
        return grn_data

    def get_pack_list(self, instance):
        data = None
        if instance.pack_list:
            data = instance.pack_list.get_object_data()
        return data
    
    def get_display_number(self, instance):
        return '%s / %s' % (instance.display_number, instance.supplier_display_number)

    class Meta:
        model = SupplierPODeliveryInvoicePackList
        fields = ('id', 'grns', 'pack_list', 'display_number', 'supplier_display_number')


class GRNDeliveryInvoicePackListSerializer(ModelSerializer):
    grns = serializers.SerializerMethodField(read_only=True)
    pack_list = serializers.SerializerMethodField()
    supplier_po_delivery_note = SupplierPackListInvoiceDeliveryNoteBasicSerializer()
    display_number = serializers.CharField()

    # materials = serializers.SerializerMethodField(read_only=True)

    def get_grns(self, instance):
        pack_list_grns = instance.get_all_pack_list_grns()
        grn_data = []

        for pack_list_grn in pack_list_grns:
            grn_data.append({
                'id': pack_list_grn.pk,
                'display_number': pack_list_grn.grn_number
            })
        return grn_data

    def get_pack_list(self, instance):
        data = None
        if instance.pack_list:
            data = instance.pack_list.get_object_data()
        return data

    def get_materials(self, instance):
        material_id_list = []
        grns = instance.supplierpogrn_set.all()
        for grn in grns:
            material_ids = grn.supplierpogrnmaterial_set.all().values_list('grn_material', flat=True)
            material_id_list.append(material_ids)
        materials = CustomerBrandMaterial.objects.filter(id__in=material_id_list).order_by('id')
        searializer = PackListMaterialDetailSerializer(materials, many=True)
        return searializer.data

    class Meta:
        model = SupplierPODeliveryInvoicePackList
        fields = ("__all__")


class SupplierPOInvoiceDeliveryNoteSerializer(ModelSerializer):
    pack_list = serializers.SerializerMethodField(read_only=True)
    delivery_note = serializers.SerializerMethodField()
    display_number = serializers.CharField()

    def get_pack_list(self, instance):
        pack_list = instance.get_delivery_note_pack_list()
        context = None
        if self.context:
            supplier_po = self.context['supplier_po']
            context = {'supplier_po': supplier_po }
        data = SupplierPODeliveryInvoicePackListSerializer(pack_list, context=context, many=True).data
        return data

    def get_delivery_note(self, instance):
        data = None
        if instance.delivery_note:
            data = instance.delivery_note.get_object_data()
        return data
    
    def get_display_number(self, instance):
        return '%s / %s' % (instance.display_number, instance.supplier_display_number)

    class Meta:
        model = SupplierPOInvoiceDeliveryNote
        fields = ("__all__")


class GRNInvoiceDeliveryNoteSerializer(ModelSerializer):
    pack_list = serializers.SerializerMethodField(read_only=True)
    delivery_note = serializers.SerializerMethodField()
    display_number = serializers.CharField()

    def get_pack_list(self, instance):
        pack_list = instance.get_delivery_note_pack_list().order_by('id')
        data = GRNDeliveryInvoicePackListSerializer(pack_list, many=True).data
        return data

    def get_delivery_note(self, instance):
        data = None
        if instance.delivery_note:
            data = instance.delivery_note.get_object_data()
        return data

    class Meta:
        model = SupplierPOInvoiceDeliveryNote
        fields = ("__all__")


class SupplierPODeliveryInvoiceBasicSerializer(ModelSerializer):
    display_number = serializers.CharField()

    class Meta:
        model = SupplierPODeliveryInvoice
        fields = ('id', 'display_number')


class SupplierPODeliveryInvoiceSerializer(ModelSerializer):
    invoice = serializers.SerializerMethodField(read_only=True)
    supplierpoinvoicedeliverynote_set = serializers.SerializerMethodField()
    display_number = serializers.CharField()

    def get_invoice(self, instance):
        data = None
        if instance.invoice:
            data = instance.invoice.get_object_data()
        return data
    
    def get_supplierpoinvoicedeliverynote_set(self, instance):
        context = None
        if hasattr(self.context, 'supplier_po'):
            supplier_po = self.context['supplier_po']
            context = {'supplier_po': supplier_po}
        data = SupplierPOInvoiceDeliveryNoteSerializer(instance.supplierpoinvoicedeliverynote_set, context=context, many=True).data
        return data

    class Meta:
        model = SupplierPODeliveryInvoice
        fields = ("__all__")


class SupplierPODeliveryInvoiceDetailSerializer(ModelSerializer, InvoiceSummary):
    invoice = serializers.SerializerMethodField(read_only=True)
    display_number = serializers.CharField()
    plan_date = serializers.SerializerMethodField()
    actual_date = serializers.SerializerMethodField()
    quantity_summary = serializers.SerializerMethodField()

    def get_invoice(self, instance):
        data = None
        if instance.invoice:
            data = instance.invoice.get_object_data()
        return data

    def get_plan_date(self, instance):
        date = []
        supplier_po = self.context['supplier_po']
        supplier_delivery_dates = instance.get_invoice_supplier_delivery_dates(supplier_po)
        for supplier_delivery_date in supplier_delivery_dates:
            date.append(supplier_delivery_date.confirmed_delivery_date)
        return date

    def get_actual_date(self, instance):
        date = None
        if hasattr(instance, 'supplieractualdeliverydate'):
            date = [instance.supplieractualdeliverydate.delivery_date]
        # actual_delivery_dates = instance.supplieractualdeliverydate_set.all()
        # for actual_delivery_date in actual_delivery_dates:
        #     date.append(actual_delivery_date.delivery_date)
        return date

    def get_quantity_summary(self, instance):
        supplier_po = self.context['supplier_po']
        summary = InvoiceSummary(instance, supplier_po).get_invoice_summarized_data()
        return summary

    class Meta:
        model = SupplierPODeliveryInvoice
        fields = ("__all__")


class GRNDeliveryInvoiceSerializer(ModelSerializer):
    invoice = serializers.SerializerMethodField(read_only=True)
    supplierpoinvoicedeliverynote_set = serializers.SerializerMethodField()
    display_number = serializers.CharField()
    payment_due_date = serializers.DateField()

    def get_invoice(self, instance):
        data = None
        if instance.invoice:
            data = instance.invoice.get_object_data()
        return data

    def get_supplierpoinvoicedeliverynote_set(self, instance):
        supplierpoinvoicedeliverynote_set = instance.supplierpoinvoicedeliverynote_set.all().order_by('id')
        data = GRNInvoiceDeliveryNoteSerializer(supplierpoinvoicedeliverynote_set, many=True).data
        return data

    class Meta:
        model = SupplierPODeliveryInvoice
        fields = ("__all__")


class SupplierActualDeliveryDateSerializer(ModelSerializer):
    class Meta:
        model = SupplierActualDeliveryDate
        fields = ("__all__")


class SupplierPODeliveryDateSerializer(ModelSerializer):
    supplier_po_number = serializers.CharField(source='general_po_supplier.supplierpo.supplier_po_number')
    advance_payment_due_date = serializers.DateField(source='general_po_supplier.supplierpo.advance_payment_due_date')
    advance_payment = serializers.FloatField(source='general_po_supplier.supplierpo.advance_payment')
    actual_delivery_date = SupplierActualDeliveryDateSerializer(many=False)
    supplier_po_delivery_invoice = serializers.SerializerMethodField()
    delivery_display = serializers.SerializerMethodField()
    proforma_invoice = serializers.SerializerMethodField()
    supplier_display_number = serializers.SerializerMethodField()
    is_foc = serializers.BooleanField(source='has_free_of_charge_deliveries')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.delivery_counter = 0

    def get_supplier_po_delivery_invoice(self, instance):
        data = None
        if instance.actual_delivery_date:
            invoice = instance.actual_delivery_date.supplier_po_delivery_invoice
            data = GRNDeliveryInvoiceSerializer(invoice).data
        return data

    def get_delivery_display(self, instance):
        return instance.display_number

    def get_proforma_invoice(self, instance):
        data = None
        if instance.general_po_supplier.supplierpo.proforma_invoice:
            data = instance.general_po_supplier.supplierpo.proforma_invoice.get_object_data()
        return data
    
    def get_supplier_display_number(self, instance):
        data = None
        if instance.general_po_supplier.supplierpo.proforma_invoice_supplier_display_number:
            data = instance.general_po_supplier.supplierpo.proforma_invoice_supplier_display_number
        return data

    class Meta:
        fields = ("__all__")
        model = SupplierDeliveryDate


# DS Reviewed 07/27
class SupplierPODetailSerializer(ModelSerializer):
    supplier_po_file = serializers.SerializerMethodField(read_only=True)
    delivery_dates = serializers.SerializerMethodField(read_only=True)
    supplier_name = serializers.CharField(source='general_po_supplier.supplier.name')
    materials = serializers.SerializerMethodField()
    proforma_invoice = serializers.SerializerMethodField()

    def get_supplier_po_file(self, instance):
        data = {}
        if instance.supplier_po_file:
            data = instance.supplier_po_file.get_object_data()
        return data

    def get_delivery_dates(self, instance):
        delivery_dates = instance.get_all_delivery_dates()
        data = SupplierPODeliveryDateSerializer(delivery_dates, many=True)
        return data.data

    def get_proforma_invoice(self, instance):
        data = None
        if instance.proforma_invoice:
            data = instance.proforma_invoice.get_object_data()
        return data

    def get_materials(self, instance):
        data = []
        user_define_materials = instance.get_material_categories()
        for user_define_material in user_define_materials:
            materials = instance.get_supplier_po_material_list().filter(
                customer_brand_material__material_detail__generic_material__user_material=user_define_material
            )
            detail = {
                'id': user_define_material.id,
                'material_category': user_define_material.material,
                'materials': []
            }
            for material in materials:
                detail['materials'].append(
                    {
                        'id': material.id,
                        'attributes': material.get_attributes()
                    }
                )
            data.append(detail)
        return data

    class Meta:
        model = SupplierPO
        fields = ("__all__")


class InHouseMaterialDetailSerializer(ModelSerializer):
    pack_number = serializers.CharField(source='grn_material_detail.fabricgrndetail.pack_number', read_only=True, allow_null=True)
    batch_number = serializers.CharField(source='grn_material_detail.batch_number.batch_number', read_only=True, allow_null=True)
    shade = serializers.CharField(source='grn_material_detail.shade.shade', read_only=True, allow_null=True)
    available_quantity_units = serializers.SerializerMethodField()

    def get_available_quantity_units(self, instance):
        return instance.get_available_quantity_units_display()
    class Meta:
        model = InHouseMaterial
        fields = ('id', 'barcode', 'pack_number', 'batch_number', 'shade', 'free_of_charge', 'available_quantity', 'available_quantity_units')


class SupplierPOLeftOverMaterialSerializer(ModelSerializer):
    supplier_name = serializers.CharField(source='general_po_supplier.supplier.name')
    materials = serializers.SerializerMethodField()
    leftover_materials = serializers.SerializerMethodField()

    def get_materials(self, instance):
        data = []
        left_over_materials = InHouseMaterial.objects.filter(
            grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po=instance, 
            state=InHouseMaterial.LEFT_OVER_STATUS
        )
        user_define_material_ids = left_over_materials.values_list('grn_material_detail__supplier_po_grn_material__grn_material__customer_brand_material__material_detail__generic_material__user_material', flat=True).distinct()
        user_define_materials = instance.get_material_categories().filter(id__in=user_define_material_ids)
        for user_define_material in user_define_materials:
            materials = instance.get_supplier_po_material_list().filter(
                customer_brand_material__material_detail__generic_material__user_material=user_define_material,
                id__in=left_over_materials.values_list('grn_material_detail__supplier_po_grn_material__grn_material', flat=True)
            )
            detail = {
                'id': user_define_material.id,
                'material_category': user_define_material.material,
                'materials': []
            }
            for material in materials:
                detail['materials'].append(
                    {
                        'id': material.id,
                        'attributes': material.get_attributes()
                    }
                )
            data.append(detail)
        return data

    def get_leftover_materials(self, instance):
        data = []
        left_over_materials = InHouseMaterialVerificationMaterial.objects.filter(
            inhouse_material__grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po=instance,
            inhouse_material__state=InHouseMaterial.LEFT_OVER_STATUS
        )
        grn_material_ids = left_over_materials.filter().values_list('inhouse_material__grn_material_detail__supplier_po_grn_material', flat=True).distinct()
        grn_materials = SupplierPOGRNMaterial.objects.filter(id__in=grn_material_ids)
        for grn_material in grn_materials:
            details = left_over_materials.filter(inhouse_material__grn_material_detail__supplier_po_grn_material=grn_material)
            data.append({
                **SupplierCustomerBrandMaterialSerializer(grn_material.grn_material).data,
                'details': LeftOverMaterialSerializer(details, many=True).data
            })
        return data

    class Meta:
        model = SupplierPO
        fields = ("__all__")

class SupplierPODetailPurchaseOrderSerializer(serializers.ModelSerializer):
    order_quantity = serializers.SerializerMethodField()
    supplier_po_quantity = serializers.SerializerMethodField()
    invoice_quantity = serializers.SerializerMethodField()
    grn_quantity = serializers.SerializerMethodField()

    def get_order_quantity(self, instance):
        order_quantity = 0
        po_club_bom_suppliers = SupplierDeliveryDateQuantity.objects.filter(purchase_order_bom__purchase_order=instance)
        for po_club_bom_supplier in po_club_bom_suppliers:
            order_quantity += po_club_bom_supplier.get_normalized_quantity()
        return order_quantity

    def get_supplier_po_quantity(self, instance):
        return None

    def get_invoice_quantity(self, instance):
        return None

    def get_grn_quantity(self, instance):
        return None

    class Meta:
        model = PurchaseOrder
        fields = (
        'id', 'ritz_code', 'name', 'order_quantity', 'supplier_po_quantity', 'invoice_quantity', 'grn_quantity',)


class SupplierPODetailMaterialSerializer(serializers.ModelSerializer):
    purchase_orders = serializers.SerializerMethodField()

    def get_purchase_orders(self, instance):
        supplier_po = self.context['supplier_po']
        purchase_orders = supplier_po.po_club.get_purchase_orders().order_by('id')
        context = {'supplier_po': supplier_po, 'material': instance}
        data = SupplierPODetailPurchaseOrderSerializer(purchase_orders, context=context, many=True).data
        return data

    class Meta:
        model = CustomerBrandMaterial
        fields = ('id', 'material_label', 'verbose_reference_code', 'purchase_orders')


class SupplierPOSummaryDetailSerializer(ModelSerializer):
    materials = serializers.SerializerMethodField()

    def get_materials(self, instance):
        po_club = instance.po_club
        material_ids = ActualClubBom.objects.filter(actual_club=po_club).values_list('material', flat=True)
        materials = CustomerBrandMaterial.objects.filter(id__in=material_ids).order_by(
            'material_detail__generic_material__user_material__display_order')
        context = {'supplier_po': instance}
        data = SupplierPODetailMaterialSerializer(materials, context=context, many=True).data
        return data

    class Meta:
        model = SupplierPO
        fields = ('id', 'supplier_po_number', 'materials',)


class SupplierRequestedDeliveryDateSerializer(ModelSerializer):
    class Meta:
        model = SupplierRequestedDeliveryDate
        fields = ("__all__")


class InvoiceMaterialSerializer(ModelSerializer):
    invoice = serializers.SerializerMethodField(read_only=True)
    display_number = serializers.CharField()

    class Meta:
        model = SupplierPODeliveryInvoice
        fields = ("__all__")


class SupplierPODeliveryInvoiceListSerializer(serializers.ModelSerializer):
    supplier_po_id = serializers.SerializerMethodField()
    supplier_po_display_number = serializers.SerializerMethodField()
    general_po_id = serializers.SerializerMethodField()
    general_po_display_number = serializers.SerializerMethodField()

    def get_supplier_po_id(self, instance):
        supplier_po = instance.get_supplier_po()
        if supplier_po:
            return supplier_po.id
        return None
    
    def get_supplier_po_display_number(self, instance):
        supplier_po = instance.get_supplier_po()
        if supplier_po:
            return supplier_po.supplier_po_number
        return None
    
    def get_general_po_id(self, instance):
        supplier_po = instance.get_supplier_po()
        if supplier_po:
            if supplier_po.general_po_supplier:
                return supplier_po.general_po_supplier.general_po.id
        return None
    
    def get_general_po_display_number(self, instance):
        supplier_po = instance.get_supplier_po()
        if supplier_po:
            if supplier_po.general_po_supplier:
                return supplier_po.general_po_supplier.general_po.display_number
        return None

    class Meta:
        model = SupplierPODeliveryInvoice
        fields = ('id', 'display_number', 'supplier_po_id', 'supplier_po_display_number', 'general_po_id', 'general_po_display_number')


class SupplierPOMainSerializer(serializers.ModelSerializer):

    state_display = serializers.CharField(source='get_state_display', read_only=True)
    delivery_mode_display = serializers.CharField(source='get_delivery_mode_display', read_only=True)
    payment_term_display = serializers.CharField(source='get_payment_term_display', read_only=True)
    terms_of_delivery_display = serializers.CharField(source='get_terms_of_delivery_display', read_only=True)
    supplier_po_file = serializers.CharField(source='supplier_po_file.display_name', read_only=True)
    supplier_po_file_path = serializers.CharField(source='supplier_po_file.file_path', read_only=True)
    plant_name = serializers.CharField(source='plant.name', read_only=True)

    class Meta:
        model = SupplierPO
        fields = '__all__'


class SupplierPOUpdateSerializer(serializers.ModelSerializer):

    class Meta:
        model = SupplierPO
        fields = ('supplier_po_number',
            'delivery_mode',
            'payment_term',
            'value_added_tax_registration_number',
            'simplified_value_added_tax_registration_number',
            'board_of_investment_registration_number',
            'terms_of_delivery',
            'plant')


class SupplierPODetailMainSerializer(SupplierPOMainSerializer):

    customer_brand_material_details = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = SupplierPO
        fields = '__all__'

    def get_customer_brand_material_details(self, instance):

        supplier_po_id = instance.id
        supplier_po_general_po_material_quantity_queryset = SupplierPOGeneralPOMaterialQuantity.objects.filter(supplier_po__id=supplier_po_id)
        material_categories = {supplier_po_general_po_material_quantity.general_po_material_quantity.material.material_detail.generic_material.user_material.category for supplier_po_general_po_material_quantity in supplier_po_general_po_material_quantity_queryset}

        material_category_desired_order = ['fabric', 'sewing_trim', 'packaging_trim']
        m_c1 = []
        for category in material_category_desired_order:
            if category in material_categories:
                m_c1.append(category)
        m_c2 = []
        for category in material_categories:
            if category not in material_category_desired_order:
                m_c2.append(category)
        material_categories = m_c1+m_c2

        material_category_wise_details = []
        if material_categories:
            for material_category in material_categories:
                material_category_detail = {}
                user_defined_material = UserDefinedMaterial.objects.filter(category=material_category).first()
                material_category_detail["category"] = user_defined_material.get_category_display()

                supplier_po_general_po_material_quantity_queryset_by_category = supplier_po_general_po_material_quantity_queryset.filter(general_po_material_quantity__material__material_detail__generic_material__user_material__category=material_category)
                customer_brand_material_ids = {supplier_po_general_po_material_quantity.general_po_material_quantity.material.id for supplier_po_general_po_material_quantity in supplier_po_general_po_material_quantity_queryset_by_category}
                customer_brand_material_wise_details = []
                if customer_brand_material_ids:
                    for customer_brand_material_id in customer_brand_material_ids:
                        total_value = 0
                        customer_brand_material_detail = {}
                        customer_brand_material_object = CustomerBrandMaterial.objects.get(id=customer_brand_material_id)
                        customer_brand_material_detail["material"] = customer_brand_material_object.verbose_reference_code
                        material_name = customer_brand_material_object.material_detail.generic_material.user_material.name
                        customer_brand_material_detail["material_headers"] = customer_brand_material_object.material_detail.generic_material.user_material.get_material_headers(material_name)
                        customer_brand_material_detail["material_attributes"] = customer_brand_material_object.get_attributes()

                        supplier_po_general_po_material_quantity_queryset_by_category_by_material = supplier_po_general_po_material_quantity_queryset_by_category.filter(general_po_material_quantity__material__id=customer_brand_material_id)
                        po_club_ids = {supplier_po_general_po_material_quantity.general_po_material_quantity.general_po.po_club.id for supplier_po_general_po_material_quantity in supplier_po_general_po_material_quantity_queryset_by_category_by_material}
                        po_club_wise_details = []
                        if po_club_ids:
                            for po_club_id in po_club_ids:
                                po_club_detail = {}
                                po_club_object = ActualPOClub.objects.get(id=po_club_id)
                                po_club_detail["po_club_id"] = po_club_object.id
                                po_club_detail["po_club_display_number"] = po_club_object.display_number
                                po_club_detail["po_club_short_code"] = po_club_object.short_code
                                po_club_detail["po_club_long_code"] = po_club_object.long_code

                                supplier_po_general_po_material_quantity_queryset_by_category_by_material_by_club = supplier_po_general_po_material_quantity_queryset_by_category_by_material.filter(general_po_material_quantity__general_po__po_club__id=po_club_id)
                                general_po_material_quantity_ids = {supplier_po_general_po_material_quantity.general_po_material_quantity.id for supplier_po_general_po_material_quantity in supplier_po_general_po_material_quantity_queryset_by_category_by_material_by_club}

                                supplier_delivery_date_quantity_po_allocation_queryset_by_category_by_material_by_club = SupplierDeliveryDateQuantityPOAllocation.objects.filter(supplier_delivery_date_quantity__general_po_material_quantity__id__in=list(general_po_material_quantity_ids))

                                po_ids = {supplier_delivery_date_quantity_po_allocation.purchase_order.id for supplier_delivery_date_quantity_po_allocation in supplier_delivery_date_quantity_po_allocation_queryset_by_category_by_material_by_club}
                                po_wise_details = []
                                if po_ids:
                                    for po_id in po_ids:
                                        po_detail = {}
                                        po_object = PurchaseOrder.objects.get(id=po_id)
                                        po_detail["po_id"] = po_object.id
                                        po_detail["po_number"] = po_object.display_number

                                        supplier_delivery_date_quantity_po_allocation_queryset_by_category_by_material_by_club_by_po = supplier_delivery_date_quantity_po_allocation_queryset_by_category_by_material_by_club.filter(purchase_order__id=po_id)

                                        total_order_quantity = 0
                                        value = 0
                                        for supplier_delivery_date_quantity_po_allocation in supplier_delivery_date_quantity_po_allocation_queryset_by_category_by_material_by_club_by_po:

                                            total_order_quantity_detail = supplier_delivery_date_quantity_po_allocation.get_normalized_quantity()
                                            total_order_quantity_units = total_order_quantity_detail["quantity_units_display"]
                                            total_order_quantity += total_order_quantity_detail["quantity"]
                                            unit_price = supplier_delivery_date_quantity_po_allocation.supplier_delivery_date_quantity.material_supplier.order_price
                                            accepted_delivery_date_tolerance = supplier_delivery_date_quantity_po_allocation.supplier_delivery_date_quantity.general_po_material_quantity.default_material_supplier.excess_threshold
                                            value += supplier_delivery_date_quantity_po_allocation.calculate_quantity_price()

                                        po_detail["total_order_quantity"] = total_order_quantity
                                        po_detail["total_order_quantity_unit"] = total_order_quantity_units
                                        po_detail["accepted_delivery_tolerance"] = accepted_delivery_date_tolerance
                                        po_detail["unit_price"] = unit_price
                                        po_detail["value"] = value
                                        po_detail["price_unit"] = "USD"
                                        total_value += value
                                        po_wise_details.append(po_detail)

                                po_club_detail["po_wise_details"] = po_wise_details
                                po_club_wise_details.append(po_club_detail)

                        customer_brand_material_detail["po_club_wise_details"] = po_club_wise_details
                        customer_brand_material_detail["total_value"] = round(total_value, 4)
                        customer_brand_material_detail["price_unit"] = "USD"
                        customer_brand_material_wise_details.append(customer_brand_material_detail)

                material_category_detail["material_wise_details"] = customer_brand_material_wise_details
                material_category_wise_details.append(material_category_detail)

        return material_category_wise_details