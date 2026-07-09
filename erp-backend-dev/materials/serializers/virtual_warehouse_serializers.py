from rest_framework import serializers
from rest_framework.serializers import ModelSerializer
from shared.models import Plant, Customer, InHouseMaterial
from shared.serializers import CustomerSerializer, FileAttachmentSerializer

from marketing.models import PurchaseOrder, SupplierPOGRNMaterialDetail, POClubLeftOverMaterial, ActualPOClub
from marketing.serializers import POClubShadeSerializer
from materials.serializers.material_serializers import CustomerBrandMaterialBasicSerializer
from django.db.models import Sum
from supplier_po.models import GeneralPO
from shared.utils import get_quantity_dictionary, get_attributes
from materials.models import FABRIC_TRIM_TYPES, SEWING_TRIM_TYPES, PACKAGING_TYPES, InHouseMaterialVerification, InHouseMaterialVerificationMaterial
from django.contrib.contenttypes.models import ContentType


class PlantCustomerSerializer(ModelSerializer):
    customers = serializers.SerializerMethodField(read_only=True)

    def get_customers(self, instance):
        customers_ids = GeneralPO.objects.filter(plant=instance).exclude(po_club=None).distinct('costing__order__customer').values_list('costing__order__customer')
        customer_queryset = Customer.objects.filter(pk__in=customers_ids)
        customer_serializer = CustomerSerializer(customer_queryset, many=True)
        return customer_serializer.data
    class Meta:
        model = Plant
        fields = '__all__'

class InHouseMaterialSerializer(serializers.ModelSerializer):
    material_details = serializers.SerializerMethodField(read_only=True)
    club_id = serializers.IntegerField(source='grn_material_detail.supplier_po_grn_material.supplier_po_grn.supplier_po.general_po_supplier.general_po.po_club.id', read_only=True)
    club_display_number = serializers.CharField(source='grn_material_detail.supplier_po_grn_material.supplier_po_grn.supplier_po.general_po_supplier.general_po.po_club.display_number', read_only=True)
    plant_id = serializers.IntegerField(source='grn_material_detail.supplier_po_grn_material.supplier_po_grn.supplier_po.general_po_supplier.general_po.plant.id', read_only=True)
    plant_name = serializers.CharField(source='grn_material_detail.supplier_po_grn_material.supplier_po_grn.supplier_po.general_po_supplier.general_po.plant.name', read_only=True)
    customer_id = serializers.IntegerField(source='grn_material_detail.supplier_po_grn_material.grn_material.customer_brand_material.material_code.customer_brand.customer.id', read_only=True)
    supplier_name = serializers.CharField(source='grn_material_detail.supplier_po_grn_material.supplier_po_grn.supplier_po.general_po_supplier.supplier.name', read_only=True)
    supplier_id = serializers.IntegerField(source='grn_material_detail.supplier_po_grn_material.supplier_po_grn.supplier_po.general_po_supplier.supplier.id', read_only=True)
    customer_name = serializers.CharField(source='grn_material_detail.supplier_po_grn_material.grn_material.customer_brand_material.material_code.customer_brand.customer.name', read_only=True)
    costing_version_display_number = serializers.CharField(source='grn_material_detail.supplier_po_grn_material.supplier_po_grn.supplier_po.general_po_supplier.general_po.costing.version_display_number', read_only=True)
    costing_version = serializers.CharField(source='grn_material_detail.supplier_po_grn_material.supplier_po_grn.supplier_po.general_po_supplier.general_po.costing.id', read_only=True)
    available_quantity_units_display = serializers.CharField(source='get_available_quantity_units_display', read_only=True)

    def get_material_details(self, instance):
        return CustomerBrandMaterialBasicSerializer(instance.grn_material_detail.supplier_po_grn_material.grn_material.customer_brand_material).data

    class Meta:
        model = InHouseMaterial
        fields = ('__all__')


