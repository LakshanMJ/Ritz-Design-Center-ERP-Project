from marketing.models import BOMChangeRequest, BOMChangeRequestChangeType, BOMChangeRequestConsumptionChange, BOMChangeRequestMaterialAppliedPackandPackItemPlacements, \
                                BOMChangeRequestPriceChange, BOMChangeRequestMaterialChange, POPackPlacement, POPackItemPlacement, ActualPOClub, BOMChangeRequestFabricVoidMarker, \
                                BOMChangeRequestFabricMarker, POFabricMarker, BOMChangeRequestSupplierChange, PurchaseOrderBom, FabricWidth, FabricWidthSupplier
from shared.models import Supplier
from materials.models import CustomerBrandMaterial, FABRIC_TRIM_TYPES, SEWING_TRIM_TYPES, PACKAGING_TYPES, SupplierInquiryMaterialCode, SupplierInquiry, SupplierInquiryDetail
from supplier_po.models import GeneralPOSupplierMaterialPrice, SupplierPO, GeneralPOSupplier
from django.contrib.contenttypes.models import ContentType
from rest_framework.generics import get_object_or_404
from shared.helpers.currency_helper import CurrencyHelper
from shared.utils import get_object_or_none, calculate_queryset_total_normalized_quantity, get_quantity_dictionary, ceil_number
from supplier_po.models import SupplierPO, SupplierDeliveryDateQuantity, GeneralPOSupplierMaterialPrice, GeneralPOMaterialQuantity

