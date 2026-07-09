from rest_framework import serializers
from rest_framework.generics import get_object_or_404
from rest_framework.serializers import ModelSerializer

from marketing.models import POClubShade, PurchaseOrder, POClubShade
from materials.models import Material, CustomerBrandMaterial, SupplierCustomerBrandMaterial, UserDefinedMaterial
from shared.serializers import FileAttachmentSerializer
from shared.utils import model_has_field
from supplier_po.models import SupplierPOGRNMaterialQA, SupplierPOGRNMaterialDetail, SupplierPOGRN, \
    FabricGRNBatchNumber, GRNBatchNumberShade, FabricGRNDetail, FabricGRNWidth, SupplierPOGRNMaterial, \
    SupplierPOFabricShade, SupplierPO, SupplierPOClubMaterialShadeMapping


class SupplierPOGRNMaterialQASerializer(ModelSerializer):

    def validate_empty_values(self, data):
        validation_fields = ['defect_width_from_left', 'defect_distance_from_start']
        for validation_field in validation_fields:
            if validation_field in data:
                if not data[validation_field]:
                    data[validation_field] = ""
        return super().validate_empty_values(data)

    class Meta:
        model = SupplierPOGRNMaterialQA
        fields = ('__all__')


class SupplierPOGRNMaterialAdjestmentSerializer(ModelSerializer):
    material = serializers.SerializerMethodField()
    headers = serializers.SerializerMethodField()

    def get_material(self, instance):
        return instance.grn_material.customer_brand_material.get_attributes()
    
    def get_headers(self, instance):
        headers = UserDefinedMaterial.get_material_headers(instance.grn_material.customer_brand_material.material_detail.generic_material.user_material.name)
        return headers

    class Meta:
        model = SupplierPOGRNMaterial
        fields = (
        'id', 'headers', 'material', 'total_actual_quantity', 'total_actual_quantity_units', 'total_qa_rejected_quantity', 'total_qa_rejected_quantity_units', 'total_indicated_quantity',
        'total_indicated_quantity_units', 'total_excess_quantity', 'total_excess_quantity_units', 'total_deficit_quantity', 'total_deficit_quantity_units',
        'usable_quantity', 'usable_quantity_units', 'mismatch_quantity', 'mismatch_quantity_units', 'width_replacement_quantity', 'width_replacement_quantity_units', 'calculated_values')
        ordering = ['id']


