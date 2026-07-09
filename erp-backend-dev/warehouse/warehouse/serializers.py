from rest_framework import serializers
from shared.models import *
from marketing.models import PurchaseOrderAllocatedMaterial, PurchaseOrderBom, ActualPOClub
from materials.models import SupplierInquiryMaterialCode, CustomerBrandMaterial, CustomerBrandMaterialCode
from supplier_po.supplier_po_grn.serializers import SupplierPOGRNMaterialDetailSerializer
from django.utils import timezone

class PlantWarehouseMainSerializer(serializers.ModelSerializer):
    
    display_number = serializers.SerializerMethodField()
    plant_name = serializers.CharField(source='plant.name', read_only=True)
    role_full_name = serializers.SerializerMethodField()

    class Meta:
        model = PlantWarehouse
        fields = '__all__'

    def get_role_full_name(self, obj):

        if obj.role:
            return obj.role.get_full_name()
        else:
            return None
        
    def get_display_number(self, obj):
        return obj.display_number
        

class PlantWarehouseRackBinSerializer(serializers.ModelSerializer):

    display_number = serializers.SerializerMethodField()
    customer_name = serializers.CharField(source='customer.name', read_only=True)

    class Meta:
        model = PlantWarehouseRackBin
        fields = ['id','display_number', 'bin_number', 'length','length_unit','width','width_unit','height','height_unit','customer','customer_name']
    
    def get_display_number(self, obj):
        return obj.display_number
    

class PlantWarehouseRackSerializer(serializers.ModelSerializer):
    
    display_number = serializers.SerializerMethodField()
    bin_details = PlantWarehouseRackBinSerializer(many=True, read_only=True, source='plantwarehouserackbin_set')

    class Meta:
        model = PlantWarehouseRack
        fields = ['id', 'display_number', 'rack_number', 'number_of_bins', 'location_x', 'location_y', 'bin_details']

    def get_display_number(self, obj):
        return obj.display_number


# class PlantWarehouseDetailSerializer(serializers.ModelSerializer):

#     plant_name = serializers.CharField(source='plant.name', read_only=True)
#     rack_details = PlantWarehouseRackSerializer(many=True, read_only = True, source='plantwarehouserack_set')

#     class Meta:
#         model = PlantWarehouse
#         fields = ['id','warehouse_name','plant_name','rack_details']


