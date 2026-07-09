from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.fields import empty

from materials.models import *
from marketing.models import PurchaseOrderBom, ActualClubBom, PurchaseOrderAllocatedMaterial, PurchaseOrder, \
    ActualPOClub, POClubShade, FabricWidth, SupplierDeliveryDateQuantity, SupplierPOFabricShade, SupplierDeliveryDate, SupplierPOGRNMaterial, \
    FabricGRNBatchNumber
from shared.models import InHouseMaterial
from datetime import datetime
from materials.fieldmetadata.measuring_unit_helpers import MaterialUnitHelper
from shared.utils import get_quantity_dictionary, calculate_queryset_total_normalized_quantity
from supplier_po.models import SupplierPOGRNMaterialDetail
from supplier_po.supplier_po_grn.serializers import SupplierPOGRNMaterialDetailSerializer
from shared.serializers import FileAttachmentSerializer
from django.db.models import Sum
from rest_framework.generics import get_object_or_404
from shared.utils import get_material_unit_category
from supplier_po.models import SupplierPO


class MaterialSerializer(serializers.ModelSerializer):

    class Meta:
        model = Material
        fields = '__all__'


class SupplierInquiryMaterialDetailSerializer(serializers.ModelSerializer):
    supplier_material_reference_code = serializers.SerializerMethodField(read_only=True)
    supplier_id = serializers.IntegerField(source='supplier_inquiry.supplier.id', read_only=True)
    supplier_name = serializers.CharField(source='supplier_inquiry.supplier.name', read_only=True)
    fob_price = serializers.DecimalField(decimal_places=4, max_digits=5)
    cif_price = serializers.DecimalField(decimal_places=4, max_digits=5)
    ex_work_price = serializers.DecimalField(decimal_places=4, max_digits=5)
    transport_charges = serializers.DecimalField(decimal_places=4, max_digits=5)
    cutting_width = serializers.DecimalField(decimal_places=2, max_digits=5, required=False, allow_null=True)
    costing_unit_display = serializers.CharField(source='get_costing_unit_display', read_only=True)
    cutting_width_unit_display = serializers.CharField(source='get_cutting_width_unit_display', read_only=True)
    supplier_inquiry_detail = serializers.IntegerField(source='id', read_only=True)
    cost_per_unit_type_display = serializers.CharField(source='get_cost_per_unit_type_display', read_only=True)
    pay_mode_display = serializers.CharField(source='get_pay_mode_display', read_only=True)

    def get_supplier_material_reference_code(self, instance):
        supplier_inquiry_material_code = instance.supplier_inquiry_material_code
        return supplier_inquiry_material_code.supplier_material_reference_code if supplier_inquiry_material_code else None
    
    def to_internal_value(self, data):
        errors = {}
        # tentative_in_house_date = data.get('tentative_material_in_house_date', None)
        # if tentative_in_house_date:
        #     try:
        #         data['tentative_material_in_house_date'] = datetime.strptime(tentative_in_house_date,'%d/%m/%Y').date()
        #     except:
        #          errors["tentative_material_in_house_date"] = ["Date has wrong format. Use one of these formats instead: DD/MM/YYYY."]

        expiration_date = data.get('expiration_date', None)
        if expiration_date:
            try:
                data['expiration_date'] = datetime.strptime(expiration_date,'%d/%m/%Y').date()
            except:
                errors["expiration_date"] = ["Date has wrong format. Use one of these formats instead: DD/MM/YYYY."]
        if not errors == {}:
            raise serializers.ValidationError(errors)
        ret_data = super().to_internal_value(data)
        return ret_data
    

    def get_cutting_width(self, instance):
        cutting_width = None
        if instance.get_inquiry_material_type() == Material.FABRIC_MATERIAL:
            inquiry_detail = get_object_or_none(SupplierInquiryDetail, {'supplier_inquiry': instance})
            if inquiry_detail:
                cutting_width = inquiry_detail.cutting_width
        else:
            cutting_width = 'not_applicable'
        return cutting_width

    def get_cutting_width_unit(self, instance):
        cutting_width_unit = None
        if instance.get_inquiry_material_type() == Material.FABRIC_MATERIAL:
            inquiry_detail = get_object_or_none(SupplierInquiryDetail, {'supplier_inquiry': instance})
            if inquiry_detail:
                cutting_width_unit = inquiry_detail.cutting_width_unit
        else:
            cutting_width_unit = 'not_applicable'

        return cutting_width_unit

    def validate(self, attrs):
        resp = super().validate(attrs)
        errors = {}
        pmuh = PerMeasuringUnitHelper()
        if self.completed:
            mandatory_fields = [
                'costing_unit', 'cost_per_unit', 'fob_price', 'cif_price',
                'expiration_date', 'lead_time', 'supplier_material_reference_code', 'excess_threshold', 'cost_per_unit_type', 'ship_mode'
                # 'ex_work_price', 'transport_charges',
            ]
            fabric_mandatory_fields = ['cutting_width', 'cutting_width_unit']

            # Handle validation if supplier inquiry is service
            item_service_id = self.initial_data.get('item_service_id', None)
            if item_service_id:
                mandatory_fields.remove('supplier_material_reference_code')
                mandatory_fields.remove('excess_threshold')

            for field in self.fields:
                supplier_inquiry = SupplierInquiry.objects.get(pk=self.initial_data.get('supplier_inquiry'))

                if field in mandatory_fields:
                    if not self.initial_data.get(field):
                        errors[field] = 'This field is required'
                if supplier_inquiry.get_inquiry_material_type() == Material.FABRIC_MATERIAL and field in fabric_mandatory_fields:
                    if not self.initial_data.get(field):
                        errors[field] = 'This field is required'
                if field == 'costing_unit':
                    if supplier_inquiry.customer_brand_material:
                        if self.instance:
                            material_measurement_unit = self.instance.supplier_inquiry.customer_brand_material.material_detail.generic_material.user_material.consumption_measurement_unit
                        else:
                            customer_brand_material = CustomerBrandMaterial.objects.get(pk=self.initial_data.get('customer_brand_material_id'))
                            material_measurement_unit = customer_brand_material.material_detail.generic_material.user_material.consumption_measurement_unit
                        unit = self.initial_data.get(field)
                        valid_material_unit_category = pmuh.get_valid_material_valid_costing_unit(unit)
                        if material_measurement_unit != valid_material_unit_category or valid_material_unit_category == None:
                            errors[field] = 'Select valid costing unit'
        if bool(errors):
            raise serializers.ValidationError(errors)
        return resp

    def __init__(self, instance=None, data=empty, **kwargs):
        self.completed = kwargs.pop('completed', None)
        #self.total_requested_quantity = kwargs.pop('total_requested_quantity', None)
        super().__init__(instance=instance, data=data, **kwargs)

    class Meta:
        model = SupplierInquiryDetail
        fields = '__all__'


