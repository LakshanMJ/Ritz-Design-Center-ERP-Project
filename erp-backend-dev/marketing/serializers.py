from django.core.exceptions import ObjectDoesNotExist
from django.http import HttpResponse
from rest_framework.exceptions import ValidationError
from rest_framework.serializers import ModelSerializer
from rest_framework import serializers

from materials.serializers.material_serializers import EmbellishmentTypeSerializer, EmbellishmentSubTypeSerializer, PackListMaterialDetailSerializer, \
    DeliveryDateMaterialQuantityDetailSerializer, CustomerBrandMaterialBasicSerializer
from supplier_po.supplier_po.serializers import SupplierActualDeliveryDateSerializer
from materials.serializers.material_serializers import FabricColorToneSerializer
from shared.constants.global_constants import MODEL_DISPLAY_VALUE_KEY, MODEL_VALUE_KEY
from shared.utils import model_has_field, base64_encode_string
from supplier_po.supplier_po.serializers import SupplierDeliveryDateQuantitySerializer, SupplierDeliveryDateSerializer
from supplier_po.supplier_po_grn.serializers import SupplierPOGRNMaterialDetailSerializer, GRNBatchNumberShadeSerializer
from .models import *
from shared.serializers import *
from rest_framework import status
from materials.models import Unit as MaterialUnit
from rest_framework.generics import get_object_or_404
from shared.serializers import FileAttachmentSerializer
from shared.utils import calculate_queryset_total_amount_normalized_amount, get_amount_dictionary, get_attributes, calculate_queryset_total_normalized_quantity, get_quantity_dictionary
from shared.models import ActionTask, Approval
from shared.approvals.constants.task_descriptions import COSTING_SPEED_CONSUMPTION_DESCRIPTION
from materials.models import WarehouseMaterialTransfer
from shared.approvals.constants.task_entities import ORDER_COSTING_VERSION, SUPPLIER_PO_GRN_ENTITY
from shared.approvals.constants.approval_choices import BUSINESS_ADMIN_COSTING_APPROVER_APPROVAL, FINANCE_COSTING_APPROVER_APPROVAL
from rest_framework.validators import UniqueTogetherValidator
from shared.approvals.constants.approval_choices import GRN_APPROVAL
from rest_framework.generics import get_object_or_404


class ItemAttributeSerializer(ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)

    class Meta:
        model = ItemAttribute
        fields = ("__all__")


class ItemAttributeAssignTypeSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()

    class Meta:
        fields = ['id', 'name']


class OrderPackItemOtherPlacementSerializer(ModelSerializer):
    class Meta:
        model = OrderPlacement
        fields = ("__all__")


class OrderColorwaySerializer(ModelSerializer):
    colorway_count = serializers.CharField(source='order.number_of_colorways', required=False)

    class Meta:
        model = OrderColorway
        fields = '__all__'

    def validate(self, attrs):
        if self.instance == None:
            order = attrs['order']
            errors = {}
            colorway = attrs['colorway']
            if OrderColorway.objects.filter(order=order, colorway=colorway).exists():
                errors['colorway'] = 'Dupplicated Colorway'
                raise ValidationError(errors)
        return super().validate(attrs)


class OrderInquiryColorwayCountColorwaySerializer(ModelSerializer):
    colorways = OrderColorwaySerializer(source='ordercolorway_set', many=True, read_only=True)

    class Meta:
        model = OrderInquiry
        fields = ('number_of_colorways', 'colorways', )


class OrderCountrySerializer(ModelSerializer):
    name = serializers.CharField(source='country.name', read_only=True)

    class Meta:
        model = OrderCountry
        fields = '__all__'


class OrderPackFinancialCostSerializer(ModelSerializer):
    country_name = serializers.CharField(source='country.country', read_only=True)
    size_name = serializers.CharField(source='size.size.name', read_only=True)
    colorway_name = serializers.CharField(source='colorway.colorway', read_only=True)
    pack_items = serializers.SerializerMethodField(read_only=True)

    def get_pack_items(self, instance):
        pack_items = instance.get_pack_items()
        serializers = OrderPackItemFinacialCostSerializer(pack_items, many=True)
        return serializers.data

    class Meta:
        model = OrderPack
        fields = ('id', 'country_id', 'country_name', 'size_id', 'size_name', 'colorway_id', 'colorway_name', 'pack_items')


class OrderPackItemFinacialCostSerializer(ModelSerializer):
    item_name = serializers.CharField(source='item.item.name', read_only=True)
    fabric_finance_cost_percentage = serializers.DecimalField(read_only=True, decimal_places=6, max_digits=20)
    trim_finance_cost_percentage = serializers.DecimalField(read_only=True, decimal_places=6, max_digits=20)
    earnings_per_minute = serializers.DecimalField(read_only=True, decimal_places=6, max_digits=20)
    buyer_commission_percentage = serializers.DecimalField(read_only=True, decimal_places=6, max_digits=20)

    class Meta:
        model = OrderPackItem
        fields = ('id', 'item', 'item_name', 'fabric_finance_cost_percentage', 'trim_finance_cost_percentage', 'earnings_per_minute', 'buyer_commission_percentage', )


class OrderVersionBasicSerializer(ModelSerializer):
    approved = serializers.BooleanField(read_only=True)
    approved_date = serializers.DateField(read_only=True)
    costing_order_id = serializers.IntegerField(source='order.id', allow_null=True, read_only=True)
    costing_order_display_number = serializers.CharField(source='order.display_number', allow_null=True, read_only=True)
    customer_name = serializers.CharField(source='order.customer.name', allow_null=True, read_only=True)
    brand_name = serializers.CharField(source='order.brand.name', allow_null=True, read_only=True)
    version_state_display = serializers.CharField(source='get_version_state_display', allow_null=True, read_only=True)

    class Meta:
        model = OrderCostingVersion
        fields = ('id', 'display_number', 'long_code', 'short_code', 'costing_order_id', 'costing_order_display_number', 'version_state', 'approved', 'approved_date', 'customer_name', 'brand_name', 'version_state_display')


class OrderVersionSerializer(ModelSerializer):
    version_state = serializers.SerializerMethodField(read_only=True)
    approved = serializers.BooleanField(read_only=True)
    approved_date = serializers.DateField(read_only=True)
    expiration_date = serializers.DateField(read_only=True)
    fabric_finance_cost_percentage = serializers.DecimalField(read_only=True,decimal_places=6, max_digits=20)
    trim_finance_cost_percentage = serializers.DecimalField(read_only=True, decimal_places=6, max_digits=20)
    service_finance_cost_percentage = serializers.DecimalField(read_only=True, decimal_places=6, max_digits=20)
    earnings_per_minute = serializers.DecimalField(read_only=True, decimal_places=6, max_digits=20)
    buyer_commission_percentage = serializers.DecimalField(read_only=True, decimal_places=6, max_digits=20)
    pack_item_level_administrative_costs = serializers.BooleanField(read_only=True)
    packs = serializers.SerializerMethodField(read_only=True)
    lock_finance_editing  = serializers.BooleanField(read_only=True)
    attachments = FileAttachmentSerializer(read_only=True, many=True)
    approved_packing_instruction_id = serializers.SerializerMethodField(read_only=True)
    marketing_costing_id = serializers.IntegerField(source='marketing_costing.id', allow_null=True, read_only=True)
    marketing_costing_display_number = serializers.CharField(source='marketing_costing.display_number', allow_null=True, read_only=True)
    marketing_costing_order_id = serializers.IntegerField(source='marketing_costing.order.id', allow_null=True, read_only=True)
    marketing_costing_order_display_number = serializers.CharField(source='marketing_costing.order.display_number', allow_null=True, read_only=True)
    order_state = serializers.CharField(source='order.state', allow_null=True, read_only=True)
    approvals = serializers.SerializerMethodField(read_only=True)
    is_business_approval_created = serializers.SerializerMethodField(read_only=True)
    is_finance_approval_created = serializers.SerializerMethodField(read_only=True)

    def get_version_state(self, instance):
        data = {}
        if getattr(instance, 'version_state', None):
            data = {
                'value': instance.version_state,
                'display_value': instance.get_version_state_display()
            }
        return data
    
    def get_packs(self, instance):
        request = self.context.get('request')
        if request and request.method == 'GET':
            pack_items = instance.get_order_version_packs()
            serializers = OrderPackFinancialCostSerializer(pack_items, many=True)
            return serializers.data
        else:
            None

    def get_approved_packing_instruction_id(self, instance):
        approved_packing_instruction_id = None
        pack_packaging = get_object_or_none(PackPackaging,
            {
                'costing': instance,
                'current_version': True
            }
        )
        if pack_packaging:
            approved_packing_instruction_id = pack_packaging.id
        return approved_packing_instruction_id
    
    def get_approvals(self, instance):
        data = []
        approvals = Approval.objects.filter(entity__contains=[{"entity_id": instance.id, "entity_name": ORDER_COSTING_VERSION}], approval_name__in=[BUSINESS_ADMIN_COSTING_APPROVER_APPROVAL, FINANCE_COSTING_APPROVER_APPROVAL])
        for approval in approvals:
            data.append({
                'id': approval.id,
                'approval_name': approval.approval_name,
                'state': approval.action
            })
        return data
    
    def get_is_business_approval_created(self, instance):
        is_exists = Approval.objects.filter(entity__contains=[{"entity_id": instance.id, "entity_name": ORDER_COSTING_VERSION}], approval_name=BUSINESS_ADMIN_COSTING_APPROVER_APPROVAL).exists()
        return is_exists

    def get_is_finance_approval_created(self, instance):
        is_exists = Approval.objects.filter(entity__contains=[{"entity_id": instance.id, "entity_name": ORDER_COSTING_VERSION}], approval_name=FINANCE_COSTING_APPROVER_APPROVAL).exists()
        return is_exists

    class Meta:
        model = OrderCostingVersion
        fields = ('id', 'display_number', 'order', 'name', 'version', 'default_version', 'version_state', 'approved', 'approved_date', 'expiration_date', 'fabric_finance_cost_percentage',
                  'trim_finance_cost_percentage', 'service_finance_cost_percentage', 'earnings_per_minute', 'buyer_commission_percentage', 'pack_item_level_administrative_costs', 'packs', 'lock_finance_editing', 'attachments',
                  'watchlist', 'approved_packing_instruction_id', 'costing_type', 'get_costing_type_display',
                  'marketing_costing_id', 'marketing_costing_display_number', 'marketing_costing_order_id', 'marketing_costing_order_display_number', 'order_state', 'approvals', 'is_business_approval_created', 'is_finance_approval_created', 'average_pack_cost')
        read_only_fields = ('version', 'default_version', 'attachments', 'costing_type', 'get_costing_type_display', 'marketing_costing_id',
                            'marketing_costing_display_number', 'marketing_costing_order_id', 'marketing_costing_order_display_number', 'display_number', 'order_state', 'approvals', 'is_business_approval_created', 'is_finance_approval_created', 'average_pack_cost')


class OrderSizeSerializer(ModelSerializer):
    name = serializers.CharField(source='size.name', read_only=True)

    class Meta:
        model = OrderSize
        fields = '__all__'


class OrderSizeGroupSerializer(ModelSerializer):
    size_name = serializers.CharField(source='orderitem.size.size', read_only=True)
    order_sizes_details = OrderSizeSerializer(source='sizes', read_only=True, many=True)

    class Meta:
        model = OrderSizeGroup
        fields = '__all__'

    def validate(self, attrs):
        order = attrs['order']
        sizes = attrs['sizes']
        order_size_groups = OrderSizeGroup.objects.filter(order=order)
        if order_size_groups.exists():
            dupplicate = True
        else:
            dupplicate = False
        for order_size_group in order_size_groups:
            order_sizes = order_size_group.sizes.all()
            if order_sizes.count() == len(sizes):
                for size in order_sizes:
                    if not size in sizes:
                        dupplicate = False
                        break
                if dupplicate:
                    break
            else:
                dupplicate = False
        if dupplicate:
            errors = {}
            errors['sizes'] = 'Dupplicated Sizes'
            raise ValidationError(errors)

        return super().validate(attrs)


class OrderItemSerializer(ModelSerializer):
    name = serializers.CharField(source='item_display', read_only=True)
    quantity_per_pack = serializers.IntegerField(source='order.quantity_per_pack', read_only=False)
    attachment = FileAttachmentSerializer(source='image', read_only=True)

    def __init__(self, *args, **kwargs):
        self.quantity_per_pack_value = None
        if kwargs.get('data', None):
            self.quantity_per_pack_value = kwargs.get('data', {}).get('quantity_per_pack', None)
        super(OrderItemSerializer, self).__init__(*args, **kwargs)

    def handle_quantity_per_pack(self, instance, validated_data):
        order = instance.order
        if self.quantity_per_pack_value:
            order.quantity_per_pack = self.quantity_per_pack_value
        order.save()

    def create(self, validated_data):
        instance = super().create(validated_data)
        if instance:
            self.handle_quantity_per_pack(instance, validated_data)
        return instance

    def update(self, instance, validated_data):
        resp_instance = super().update(instance, validated_data)
        self.handle_quantity_per_pack(instance, validated_data)
        return resp_instance

    class Meta:
        model = OrderItem
        fields = '__all__'


##################### OrderPack ##################################
class OrderPackSerializer(ModelSerializer):
    country_name = serializers.CharField(source='country.country', read_only=True)
    size_name = serializers.CharField(source='size.size.name', read_only=True)
    colorway_name = serializers.CharField(source='colorway.colorway', read_only=True)
    label = serializers.CharField(source='get_pack_display', read_only=True)

    class Meta:
        model = OrderPack
        fields = '__all__'


class OrderPackItemReviewUpdateSerializer(ModelSerializer):
    class Meta:
        model = OrderPackItem
        fields = ['reviewed', ]


# class OrderColorwayCategoryTypeSerializer(ModelSerializer):
#     class Meta:
#         model = OrderColorwayCategoryType
#         fields = ('id', 'order_colorway_category', 'name',)
#
#     def validate(self, attrs):
#         if self.instance == None:
#             order_colorway_category = attrs['order_colorway_category']
#             type_count = order_colorway_category.type_count
#             errors = {}
#
#             if type_count:
#                 available_type_count = OrderColorwayCategoryType.objects.filter(
#                     order_colorway_category=order_colorway_category).count()
#                 if type_count <= available_type_count:
#                     errors['order_colorway_category'] = 'Order Colorway Category Type Count Exceeded'
#                     raise serializers.ValidationError(errors)
#             else:
#                 errors['order_colorway_category'] = 'Order Colorway Category Type Count Not Defined'
#                 raise serializers.ValidationError(errors)
#         return super().validate(attrs)


# class OrderColorwayCategorySerializer(ModelSerializer):
#     types = OrderColorwayCategoryTypeSerializer(source='ordercolorwaycategorytype_set', read_only=True, many=True)
#     name = serializers.CharField(source='colorway_category.name', read_only=True)
#
#     class Meta:
#         model = OrderColorwayCategory
#         fields = ('id', 'order', 'colorway_category', 'types', 'name', 'type_count')


class ColorwayItemTypeSerializer(ModelSerializer):
    colorway_category_display = serializers.CharField(source='colorway_category.name', read_only=True)
    meta_item_id = serializers.CharField(source='item.item_id', read_only=True)
    item_name = serializers.CharField(source='item.item.name', read_only=True)
    colorway_name = serializers.CharField(source='colorway.colorway', read_only=True)
    item_identifier = serializers.CharField(source='item.item_identifier', read_only=True)
    attachment = FileAttachmentSerializer(source='image', read_only=True)

    class Meta:
        model = ColorwayItemType
        fields = ('id', 'item', 'colorway', 'colorway_name', 'colorway_category', 'colorway_category_display', 'meta_item_id', 'item_name', 'item_identifier', 'attachment')


