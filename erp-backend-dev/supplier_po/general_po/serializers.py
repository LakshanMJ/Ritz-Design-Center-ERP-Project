from rest_framework import serializers
from rest_framework.serializers import ModelSerializer

from marketing.models import GeneralPO, GeneralPOQuantity, GeneralPOMaterialQuantity, GeneralPOSupplierMaterialPrice, GRNBatchNumberShade, \
    PurchaseOrderAllocatedMaterial, FabricGRNWidth, SupplierDeliveryDateQuantityPOAllocation, PurchaseOrder, POPack, POPackItem, POPackPlacement, POPackItemPlacement
from supplier_po.models import SupplierDeliveryDateQuantity, SupplierPOFabricShade, SupplierPOGRNMaterialDetail, SupplierPOGRN
from supplier_po.supplier_po.serializers import SupplierDeliveryDateQuantitySerializer, SupplierPOSerializer
from materials.models import SupplierInquiryMaterialCode, CustomerBrandMaterial, UserDefinedMaterial, PACKAGING_TYPES
from materials.serializers.material_serializers import CustomerBrandMaterialBasicSerializer
from materials.fieldmetadata.measuring_unit_helpers import MaterialUnitHelper
from shared.models import InHouseMaterial
from shared.utils import convert_per_unit_cost, calculate_queryset_total_normalized_quantity


class GeneralPOSerializer(ModelSerializer):
    display_number = serializers.CharField()
    costing_id = serializers.IntegerField(source='costing.id')
    costing_display_number = serializers.CharField(source='costing.display_number')
    order_id = serializers.IntegerField(source='costing.order.id')
    order_display_number = serializers.CharField(source='costing.order.display_number')
    po_club_id = serializers.SerializerMethodField()
    po_club_display_number = serializers.SerializerMethodField()
    state_display = serializers.CharField(source='get_state_display')

    def get_po_club_id(self, instance):
        try:
            return instance.po_club.id
        except AttributeError:
            return None
        
    def get_po_club_display_number(self, instance):
        try:
            return instance.po_club.display_number
        except AttributeError:
            return None

    class Meta:
        model = GeneralPO
        fields = ("__all__")


class GeneralPOSupplierMaterialPriceSerializer(ModelSerializer):
    costing_price_units_display = serializers.CharField(source='get_costing_price_units_display')
    supplier = serializers.IntegerField(source='general_po_supplier.supplier.id')
    supplier_name = serializers.CharField(source='general_po_supplier.supplier.name')
    cost_per_unit = serializers.FloatField(source='costing_price')
    supplier_material_reference_code = serializers.CharField(source='supplier_material.supplier_material_reference_code')

    class Meta:
        model = GeneralPOSupplierMaterialPrice
        fields = ("__all__")


class GeneralPOQuantitySerializer(ModelSerializer):

    class Meta:
        model = GeneralPOQuantity
        fields = ("__all__")


class GeneralPOMaterialQuantitySerializer(ModelSerializer):
    general_po_display_number = serializers.CharField(source='general_po.display_number')
    material = serializers.IntegerField(source='material_id')
    material_details = CustomerBrandMaterialBasicSerializer(source='material')
    measuring_unit_display = serializers.CharField(source='get_measuring_unit_display')
    order_quantity_units_display = serializers.CharField(source='get_order_quantity_units_display')
    delivery_date_status = serializers.SerializerMethodField()
    purchase_order_club_bom_suppliers = serializers.SerializerMethodField()
    supplier_name = serializers.CharField(source='default_material_supplier.general_po_supplier.supplier.name')
    send_po_for_material = serializers.BooleanField()

    def get_delivery_date_status(self, instance):
        return instance.get_delivery_date_status()
    
    def get_purchase_order_club_bom_suppliers(self, instance):
        bom_suppliers = instance.supplierdeliverydatequantity_set.all()
        data = SupplierDeliveryDateQuantitySerializer(bom_suppliers, many=True).data
        return data 

    class Meta:
        model = GeneralPOMaterialQuantity
        fields = ("__all__")


