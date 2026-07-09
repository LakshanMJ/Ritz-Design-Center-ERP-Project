from django.core.exceptions import ObjectDoesNotExist
from django.http import HttpResponse
from rest_framework.exceptions import ValidationError
from rest_framework.serializers import ModelSerializer
from rest_framework import serializers
from service_po.models import GeneralServicePOService, GeneralServicePOServiceDelivery, GeneralServicePODeliveryPOAllocation, GeneralServicePOSupplierPrice, ServicePO, GeneralServicePOSupplier
from marketing.models import POPackItemWashService, POPackItemEmbellishmentService
from shared.utils import get_quantity_dictionary
from materials.fieldmetadata.measuring_unit_helpers import MaterialUnitHelper
from django.contrib.contenttypes.models import ContentType
from shared.models import Approval
from shared.approvals.constants.task_entities import SERVICE_PO_ENTITY
from shared.approvals.constants.approval_choices import SERVICE_PO_APPROVAL
from shared.utils import get_amount_dictionary

class GeneralServicePODeliveryPOAllocationSerializer(serializers.ModelSerializer):
    purchase_order_display_number = serializers.CharField(source='purchase_order.display_number', read_only=True)
    
    class Meta:
        model = GeneralServicePODeliveryPOAllocation
        fields = ('__all__')
        
class GeneralServicePOServiceDeliverySerializer(serializers.ModelSerializer):
    supplier_id = serializers.IntegerField(source='general_service_po_supplier_price.supplier_inquiry_detail.supplier_inquiry.supplier.id', read_only=True)
    supplier_name = serializers.CharField(source='general_service_po_supplier_price.supplier_inquiry_detail.supplier_inquiry.supplier.name', read_only=True)
    general_service_po_delivery_po_allocation = serializers.SerializerMethodField()
    general_service_po_supplier_price_id = serializers.IntegerField(read_only=True)

    def get_general_service_po_delivery_po_allocation(self, instance):
        if instance.generalservicepodeliverypoallocation_set.all():
            allocation = instance.generalservicepodeliverypoallocation_set.all()[0]
            data = GeneralServicePODeliveryPOAllocationSerializer(allocation, many=False).data
            return data
        return {}

     
    class Meta:
        model = GeneralServicePOServiceDelivery
        fields = ('__all__')


class GeneralServicePOSupplierPriceSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = GeneralServicePOSupplierPrice
        fields = ('__all__')

        