class OrderInquirySerializer(ModelSerializer):
    items = OrderItemSerializer(source='orderitem_set', read_only=True, many=True)
    countries = OrderCountrySerializer(source='ordercountry_set', read_only=True, many=True)
    colorways = OrderColorwaySerializer(source='ordercolorway_set', read_only=True, many=True)
    sizes = OrderSizeSerializer(source='ordersize_set', read_only=True, many=True)
    # colorway_categories = OrderColorwayCategorySerializer(source='ordercolorwaycategory_set', read_only=True, many=True)
    colorway_item_types = serializers.SerializerMethodField()
    versions = OrderVersionSerializer(source='ordercostingversion_set', read_only=True, many=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    # size_group = serializers.SerializerMethodField(read_only=True)
    unique_colorway_categories = serializers.SerializerMethodField()
    unique_items = serializers.SerializerMethodField()
    display_number = serializers.SerializerMethodField(read_only=True)
    copied_from_id = serializers.IntegerField(read_only=True)
    season_name = serializers.CharField(source='season.name', read_only=True)
    tech_packs = serializers.SerializerMethodField()

    def validate(self, data):
        validate = self.context['request'].data.get('validate')
        errors = {}
        if validate == "True":
            for field in self.context['request'].data.get('validation_fields'):
                if field == "customer":
                    if data['customer'] is None or data['customer'] == "":
                        errors[field] = "Customer is required"
                elif field == "brand":
                    if data['brand'] is None or data['brand'] == "":
                        errors[field] = "Brand is required"
                elif field == "season":
                    if data['season'] is None or data['season'] == "":
                        errors[field] = "Season is required"
                elif field == "pack_type":
                    if data['pack_type'] is None or data['pack_type'] == "":
                        errors[field] = "Pack Type is required"
                elif field == "quantity_per_pack":
                    if data['quantity_per_pack'] is None or data['quantity_per_pack'] == "":
                        errors[field] = "Quantity for Pack is required"
                elif field == "style_number":
                    if data['style_number'] is None or data['style_number'] == "":
                        errors[field] = "Style Number is required"
                elif field == "style_description":
                    if data['style_description'] is None or data['style_description'] == "":
                        errors[field] = "Style Description is required"
                elif field == "department":
                    if data['department'] is None or data['department'] == "":
                        errors[field] = "Department is required"

            if errors:
                raise serializers.ValidationError(errors)
        return data
    
    def get_display_number(self, obj):
        return obj.display_number

    def get_colorway_item_types(self, obj):
        colorway_item_types = ColorwayItemType.objects.filter(item__order=obj)
        serializer = ColorwayItemTypeSerializer(colorway_item_types, many=True, read_only=True).data
        return serializer
    
    def get_unique_colorway_categories(self, obj):
        colorway_categories_ids = ColorwayItemType.objects.filter(item__order=obj).values_list('colorway_category', flat=True)
        colorway_categories = ColorwayCategory.objects.filter(id__in=colorway_categories_ids)
        serializer = ColorwayCategorySerializer(colorway_categories, many=True, read_only=True).data
        return serializer

    def get_unique_items(self, obj):
        item_ids = obj.get_order_items().values_list('item_id', flat=True)
        items = Item.objects.filter(id__in=item_ids)
        serializer = ItemSerializer(items, many=True, read_only=True).data
        return serializer
    
    def get_tech_packs(self, instance):
        data = []
        tech_packs = instance.tech_packs.all()
        for tech_pack in tech_packs:
            data.append(tech_pack.get_object_data())
        return data
    class Meta:
        model = OrderInquiry
        fields = ('id', 'display_number', 'active', 'date', 'year', 'pack_type', 'costing_method', 'size_category', 'number_of_colorways',
                  'quantity_per_pack', 'style_number', 'style_description', 'customer', 'season', 'brand', 'department', 'items',
                  'pattern_type', 'countries', 'colorways', 'sizes', 'colorway_item_types',
                  'state', 'versions', 'customer_name', 'brand_name', 'order_program_id', 'unique_colorway_categories', 'unique_items', 'copied_from_id', 'season_name', 'tech_packs')


class OrderVersionOrderInquirySerializer(ModelSerializer):
    version_state = serializers.SerializerMethodField()
    order_inquiry = OrderInquirySerializer(source='order')
    display_number = serializers.SerializerMethodField(read_only=True)

    def get_display_number(self, instance):
        return instance.display_number

    def get_version_state(self, instance):
        data = {
            'value': instance.version_state,
            'display_value': instance.get_version_state_display()
        }
        return data

    class Meta:
        model = OrderCostingVersion
        fields = ('id', 'order', 'name', 'version', 'display_number', 'default_version', 'version_state', 'order_inquiry',)
        read_only_fields = ('version', 'default_version',)


class OrderInquirySizeSerializer(ModelSerializer):
    sizes = OrderSizeSerializer(source='ordersize_set', read_only=True, many=True)

    class Meta:
        model = OrderInquiry
        fields = ('id', 'costing_method', 'size_category', 'sizes')


class UnitSerializer(ModelSerializer):
    class Meta:
        model = Unit
        fields = '__all__'


class DetailedOrderInquirySerializer(ModelSerializer):
    customer = CustomerSerializer(read_only=True)
    brand = BrandSerializer(read_only=True)
    pack_type = serializers.SerializerMethodField()
    pack_type_id = serializers.SerializerMethodField()
    latest_version_id = serializers.SerializerMethodField()
    state = serializers.SerializerMethodField()
    costing_versions = serializers.SerializerMethodField(read_only=True)
    order_program_display_number = serializers.SerializerMethodField(read_only=True)
    costing_type = serializers.CharField(read_only=True)
    costing_type_display = serializers.CharField(read_only=True)

    class Meta:
        model = OrderInquiry
        fields = ['id', 'display_number', 'short_code', 'long_code', 'date', 'season', 'year', 'pack_type_id', 'pack_type', 'costing_method', 'size_category', 'costing_type', 'costing_type_display',
                  'number_of_colorways', 'quantity_per_pack', 'style_number', 'style_description', 'customer_id',
                  'customer', 'brand_id', 'brand', 'items', 'costing_versions', 'latest_version_id', 'state', 'order_program', 'order_program_display_number', 'ritz_code']

    def get_order_program_display_number(self, instance):
        return instance.order_program.display_number if instance.order_program else None

    def get_costing_versions(self, instance):
        version_data = []
        for version in instance.ordercostingversion_set.all():
            version_data.append({
                'id': version.id,
                'display_number': version.display_number
            })
        return version_data
    
    def get_state(self, instance):
        data = {
            'value': instance.state,
            'display_value': instance.get_state_display()
        }
        return data

    def get_latest_version_id(self, instance):
        latest_version_id = None
        latest_version = instance.get_order_versions().order_by('created')
        if latest_version.exists():
            latest_version_id = latest_version[0].pk
        return latest_version_id

    def get_pack_type(self, obj):
        if obj.pack_type == None:
            return {
                'id': None,
                'value': None,
            }
        else:
            return {
                'id': obj.pack_type,
                'value': obj.get_pack_type_display(),
            }

    def get_pack_type_id(self, obj):
        return obj.pack_type

    def validate(self, params):
        if params['pack_type'] != None and params['pack_type'] not in [pack_type[0] for pack_type in
                                                                       OrderInquiry.TYPE_CHOICES]:
            raise serializers.ValidationError({"error": "Pack type not match"})
        return params

    def to_internal_value(self, data):
        pack_type = data.pop('pack_type_id', None)
        brand_id = data.pop('brand_id', None)
        customer_id = data.pop('customer_id', None)
        validated_data = super().to_internal_value(data)
        validated_data['pack_type'] = pack_type
        validated_data['brand_id'] = brand_id
        validated_data['customer_id'] = customer_id
        return validated_data


class OrderPackPlacementSerializer(ModelSerializer):
    placement_name = serializers.CharField(source='item_attribute_other.name')
    colorway_id = serializers.IntegerField(source='order_pack.colorway_id')
    colorway = serializers.CharField(source='order_pack.colorway.colorway')
    country_id = serializers.IntegerField(source='order_pack.country_id')
    country = serializers.CharField(source='order_pack.country.country.name')
    size_id = serializers.IntegerField(source='order_pack.size_id')
    size = serializers.CharField(source='order_pack.size.size.name')
    label = serializers.SerializerMethodField(read_only=True)

    def get_label(self, instance):
        label = '%s - %s' % (
            instance.order_pack.get_pack_display(),
            instance.item_attribute_other.name
        )
        return label

    class Meta:
        model = OrderPackPlacement
        fields = '__all__'


class OrderPackItemPlacementSerializer(ModelSerializer):
    placement_name = serializers.CharField(source='item_attribute_other.name')
    colorway_id = serializers.IntegerField(source='order_pack_item.pack.colorway_id')
    colorway = serializers.CharField(source='order_pack_item.pack.colorway.colorway')
    country_id = serializers.IntegerField(source='order_pack_item.pack.country_id')
    country = serializers.CharField(source='order_pack_item.pack.country.country.name')
    size_id = serializers.IntegerField(source='order_pack_item.pack.size_id')
    size = serializers.CharField(source='order_pack_item.pack.size.size.name')
    item_display = serializers.CharField(source='order_pack_item.item.item_display')
    label = serializers.SerializerMethodField(read_only=True)
    order_item_id = serializers.IntegerField(source='order_pack_item.item_id')
    item_id = serializers.IntegerField(source='order_pack_item.item.item_id')
    colorway_category_id = serializers.IntegerField(source='order_pack_item.get_order_pack_item_colorway_type.colorway_category.id')

    def get_label(self, instance):
        label = '%s - %s' % (
            instance.order_pack_item.get_pack_item_display(),
            instance.item_attribute_other.name,
        )
        return label

    class Meta:
        model = OrderPackItemPlacement
        fields = '__all__'


class OrderPackItemPlacementPatternSerializer(ModelSerializer):
    class Meta:
        model = OrderPackItemPlacementPattern
        fields = '__all__'


class OrderColorwayNavigationSerializer(ModelSerializer):
    name = serializers.CharField(source='colorway')

    class Meta:
        model = OrderColorway
        fields = ['id', 'name']


class OrderPackSizeGroupSerializer(serializers.ModelSerializer):
    order_colorway = OrderColorwayNavigationSerializer(source='colorway')
    order_country = OrderCountrySerializer(source='country')
    order_sizes = serializers.SerializerMethodField(source='size_group')

    class Meta:
        model = OrderPackSizeGroup
        fields = ['id', 'order_colorway', 'order_country', 'order_sizes', 'size_group_id']

    def get_order_sizes(self, obj):
        sizes = obj.size_group.sizes.all()
        data = [{'id': size.id,
                 'name': size.size.name,
                 'abbreviation': size.size.abbreviation,
                 } for size in sizes]
        return data


class OrderPackItemSerializer(serializers.ModelSerializer):
    pack_id = serializers.IntegerField(source='pack.id')
    item_name = serializers.CharField(source='item.item.name')
    item_item_id = serializers.IntegerField(source='item.item_id')
    colorway_id = serializers.IntegerField(source='pack.colorway_id')
    colorway_name = serializers.CharField(source='pack.colorway.colorway')
    colorway_category = serializers.SerializerMethodField()
    colorway_category_id = serializers.SerializerMethodField()
    country_id = serializers.IntegerField(source='pack.country_id')
    country_name = serializers.CharField(source='pack.country.country')
    size_id = serializers.IntegerField(source='pack.size_id')
    size_name = serializers.CharField(source='pack.size.size.name')
    item_identifier = serializers.IntegerField(source='item.item_identifier', read_only=True)
    item_display = serializers.CharField(source='item.item_display', read_only=True)
    label = serializers.CharField(source='get_pack_item_display', read_only=True)

    def get_colorway_category(self, order_pack_item):
        try:
            colorway_item_type = ColorwayItemType.objects.get(item=order_pack_item.item,
                                                              colorway=order_pack_item.pack.colorway)
            return colorway_item_type.colorway_category.name
        except ColorwayItemType.DoesNotExist:
            return None

    def get_colorway_category_id(self, order_pack_item):
        try:
            colorway_item_type = ColorwayItemType.objects.get(item=order_pack_item.item,
                                                              colorway=order_pack_item.pack.colorway)
            return colorway_item_type.colorway_category.id
        except ColorwayItemType.DoesNotExist:
            return None

    class Meta:
        model = OrderPackItem
        fields = ('pack_id', 'item_id', 'item_item_id', 'item_name', 'colorway_id', 'colorway_name', 'colorway_category_id',
                  'colorway_category', 'country_id', 'country_name', 'size_id', 'size_name', 'id', 'reviewed',
                  'item_identifier', 'item_display', 'label')


class OrderItemSizeGroupPacksSerializer(serializers.Serializer):
    items = OrderItemSerializer(read_only=True, many=True)
    order_pack_size_groups = OrderPackSizeGroupSerializer(many=True)
    order_pack_items = OrderPackItemSerializer(many=True)
    order_packs = OrderPackSerializer(many=True)
    item_colorway_categories = serializers.DictField()


    class Meta:
        fields = ['items', 'order_pack_size_groups', 'order_pack_items', 'item_colorway_categories']


# class CompositionSerializer(serializers.ModelSerializer):
#     type_details = serializers.SerializerMethodField(read_only=True)
#
#     class Meta:
#         model = Composition
#         fields = ['id', 'name', 'type', 'type_details', 'active']
#
#     def get_type_details(self, obj):
#         if obj.type is None:
#             return None
#         else:
#             return obj.get_type_display()


# class FabricTextureSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = FabricTexture
#         fields = '__all__'


class MaterialTypeSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    estimated_consumption_ratio_units = serializers.CharField()

    class Meta:
        fields = ['id', 'name', 'estimated_consumption_ratio_units']


class GenericMetaOptionSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()

    class Meta:
        fields = ['id', 'name']


class MaterialUnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaterialUnit
        fields = ['id', 'name']


# class OrderMaterialSerializer(serializers.ModelSerializer):

#     class Meta:
#         model = OrderMaterial
#         fields = '__all__'


# class OrderMaterialDetailSerializer(serializers.ModelSerializer):
#     material_type = serializers.SerializerMethodField()
#     class Meta:
#         model = OrderMaterial
#         fields = '__all__'

#     def get_material_type(self, obj):
#         data={}
#         if obj.material.type == 'user_defined_material':
#             user_defined_material = obj.material.get_attributes()
#             print(user_defined_material)
#         return data


class PurchaseOrderSerializer(ModelSerializer):
    purchase_order_excel_name = serializers.SerializerMethodField(read_only=True)
    purchase_order_pdf_name = serializers.SerializerMethodField(read_only=True)
    purchase_order_excel_path = serializers.SerializerMethodField(read_only=True)
    purchase_order_pdf_path = serializers.SerializerMethodField(read_only=True)
    order_id = serializers.IntegerField(source='costing_version.order.id', read_only=True)
    customer_name = serializers.CharField(source='costing_version.order.customer.name', read_only=True)
    brand_name = serializers.CharField(source='costing_version.order.brand.name', read_only=True)
    version_name = serializers.CharField(source='costing_version.name', read_only=True)
    state = serializers.SerializerMethodField(read_only=True)
    display_number = serializers.SerializerMethodField(read_only=True)
    short_code = serializers.SerializerMethodField(read_only=True)
    long_code = serializers.SerializerMethodField(read_only=True)
    order_inquiry = serializers.SerializerMethodField(read_only=True)
    po_club = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = '__all__'

    def get_po_club(self, obj):
        data = {
            'display_number': obj.actual_po_club.display_number,
            'id': obj.actual_po_club.id
        }
        return data
    
    def get_order_inquiry(self, obj):
        display_number = None
        if obj.costing_version:
            display_number = obj.costing_version.display_number
        data = {
            'display_number': display_number,
            'id': obj.costing_version_id
        }
        return data

    def get_display_number(self, obj):
        return obj.display_number
    
    def get_short_code(self, obj):
        return obj.short_code
    
    def get_long_code(self, obj):
        return obj.long_code

    def get_purchase_order_excel_name(self, obj):
        display_name = obj.uploaded_purchase_order.attachment.display_name

    def get_purchase_order_pdf_name(self, obj):
        display_name = obj.uploaded_purchase_order.attachment.display_name
        return display_name if display_name else "N/A"

    def get_purchase_order_excel_path(self, obj):
        display_name = obj.uploaded_purchase_order.attachment.file_path
        return display_name if display_name else "N/A"

    def get_purchase_order_pdf_path(self, obj):
        display_name = obj.uploaded_purchase_order.attachment.file_path
        return display_name if display_name else "N/A"

    def get_state(self, instance):
        data = {
            'value': instance.state,
            'display_value': instance.get_state_display()
        }
        return data


class POColorwaySerializer(ModelSerializer):
    po_colorway_id = serializers.IntegerField(source='pk', read_only=True)
    po_colorway_name = serializers.CharField(source='colorway', read_only=True)
    order_colorway_id = serializers.IntegerField(source='order_colorway.id', read_only=True)
    order_colorway_name = serializers.CharField(source='order_colorway.colorway', read_only=True)

    class Meta:
        model = POColorway
        fields = '__all__'


class POCountrySerializer(ModelSerializer):
    po_country_id = serializers.IntegerField(source='pk', read_only=True)
    order_country_id = serializers.IntegerField(source='order_country.id', read_only=True)
    order_country_name = serializers.CharField(source='order_country.country.name', read_only=True)

    class Meta:
        model = POCountry
        fields = '__all__'


class POSizeSerializer(ModelSerializer):
    po_size_id = serializers.IntegerField(source='pk', read_only=True)
    order_size_id = serializers.IntegerField(source='order_size.id', read_only=True)
    order_size_name = serializers.CharField(source='order_size.size.name', read_only=True)

    class Meta:
        model = POSize
        fields = '__all__'


class POInformationListSerializer(ModelSerializer):
    country_size = serializers.SerializerMethodField()
    colorway_name = serializers.CharField(source='colorway')
    po_colorway_id = serializers.IntegerField(source='pk')
    order_colorway_id = serializers.IntegerField(source='order_colorway.id')

    class Meta:
        model = POColorway
        fields = '__all__'

    def get_country_size(self, po_colorway):
        return [{'order_country_id': po_pack.po_country.order_country.id,
                 'order_size_id': po_pack.po_size.order_size.id,
                 'quantity': po_pack.quantity} for po_pack in POPack.objects.filter(po_colorway=po_colorway)]


class POPackSerializer(ModelSerializer):
    po_colorway = serializers.SerializerMethodField()
    po_size = serializers.SerializerMethodField()
    po_country = serializers.SerializerMethodField()
    pre_costing_order_pack_id = serializers.SerializerMethodField()
    marketing_costing_order_pack_id = serializers.SerializerMethodField()
    marketing_costing_version_id = serializers.SerializerMethodField()
    marketing_costing_version_order_id = serializers.SerializerMethodField()

    def get_po_colorway(self, instance):
        data = {
            'po_colorway_id': instance.po_colorway_id,
            'po_colorway_name': instance.po_colorway.colorway,
            'order_colorway_name': instance.po_colorway.order_colorway.colorway if instance.po_colorway.order_colorway else '',
            'display_colorway': '%s (%s)' % (instance.po_colorway.order_colorway.colorway,
                                             instance.po_colorway.colorway) if instance.po_colorway.order_colorway else instance.po_colorway.colorway,
            'order_colorway_id': instance.po_colorway.order_colorway_id,
        }
        return data

    def get_po_size(self, instance):
        data = {
            'po_size_id': instance.po_size_id,
            'po_size_name': instance.po_size.po_size_name,
            'order_size_name': instance.po_size.order_size.size.name if instance.po_size.order_size else '',
            'order_size_abbreviation': instance.po_size.order_size.size.abbreviation if instance.po_size.order_size else '',
            'display_size': '%s (%s)' % (instance.po_size.order_size.size.abbreviation,
                                         instance.po_size.po_size_name) if instance.po_size.order_size else instance.po_size.po_size_name,
            'order_size_id': instance.po_size.order_size_id,
        }
        return data

    def get_po_country(self, instance):
        data = {
            'po_country_id': instance.po_country_id,
            'po_country_name': instance.po_country.po_country_name,
            'order_country_name': instance.po_country.order_country.country.name if instance.po_country.order_country else '',
            'display_country': '%s (%s)' % (instance.po_country.order_country.country.name,
                                            instance.po_country.po_country_name) if instance.po_country.order_country else instance.po_country.po_country_name,
            'order_country_id': instance.po_country.order_country_id,
        }
        return data

    def get_pre_costing_order_pack_id(self, instance):
        id = None
        if instance.purchase_order.marketing_costing:
            if instance.order_pack:
                id = instance.order_pack.id
        return id

    def get_marketing_costing_order_pack_id(self, instance):
        id = None
        if instance.purchase_order.marketing_costing:
            if instance.order_pack:
                if instance.order_pack.copied_from:
                    id = instance.order_pack.copied_from.id
        return id
    
    def get_marketing_costing_version_id(self, instance):
        marketing_costing_version_id = None
        if instance.purchase_order.marketing_costing:
            marketing_costing_version_id = instance.purchase_order.marketing_costing.id 
        return marketing_costing_version_id
    
    def get_marketing_costing_version_order_id(self, instance):
        marketing_costing_version_order_id = None
        if instance.purchase_order.marketing_costing:
            marketing_costing_version_order_id = instance.purchase_order.marketing_costing.order.id 
        return marketing_costing_version_order_id

    class Meta:
        model = POPack
        fields = '__all__'


class ItemVariationOperationSerializer(ModelSerializer):
    machine_type = serializers.PrimaryKeyRelatedField(queryset=MachineType.objects.all(), required=True, allow_null=False)
    costing_smv = serializers.DecimalField(decimal_places=4, max_digits=8, required=True)
    file_details = serializers.CharField(source='video.file_path', read_only=True)
    display_name = serializers.CharField(source='video.display_name', read_only=True)
    item = serializers.CharField(source='variation.item.id', read_only=True)
    machine_type_name = serializers.CharField(source = 'machine_type.name', read_only=True)
    machine_type_short_name = serializers.CharField(source = 'machine_type.short_name', read_only=True)
    folder_type_name = serializers.CharField(source = 'folder_type.name', read_only=True)

    class Meta:
        model = ItemVariationOperation
        fields = '__all__'
        validators = [
            UniqueTogetherValidator(
                queryset=ItemVariationOperation.objects.all(),
                fields=['variation', 'operation_name']
            )
        ]

class ItemVariationOperationDisplayOrderSerializer(ModelSerializer):

    class Meta:
        model = ItemVariationOperation
        fields = ('id', 'display_order')



class ItemVariationSerializer(ModelSerializer):
    operations = ItemVariationOperationSerializer(source='itemvariationoperation_set', many=True, read_only=True)
    total_costed_smv = serializers.SerializerMethodField(read_only=True)
    total_factory_smv = serializers.SerializerMethodField(read_only=True)

    def get_total_costed_smv(self, instance):
        return instance.get_total_costed_smv()

    def get_total_factory_smv(self, instance):
        return instance.get_total_factory_smv()
    
    class Meta:
        model = ItemVariation
        fields = '__all__'


# class OrderOtherSMVOperationSerializer(ModelSerializer):
#     file_details = serializers.CharField(source='video.file_path', read_only=True)
#     display_name = serializers.CharField(source='video.display_name', read_only=True)
#     operation_id = serializers.IntegerField(source = 'pk', read_only = True)
#
#     class Meta:
#         model = OrderOtherSMVOperation
#         fields = '__all__'


# class OrderPackItemOperationSerializer(ModelSerializer):
#
#     # other_operation = OrderOtherSMVOperationSerializer(source = 'orderothersmvoperation_set')
#
#     class Meta:
#         model = OrderPackItemOperation
#         fields = '__all__'


# class OrderOperationSerialiser(serializers.Serializer):
#
#     other_operations = OrderOtherSMVOperationSerializer(many = True)
#     operations = ItemVariationOperationSerializer(many = True)
#
#     class Meta:
#         fields = ['other_operations', 'operations']


class BomSerializer(ModelSerializer):
    po_colorway_name = serializers.CharField(source='po_colorway.colorway', read_only=True)
    material_details = serializers.SerializerMethodField(read_only=True)
    quantity_display_value = serializers.SerializerMethodField(read_only=True)
    supplier_name = serializers.CharField(source='supplier_inquiry_detail.supplier_inquiry.supplier.name', read_only=True)
    po_name = serializers.CharField(source='purchase_order.name', read_only=True)
    purchase_order_id = serializers.IntegerField(source='purchase_order.id', read_only=True)

    def get_material_details(self, instance):
        details = instance.material.get_customer_brand_material_details()
        return details

    def get_quantity_display_value(self, instance):
        display_value = None
        if instance.quantity:
            display_value = '%s %s' % (round(instance.quantity, 2), instance.get_measuring_unit_display())
        return display_value
    
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['quantity_display_value'] = '%s %s' % (round(self.context.get('quantity', instance.quantity), 2), instance.get_measuring_unit_display())
        return representation

    class Meta:
        model = PurchaseOrderBom
        fields = ['id', 'po_colorway_name', 'material_details', 'quantity', 'measuring_unit', 'supplier_name', 'quantity_display_value', 'po_name', 'order_quantity', 'purchase_order_id']


class POPackItemSerializer(serializers.ModelSerializer):

    class Meta:
        model = POPackItem
        fields = '__all__'


class ItemSerializer(ModelSerializer):
    customer_brand_name = serializers.CharField(source='customer_brand.brand.name', read_only=True)
    variations = ItemVariationSerializer(source='itemvariation_set', many=True, read_only=True)
    item_id = serializers.IntegerField(source='pk', read_only=True)
    item_customer_name_display = serializers.CharField(source='item_customer_name', read_only=True)
    class Meta:
        model = Item
        fields = ("__all__")

    def create(self, validated_data):
        item = super().create(validated_data)
        item.create_item_variations()
        return item
    
    def validate(self, attrs):
        errors = {}
        code = attrs.get('code', None)
        if self.instance:
            code_is_exist = Item.objects.exclude(id=self.instance.id).filter(code=code).exists()
        else:
            code_is_exist = Item.objects.filter(code=code).exists()
        if code_is_exist:
            errors["code"] = "Code cannot be duplicate."
        if errors:
            raise serializers.ValidationError(errors)
        attrs = super().validate(attrs)
        return attrs


class OrderItemColorwayOperationSerializer(ModelSerializer):
    file_details = serializers.CharField(source='video.file_path', read_only=True)
    display_name = serializers.CharField(source='video.display_name', read_only=True)
    item = serializers.IntegerField(source='colorway_item_category.item.id', read_only=True)
    machine_type_name = serializers.CharField(source='machine_type.name', read_only=True)
    machine_type_short_name = serializers.CharField(source='machine_type.short_name', read_only=True)
    folder_type_name = serializers.CharField(source='folder_type.name', read_only=True)
    variation_name = serializers.CharField(source='item_variation_operation.variation.variation_name', read_only=True)
    variation = serializers.IntegerField(source='item_variation_operation.variation.id', read_only=True)
    earnings_per_minute = serializers.SerializerMethodField(read_only=True)
    operation_cost = serializers.SerializerMethodField(read_only=True)

    def get_earnings_per_minute(self, instance):
        epm = instance.version.get_version_earnings_per_minute(self.order_pack_item)
        return epm

    def get_operation_cost(self, instance):
        cost = None
        epm = instance.version.get_version_earnings_per_minute(self.order_pack_item)

        if instance.costing_smv and epm:
            cost = instance.costing_smv * epm
        return cost

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.order_pack_item = self.context.get('order_pack_item', None)

    class Meta:
        model = OrderItemColorwayOperation
        fields = '__all__'


class POCountryColorwayItemPlacementSerializer(ModelSerializer):
    po_material_attributes = serializers.SerializerMethodField(read_only=True)
    costing_material_attributes = serializers.SerializerMethodField(read_only=True)
    material_type = serializers.SerializerMethodField()
    placement = serializers.SerializerMethodField()

    def get_placement(self, instance):
        if instance.item_attribute:
            placement_display = instance.item_attribute.placement
        else:
            placement_display = instance.item_attribute_other.name
        return placement_display

    def get_material_type(self, instance):
        if instance.item_attribute:
            material_type = instance.item_attribute.type
        else:
            material_type = instance.item_attribute_other.type
        return material_type

    def get_po_material_attributes(self, instance):
        return instance.po_material.get_attributes() if instance.po_material else None

    def get_costing_material_attributes(self, instance):
        return instance.costing_material.get_attributes()

    class Meta:
        model = POCountryColorwayItemPlacement
        fields = ('id', 'purchase_order_id', 'po_item_id', 'po_country_id', 'po_colorway_id', 'item_attribute_id',
                  'item_attribute_other_id', 'po_material_attributes', 'costing_material_attributes',
                  'material_type', 'placement'
                  )


class POCountryColorwayPlacementSerializer(ModelSerializer):
    po_material_attributes = serializers.SerializerMethodField(read_only=True)
    costing_material_attributes = serializers.SerializerMethodField(read_only=True)
    material_type = serializers.SerializerMethodField()
    placement = serializers.SerializerMethodField()

    def get_placement(self, instance):
        if instance.item_attribute:
            placement_display = instance.item_attribute.placement
        else:
            placement_display = instance.item_attribute_other.name
        return placement_display

    def get_material_type(self, instance):
        if instance.item_attribute:
            material_type = instance.item_attribute.type
        else:
            material_type = instance.item_attribute_other.type
        return material_type

    def get_po_material_attributes(self, instance):
        return instance.po_material.get_attributes() if instance.po_material else None

    def get_costing_material_attributes(self, instance):
        return instance.costing_material.get_attributes()

    class Meta:
        model = POCountryColorwayPlacement
        fields = ('id', 'purchase_order_id', 'po_country_id', 'po_colorway_id', 'item_attribute_other_id',
                  'po_material_attributes', 'costing_material_attributes', 'material_type', 'placement')


class OrderVersionListByOperationsStautsSerializer(ModelSerializer):
    customer = serializers.ReadOnlyField(source='order.customer.name')
    brand = serializers.ReadOnlyField(source='order.brand.name')
    style = serializers.ReadOnlyField(source='order.style_number')

    class Meta:
        model = OrderCostingVersion
        fields = ['id', 'order_id', 'version', 'default_version', 'name', 'customer', 'brand', 'style', 'operations_completed']


class OrderVersionColorwaySerializer(ModelSerializer):

    class Meta:
        model = OrderVersionColorwayCountry
        fields = '__all__'


class OtherCostTypeSerializer(ModelSerializer):

    class Meta:
        model = OtherCostType
        fields = '__all__'


class OrderPackOtherCostSerializer(ModelSerializer):

    class Meta:
        model = OrderPackOtherCost
        fields = '__all__'


class WashServiceSerializer(ModelSerializer):
    supplier_inquiry_details = serializers.SerializerMethodField()
    attachment_display_name = serializers.CharField(source='wash_service_attachment.display_name' ,read_only=True)
    attachment_file_path = serializers.CharField(source='wash_service_attachment.file_path',read_only=True)

    def get_supplier_inquiry_details(self, instance):
        return instance.get_service_suppliers()

    class Meta:
        model = PackItemWashService
        fields = '__all__'


class OrderInquiryProgramSerializer(ModelSerializer):
    display_number = serializers.SerializerMethodField(read_only=True)

    def get_display_number(self, instance):
        return instance.display_number

    class Meta:
        model = OrderInquiryProgram
        fields = '__all__'


class PackItemEmbellishmentServiceSerializer(serializers.ModelSerializer):
    order_size_id = serializers.IntegerField(source='pack_item.pack.size_id', read_only=True)
    attachment_display_name = serializers.CharField(source='pack_item_embellishment_attachment.display_name' ,read_only=True)
    attachment_file_path = serializers.CharField(source='pack_item_embellishment_attachment.file_path',read_only=True)

    class Meta:
        model = PackItemEmbellishmentService
        fields = '__all__'


class EmbellishmentServiceDetailSerializer(serializers.ModelSerializer):
    type = serializers.IntegerField(source='sub_type.embellishment_type.id', read_only=True)
    sizes = serializers.SerializerMethodField(read_only=True)
    attachment_display_name = serializers.CharField(source='embellishment_attachment.display_name' ,read_only=True)
    attachment_file_path = serializers.CharField(source='embellishment_attachment.file_path',read_only=True)
    
    class Meta:
        model = EmbellishmentServiceDetail
        fields = '__all__'

    def get_sizes(self, instance):
        pack_item_embellishment_services = instance.packitemembellishmentservice_set
        serializer = PackItemEmbellishmentServiceSerializer(pack_item_embellishment_services, many=True).data
        return serializer


class FlatPackItemEmbellishmentServiceSerializer(serializers.ModelSerializer):
    type = serializers.CharField(source='embellishment_detail.sub_type.embellishment_type.name', read_only=True)
    sub_type = EmbellishmentSubTypeSerializer(source='embellishment_detail.sub_type', read_only=True)
    grading = serializers.BooleanField(source='embellishment_detail.grading', read_only=True)
    embellishment_attachment = FileAttachmentSerializer(source='pack_item_embellishment_attachment', read_only=True)
    supplier_inquiry_details = serializers.SerializerMethodField()

    def get_supplier_inquiry_details(self, instance):
        inquiries = instance.pack_item.pack.version.get_version_supplier_inquiries().filter(item_service=instance)
        data = []

        for inquiry in inquiries:
            inquiry_details = inquiry.supplierinquirydetail_set.filter(completed=True)
            for inquiry_detail in inquiry_details:
                data.append(inquiry_detail.get_attributes())
        return data

    class Meta:
        model = PackItemEmbellishmentService
        fields = '__all__'


class OrderVersionSupplierInquiryCompleteStatusSerializer(ModelSerializer):

    class Meta:
        model = OrderCostingVersion
        fields = ('id', 'supplier_inquiries_complete',)


class PurchaseOrderBasicSerializer(ModelSerializer):
    customer_name = serializers.CharField(source='costing_version.order.customer.name', read_only=True)
    brand_name = serializers.CharField(source='costing_version.order.brand.name', read_only=True)
    version_name = serializers.CharField(source='costing_version.name', read_only=True)
    order_inquiry_id = serializers.IntegerField(source= 'costing_version.order.id', read_only=True)
    version_id = serializers.IntegerField(source= 'costing_version.id', read_only=True)
    state = serializers.SerializerMethodField(read_only=True)
    display_number = serializers.SerializerMethodField(read_only=True)
    uploaded_purchase_order_detail = FileAttachmentSerializer(source='uploaded_purchase_order.attachment', read_only=True)
    order_inquiry = serializers.SerializerMethodField(read_only=True)
    marketing_costing_id = serializers.IntegerField(source='marketing_costing.id', allow_null=True)
    marketing_costing_display_number = serializers.CharField(source='marketing_costing.display_number', allow_null=True)
    marketing_costing_order = serializers.IntegerField(source='marketing_costing.order.id', allow_null=True)

    def get_order_inquiry(self, instance):
        display_number = 'N/A'
        if instance.costing_version:
            display_number = instance.costing_version.display_number
        data = {
            'display_number': display_number,
            'id': instance.costing_version_id
        }
        return data
    
    def get_display_number(self, instance):
        return instance.display_number

    def get_state(self, instance):
        data = {
            'value': instance.state,
            'display_value': instance.get_state_display()
        }
        return data

    class Meta:
        model = PurchaseOrder
        fields = ('id', 'name', 'uploaded_purchase_order', 'uploaded_purchase_order_detail',
                  'created', 'updated', 'customer_name', 'brand_name', 'version_name', 'order_inquiry_id', 'order_inquiry', 'version_id',
                   'marketing_costing_id', 'marketing_costing_display_number', 'marketing_costing_order', 'state', 'display_number')


class OriginalPOClubSerializer(ModelSerializer):
    purchaseorder_set = PurchaseOrderBasicSerializer(many=True, read_only=True)

    class Meta:
        model = OriginalPOClub
        fields = '__all__'


class ActualPOClubMinimalSerializer(ModelSerializer):

    class Meta:
        model = ActualPOClub
        fields = ('id', 'display_number')


class ActualPOClubBasicSerializer(ModelSerializer):
    po_club_display_number = serializers.CharField(source='po_club.display_number')
    display_number = serializers.SerializerMethodField()
    fob_total_value = serializers.SerializerMethodField()
    supplier_po_raw_material_total_cost = serializers.SerializerMethodField()
    fob_presentage = serializers.SerializerMethodField()
    max_pcl_value = serializers.SerializerMethodField()
    pcl_available_amount = serializers.SerializerMethodField()
    pcl_used_amount = serializers.SerializerMethodField()
    
    def get_fob_total_value(self, instance):
        fob_total_value = instance.po_club.get_fob_total_value()
        data = get_amount_dictionary(fob_total_value)
        return data
    
    def get_supplier_po_raw_material_total_cost(self, instance):
        supplier_po_raw_material_total_cost = instance.po_club.get_supplier_po_raw_material_total_cost()
        data = get_amount_dictionary(supplier_po_raw_material_total_cost)
        return data
    
    def get_supplier_po_raw_material_total_paid(self, instance):
        supplier_po_raw_material_total_paid = instance.po_club.get_supplier_po_raw_material_total_paid()
        data = get_amount_dictionary(supplier_po_raw_material_total_paid)
        return data
    
    def get_fob_presentage(self, instance):
        precentage = instance.po_club.material_fob_presentage
        return precentage
    
    def get_max_pcl_value(self, instance):
        max_pcl_value = instance.po_club.get_max_pcl_value()
        data = get_amount_dictionary(round(max_pcl_value,2))
        return data
    
    def get_pcl_available_amount(self, instance):
        pcl_available_amount = instance.po_club.get_pcl_available_value()
        data = get_amount_dictionary(pcl_available_amount)
        return data
    
    def get_pcl_used_amount(self, instance):
        max_pcl_value = instance.po_club.get_pcl_used_value()
        data = get_amount_dictionary(round(max_pcl_value,2))
        return data
    
    def get_display_number(self, instance):
        return '%s' % (instance.display_number)

    class Meta:
        model = PCLBankInformation
        fields = ('id', 'display_number', 'po_club_display_number', 'fob_total_value', 'supplier_po_raw_material_total_cost', 'fob_presentage', 'max_pcl_value', 'pcl_available_amount', 'pcl_used_amount')


class ActualPOClubBasicSerializerV2(ModelSerializer):

    class Meta:
        model = PCLBankInformation
        fields = ('id', 'display_number', )


class ActualPOClubSerializer(ModelSerializer):
    purchaseorder_set = PurchaseOrderBasicSerializer(many=True, read_only=True)
    state = serializers.SerializerMethodField(read_only=True)
    display_number = serializers.SerializerMethodField(read_only=True)
    short_code = serializers.SerializerMethodField(read_only=True)
    long_code = serializers.SerializerMethodField(read_only=True)
    general_po_id = serializers.SerializerMethodField()
    order_inquiry_id = serializers.SerializerMethodField(read_only=True)
    version_id = serializers.SerializerMethodField(read_only=True)
    costing_type = serializers.SerializerMethodField()
    marketing_costing_id = serializers.SerializerMethodField()
    marketing_costing_display_number = serializers.SerializerMethodField()
    marketing_costing_order = serializers.SerializerMethodField()
    pre_costing_id = serializers.IntegerField(source='pre_costing.id', allow_null=True)
    pre_costing_display_number = serializers.CharField(source='pre_costing.display_number', allow_null=True)
    pre_costing_short_code = serializers.CharField(source='pre_costing.short_code', allow_null=True)
    pre_costing_long_code = serializers.CharField(source='pre_costing.long_code', allow_null=True)
    pre_costing_state = serializers.CharField(source='pre_costing.version_state', allow_null=True)
    pre_costing_order = serializers.IntegerField(source='pre_costing.order.id', allow_null=True)
    material_transfer_status = serializers.SerializerMethodField()
    material_transfer_data = serializers.SerializerMethodField()
    fabric_material_completed_in_pre_costing = serializers.SerializerMethodField()
    style_number = serializers.CharField(source='pre_costing.order.style_number', allow_null=True)

    def get_order_inquiry_id(self, instance):
        return get_attributes(instance.get_costing(),'order__id')
    
    def get_version_id(self, instance):
        return get_attributes(instance.get_costing(),'id')

    def get_display_number(self, instance):
        return instance.display_number
    
    def get_short_code(self, instance):
        return instance.short_code

    def get_long_code(self, instance):
        return instance.long_code
    
    def get_state(self, instance):
        data = {
            'value': instance.state,
            'display_value': instance.get_state_display()
        }
        return data

    def get_general_po_id(self, instance):
        general_po_id = None
        general_pos = GeneralPO.objects.filter(
            po_club=instance
        )
        if general_pos:
            general_po_id = general_pos[0].id
        return general_po_id

    def get_costing_type(self, instance):
        costing_type = instance.get_costing_type()
        return costing_type

    def get_marketing_costing_id(self, instance):
        costing_id = None
        costing = instance.get_costing()
        if costing:
            if costing.costing_type == OrderCostingVersion.MARKETING_COSTING:
                costing_id = costing.id
            else:
                if costing.marketing_costing:
                    costing_id =  costing.marketing_costing.id
        return costing_id

    def get_marketing_costing_display_number(self, instance):
        costing_display_number = None
        costing = instance.get_costing()
        if costing:
            if costing.costing_type == OrderCostingVersion.MARKETING_COSTING:
                costing_display_number = costing.display_number
            else:
                if costing.marketing_costing:
                    costing_display_number =  costing.marketing_costing.display_number
        return costing_display_number

    def get_marketing_costing_order(self, instance):
        order_id = None
        costing = instance.get_costing()
        if costing:
            if costing.costing_type == OrderCostingVersion.MARKETING_COSTING:
                order_id = costing.order.id
            else:
                if costing.marketing_costing:
                    order_id =  costing.marketing_costing.order.id
        return order_id

    def get_material_transfer_status(self, instance):
        content_type = ContentType.objects.get_for_model(ActualPOClub)
        is_exist = WarehouseMaterialTransfer.objects.filter(entity_type=content_type, entity_id=instance.id).exclude(state=WarehouseMaterialTransfer.COMPLETE_STATE).exists()
        return is_exist

    def get_material_transfer_data(self, instance):
        data = []
        material_transfers = instance.get_warehouse_transfer_materials().exclude(state__in=[WarehouseMaterialTransfer.COMPLETE_STATE, WarehouseMaterialTransfer.CANCELED_STATE])
        for material_transfer in material_transfers:
            data.append({
                'id': material_transfer.id,
                'display_number': material_transfer.display_number
            })
        return data
    
    def get_fabric_material_completed_in_pre_costing(self, instance):
        is_complete = instance.validate_fabric_material_completed_in_pre_costing()
        return is_complete

    class Meta:
        model = ActualPOClub
        fields = '__all__'


class UploadedPurchaseOrderSerializer(ModelSerializer):
    po_file_name = serializers.CharField(source='attachment.display_name', read_only=True)
    actualpoclub_set = ActualPOClubSerializer(many=True, read_only=True)
    originalpoclub_set = OriginalPOClubSerializer(many=True, read_only=True)
    purchaseorder_set = PurchaseOrderSerializer(many=True, read_only=True)
    is_pre_costing_done = serializers.SerializerMethodField(read_only=True)
    costing_type = serializers.SerializerMethodField(read_only=True)

    def get_is_pre_costing_done(self, instance):
        has_none_pre_costing = True
        is_exists = instance.actualpoclub_set.filter(pre_costing=None).exists()
        if is_exists:
             has_none_pre_costing = False
        return has_none_pre_costing
    
    def get_costing_type(self, instance):
        pass

    def to_representation(self, instance):
        response = super().to_representation(instance)
        response["actualpoclub_set"] = sorted(response["actualpoclub_set"], key=lambda x: x["id"])
        return response

    class Meta:
        model = UploadedPurchaseOrder
        fields = '__all__'


class ColorwayItemFabricConsumptionSerializer(ModelSerializer):

    class Meta:
        model = ColorwayItemFabricConsumption
        fields = ('po_consumption_ratio', 'po_wastage', )


class OrderInquiryStyleNumberSerializer(ModelSerializer):
    class Meta:
        model = OrderInquiryStyleNumber
        fields = ('__all__')


class POFabricMarkerPlacementSerializer(ModelSerializer):
    class Meta:
        model = POFabricMarkerPlacement
        fields = ('__all__')


class FabricMarkerSerializer(ModelSerializer):
    pofabricmarkerplacement_set = POFabricMarkerPlacementSerializer(many=True, read_only=True)
    
    class Meta:
        model = POFabricMarker
        fields = ('__all__')


class PurchaseOrderBomBasicSerializer(ModelSerializer):
    measuring_unit_display = serializers.CharField(source='get_measuring_unit_display')
    po_display_number = serializers.SerializerMethodField()

    def get_po_display_number(self, instance):
        return instance.purchase_order.display_number
    
    class Meta:
        model = PurchaseOrderBom
        fields = ('__all__')


class PurchaseOrderBomSerializer(ModelSerializer):
    materail_name = serializers.SerializerMethodField(read_only=True)
    supplier_name = serializers.SerializerMethodField(read_only=True)
    quantity_display_value = serializers.SerializerMethodField(read_only=True)
    material_details = serializers.SerializerMethodField(read_only=True) 

    def get_materail_name(self, instance):
        return instance.material.material_detail.generic_material.user_material.material
    
    def get_supplier_name(self, instance): #TODO PurchaseOrderClubBomSupplier
        # supplier_names = set()
        # purchase_orders = PurchaseOrderBom.objects.filter()

        # for purchase_order in purchase_orders:
        #     if purchase_order.supplier_inquiry_detail:
        #         supplier_name = purchase_order.supplier_inquiry_detail.supplier_inquiry.supplier.name
        #         supplier_names.add(supplier_name)

        # result = ",".join(sorted(supplier_names)).rstrip(',')
        return instance.supplier_inquiry_detail.supplier_inquiry.supplier.name
    
    def get_material_details(self, instance):
        details = instance.material.get_customer_brand_material_details()
        return details

    def get_quantity_display_value(self, instance):
        display_value = None
        if instance.quantity:
            display_value = '%s %s' % (round(instance.quantity, 2), instance.get_measuring_unit_display())
        return display_value
    
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['quantity_display_value'] = '%s %s' % (round(self.context.get('quantity', instance.quantity), 2), instance.get_measuring_unit_display())
        return representation
    
    class Meta:
        model = PurchaseOrderBom
        fields = ('__all__')


class InHouseMaterialDetailSerializer(ModelSerializer):
    barcode = serializers.CharField(source='in_house_material.barcode', read_only=True)
    pack_number = serializers.CharField(source='in_house_material.grn_material_detail.fabricgrndetail.pack_number', read_only=True, allow_null=True)
    batch_number = serializers.CharField(source='in_house_material.grn_material_detail.batch_number.batch_number', read_only=True, allow_null=True)
    shade = serializers.CharField(source='in_house_material.grn_material_detail.shade.shade', read_only=True, allow_null=True)
    width = serializers.FloatField(source='width.width', read_only=True, allow_null=True)
    width_unit = serializers.CharField(source='width.width_unit', read_only=True, allow_null=True)
    allocated_quantity_units = serializers.CharField(source='get_allocated_quantity_units_display', read_only=True, allow_null=True)
    manually_added = serializers.BooleanField(source='in_house_material.manually_added', read_only=True)
    supplier_po_grn_id = serializers.IntegerField(source='in_house_material.grn_material_detail.supplier_po_grn_material.supplier_po_grn.id', read_only=True, allow_null=True)
    in_house_material_id = serializers.IntegerField(source='in_house_material.id', read_only=True)
    purchase_order_id = serializers.IntegerField(source='purchase_order_bom.purchase_order.id', read_only=True)
    purchase_order_display_number = serializers.CharField(source='purchase_order_bom.purchase_order.display_number', read_only=True)
    grn_display_number = serializers.CharField(source='in_house_material.grn_material_detail.supplier_po_grn_material.supplier_po_grn.grn_number', read_only=True)

    class Meta:
        model = PurchaseOrderAllocatedMaterial
        fields = ('id', 'barcode', 'pack_number', 'batch_number', 'shade', 'width', 'width_unit', 'allocated_quantity', 
                  'allocated_quantity_units', 'manually_added', 'supplier_po_grn_id', 'in_house_material_id', 'purchase_order_id', 'purchase_order_display_number', 'grn_display_number')


class POAllocatedMaterialDetailSerializer(ModelSerializer):
    headers = serializers.SerializerMethodField(read_only=True)
    details = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = ('id', 'name', 'headers', 'details')

    def get_headers(self, instance):
        customer_brand_material = get_object_or_404(CustomerBrandMaterial, pk=self.context['material_id'])
        material = customer_brand_material.material_type
        from materials.fieldmetadata.material_metadata import get_inhouse_material_detail_headers
        headers = get_inhouse_material_detail_headers(material)
        return headers

    def get_details(self, instance):
        allocated_materials = PurchaseOrderAllocatedMaterial.objects.filter(purchase_order_bom__purchase_order=instance, in_house_material__supplier_material__customer_brand_material_id=self.context['material_id'])
        serializer = InHouseMaterialDetailSerializer(allocated_materials, many=True)
        return serializer.data
    

class ClubAllocatedMaterialDetailSerializer(ModelSerializer):
    headers = serializers.SerializerMethodField(read_only=True)
    details = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ActualPOClub
        fields = ('id', 'headers', 'details')

    # TODO - we can remove headers once everything is moved to the new way in the front end
    def get_headers(self, instance):
        customer_brand_material = get_object_or_404(CustomerBrandMaterial, pk=self.context['material_id'])
        material = customer_brand_material.material_type
        from materials.fieldmetadata.material_metadata import get_inhouse_material_detail_headers
        headers = get_inhouse_material_detail_headers(material)
        return headers

    def get_details(self, instance):
        allocated_materials = PurchaseOrderAllocatedMaterial.objects.filter(
            purchase_order_bom__purchase_order__actual_po_club=instance, 
            in_house_material__supplier_material__customer_brand_material_id=self.context['material_id']
        ).order_by('purchase_order_bom__purchase_order')
        serializer = InHouseMaterialDetailSerializer(allocated_materials, many=True)
        return serializer.data


class SupplierDeliveryDateQuantityBasicSerializer(ModelSerializer):
    inhousematerial_set = InHouseMaterialSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    has_shade = serializers.BooleanField(source='purchase_order_bom.material.material_detail.generic_material.user_material.has_shade', read_only=True)
    delivery_date = serializers.DateField(source='supplier_delivery_date.confirmed_delivery_date', read_only=True, allow_null=True)

    class Meta:
        model = SupplierDeliveryDateQuantity
        fields = ('__all__')


class FabricWidthSupplierSerializer(ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)

    class Meta:
        model = FabricWidthSupplier
        fields = ('__all__')


class SupplierBOMFileSerializer(ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    attachment_display_name = serializers.CharField(source='bom_file.display_name' ,read_only=True)
    attachment_file_path = serializers.CharField(source='bom_file.file_path',read_only=True)

    class Meta:
        model = SupplierBOMFile
        fields = ('__all__')


class FabricWidthSerializer(ModelSerializer):
    display_name = serializers.SerializerMethodField()
    class Meta:
        model = FabricWidth
        fields = ('__all__')

    def get_display_name(self, object):
        return str(object.width) + ' ' + str(object.width_unit).title()
    

class SupplierDeliveryInvoiceSerializer(ModelSerializer):
    invoice = serializers.SerializerMethodField(read_only=True)
    #supplierpodeliveryinvoicepacklist_set = serializers.SerializerMethodField(read_only=True)

    def get_invoice(self, instance):
        data = {}
        if instance.invoice:
            data = instance.invoice.get_object_data()
        return data
    
    # def get_supplierpodeliveryinvoicepacklist_set(self, instance):
    #     context = {'delivery_date': self.context['delivery_date']}
    #     supplierpodeliveryinvoicepacklist_set = SupplierPODeliveryInvoicePackListSerializer(
    #         instance.supplierpodeliveryinvoicepacklist_set,
    #         context=context, many=True
    #     ).data
    #     return supplierpodeliveryinvoicepacklist_set
    class Meta:
        model = SupplierPODeliveryInvoice
        fields = ('id', 'supplier_invoice_number', 'invoice', )


class SupplierDeliveryDateDetailSerializer(ModelSerializer):
    delivery_display = serializers.SerializerMethodField()
    supplier_po_delivery_invoice = serializers.SerializerMethodField()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.delivery_counter = 0

    def get_delivery_display(self, instance):
        self.delivery_counter += 1
        return f"Delivery {self.delivery_counter}"
    
    def get_supplier_po_delivery_invoice(self, instance):
        context = {'delivery_date': instance}
        supplier_po_delivery_invoice = None
        if instance.actual_delivery_date:
            supplier_po_delivery_invoice = SupplierDeliveryInvoiceSerializer(instance.actual_delivery_date.supplier_po_delivery_invoice,
            context=context, 
            many=False
        ).data
        return supplier_po_delivery_invoice
    class Meta:
        model = SupplierDeliveryDate
        fields = ('id', 'delivery_display', 'confirmed_delivery_date', 'actual_delivery_date', 'supplier_po_delivery_invoice', )


class SupplierDeliveryDateQuantityDetailSerializer(ModelSerializer):
    delivery_display = serializers.SerializerMethodField()
    materials = serializers.SerializerMethodField(read_only=True)
    actual_delivery_date = serializers.SerializerMethodField()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.delivery_counter = 0

    def get_materials(self, instance):
        material_id_list = []
        grns = instance.get_delivery_date_grns()
        for grn in grns:
            material_ids = grn.supplierpogrnmaterial_set.all().values_list('grn_material_id', flat=True)
            material_id_list.extend(material_ids)
        materials = CustomerBrandMaterial.objects.filter(id__in=material_id_list).order_by('id')
        context = {'delivery_date' : instance}
        searializer = DeliveryDateMaterialQuantityDetailSerializer(materials, context=context, many=True)
        return searializer.data
    
    def get_delivery_display(self, instance):
        return instance.display_number
    
    def get_actual_delivery_date(self, instance):
        date = None
        if instance.actual_delivery_date:
            date = instance.actual_delivery_date.delivery_date
        return date

    class Meta:
        model = SupplierDeliveryDate
        fields = ('id', 'delivery_display', 'confirmed_delivery_date', 'actual_delivery_date', 'materials', )


class FabricGRNDetailSerializer(ModelSerializer):

    class Meta:
        model = FabricGRNDetail
        fields = ('id', 'grn_material_detail', 'batch_number', 'pack_number', 
                  'color', 'shade', 'actual_width', 'actual_width_units', 'indicated_width', 
                  'indicated_width_units', 'actual_gsm', 'indicated_gsm', 'shrink_lot', 'shrink_width', 'shrink_length', 'remarks')
        ordering = ['id']


class POClubShadeSerializer(ModelSerializer):
    attachment = FileAttachmentSerializer(source='shade_swatch')

    class Meta:
        model = POClubShade
        fields = ('__all__')


class POClubShadeMappingSerializer(ModelSerializer):
    materials = serializers.SerializerMethodField()

    def get_materials(self, instance):
        supplier_po_grn = self.context['supplier_po_grn']
        materials = supplier_po_grn.get_grn_fabric_materials()
        context = {'supplier_po_grn': supplier_po_grn, 'po_club': instance}
        serializer = SupplierPOShadeMappingMaterialSerializer(materials, context=context, many=True)
        return serializer.data
    class Meta:
        model = ActualPOClub
        fields = ('id', 'display_number', 'materials')


class SupplierPOShadeMappingMaterialSerializer(ModelSerializer):
    headers = serializers.SerializerMethodField(read_only=True)
    attributes = serializers.SerializerMethodField(read_only=True)
    shade_mappings = serializers.SerializerMethodField()
    club_shades = serializers.SerializerMethodField()

    class Meta:
        model = CustomerBrandMaterial
        fields = '__all__'

    def get_headers(self, instance):
        attributes = UserDefinedMaterial.get_material_headers(instance.material_detail.generic_material.user_material.name)
        return attributes

    def get_attributes(self, instance):
        attributes = instance.get_attributes()
        return attributes  
    
    def get_shade_mappings(self, instance):
        supplier_po_grn = self.context['supplier_po_grn']
        qs = SupplierPOFabricShade.objects.filter(supplier_po=supplier_po_grn.supplier_po, material=instance)
        context = {'po_club': self.context['po_club']}
        serializer = SupplierPOFabricShadeMappingSerializer(qs, context=context, many=True)
        return serializer.data
    
    def get_club_shades(self, instance):
        club_shades = POClubShade.objects.filter(material=instance, po_club=self.context['po_club'])
        data = POClubShadeSerializer(club_shades, many=True).data
        return data


class SupplierPOFabricShadeSerializer(ModelSerializer):
    attachment = FileAttachmentSerializer(source='shade_swatch')

    class Meta:
        model = SupplierPOFabricShade
        fields = ('__all__')


class SupplierPOFabricShadeMappingSerializer(ModelSerializer):
    attachment = FileAttachmentSerializer(source='shade_swatch')
    po_club_shade = serializers.SerializerMethodField()

    def get_po_club_shade(self, instance):
        po_club_shade = None
        supplier_po_club_material_shade_mapping = get_object_or_none(SupplierPOClubMaterialShadeMapping, {'supplier_po_shade': instance, 'po_club_shade__po_club': self.context['po_club']})
        if supplier_po_club_material_shade_mapping:
            po_club_shade = POClubShadeSerializer(supplier_po_club_material_shade_mapping.po_club_shade, many=False).data
        return po_club_shade

    class Meta:
        model = SupplierPOFabricShade
        fields = ('__all__')


class FabricGRNWidthSerializer(ModelSerializer):
    actual_width = serializers.FloatField(source='width', read_only=True)

    class Meta:
        model = FabricGRNWidth
        fields = ('id', 'actual_width', )


class SupplierPOGRNMaterialSerializer(ModelSerializer):
    material_details = serializers.SerializerMethodField(read_only=True)
    supplierpogrnmaterialdetail_set = SupplierPOGRNMaterialDetailSerializer(many=True, read_only=True)
    material_headers = serializers.SerializerMethodField()
    headers = serializers.SerializerMethodField(read_only=True)
    
    def get_material_headers(self, instance):
        from materials.fieldmetadata.material_metadata import get_grn_material_headers
        headers = get_grn_material_headers(instance)
        return headers

    def get_headers(self, instance):
        headers = instance.grn_material.customer_brand_material.material_detail.generic_material.user_material.get_material_headers(
                instance.grn_material.customer_brand_material.material_detail.generic_material.user_material.name
            )
        return headers

    def get_material_pack_list_attachment_details(self, instance):
        attachment = instance.material_pack_list_attachment
        if instance.material_pack_list_attachment is not None:
            serializer = FileAttachmentSerializer(attachment).data
            return serializer
        return {}

    def get_material_details(self, instance):
        return instance.grn_material.get_attributes()
    
    def get_headers(self, instance):
        headers = instance.grn_material.customer_brand_material.material_detail.generic_material.user_material.get_material_headers(
                instance.grn_material.customer_brand_material.material_detail.generic_material.user_material.name
            )
        return headers

    class Meta:
        model = SupplierPOGRNMaterial
        fields = ('id', 'material_headers', 'headers', 'total_expected_quantity', 'total_expected_quantity_units', 'total_actual_quantity', 'total_actual_quantity_units', 'grn_price', 'material_pack_list_attachment', 'material_details', 'supplierpogrnmaterialdetail_set')
        ordering = ['id']

    
class SupplierPOGRNSerializer(ModelSerializer):
    invoice_number = serializers.CharField(source='invoice_number.supplier_invoice_number', read_only=True)
    supplier_name = serializers.CharField(source='supplier_po.general_po_supplier.supplier.name', read_only=True)
    state_display = serializers.CharField(source='get_state_display', read_only=True)
    supplier_po_id = serializers.IntegerField(source='supplier_po.id', read_only=True)
    supplier_po_number = serializers.CharField(source='supplier_po.supplier_po_number', read_only=True)
    supplierpogrnmaterial_set = SupplierPOGRNMaterialSerializer(many=True, read_only=True)
    grn_headers = serializers.SerializerMethodField(read_only=True)
    club_id = serializers.IntegerField(source='supplier_po.po_club.id', read_only=True)
    club_display_number = serializers.CharField(source='supplier_po.po_club.display_number', read_only=True)
    purchase_orders = serializers.SerializerMethodField(read_only=True)
    supplierdeliverydate_set = serializers.SerializerMethodField(read_only=True)
    supplier_delivery_date = serializers.CharField(source='supplier_delivery_date.confirmed_delivery_date', read_only=True)
    supplier_po_display_name = serializers.CharField(source='supplier_po.supplier_po_file.display_name', read_only=True)
    supplier_po_file_path = serializers.CharField(source='supplier_po.supplier_po_file.file_path', read_only=True)
    grn_number = serializers.CharField()
    delivery_note_display_number = serializers.SerializerMethodField()
    delivery_note = serializers.SerializerMethodField()
    supplier_invoice_number_dispaly = serializers.CharField(source='supplier_pack_list.supplier_po_delivery_note.supplier_po_delivery_invoice.display_number')
    supplier_invoice_number = serializers.SerializerMethodField(read_only=True)
    supplier_pack_list_display = serializers.SerializerMethodField()
    supplier_pack_list = serializers.SerializerMethodField(read_only=True)
    replacement_grns = serializers.SerializerMethodField()
    actual_delivery_date = serializers.SerializerMethodField()
    general_po_id = serializers.IntegerField(source='supplier_po.general_po_supplier.general_po.id')
    general_po_display_number = serializers.CharField(source='supplier_po.general_po_supplier.general_po.display_number')
    is_shade_mapping_for_club = serializers.SerializerMethodField()
    proforma_invoice_supplier_display_number = serializers.CharField(source='supplier_po.proforma_invoice_supplier_display_number')
    proforma_invoice = FileAttachmentSerializer(source='supplier_po.proforma_invoice')
    is_include_fabric_material = serializers.SerializerMethodField()
    warehouse = serializers.IntegerField(source='warehouse_id')
    is_approval_created = serializers.SerializerMethodField()
    approval = serializers.SerializerMethodField()

    def get_grn_headers(self, instance):
        from materials.fieldmetadata.material_metadata import get_grn_headers
        headers = get_grn_headers(instance)
        return headers

    def get_purchase_orders(self, instance):
        serializer = None
        if instance.supplier_po.general_po_supplier.general_po.is_po_club_general_po():
            purchase_orders = instance.supplier_po.general_po_supplier.general_po.po_club.get_purchase_orders()
            serializer = PurchaseOrderBasicSerializer(purchase_orders, many=True).data
        return serializer
    
    def get_supplierdeliverydate_set(self, instance):
        delivery_dates = instance.get_actual_delivery_date().get_supplier_delivery_dates()
        serializer = SupplierDeliveryDateSerializer(delivery_dates, many=True).data
        return serializer
    
    def get_supplier_pack_list(self, instance):
        data = None
        supplier_pack_list =  instance.supplier_pack_list
        if supplier_pack_list.pack_list:
            data = supplier_pack_list.pack_list.get_object_data()
        return data

    def get_supplier_invoice_number(self, instance):
        supplier_invoice_number = None
        if instance.supplier_pack_list.supplier_po_delivery_note.supplier_po_delivery_invoice.invoice:
            supplier_invoice_number = instance.supplier_pack_list.supplier_po_delivery_note.supplier_po_delivery_invoice.invoice.get_object_data()
        return supplier_invoice_number
    
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        ordered_materials = sorted(
            representation['supplierpogrnmaterial_set'],
            key=lambda x: x['id']
        )
        for material in ordered_materials:
            material['supplierpogrnmaterialdetail_set'] = sorted(
                material['supplierpogrnmaterialdetail_set'],
                key=lambda detail: detail['id']
            )
        representation['supplierpogrnmaterial_set'] = ordered_materials
        return representation
    
    def get_delivery_note(self, instance):
        data = None
        delivery_note =  instance.get_delivery_note()
        if delivery_note.delivery_note:
            data = delivery_note.delivery_note.get_object_data()
        return data
    
    def get_replacement_grns(self, instance):
        data = instance.replacement_grn.values_list('pk', flat=True)
        return data
    
    def get_actual_delivery_date(self, instance):
        data = {}
        actual_delivery_date = self.instance.get_actual_delivery_date()
        if actual_delivery_date:
            data = SupplierActualDeliveryDateSerializer(actual_delivery_date, many=False).data
        return data
    
    def get_is_shade_mapping_for_club(self, instance):
        is_shade_mapping_for_club = SupplierDeliveryDateQuantityPOAllocation.objects.filter(
            supplier_delivery_date_quantity__material_supplier__general_po_supplier__supplierpo=instance.supplier_po
        ).values_list('purchase_order__actual_po_club').exists()
        return is_shade_mapping_for_club
    
    def get_supplier_pack_list_display(self, instance):
        return '%s / %s' % (instance.supplier_pack_list.display_number, instance.supplier_pack_list.supplier_display_number)
    
    def get_delivery_note_display_number(self, instance):
        return '%s / %s' % (instance.supplier_pack_list.supplier_po_delivery_note.display_number, instance.supplier_pack_list.supplier_po_delivery_note.supplier_display_number)

    def get_is_include_fabric_material(self, instance):
        is_include_fabric_material = instance.supplierpogrnmaterial_set.filter(grn_material__customer_brand_material__material_detail__generic_material__user_material__category=Material.FABRIC_MATERIAL).exists()
        return is_include_fabric_material

    def get_is_approval_created(self, instance):
        from shared.models import Approval
        is_exists = Approval.objects.filter(entity__contains=[{"entity_id": instance.id, "entity_name": SUPPLIER_PO_GRN_ENTITY}], approval_name=GRN_APPROVAL).exists()
        return is_exists

    def get_approval(self, instance):
        data = {}
        approvals = Approval.objects.filter(entity__contains=[{"entity_id": instance.id, "entity_name": SUPPLIER_PO_GRN_ENTITY}], approval_name=GRN_APPROVAL)
        if approvals:
            data = {
                'id': approvals[0].id,
                'approval_name': approvals[0].approval_name,
                'state': approvals[0].action,
                'state_display': approvals[0].get_action_display()
            }
        return data

    class Meta:
        model = SupplierPOGRN
        fields = ('id', 'invoice_number', 'state', 'state_display', 'supplier_name', 'supplier_po_id', 'supplier_po_number', 'grn_headers', 'supplierpogrnmaterial_set', 'club_display_number',
                  'club_id', 'purchase_orders', 'created', 'remarks', 'supplierdeliverydate_set', 'supplier_delivery_date', 'supplier_invoice_number', 
                  'supplier_po_display_name', 'supplier_po_file_path', 'grn_number', 'delivery_note_display_number',
                  'delivery_note', 'supplier_invoice_number_dispaly', 'supplier_invoice_number', 'supplier_pack_list', 'supplier_pack_list_display', 'replacement_grns', 'actual_delivery_date',
                  'general_po_id', 'general_po_display_number', 'is_shade_mapping_for_club', 'proforma_invoice_supplier_display_number', 'proforma_invoice', 'is_include_fabric_material', 'warehouse',
                  'is_approval_created', 'approval')
        ordering = ['id']


class SupplierPOGRNMaterialBasicDetailSerializer(ModelSerializer):
    material_details = serializers.SerializerMethodField(read_only=True)
    grn_material = models.ForeignKey(SupplierInquiryMaterialCode, on_delete=models.CASCADE)
    total_expected_quantity_units = serializers.CharField(source='get_total_expected_quantity_units_display')
    total_actual_quantity_units = serializers.CharField(source='get_total_actual_quantity_units_display')
    total_qa_rejected_quantity_units = serializers.CharField(source='get_total_qa_rejected_quantity_units_display')
    total_indicated_quantity_units = serializers.CharField(source='get_total_indicated_quantity_units_display')
    total_excess_quantity_units = serializers.CharField(source='get_total_excess_quantity_units_display')
    total_deficit_quantity_units = serializers.CharField(source='get_total_deficit_quantity_units_display')
    usable_quantity_units = serializers.CharField(source='get_total_deficit_quantity_units_display')
    mismatch_quantity_units = serializers.CharField(source='get_mismatch_quantity_units_display')
    width_replacement_quantity_units = serializers.CharField(source='get_width_replacement_quantity_units_display')
    total_qa_passed_quantity = serializers.DictField()


    def get_material_details(self, instance):
        return instance.grn_material.get_attributes()

    class Meta:
        model = SupplierPOGRNMaterial
        fields = ('id', 'material_headers', 'total_expected_quantity', 'total_expected_quantity_units', 'total_actual_quantity', 'total_actual_quantity_units', 'grn_price', 'material_details', 'total_qa_passed_quantity')
        ordering = ['id']

    class Meta:
        model = SupplierPOGRNMaterial
        fields = ('__all__')
        ordering = ['id']


class SupplierPOGRNBasicDataSerializer(ModelSerializer):
    invoice_number = serializers.CharField(source='invoice_number.supplier_invoice_number', read_only=True)
    supplier_name = serializers.CharField(source='supplier_po.supplier.name', read_only=True)
    state_display = serializers.CharField(source='get_state_display', read_only=True)
    supplier_po_id = serializers.IntegerField(source='supplier_po.id', read_only=True)
    supplier_po_number = serializers.CharField(source='supplier_po.supplier_po_number', read_only=True)
    supplier_po_display_name = serializers.CharField(source='supplier_po.supplier_po_file.display_name', read_only=True)
    material_details = serializers.SerializerMethodField(read_only=True)

    def get_material_details(self, instance):
        response = []
        materials = instance.supplierpogrnmaterial_set.all()
        for material in materials:
            data = {
                'id': material.grn_material.id,
                'material': material.grn_material.material_label,
                'ritz_reference_code': material.grn_material.verbose_reference_code,
                'reference_code': material.grn_material.material_code.customer_reference_code,
                'total_actual_quantity': material.total_actual_quantity,
                'total_actual_quantity_units': material.total_actual_quantity_units,
                'grn_price': material.grn_price,
            }
            response.append(data)
        return response

    class Meta:
        model = SupplierPOGRN
        fields = ('id', 'grn_number', 'invoice_number', 'state', 'state_display', 'supplier_name', 'supplier_po_id', 'supplier_po_number',
                  'supplier_po_display_name', 'material_details',)


class PurchaseOrderPOClubBomSetSerailzier(ModelSerializer):
    purchase_order_club_bom_suppliers = serializers.SerializerMethodField(read_only=True)

    def get_purchase_order_club_bom_suppliers(self, instance):
        material = self.context.get('material')
        purchase_order_boms = instance.purchaseorderbom_set.all()
        purchase_order_bom_suppliers = PurchaseOrderClubBomSupplier.objects.filter(
            purchase_order_bom__in=purchase_order_boms,
            purchase_order_bom__material=material
        ).order_by('id')
        serializers = SupplierDeliveryDateQuantityBasicSerializer(purchase_order_bom_suppliers, many=True)
        return serializers.data
    
    class Meta:
        model = PurchaseOrder
        fields = ('id', 'name', 'purchase_order_club_bom_suppliers')


class ShadeGroupSerializer(serializers.ModelSerializer):
    attachment = FileAttachmentSerializer(source='shade_swatch', many=False)
    grnbatchnumbershade_set = GRNBatchNumberShadeSerializer(many=True)
    total_quantity = serializers.SerializerMethodField()

    def get_total_quantity(self, instance):
        data = {}
        batch_ids = instance.grnbatchnumbershade_set.all().values_list('batch_number', flat=True)
        grn_material_details = SupplierPOGRNMaterialDetail.objects.filter(batch_number__id__in=batch_ids)
        if grn_material_details:
            grn_material = grn_material_details[0].supplier_po_grn_material
            material_normalized_measuring_unit = grn_material.grn_material.customer_brand_material.material_normalized_measuring_unit
            total_quantity = calculate_queryset_total_normalized_quantity(grn_material_details, material_normalized_measuring_unit,'actual_quantity', 'actual_quantity_units')
            data = get_quantity_dictionary(total_quantity, material_normalized_measuring_unit)
        return data

    class Meta:
        model = SupplierPOFabricShade
        fields = ('__all__')


class POMarkerPointSerializer(ModelSerializer):

    class Meta:
        model = POMarkerPoint
        fields = '__all__'


class SupplierPOShrinkLotSerializer(serializers.ModelSerializer):

    class Meta:
        model = SupplierPOShrinkLot
        fields = '__all__'

class SupplierPOGRNShrinkageValueSerializer(serializers.ModelSerializer):
    batch_number = serializers.CharField(source='grn_material_detail.batch_number.batch_number', read_only=True)
    pack_number = serializers.CharField(source='grn_material_detail.fabricgrndetail.pack_number', read_only=True)

    class Meta:
        model = SupplierPOShrinkageValue
        fields = '__all__'
        ordering = ['pack_number']


class SupplierPOMaterialShrinkageSerializer(serializers.ModelSerializer):
    material_details = serializers.SerializerMethodField(read_only=True)
    supplierposhrinkagevalue_set = serializers.SerializerMethodField()
    shrinkage_test_time_frame_display = serializers.CharField(source='get_shrinkage_test_time_frame_display',
                                                              read_only=True)
    shrink_lot_group_data = serializers.SerializerMethodField(read_only=True)
    shrink_lot_list = serializers.SerializerMethodField(read_only=True)

    def get_supplierposhrinkagevalue_set(self, instance):
        qs = SupplierPOShrinkageValue.objects.filter(supplier_po_shrinkage=instance, grn_material_detail__supplier_po_grn_material__supplier_po_grn=self.context['grn'])
        data = SupplierPOGRNShrinkageValueSerializer(qs, many=True).data
        return data

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        ordered_materials = sorted(
            representation['supplierposhrinkagevalue_set'],
            key=lambda x: x['pack_number']
        )
        representation['supplierposhrinkagevalue_set'] = ordered_materials
        return representation
    
    def get_wash_garment_group_data(self, instance, supplierpogrnshrinkagevalues, supplier_po):
        response = []
        group_values = supplierpogrnshrinkagevalues.values(
            'wash_shrinkage_length',
            'wash_shrinkage_width',
            'shrinkage_lot',
            'shrinkage_lot__shrink_lot_name',
        ).distinct()
        
        for grouped_value in group_values:
            grn_material_details_ids = instance.supplierposhrinkagevalue_set.filter(
                wash_shrinkage_length=grouped_value['wash_shrinkage_length'],
                wash_shrinkage_width=grouped_value['wash_shrinkage_width'],
                shrinkage_lot=grouped_value['shrinkage_lot'],
                shrinkage_lot__shrink_lot_name=grouped_value['shrinkage_lot__shrink_lot_name'],
            ).values_list('grn_material_detail__id', flat=True)

            grn_material_details = SupplierPOGRNMaterialDetail.objects.filter(id__in=grn_material_details_ids, supplier_po_grn_material__supplier_po_grn=self.context['grn'])

            roll_data = []
            for grn_material_detail in grn_material_details:
                roll_detail = '%s - %s ' % (
                grn_material_detail.batch_number.batch_number, grn_material_detail.fabricgrndetail.pack_number)
                roll_data.append({'grn_material_detail_id': grn_material_detail.id, 'roll_name': roll_detail})

            data = {
                'supplier_material': grn_material_detail.supplier_po_grn_material.grn_material.id,
                'supplier_po': supplier_po.id,
                'wash_shrinkage_length': grouped_value['wash_shrinkage_length'],
                'wash_shrinkage_width': grouped_value['wash_shrinkage_width'],
                'roll_numbers': roll_data,
                'shrinkage_lot': grouped_value['shrinkage_lot'],
                'shrinkage_lot_name': grouped_value['shrinkage_lot__shrink_lot_name'],
            }
            response.append(data)
        return response


    def get_not_wash_garment_grooup_data(self, instance, supplierpogrnshrinkagevalues, supplier_po):
        response = []
        group_values = supplierpogrnshrinkagevalues.values(
            'residual_shrinkage_length',
            'residual_shrinkage_width',
            'steam_shrinkage_length',
            'steam_shrinkage_width',
            'shrinkage_lot',
            'shrinkage_lot__shrink_lot_name',
        ).distinct()

        for grouped_value in group_values:
            grn_material_details_ids = instance.supplierposhrinkagevalue_set.filter(
                residual_shrinkage_length=grouped_value['residual_shrinkage_length'],
                residual_shrinkage_width=grouped_value['residual_shrinkage_width'],
                steam_shrinkage_length=grouped_value['steam_shrinkage_length'],
                steam_shrinkage_width=grouped_value['steam_shrinkage_width'],
                shrinkage_lot=grouped_value['shrinkage_lot'],
                shrinkage_lot__shrink_lot_name=grouped_value['shrinkage_lot__shrink_lot_name'],
            ).values_list('id', flat=True)

            shrinkage_values = SupplierPOShrinkageValue.objects.filter(id__in=grn_material_details_ids, grn_material_detail__supplier_po_grn_material__supplier_po_grn=self.context['grn'])

            roll_data = []
            for shrinkage_value in shrinkage_values:
                roll_detail = '%s - %s ' % (
                shrinkage_value.grn_material_detail.batch_number.batch_number, shrinkage_value.grn_material_detail.fabricgrndetail.pack_number)
                roll_data.append({'shrinkage_value_id': shrinkage_value.id, 'roll_name': roll_detail})

            data = {
                'supplier_material': shrinkage_value.grn_material_detail.supplier_po_grn_material.grn_material.id,
                'supplier_po': supplier_po.id,
                'residual_shrinkage_length': grouped_value['residual_shrinkage_length'],
                'residual_shrinkage_width': grouped_value['residual_shrinkage_width'],
                'steam_shrinkage_length': grouped_value['steam_shrinkage_length'],
                'steam_shrinkage_width': grouped_value['steam_shrinkage_width'],
                'roll_numbers': roll_data,
                'shrinkage_lot': grouped_value['shrinkage_lot'],
                'shrinkage_lot_name': grouped_value['shrinkage_lot__shrink_lot_name'],
            }
            response.append(data)
        return response

    def get_shrink_lot_group_data(self, instance):
        is_wash_garment = self.context['is_wash_garment']
        supplier_po = self.context['supplier_po']
        if is_wash_garment:
            response = self.get_wash_garment_group_data(instance, instance.supplierposhrinkagevalue_set, supplier_po)
        else:
            response = self.get_not_wash_garment_grooup_data(instance, instance.supplierposhrinkagevalue_set, supplier_po)
        return response

    def get_material_details(self, instance):
        return instance.supplier_material.customer_brand_material.get_customer_brand_material_details()
    
    def get_shrink_lot_list(self, instance):
        lot_list = SupplierPOShrinkLot.objects.filter(supplier_po=instance.supplier_po, supplier_material=instance.supplier_material)
        serializer = SupplierPOShrinkLotSerializer(lot_list, many=True).data
        return serializer

    class Meta:
        model = SupplierPOMaterialShrinkage
        fields = (
        'id', 'shrinkage_test_time_frame', 'shrinkage_test_time_frame_display', 'supplierposhrinkagevalue_set',
        'material_details', 'shrink_lot_group_data', 'shrink_lot_list', ) 


class MaterialDetailInspectionSerializer(serializers.ModelSerializer):
    pack_number = serializers.CharField(source='fabricgrndetail.pack_number', read_only=True, allow_null=True)

    def get_pack_number(self, instance):
        return instance.fabricgrndetail.pack_number

    class Meta:
        model = SupplierPOGRNMaterialDetail
        fields = ('id', 'inspection_state', 'inspection_attempt', 'qa_inspection_passed', 'pack_number' )


class BatchInspectionSerializer(serializers.ModelSerializer):
    supplierpogrnmaterialdetail_set = MaterialDetailInspectionSerializer(many=True)

    class Meta:
        model = FabricGRNBatchNumber
        fields = ('id', 'batch_number', 'inspection_status', 'inspection_percentage',  'avg_defect_rate_per_100_square_yards', 'supplierpogrnmaterialdetail_set')


class InspectionMaterialBactchListSerializer(serializers.ModelSerializer):
    batches = serializers.SerializerMethodField(read_only=True)

    def get_batches(self, instance):
        batches = FabricGRNBatchNumber.objects.filter(
            grn_material__grn_material=instance
        )
        serilaizer = BatchInspectionSerializer(batches, many=True).data
        return serilaizer


    class Meta:
        model = CustomerBrandMaterial
        fields = ('id', 'verbose_reference_code', 'batches')


class CADPurchaseOrderAllocatedMaterialSerializer(serializers.ModelSerializer):

    roll_number = serializers.SerializerMethodField()

    def get_roll_number(self, instance):
        return instance.in_house_material.grn_material_detail.fabricgrndetail.pack_number

    class Meta:
        model = PurchaseOrderAllocatedMaterial
        fields = ['roll_number']


class POClubMaterialColorToneSerializer(serializers.ModelSerializer):
    acceptable_color_tones = FabricColorToneSerializer(many=True, read_only=True)
    
    class Meta:
        model = POClubMaterialColorTone
        fields = "__all__"

class DebitNoteMaterialDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = DebitNoteMaterialDetail
        fields = '__all__'


class DebitNoteMaterialSerializer(serializers.ModelSerializer):
    material = serializers.SerializerMethodField()
    color_tone_remediation = serializers.SerializerMethodField()
    defected_remediation = serializers.SerializerMethodField()
    excess_remediation = serializers.SerializerMethodField()
    short_remediation = serializers.SerializerMethodField()

    def get_material(self, instance):
        data = CustomerBrandMaterialBasicSerializer(instance, many=False).data
        return data

    def get_color_tone_remediation(self, instance):
        data = {}
        debit_note = self.context['debit_note']
        debit_note_mat_object = get_object_or_none(DebitNoteMaterial,
            {
                'supplier_po_grn_material__grn_material__customer_brand_material': instance,
                'debit_note': debit_note,
                'reason': DebitNoteMaterial.REJECTED_COLOR_TONE_REASON
            }
        )
        if debit_note_mat_object:
            data = debit_note_mat_object.get_total_quantity()
            if hasattr(debit_note.commercial_invoice, 'supplieractualdeliverydate'):
                data['delivery_date'] = debit_note.commercial_invoice.supplieractualdeliverydate.delivery_date
            else:
                data['delivery_date'] = None
        return data
    
    def get_defected_remediation(self, instance):
        data = {}
        debit_note = self.context['debit_note']
        debit_note_mat_object = get_object_or_none(DebitNoteMaterial,
            {
                'supplier_po_grn_material__grn_material__customer_brand_material': instance,
                'debit_note': debit_note,
                'reason': DebitNoteMaterial.REJECTED_DEFECT_DEBIT_NOTE_REASON
            }
        )
        if debit_note_mat_object:
            data = debit_note_mat_object.get_total_quantity()
            if hasattr(debit_note.commercial_invoice, 'supplieractualdeliverydate'):
                data['delivery_date'] = debit_note.commercial_invoice.supplieractualdeliverydate.delivery_date
            else:
                data['delivery_date'] = None
        return data
    
    def get_excess_remediation(self, instance):
        data = {}
        debit_note = self.context['debit_note']
        debit_note_mat_object = get_object_or_none(DebitNoteMaterial,
            {
                'supplier_po_grn_material__grn_material__customer_brand_material': instance,
                'debit_note': debit_note,
                'reason': DebitNoteMaterial.EXCESS_REASON
            }
        )
        if debit_note_mat_object:
            data = debit_note_mat_object.get_total_quantity()
            if hasattr(debit_note.commercial_invoice, 'supplieractualdeliverydate'):
                data['delivery_date'] = debit_note.commercial_invoice.supplieractualdeliverydate.delivery_date
            else:
                data['delivery_date'] = None
        return data
    
    def get_short_remediation(self, instance):
        data = {}
        debit_note = self.context['debit_note']
        debit_note_mat_object = get_object_or_none(DebitNoteMaterial,
            {
                'supplier_po_grn_material__grn_material__customer_brand_material': instance,
                'debit_note': debit_note,
                'reason': DebitNoteMaterial.SHORT_REASON
            }
        )
        if debit_note_mat_object:
            data = debit_note_mat_object.get_total_quantity()
            if hasattr(debit_note.commercial_invoice, 'supplieractualdeliverydate'):
                data['delivery_date'] = debit_note.commercial_invoice.supplieractualdeliverydate.delivery_date
            else:
                data['delivery_date'] = None
        return data

    class Meta:
        model = CustomerBrandMaterial
        fields = '__all__'


class DebitNoteSerializer(serializers.ModelSerializer):
    invoice_id = serializers.IntegerField(source='commercial_invoice.id')
    invoice_number = serializers.CharField(source='commercial_invoice.display_number')
    invoice = serializers.SerializerMethodField()
    materials = serializers.SerializerMethodField()
    attachment =serializers.SerializerMethodField()
    
    def get_materials(self, instance):
        materials_ids = instance.debitnotematerial_set.all().values_list('supplier_po_grn_material__grn_material__customer_brand_material', flat=True).distinct()
        materials = CustomerBrandMaterial.objects.filter(id__in=materials_ids)
        context = {'debit_note': instance}
        data = DebitNoteMaterialSerializer(materials, context=context, many=True).data
        return data
    
    def get_invoice(self, instance):
        data = None
        if instance.commercial_invoice.invoice:
            data = instance.commercial_invoice.invoice.get_object_data()
        return data
    
    def get_attachment(self, instance):
        data = None
        if instance.attachment:
            data = instance.attachment.get_object_data()
        return data

    class Meta:
        model = DebitNote
        fields = ('id', 'display_number', 'invoice_id', 'invoice_number', 'invoice', 'status', 'free_of_charge', 'attachment', 'materials', )


class ReplacementQuantityDeliveryDateSerializer(serializers.ModelSerializer):
        
        class Meta:
            model = ReplacementQuantityDeliveryDate
            fields = ('__all__')


class PackInstructionOrderPackSerializer(serializers.ModelSerializer):
    country_id = serializers.IntegerField(source='order_pack.country.id')
    country_name = serializers.CharField(source='order_pack.country.country.name')
    size_id = serializers.IntegerField(source='order_pack.size.id')
    size = serializers.CharField(source='order_pack.size.size.name')
    colorway_id = serializers.IntegerField(source='order_pack.colorway.id')
    colorway = serializers.CharField(source='order_pack.colorway.colorway')

    class Meta:
        model = PackInstructionOrderPack
        fields = ('id', 'order_pack_id', 'country_id', 'country_name', 'size_id', 'size', 'colorway_id', 'colorway', 'quantity', 'ratio')


class PackInstructionSerializer(serializers.ModelSerializer):
    carton = CustomerBrandMaterialBasicSerializer(many=False)
    pack_instruction_order_packs = PackInstructionOrderPackSerializer(source='packinstructionorderpack_set', many=True)

    class Meta:
        model = PackInstruction
        fields = ('id', 'carton', 'pack_instruction_order_packs')


class PackPackagingSerializer(serializers.ModelSerializer):
    pack_instructions = PackInstructionSerializer(source='packinstruction_set', many=True)

    class Meta:
        model = PackPackaging
        fields = ('id', 'costing_id', 'current_version', 'display_number', 'pack_instructions')


class PurchaseOrderPackagingInstructionOrderPackSerializer(serializers.ModelSerializer):
    country_id = serializers.IntegerField(source='po_pack.po_country.id')
    country_name = serializers.CharField(source='po_pack.po_country.po_country_name')
    size_id = serializers.IntegerField(source='po_pack.po_size.id')
    size = serializers.CharField(source='po_pack.po_size.po_size_name')
    colorway_id = serializers.IntegerField(source='po_pack.po_colorway.id')
    colorway = serializers.CharField(source='po_pack.po_colorway.colorway')

    class Meta:
        model = PurchaseOrderPackagingInstructionOrderPack
        fields = ('id', 'po_pack_id', 'country_id', 'country_name', 'size_id', 'size', 'colorway_id', 'colorway', 'quantity', 'ratio')


class PurchaseOrderPackagingInstructionSerializer(serializers.ModelSerializer):
    carton = CustomerBrandMaterialBasicSerializer(many=False)
    pack_instruction_order_packs = PurchaseOrderPackagingInstructionOrderPackSerializer(source='purchaseorderpackaginginstructionorderpack_set', many=True)

    class Meta:
        model = PurchaseOrderPackagingInstruction
        fields = ('id', 'carton', 'pack_instruction_order_packs')


class PurchaseOrderPackagingSerializer(serializers.ModelSerializer):
    pack_instructions = PurchaseOrderPackagingInstructionSerializer(source='purchaseorderpackaginginstruction_set', many=True)

    class Meta:
        model = PurchaseOrderPackaging
        fields = ('id', 'purchase_order_id', 'display_number', 'pack_instructions')


class ClubShadeSummarySerializer(serializers.ModelSerializer):
    ritz_customer_brand_reference_code = serializers.SerializerMethodField(read_only=True)
    reference_code = serializers.SerializerMethodField(read_only=True)
    shade_groups = serializers.SerializerMethodField(read_only=True)
    material_type = serializers.SerializerMethodField(read_only=True)

    def get_material_type(self, instance):
        return instance.customer_brand_material.material_type

    def get_club_supplier_pos_for_po_club(self, club_id):
        pos = SupplierPO.objects.filter(general_po_supplier__general_po__po_club_id=club_id)
        return pos

    def get_po_supplier_pos(self, po_id):
        po = PurchaseOrder.objects.get(pk=po_id)
        pos = self.get_club_supplier_pos_for_po_club(po.actual_po_club_id)
        return pos

    def get_shade_groups(self, instance):
        shades = POClubShade.objects.filter(po_club=self.context['club_id'], material=instance.customer_brand_material)
        response = POClubShadeSerializer(shades, many=True).data
        return response

    def get_ritz_customer_brand_reference_code(self, instance):
        return instance.customer_brand_material.verbose_reference_code

    def get_reference_code(self, instance):
        return instance.customer_brand_material.material_code.customer_reference_code

    class Meta:
        model = SupplierInquiryMaterialCode
        fields = ('id', 'material_type', 'ritz_customer_brand_reference_code', 'reference_code', 'shade_groups', )


class PurchaseOrderShadeSummarySerializer(serializers.ModelSerializer):
    ritz_customer_brand_reference_code = serializers.SerializerMethodField(read_only=True)
    reference_code = serializers.SerializerMethodField(read_only=True)
    shade_groups = serializers.SerializerMethodField(read_only=True)
    material_type = serializers.SerializerMethodField(read_only=True)

    def get_material_type(self, instance):
        return instance.customer_brand_material.material_type

    def get_club_supplier_pos_for_po_club(self, club_id):
        pos = SupplierPO.objects.filter(general_po_supplier__general_po__po_club_id=club_id)
        return pos

    def get_po_supplier_pos(self, po_id):
        po = PurchaseOrder.objects.get(pk=po_id)
        pos = self.get_club_supplier_pos_for_po_club(po.actual_po_club_id)
        return pos

    def get_shade_groups(self, instance):
        purchase_order = PurchaseOrder.objects.get(id=self.context['po_id'])
        shades = POClubShade.objects.filter(po_club=purchase_order.actual_po_club, material=instance.customer_brand_material)
        response = POClubShadeSerializer(shades, many=True).data
        return response

    def get_ritz_customer_brand_reference_code(self, instance):
        return instance.customer_brand_material.verbose_reference_code

    def get_reference_code(self, instance):
        return instance.customer_brand_material.material_code.customer_reference_code

    class Meta:
        model = SupplierInquiryMaterialCode
        fields = ('id', 'material_type', 'ritz_customer_brand_reference_code', 'reference_code', 'shade_groups', )


class PurchaseOrderDeliveryPackSerializer(ModelSerializer):

    class Meta:
        model = PurchaseOrderDeliveryPack
        fields = ('__all__')


class PurchaseOrderDeliverySerializer(ModelSerializer):
    purchaseorderdeliverypack_set = PurchaseOrderDeliveryPackSerializer(many=True)
    amount = serializers.SerializerMethodField()
    shipment_display_number = serializers.SerializerMethodField()

    def get_amount(self, instance):
        return get_amount_dictionary(instance.total_amount)

    def get_shipment_display_number(self, instance):
        display_number = '%s - %s - %s' % (instance.purchase_order.display_number, instance.display_number , instance.delivery_date)
        return display_number
    
    class Meta:
        model = PurchaseOrderDelivery
        fields = ('__all__')


class PurchaseOrderDeliveryUpdateSerializer(serializers.ModelSerializer):

    class Meta:
        model = PurchaseOrderDelivery
        fields = ('id', 'display_number')


class PurchaseOrderDeliveryListSerializer(ModelSerializer):
    display_number = serializers.SerializerMethodField()
    amount = serializers.SerializerMethodField()

    def get_amount(self, instance):
        return get_amount_dictionary(instance.total_amount)

    def get_display_number(self, instance):
        display_number = '%s - %s - %s' % (instance.purchase_order.display_number, instance.display_number , instance.delivery_date)
        return display_number
    
    class Meta:
        model = PurchaseOrderDelivery
        fields = ('id', 'display_number', 'amount')


class POClubColorwaySerializer(ModelSerializer):
    order_colorway_name = serializers.CharField(source='marketing_order_colorway.colorway', allow_null=True, read_only=True)
    colorway_name = serializers.CharField()

    class Meta:
        model = ActualPOClubColorway
        fields = '__all__'


class POClubCountrySerializer(ModelSerializer):
    order_country_name = serializers.CharField(source='marketing_order_country.country.name', allow_null=True, read_only=True)
    country_name = serializers.CharField()

    class Meta:
        model = ActualPOClubCountry
        fields = '__all__'


class POClubSizeSerializer(ModelSerializer):
    order_size_name = serializers.CharField(source='marketing_order_size.size.name', allow_null=True, read_only=True)
    abbreviation = serializers.CharField(source='marketing_order_size.size.abbreviation', allow_null=True, read_only=True)
    size_name = serializers.CharField()
    class Meta:
        model = ActualPOClubSize
        fields = '__all__'
        ordering = ['sorting_order']


class PurchaseOrderColorwaySerializer(ModelSerializer):
    purchase_order_display_number = serializers.CharField(source='purchase_order.display_number', read_only=True)
    po_club_colorway_name = serializers.CharField(source='po_club_colorway.colorway_name', read_only=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['po_club_colorway'].allow_null = False
        if type(self.instance) == POColorway:
            fields = ['colorway', 'purchase_order']
            for field in fields:
                self.fields[field].read_only=True

    class Meta:
        model = POColorway
        fields = '__all__'


class PurchaseOrderCountrySerializer(ModelSerializer):
    purchase_order_display_number = serializers.CharField(source='purchase_order.display_number', read_only=True)
    po_club_country_name = serializers.CharField(source='po_club_country.country_name', read_only=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['po_club_country'].allow_null = False
        if type(self.instance) == POCountry:
            fields = ['po_country_name', 'purchase_order']
            for field in fields:
                self.fields[field].read_only=True

    class Meta:
        model = POCountry
        fields = '__all__'


class PurchaseOrderSizeSerializer(ModelSerializer):
    purchase_order_display_number = serializers.CharField(source='purchase_order.display_number', read_only=True)
    po_club_size_name = serializers.CharField(source='po_club_size.size_name', read_only=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['po_club_size'].allow_null = False
        if type(self.instance) == POSize:
            fields = ['po_size_name', 'purchase_order']
            for field in fields:
                self.fields[field].read_only=True

    class Meta:
        model = POSize
        fields = '__all__'


class POClubPurchaseOrderColorwayCountrySizeListSerializer(ModelSerializer):
    po_club_id = serializers.IntegerField(source='id')
    costing_id = serializers.SerializerMethodField()
    actualpoclubcolorway_set = POClubColorwaySerializer(many=True)
    po_colorways = serializers.SerializerMethodField(read_only=True)
    order_colorways = serializers.SerializerMethodField()
    actualpoclubcountry_set = POClubCountrySerializer(many=True)
    po_countries = serializers.SerializerMethodField(read_only=True)
    order_countries = serializers.SerializerMethodField()
    actualpoclubsize_set = POClubSizeSerializer(many=True)
    po_sizes = serializers.SerializerMethodField(read_only=True)
    order_sizes = serializers.SerializerMethodField()
    mapping_completed = serializers.SerializerMethodField(read_only=True)
    costing_type = serializers.SerializerMethodField()
    is_pre_costing_complete = serializers.SerializerMethodField()

    def get_costing_id(self, obj):
        costing = obj.get_costing()
        id = None
        if costing:
            id = costing.id
        return id

    def get_po_colorways(self, obj):
        data = []
        purchase_orders = obj.get_purchase_orders().order_by('id')
        for purchase_order in purchase_orders:
            po_colorways = purchase_order.pocolorway_set.all().order_by('id')
            serializer = PurchaseOrderColorwaySerializer(po_colorways, many=True)
            data.extend(serializer.data)
        return data
    
    def get_order_colorways(self, obj):
        data = []
        pre_costing = self.context['pre_costing']
        if pre_costing:
            costing = pre_costing.order
            order_colorways = costing.get_order_colorways()
            data = OrderColorwaySerializer(order_colorways, many=True).data
        else:
            marketing_costing =  obj.get_marketing_costing()
            if marketing_costing:
                costing = marketing_costing.order
                order_colorways = costing.get_order_colorways()
                data = OrderColorwaySerializer(order_colorways, many=True).data
        return data
    
    def get_po_countries(self, obj):
        data = []
        purchase_orders = obj.get_purchase_orders().order_by('id')
        for purchase_order in purchase_orders:
            po_countries = purchase_order.pocountry_set.all().order_by('id')
            serializer = PurchaseOrderCountrySerializer(po_countries, many=True)
            data.extend(serializer.data)
        return data
    
    def get_order_countries(self, obj):
        data = []
        pre_costing = self.context['pre_costing']
        if pre_costing:
            costing = pre_costing.order
            order_countries = costing.get_order_countries()
            data = OrderCountrySerializer(order_countries, many=True).data
        else:
            marketing_costing = obj.get_marketing_costing()
            if marketing_costing:
                costing = marketing_costing.order
                order_countries = costing.get_order_countries()
                data = OrderCountrySerializer(order_countries, many=True).data
        return data
    
    def get_po_sizes(self, obj):
        data = []
        purchase_orders = obj.get_purchase_orders().order_by('id')
        for purchase_order in purchase_orders:
            po_sizes = purchase_order.posize_set.all().order_by('po_club_size__sorting_order')
            serializer = PurchaseOrderSizeSerializer(po_sizes, many=True)
            data.extend(serializer.data)
        return data
    
    def get_order_sizes(self, obj):
        data = []
        pre_costing = self.context['pre_costing']
        if pre_costing:
            costing = pre_costing.order
            order_sizes = costing.get_order_sizes().order_by('size__sorting_order')
            data = OrderSizeSerializer(order_sizes, many=True).data
        else:
            marketing_costing = obj.get_marketing_costing()
            if marketing_costing:
                costing = marketing_costing.order
                order_sizes = costing.get_order_sizes().order_by('size__sorting_order')
                data = OrderSizeSerializer(order_sizes, many=True).data
        return data

    def get_mapping_completed(self, obj):
        return obj.is_po_club_colorways_mapping_completed()
    
    def get_costing_type(self, instance):
        costing_type = None
        pre_costing = instance.pre_costing
        marketing_costing = instance.get_marketing_costing()
        if pre_costing:
            costing_type = pre_costing.costing_type
        else:
            costing_type = marketing_costing.costing_type
        return costing_type
    
    def get_costing_and_type(self):
        pre_costing = self.po_club.pre_costing
        marketing_costing = self.po_club.get_marketing_costing()
        return pre_costing, marketing_costing
    
    def to_representation(self, instance):
        response = super().to_representation(instance)
        response["actualpoclubsize_set"] = sorted(response["actualpoclubsize_set"], key=lambda x: x["sorting_order"])
        return response
    
    def get_is_pre_costing_complete(self, instance):
        is_pre_costing_complete = True
        is_exist_incomplete_colrways = instance.actualpoclubcolorway_set.filter(pre_costing_order_colorway=None).exists()
        is_exist_incomplete_countries = instance.actualpoclubcountry_set.filter(pre_costing_order_country=None).exists()
        is_exist_incomplete_sizes = instance.actualpoclubsize_set.filter(pre_costing_order_size=None).exists()
        if is_exist_incomplete_colrways or is_exist_incomplete_countries or is_exist_incomplete_sizes:
            is_pre_costing_complete = False
        return is_pre_costing_complete

    class Meta:
        model = ActualPOClub
        fields = ['po_club_id', 'costing_id', 'actualpoclubcolorway_set', 'po_colorways', 'order_colorways',
                  'actualpoclubcountry_set', 'po_countries', 'order_countries', 
                  'actualpoclubsize_set', 'po_sizes', 'order_sizes', 'mapping_completed', 'costing_type', 'is_pre_costing_complete', 'state']


class OrderInquiryWidgetSerializer(ModelSerializer):
    costing_versions = serializers.SerializerMethodField()
    display_number = serializers.SerializerMethodField()
    tech_packs = serializers.SerializerMethodField()

    def get_costing_versions(self, instance):
        data = []
        for version in instance.get_order_versions().filter(costing_type=OrderCostingVersion.MARKETING_COSTING):
            version_data = {
                'id': version.id,
                'display_number': version.display_number,
                'short_code': version.short_code,
                'long_code': version.long_code,
                'version_display_number': version.version_display_number,
                'approved': version.approved,
                'po_clubs': []
            }
            po_clubs = version.get_marketing_po_clubs()
            for po_club in po_clubs:
                po_club_data = {
                    'id': po_club.id,
                    'display_number': po_club.display_number,
                    'short_code': po_club.short_code,
                    'long_code': po_club.long_code,
                    'is_single_po': po_club.is_single_po,
                    'purchase_orders': [],
                    'pre_costing': {}
                }
                purcahse_orders = po_club.get_purchase_orders()
                for purchase_order in purcahse_orders:
                    purchase_order_data = {
                        'id': purchase_order.id,
                        'display_number': purchase_order.display_number,
                        'short_code': purchase_order.short_code,
                        'long_code': purchase_order.long_code,
                        'customer_po_number': purchase_order.name
                    }
                    po_club_data['purchase_orders'].append(purchase_order_data)

                pre_costing = po_club.get_pre_cositng()
                if pre_costing:
                    po_club_data['pre_costing'] = {
                        'id': pre_costing.id,
                        'display_number': pre_costing.display_number,
                        'short_code': pre_costing.short_code,
                        'long_code': pre_costing.long_code,
                        'version_display_number': pre_costing.version_display_number,
                        'order_id': pre_costing.order.id,
                        'order_display_number': pre_costing.order.display_number,
                        'approved': pre_costing.approved,
                    }
                version_data['po_clubs'].append(po_club_data)
            data.append(version_data)
        return data
    
    def get_display_number(self, instance):
        return instance.display_number
    
    def get_display_number(self, instance):
        return instance.display_number
    
    def get_display_number(self, instance):
        return instance.display_number
    
    def get_tech_packs(self, instance):
        data = []
        tech_packs = instance.tech_packs.all()
        for tech_pack in tech_packs:
            data.append(tech_pack.get_object_data())
        return data

    class Meta:
        model = OrderInquiry
        fields = ['id', 'display_number', 'short_code', 'long_code', 'tech_packs', 'costing_versions']


# class POClubWidgetSerializer(ModelSerializer):
#     data = serializers.SerializerMethodField()
    
#     PURCHASE_ORDER_LABEL_KEY = "Purchase Order's"
#     SUPPLIER_PO_LABEL_KEY = "Supplier PO's"
#     GRN_LABEL_KEY = "GRN's"
#     PRE_COSTING_LABEL_KEY = 'Pre Costing'
#     MARKETING_COSTING_LABEL_KEY = 'Marketing Costing'

#     def get_data(self, instance):
#         data = {}
#         supplier_pos = instance.get_supplier_pos()
#         purchase_orders = instance.get_purchase_orders()
#         marketing_costing = instance.get_marketing_costing()
#         pre_costing = instance.pre_costing

#         if pre_costing:
#             if self.PRE_COSTING_LABEL_KEY not in data:
#                 data[self.PRE_COSTING_LABEL_KEY] = {}
#             data[self.PRE_COSTING_LABEL_KEY] = {
#                 'id': pre_costing.id,
#                 'display_number': pre_costing.display_number,
#                 'version_display_number': pre_costing.version_display_number,
#             }

#         if marketing_costing:
#             if self.MARKETING_COSTING_LABEL_KEY not in data:
#                 data[self.MARKETING_COSTING_LABEL_KEY] = {}
#             data[self.MARKETING_COSTING_LABEL_KEY] = {
#                 'id': marketing_costing.id,
#                 'display_number': marketing_costing.display_number,
#                 'version_display_number': marketing_costing.version_display_number,
#             }

#         for purchase_order in purchase_orders:
#             if self.PURCHASE_ORDER_LABEL_KEY not in data:
#                 data[self.PURCHASE_ORDER_LABEL_KEY] = []
#             data[self.PURCHASE_ORDER_LABEL_KEY].append({
#                 'id': purchase_order.id,
#                 'display_number': purchase_order.display_number
#             })

#         for supplier_po in supplier_pos:
#             if self.SUPPLIER_PO_LABEL_KEY not in data:
#                 data[self.SUPPLIER_PO_LABEL_KEY] = []
#             data[self.SUPPLIER_PO_LABEL_KEY].append({
#                 'id': supplier_po.id,
#                 'display_number': supplier_po.supplier_po_number
#             })

#         grns = SupplierPOGRN.objects.filter(supplier_po__in=supplier_pos)
#         for grn in grns:
#             if self.GRN_LABEL_KEY not in data:
#                 data[self.GRN_LABEL_KEY] = []
#             data[self.GRN_LABEL_KEY].append({
#                 'id': grn.id,
#                 'display_number': grn.grn_number
#             })
#         return data

#     class Meta:
#         model = ActualPOClub
#         fields = ['id', 'display_number', 'data']


class POClubWidgetSerializer(ModelSerializer):
    data = serializers.SerializerMethodField()

    def get_data(self, instance):
        data = {
            'pre_costing': {},
            'marketing_costing': {},
            'purchase_orders': [],
            'supplier_pos': [],
            'grns': []
        }
        supplier_pos = instance.get_supplier_pos()
        purchase_orders = instance.get_purchase_orders()
        marketing_costing = instance.get_marketing_costing()
        pre_costing = instance.pre_costing

        if pre_costing:
            data['pre_costing'] = {
                'id': pre_costing.id,
                'display_number': pre_costing.display_number,
                'version_display_number': pre_costing.version_display_number,
                'order_id': pre_costing.order.id,
                'order_display_number': pre_costing.order.display_number,
            }

        if marketing_costing:
            data['marketing_costing']  = {
                'id': marketing_costing.id,
                'display_number': marketing_costing.display_number,
                'version_display_number': marketing_costing.version_display_number,
                'order_id': marketing_costing.order.id,
                'order_display_number': marketing_costing.order.display_number,
            }

        for purchase_order in purchase_orders:
            data['purchase_orders'].append({
                'id': purchase_order.id,
                'display_number': purchase_order.display_number
            })

        for supplier_po in supplier_pos:
            data['supplier_pos'].append({
                'id': supplier_po.id,
                'display_number': supplier_po.supplier_po_number,
                'file': supplier_po.supplier_po_file.get_object_data() if supplier_po.supplier_po_file else {}
            })

        grns = SupplierPOGRN.objects.filter(supplier_po__in=supplier_pos)
        for grn in grns:
            data['grns'].append({
                'id': grn.id,
                'display_number': grn.grn_number
            })
        return data

    class Meta:
        model = ActualPOClub
        fields = ['id', 'display_number', 'data']


class OrderVersionMinimalSerializer(ModelSerializer):

    class Meta:
        model = OrderCostingVersion
        fields = ('id', 'display_number',)


class SupplierInquiryCostingVersionSerializer(ModelSerializer):
    supplier_name = serializers.CharField(source='supplier_inquiry.supplier.name')
    headers = serializers.SerializerMethodField()
    material_details = serializers.SerializerMethodField()

    def get_material_details(self, instance):
        return instance.supplier_inquiry.customer_brand_material.get_attributes()
    
    def get_headers(self, instance):
        return instance.supplier_inquiry.customer_brand_material.material_detail.generic_material.user_material.get_material_headers(instance.supplier_inquiry.customer_brand_material.material_detail.generic_material.user_material.name)

    class Meta:
        model = SupplierInquiryCostingVersion
        fields = ('__all__')


class OrderPlacementSpeedConsumptionSerializer(ModelSerializer):
    pack_items = serializers.SerializerMethodField()
    no_of_products = serializers.SerializerMethodField()
    order_quantity = serializers.SerializerMethodField()
    item_data = serializers.SerializerMethodField()
    send_to_cad_status = serializers.SerializerMethodField()
    total_yy = serializers.SerializerMethodField()

    def get_pack_items(self, instance):
        order_items = instance.order.get_order_items()
        return " / ".join(f"{order_item.item_display}" for order_item in order_items)

    def get_order_quantity(self, instance):
        total_order_quantity = OrderPack.objects.filter(version=instance).aggregate(total=Sum('cad_quantity'))['total']
        return total_order_quantity

    def get_no_of_products(self, instance):
        return instance.order.get_order_items().count()

    def get_item_data(self, instance):
        return instance.order.get_order_items().count()

    def get_item_data(self, instance):
        order_placement_ids = OrderPackItemPlacement.objects.filter(order_pack_item__pack__version=instance).values_list('item_attribute_other', flat=True)
        order_placements = OrderPlacement.objects.filter(id__in=order_placement_ids, type=Material.FABRIC_MATERIAL)
        items = Item.objects.filter(id__in=order_placements.values_list('item', flat=True))
        data = []

        for item in items:
            item_data = {
                'id': item.id,
                'name': item.name,
                'ratio': 0, # TODO nedded to develop mahesh
                'placements': [],
                'images': []
            }
            attachemt_ids = list(OrderItem.objects.filter(order=instance.order, item=item).values_list('image', flat=True)) + \
                            list(ColorwayItemType.objects.filter(item__item=item, item__order=instance.order).values_list('image', flat=True))
            attachments = FileAttachment.objects.filter(id__in=attachemt_ids)
            image_data = FileAttachmentSerializer(attachments, many=True).data
            item_data['images'] = image_data
            order_placements = order_placements.filter(item=item).order_by('id')
            for order_placement in order_placements:
                item_pacement_data = {
                    'id': order_placement.id,
                    'name': order_placement.name,
                    'estimated_consumption_ratio': order_placement.estimated_consumption_ratio,
                    'estimated_consumption_ratio_units': order_placement.estimated_consumption_ratio_units,
                    'estimated_consumption_ratio_units_display': (order_placement.get_estimated_consumption_ratio_units_display() if order_placement.estimated_consumption_ratio_units else None)
                }
                item_data['placements'].append(item_pacement_data)
            data.append(item_data)
        return data

    def get_total_yy(self, instance):
        total_yy = 0
        order_placements = OrderPlacement.objects.filter(version=instance, type=Material.FABRIC_MATERIAL)
        items = Item.objects.filter(id__in=order_placements.values_list('item', flat=True))
        for item in items:
            order_placements = order_placements.filter(item=item).order_by('id')
            for order_placement in order_placements:
                if order_placement.estimated_consumption_ratio:
                    total_yy += order_placement.estimated_consumption_ratio
        return total_yy

    def get_send_to_cad_status(self, instance):
        action_tasks = ActionTask.objects.filter(
            task_name=COSTING_SPEED_CONSUMPTION_DESCRIPTION,
            entity__contains=[{"entity_id": instance.id}]
        )
        return action_tasks.exists()

    class Meta:
        model = OrderCostingVersion
        fields = ('id', 'pack_items', 'no_of_products', 'order_quantity', 'total_yy', 'item_data', 'send_to_cad_status')


class OrderItemSpeedConsumptionSerializer(ModelSerializer):
    order = serializers.CharField(source='order.short_code')
    item_name = serializers.CharField(source='item.name')
    ratio = serializers.SerializerMethodField()
    placements = serializers.SerializerMethodField()
    image = FileAttachmentSerializer()
    latest_version_id = serializers.SerializerMethodField()

    def get_item_name(self, instance):
        item_name = '%s (%s)' % (instance.item.item_display, instance.pack.colorway.colorway)
        return item_name

    def get_ratio(self, instance):
        return 0

    def get_placements(self, instance):
        placements = OrderPlacement.objects.filter(item=instance.item, version__order=instance.order, type=Material.FABRIC_MATERIAL)
        data = []
        other_parts_total = 0
        for placement in placements:
            if placement.name in ['Body Fabric', 'Shell Fabric']:
                placement_data = {
                    'name': placement.name,
                    'estimated_consumption_ratio': placement.estimated_consumption_ratio
                }
                data.append(placement_data)
            else:
                if placement.estimated_consumption_ratio:
                    other_parts_total += placement.estimated_consumption_ratio
        if other_parts_total == 0:
            data.append({
            'name': 'Other Parts',
            'estimated_consumption_ratio': None
        })
        else:
            data.append({
            'name': 'Other Parts',
            'estimated_consumption_ratio': other_parts_total
        })
        return data

    def get_latest_version_id(self, instance):
        latest_version_id = None
        latest_version = instance.order.get_order_versions().order_by('created')
        if latest_version.exists():
            latest_version_id = latest_version[0].pk
        return latest_version_id

    class Meta:
        model = OrderItem
        fields = ('id', 'order', 'order_id', 'item_name', 'ratio', 'placements', 'image', 'latest_version_id')


class OrderPlacementSpeedConsumptionCADSerializer(ModelSerializer):
    pack_items = serializers.SerializerMethodField()
    no_of_products = serializers.SerializerMethodField()
    order_quantity = serializers.SerializerMethodField()
    item_data = serializers.SerializerMethodField()
    tech_packs = serializers.SerializerMethodField()

    def get_pack_items(self, instance):
        order_items = instance.order.get_order_items()
        return " / ".join(f"{order_item.item_display}" for order_item in order_items)

    def get_order_quantity(self, instance):
        total_order_quantity = OrderPack.objects.filter(version=instance).aggregate(total=Sum('cad_quantity'))['total']
        return total_order_quantity

    def get_no_of_products(self, instance):
        return instance.order.get_order_items().count()

    def get_item_data(self, instance):
        return instance.order.get_order_items().count()

    def get_item_data(self, instance):
        order_placement_ids = OrderPackItemPlacement.objects.filter(order_pack_item__pack__version=instance).values_list('item_attribute_other', flat=True)
        order_placements = OrderPlacement.objects.filter(id__in=order_placement_ids, type=Material.FABRIC_MATERIAL)
        items = Item.objects.filter(id__in=order_placements.values_list('item', flat=True))
        data = []

        for item in items:
            item_data = {
                'id': item.id,
                'name': item.name,
                'placements': [],
                'images': []
            }
            attachemt_ids = list(OrderItem.objects.filter(order=instance.order, item=item).values_list('image', flat=True)) + \
                            list(ColorwayItemType.objects.filter(item__item=item, item__order=instance.order).values_list('image', flat=True))
            attachments = FileAttachment.objects.filter(id__in=attachemt_ids)
            image_data = FileAttachmentSerializer(attachments, many=True).data
            item_data['images'] = image_data
            order_placements = order_placements.filter(item=item).order_by('id')
            for order_placement in order_placements:
                material_state = False
                material_id = None
                materials = self.get_materials(order_placement)
                if materials:
                    if materials.count() == 1:
                        material_id = materials[0].id
                    material_state = True
                item_pacement_data = {
                    'id': order_placement.id,
                    'name': order_placement.name,
                    'material_id': material_id,
                    'material_state': material_state,
                    'estimated_consumption_ratio': order_placement.estimated_consumption_ratio
                }
                item_data['placements'].append(item_pacement_data)
            data.append(item_data)
        return data

    def get_tech_packs(self, instance):
        tech_packs = instance.order.tech_packs.all()
        data = FileAttachmentSerializer(tech_packs, many=True).data
        return data

    def get_materials(self, order_placement):
        material_ids = OrderPackItemPlacementMaterial.objects.filter(
            placement__item_attribute_other=order_placement
        ).values_list('material', flat=True)
        materials = CustomerBrandMaterial.objects.filter(id__in=material_ids)
        return materials

    class Meta:
        model = OrderCostingVersion
        fields = ('id', 'order_id',  'pack_items', 'display_number', 'short_code', 'long_code', 'no_of_products', 'order_quantity', 'item_data', 'tech_packs')


class OrderInquiryWithoutCostingSerializer(DetailedOrderInquirySerializer):
    class Meta:
        model = OrderInquiry
        fields = [
            'id', 'display_number', 'short_code', 'long_code', 'season',
            'pack_type_id', 'pack_type', 'costing_method', 'size_category', 'number_of_colorways',
            'quantity_per_pack', 'items', 'latest_version_id', 'state', 'order_program',
            'order_program_display_number', 'ritz_code'
        ]


class OrderCostingVersionDetailSerializer(ModelSerializer):
    customer = serializers.CharField(source='order.customer.name', read_only=True)
    brand_name = serializers.CharField(source='order.brand.name', read_only=True)
    date = serializers.DateField(source='order.date', read_only=True)
    year = serializers.IntegerField(source='order.year', read_only=True)
    style_number = serializers.CharField(source='order.style_number', read_only=True)
    costing_type_display_value = serializers.SerializerMethodField()
    version_state_display_value = serializers.SerializerMethodField()
    order_inquiry_details = OrderInquiryWithoutCostingSerializer(source='order', read_only=True)
    
    class Meta:
        model = OrderCostingVersion
        fields = [
            'id', 'version_display_number', 'ritz_code', 'display_number', 'short_code',
            'long_code', 'version', 'name', 'customer', 'brand_name',
            'date', 'year', 'style_number', 'costing_type', 'costing_type_display_value', 'version_state', 'version_state_display_value', 'order_inquiry_details'
        ]

    def get_costing_type_display_value(self, obj):
        return obj.get_costing_type_display()
    
    def get_version_state_display_value(self, obj):
        return obj.get_version_state_display()
    
class SupplierDeliveryInvoiceActionSerializer(ModelSerializer):
    invoice = serializers.SerializerMethodField(read_only=True)
    issues = serializers.SerializerMethodField()
    reasons = serializers.SerializerMethodField()
    material_types = serializers.SerializerMethodField()
    solutions = serializers.SerializerMethodField()
    is_solution_found = serializers.SerializerMethodField()
    attend_to_find_solution = serializers.SerializerMethodField() 

    def get_invoice(self, instance):
        data = {}
        if instance.invoice:
            data = instance.invoice.get_object_data()
        return data
    
    def get_issues(self, instance):
        data = []
        grns = instance.get_all_invoice_grns()
        batches = FabricGRNBatchNumber.objects.filter(
            grn_material__supplier_po_grn__in=grns
        )
        
        grn_materials = SupplierPOGRNMaterial.objects.filter(
            supplier_po_grn__in=grns
        )
        for batch in batches:
            grn_material_details = SupplierPOGRNMaterialDetail.objects.filter(supplier_po_grn_material=batch.grn_material)
            if batch.get_color_tone_rejected_rolls(grn_material_details):
                batch_data = {
                    'reason': ReplacementQuantityDeliveryDate.COLOR_TONE_REJECTED_REPLACEMENT_REASON,
                    'reason_display': dict(ReplacementQuantityDeliveryDate.REASON_CHOICES).get(ReplacementQuantityDeliveryDate.COLOR_TONE_REJECTED_REPLACEMENT_REASON),
                    'status': True
                }
                if batch_data not in data:
                    data.append(batch_data)

        for grn_material in grn_materials:
            if grn_material.total_qa_rejected_quantity and grn_material.total_qa_rejected_quantity > 0:
                grn_material_data = {
                    'reason': ReplacementQuantityDeliveryDate.DEFECT_REJECTED_REPLACEMENT_REASON,
                    'reason_display': dict(DebitNoteMaterial.REASON_CHOICES).get(DebitNoteMaterial.REJECTED_DEFECT_DEBIT_NOTE_REASON),
                    'status': True
                }
                if grn_material_data not in data:
                    data.append(grn_material_data)

        for grn_material in grn_materials:
            if grn_material.mismatch_quantity and grn_material.mismatch_quantity < 0:
                grn_material_data = {
                    'reason': DebitNoteMaterial.MISMATCH_REASON,
                    'reason_display': dict(DebitNoteMaterial.REASON_CHOICES).get(DebitNoteMaterial.MISMATCH_REASON),
                    'status': True
                }
                if grn_material_data not in data:
                    data.append(grn_material_data)

        for grn_material in grn_materials:
            if grn_material.mismatch_quantity and grn_material.total_deficit_quantity > 0:
                grn_material_data = {
                    'reason': DebitNoteMaterial.SHORT_REASON,
                    'reason_display': dict(DebitNoteMaterial.REASON_CHOICES).get(DebitNoteMaterial.SHORT_REASON),
                    'status': True
                }
                if grn_material_data not in data:
                    data.append(grn_material_data)

        for grn_material in grn_materials:
            if grn_material.width_replacement_quantity and grn_material.width_replacement_quantity > 0:
                grn_material_data = {
                    'reason': ReplacementQuantityDeliveryDate.WIDTH_MISMATCH_REPLACEMENT_REASON,
                    'reason_display': dict(ReplacementQuantityDeliveryDate.REASON_CHOICES).get(ReplacementQuantityDeliveryDate.WIDTH_MISMATCH_REPLACEMENT_REASON),
                    'status': True
                }
                if grn_material_data not in data:
                    data.append(grn_material_data)
                    
        return data
    
    def get_reasons(self, instance):
        reasons = DebitNoteMaterial.objects.filter(supplier_po_grn_material__supplier_po_grn__supplier_pack_list__supplier_po_delivery_note__supplier_po_delivery_invoice=instance).values_list('reason', flat=True)
        return reasons
    
    def get_material_types(self, instance):
        material_types = instance.get_material_types()
        return material_types
    
    def get_solutions(self, instance):
        data = {
            'debit_notes': [],
            'replacements': []
        }
        debit_notes = DebitNote.objects.filter(commercial_invoice=instance)
        for debit_note in debit_notes:
            debit_note_data = {
                'id': debit_note.id,
                'display_number': debit_note.display_number,
                'state_display': debit_note.get_status_display(),
                'debit_note_materials':[]
            }
            for debit_note_material in debit_note.debitnotematerial_set.all():
                headers = UserDefinedMaterial.get_material_headers(debit_note_material.supplier_po_grn_material.grn_material.customer_brand_material.material_type)
                debit_note_data['debit_note_materials'].append({
                    'id': debit_note_material.id,
                    'category': debit_note_material.supplier_po_grn_material.grn_material.customer_brand_material.material_category,
                    'attributes': debit_note_material.supplier_po_grn_material.grn_material.customer_brand_material.get_attributes(),
                    'headers': headers,
                    'total_quantity': debit_note_material.get_total_quantity(),
                    'total_price': debit_note_material.get_total_price(),
                    'reason': debit_note_material.get_reason_display()
                })
            data['debit_notes'].append(debit_note_data)

        replacements = ReplacementQuantityDeliveryDate.objects.filter(supplier_po_grn_material__supplier_po_grn__supplier_pack_list__supplier_po_delivery_note__supplier_po_delivery_invoice=instance)
        for replacement in replacements:
            headers = UserDefinedMaterial.get_material_headers(replacement.supplier_po_grn_material.grn_material.customer_brand_material.material_type)
            replacement_data = {
                'id': replacement.id,
                'status_display': replacement.get_reason_display(),
                'replacement_expected_delivery_date': replacement.replacement_expected_delivery_date.confirmed_delivery_date,
                'category': replacement.supplier_po_grn_material.grn_material.customer_brand_material.material_category,
                'attributes': replacement.supplier_po_grn_material.grn_material.customer_brand_material.get_attributes(),
                'headers': headers,
                'total_quantity': replacement.get_quantity_details(),
                'reason': replacement.get_reason_display()
            }
            data['replacements'].append(replacement_data)
        return data
    
    def get_is_solution_found(self, instance):
        is_exists = True
        debit_notes = DebitNote.objects.filter(commercial_invoice=instance)
        if debit_notes.exists():
            is_exists = DebitNote.objects.filter(commercial_invoice=instance).exclude(status__in=[DebitNote.COMPLETE_STATE, DebitNote.CANCELED_STATE]).exists()
        return not is_exists
    
    def get_attend_to_find_solution(self, instance):
        attend_to_find_solution = False
        issues_list = self.get_issues(instance)
        reasons = []
        for row in issues_list:
            reasons.append(row['reason'])
            
        attend_solutions = DebitNoteMaterial.objects.filter(debit_note__commercial_invoice=instance).count()
        is_solution_found = self.get_is_solution_found(instance)
        if (len(reasons) > attend_solutions and attend_solutions > 0) or (len(reasons) == attend_solutions and attend_solutions > 0 and not is_solution_found):
            attend_to_find_solution = True
        return attend_to_find_solution
    
    class Meta:
        model = SupplierPODeliveryInvoice
        fields = ('id', 'display_number', 'supplier_invoice_number', 'invoice', 'ci_state', 'get_ci_state_display', 'reasons', 'issues', 
                  'material_types', 'solutions', 'is_solution_found', 'attend_to_find_solution')
    

class SupplierDeliveryDateActionSerializer(ModelSerializer):
    invoice = serializers.SerializerMethodField()
    costing_or_po_club_data = serializers.SerializerMethodField()

    def get_costing_or_po_club_data(self, instance):
        data = {}
        costing_or_po_club = instance.get_costing_or_po_club()
        if isinstance(costing_or_po_club, ActualPOClub):
            data = {
                'type': 'po_club',
                'id': costing_or_po_club.id,
                'display_number': costing_or_po_club.display_number,
                'long_code': costing_or_po_club.long_code,
                'short_code': costing_or_po_club.short_code,
            }
        elif isinstance(costing_or_po_club, OrderCostingVersion):
            data = {
                'type': 'costing',
                'id': costing_or_po_club.id,
                'display_number': costing_or_po_club.display_number,
                'long_code': costing_or_po_club.long_code,
                'short_code': costing_or_po_club.short_code,
            }
        return data
    
    def get_invoice(self, instance):
        data = None
        if instance.get_delivery_invoice():
            data = SupplierDeliveryInvoiceActionSerializer(instance.get_delivery_invoice()).data
        return data

    class Meta:
        model = SupplierDeliveryDate
        fields = ('id', 'display_number', 'confirmed_delivery_date', 'costing_or_po_club_data', 'invoice')


class SupplierPOActionSerializer(ModelSerializer):
    deliveries = serializers.SerializerMethodField()

    def get_deliveries(self, instance):
        data = []
        delivery_dates = instance.supplier_po_delivery_dates
        for delivery_date in delivery_dates:
            if delivery_date.actual_delivery_date and delivery_date.actual_delivery_date.supplier_po_delivery_invoice:
                serialize_data = SupplierDeliveryDateActionSerializer(delivery_date, many=False).data
                data.append(serialize_data)
        return data

    class Meta:
        model = SupplierPO
        fields = ('id', 'supplier_po_number', 'deliveries')


class BOMChangeRequestSerailizer(ModelSerializer):
    display_number = serializers.SerializerMethodField()
    creater_name = serializers.CharField(source='creator.first_name')
    state_display = serializers.CharField(source='get_state_display')
    po_club_id = serializers.IntegerField(source='po_club.id')
    po_club_display_name = serializers.CharField(source='po_club.display_number')
    po_club_short_name = serializers.CharField(source='po_club.short_code')
    po_club_long_name = serializers.CharField(source='po_club.long_code')
    pre_costing_id = serializers.IntegerField(source='po_club.pre_costing.id')
    pre_costing_order_id = serializers.IntegerField(source='po_club.pre_costing.order.id')
    pre_costing_display_name = serializers.CharField(source='po_club.pre_costing.display_number')
    pre_costing_short_name = serializers.CharField(source='po_club.pre_costing.short_code')
    pre_costing_long_name = serializers.CharField(source='po_club.pre_costing.long_code')
    marketing_costing_id = serializers.IntegerField(source='po_club.marketing_costing.id')
    marketing_costing_order_id = serializers.IntegerField(source='po_club.marketing_costing.order.id')
    marketing_costing_display_name = serializers.CharField(source='po_club.marketing_costing.display_number')
    marketing_costing_short_name = serializers.CharField(source='po_club.marketing_costing.short_code')
    marketing_costing_long_name = serializers.CharField(source='po_club.marketing_costing.long_code')
    bcr_type = serializers.SerializerMethodField()

    def get_display_number(self, instance):
        return instance.display_number

    def get_bcr_type(self, instance):
        bcr_type = None
        changes_types = instance.bomchangerequestchangetype_set.all()
        if changes_types:
            bcr_type = changes_types[0].get_state_display()
        return bcr_type

    class Meta:
        model = BOMChangeRequest
        fields = ('__all__')


class BOMChangeRequestConsumptionChangeSerializer(ModelSerializer):
    placement_type = serializers.SerializerMethodField()
    material_id = serializers.SerializerMethodField()
    old_consumption_ratio = serializers.DecimalField(max_digits=6, decimal_places=2)
    old_wastage = serializers.DecimalField(max_digits=6, decimal_places=2)
    new_consumption_ratio = serializers.DecimalField(max_digits=6, decimal_places=2)
    new_wastage = serializers.DecimalField(max_digits=6, decimal_places=2)

    def get_material_id(self, instance):
        material_id = None
        if isinstance(instance.entity, POPackItemPlacement):
            material_id = instance.po_pack_item_placement.po_material.id
        elif isinstance(instance.entity, POPackPlacement):
            material_id = instance.po_pack_placement.po_material.id
        return material_id

    def get_placement_type(self, instance):
        placement_type = None
        if isinstance(instance.entity, POPackItemPlacement):
            placement_type = 'po_pack_item_placement'
        elif isinstance(instance.entity, POPackPlacement):
            placement_type = 'po_pack_placement'
        return placement_type

    class Meta:
        model = BOMChangeRequestConsumptionChange
        fields = ('__all__')


class BOMChangeRequestMaterialChangeSerializer(ModelSerializer):
    supplier_id = serializers.IntegerField()
    old_material_category = serializers.CharField(source='old_material.material_category')
    new_material_category = serializers.CharField(source='new_material.material_category')
    ratios = serializers.SerializerMethodField()
    supplier_inquiry_data = serializers.SerializerMethodField()

    def get_ratios(self, instance):
        data = []
        ratios = BOMChangeRequestMaterialAppliedPackandPackItemPlacements.objects.filter(bom_change_request_material_change=instance)
        for ratio in ratios:
            ratio_data = {
                'id': ratio.entity_id,
                'consumption': ratio.new_consumption_ratio,
                'wastage': ratio.new_wastage,
                'po_material': ratio.po_material.id
            }
            data.append(ratio_data)
        return data

    def get_supplier_inquiry_data(self, instance):
        data = {
            'supplier_id': instance.supplier_id,
            'cutting_width': instance.cutting_width,
            'cutting_width_unit': instance.cutting_width_unit,
            'costing_unit': instance.costing_unit,
            'cost_per_unit': instance.cost_per_unit,
            'fob_price': instance.fob_price,
            'cif_price': instance.cif_price,
            'transport_charges': instance.transport_charges,
            'ex_work_price': instance.ex_work_price,
            'expiration_date': instance.expiration_date,
            'lead_time': instance.lead_time,
            'minimum_order_quantity': instance.minimum_order_quantity,
            'minimum_order_quantity_units': instance.minimum_order_quantity_units,
            'excess_threshold': instance.excess_threshold,
            'cost_per_unit_type': instance.cost_per_unit_type,
            'ship_mode': instance.ship_mode,
            'pay_mode': instance.pay_mode,
            'supplier_material_reference_code': instance.supplier_inquiry_material_code.supplier_material_reference_code if instance.supplier_inquiry_material_code else None
        }
        return data

    class Meta:
        model = BOMChangeRequestMaterialChange
        fields = ('__all__')


class BOMChangeRequestPriceChangeSerializer(ModelSerializer):

    class Meta:
        model = BOMChangeRequestPriceChange
        fields = ('__all__')


class BOMChangeRequestSupplierChangeSerializer(ModelSerializer):
    supplier_id = serializers.IntegerField()
    cancelled_spos = serializers.SerializerMethodField()
    supplier_material_reference_code = serializers.CharField(source='supplier_inquiry_material_code.supplier_material_reference_code')

    def get_cancelled_spos(self, instance):
        supplier_po_ids = GeneralPOMaterialQuantity.objects.filter(
            material=instance.material,
            general_po__po_club=instance.bom_change_request_type.bom_change_request.po_club
        ).values_list('default_material_supplier__general_po_supplier__supplierpo', flat=True).distinct()
        supplier_pos = SupplierPO.objects.filter(id__in=supplier_po_ids, state=SupplierPO.CANCEL_STATE).order_by('id')
        data = []
        for supplier_po in supplier_pos:
            data.append(supplier_po.id)
        return data

    class Meta:
        model = BOMChangeRequestSupplierChange
        fields = ('__all__')



class BOMChangeRequestChangeTypeSerializer(ModelSerializer):
    state_display = serializers.CharField(source='get_state_display')
    bom_change_request_consumption_changes = serializers.SerializerMethodField()
    bom_change_request_material_change = serializers.SerializerMethodField()
    bom_change_request_price_changes = serializers.SerializerMethodField()
    supplier_inquiry_data = serializers.SerializerMethodField()
    material_id = serializers.SerializerMethodField()
    material_category = serializers.SerializerMethodField()
    void_markers = serializers.SerializerMethodField()
    select_markers = serializers.SerializerMethodField()

    def get_void_markers(self, instance):
        void_marker_ids = instance.bomchangerequestfabricvoidmarker_set.all().values_list('void_marker', flat=True)
        return void_marker_ids

    def get_select_markers(self, instance):
        marker_ids = instance.bomchangerequestfabricmarker_set.all().values_list('marker', flat=True)
        return marker_ids

    def get_bom_change_request_consumption_changes(self, instance):
        qs = instance.bomchangerequestconsumptionchange_set.all()
        data = BOMChangeRequestConsumptionChangeSerializer(qs, many=True).data
        return data

    def get_bom_change_request_material_change(self, instance):
        data = None
        qs = instance.bomchangerequestmaterialchange_set.all()
        if qs:
            bom_change_request_material_change = qs[0]
            data = BOMChangeRequestMaterialChangeSerializer(bom_change_request_material_change, many=False).data
        return data

    def get_bom_change_request_price_changes(self, instance):
        qs = instance.bomchangerequestpricechange_set.all()
        data = BOMChangeRequestPriceChangeSerializer(qs, many=True).data
        return data

    def get_supplier_inquiry_data(self, instance):
        data = {}
        qs = instance.bomchangerequestsupplierchange_set.all()
        if qs:
            bom_change_request_supplier_change = qs[0]
            data = BOMChangeRequestSupplierChangeSerializer(bom_change_request_supplier_change, many=False).data
        return data

    def get_material_id(self, instance):
        material_id = None
        if instance.state == BOMChangeRequestChangeType.CONSUMPTION_CHANGE:
            bom_change_request_consumption_changes = instance.bomchangerequestconsumptionchange_set.all()
            for bom_change_request_consumption_change in bom_change_request_consumption_changes:
                if isinstance(bom_change_request_consumption_change.entity, POPackItemPlacement):
                    po_pack_item_placement = get_object_or_404(POPackItemPlacement, pk=bom_change_request_consumption_change.entity_id)
                    material_id = po_pack_item_placement.po_material.id
                    break
                elif isinstance(bom_change_request_consumption_change.entity, POPackPlacement):
                    po_pack_placement = get_object_or_404(POPackPlacement, pk=bom_change_request_consumption_change.entity_id)
                    material_id = po_pack_placement.po_material.id
                    break
            marker_ids = self.get_select_markers(instance)
            makers = POFabricMarker.objects.filter(id__in=marker_ids)
            for maker in makers:
                material_id = maker.po_material.id
                break
        return material_id

    def get_material_category(self, instance):
        material_category = None
        if instance.state == BOMChangeRequestChangeType.CONSUMPTION_CHANGE:
            material_id = self.get_material_id(instance)
            material = get_object_or_404(CustomerBrandMaterial, pk=material_id)
            material_category = material.material_category
        return material_category

    class Meta:
        model = BOMChangeRequestChangeType
        fields = ('__all__')


class BOMChangeRequestDetailSerailizer(ModelSerializer):
    display_number = serializers.SerializerMethodField()
    creater_name = serializers.CharField(source='creator.first_name')
    state_display = serializers.CharField(source='get_state_display')
    po_club_id = serializers.IntegerField(source='po_club.id')
    po_club_display_name = serializers.CharField(source='po_club.display_number')
    po_club_short_name = serializers.CharField(source='po_club.short_code')
    po_club_long_name = serializers.CharField(source='po_club.long_code')
    pre_costing_id = serializers.IntegerField(source='po_club.pre_costing.id')
    pre_costing_order_id = serializers.IntegerField(source='po_club.pre_costing.order.id')
    pre_costing_display_name = serializers.CharField(source='po_club.pre_costing.display_number')
    pre_costing_short_name = serializers.CharField(source='po_club.pre_costing.short_code')
    pre_costing_long_name = serializers.CharField(source='po_club.pre_costing.long_code')
    marketing_costing_id = serializers.IntegerField(source='po_club.marketing_costing.id')
    marketing_costing_order_id = serializers.IntegerField(source='po_club.marketing_costing.order.id')
    marketing_costing_display_name = serializers.CharField(source='po_club.marketing_costing.display_number')
    marketing_costing_short_name = serializers.CharField(source='po_club.marketing_costing.short_code')
    marketing_costing_long_name = serializers.CharField(source='po_club.marketing_costing.long_code')
    bom_change_request_change_type = serializers.SerializerMethodField()

    def get_display_number(self, instance):
        return instance.display_number

    def get_bom_change_request_change_type(self, instance):
        data = None
        if instance.bomchangerequestchangetype_set.all():
            bom_change_request_change_type = instance.bomchangerequestchangetype_set.all()[0]
            data = BOMChangeRequestChangeTypeSerializer(bom_change_request_change_type, many=False).data
        return data

    class Meta:
        model = BOMChangeRequest
        fields = ('__all__')