class GeneralPOMaterialQuantityListSerializer(ModelSerializer):
    materail_name = serializers.SerializerMethodField(read_only=True)
    material_category = serializers.SerializerMethodField(read_only=True)
    supplier_name = serializers.SerializerMethodField(read_only=True)
    quantity_display_value = serializers.SerializerMethodField(read_only=True)
    material_details = serializers.SerializerMethodField(read_only=True)
    last_created_supplier_po_state = serializers.SerializerMethodField()
    supplier_po = serializers.SerializerMethodField()
    supplier_po_file = serializers.SerializerMethodField()
    supplier_po_status = serializers.SerializerMethodField()
    supplier_po_status_display = serializers.SerializerMethodField()

    po_item_quantity = serializers.SerializerMethodField(read_only=True)
    consumption = serializers.SerializerMethodField(read_only=True)
    wastage = serializers.SerializerMethodField(read_only=True)
    unit_order_price = serializers.SerializerMethodField(read_only=True)
    unit_discount_price = serializers.SerializerMethodField(read_only=True)
    unit_order_price_with_discount = serializers.SerializerMethodField(read_only=True)
    order_price = serializers.SerializerMethodField(read_only=True)
    order_price_with_discount = serializers.SerializerMethodField(read_only=True)
    grn_quantity = serializers.SerializerMethodField(read_only=True)
    variance = serializers.SerializerMethodField(read_only=True)
    measuring_unit_display = serializers.CharField(source='get_measuring_unit_display', read_only=True, allow_null=True)

    def get_materail_name(self, instance):
        return instance.material.material_detail.generic_material.user_material.material
    
    def get_material_category(self, instance):
        return instance.material.material_detail.generic_material.user_material.category

    def get_supplier_name(self, instance):  # TODO PurchaseOrderClubBomSupplier
        supplier_name = None
        if instance.default_material_supplier:
            supplier_name = instance.default_material_supplier.general_po_supplier.supplier.name
        return supplier_name

    def get_material_details(self, instance):
        details = instance.material.get_customer_brand_material_details()
        details['headers'] = UserDefinedMaterial.get_material_headers(instance.material.material_detail.generic_material.user_material.name)
        return details

    def get_quantity_display_value(self, instance):
        display_value = None
        if instance.quantity:
            display_value = '%s %s' % (round(instance.quantity, 2), instance.get_measuring_unit_display())
        return display_value
    
    def get_last_created_supplier_po_state(self, instance):
        state = None
        pos = instance.generated_supplier_pos
        if pos:
            po = pos[0]
            state = po.state
        return state
    
    def get_supplier_po(self, insntance):
        display_number = None
        pos = insntance.generated_all_supplier_pos.order_by('-created')
        if pos:
            po = pos[0]
            return po.display_number
        return display_number
    
    def get_supplier_po_status(self, instance):
        status = None
        pos = instance.generated_all_supplier_pos.order_by('-created')
        if pos:
            po = pos[0]
            return po.state
        return status
    
    def get_supplier_po_status_display(self, instance):
        status = None
        pos = instance.generated_all_supplier_pos.order_by('-created')
        if pos:
            po = pos[0]
            status =  po.get_state_display()
        return status
    
    def get_supplier_po_file(self, instance):
        data = None
        pos = instance.generated_all_supplier_pos.order_by('-created')
        if pos:
            po = pos[0]
            if po.supplier_po_file:
                data = po.supplier_po_file.get_object_data()
        return data

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if instance.quantity:
            representation['quantity_display_value'] = '%s %s' % (
            round(self.context.get('quantity', instance.quantity), 2), instance.get_measuring_unit_display())
        return representation
    
    def get_po_item_quantity(self, instance):
        po_club_id = instance.general_po.po_club.id
        customer_brand_material_id = instance.material.id
        material_category = instance.material.material_detail.generic_material.user_material.category
        
        quantity = 0
        if not material_category == PACKAGING_TYPES:
            po_pack_item_ids = list(POPackItemPlacement.objects.filter(po_pack_item__po_pack__purchase_order__actual_po_club__id=po_club_id,
                                                                       po_material__id=customer_brand_material_id).values_list('po_pack_item', flat=True).distinct())
            po_pack_items = POPackItem.objects.filter(id__in=po_pack_item_ids)
            for pack_item in po_pack_items:
                if pack_item.po_pack.quantity:
                    item_quantity = pack_item.po_pack.quantity
                else:
                    item_quantity = 0
                quantity += item_quantity
        else:
            po_pack_ids = list(POPackPlacement.objects.filter(po_pack__purchase_order__actual_po_club__id=po_club_id,
                                                              po_material__id=customer_brand_material_id).values_list('po_pack', flat=True).distinct())
            po_packs = POPack.objects.filter(id__in=po_pack_ids)
            for pack in po_packs:
                if pack.quantity:
                    pack_quantity = pack.quantity
                else:
                    pack_quantity = 0
                quantity += pack_quantity
        return quantity
    
    def get_consumption(self, instance):
        po_item_quantity = self.get_po_item_quantity(instance)
        if instance.quantity:
            quantity = instance.quantity
        else:
            quantity = 0
        if quantity > 0 and po_item_quantity > 0:
            consumption = round(quantity/po_item_quantity, 5)
        else:
            consumption = None
        return consumption
    
    def get_wastage(self, instance):
        wastage = 0
        return wastage
    
    def get_unit_order_price(self, instance):
        cost = instance.default_material_supplier.order_price
        per_current_unit = instance.default_material_supplier.order_price_units
        convert_unit = instance.measuring_unit
        unit_order_price = round(convert_per_unit_cost(convert_unit, cost, per_current_unit)['cost'], 4)
        return unit_order_price
    
    def get_unit_discount_price(self, instance):
        cost = instance.default_material_supplier.order_price
        discount = instance.default_material_supplier.discount
        per_current_unit = instance.default_material_supplier.order_price_units
        convert_unit = instance.measuring_unit
        if cost and discount:
            unit_discount_price = round(convert_per_unit_cost(convert_unit, cost*discount/100, per_current_unit)['cost'], 4)
        else:
            unit_discount_price = None
        return unit_discount_price
    
    def get_unit_order_price_with_discount(self, instance):
        unit_order_price = self.get_unit_order_price(instance)
        if unit_order_price:
            unit_discount_price = self.get_unit_discount_price(instance)
            if unit_discount_price:
                unit_order_price_with_discount = round(unit_order_price - unit_discount_price, 4)
            else:
                unit_order_price_with_discount = round(unit_order_price, 4)
        else:
            unit_order_price_with_discount = None
        return round(unit_order_price_with_discount, 4)
    
    def get_order_price(self, instance):
        unit_order_price = self.get_unit_order_price(instance)
        po_item_quantity = self.get_po_item_quantity(instance)
        if unit_order_price:
            order_price = round(unit_order_price*po_item_quantity, 4)
        else:
            order_price = None
        return order_price
    
    def get_order_price_with_discount(self, instance):
        unit_order_price_with_discount = self.get_unit_order_price_with_discount(instance)
        po_item_quantity = self.get_po_item_quantity(instance)
        if unit_order_price_with_discount:
            order_price_with_discount = round(unit_order_price_with_discount*po_item_quantity, 4)
        else:
            order_price_with_discount = None
        return order_price_with_discount
    
    def get_grn_quantity(self, instance):
        club_id = instance.general_po.po_club.id
        customer_brand_material_id = instance.material.id
        in_house_materials = InHouseMaterial.objects.filter(po_club__id=club_id, supplier_material__customer_brand_material__id=customer_brand_material_id).exclude(
           grn_material_detail__supplier_po_grn_material__supplier_po_grn__state=SupplierPOGRN.GRN_CANCEL)
        grn_quantity = calculate_queryset_total_normalized_quantity(in_house_materials, instance.measuring_unit, 'quantity', 'quantity_units')
        return grn_quantity
    
    def get_variance(self, instance):
        grn_quantity = self.get_grn_quantity(instance)
        order_quantity = instance.order_quantity
        if order_quantity:
            variance = round(grn_quantity - order_quantity, 4)
        else:
            variance = None
        return variance

    class Meta:
        model = GeneralPOMaterialQuantity
        fields = ('__all__')