class VirtualWarehousePageLoadingDetailSerializer(serializers.ModelSerializer):
    club_id = serializers.IntegerField(source='grn_material_detail.supplier_po_grn_material.supplier_po_grn.supplier_po.general_po_supplier.general_po.po_club.id', read_only=True)
    club_display_number = serializers.CharField(source='grn_material_detail.supplier_po_grn_material.supplier_po_grn.supplier_po.general_po_supplier.general_po.po_club.display_number', read_only=True)
    plant_id = serializers.IntegerField(source='grn_material_detail.supplier_po_grn_material.supplier_po_grn.supplier_po.general_po_supplier.general_po.plant.id', read_only=True)
    plant_name = serializers.CharField(source='grn_material_detail.supplier_po_grn_material.supplier_po_grn.supplier_po.general_po_supplier.general_po.plant.name', read_only=True)
    customer_id = serializers.IntegerField(source='grn_material_detail.supplier_po_grn_material.grn_material.customer_brand_material.material_code.customer_brand.customer.id', read_only=True)
    supplier_name = serializers.CharField(source='grn_material_detail.supplier_po_grn_material.supplier_po_grn.supplier_po.general_po_supplier.supplier.name', read_only=True)
    supplier_id = serializers.IntegerField(source='grn_material_detail.supplier_po_grn_material.supplier_po_grn.supplier_po.general_po_supplier.supplier.id', read_only=True)
    customer_name = serializers.CharField(source='grn_material_detail.supplier_po_grn_material.grn_material.customer_brand_material.material_code.customer_brand.customer.name', read_only=True)
    costing_version_display_number = serializers.CharField(source='grn_material_detail.supplier_po_grn_material.supplier_po_grn.supplier_po.general_po_supplier.general_po.costing.version_display_number', read_only=True)
    costing_version = serializers.CharField(source='grn_material_detail.supplier_po_grn_material.supplier_po_grn.supplier_po.general_po_supplier.general_po.costing.id', read_only=True)
    category = serializers.SerializerMethodField(read_only=True)

    def get_category(self, obj):
        category_dict = {
            'order_specific_row_material': [
                obj.EXCESS_STATUS,
                obj.SAVING_BULK,
                obj.SAVING_PRODUCTION,
                obj.SAVING_CUTTING
                ],
                'rejection': [
                    obj.COLOR_TONE_REJECTION,
                    obj.BATCH_REJECTION,
                    obj.OTHER_REJECTION
                    ]
                }
        category = None
        for key in category_dict:
            if obj.state in category_dict[key]:
                category = key
                break
        return category if category else obj.state
    
    class Meta:
        model = InHouseMaterial
        fields = ['plant_id', 'plant_name', 'customer_id', 'customer_name', 'club_display_number', 'club_id', 'category', 'supplier_id', 'supplier_name', 'costing_version', 'costing_version_display_number']