class SupplierInquirySerializer(serializers.ModelSerializer):
    supplier_id = serializers.IntegerField(source = 'supplier.id', read_only = True)
    supplier_name = serializers.CharField(source = 'supplier.name', read_only = True)
    material_name = serializers.SerializerMethodField(read_only = True)
    material_details = serializers.SerializerMethodField(read_only=True)
    service_details = serializers.SerializerMethodField(read_only=True)
    service_name = serializers.SerializerMethodField(read_only=True)
    customer_brand_material_id = serializers.IntegerField(source = 'customer_brand_material.id', read_only = True)
    supplier_inquiry_details = SupplierInquiryMaterialDetailSerializer(source='supplierinquirydetail_set', many=True, read_only=True)
    create_date = serializers.SerializerMethodField()

    def get_material_details(self, instance):
        material_details = {}
        customer_brand_material = instance.customer_brand_material
        if customer_brand_material:
            material_details = customer_brand_material.get_attributes() #material.material_child_object.genericmaterial.get_attributes()
            material_details = {key: material_details[key] for key in material_details if not "id" in key}
        return material_details

    def get_service_name(self, instance):
        service_name = ''
        if instance.item_service:
            service_name = instance.item_service.get_service_type_display()
        return service_name

    def get_service_details(self, instance):
        service_details = {}
        service = instance.item_service
        if service:
            service_details = service.get_attributes()
        return service_details

    def get_material_name(self, instance):
        material = ""
        child_object = instance.customer_brand_material
        if isinstance(child_object, CustomerBrandMaterial):
            material = instance.customer_brand_material.material_detail.generic_material.user_material.material
        return material
    
    def get_create_date(self, instance):
        date = instance.created.date()
        return date

    class Meta:
        model = SupplierInquiry
        fields = '__all__'


class UserDefinedDropDownOptionsSerializer(serializers.ModelSerializer):

    class Meta:
        model = UserDefinedDropDownOption
        fields = ['id', 'value', 'display_value', 'attribute', 'active']
        extra_kwargs = {'attribute': {'required': False}}


class UserDefinedMaterialAttributeSerializer(serializers.ModelSerializer):
    userdefineddropdownoption_set = UserDefinedDropDownOptionsSerializer(many=True, read_only=True)

    class Meta:
        model = UserDefinedMaterialAttribute
        fields = ['id', 'material', 'attribute_type', 'name', 'label', 'display_order', 'mandatory', 'userdefineddropdownoption_set', 'active', 'is_material_variation', 'po_editable', 'is_grn_field', 'size_field' ]
        extra_kwargs = {'name': {'required': False}}

    
class UserDefinedMaterialAttributeDeleteSerializer(serializers.ModelSerializer):

    class Meta:
        model = UserDefinedMaterialAttribute
        fields = ['id', 'active']


class UserDefinedAttributeDropdownListSerializer(serializers.ModelSerializer):
    material_label = serializers.ReadOnlyField(source='material.material')
    material_name = serializers.ReadOnlyField(source='material.name')
    
    class Meta:
        model = UserDefinedMaterialAttribute
        fields = ['id', 'material_id', 'material_label', 'material_name', 'label', 'name']


class UserDefinedDropdownOptionDeleteSerializer(serializers.ModelSerializer):

    class Meta:
        model = UserDefinedDropDownOption
        fields = ['id', 'active']


class UserDefinedMaterialDefectSerializer(serializers.ModelSerializer):

    class Meta:
        model = UserDefinedMaterialDefect
        fields = '__all__'


class UserDefinedMaterialSerializer(serializers.ModelSerializer):
    userdefinedmaterialattribute_set = UserDefinedMaterialAttributeSerializer(many=True, read_only=True)
    userdefinedmaterialdefect_set = UserDefinedMaterialDefectSerializer(many=True, read_only=True)

    class Meta:
        model = UserDefinedMaterial
        fields = ['id', 'category', 'get_category_display', 'material', 'name', 'userdefinedmaterialattribute_set', 'default_consumption_ratio', 'consumption_measurement_unit', 'display_order', 'estimated_consumption_ratio_units', 'userdefinedmaterialdefect_set', 'active', 'has_shade', 'size_dependent']
        extra_kwargs = {'name': {'required': False}}

    def get_userdefinedmaterialattribute_set(self, instance):
        attributes = instance.userdefinedmaterialattribute_set
        serializer = UserDefinedMaterialAttributeSerializer(attributes, many=True)
        return serializer.data
    
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['userdefinedmaterialattribute_set'] = self.get_userdefinedmaterialattribute_set(instance)
        return representation


class UserDefinedMaterialUpdateSerializer(serializers.ModelSerializer):
    userdefinedmaterialattribute_set = UserDefinedMaterialAttributeSerializer(many=True, read_only=True)

    class Meta:
        model = UserDefinedMaterial
        fields = ['id', 'category', 'material', 'userdefinedmaterialattribute_set', 'default_consumption_ratio',
                  'consumption_measurement_unit', 'display_order', 'estimated_consumption_ratio_units', 'has_shade', 'size_dependent', 'active']
        extra_kwargs = {'name': {'required': False}}

    def get_userdefinedmaterialattribute_set(self, instance):
        attributes = instance.userdefinedmaterialattribute_set
        serializer = UserDefinedMaterialAttributeSerializer(attributes, many=True)
        return serializer.data

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['userdefinedmaterialattribute_set'] = self.get_userdefinedmaterialattribute_set(instance)
        return representation


class GenericMaterialVariationSerializer(serializers.ModelSerializer):
    headers = serializers.SerializerMethodField(read_only=True)
    attributes = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = GenericMaterialVariation
        fields = '__all__'

    def get_headers(self, instance):
        attributes = instance.generic_material.user_material.get_material_headers(instance.generic_material.user_material.name)
        return attributes
    
    def get_attributes(self, instance):
        attributes = instance.get_attributes()
        return attributes


class GenericMaterialVariationAttributesSerializer(serializers.ModelSerializer):
    attributes = serializers.SerializerMethodField(read_only=True)
    class Meta:
        model = GenericMaterialVariation
        fields = '__all__'


    def get_attributes(self, instance):
        attributes = instance.get_attributes()
        return attributes
    

class SupplierInquiryMaterialCodeSerilizer(serializers.ModelSerializer):
    supplier_id = serializers.ReadOnlyField(source='supplier.id', read_only=True)
    supplier_name = serializers.ReadOnlyField(source='supplier.name', read_only=True)
    brand_name = serializers.ReadOnlyField(source='customer_brand_material_code.customer_brand.brand.name', read_only=True)
    customer_brand_material_details = serializers.SerializerMethodField(read_only=True)

    def get_customer_brand_material_details(self, instance):
        return instance.customer_brand_material.get_customer_brand_material_details()
    class Meta:
        model = SupplierInquiryMaterialCode
        fields = '__all__'
 

class CustomerBrandMaterialCodeSerializer(serializers.ModelSerializer):
    customer_id = serializers.CharField(source='customer_brand.customer.id', read_only=True)
    customer_name = serializers.CharField(source='customer_brand.customer.name', read_only=True)
    brand_name = serializers.CharField(source='customer_brand.brand.name', read_only=True)
    material_label = serializers.CharField(source='material_definition.user_material.material', read_only=True)
    supplierinquirymaterialcode_set = SupplierInquiryMaterialCodeSerilizer(read_only=True, many=True)
    attributes = serializers.SerializerMethodField(read_only=True)
    headers = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = CustomerBrandMaterialCode
        fields = '__all__'

    def get_attributes(self, obj):
        return obj.material_definition.get_attributes()
    
    def get_headers(self, obj):
        return obj.material_definition.user_material.get_material_headers(obj.material_definition.user_material.name)


class EmbellishmentSubTypeSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = EmbellishmentSubType
        fields = '__all__'


class EmbellishmentTypeSerializer(serializers.ModelSerializer):
    embellishmentsubtype_set = EmbellishmentSubTypeSerializer(many=True, read_only=True)

    class Meta:
        model = EmbellishmentType
        fields = '__all__'


class CustomerBrandMaterialSerializer(serializers.ModelSerializer):
    material_details = serializers.SerializerMethodField()
    class Meta:
        model = CustomerBrandMaterial
        fields = '__all__'

    def get_material_details(self, customer_brand_material):
        return GenericMaterialVariationSerializer(customer_brand_material.material_detail).data


