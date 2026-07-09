from marketing.models import BOMChangeRequest, BOMChangeRequestChangeType, BOMChangeRequestConsumptionChange, BOMChangeRequestMaterialAppliedPackandPackItemPlacements, \
                                BOMChangeRequestPriceChange, BOMChangeRequestMaterialChange, OrderPackItemPlacementMaterialConsumption, OrderPackPlacementMaterialConsumption, \
                                PackItemFabricConsumptionRatio, OrderPackItemPlacement, OrderPackPlacement, OrderCostingVersion
from django.contrib.contenttypes.models import ContentType


class BOMChangeRequestHelper:

    def __init__(self, costing_version):
        self.costing_version = costing_version

    def create_bcr(self, creater, reason, type, data):
        if self.costing_version.costing_type == OrderCostingVersion.PRE_COSTING:
            if type == BOMChangeRequestChangeType.PRICE_CHANGE:
                bcr = self.create_bom_change_request(creater, reason)
                bcr_type = self.create_bom_change_request_change_type(bcr, BOMChangeRequestChangeType.PRICE_CHANGE)
                bcr_price_change = self.create_bcr_price_change(bcr_type, data)
            elif type == BOMChangeRequestChangeType.MATERIAL_CHANGE:
                bcr = self.create_bom_change_request(creater, reason)
                bcr_type = self.create_bom_change_request_change_type(bcr, BOMChangeRequestChangeType.MATERIAL_CHANGE)
                bcr_materia_change = self.create_bcr_price_change(bcr_type, data)
            elif type == BOMChangeRequestChangeType.CONSUMPTION_CHANGE:
                bcr = self.create_bom_change_request(creater, reason)
                bcr_type = self.create_bom_change_request_change_type(bcr, BOMChangeRequestChangeType.COn)
                bcr_consumption_change = self.create_bcr_consumption_change(bcr_type, data)
        else:
            pass

    def create_bom_change_request(self, creater, reason):
        bcr = BOMChangeRequest.objects.create(
            costing_version=self.costing_version,
            creator=creater, reason=reason, state=BOMChangeRequest.DRAFT_STATE
        )
        return bcr
    
    def create_bom_change_request_change_type(self, bcr, type):
        bcr_type = BOMChangeRequestChangeType.objects.create(
            bom_change_request=bcr, state=type
        )
        return bcr_type

    def create_bcr_price_change(self, bcr_type, data):
        bcr_price_change = BOMChangeRequestPriceChange.objects.create(
            bom_change_request_type=bcr_type,
            material_price=data['material_price'],
            old_price=data['old_price'],
            old_price_units=data['old_price_units'],
            new_price=data['new_price'],
            new_price_units=data['new_price_units'],
        )
        return bcr_price_change

    def create_bcr_material_change(self, bom_change_request_type, data):
        bcr_material_change = BOMChangeRequestMaterialChange.objects.create(
            bom_change_request_type=bom_change_request_type,
            old_material=data['old_material'],
            new_material=data['new_material'],
        )
        for placement in data['placements'],:
            entity_type = None
            if isinstance(placement, OrderPackItemPlacement):
                entity_type = ContentType.objects.get_for_model(OrderPackItemPlacement)
            elif isinstance(placement, OrderPackPlacement):
                entity_type = ContentType.objects.get_for_model(OrderPackItemPlacement)

            if entity_type:
                bcr_material_applied_pack_and_pack_item_placements = BOMChangeRequestMaterialAppliedPackandPackItemPlacements.objects.create(
                    entity_type=entity_type,
                    entity_id=placement.id,
                    bom_change_request_material_change=bcr_material_change
                )
        return bcr_material_change
        
    def create_bcr_consumption_change(self, entity_id, bom_change_request_type, data):
        pack_item_consumption_ct = ContentType.objects.get_for_model(OrderPackItemPlacementMaterialConsumption)
        pack_consumption_ct = ContentType.objects.get_for_model(OrderPackPlacementMaterialConsumption)
        fabrc_consumption_ct = ContentType.objects.get_for_model(PackItemFabricConsumptionRatio)
        bcr_consumption_change = BOMChangeRequestConsumptionChange.objects.create(
            bom_change_request_type = bom_change_request_type,
            entity_type=pack_item_consumption_ct,
            entity_id=entity_id,
            old_consumption_ratio=data['old_consumption_ratio'],
            old_wastage=data['old_wastage'],
            new_consumption_ratio=data['new_consumption_ratio'],
            new_wastage=data['new_wastage'],
        )
        return bcr_consumption_change