class POClubBOMChangeRequestHelper:

    def __init__(self, po_club):
        self.po_club = po_club

    def create_approval(self, bcr, user):
        from shared.models import Role
        from shared.approvals.constants.approval_choices import BOM_CHANGE_REQUEST_APPROVAL
        from shared.permissions.roles import BOM_CHANGE_REQUEST_APPROVER
        role = Role.objects.get(name=BOM_CHANGE_REQUEST_APPROVER)
        bcr_approver_users = role.users.all()
        approval = bcr.create_approval(bcr_approver_users, user, BOM_CHANGE_REQUEST_APPROVAL)
        return approval

    def create_bcr(self, creator, reason, type, data):
        if type == BOMChangeRequestChangeType.PRICE_CHANGE:
            bcr = self.create_bom_change_request(creator, reason)
            bcr_type = self.create_bom_change_request_change_type(bcr, BOMChangeRequestChangeType.PRICE_CHANGE)
            bcr_price_changes = self.create_bcr_price_change(bcr_type, data)
            self.create_approval(bcr, creator)
            return bcr
        elif type == BOMChangeRequestChangeType.MATERIAL_CHANGE:
            bcr = self.create_bom_change_request(creator, reason)
            bcr_type = self.create_bom_change_request_change_type(bcr, BOMChangeRequestChangeType.MATERIAL_CHANGE)
            bcr_material_change = self.create_bcr_material_change(bcr_type, data)
            self.create_approval(bcr, creator)
            return bcr
        elif type == BOMChangeRequestChangeType.CONSUMPTION_CHANGE:
            bcr = self.create_bom_change_request(creator, reason)
            bcr_type = self.create_bom_change_request_change_type(bcr, BOMChangeRequestChangeType.CONSUMPTION_CHANGE)
            bcr_consumption_change = self.create_bcr_consumption_change(bcr_type, data)
            self.create_approval(bcr, creator)
            return bcr
        elif type == BOMChangeRequestChangeType.SUPPLIER_CHANGE:
            bcr = self.create_bom_change_request(creator, reason)
            bcr_type = self.create_bom_change_request_change_type(bcr, BOMChangeRequestChangeType.SUPPLIER_CHANGE)
            bcr_supplier_change = self.create_bcr_supplier_change(bcr_type, data)
            self.create_approval(bcr, creator)
            return bcr
        else:
            return None

    def create_bom_change_request(self, creator, reason):
        po_club_ct = ContentType.objects.get_for_model(ActualPOClub)
        bcr = BOMChangeRequest.objects.create(
            entity_type=po_club_ct,
            entity_id=self.po_club.id,
            creator=creator, reason=reason, state=BOMChangeRequest.DRAFT_STATE
        )
        return bcr
    
    def create_bom_change_request_change_type(self, bcr, type):
        bcr_type = BOMChangeRequestChangeType.objects.create(
            bom_change_request=bcr, state=type
        )
        return bcr_type

    def create_bcr_price_change(self, bcr_type, data):
        for row in data:
            material_price = get_object_or_404(GeneralPOSupplierMaterialPrice, pk=row['material_price_id'])
            bcr_price_change = BOMChangeRequestPriceChange.objects.create(
                bom_change_request_type=bcr_type,
                material_price=material_price, # material price is GeneralPOSupplierMaterialPrice instance
                old_price=material_price.order_price,
                old_price_units=material_price.order_price_units,
                new_price=row['new_price'],
                new_price_units=CurrencyHelper.USD_CURRENCY,
            )
        bcr_price_changes = BOMChangeRequestPriceChange.objects.filter(bom_change_request_type=bcr_type)
        return bcr_price_changes
    
    def create_bcr_supplier_change(self, bcr_type, data):
        supplier_inquiry_data = data['supplier_inquiry_data']
        material = get_object_or_404(CustomerBrandMaterial, pk=data['old_material'])
        supplier = get_object_or_404(Supplier, pk=supplier_inquiry_data['supplier_id'])
        cancelled_spos = data['cancelled_spos']

        supplier_material_reference_code = None
        if supplier_inquiry_data['supplier_material_reference_code']:
            supplier_material_reference_code, created = SupplierInquiryMaterialCode.objects.get_or_create(
                customer_brand_material=material,
                supplier=supplier,
                supplier_material_reference_code=supplier_inquiry_data['supplier_material_reference_code']
            )
        #expiration_date = dt.date()
        #expiration_date = datetime.strptime(supplier_inquiry_data['expiration_date'],'%d/%m/%Y').date()
        cutting_width = supplier_inquiry_data['cutting_width'] if supplier_inquiry_data['cutting_width'] else None
        ex_work_price = supplier_inquiry_data['ex_work_price'] if supplier_inquiry_data['ex_work_price'] else None
        minimum_order_quantity = supplier_inquiry_data['minimum_order_quantity'] if supplier_inquiry_data['minimum_order_quantity'] else None
        bcr_supplier_change = BOMChangeRequestSupplierChange.objects.create(
            bom_change_request_type=bcr_type,
            material=material, # material price is GeneralPOSupplierMaterialPrice instance
            supplier=supplier,
            cutting_width=cutting_width,
            cutting_width_unit=supplier_inquiry_data['cutting_width_unit'],
            costing_unit=supplier_inquiry_data['costing_unit'],
            cost_per_unit=supplier_inquiry_data['cost_per_unit'],
            fob_price=supplier_inquiry_data['fob_price'],
            cif_price=supplier_inquiry_data['cif_price'],
            transport_charges=supplier_inquiry_data['transport_charges'],
            ex_work_price=ex_work_price,
            expiration_date=supplier_inquiry_data['expiration_date'],
            lead_time=supplier_inquiry_data['lead_time'],
            minimum_order_quantity=minimum_order_quantity,
            minimum_order_quantity_units=supplier_inquiry_data['minimum_order_quantity_units'],
            excess_threshold=supplier_inquiry_data['excess_threshold'],
            cost_per_unit_type=supplier_inquiry_data['cost_per_unit_type'],
            ship_mode=supplier_inquiry_data['ship_mode'],
            pay_mode=supplier_inquiry_data['pay_mode'],
            supplier_inquiry_material_code=supplier_material_reference_code
        )

        # supplier_pos = SupplierPO.objects.filter(id__in=cancelled_spos)
        # for supplier_po in supplier_pos:
        #     supplier_po.state = SupplierPO.CANCEL_STATE
        #     supplier_po.save()
            
        return bcr_supplier_change

    def create_bcr_material_change(self, bom_change_request_type, data):
        supplier_inquiry_data = data['supplier_inquiry_data']
        new_material = get_object_or_404(CustomerBrandMaterial, pk=data['new_material'])
        old_material = get_object_or_404(CustomerBrandMaterial, pk=data['old_material'])
        supplier = get_object_or_404(Supplier, pk=supplier_inquiry_data['supplier_id'])

        supplier_material_reference_code = None
        if supplier_inquiry_data['supplier_material_reference_code']:
            supplier_material_reference_code, created = SupplierInquiryMaterialCode.objects.get_or_create(
                customer_brand_material=new_material,
                supplier=supplier,
                supplier_material_reference_code=supplier_inquiry_data['supplier_material_reference_code']
            )

        #void_markers = data['avoid_markers']
        select_markers = data['select_marker']
        cutting_width = supplier_inquiry_data['cutting_width'] if supplier_inquiry_data['cutting_width'] else None
        ex_work_price = supplier_inquiry_data['ex_work_price'] if supplier_inquiry_data['ex_work_price'] else None
        minimum_order_quantity = supplier_inquiry_data['minimum_order_quantity'] if supplier_inquiry_data['minimum_order_quantity'] else None
        transport_charges = supplier_inquiry_data['transport_charges'] if supplier_inquiry_data['transport_charges'] else None
        bcr_material_change = BOMChangeRequestMaterialChange.objects.create(
            bom_change_request_type=bom_change_request_type,
            old_material=old_material,
            new_material=new_material,
            supplier=supplier,
            cutting_width=cutting_width,
            cutting_width_unit=supplier_inquiry_data['cutting_width_unit'],
            costing_unit=supplier_inquiry_data['costing_unit'],
            cost_per_unit=supplier_inquiry_data['cost_per_unit'],
            fob_price=supplier_inquiry_data['fob_price'],
            cif_price=supplier_inquiry_data['cif_price'],
            transport_charges=transport_charges,
            ex_work_price=ex_work_price,
            expiration_date=supplier_inquiry_data['expiration_date'],
            lead_time=supplier_inquiry_data['lead_time'],
            minimum_order_quantity=minimum_order_quantity,
            minimum_order_quantity_units=supplier_inquiry_data['minimum_order_quantity_units'],
            excess_threshold=supplier_inquiry_data['excess_threshold'],
            cost_per_unit_type=supplier_inquiry_data['cost_per_unit_type'],
            ship_mode=supplier_inquiry_data['ship_mode'],
            pay_mode=supplier_inquiry_data['pay_mode'],
            supplier_inquiry_material_code=supplier_material_reference_code
        )
        for row in data['ratios']:
            entity_type = None
            if new_material.material_category in [FABRIC_TRIM_TYPES, SEWING_TRIM_TYPES]:
                entity_type = ContentType.objects.get_for_model(POPackItemPlacement)
            elif new_material.material_category == PACKAGING_TYPES:
                entity_type = ContentType.objects.get_for_model(POPackPlacement)

            if entity_type:
                bcr_material_applied_pack_and_pack_item_placements = BOMChangeRequestMaterialAppliedPackandPackItemPlacements.objects.create(
                    entity_type=entity_type,
                    entity_id=row['id'],
                    bom_change_request_material_change=bcr_material_change,
                    new_consumption_ratio=row['consumption'],
                    new_wastage=row['wastage']
                )

        if new_material.material_category == FABRIC_TRIM_TYPES:
            for pack_item_id in data['checked_ids']:
                    entity_type = ContentType.objects.get_for_model(POPackItemPlacement)
                    bcr_material_applied_pack_and_pack_item_placements = BOMChangeRequestMaterialAppliedPackandPackItemPlacements.objects.get_or_create(
                        entity_type=entity_type,
                        entity_id=pack_item_id,
                        bom_change_request_material_change=bcr_material_change
                    )

            # for void_marker_id in void_markers:
            #     void_marker = get_object_or_404(POFabricMarker, pk=void_marker_id)
            #     bom_void_marker = BOMChangeRequestFabricVoidMarker.objects.create(
            #         bom_change_request_type=bom_change_request_type,
            #         void_marker=void_marker
            #     )
            for marker_id in select_markers:
                marker = get_object_or_404(POFabricMarker, pk=marker_id)
                bom_marker = BOMChangeRequestFabricMarker.objects.create(
                    bom_change_request_type=bom_change_request_type,
                    marker=marker
                )

        return bcr_material_change
        
    def create_bcr_consumption_change(self, bom_change_request_type, data):
        consumption_data = []
        material = get_object_or_404(CustomerBrandMaterial, pk=data['old_material'])
        #void_markers = data['avoid_markers']
        select_markers = data['select_marker']
        if material.material_category in [PACKAGING_TYPES, SEWING_TRIM_TYPES]:
            for row in data['ratios']:
                entity_type = None
                entity = None
                if material.material_category == SEWING_TRIM_TYPES:
                    entity_type = ContentType.objects.get_for_model(POPackItemPlacement)
                    entity = get_object_or_404(POPackItemPlacement, pk=row['id'])
                elif material.material_category == PACKAGING_TYPES:
                    entity_type = ContentType.objects.get_for_model(POPackPlacement)
                    entity = get_object_or_404(POPackPlacement, pk=row['id'])
                if entity_type and entity:
                    bcr_consumption_change = BOMChangeRequestConsumptionChange.objects.create(
                        bom_change_request_type = bom_change_request_type,
                        entity_type=entity_type,
                        entity_id=entity.id,
                        old_consumption_ratio=entity.consumption_ratio,
                        old_wastage=entity.wastage,
                        new_consumption_ratio=row['consumption'],
                        new_wastage=row['wastage'],
                    )
                    consumption_data.append(bcr_consumption_change)
        if material.material_category == FABRIC_TRIM_TYPES:
            # for void_marker_id in void_markers:
            #     void_marker = get_object_or_404(POFabricMarker, pk=void_marker_id)
            #     BOMChangeRequestFabricVoidMarker.objects.create(
            #         bom_change_request_type=bom_change_request_type,
            #         void_marker=void_marker
            #     )
            for marker_id in select_markers:
                marker = get_object_or_404(POFabricMarker, pk=marker_id)
                BOMChangeRequestFabricMarker.objects.create(
                    bom_change_request_type=bom_change_request_type,
                    marker=marker
                )
        return consumption_data
    
    def create_supplier_inquiry(self, costing_version, material_change):

        if isinstance(material_change, BOMChangeRequestMaterialChange):
            material = material_change.new_material
        else:
            material = material_change.material
        supplier_inquiry, created = SupplierInquiry.objects.get_or_create(
            supplier=material_change.supplier,
            customer_brand_material=material,
            version=costing_version
        )

        supplier_inquiry_detail, created = SupplierInquiryDetail.objects.get_or_create(
            supplier_inquiry=supplier_inquiry
        )
        supplier_inquiry_detail.cutting_width = material_change.cutting_width
        supplier_inquiry_detail.cutting_width_unit = material_change.cutting_width_unit
        supplier_inquiry_detail.costing_unit = material_change.costing_unit
        supplier_inquiry_detail.cost_per_unit = material_change.cost_per_unit
        supplier_inquiry_detail.fob_price = material_change.fob_price
        supplier_inquiry_detail.cif_price = material_change.cif_price
        supplier_inquiry_detail.transport_charges = material_change.transport_charges
        supplier_inquiry_detail.ex_work_price = material_change.ex_work_price
        supplier_inquiry_detail.expiration_date = material_change.expiration_date
        supplier_inquiry_detail.lead_time = material_change.lead_time
        supplier_inquiry_detail.minimum_order_quantity = material_change.minimum_order_quantity
        supplier_inquiry_detail.minimum_order_quantity_units = material_change.minimum_order_quantity_units
        supplier_inquiry_detail.excess_threshold = material_change.excess_threshold
        supplier_inquiry_detail.supplier_inquiry_material_code = material_change.supplier_inquiry_material_code
        supplier_inquiry_detail.ship_mode = material_change.ship_mode
        supplier_inquiry_detail.pay_mode = material_change.pay_mode
        supplier_inquiry_detail.cost_per_unit_type = material_change.cost_per_unit_type
        supplier_inquiry_detail.save()

        if material.material_category == FABRIC_TRIM_TYPES:
            width, created = FabricWidth.objects.get_or_create(
                actual_po_club=self.po_club,
                customer_brand_material=material,
                width=supplier_inquiry_detail.cutting_width,
                width_unit=supplier_inquiry_detail.cutting_width_unit
            )
            FabricWidthSupplier.objects.get_or_create(width=width, supplier_inquiry_detail=supplier_inquiry_detail)

        return supplier_inquiry, supplier_inquiry_detail
    

    def get_or_create_general_po_supplier_material_price(self, general_po_supplier, supplier_material, supplier_inquiry_detail):
        general_po_supplier_material_price, created = GeneralPOSupplierMaterialPrice.objects.get_or_create(
            supplier_material=supplier_material,
            general_po_supplier=general_po_supplier,
            supplier_inquiry_detail=supplier_inquiry_detail,
        )
        general_po_supplier_material_price.cutting_width = supplier_inquiry_detail.cutting_width
        general_po_supplier_material_price.cutting_width_unit = supplier_inquiry_detail.cutting_width_unit
        general_po_supplier_material_price.costing_unit = supplier_inquiry_detail.costing_unit
        general_po_supplier_material_price.cost_per_unit = supplier_inquiry_detail.cost_per_unit
        general_po_supplier_material_price.fob_price = supplier_inquiry_detail.fob_price
        general_po_supplier_material_price.cif_price = supplier_inquiry_detail.cif_price
        general_po_supplier_material_price.transport_charges =supplier_inquiry_detail.transport_charges
        general_po_supplier_material_price.ex_work_price = supplier_inquiry_detail.ex_work_price
        general_po_supplier_material_price.expiration_date = supplier_inquiry_detail.expiration_date
        general_po_supplier_material_price.lead_time = supplier_inquiry_detail.lead_time
        general_po_supplier_material_price.minimum_order_quantity = supplier_inquiry_detail.minimum_order_quantity
        general_po_supplier_material_price.minimum_order_quantity_units = supplier_inquiry_detail.minimum_order_quantity_units
        general_po_supplier_material_price.excess_threshold = supplier_inquiry_detail.excess_threshold
        general_po_supplier_material_price.ship_mode = supplier_inquiry_detail.ship_mode
        general_po_supplier_material_price.pay_mode = supplier_inquiry_detail.pay_mode
        general_po_supplier_material_price.cost_per_unit_type = supplier_inquiry_detail.cost_per_unit_type
        general_po_supplier_material_price.save()

        return general_po_supplier_material_price

    def get_organized_po_club_bom_data_by_material(self, po_club, customer_brand_material):
        purchase_orders = po_club.get_purchase_orders()
        purchase_order_boms = PurchaseOrderBom.objects.filter(purchase_order__in=purchase_orders, material=customer_brand_material)
        material_ids = purchase_order_boms.values_list('material_id', flat=True).distinct()
        data = []
        normalized_unit = customer_brand_material.material_normalized_measuring_unit
        quantity = calculate_queryset_total_normalized_quantity(purchase_order_boms, normalized_unit, 'quantity', 'measuring_unit')
        material_data = {
                'material': customer_brand_material,
                'supplier_inquiry_detail': purchase_order_boms.order_by('supplier_inquiry_detail__cost_per_unit')[0].supplier_inquiry_detail,
                'required_quantity': get_quantity_dictionary(ceil_number(quantity), normalized_unit)
            }
        # for material_id in material_ids:
        #     material_boms = purchase_order_boms.filter(material_id=material_id)

        #     customer_brand_material = material_boms[0].material
        #     normalized_unit = customer_brand_material.material_normalized_measuring_unit

        #     quantity = calculate_queryset_total_normalized_quantity(material_boms, normalized_unit, 'quantity', 'measuring_unit')
            
        #     material_data = {
        #         'material': customer_brand_material,
        #         'supplier_inquiry_detail': material_boms.order_by('supplier_inquiry_detail__cost_per_unit')[0].supplier_inquiry_detail,
        #         'required_quantity': get_quantity_dictionary(ceil_number(quantity), normalized_unit)
        #     }
        data.append(material_data)
        return data
    
    def get_or_create_general_po_suppler(self, general_po, supplier):
        general_po_supplier = GeneralPOSupplier.objects.create(
            general_po=general_po,
            supplier=supplier
        )
        return general_po_supplier

    def generate_general_po_materials(self, customer_brand_material, supplier_inquiry_detail):
        organized_bom_data = self.get_organized_po_club_bom_data_by_material(self.po_club, customer_brand_material)
        success = len(organized_bom_data) > 0
        for organized_bom_row in organized_bom_data:
            general_po = self.po_club.get_or_create_po_club_general_po()
            if supplier_inquiry_detail is None:
                supplier_inquiry_detail = get_object_or_none(SupplierInquiryDetail, {'pk': organized_bom_row['supplier_inquiry_detail'].pk})
            supplier = get_object_or_404(Supplier, pk=supplier_inquiry_detail.supplier_inquiry.supplier.id)

            supplier_material = supplier_inquiry_detail.supplier_inquiry_material_code.get_related_supplier_material_for_different_supplier_material(customer_brand_material, True)
            general_po_supplier = self.get_or_create_general_po_suppler(general_po, supplier)

            default_material_supplier = self.get_or_create_general_po_supplier_material_price(general_po_supplier, supplier_material, supplier_inquiry_detail)

            default_material_supplier.lead_time = supplier_inquiry_detail.lead_time
            default_material_supplier.costing_price = supplier_inquiry_detail.cost_per_unit
            default_material_supplier.costing_price_units = supplier_inquiry_detail.costing_unit
            default_material_supplier.order_price = supplier_inquiry_detail.cost_per_unit
            default_material_supplier.order_price_units = supplier_inquiry_detail.costing_unit
            default_material_supplier.excess_threshold = supplier_inquiry_detail.excess_threshold
            default_material_supplier.save()
            
            general_po_material_quantity = GeneralPOMaterialQuantity.objects.create(general_po=general_po, material=customer_brand_material, default_material_supplier=default_material_supplier)
            general_po_material_quantity.quantity = organized_bom_row['required_quantity']['quantity']
            general_po_material_quantity.measuring_unit = organized_bom_row['required_quantity']['quantity_units']
            general_po_material_quantity.order_quantity = organized_bom_row['required_quantity']['quantity']
            general_po_material_quantity.order_quantity_units = organized_bom_row['required_quantity']['quantity_units']
            general_po_material_quantity.default_material_supplier = default_material_supplier
            general_po_material_quantity.send_po_for_material = True
            general_po_material_quantity.quantity = float(organized_bom_row['required_quantity']['quantity'])
            general_po_material_quantity.measuring_unit = organized_bom_row['required_quantity']['quantity_units']

            general_po_material_quantity.save()

            supplier_delivery_date_quantity, created = SupplierDeliveryDateQuantity.objects.get_or_create(
                general_po_material_quantity=general_po_material_quantity,
                material_supplier=default_material_supplier,
                default_supplier=True
            )

            supplier_delivery_date_quantity.quantity = organized_bom_row['required_quantity']['quantity']
            supplier_delivery_date_quantity.quantity_units = organized_bom_row['required_quantity']['quantity_units']
            supplier_delivery_date_quantity.proforma_invoice_quantity = organized_bom_row['required_quantity']['quantity']
            supplier_delivery_date_quantity.proforma_invoice_quantity_units = organized_bom_row['required_quantity']['quantity_units']
            supplier_delivery_date_quantity.default_supplier = True
            supplier_delivery_date_quantity.save()
        return success