class CustomerBrandMaterialV2Serializer(serializers.ModelSerializer):
    headers = serializers.SerializerMethodField()
    material_details = serializers.SerializerMethodField()

    def get_material_details(self, customer_brand_material):
        return customer_brand_material.get_attributes()
    
    def get_headers(self, instance):
        return instance.material_detail.generic_material.user_material.get_material_headers(instance.material_detail.generic_material.user_material.name)
    
    class Meta:
        model = CustomerBrandMaterial
        fields = '__all__'


class CustomerBrandMaterialCostingSerializer(serializers.ModelSerializer):
    headers = serializers.SerializerMethodField()
    material_details = serializers.SerializerMethodField()
    buyers = serializers.SerializerMethodField()

    def get_material_details(self, customer_brand_material):
        return customer_brand_material.get_attributes()

    def get_headers(self, instance):
        return instance.material_detail.generic_material.user_material.get_material_headers(instance.material_detail.generic_material.user_material.name)

    def get_buyers(self, instance):
        from shared.utils import get_quantity_dictionary
        from marketing.models import OrderInquiry, OrderCostingVersion
        data = []
        buyer_ids = CustomerBrandMaterial.objects.filter(material_detail=instance.material_detail).values_list('material_code__customer_brand__customer', flat=True)
        buyers = Customer.objects.filter(pk__in=buyer_ids)
        for buyer in buyers:
            buyer_data = {
                'id': buyer.id,
                'name': buyer.name,
                'costings': []
            }
            costing_ids = SupplierInquiry.objects.filter(customer_brand_material=instance, version__order__customer=buyer).values_list('version', flat=True)
            costings = OrderCostingVersion.objects.filter(pk__in=costing_ids)
            for costing in costings:
                quantity = round(instance.get_version_estimated_quantity(costing)['estimated_quantity'], 2)
                #requested_quantity = instance.get_version_estimated_quantity(costing)['estimated_quantity']
                costing_data = {
                    'id': costing.id,
                    'display_number': costing.order.display_number,
                    'long_code': costing.order.long_code,
                    'short_code': costing.order.short_code,
                    'quantity': get_quantity_dictionary(quantity, instance.material_normalized_measuring_unit),
                    'requested_quantity': get_quantity_dictionary(quantity, instance.material_normalized_measuring_unit)
                }
                buyer_data['costings'].append(costing_data)
            data.append(buyer_data)
        return data

    class Meta:
        model = CustomerBrandMaterial
        fields = '__all__'


# TODO minor - move this to marketing serializer
class InHouseMaterialListDataSerializer(serializers.ModelSerializer):
    headers = serializers.SerializerMethodField(read_only=True)
    material_details = serializers.SerializerMethodField(read_only=True)
    required_quantity = serializers.SerializerMethodField(read_only=True)
    filled_quantity = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = CustomerBrandMaterial
        fields = '__all__'

    def get_headers(self, instance):
        headers = instance.material_detail.generic_material.user_material.get_material_headers(instance.material_type)
        return headers

    def get_material_details(self, instance):
        return instance.get_customer_brand_material_details()

    def get_filter_type(self):
        return self.context['filter_by']

    def get_required_quantity(self, instance):
        filter_type = self.get_filter_type()
        quantity = 0.0
        if filter_type == 'PurchaseOrder':
            # print(self.context)
            purchase_order = PurchaseOrder.objects.get(pk=self.context['purchase_order_id'])
            quantity = purchase_order.get_material_required_quantity(instance)
        else:
            actual_club = ActualPOClub.objects.get(pk=self.context['club_id'])
            quantity = actual_club.get_material_required_quantity(instance)
        return quantity

    def get_filled_quantity(self, instance):
        filter_type = self.get_filter_type()
        if filter_type == 'PurchaseOrder':
            purchase_order = PurchaseOrder.objects.get(pk=self.context['purchase_order_id'])
            allocated_quantity = purchase_order.get_allocated_quantity(instance)
        else:
            actual_club = ActualPOClub.objects.get(pk=self.context['club_id'])
            allocated_quantity = actual_club.get_material_allocated_quantity(instance)
        return allocated_quantity

    #TODO Mahesh- check if we can remove this. Let Tharindu know if we remove it
    def get_filled_quantity_unit(self, instance):
        filter_type = self.get_filter_type()
        quantity_unit = None
        if filter_type=='PurchaseOrder':
            purchase_order_bom = PurchaseOrderBom.objects.get(material=instance, purchase_order_id=self.context['purchase_order_id'])
            quantity_unit = purchase_order_bom.get_measuring_unit_display()
        else:
            atcual_club_bom = ActualClubBom.objects.get(material=instance, actual_club=self.context['club_id'])
            quantity_unit = atcual_club_bom.get_quantity_units_display()
        return quantity_unit
    

class PackListMaterialDetailSerializer(serializers.ModelSerializer):
    headers = serializers.SerializerMethodField(read_only=True)
    material_details = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = CustomerBrandMaterial
        fields = '__all__'

    def get_headers(self, instance):
        headers = instance.material_detail.generic_material.user_material.get_material_headers(instance.material_detail.generic_material.user_material.name)
        return headers
    
    def get_material_details(self, instance):
        pack_list = self.context['pack_list']
        delivery_date = self.context['delivery_date']
        material_details = instance.get_customer_brand_material_details()
        quantity_summary = pack_list.get_material_delivery_quantity_summary(delivery_date, instance)
        material_details['quantity_summary'] = quantity_summary
        return material_details
    

class DeliveryDateMaterialQuantityDetailSerializer(serializers.ModelSerializer):
    headers = serializers.SerializerMethodField(read_only=True)
    material_details = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = CustomerBrandMaterial
        fields = '__all__'

    def get_headers(self, instance):
        headers = instance.material_detail.generic_material.user_material.get_material_headers(instance.material_detail.generic_material.user_material.name)
        return headers
    
    def get_material_details(self, instance):
        delivery_date = self.context['delivery_date']
        material_details = instance.get_customer_brand_material_details()
        quantity_summary = delivery_date.get_material_delivery_quantity_summary(instance)
        material_details['quantity_summary'] = quantity_summary
        return material_details


class InHouseMaterialChartSummaryByPOSerializer(serializers.ModelSerializer):
    grn_material_details = serializers.SerializerMethodField(read_only=True)
    width_groups = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = CustomerBrandMaterial
        fields = ('grn_material_details', 'width_groups')

    def get_grn_material_details(self, instance):
        return instance.get_customer_brand_material_details()

    def get_width_groups(self, instance):
        from django.db.models import Sum
        response = []
        purchase_order_id = self.context.get('purchase_order_id')

        purchase_order_allocated_materials = PurchaseOrderAllocatedMaterial.objects.filter(
            purchase_order_bom__purchase_order_id=purchase_order_id,
            in_house_material__supplier_material__customer_brand_material=instance
        )

        width_ids = purchase_order_allocated_materials.filter().values_list('width', flat=True).distinct()
        widths = FabricWidth.objects.filter(id__in=width_ids)

        for width in widths:
            total_quantity = purchase_order_allocated_materials.filter(width=width).aggregate(Sum('allocated_quantity'))
            width_shade_group = []

            shades = SupplierPOFabricShade.objects.filter(
                id__in=purchase_order_allocated_materials.filter(
                    width=width
                ).values_list('in_house_material__grn_material_detail__shade__supplier_po_shade', flat=True).distinct()
            )

            for shade in shades:
                shade_total_quantity = purchase_order_allocated_materials.filter(
                    in_house_material__grn_material_detail__shade__supplier_po_shade=shade
                ).aggregate(Sum('allocated_quantity'))

                rolls = []
                inhouse_materials = purchase_order_allocated_materials.filter(
                    width=width,
                    in_house_material__grn_material_detail__shade__supplier_po_shade=shade
                )

                for in_house_material in inhouse_materials:
                    rolls.append({
                        'pack_number': in_house_material.in_house_material.grn_material_detail.fabricgrndetail.pack_number,
                        'batch_number': in_house_material.in_house_material.grn_material_detail.batch_number.batch_number,
                        'quantity': in_house_material.in_house_material.grn_material_detail.actual_quantity
                    })

                shade_data = {
                    'shade_display': shade.shade_name,
                    'total_quantity': shade_total_quantity['allocated_quantity__sum'],
                    'rolls': rolls
                }
                width_shade_group.append(shade_data)

            data = {
                'total_quantity': total_quantity['allocated_quantity__sum'],
                'width_unit': MaterialUnitHelper.INCHES_UNIT,
                'width': width.width,
                'width_shade_group': width_shade_group
            }
            response.append(data)

        return response
    