class VirtualWarehouseBaseSerializer(serializers.ModelSerializer):
    in_house_material_id = serializers.IntegerField(source='id', read_only=True)
    club_id = serializers.IntegerField(source='grn_material_detail.supplier_po_grn_material.supplier_po_grn.supplier_po.general_po_supplier.general_po.po_club.id', read_only=True)
    club_display_number = serializers.CharField(source='grn_material_detail.supplier_po_grn_material.supplier_po_grn.supplier_po.general_po_supplier.general_po.po_club.display_number', read_only=True)
    plant_id = serializers.IntegerField(source='grn_material_detail.supplier_po_grn_material.supplier_po_grn.supplier_po.general_po_supplier.general_po.plant.id', read_only=True)
    plant_name = serializers.CharField(source='grn_material_detail.supplier_po_grn_material.supplier_po_grn.supplier_po.general_po_supplier.general_po.plant.name', read_only=True)
    customer_id = serializers.IntegerField(source='grn_material_detail.supplier_po_grn_material.grn_material.customer_brand_material.material_code.customer_brand.customer.id', read_only=True)
    customer_name = serializers.CharField(source='grn_material_detail.supplier_po_grn_material.grn_material.customer_brand_material.material_code.customer_brand.customer.name', read_only=True)
    supplier_name = serializers.CharField(source='grn_material_detail.supplier_po_grn_material.supplier_po_grn.supplier_po.general_po_supplier.supplier.name', read_only=True)
    item = serializers.CharField(source='grn_material_detail.supplier_po_grn_material.grn_material.customer_brand_material.material_label', read_only=True)
    description = serializers.CharField(source='grn_material_detail.supplier_po_grn_material.grn_material.customer_brand_material.verbose_reference_code', read_only=True)
    color = serializers.SerializerMethodField(read_only=True)
    aging = serializers.CharField(source='get_aging', read_only=True)
    date = serializers.DateField(source='get_delivery_date', read_only=True)
    image = serializers.SerializerMethodField(read_only=True)

    def get_color(self, obj):
        customer_brand_material_data = CustomerBrandMaterialBasicSerializer(obj.grn_material_detail.supplier_po_grn_material.grn_material.customer_brand_material).data
        color = None
        for header in customer_brand_material_data['headers']:
            if header['label'] == 'Color':
                color = customer_brand_material_data['attributes'][header['value']]
        return color

    def get_image(self, obj):
        # material_type = obj.grn_material_detail.supplier_po_grn_material.grn_material.customer_brand_material.material_type
        # if not obj.grn_material_detail.attachments.all():
        #     from shared.models import FileAttachment
        #     button = FileAttachment.objects.get(pk=1250)
        #     care_label = FileAttachment.objects.get(pk=1251)
        #     hanger = FileAttachment.objects.get(pk=1252)
        #     carton_sticker = FileAttachment.objects.get(pk=1253)
        #     carton_divider = FileAttachment.objects.get(pk=1254)
        #     yarn_cone = FileAttachment.objects.get(pk=1255)
        #     carton = FileAttachment.objects.get(pk=1256)
        #     fabric = FileAttachment.objects.get(pk=1257)
        #     button_size = FileAttachment.objects.get(pk=1258)
        #     files = {
        #         'button': button,
        #         'carelabel': care_label,
        #         'hanger': hanger,
        #         'carton_sticker': carton_sticker,
        #         'carton_divider': carton_divider,
        #         'thread': yarn_cone,
        #         'carton': carton,
        #         'fabric': fabric
        #     }
        #     if material_type in files:
        #         grn_material_detail = obj.grn_material_detail
        #         grn_material_detail.attachments.add(files[material_type].id)
        #         grn_material_detail.save()
        return_url = None
        if obj.grn_material_detail.attachments.all():
            return_url = obj.grn_material_detail.attachments.all()[0].file_path
        return return_url
    
    class Meta:
        model = InHouseMaterial
        fields = ['in_house_material_id', 'club_id', 'club_display_number', 'plant_id', 'plant_name', 'customer_id', 'customer_name', 'supplier_name', 'item', 'description', 'color', 'aging', 'date', 'image']



class VirtualWarehouseFabricSerializer(VirtualWarehouseBaseSerializer):

    colorway_category = serializers.SerializerMethodField(read_only=True)
    excess = serializers.DictField(source='get_excess_quantity', read_only=True)
    bulk_saving = serializers.DictField(source='get_bulk_saving_quantity', read_only=True)
    cutting_saving = serializers.DictField(source='get_cutting_saving_quantity', read_only=True)
    production_saving = serializers.DictField(source='get_production_saving_quantity', read_only=True)
    from_sao = serializers.CharField(source='get_sao', read_only=True)
    from_po = serializers.CharField(source='get_po', read_only=True)
    total_quantity = serializers.DictField(source='get_total_quantity', read_only=True)

    def get_colorway_category(self, obj):
        return obj.grn_material_detail.supplier_po_grn_material.grn_material.customer_brand_material.get_attributes()['fabric_type_display_value']
    
    def get_description(self, obj):
        return obj.grn_material_detail.supplier_po_grn_material.grn_material.customer_brand_material.get_attributes()['fabric_texture_description_display_value']
    
    

    class Meta:

        model = VirtualWarehouseBaseSerializer.Meta.model
        fields = [*VirtualWarehouseBaseSerializer.Meta.fields, 'colorway_category', 'excess', 'bulk_saving', 'cutting_saving', 'production_saving', 'from_sao', 'from_po', 'total_quantity']