class PlantWarehouseRackMainSerializer(serializers.ModelSerializer):

    display_number = serializers.SerializerMethodField()
    plant_name = serializers.CharField(source='warehouse.plant.name', read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.warehouse_name', read_only=True)

    class Meta:
        model = PlantWarehouseRack
        fields = '__all__'
    
    def get_display_number(self, obj):
        return obj.display_number
    

class PlantWarehouseRackDetailSerializer(serializers.ModelSerializer):
    
    display_number = serializers.SerializerMethodField()
    plant_name = serializers.CharField(source='warehouse.plant.name', read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.warehouse_name', read_only=True)
    bin_details = PlantWarehouseRackBinSerializer(many=True, read_only=True, source='plantwarehouserackbin_set')

    class Meta:
        model = PlantWarehouseRack
        fields = ['id', 'display_number', 'rack_number', 'number_of_bins', 'location_x', 'location_y', 'plant_name', 'warehouse_name', 'bin_details']
    
    def get_display_number(self, obj):
        return obj.display_number
    

class PlantWarehouseRackBinMainSerializer(serializers.ModelSerializer):

    display_number = serializers.SerializerMethodField()
    warehouse_id = serializers.IntegerField(source='warehouse_rack.warehouse.id', read_only=True)
    warehouse_name = serializers.CharField(source='warehouse_rack.warehouse.warehouse_name', read_only=True)
    plant_name = serializers.CharField(source='warehouse_rack.warehouse.plant.name', read_only=True)
    rack_number = serializers.CharField(source='warehouse_rack.rack_number', read_only=True)
    customer_name = serializers.CharField(source='customer.name',read_only=True)
    rack_display_number = serializers.SerializerMethodField()

    class Meta:
        model = PlantWarehouseRackBin
        fields = '__all__'
    
    def get_display_number(self, obj):
        return obj.display_number
    
    def get_rack_display_number(self,obj):
        return obj.warehouse_rack.display_number
    

class PlantWarehouseRackBinDetailSerializer(serializers.ModelSerializer):
    
    display_number = serializers.SerializerMethodField()
    plant_name = serializers.CharField(source='warehouse_rack.warehouse.plant.name', read_only=True)
    warehouse_name = serializers.CharField(source='warehouse_rack.warehouse.warehouse_name', read_only=True)
    rack_number = serializers.CharField(source='warehouse_rack.rack_number', read_only=True)

    class Meta:
        model = PlantWarehouseRackBin
        fields = ['id','display_number','length','length_unit','width','width_unit','height','height_unit','plant_name','warehouse_name','rack_number']

    def get_display_number(self, obj):
        return obj.display_number
    

class PlantWarehouseCustomerRackBinSerializer(serializers.ModelSerializer):

    display_number = serializers.SerializerMethodField()
    plant_name = serializers.CharField(source='warehouse_rack.warehouse.plant.name', read_only=True)
    warehouse = serializers.IntegerField(source='warehouse_rack.warehouse.id', read_only=True)
    warehouse_name = serializers.CharField(source='warehouse_rack.warehouse.warehouse_name', read_only=True)
    warehouse_rack_number = serializers.CharField(source='warehouse_rack.rack_number', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)

    class Meta:
        model = PlantWarehouseRackBin
        fields = ['id', 'display_number', 'plant_name', 'warehouse', 'warehouse_name', 'warehouse_rack', 'warehouse_rack_number', 'customer', 'customer_name']
    
    def get_display_number(self, obj):
        return obj.display_number


class PlantWarehouseRackCustomerBinSerializer(serializers.ModelSerializer):

    warehouse_id = serializers.SerializerMethodField()
    warehouse_name = serializers.SerializerMethodField()
    customer_name = serializers.SerializerMethodField()
    bin_details = serializers.SerializerMethodField()

    class Meta:
        model = PlantWarehouseRackBin
        fields = ['warehouse_id', 'warehouse_name', 'customer', 'customer_name', 'bin_details']
    
    def get_warehouse_id(self, obj):
        return obj.warehouse_rack.warehouse.id

    def get_warehouse_name(self, obj):
        return obj.warehouse_rack.warehouse.warehouse_name
    
    def get_customer_name(self,obj):
        return obj.customer.name
    
    def get_bin_details(self, obj):
        bins = PlantWarehouseRackBin.objects.filter(warehouse_rack__warehouse=obj.warehouse_rack.warehouse, customer=obj.customer)
        return [
            {
            "id":bin.id,
            "display_number":bin.display_number,
            "plant":bin.warehouse_rack.warehouse.plant.name,
            "rack_id":bin.warehouse_rack.id,
            "rack_number": bin.warehouse_rack.rack_number,
            }
            for bin in bins
        ]


class SupplierInquiryMaterialCodeSerializer(serializers.ModelSerializer):

    class Meta:
        model = SupplierInquiryMaterialCode
        fields = ['id', 'supplier_material_reference_code']


class CustomerBrandMaterialCodeSerializer(serializers.ModelSerializer):
     
    customer_brand_material_code = serializers.CharField(source='material_code.verbose_reference_code', read_only=True)

    class Meta:
        model = CustomerBrandMaterial
        fields = ['id', 'customer_brand_material_code']


class InHouseMaterialSerializer(serializers.ModelSerializer):

    material_category = serializers.CharField(source='customer_brand_material.material_detail.generic_material.user_material.category', read_only=True)
    material_type = serializers.CharField(source='customer_brand_material.material_detail.generic_material.user_material.material', read_only=True)
    supplier_material_code = serializers.CharField(source='supplier_material.supplier_material_reference_code', read_only=True)
    customer_brand_material_code_id = serializers.IntegerField(source='customer_brand_material.material_code.id', read_only=True)
    customer_brand_material_code = serializers.CharField(source='customer_brand_material.material_code.verbose_reference_code', read_only=True)
    available_quantity_units_display = serializers.SerializerMethodField()
    quantity_units_display = serializers.SerializerMethodField()
    cutting_width_units_display = serializers.SerializerMethodField()
    cutting_width = serializers.FloatField(required=False, allow_null=True)
    cutting_width_units = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = InHouseMaterial
        fields = ['id', 'material_category', 'material_type', 'supplier_material', 'supplier_material_code', 'customer_brand_material', 'customer_brand_material_code_id', 'customer_brand_material_code', 'available_quantity', 'available_quantity_units_display', 'available_quantity_units', 'quantity', 'quantity_units_display', 'quantity_units', 'cutting_width', 'cutting_width_units', 'cutting_width_units_display', 'state']
    
    def get_available_quantity_units_display(self, obj):
        return obj.get_available_quantity_units_display()
    
    def get_quantity_units_display(self, obj):
        return obj.get_quantity_units_display()
    
    def get_cutting_width_units_display(self, obj):
        return obj.get_cutting_width_units_display()
    

class PurchaseOrderAllocationSerializer(serializers.ModelSerializer):
    
    customer_brand_material = serializers.IntegerField(source='purchase_order_bom.material.id', required=True, allow_null=False)
    purchase_order = serializers.IntegerField(source='purchase_order_bom.purchase_order.id', required=True, allow_null=False)
    purchase_order_number = serializers.CharField(source='purchase_order_bom.purchase_order.display_number', read_only=True)
    purchase_order_bom = serializers.PrimaryKeyRelatedField(queryset=PurchaseOrderBom.objects.all(), required=False)
    allocated_quantity = serializers.FloatField(required=True, allow_null=False)
    allocated_quantity_units_display = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrderAllocatedMaterial
        fields = ['id', 'customer_brand_material', 'purchase_order', 'purchase_order_number', 'in_house_material', 'purchase_order_bom', 'allocated_quantity', 'allocated_quantity_units', 'allocated_quantity_units_display']

    def get_allocated_quantity_units_display(self, obj):
        return obj.get_allocated_quantity_units_display()
    

class PurchaseOrderAllocationDetailSerializer(serializers.ModelSerializer):

    purchase_order = serializers.IntegerField(source='purchase_order_bom.purchase_order.id', read_only=True)
    purchase_order_number = serializers.CharField(source='purchase_order_bom.purchase_order.display_number', read_only=True)
    customer_brand_material = serializers.IntegerField(source='in_house_material.customer_brand_material.id', read_only=True)
    customer_brand_material_code = serializers.CharField(source='in_house_material.customer_brand_material.material_code.verbose_reference_code', read_only=True)
    allocated_quantity_units_display = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrderAllocatedMaterial
        fields = ['id', 'purchase_order', 'purchase_order_number', 'in_house_material', 'purchase_order_bom', 'customer_brand_material', 'customer_brand_material_code', 'allocated_quantity', 'allocated_quantity_units', 'allocated_quantity_units_display']

    def get_allocated_quantity_units_display(self, obj):
        return obj.get_allocated_quantity_units_display()
    

class InHouseMaterialBasicSerializer(serializers.ModelSerializer):
    
    in_house_material = serializers.IntegerField(source='id', read_only=True, required=False)
    material_category = serializers.CharField(source='supplier_material.customer_brand_material.material_detail.generic_material.user_material.get_category_display', read_only=True, required=False)
    customer_brand_verbose_reference_code = serializers.CharField(source='supplier_material.customer_brand_material.verbose_reference_code', read_only=True, required=False)
    quantity = serializers.FloatField(source='normalized_quantity', read_only=True, required=False)
    available_quantity = serializers.FloatField(source='normalized_available_quantity', read_only=True, required=False)
    issue_quantity = serializers.FloatField(source='normalized_issue_quantity', read_only=True, required=False)
    quantity_units_display = serializers.SerializerMethodField(read_only=True)
    cutting_width_units_display = serializers.CharField(source='get_cutting_width_units_display', read_only=True, required=False)
    issue_note_material_id = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model =  InHouseMaterial
        fields = '__all__'

    def get_quantity_units_display(self, instance):
        unit = instance.normalized_quantity_unit.capitalize()
        return unit
    
    def get_issue_note_material_id(self, instance):
        issue_note_material_id = None
        return issue_note_material_id
     

class InHouseMaterialSupplierPOGRNSerializer(InHouseMaterialBasicSerializer):

    supplier_po_grn_material_detail = SupplierPOGRNMaterialDetailSerializer(source='grn_material_detail', read_only=True, required=False)
    issue_note_material_ids = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model =  InHouseMaterial
        fields = '__all__'

    def get_issue_note_material_ids(self, instance):
        issue_note_materials = instance.issuenotematerial_set.distinct()
        issue_note_material_ids = []
        if issue_note_materials:
            for issue_note_material in issue_note_materials:
                issue_note_material_ids.append(issue_note_material.id)
        return issue_note_material_ids


class POClubMetaDataSearchableListSerializer(serializers.ModelSerializer):

    po_club_id = serializers.IntegerField(source='pk', read_only=True, required=False)
    po_club_number = serializers.CharField(source='display_number', read_only=True, required=False)

    class Meta:
        model = ActualPOClub
        fields = ('po_club_id', 'po_club_number')


class IssueNoteCreateSerializer(serializers.ModelSerializer):

    issuer = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=True, allow_null=False)
    remarks = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = IssueNote
        fields = '__all__'

    def create(self, validated_data):
        validated_data['issue_date'] = timezone.now()
        return super().create(validated_data)
    

class IssueNoteMaterialCreateSerializer(serializers.ModelSerializer):
    
    issue_note = serializers.PrimaryKeyRelatedField(queryset=IssueNote.objects.all(), required=True, allow_null=True)
    in_house_material = serializers.PrimaryKeyRelatedField(queryset=InHouseMaterial.objects.all(), required=True, allow_null=False)
    issue_quantity = serializers.FloatField(required=True, allow_null=False)
    issue_quantity_units = serializers.CharField(required=True, allow_null=False)

    class Meta:
        model = IssueNoteMaterial
        fields = '__all__'


class IssueNoteListSerializer(serializers.ModelSerializer):
    
    display_number = serializers.CharField(read_only=True)
    state_display = serializers.CharField(source='get_state_display', read_only=True)

    class Meta:
        model = IssueNote
        fields = '__all__'


class IssueNoteMaterialListSerializer(serializers.ModelSerializer):

    issue_note_material_id = serializers.IntegerField(source='id', read_only=True)
    issue_quantity_units_display = serializers.CharField(source='get_issue_quantity_units_display', read_only=True)
    warehouse_id = serializers.CharField(source='in_house_material.warehouse_bin.warehouse_rack.warehouse.id', read_only=True)
    warehouse = serializers.CharField(source='in_house_material.warehouse_bin.warehouse_rack.warehouse.warehouse_name', read_only=True)
    barcode = serializers.CharField(source='in_house_material.barcode', read_only=True)
    material_category = serializers.CharField(source='in_house_material.supplier_material.customer_brand_material.material_detail.generic_material.user_material.get_category_display', read_only=True)
    customer_brand_verbose_reference_code = serializers.CharField(source='in_house_material.supplier_material.customer_brand_material.verbose_reference_code', read_only=True)
    quantity = serializers.FloatField(source='in_house_material.normalized_quantity', read_only=True)
    available_quantity = serializers.FloatField(source='in_house_material.normalized_available_quantity', read_only=True)
    quantity_units_display = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = IssueNoteMaterial
        fields = '__all__'

    def get_quantity_units_display(self, instance):
        unit = instance.in_house_material.normalized_quantity_unit.capitalize()
        return unit


class IssueNoteDetailSerializer(IssueNoteListSerializer):

    issue_note_materials = IssueNoteMaterialListSerializer(source='issuenotematerial_set', many=True, read_only=True)

    class Meta:
        model = IssueNote
        fields = '__all__'