class InHouseMaterialChartSummaryByClubSerializer(serializers.ModelSerializer):
    grn_material_details = serializers.SerializerMethodField(read_only=True)
    width_group = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = CustomerBrandMaterial # TODO minor - change this to InhouseMaterial model
        fields = ('grn_material_details', 'width_group')

    def get_grn_material_details(self, instance):
        data = {
            'material_details': instance.get_customer_brand_material_details()
        }
        return data

    def get_width_group(self, instance):
        from django.db.models import Sum
        response = []
        actual_club_id = self.context.get('actual_club_id')

        purchase_order_allocated_materials = PurchaseOrderAllocatedMaterial.objects.filter(
            purchase_order_bom__purchase_order__actual_po_club__id=actual_club_id,
            in_house_material__supplier_material__customer_brand_material=instance
        )

        width_ids = purchase_order_allocated_materials.filter().values_list('width', flat=True).distinct()
        widths = FabricWidth.objects.filter(id__in=width_ids)

        for width in widths:
            total_quantity = purchase_order_allocated_materials.filter(width=width).aggregate(Sum('allocated_quantity'))
            width_shade_group = []

            shades = SupplierPOFabricShade.objects.filter(
                id__in=purchase_order_allocated_materials.filter(
                    width=width
                ).values_list('in_house_material__grn_material_detail__shade__supplier_po_shade', flat=True).distinct()
            )

            for shade in shades:
                shade_total_quantity = purchase_order_allocated_materials.filter(
                    in_house_material__grn_material_detail__shade__supplier_po_shade=shade
                ).aggregate(Sum('allocated_quantity'))

                rolls = []
                inhouse_materials = purchase_order_allocated_materials.filter(
                    width=width,
                    in_house_material__grn_material_detail__shade__supplier_po_shade=shade
                )

                for in_house_material in inhouse_materials:
                    rolls.append({
                        'pack_number': in_house_material.in_house_material.grn_material_detail.fabricgrndetail.pack_number,
                        'batch_number': in_house_material.in_house_material.grn_material_detail.batch_number.batch_number,
                        'quantity': in_house_material.in_house_material.grn_material_detail.actual_quantity
                    })

                shade_data = {
                    'shade_display': shade.shade_name,
                    'total_quantity': shade_total_quantity['allocated_quantity__sum'],
                    'rolls': rolls
                }
                width_shade_group.append(shade_data)

            data = {
                'total_quantity': total_quantity['allocated_quantity__sum'],
                'width_unit': MaterialUnitHelper.INCHES_UNIT,
                'width': width.width,
                'width_shade_group': width_shade_group
            }
            response.append(data)

        return response


class SupplierPOCustomerBrandMaterialSerializer(serializers.ModelSerializer):
    headers = serializers.SerializerMethodField(read_only=True)
    material_details = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = SupplierCustomerBrandMaterial
        fields = '__all__'

    def get_headers(self, instance):
        headers = instance.customer_brand_material.material_detail.generic_material.user_material.get_material_headers(
            instance.customer_brand_material.material_detail.generic_material.user_material.name
        )
        return headers

    def get_possible_pos(self, supplier_po):
        possible_pos = []
        if supplier_po.general_po_supplier.general_po.po_club:
            pos = supplier_po.general_po_supplier.general_po.po_club.get_purchase_orders()
        else:
            costing = supplier_po.general_po_supplier.general_po.costing
            pos = PurchaseOrder.objects.filter(Q(costing_version=costing) | Q(marketing_costing=costing) | Q(actual_po_club__pre_costing=costing) | Q(actual_po_club__marketing_costing=costing)).exlude(Q(state=PurchaseOrder.COMPLETED_STATE) | Q(state=PurchaseOrder.CANCELED_STATE))
        for po in pos:
            possible_pos.append({'po_number': po.display_number, 'id': po.pk})
        return possible_pos

    def get_material_details(self, instance):
        from supplier_po.supplier_po.serializers import SupplierDeliveryDateQuantityPOAllocationSerializer
        bom_data = []
        material_details = instance.get_attributes()
        supplier_po = self.context['supplier_po']

        bom_suppliers = SupplierDeliveryDateQuantity.objects.filter(
            material_supplier__general_po_supplier__supplierpo=supplier_po,
            material_supplier__supplier_material=instance
        ).exclude(supplier_delivery_date=None).order_by('id')

        for bom_supplier in bom_suppliers:
            po_allocations = bom_supplier.supplierdeliverydatequantitypoallocation_set.all().order_by('id')
            bom_data.append({
                'id': bom_supplier.id,
                #'purchase_order_id': bom_supplier.purchase_order_bom.purchase_order.id,
                'requested_date_id': bom_supplier.requested_date.id if bom_supplier.requested_date else None,
                'requested_date': bom_supplier.requested_date.requested_date if bom_supplier.requested_date else None,
                'requested_quantity': '%s %s' % (bom_supplier.quantity, bom_supplier.get_quantity_units_display()),
                #'purchase_order_name': bom_supplier.purchase_order_bom.purchase_order.name,
                'proforma_invoice_quantity': bom_supplier.proforma_invoice_quantity,
                'proforma_invoice_quantity_units': bom_supplier.proforma_invoice_quantity_units,
                'proforma_invoice_quantity_units_display': bom_supplier.get_proforma_invoice_quantity_units_display(),
                'delivery_date_id': bom_supplier.supplier_delivery_date.id,
                'delivery_date': bom_supplier.supplier_delivery_date.confirmed_delivery_date,
                'po_allocations': SupplierDeliveryDateQuantityPOAllocationSerializer(po_allocations, many=True).data,
                'transport_quantity': bom_supplier.transport_quantity,
                'transport_quantity_units': bom_supplier.transport_quantity_units,
                'ex_mill_date': bom_supplier.ex_mill_date,
                'split_from': bom_supplier.split_from_id,
                'transport_method': bom_supplier.supplier_delivery_date.transport_method,
                'port': bom_supplier.supplier_delivery_date.supplier_port.id if bom_supplier.supplier_delivery_date.supplier_port else None,
            })
        material_details['bom_data'] = bom_data
        material_details['linked_purchase_orders'] = self.get_possible_pos(supplier_po)
        return material_details


class CustomerBrandMaterSerializer(serializers.ModelSerializer):

    class Meta:
        model = CustomerBrandMaterial
        fields = ('__all__')