class GeneralServicePOServicetSerializer(serializers.ModelSerializer):
    item_name = serializers.SerializerMethodField()
    country = serializers.SerializerMethodField()
    size = serializers.SerializerMethodField()
    colorway = serializers.SerializerMethodField()
    # supplier_id = serializers.IntegerField(source='supplier_inquiry_detail.supplier_inquiry.supplier.id')
    # supplier_name = serializers.CharField(source='supplier_inquiry_detail.supplier_inquiry.supplier.name')
    generalserviceposervicedelivery_set = GeneralServicePOServiceDeliverySerializer(many=True)
    no_of_deliveries = serializers.SerializerMethodField()
    purchase_order_breakdown = serializers.SerializerMethodField()
    price_breakdown = serializers.SerializerMethodField()
    quantity = serializers.SerializerMethodField()
    planned_send_date = serializers.SerializerMethodField(read_only=True)
    actual_send_date = serializers.SerializerMethodField(read_only=True)
    supplier_id = serializers.SerializerMethodField(read_only=True)

    def get_supplier_id(self, instance):
        supplier_id = None
        general_service_po_service_deliveries = instance.generalserviceposervicedelivery_set.all()
        if general_service_po_service_deliveries.exists(): 
            supplier_id = general_service_po_service_deliveries.first().general_service_po_supplier_price.supplier_inquiry_detail.supplier_inquiry.supplier.id
        return supplier_id

    def get_planned_send_date(self, instance):
        planned_send_date = None
        general_service_po_service_deliveries = instance.generalserviceposervicedelivery_set.filter(planned_send_date__isnull=False)
        if general_service_po_service_deliveries.exists(): 
            planned_send_date = general_service_po_service_deliveries.first().planned_send_date
        return planned_send_date

    def get_actual_send_date(self, instance):
        actual_send_date = None
        general_service_po_service_deliveries = instance.generalserviceposervicedelivery_set.filter(actual_send_date__isnull=False)
        if general_service_po_service_deliveries.exists(): 
            actual_send_date = general_service_po_service_deliveries.first().actual_send_date
        return actual_send_date

    def get_item_name(self, instance):
        item_name = None
        item_name = instance.entity.po_pack_item.po_item.order_item.item.name

        return item_name
    
    def get_country(self, instance):
        item_name = None
        if instance.get_entity():
            entity = instance.get_entity()
            item_name = entity.po_pack_item.po_pack.po_country.po_country_name
        return item_name
    
    def get_size(self, instance):
        item_name = None
        if instance.get_entity():
            entity = instance.get_entity()
            item_name = entity.po_pack_item.po_pack.po_size.po_size_name
        return item_name
    
    def get_colorway(self, instance):
        item_name = None
        if instance.get_entity():
            entity = instance.get_entity()
            item_name = entity.po_pack_item.po_pack.po_colorway.colorway
        return item_name
    
    def get_no_of_deliveries(self, instance):
        return instance.generalserviceposervicedelivery_set.all().count()
    
    def get_purchase_order_breakdown(self, instance):
        entity = instance.get_entity()
        data = {
            'entity_id': entity.id,
            'purchase_order_id': entity.po_pack_item.po_pack.purchase_order.id,
            'purchase_order_display_number': entity.po_pack_item.po_pack.purchase_order.display_number,
            'order_quantity': get_quantity_dictionary(instance.quantity, MaterialUnitHelper.PIECES_UNIT),
            'required_quantity': get_quantity_dictionary(instance.quantity, MaterialUnitHelper.PIECES_UNIT),
        }
        
        return data

    def get_price_breakdown(self, instance):
        data = []
        prices = GeneralServicePOSupplierPrice.objects.filter(
            entity_type=ContentType.objects.get_for_model(instance.get_entity()),
            entity_id=instance.entity_id
        )
        for price in prices:
            data.append({
                'id': price.id,
                'supplier_id': price.general_service_po_supplier.supplier.id,
                'supplier_name': price.general_service_po_supplier.supplier.name,
                'general_service_po_supplier_id': price.general_service_po_supplier.id,
                'price': price.price,
                'price_currency': price.price_currency,
                'lead_time': price.lead_time,
                'costing_price': price.costing_price,
                'costing_price_units': price.costing_price_units,
                'discount': price.general_service_po_supplier.discount,
            })
        return data

    
    def get_quantity(self, instance):
        quantity = get_quantity_dictionary(instance.quantity, MaterialUnitHelper.PIECES_UNIT)
        return quantity

    class Meta:
        model = GeneralServicePOService
        fields = ('__all__')