class GeneralPOMaterialQuantityDetailSerializer(ModelSerializer):
    materail_name = serializers.SerializerMethodField(read_only=True)
    supplier_name = serializers.SerializerMethodField(read_only=True)
    quantity_display_value = serializers.SerializerMethodField(read_only=True)
    material_details = serializers.SerializerMethodField(read_only=True)
    delivery_date = serializers.SerializerMethodField(read_only=True)
    generated_supplier_pos = SupplierPOSerializer(many=True, read_only=True)
    last_created_supplier_po_state = serializers.SerializerMethodField()

    def get_materail_name(self, instance):
        return instance.material.material_detail.generic_material.user_material.material

    def get_supplier_name(self, instance):  # TODO PurchaseOrderClubBomSupplier
        supplier_name = None
        if instance.default_material_supplier:
            supplier_name = instance.default_material_supplier.general_po_supplier.supplier.name
        return supplier_name

    def get_material_details(self, instance):
        details = instance.material.get_customer_brand_material_details()
        details['headers'] = UserDefinedMaterial.get_material_headers(instance.material.material_detail.generic_material.user_material.name)
        return details

    def get_quantity_display_value(self, instance):
        display_value = None
        if instance.quantity:
            display_value = '%s %s' % (round(instance.quantity, 2), instance.get_measuring_unit_display())
        return display_value

    def get_delivery_date(self, instance):
        is_delivery_date = SupplierDeliveryDateQuantity.objects.filter(
            general_po_material_quantity=instance,
            general_po_material_quantity__material=instance.material
        ).exclude(supplier_delivery_date=None).exists()
        return is_delivery_date
    
    def get_last_created_supplier_po_state(self, instance):
        state = None
        pos = instance.generated_supplier_pos.order_by('-created')
        if pos:
            po = pos[0]
            state = po.state
        return state


    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['quantity_display_value'] = '%s %s' % (
        round(self.context.get('quantity', instance.quantity), 2), instance.get_measuring_unit_display())
        return representation

    class Meta:
        model = GeneralPOMaterialQuantity
        fields = ('__all__')