class CustomerBrandMaterialBasicSerializer(serializers.ModelSerializer):
    headers = serializers.SerializerMethodField(read_only=True)
    attributes = serializers.SerializerMethodField(read_only=True)
    material_normalized_measuring_unit = serializers.CharField()

    class Meta:
        model = CustomerBrandMaterial
        fields = '__all__'

    def get_headers(self, instance):
        headers = UserDefinedMaterial.get_material_headers(instance.material_detail.generic_material.user_material.name)
        return headers

    def get_attributes(self, instance):
        attributes = instance.get_attributes()
        return attributes


class CustomerBrandMaterialDropDownSerializer(serializers.ModelSerializer):
    ritz_customer_brand_reference_code = serializers.CharField(source='verbose_reference_code')
    headers = serializers.SerializerMethodField(read_only=True)
    attributes = serializers.SerializerMethodField(read_only=True)
    material_normalized_measuring_unit = serializers.CharField()

    class Meta:
        model = CustomerBrandMaterial
        fields = '__all__'

    def get_headers(self, instance):
        headers = UserDefinedMaterial.get_material_headers(instance.material_detail.generic_material.user_material.name)
        return headers

    def get_attributes(self, instance):
        attributes = instance.get_attributes()
        return attributes


class SupplierCustomerBrandMaterialSerializer(serializers.ModelSerializer):
    headers = serializers.SerializerMethodField(read_only=True)
    attributes = serializers.SerializerMethodField(read_only=True)
    material_normalized_measuring_unit = serializers.CharField(source='customer_brand_material.material_normalized_measuring_unit')


    def get_headers(self, instance):
        attributes = UserDefinedMaterial.get_material_headers(
            instance.customer_brand_material.material_detail.generic_material.user_material.name
        )
        return attributes

    def get_attributes(self, instance):
        attributes = instance.get_attributes()
        return attributes

    class Meta:
        model = SupplierInquiryMaterialCode
        fields = '__all__'


class CostingCustomerBrandMaterialSerializer(serializers.ModelSerializer):
    headers = serializers.SerializerMethodField(read_only=True)
    attributes = serializers.SerializerMethodField(read_only=True)


    def get_headers(self, instance):
        attributes = UserDefinedMaterial.get_material_headers(
            instance.material_detail.generic_material.user_material.name
        )
        return attributes

    def get_attributes(self, instance):
        attributes = instance.get_attributes()
        return attributes

    class Meta:
        model = CustomerBrandMaterial
        fields = '__all__'


class LeftOverMaterialSerializer(serializers.ModelSerializer):
    barcode = serializers.CharField(source='inhouse_material.barcode')
    width = serializers.IntegerField(source='inhouse_material.cutting_width')
    width_units = serializers.SerializerMethodField()
    available_quantity_units = serializers.SerializerMethodField()
    usable_quantity_units = serializers.SerializerMethodField()
    shade = serializers.CharField(source='shade.shade_name', allow_null=True)

    def get_available_quantity_units(self, instance):
        return instance.get_available_quantity_units_display()
    
    def get_usable_quantity_units(self, instance):
        return instance.get_usable_quantity_units_display()
    
    def get_width_units(self, instance):
        return instance.inhouse_material.get_cutting_width_units_display()
    
    class Meta:
        model = InHouseMaterialVerificationMaterial
        fields = '__all__'


class FabricColorToneSerializer(serializers.ModelSerializer):
    color_tone_display = serializers.SerializerMethodField()

    def get_color_tone_display(self, instance):
        return '%s - %s' % (instance.color_1, instance.color_2)

    class Meta:
        model = FabricColorTone
        fields = '__all__'


class MaterailLibrarySerializer(serializers.ModelSerializer):
    customer_id = serializers.CharField(source='material_code.customer_brand.customer.id', read_only=True)
    customer_name = serializers.CharField(source='material_code.customer_brand.customer.name', read_only=True)
    brand_name = serializers.CharField(source='material_code.customer_brand.brand.name', read_only=True)
    material_label = serializers.CharField(source='material_code.material_definition.user_material.material', read_only=True)
    attributes = serializers.SerializerMethodField(read_only=True)
    headers = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = CustomerBrandMaterial
        fields = '__all__'

    def get_attributes(self, instance):
        return instance.get_attributes()
    
    def get_headers(self, instance):
        return instance.material_detail.generic_material.user_material.get_material_headers(instance.material_detail.generic_material.user_material.name)


class ConsolidatedSupplierInquirySerializer(serializers.ModelSerializer):
    display_number = serializers.CharField()
    headers = serializers.SerializerMethodField(read_only = True)
    supplier_id = serializers.IntegerField(source = 'supplier.id', read_only = True)
    supplier_name = serializers.CharField(source = 'supplier.name', read_only = True)
    material_name = serializers.SerializerMethodField(read_only = True)
    material_details = serializers.SerializerMethodField(read_only=True)
    service_details = serializers.SerializerMethodField(read_only=True)
    service_name = serializers.SerializerMethodField(read_only=True)
    customer_brand_material_id = serializers.IntegerField(source = 'customer_brand_material.id', read_only = True)
    supplier_inquiry_details = SupplierInquiryMaterialDetailSerializer(source='supplierinquirydetail_set', many=True, read_only=True)
    create_date = serializers.SerializerMethodField()

    def get_material_details(self, instance):
        material_details = {}
        customer_brand_material = instance.customer_brand_material
        if customer_brand_material:
            material_details = customer_brand_material.get_attributes() #material.material_child_object.genericmaterial.get_attributes()
            material_details = {key: material_details[key] for key in material_details if not "id" in key}
        return material_details

    def get_service_name(self, instance):
        service_name = ''
        if instance.item_service:
            service_name = instance.item_service.get_service_type_display()
        return service_name

    def get_service_details(self, instance):
        service_details = {}
        service = instance.item_service
        if service:
            service_details = service.get_attributes()
        return service_details

    def get_material_name(self, instance):
        material = ""
        child_object = instance.customer_brand_material
        if isinstance(child_object, CustomerBrandMaterial):
            material = instance.customer_brand_material.material_detail.generic_material.user_material.material
        return material

    def get_create_date(self, instance):
        date = instance.created.date()
        return date

    def get_headers(self, instance):
        headers = []
        if instance.customer_brand_material:
            headers = instance.customer_brand_material.material_detail.generic_material.user_material.get_material_headers(instance.customer_brand_material.material_detail.generic_material.user_material.name)
        return headers

    class Meta:
        model = SupplierInquiry
        fields = '__all__'