class VirtualWarehousePackagingSerializer(VirtualWarehouseBaseSerializer):

    total_quantity = serializers.DictField(source='get_total_quantity', read_only=True)


    class Meta:
        model = VirtualWarehouseBaseSerializer.Meta.model
        fields = [*VirtualWarehouseBaseSerializer.Meta.fields, 'aging', 'total_quantity']


class VirtualWarehouseSewingSerializer(VirtualWarehouseBaseSerializer):

    excess = serializers.DictField(source='get_excess_quantity', read_only=True)
    sewing_quantity = serializers.DictField(source='get_sewing_quantity', read_only=True)
    from_sao = serializers.CharField(source='get_sao', read_only=True)
    from_po = serializers.CharField(source='get_po', read_only=True)
    shape = serializers.SerializerMethodField(read_only=True)
    total_quantity = serializers.DictField(source='get_total_quantity', read_only=True)

    def get_shape(self, obj):
        shape = None
        return shape

    class Meta:
        model = VirtualWarehouseBaseSerializer.Meta.model
        fields = [*VirtualWarehouseBaseSerializer.Meta.fields, 'excess', 'sewing_quantity', 'from_sao', 'from_po', 'shape', 'total_quantity']


class POClubLeftOverMaterialSerializer(serializers.ModelSerializer):
    width = serializers.JSONField(source='in_house_material.grn_material_detail.fabricgrndetail.actual_width.actual_width_display_value', read_only=True)
    batch_number = serializers.SerializerMethodField(read_only=True)
    material_type = serializers.CharField(source='in_house_material.grn_material_detail.supplier_po_grn_material.grn_material.customer_brand_material.material_type', read_only=True)
    material_label = serializers.CharField(source='in_house_material.grn_material_detail.supplier_po_grn_material.grn_material.customer_brand_material.material_label', read_only=True)
    quantity_units_display = serializers.CharField(source='get_quantity_units_display', read_only=True)

    def get_batch_number(self, obj):
        batch_number = None
        if hasattr(obj ,'in_house_material'):
            batch_number = get_attributes(obj,'in_house_material__grn_material_detail__batch_number__batch_number')
        return batch_number
    
    class Meta:
        model = POClubLeftOverMaterial
        fields = '__all__'


class OrderSpecificMaterialsDetailSerializer(serializers.ModelSerializer):

    material_category = serializers.CharField(source='grn_material_detail.supplier_po_grn_material.grn_material.customer_brand_material.material_category', read_only=True)
    material_category_label = serializers.CharField(source='grn_material_detail.supplier_po_grn_material.grn_material.customer_brand_material.material_category_label', read_only=True)
    state = serializers.SerializerMethodField(read_only=True)
    available_quantity = serializers.SerializerMethodField(read_only=True)
    excess_quantity = serializers.SerializerMethodField(read_only=True)
    bulk_savings = serializers.SerializerMethodField(read_only=True)
    cutting_savings = serializers.SerializerMethodField(read_only=True)
    production_savings = serializers.SerializerMethodField(read_only=True)

    def get_state(self, obj):
        return 'order_specific_raw_material' if obj.state in ['excess'] else obj.state
    
    def get_available_quantity(self, obj):
        material_category = obj.grn_material_detail.supplier_po_grn_material.grn_material.customer_brand_material.material_category
        if not obj.state in ['excess'] and not obj.parent_material or material_category == PACKAGING_TYPES:
            return_data = get_quantity_dictionary(obj.available_quantity, obj.available_quantity_units)
        else:
            return_data = None
        return return_data
    
    def get_excess_quantity(self, obj):
        material_category = obj.grn_material_detail.supplier_po_grn_material.grn_material.customer_brand_material.material_category
        if obj.state in ['excess'] and not material_category == PACKAGING_TYPES:
            return_data = obj.get_excess_quantity()
        else:
            return_data = None
        return return_data

    def get_bulk_savings(self, obj):
        in_house_material_bulk_savings = obj.inhousematerial_set.filter(state=obj.SAVING_BULK, available_quantity__gt=0)
        bulk_savings = []
        for in_house_material_bulk_saving in in_house_material_bulk_savings:
            bulk_savings.append({
                'id': in_house_material_bulk_saving.id,
                'available_quantity': get_quantity_dictionary(in_house_material_bulk_saving.available_quantity, in_house_material_bulk_saving.available_quantity_units),
                'barcode': in_house_material_bulk_saving.barcode
            })
        return bulk_savings
    
    def get_cutting_savings(self, obj):
        in_house_material_cutting_savings = obj.inhousematerial_set.filter(state=obj.SAVING_CUTTING, available_quantity__gt=0)
        cutting_savings = []
        for in_house_material_cutting_saving in in_house_material_cutting_savings:
            cutting_savings.append({
                'id': in_house_material_cutting_saving.id,
                'available_quantity': get_quantity_dictionary(in_house_material_cutting_saving.available_quantity, in_house_material_cutting_saving.available_quantity_units),
                'barcode': in_house_material_cutting_saving.barcode
            })
        return cutting_savings
    
    def get_production_savings(self, obj):
        in_house_material_production_savings = obj.inhousematerial_set.filter(state=obj.SAVING_PRODUCTION, available_quantity__gt=0)
        production_savings = []
        for in_house_material_production_saving in in_house_material_production_savings:
            production_savings.append({
                'id': in_house_material_production_saving.id,
                'available_quantity': get_quantity_dictionary(in_house_material_production_saving.available_quantity, in_house_material_production_saving.available_quantity_units),
                'barcode': in_house_material_production_saving.barcode
            })
        return production_savings

    class Meta:
        model = InHouseMaterial
        fields = ['id', 'barcode', 'state', 'material_category', 'material_category_label', 'available_quantity', 'excess_quantity', 'bulk_savings', 'cutting_savings', 'production_savings']