class ServicePOSerializer(serializers.ModelSerializer):

    service_po_number = serializers.CharField(source='display_number', read_only=True)
    po_club_id = serializers.IntegerField(source='service_po_supplier.general_service_po.po_club.id', read_only=True)
    supplier_name = serializers.CharField(source='service_po_supplier.supplier.name', read_only=True)
    attachment_display_name = serializers.CharField(source='service_po_file.display_name' ,read_only=True)
    attachment_file_path = serializers.CharField(source='service_po_file.file_path',read_only=True)
    state_display = serializers.CharField(source='get_state_display')
    approval = serializers.SerializerMethodField()
    is_approval_created = serializers.SerializerMethodField()
    details = serializers.SerializerMethodField()

    def get_is_approval_created(self, instance):
        from shared.models import Approval
        is_exists = Approval.objects.filter(entity__contains=[{"entity_id": instance.id, "entity_name": SERVICE_PO_ENTITY}], approval_name=SERVICE_PO_APPROVAL).exists()
        return is_exists
    
    def get_approval(self, instance):
        data = {}
        approvals = Approval.objects.filter(entity__contains=[{"entity_id": instance.id, "entity_name": SERVICE_PO_ENTITY}], approval_name=SERVICE_PO_APPROVAL)
        if approvals:
            data = {
                'id': approvals[0].id,
                'approval_name': approvals[0].approval_name,
                'state': approvals[0].action,
                'state_display': approvals[0].get_action_display()
            }
        return data
    
    def get_details(self, instance):
        data = []
        deliveries = GeneralServicePOServiceDelivery.objects.filter(general_service_po_supplier_price__general_service_po_supplier__service_po=instance)
        for delivery in deliveries:
            total_value = delivery.general_service_po_supplier_price.price * delivery.planned_send_quantity
            detail = {
                'id': delivery.id,
                'service_category': delivery.general_service_po_supplier_price.service_detail.get('type', None),
                'service_description': delivery.general_service_po_supplier_price.service_detail.get('sub_type', None),
                'unit_price': get_amount_dictionary(delivery.general_service_po_supplier_price.price, delivery.general_service_po_supplier_price.price_currency),
                'quantity': get_quantity_dictionary(delivery.planned_send_quantity, delivery.planned_send_quantity_units),
                'total_value': get_amount_dictionary(total_value),
            }
            data.append(detail)
        return data

    class Meta:
        model = ServicePO
        fields = '__all__'


class OtherCostServicePOSerializer(serializers.ModelSerializer):

    service_po_number = serializers.CharField(source='display_number', read_only=True)
    po_club_id = serializers.IntegerField(source='service_po_supplier.general_service_po.po_club.id', read_only=True)
    supplier_name = serializers.CharField(source='service_po_supplier.supplier.name', read_only=True)
    attachment_display_name = serializers.CharField(source='service_po_file.display_name' ,read_only=True)
    attachment_file_path = serializers.CharField(source='service_po_file.file_path',read_only=True)
    state_display = serializers.CharField(source='get_state_display')
    is_approval_created = serializers.SerializerMethodField()
    approval = serializers.SerializerMethodField()
    details = serializers.SerializerMethodField()

    def get_is_approval_created(self, instance):
        from shared.models import Approval
        is_exists = Approval.objects.filter(entity__contains=[{"entity_id": instance.id, "entity_name": SERVICE_PO_ENTITY}], approval_name=SERVICE_PO_APPROVAL).exists()
        return is_exists
    
    def get_approval(self, instance):
        data = {}
        approvals = Approval.objects.filter(entity__contains=[{"entity_id": instance.id, "entity_name": SERVICE_PO_ENTITY}], approval_name=SERVICE_PO_APPROVAL)
        if approvals:
            data = {
                'id': approvals[0].id,
                'approval_name': approvals[0].approval_name,
                'state': approvals[0].action,
                'state_display': approvals[0].get_action_display()
            }
        return data
    
    def get_details(self, instance):
        data = []
        deliveries = GeneralServicePOServiceDelivery.objects.filter(general_service_po_supplier_price__general_service_po_supplier__service_po=instance)
        for delivery in deliveries:
            total_value = delivery.general_service_po_supplier_price.price * delivery.planned_send_quantity
            detail = {
                'id': delivery.id,
                'service_category': delivery.general_service_po_supplier_price.service_detail.get('name', None),
                'service_description': delivery.general_service_po_supplier_price.service_detail.get('other_cost_type_description', None),
                'unit_price': get_amount_dictionary(delivery.general_service_po_supplier_price.price, delivery.general_service_po_supplier_price.price_currency),
                'quantity': get_quantity_dictionary(delivery.planned_send_quantity, delivery.planned_send_quantity_units),
                'total_value': get_amount_dictionary(total_value),
            }
            data.append(detail)
        return data

    class Meta:
        model = ServicePO
        fields = '__all__'