class ConsolidatedSupplierInquiryMaterialDetailSerializer(serializers.ModelSerializer):
    supplier_material_reference_code = serializers.SerializerMethodField(read_only=True)
    supplier_id = serializers.IntegerField(source='supplier_inquiry.supplier.id', read_only=True)
    supplier_name = serializers.CharField(source='supplier_inquiry.supplier.name', read_only=True)
    fob_price = serializers.DecimalField(decimal_places=4, max_digits=5)
    cif_price = serializers.DecimalField(decimal_places=4, max_digits=5)
    ex_work_price = serializers.DecimalField(decimal_places=4, max_digits=5)
    transport_charges = serializers.DecimalField(decimal_places=4, max_digits=5)
    cutting_width = serializers.DecimalField(decimal_places=2, max_digits=5, required=False, allow_null=True)
    costing_unit_display = serializers.CharField(source='get_costing_unit_display', read_only=True)
    cutting_width_unit_display = serializers.CharField(source='get_cutting_width_unit_display', read_only=True)
    supplier_inquiry_detail = serializers.IntegerField(source='id', read_only=True)
    excess_threshold = serializers.FloatField()
    cost_per_unit_type = serializers.CharField()
    cost_per_unit_type_display = serializers.CharField(source='get_cost_per_unit_type_display', read_only=True)
    pay_mode_display = serializers.CharField(source='get_pay_mode_display', read_only=True)
    ritz_customer_brand_reference_code = serializers.CharField(source='supplier_inquiry.customer_brand_material.verbose_reference_code')
    ship_mode_display = serializers.CharField(source='get_ship_mode_display', read_only=True)

    def get_supplier_material_reference_code(self, instance):
        supplier_inquiry_material_code = instance.supplier_inquiry_material_code
        return supplier_inquiry_material_code.supplier_material_reference_code if supplier_inquiry_material_code else None

    def get_cutting_width(self, instance):
        cutting_width = None
        if instance.get_inquiry_material_type() == Material.FABRIC_MATERIAL:
            inquiry_detail = get_object_or_none(SupplierInquiryDetail, {'supplier_inquiry': instance})
            if inquiry_detail:
                cutting_width = inquiry_detail.cutting_width
        else:
            cutting_width = 'not_applicable'
        return cutting_width

    def get_cutting_width_unit(self, instance):
        cutting_width_unit = None
        if instance.get_inquiry_material_type() == Material.FABRIC_MATERIAL:
            inquiry_detail = get_object_or_none(SupplierInquiryDetail, {'supplier_inquiry': instance})
            if inquiry_detail:
                cutting_width_unit = inquiry_detail.cutting_width_unit
        else:
            cutting_width_unit = 'not_applicable'

        return cutting_width_unit

    def get_headers(self, instance):
        return instance.supplier_inquiry.customer_brand_material.material_detail.generic_material.user_material.get_material_headers(instance.customer_brand_material.material_detail.generic_material.user_material.name)

    class Meta:
        model = SupplierInquiryDetail
        fields = '__all__'


class PartialDeliveryTransferPackQuantitySerializer(serializers.ModelSerializer):

    class Meta:
        model = PartialDeliveryTransferPackQuantity
        fields = '__all__'


class WarehouseMaterialTransferDetailSerializer(serializers.ModelSerializer):
    barcode = serializers.CharField(source='in_house_material.barcode')

    class Meta:
        model = WarehouseMaterialTransferDetail
        fields = '__all__'


class WarehouseMaterialTransferBasicSerializer(serializers.ModelSerializer):
    display_number = serializers.CharField()
    warehouse_name = serializers.CharField(source='transfer_warehouse.warehouse_name')
    state_display = serializers.CharField(source='get_state_display', allow_null=True)

    class Meta:
        model = WarehouseMaterialTransfer
        fields = '__all__'