class InHouseMaterialVerificationSerializer(ModelSerializer):
    display_number = serializers.CharField()
    state_display = serializers.SerializerMethodField()
    plant_name = serializers.SerializerMethodField()
    warehouse_id = serializers.IntegerField()
    warehouse_name = serializers.SerializerMethodField()
    po_clubs = serializers.SerializerMethodField()

    def get_state_display(self, instance):
        return instance.get_state_display()
    
    def get_plant_name(self, instance):
        plant = None
        if instance.warehouse:
            plant = instance.warehouse.plant.name
        return plant
    
    def get_warehouse_name(self, instance):
        warehouse_name = None
        if instance.warehouse:
            warehouse_name = instance.warehouse.name
        return warehouse_name
    
    def get_po_clubs(self, instance):
        data = []
        po_club_left_over_material_ct = ContentType.objects.get_for_model(POClubLeftOverMaterial)
        referance_material_ids = instance.inhousematerialverificationmaterial_set.filter(referance_material_type=po_club_left_over_material_ct).values_list('referance_material_id', flat=True)
        if referance_material_ids:
            po_club_ids = POClubLeftOverMaterial.objects.filter(id__in=referance_material_ids).values_list('po_club', flat=True)
            po_clubs = ActualPOClub.objects.filter(id__in=po_club_ids)
            for po_club in po_clubs:
                data.append({
                    'id': po_club.id,
                    'display_number': po_club.display_number
                })
        return data

    class Meta:
        model = InHouseMaterialVerification
        fields = '__all__'


class InHouseMaterialVerificationMaterialSerializer(ModelSerializer):
    display_number = serializers.CharField()
    inhouse_material_verification = InHouseMaterialVerificationSerializer(many=False)
    barcode = serializers.CharField(source='inhouse_material.grn_material_detail.barcode')
    shade = POClubShadeSerializer(many=False)
    available_quantity_units_display = serializers.CharField(source='get_available_quantity_units_display')
    usable_quantity_units_display = serializers.CharField(source='get_usable_quantity_units_display')
    # color_tone = serializers.SerializerMethodField()

    # def get_color_tone(self, instance):
    #     data = {}
    #     if instance.color_tone:
    #         data = {
    #             'id': instance.color_tone.id,
    #             'display_value': instance.display_value
    #         }
    #     return data

    class Meta:
        model = InHouseMaterialVerificationMaterial
        fields = '__all__'




    