class SupplierPOGRNMaterialDetailSerializer(ModelSerializer):
    fabric_id = serializers.IntegerField(source='fabricgrndetail.id', read_only=True)
    pack_number = serializers.CharField(source='fabricgrndetail.pack_number', read_only=True)
    batch_number = serializers.SerializerMethodField()
    shade = serializers.SerializerMethodField()
    color = serializers.CharField(source='fabricgrndetail.color', read_only=True)
    actual_width = serializers.SerializerMethodField()
    actual_width_units = serializers.SerializerMethodField()
    indicated_quantity = serializers.FloatField(read_only=True)
    indicated_quantity_units = serializers.SerializerMethodField()
    qa_failed_quantity_units = serializers.SerializerMethodField()
    indicated_width = serializers.FloatField(source='fabricgrndetail.indicated_width', read_only=True)
    indicated_width_units = serializers.SerializerMethodField()
    actual_quantity_units = serializers.SerializerMethodField()
    actual_gsm = serializers.FloatField(source='fabricgrndetail.actual_gsm', read_only=True)
    indicated_gsm = serializers.FloatField(source='fabricgrndetail.indicated_gsm', read_only=True)
    shrink_lot = serializers.FloatField(source='fabricgrndetail.shrink_lot', read_only=True)
    shrink_width = serializers.FloatField(source='fabricgrndetail.shrink_width', read_only=True)
    shrink_length = serializers.FloatField(source='fabricgrndetail.shrink_length', read_only=True)
    indicated_weight = serializers.FloatField(source='fabricgrndetail.indicated_weight', read_only=True)
    actual_weight = serializers.FloatField(source='fabricgrndetail.actual_weight', read_only=True)
    remarks = serializers.CharField(source='fabricgrndetail.remarks', read_only=True)
    attachment_details = serializers.SerializerMethodField(read_only=True)
    supplierpogrnmaterialqa_set = SupplierPOGRNMaterialQASerializer(many=True)
    complete_state = serializers.SerializerMethodField()
    order_id = serializers.SerializerMethodField()
    style_number = serializers.SerializerMethodField()
    ritz_reference_code = serializers.SerializerMethodField()
    color_tone = serializers.SerializerMethodField()
    is_valid_color_tone = serializers.CharField(source='fabricgrndetail.is_valid_color_tone', read_only=True)
    diameter = serializers.FloatField()
    bin_location_id = serializers.IntegerField(read_only=True)
    bin_location = serializers.SerializerMethodField(read_only=True)

    def get_complete_state(self, instance):
        if instance.inspection_state == instance.INSPECTION_STATE_INSPECTION_COMPLETE:
            complete_state = True
        else:
            complete_state = False
        return complete_state

    def get_attachment_details(self, instance):
        attachment = instance.attachments
        serializer = FileAttachmentSerializer(attachment, many=True).data
        return serializer

    def get_batch_number(self, instance):
        data = {}
        if instance.batch_number is not None:
            data = {
                'value': instance.batch_number.id,
                'display_value': instance.batch_number.batch_number
            }
        return data

    def get_shade(self, instance):
        data = {}
        if instance.shade is not None:
            data = {
                'value': instance.shade.id,
                'display_value': instance.shade.shade
            }
        return data

    def get_actual_width(self, instance):
        data = {}
        if hasattr(instance, 'fabricgrndetail'):
            if instance.fabricgrndetail.actual_width is not None:
                data = {
                    'value': instance.fabricgrndetail.actual_width.id,
                    'display_value': instance.fabricgrndetail.actual_width.actual_width
                }
        return data

    def get_actual_width_units(self, instance):
        data = {}
        if hasattr(instance, 'fabricgrndetail'):
            if instance.fabricgrndetail.actual_width is not None:
                data = {
                    'value': instance.fabricgrndetail.actual_width.actual_width_units,
                    'display_value': instance.fabricgrndetail.actual_width.get_actual_width_units_display()
                }
        return data

    def get_indicated_quantity_units(self, instance):
        data = {}
        if instance.indicated_quantity_units is not None:
            data = {
                'value': instance.indicated_quantity_units,
                'display_value': instance.get_indicated_quantity_units_display()
            }
        return data

    def get_qa_failed_quantity_units(self, instance):
        data = {}
        if instance.qa_failed_quantity_units is not None:
            data = {
                'value': instance.qa_failed_quantity_units,
                'display_value': instance.get_qa_failed_quantity_units_display()
            }
        return data

    def get_indicated_width_units(self, instance):
        data = {}
        if hasattr(instance, 'fabricgrndetail'):
            if instance.fabricgrndetail.indicated_width_units is not None:
                data = {
                    'value': instance.fabricgrndetail.indicated_width_units,
                    'display_value': instance.fabricgrndetail.get_indicated_width_units_display()
                }
        return data

    def get_actual_quantity_units(self, instance):
        data = {}
        if instance.actual_quantity_units is not None:
            data = {
                'value': instance.actual_quantity_units,
                'display_value': instance.get_actual_quantity_units_display()
            }
        return data

    def get_order_id(self, instance):
        order_id = instance.supplier_po_grn_material.supplier_po_grn.supplier_po.general_po_supplier.general_po.costing.order.id
        return order_id

    def get_style_number(self, instance):
        style_number = instance.supplier_po_grn_material.supplier_po_grn.supplier_po.general_po_supplier.general_po.costing.order.style_number
        return style_number

    def get_ritz_reference_code(self, instance):
        return instance.supplier_po_grn_material.grn_material.customer_brand_material.get_reference_code_postfix()

    def get_color_tone(self, instance):
        data = {}
        if hasattr(instance, 'fabricgrndetail'):
            if instance.fabricgrndetail.color_tone:
                data = {
                    'value': instance.fabricgrndetail.color_tone.id,
                    'display_value': instance.fabricgrndetail.color_tone.display_value
                }
        return data
    
    def get_bin_location(self, instance):
        data = {}
        if instance.bin_location:
            data = {
                'value': instance.bin_location.id,
                'label': instance.bin_location.display_number
            }
        return data

    class Meta:
        model = SupplierPOGRNMaterialDetail
        fields = (
        'id', 'fabric_id', 'pack_number', 'batch_number', 'shade', 'color', 'actual_width', 'actual_width_units',
        'indicated_width', 'indicated_width_units', 'actual_gsm', 'indicated_gsm', 'shrink_lot',
        'shrink_width', 'shrink_length', 'remarks', 'attachments', 'attachment_details', 'supplierpogrnmaterialqa_set',
        'active', 'indicated_quantity', 'indicated_quantity_units', 'actual_quantity', 'actual_quantity_units',
        'indicated_grn_field_value', 'actual_grn_field_value', 'barcode', 'qa_inspection_passed', 'supplier_barcode',
        'supplier_po_grn_material', 'order_id', 'style_number', 'ritz_reference_code', 'inspection_state',
        'inspection_attempt', 'shade_category', 'complete_state', 'color_tone', 'qa_failed_quantity', 'qa_failed_quantity_units',
        'is_valid_color_tone', 'diameter', 'indicated_weight', 'actual_weight', 'bin_location', 'bin_location_id')
        ordering = ['id']


