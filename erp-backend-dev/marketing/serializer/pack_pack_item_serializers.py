from rest_framework import serializers
from rest_framework.serializers import ModelSerializer

from marketing.models import OrderPackItemPlacementMaterial, OrderPack, OrderCostingColorwayMaterialSupplierInquiry, \
    PackItemService
from marketing.serializers import OrderColorwaySerializer, OrderColorwayNavigationSerializer, OrderSizeSerializer, \
    OrderCountrySerializer
from materials.serializers.material_serializers import SupplierInquiryMaterialDetailSerializer


class OrderPackItemPlacementMaterialSerializer(ModelSerializer):
    placement_name = serializers.CharField(source='placement.item_attribute_other.name')
    colorway = OrderColorwayNavigationSerializer(source='placement.order_pack_item.pack.colorway')
    size = OrderSizeSerializer(source='placement.order_pack_item.pack.size')
    country = OrderCountrySerializer(source='placement.order_pack_item.pack.country')
    placement_display_name = serializers.SerializerMethodField()
    material = serializers.SerializerMethodField()

    def get_material(self, instance):
        return instance.material.get_attributes()

    def get_placement_display_name(self, instance):
        label = '%s - %s' % (
            instance.placement.order_pack_item.get_pack_item_display(),
            instance.placement.item_attribute_other.name,
        )
        return label

    class Meta:
        model = OrderPackItemPlacementMaterial
        fields = '__all__'


class OrderCostingColorwayMaterialSupplierInquirySerializer(ModelSerializer):
    material_details = serializers.SerializerMethodField()
    order_colorway = OrderColorwayNavigationSerializer(source='colorway')
    supplier_inquiry_details = SupplierInquiryMaterialDetailSerializer(source='supplier_inquiry_detail')

    def get_material_details(self, instance):
        return instance.customer_brand_material.get_attributes()

    class Meta:
        model = OrderCostingColorwayMaterialSupplierInquiry
        fields = '__all__'


class PackItemServiceSerializer(ModelSerializer):

    class Meta:
        model = PackItemService
        fields = '__all__'
