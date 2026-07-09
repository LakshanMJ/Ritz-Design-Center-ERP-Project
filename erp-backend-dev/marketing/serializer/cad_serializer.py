from rest_framework import serializers
from rest_framework.serializers import ModelSerializer
from marketing.models import MarkerCutPlan, RollSequence, SelectedRoll, PurchaseOrderAllocatedMaterial
from shared.utils import get_attributes, get_quantity_dictionary



class MarkerCutPlanSerializer(ModelSerializer):

    club_id = serializers.IntegerField(source='marker.actual_club.id', read_only=True)
    # item_id = serializers.IntegerField(source='marker.item.id', read_only=True)
    marker_name = serializers.CharField(source='marker.marker_name', read_only=True)
    marker_id = serializers.IntegerField(source='marker.id', read_only=True)
    marker_width_id = serializers.IntegerField(source='marker.width.id', read_only=True)
    marker_width = serializers.FloatField(source='marker.width.width', read_only=True)
    marker_width_unit = serializers.CharField(source='marker.width.width_unit', read_only=True)
    marker_width_unit_display = serializers.CharField(source='marker.width.get_width_unit_display', read_only=True)
    material_id = serializers.IntegerField(source='marker.po_material.id', read_only=True)
    layering_type = serializers.CharField()
    layering_type_display = serializers.CharField(source='get_layering_type_display', read_only=True)
    marker_length = serializers.FloatField(source='marker.marker_length', read_only=True)
    marker_length_unit = serializers.CharField(source='marker.marker_length_unit', read_only=True)
    marker_length_unit_display = serializers.CharField(source='marker.get_marker_length_unit_display', read_only=True)
    state_options = serializers.SerializerMethodField(read_only=True)
    state_display = serializers.CharField(source='get_state_display', read_only=True)
    marker_length_allowance_units = serializers.CharField()
    marker_length_allowance_units_display = serializers.CharField(source='get_marker_length_allowance_units_display', read_only=True)
    marker_options = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = MarkerCutPlan
        fields = '__all__'

    def get_state_options(self, obj):
        options = []
        for key, value in obj.STATE_CHOICE:
            options.append({
                "key": key,
                "value": value
            })
        return options
    
    def get_marker_options(self, obj):
        return obj.get_marker_options()



class SelectedRollSerializer(ModelSerializer):
    roll_number = serializers.CharField(source='purchase_order_allocated_material.in_house_material.grn_material_detail.fabricgrndetail.pack_number')
    batch_number = serializers.CharField(source='purchase_order_allocated_material.in_house_material.grn_material_detail.batch_number.batch_number', read_only=True)
    barcode = serializers.CharField(source='purchase_order_allocated_material.in_house_material.barcode', read_only=True)
    shade = serializers.CharField(source='purchase_order_allocated_material.shade.shade_name', read_only=True)
    back_point = serializers.SerializerMethodField(read_only=True)
    cut_point = serializers.SerializerMethodField(read_only=True)
    system_unusable_quantity = serializers.SerializerMethodField(read_only=True)
    tag_length = serializers.SerializerMethodField(read_only=True)
    width = serializers.SerializerMethodField(read_only=True)

    def get_back_point(self, obj):
        return get_attributes(obj, 'marker_point__back_point')
    
    def get_cut_point(self, obj):
        return get_attributes(obj, 'marker_point__cut_point')
    
    def get_system_unusable_quantity(self, obj):
        return get_quantity_dictionary(obj.unusable_quantity, obj.unusable_quantity_units)

    def get_tag_length(self, obj):
        return get_quantity_dictionary(obj.purchase_order_allocated_material.allocated_quantity, obj.purchase_order_allocated_material.allocated_quantity_units)
    
    def get_width(self, obj):
        return get_quantity_dictionary(obj.purchase_order_allocated_material.width.width, obj.purchase_order_allocated_material.width.width_unit)
    
    class Meta:
        model = SelectedRoll
        fields = '__all__'


class RollSequenceSerializer(ModelSerializer):

    selected_rolls = SelectedRollSerializer(source='selectedroll_set', many=True, read_only=True)

    class Meta:
        model = RollSequence
        fields = '__all__'


class PurchaseOrderAllocatedMaterialRollListSerializer(serializers.ModelSerializer):

    normalized_available_quantity = serializers.SerializerMethodField(read_only=True)
    normalized_used_quantity = serializers.JSONField(read_only=True)
    normalized_allocated_quantity = serializers.JSONField(read_only=True)

    shade = serializers.CharField(source='shade.shade_name', read_only=True)
    width = serializers.SerializerMethodField(read_only=True)

    roll_number = serializers.CharField(source='in_house_material.grn_material_detail.fabricgrndetail.pack_number', read_only=True)
    barcode = serializers.CharField(source='in_house_material.barcode', read_only=True)
    batch_number = serializers.CharField(source='in_house_material.grn_material_detail.batch_number.batch_number', read_only=True)

    supplier_po_grn_material = serializers.IntegerField(source='in_house_material.grn_material_detail.supplier_po_grn_material.id')
    supplier_po_grn = serializers.IntegerField(source='in_house_material.grn_material_detail.supplier_po_grn_material.supplier_po_grn.id')
    def get_normalized_available_quantity(self, obj):
        return get_quantity_dictionary(obj.normalized_available_quantity, obj.normalized_allocated_quantity_unit)
    
    def get_width(self, obj):
        return get_quantity_dictionary(obj.width.width, obj.width.width_unit)

    class Meta:
        model = PurchaseOrderAllocatedMaterial
        fields = '__all__'