class MaterialGRNDetailSerializer(ModelSerializer):

    def create(self, validated_data):
        object = super().create(validated_data)
        object.set_barcode()
        return object

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        uneditable_fields = ['barcode', ]
        supplier_po_grn = self.context['supplier_po_grn']
        supplier_po_grn_material = self.context['supplier_po_grn_material']
        material = supplier_po_grn_material.grn_material.customer_brand_material.material_detail.generic_material.user_material
        if supplier_po_grn.state == SupplierPOGRN.GRN_COMPLETE:
            editable_fields = [field['field_name']['field_name'] for field in supplier_po_grn.get_grn_material_editable_fields(material)]
        else:
            editable_fields = [field['field_name'] for field in supplier_po_grn.get_grn_material_editable_fields(material)]
        all_fields = tuple(self.Meta.fields) + tuple(editable_fields)
        fields = set(set(all_fields) - set(uneditable_fields))
        self.Meta.fields = list(fields)

    def set_batch_number(self, batch_number_data):
        fabric_grn_batch_number = None
        supplier_po_grn_material = self.context['supplier_po_grn_material']
        material_is_fabric = supplier_po_grn_material.grn_material.customer_brand_material.material_type == Material.FABRIC_MATERIAL
        if batch_number_data and material_is_fabric:
            id = batch_number_data.get('value', None)
            if id:
                fabric_grn_batch_number = get_object_or_404(FabricGRNBatchNumber, pk=id)
            else:
                batch_number = batch_number_data.get('display_value', None)
                supplier_po_grn = self.context['supplier_po_grn']
                fabric_grn_batch_number = FabricGRNBatchNumber.objects.create(
                    batch_number=batch_number, grn_material=supplier_po_grn_material
                )
            return fabric_grn_batch_number
        return fabric_grn_batch_number
    
    def set_supplier_po_shade(self, roll_shade, supplier_po_grn_material):
        po_shade, created = SupplierPOFabricShade.objects.get_or_create(
            supplier_po=supplier_po_grn_material.supplier_po_grn.supplier_po,
            material=supplier_po_grn_material.grn_material.customer_brand_material,
            shade_name=roll_shade.shade
        )
        return po_shade
    
    def set_club_shade(self, po_club, roll_shade, supplier_po_grn_material):
        club_shade, created = POClubShade.objects.get_or_create(
            po_club=po_club,
            material=supplier_po_grn_material.grn_material.customer_brand_material,
            shade_name =roll_shade.shade
        )
        return club_shade
    
    def map_shade(self, po_shade, club_shade):
        map_shade = SupplierPOClubMaterialShadeMapping.objects.get_or_create(
            po_club_shade=club_shade,
            supplier_po_shade=po_shade
        )
        return map_shade

    def set_shade(self, shade_data, batch_number):
        grn_batch_shade = None
        supplier_po_grn_material = self.context['supplier_po_grn_material']
        material_is_fabric = supplier_po_grn_material.grn_material.customer_brand_material.material_type == Material.FABRIC_MATERIAL
        if shade_data and material_is_fabric:
            id = shade_data.get('value', None)
            if id:
                grn_batch_shade = get_object_or_404(GRNBatchNumberShade, pk=id)
            else:
                shade = shade_data.get('display_value', None)
                grn_batch_shade = GRNBatchNumberShade.objects.create(
                    shade=shade, batch_number=batch_number
                )
            po_shade = self.set_supplier_po_shade(grn_batch_shade, supplier_po_grn_material)
            club_shade = self.set_club_shade(grn_batch_shade.batch_number.grn_material.supplier_po_grn.supplier_po.general_po.po_club, grn_batch_shade, supplier_po_grn_material)
            grn_batch_shade.supplier_po_shade = po_shade
            self.map_shade(po_shade, club_shade)
            grn_batch_shade.save()

            return grn_batch_shade
        return grn_batch_shade

    def to_internal_value(self, data):
        indicated_quantity_units = data.pop('indicated_quantity_units', None)
        actual_quantity_units = data.pop('actual_quantity_units', None)
        qa_failed_quantity_units = data.pop('qa_failed_quantity_units', None)
        batch_number_data = data.pop('batch_number', None)
        shade_data = data.pop('shade', None)
        internal_value = super().to_internal_value(data)
        batch_number = self.set_batch_number(batch_number_data)
        if batch_number:
            shade = self.set_shade(shade_data, batch_number)
            internal_value['batch_number'] = batch_number
            internal_value['shade'] = shade
            data['batch_number'] = batch_number
        if indicated_quantity_units:
            internal_value['indicated_quantity_units'] = indicated_quantity_units['value']
            data['indicated_quantity_units'] = indicated_quantity_units
        if actual_quantity_units:
            internal_value['actual_quantity_units'] = actual_quantity_units['value']

        if qa_failed_quantity_units:
            internal_value['qa_failed_quantity_units'] = qa_failed_quantity_units['value']
        return internal_value

    class Meta:
        model = SupplierPOGRNMaterialDetail
        fields = ('id', 'supplier_po_grn_material')