class ServicePOMainSerializer(serializers.ModelSerializer):
    
    service_po_number = serializers.CharField(source='display_number', read_only=True)
    service_po_supplier = serializers.PrimaryKeyRelatedField(queryset=GeneralServicePOSupplier.objects.all(), required=False, allow_null=True)
    supplier_details = serializers.SerializerMethodField(read_only=True)
    total_price = serializers.FloatField(required=False, allow_null=True)
    payment_term_display = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ServicePO
        fields = '__all__'

    def get_payment_term_display(self, instance):
        return instance.get_payment_term_display()

    def get_supplier_details(self, instance):

        supplier_name = instance.service_po_supplier.supplier.name
        supplier_email = instance.service_po_supplier.supplier.email
        supplier_phone_number = instance.service_po_supplier.supplier.phone_number
        supplier_location = instance.service_po_supplier.supplier.supplier_location.get_verbose_address()
        supplier_fax = instance.service_po_supplier.supplier.fax

        supplier_details = {'supplier_name': supplier_name,
                            'supplier_email': supplier_email,
                            'supplier_phone_number': supplier_phone_number,
                            'supplier_location': supplier_location,
                            'supplier_fax': supplier_fax}
        
        return supplier_details
    

class ServicePOUpdateSerializer(ServicePOMainSerializer):

    service_po_supplier = None
    total_price = None
    service_po_history_files = None

    class Meta:
        model = ServicePO
        exclude = ['service_po_supplier', 'total_price', 'service_po_history_files']


class ServicePODetailSerializer(ServicePOMainSerializer):

    style = serializers.CharField(source='service_po_supplier.general_service_po.po_club.style_number', read_only=True)
    po_club_id = serializers.IntegerField(source='service_po_supplier.general_service_po.po_club.id', read_only=True)
    po_club_number = serializers.CharField(source='service_po_supplier.general_service_po.po_club.display_number', read_only=True)
    po_club_short_code = serializers.CharField(source='service_po_supplier.general_service_po.po_club.short_code', read_only=True)
    po_club_long_code = serializers.CharField(source='service_po_supplier.general_service_po.po_club.long_code', read_only=True)
    service_po_file = serializers.CharField(source='service_po_file.display_name', read_only=True)
    service_po_file_path = serializers.CharField(source='service_po_file.file_path', read_only=True)
    service_po_service_details = serializers.SerializerMethodField(read_only=True)
    state_display = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ServicePO
        fields = '__all__'

    def get_state_display(self, instance):
        return instance.get_state_display()
    
    def get_service_po_service_details(self, instance):

        general_service_po_delivery_po_allocations = GeneralServicePODeliveryPOAllocation.objects.filter(general_service_po_service_delivery__general_service_po_supplier_price__general_service_po_supplier__service_po__id=instance.id)

        existing_service_details = []
        for general_service_po_delivery_po_allocation in general_service_po_delivery_po_allocations:
            req_date = general_service_po_delivery_po_allocation.general_service_po_service_delivery.planned_send_date
            quantity = general_service_po_delivery_po_allocation.quantity
            quantity_units = general_service_po_delivery_po_allocation.get_quantity_units_display()
            price = general_service_po_delivery_po_allocation.general_service_po_service_delivery.general_service_po_supplier_price.price
            quantity_price = general_service_po_delivery_po_allocation.calculate_quantity_price()
            service_detail = general_service_po_delivery_po_allocation.general_service_po_service_delivery.general_service_po_supplier_price.service_detail

            service_category = service_detail["type"]
            service_description = service_detail["sub_type"]

            service_type_detail = {"service_description": service_description,
                                   "service_category": service_category,
                                   "req_date": req_date,
                                   "quantity_units": quantity_units,
                                   "quantity": quantity,
                                   "price": price,
                                   "quantity_price": quantity_price,
                                   "price_units": "USD"}
            
            service_category_and_description_found = False
            for existing_service_detail in existing_service_details:
                if existing_service_detail["service_category"] == service_category and existing_service_detail["service_description"] == service_description:
                    existing_service_detail["quantity"] += quantity
                    existing_service_detail["quantity_price"] += quantity_price

                    service_category_and_description_found = True
                    break

            if not service_category_and_description_found:
                existing_service_details.append(service_type_detail)

        return existing_service_details


class PaymentTermSerializer(serializers.Serializer):

    def to_representation(self, instance):
        return {
            'unit': instance[0],
            'display': instance[1]
        }