class GeneralPOShadeSummarySerializer(serializers.ModelSerializer):
    ritz_customer_brand_reference_code = serializers.SerializerMethodField(read_only=True)
    reference_code = serializers.SerializerMethodField(read_only=True)
    shade_groups = serializers.SerializerMethodField(read_only=True)
    material_type = serializers.SerializerMethodField(read_only=True)

    def get_material_type(self, instance):
        return instance.customer_brand_material.material_type

    def get_shade_groups(self, instance):
        from marketing.serializers import ShadeGroupSerializer
        response = []
        shade_ids = None
        shade_ids = GRNBatchNumberShade.objects.filter(
            supplier_po_shade__supplier_po__general_po_supplier__general_po_id=self.context['general_po_id']
        ).values_list('supplier_po_shade', flat=True)
        if shade_ids:
            shades = SupplierPOFabricShade.objects.filter(material=instance.customer_brand_material, id__in=shade_ids)
            response = ShadeGroupSerializer(shades, many=True).data
        return response

    def get_ritz_customer_brand_reference_code(self, instance):
        return instance.customer_brand_material.verbose_reference_code

    def get_reference_code(self, instance):
        return instance.customer_brand_material.material_code.customer_reference_code

    class Meta:
        model = SupplierInquiryMaterialCode
        fields = ('id', 'material_type', 'ritz_customer_brand_reference_code', 'reference_code', 'shade_groups', )


class GeneralPOFabricChartSummarySerializer(serializers.ModelSerializer): # TODO change this API after complete API. Data should be get from in house material
    grn_material_details = serializers.SerializerMethodField(read_only=True)
    width_group = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = CustomerBrandMaterial
        fields = ('grn_material_details', 'width_group')

    def get_grn_material_details(self, instance):
        data = {
            'material_details': instance.get_attributes()
        }
        return data

    def get_width_group(self, instance):
        from django.db.models import Sum
        response = []
        general_po_id = self.context.get('general_po_id')

        in_house_materials = InHouseMaterial.objects.filter(
            grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po__general_po_supplier__general_po_id=general_po_id,
            supplier_material__customer_brand_material=instance,
            state=InHouseMaterial.ACCEPTED_STATUS
        )
        width_ids = in_house_materials.filter().values_list('grn_material_detail__fabricgrndetail__actual_width', flat=True).distinct()
        widths = FabricGRNWidth.objects.filter(id__in=width_ids)

        for width in widths:
            total_quantity = in_house_materials.filter(
                grn_material_detail__fabricgrndetail__actual_width=width
            ).aggregate(Sum('quantity'))

            width_shade_group = []
            shades = SupplierPOFabricShade.objects.filter(
                id__in=in_house_materials.filter(
                    grn_material_detail__fabricgrndetail__actual_width=width,
                ).values_list('grn_material_detail__shade__supplier_po_shade', flat=True).distinct()
            )

            for shade in shades:
                shade_total_quantity = in_house_materials.filter(
                    grn_material_detail__fabricgrndetail__actual_width=width,
                    grn_material_detail__shade__supplier_po_shade=shade
                ).aggregate(Sum('quantity'))

                rolls = []
                rows = in_house_materials.filter(
                    grn_material_detail__fabricgrndetail__actual_width=width,
                    grn_material_detail__shade__supplier_po_shade=shade
                    )

                for row in rows:
                    rolls.append({
                        'pack_number': row.grn_material_detail.fabricgrndetail.pack_number,
                        'batch_number': row.grn_material_detail.batch_number.batch_number,
                        'quantity': row.grn_material_detail.actual_quantity
                    })

                shade_data = {
                    'shade_display': shade.shade_name,
                    'total_quantity': shade_total_quantity['quantity__sum'],
                    'rolls': rolls
                }
                width_shade_group.append(shade_data)

            data = {
                'total_quantity': total_quantity['quantity__sum'],
                'width_unit': MaterialUnitHelper.INCHES_UNIT,
                'width': width.actual_width,
                'width_shade_group': width_shade_group
            }
            response.append(data)
        return response
    

class SupplierDeliveryDateQuantityPOAllocationSerializer(ModelSerializer):
    class Meta:
        model = SupplierDeliveryDateQuantityPOAllocation
        fields = ("__all__")