class FabricGRNSerializer(ModelSerializer):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        supplier_po_grn = self.context['supplier_po_grn']
        material_editable_fields = [field['field_name'] for field in supplier_po_grn.get_grn_fabric_editable_fields()]

        all_fields = list(set(tuple(self.Meta.fields) + tuple(material_editable_fields)))
        valid_fields = []
        for field in all_fields:
            if model_has_field(FabricGRNDetail, field):
                valid_fields.append(field)
        self.Meta.fields = valid_fields

    def set_width(self, width_data, width_units_data):
        grn_width = None
        actual_width_units = None
        if width_data:
            id = width_data.get('value', None)
            if width_units_data:
                actual_width_units = width_units_data['value']
            if id:
                grn_width = get_object_or_404(FabricGRNWidth, pk=id)

            else:
                supplier_po_grn = self.context['supplier_po_grn']
                actual_width = width_data.get('display_value', None)

                grn_width = FabricGRNWidth.objects.create(
                    actual_width=actual_width, grn=supplier_po_grn, actual_width_units=actual_width_units
                )
            return grn_width
        return grn_width

    def to_internal_value(self, data):
        color_tone_data = data.pop('color_tone', None)
        width_data = data.pop('actual_width', None)
        width_units_data = data.pop('actual_width_units', None)
        indicated_width_units = data.pop('indicated_width_units', None)
        internal_value = super().to_internal_value(data)
        width = self.set_width(width_data, width_units_data)
        if color_tone_data:
            color_tone_id = color_tone_data.get('value')
            internal_value['color_tone_id'] = color_tone_id
        if width:
            internal_value['actual_width'] = width
        if indicated_width_units:
            internal_value['indicated_width_units'] = indicated_width_units['value']
        return internal_value

    class Meta:
        model = FabricGRNDetail
        fields = ('id', 'grn_material_detail', )


class GRNShadeSummarySerializer(serializers.ModelSerializer):
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
        from marketing.serializers import ShadeGroupSerializer
        shade_ids = GRNBatchNumberShade.objects.filter(
            batch_number__grn_material__grn_material=instance,
            batch_number__grn_material__supplier_po_grn_id=self.context['grn_id']
        ).values_list('supplier_po_shade', flat=True)
        shades = SupplierPOFabricShade.objects.filter(material=instance.customer_brand_material, id__in=shade_ids)
        response = ShadeGroupSerializer(shades, many=True).data
        return response

    def get_ritz_customer_brand_reference_code(self, instance):
        return instance.customer_brand_material.verbose_reference_code

    def get_reference_code(self, instance):
        return instance.customer_brand_material.material_code.customer_reference_code

    class Meta:
        model = SupplierCustomerBrandMaterial
        fields = ('id', 'material_type', 'ritz_customer_brand_reference_code', 'reference_code', 'shade_groups', )


class GRNFabricMaterialDetailSerializer(serializers.ModelSerializer):
    '''
    TODO - Mahesh Review Notes. No need to change this for now, but for future reference,
    this is not the proper way to implement this serializer.
    The model should be SuppliePOGRNMaterialDetail since you are looping that, no CustomerBrandMaterial.
    '''
    grn_material_id = serializers.CharField(source='id')
    ritz_customer_brand_reference_code = serializers.SerializerMethodField(read_only=True)
    rolls = serializers.SerializerMethodField(read_only=True)

    def get_rolls(self, instance):
        rolls = instance.supplierpogrnmaterialdetail_set.all().order_by('batch_number__batch_number', 'fabricgrndetail__pack_number')
        serilaizer = SupplierPOGRNMaterialDetailSerializer(rolls, many=True).data
        return serilaizer

    def get_ritz_customer_brand_reference_code(self, instance):
        return instance.grn_material.customer_brand_material.verbose_reference_code

    def get_grn_material_id(self, instance):
        grn_material = SupplierPOGRNMaterial.objects.get(
            supplier_po_grn=self.context['grn_id'], grn_material=instance
        )
        return grn_material.id

    class Meta:
        model = SupplierPOGRNMaterial
        # fields = ('id', 'grn_material_id', 'ritz_customer_brand_reference_code', 'rolls')
        fields = ('grn_material_id', 'ritz_customer_brand_reference_code', 'rolls')