class WarehouseMaterialTransferSerializer(serializers.ModelSerializer):
    display_number = serializers.CharField()
    warehouse_name = serializers.CharField(source='transfer_warehouse.warehouse_name')
    warehousematerialtransferdetail_set = WarehouseMaterialTransferDetailSerializer(many=True, read_only=True)
    partialdeliverytransferpackquantity_set = PartialDeliveryTransferPackQuantitySerializer(many=True, read_only=True)
    boms = serializers.SerializerMethodField()
    grn_details = serializers.SerializerMethodField()
    inspection_details = serializers.SerializerMethodField()
    leftover_verifications = serializers.SerializerMethodField()
    inhouse_material_transfer_state = serializers.SerializerMethodField()
    po_club_id = serializers.SerializerMethodField()
    po_club_display_number = serializers.SerializerMethodField()
    po_club_long_code = serializers.SerializerMethodField()
    po_club_short_code = serializers.SerializerMethodField()
    state_display = serializers.CharField(source='get_state_display', allow_null=True)

    def get_boms(self, instance):
        warehouse_material_transfer_details = instance.warehousematerialtransferdetail_set.all()
        material_ids = warehouse_material_transfer_details.values_list('in_house_material__supplier_material__customer_brand_material', flat=True)
        materials = CustomerBrandMaterial.objects.filter(id__in=material_ids)

        data = {
            FABRIC_TRIM_TYPES: {'category': FABRIC_TRIM_TYPES, 'material_data': []},
            SEWING_TRIM_TYPES: {'category': SEWING_TRIM_TYPES, 'material_data': []},
            PACKAGING_TYPES: {'category': PACKAGING_TYPES, 'material_data': []},
        }

        for material in materials:
            normalized_measuring_unit = material.material_normalized_measuring_unit
            category = material.material_category

            if category in data:
                details = []
                material_details = warehouse_material_transfer_details.filter(in_house_material__supplier_material__customer_brand_material=material)
                for material_detail in material_details:
                    details.append({
                        'id': material_detail.id,
                        'barcode' : material_detail.in_house_material.barcode,
                        'quantity' : get_quantity_dictionary(material_detail.quantity, normalized_measuring_unit),
                        'available_quantity' : get_quantity_dictionary(material_detail.in_house_material.available_quantity, normalized_measuring_unit),
                    })
                total_quantity = calculate_queryset_total_normalized_quantity(material_details, normalized_measuring_unit, 'quantity', 'quantity_units')
                data[category]['material_data'].append({
                    'id': material.id,
                    'attributes': material.get_attributes(),
                    'transfer_quantity': get_quantity_dictionary(total_quantity, normalized_measuring_unit),
                    'grn_quantity': get_quantity_dictionary(total_quantity, normalized_measuring_unit),
                    'transfer_verification': self.get_inhouse_material_transfer_state_by_material(material_details),
                    'details': details,
                })

        return data

    def get_inhouse_material_transfer_state_by_material(self, material_details):
        warehouse_material_transfer_detail_ct = ContentType.objects.get_for_model(WarehouseMaterialTransferDetail)
        is_created = InHouseMaterialVerificationMaterial.objects.filter(
            referance_material_type=warehouse_material_transfer_detail_ct,
            referance_material_id__in=material_details.values_list('id', flat=True),
            inhouse_material_verification__state=InHouseMaterialVerification.COMPLETE_STATE
        ).exists()
        return is_created

    def get_grn_details(self, instance):
        warehouse_material_transfer_details = instance.warehousematerialtransferdetail_set.all()

        general_po_supplier_ids = warehouse_material_transfer_details.values_list('in_house_material__grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po__general_po_supplier', flat=True)
        supplier_delivery_dates = SupplierDeliveryDate.objects.filter(general_po_supplier__id__in=general_po_supplier_ids)

        material_data = {
            FABRIC_TRIM_TYPES: {'category': FABRIC_TRIM_TYPES, 'material_data': []},
            SEWING_TRIM_TYPES: {'category': SEWING_TRIM_TYPES, 'material_data': []},
            PACKAGING_TYPES: {'category': PACKAGING_TYPES, 'material_data': []},
        }
        warehouse_material_transfer_detail_ct = ContentType.objects.get_for_model(WarehouseMaterialTransferDetail)
        for supplier_delivery_date in supplier_delivery_dates:
            grns = supplier_delivery_date.get_delivery_date_grns()
            material_ids = warehouse_material_transfer_details.filter(
                in_house_material__grn_material_detail__supplier_po_grn_material__supplier_po_grn__in=grns
            ).values_list('in_house_material__supplier_material__customer_brand_material', flat=True)
            materials = CustomerBrandMaterial.objects.filter(id__in=material_ids)
            grn_matrials = SupplierPOGRNMaterial.objects.filter(grn_material__customer_brand_material__in=materials, supplier_po_grn__in=grns)
            for grn_matrial in grn_matrials:
                category =  grn_matrial.grn_material.customer_brand_material.material_category
                transfet_materials = InHouseMaterialVerificationMaterial.objects.filter(
                    inhouse_material__grn_material_detail__supplier_po_grn_material=grn_matrial,
                    referance_material_type=warehouse_material_transfer_detail_ct,
                    inhouse_material_verification__state=InHouseMaterialVerification.COMPLETE_STATE
                )
                transfer_total_grn_quantity = transfet_materials.aggregate(transfer_total_grn_quantity=Sum('usable_quantity'))['transfer_total_grn_quantity'] or 0
                transfer_total_excess_quantity = transfet_materials.aggregate(transfer_total_excess_quantity=Sum('available_quantity'))['transfer_total_excess_quantity'] or 0
                transfer_total_difference_quantity = transfet_materials.aggregate(transfer_total_difference_quantity=Sum('available_quantity'))['transfer_total_difference_quantity'] or 0
                if category in material_data:
                    excess_threshold = 0
                    total_quantity = get_quantity_dictionary(grn_matrial.total_actual_quantity, grn_matrial.total_actual_quantity_units)
                    excess_quantity = get_quantity_dictionary(grn_matrial.total_excess_quantity, grn_matrial.total_excess_quantity_units)
                    if excess_quantity['quantity']:
                        excess_threshold = (excess_quantity['quantity'] / total_quantity['quantity']) * 100
                        excess_threshold = round(excess_threshold, 2)
                    material_data[category]['material_data'].append({
                        'delivery_id': supplier_delivery_date.id,
                        'delivery_display_number': supplier_delivery_date.display_number,
                        'grn_id': grn_matrial.supplier_po_grn.id,
                        'grn_display_number': grn_matrial.supplier_po_grn.grn_number,
                        'confirmed_delivery_date': supplier_delivery_date.confirmed_delivery_date,
                        'actual_delivery_date': supplier_delivery_date.actual_delivery_date.delivery_date if supplier_delivery_date.actual_delivery_date else None,
                        'headers': grn_matrial.grn_material.customer_brand_material.material_detail.generic_material.user_material.get_material_headers(grn_matrial.grn_material.customer_brand_material.material_detail.generic_material.user_material.name),
                        'attributes': grn_matrial.grn_material.customer_brand_material.get_attributes(),
                        'grn_quantity': total_quantity,
                        'excess_quantity': excess_quantity,
                        'excess_threshold': excess_threshold,
                        'transfer_total_grn_quantity': get_quantity_dictionary(transfer_total_grn_quantity, grn_matrial.total_actual_quantity_units),
                        'transfer_total_excess_quantity': get_quantity_dictionary(transfer_total_excess_quantity, grn_matrial.total_actual_quantity_units),
                        'transfer_total_difference_quantity': get_quantity_dictionary(transfer_total_difference_quantity, grn_matrial.total_actual_quantity_units),
                    })

        return material_data

    def get_color_tone(self, transfer_material):
        data = {}
        if transfer_material:
            if transfer_material.color_tone:
                data = {
                    'value': transfer_material.color_tone.id,
                    'display_value': transfer_material.color_tone.display_value
                }
        return data

    def get_inspection_details(self, instance):
        warehouse_material_transfer_details = instance.warehousematerialtransferdetail_set.all()
        general_po_supplier_ids = warehouse_material_transfer_details.values_list('in_house_material__grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po__general_po_supplier', flat=True)
        supplier_delivery_dates = SupplierDeliveryDate.objects.filter(general_po_supplier__id__in=general_po_supplier_ids)

        material_data = {
            FABRIC_TRIM_TYPES: {'category': FABRIC_TRIM_TYPES, 'material_data': []},
            SEWING_TRIM_TYPES: {'category': SEWING_TRIM_TYPES, 'material_data': []},
            PACKAGING_TYPES: {'category': PACKAGING_TYPES, 'material_data': []},
        }
        data = []
        warehouse_material_transfer_detail_ct = ContentType.objects.get_for_model(WarehouseMaterialTransferDetail)
        for supplier_delivery_date in supplier_delivery_dates:
            grns = supplier_delivery_date.get_delivery_date_grns()
            material_ids = warehouse_material_transfer_details.filter(
                in_house_material__grn_material_detail__supplier_po_grn_material__supplier_po_grn__in=grns
            ).values_list('in_house_material__supplier_material__customer_brand_material', flat=True)
            materials = CustomerBrandMaterial.objects.filter(id__in=material_ids)

            for grn in grns:
                grn_matrials = SupplierPOGRNMaterial.objects.filter(grn_material__customer_brand_material__in=materials, supplier_po_grn=grn)
                for grn_matrial in grn_matrials:
                    category =  grn_matrial.grn_material.customer_brand_material.material_category
                    material_normalized_measuring_unit = grn_matrial.grn_material.customer_brand_material.material_normalized_measuring_unit
                    if category in material_data:
                        grn_material_data = {
                            'delivery_id': supplier_delivery_date.id,
                            'delivery_display_number': supplier_delivery_date.display_number,
                            'confirmed_delivery_date': supplier_delivery_date.confirmed_delivery_date,
                            'actual_delivery_date': supplier_delivery_date.actual_delivery_date.delivery_date if supplier_delivery_date.actual_delivery_date else None,
                            'pack_list_id': grn_matrial.supplier_po_grn.supplier_pack_list.id,
                            'pack_list_file': FileAttachmentSerializer(grn_matrial.supplier_po_grn.supplier_pack_list.pack_list).data,
                            'pack_list': grn_matrial.supplier_po_grn.supplier_pack_list.display_number,
                            'grn_id': grn_matrial.supplier_po_grn.id,
                            'grn_display_number': grn_matrial.supplier_po_grn.grn_number,
                            'headers': grn_matrial.grn_material.customer_brand_material.material_detail.generic_material.user_material.get_material_headers(grn_matrial.grn_material.customer_brand_material.material_detail.generic_material.user_material.name),
                            'attributes': grn_matrial.grn_material.customer_brand_material.get_attributes(),
                            'batches': []
                        }

                        if category == Material.FABRIC_MATERIAL:
                            batches = FabricGRNBatchNumber.objects.filter(grn_material=grn_matrial)
                            for batch in batches:
                                batch_data = {
                                    'id': batch.id,
                                    'batch_number': batch.batch_number,
                                    'rolls': []
                                }

                                rolls = InHouseMaterial.objects.filter(grn_material_detail__supplier_po_grn_material=grn_matrial, grn_material_detail__batch_number=batch)
                                for roll in rolls:
                                    shade = None
                                    transfer_material = None
                                    warehouse_material_transfer_detail = get_object_or_none(WarehouseMaterialTransferDetail, {'warehouse_material_transfer': instance, 'in_house_material': roll})
                                    if warehouse_material_transfer_detail:
                                        transfer_material = get_object_or_none(InHouseMaterialVerificationMaterial,
                                            {
                                                'inhouse_material': roll,
                                                'referance_material_type': warehouse_material_transfer_detail_ct,
                                                'referance_material_id': warehouse_material_transfer_detail.id,
                                                'inhouse_material_verification__state': InHouseMaterialVerification.COMPLETE_STATE,

                                            }
                                        )
                                    if transfer_material:
                                        if warehouse_material_transfer_detail:
                                            shade = warehouse_material_transfer_detail.previous_shade
                                    roll_data = SupplierPOGRNMaterialDetailSerializer(roll.grn_material_detail, many=False).data
                                    roll_data['previous_shade_id'] = shade.id if shade else None
                                    roll_data['previous_shade_name'] = shade.shade_name if shade else None
                                    roll_data['transfer_quantity'] = get_quantity_dictionary(transfer_material.usable_quantity, transfer_material.usable_quantity_units) if transfer_material else None
                                    roll_data['transfer_shade_id'] = transfer_material.shade.id if transfer_material and transfer_material.shade else None
                                    roll_data['transfer_shade_name'] = transfer_material.shade.shade_name if transfer_material and transfer_material.shade else None
                                    roll_data['transfer_color_tone'] = self.get_color_tone(transfer_material)
                                    batch_data['rolls'].append(roll_data)
                                grn_material_data['batches'].append(batch_data)

                            material_data[category]['material_data'].append(grn_material_data)
                        else:
                            grn_material_data.pop('batches')
                            material_details = SupplierPOGRNMaterialDetail.objects.filter(supplier_po_grn_material=grn_matrial)
                            if material_details:
                                transfer_materials = InHouseMaterialVerificationMaterial.objects.filter(
                                        inhouse_material__grn_material_detail__in=material_details,
                                        referance_material_type=warehouse_material_transfer_detail_ct,
                                        inhouse_material_verification__state=InHouseMaterialVerification.COMPLETE_STATE
                                )
                                transfer_total_grn_quantity = transfer_materials.aggregate(transfer_total_grn_quantity=Sum('usable_quantity'))['transfer_total_grn_quantity'] or 0
                                grn_material_data['grn_detail'] = SupplierPOGRNMaterialDetailSerializer(material_details[0], many=False).data
                                grn_material_data['transfer_quantity'] = get_quantity_dictionary(transfer_total_grn_quantity, material_normalized_measuring_unit)
                                material_data[category]['material_data'].append(grn_material_data)
                            #data.append(grn_material_data)

        return material_data

    def get_inhouse_material_transfer_state(self, instance):
        warehouse_material_transfer_detail_ct = ContentType.objects.get_for_model(WarehouseMaterialTransferDetail)
        transfer_mateiral_detail_ids = instance.warehousematerialtransferdetail_set.all().values_list('id', flat=True)
        is_created = InHouseMaterialVerificationMaterial.objects.filter(referance_material_type=warehouse_material_transfer_detail_ct, referance_material_id__in=transfer_mateiral_detail_ids).exists()
        return is_created


    def get_po_club_id(self, instance):
        po_club = instance.actual_po_club
        po_club_id = None
        if po_club:
            po_club_id = po_club.id
        return po_club_id

    def get_po_club_display_number(self, instance):
        po_club = instance.actual_po_club
        po_club_display_number = None
        if po_club:
            po_club_display_number = po_club.display_number
        return po_club_display_number

    def get_po_club_short_code(self, instance):
        po_club = instance.actual_po_club
        short_code = None
        if po_club:
            short_code = po_club.short_code
        return short_code

    def get_po_club_long_code(self, instance):
        po_club = instance.actual_po_club
        long_code = None
        if po_club:
            long_code = po_club.long_code
        return long_code

    def get_leftover_verifications(self, instance):
        data = []
        in_house_material_verifications = instance.get_in_house_material_verifications()
        for in_house_material_verification in in_house_material_verifications:
            data.append({
                'id': in_house_material_verification.id,
                'display_number': in_house_material_verification.display_number,
                'warehouse': in_house_material_verification.warehouse.warehouse_name if in_house_material_verification.warehouse else None,
                'state_display': in_house_material_verification.get_state_display()
            })
        return data

    class Meta:
        model = WarehouseMaterialTransfer
        fields = '__all__'