class GRNBatchNumberShadeSerializer(ModelSerializer):
    grn = serializers.IntegerField(source='batch_number.grn_material.supplier_po_grn_id', read_only=True)
    material = serializers.IntegerField(source='batch_number.grn_material.grn_material_id', read_only=True)

    class Meta:
        model = GRNBatchNumberShade
        fields = ('id', 'batch_number', 'shade', 'grn', 'material', 'split_from')


class FabricGRNBatchNumberSerializer(ModelSerializer):
    shades = serializers.SerializerMethodField(read_only=True)
    shade_group_data = serializers.SerializerMethodField(read_only=True)
    split_shades = serializers.SerializerMethodField(read_only=True)

    def get_shades(self, instance):
        parent_shade_ids = instance.grnbatchnumbershade_set.filter().exclude(split_from=None).values_list('split_from')
        shades = instance.grnbatchnumbershade_set.filter(supplier_po_shade=None).exclude(id__in=parent_shade_ids).order_by('shade')
        serrializer = GRNBatchNumberShadeSerializer(shades, many=True).data
        return serrializer

    def get_shade_group_data(self, instance):
        shade_groups = []
        # material_id = self.context['material_id'] # Team Review notes - newer pass context like this if we can access it from the instance
        # actual_club_id = self.context['actual_club_id']
        material = instance.grn_material.grn_material
        supplier_po = instance.grn_material.supplier_po_grn.supplier_po
        actual_shades = SupplierPOFabricShade.objects.filter(supplier_po=supplier_po, material=material.customer_brand_material).order_by('display_order')

        for actual_shade in actual_shades:
            shades = GRNBatchNumberShadeSerializer(actual_shade.grnbatchnumbershade_set.filter(batch_number=instance.id).order_by('id'), many=True).data
            if actual_shade.shade_swatch:
                shade_swatch_serializer = FileAttachmentSerializer(actual_shade.shade_swatch, many=False).data
            else:
                shade_swatch_serializer = None
            data = {
                "id": actual_shade.id,
                "shade_name": actual_shade.shade_name,
                "shades": shades,
                "attachment": shade_swatch_serializer,
                'display_order': actual_shade.display_order
            }
            shade_groups.append(data)
        return shade_groups

    def get_split_shades(self, instance):
        response = []
        parent_shade_ids = instance.grnbatchnumbershade_set.filter().exclude(split_from=None).values_list('split_from')
        parent_shades = GRNBatchNumberShade.objects.filter(id__in=parent_shade_ids)
        for shade in parent_shades:
            split_shades = instance.grnbatchnumbershade_set.filter(split_from=shade)
            data = {
                'id': shade.id,
                'shade_name': shade.shade,
                'split_shades': []
            }
            for split_child_shade in split_shades:
                data['split_shades'].append(
                    {
                        'id': split_child_shade.id,
                        'shade_name': split_child_shade.shade
                    }
                )
            response.append(data)
        return response

    class Meta:
        model = FabricGRNBatchNumber
        fields = ('id', 'batch_number', 'shades', 'split_shades', 'shade_group_data', )


class SupplierPOGRNMinimalSerializer(ModelSerializer):
    grn_headers = serializers.SerializerMethodField(read_only=True)
    supplierpogrnmaterial_set = serializers.SerializerMethodField()

    def get_grn_headers(self, instance):
        from materials.fieldmetadata.material_metadata import get_grn_headers
        headers = get_grn_headers(instance)
        return headers
    
    def get_supplierpogrnmaterial_set(self, instance):
        from marketing.serializers import SupplierPOGRNMaterialSerializer
        return SupplierPOGRNMaterialSerializer(instance.supplierpogrnmaterial_set.all(), many=True).data
    
    class Meta:
        model = SupplierPOGRN
        fields = ('id', 'grn_number', 'grn_headers', 'supplierpogrnmaterial_set', )
        ordering = ['id']


class SupplierPOMetaDataSearchableListSerializer(serializers.ModelSerializer):

    supplier_po_id = serializers.IntegerField(source='pk', read_only=True, required=False)
    supplier_po_number = serializers.CharField(source='display_number', read_only=True, required=False)

    class Meta:
        model = SupplierPO
        fields = ('supplier_po_id', 'supplier_po_number')