class WarehouseMaterialTransferForceEditDetailSerializer(serializers.ModelSerializer):
    display_number = serializers.CharField()
    warehouse_name = serializers.CharField(source='transfer_warehouse.warehouse_name')
    materials = serializers.SerializerMethodField()
    po_club_id = serializers.SerializerMethodField()
    po_club_display_number = serializers.SerializerMethodField()
    po_club_long_code = serializers.SerializerMethodField()
    po_club_short_code = serializers.SerializerMethodField()

    def get_materials(self, instance):
        warehouse_material_transfer_details = instance.warehousematerialtransferdetail_set.all()
        material_ids = warehouse_material_transfer_details.values_list('in_house_material__supplier_material__customer_brand_material', flat=True)
        materials = CustomerBrandMaterial.objects.filter(id__in=material_ids)

        data = {
            FABRIC_TRIM_TYPES: {'category': FABRIC_TRIM_TYPES, 'material_data': []},
            SEWING_TRIM_TYPES: {'category': SEWING_TRIM_TYPES, 'material_data': []},
            PACKAGING_TYPES: {'category': PACKAGING_TYPES, 'material_data': []},
        }

        for material in materials:
            normalized_measuring_unit = material.material_normalized_measuring_unit
            category = material.material_category

            if category in data:
                details = []
                material_details = warehouse_material_transfer_details.filter(in_house_material__supplier_material__customer_brand_material=material)
                for material_detail in material_details:
                    actual_width = get_quantity_dictionary(material_detail.in_house_material.grn_material_detail.fabricgrndetail.actual_width.actual_width, MaterialUnitHelper.INCHES_UNIT) if category == FABRIC_TRIM_TYPES else {}
                    details.append({
                        'id': material_detail.id,
                        'barcode' : material_detail.in_house_material.barcode,
                        'pack_number' : material_detail.in_house_material.grn_material_detail.fabricgrndetail.pack_number if  category == Material.FABRIC_MATERIAL else None,
                        'batch_number' : material_detail.in_house_material.grn_material_detail.batch_number.batch_number if  category == Material.FABRIC_MATERIAL else None,
                        'width' : actual_width,
                        'grn_quantity' : get_quantity_dictionary(material_detail.in_house_material.grn_material_detail.actual_quantity, normalized_measuring_unit),
                        'transfer_quantity' : get_quantity_dictionary(material_detail.quantity, normalized_measuring_unit),
                    })
                total_quantity = calculate_queryset_total_normalized_quantity(material_details, normalized_measuring_unit, 'quantity', 'quantity_units')
                data[category]['material_data'].append({
                    'id': material.id,
                    'category': category,
                    'attributes': material.get_attributes(),
                    'total_transfer_quantity': get_quantity_dictionary(total_quantity, normalized_measuring_unit),
                    'transfer_verification': self.get_inhouse_material_transfer_state_by_material(material_details),
                    'details': details,
                })

        return data

    def get_inhouse_material_transfer_state_by_material(self, material_details):
        warehouse_material_transfer_detail_ct = ContentType.objects.get_for_model(WarehouseMaterialTransferDetail)
        is_created = InHouseMaterialVerificationMaterial.objects.filter(
            referance_material_type=warehouse_material_transfer_detail_ct,
            referance_material_id__in=material_details.values_list('id', flat=True),
            inhouse_material_verification__state=InHouseMaterialVerification.COMPLETE_STATE
        ).exists()
        return is_created

    def get_po_club_id(self, instance):
        po_club = instance.actual_po_club
        po_club_id = None
        if po_club:
            po_club_id = po_club.id
        return po_club_id

    def get_po_club_display_number(self, instance):
        po_club = instance.actual_po_club
        po_club_display_number = None
        if po_club:
            po_club_display_number = po_club.display_number
        return po_club_display_number

    def get_po_club_short_code(self, instance):
        po_club = instance.actual_po_club
        short_code = None
        if po_club:
            short_code = po_club.short_code
        return short_code

    def get_po_club_long_code(self, instance):
        po_club = instance.actual_po_club
        long_code = None
        if po_club:
            long_code = po_club.long_code
        return long_code

    class Meta:
        model = WarehouseMaterialTransfer
        fields = '__all__'