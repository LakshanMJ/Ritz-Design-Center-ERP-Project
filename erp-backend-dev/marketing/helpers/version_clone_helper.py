from marketing.models import OrderPackItemPlacementMaterial, OrderPackItemPlacementMaterialConsumption, \
    OrderPackPlacementMaterial, OrderPackPlacementMaterialConsumption, OrderCostingVersion, OrderPackOtherCost, \
    OrderVersionColorwayCountry, PackItemService, PackItemEmbellishmentService, EmbellishmentServiceDetail, PackItemWashService, \
    ItemCountryCwCwyCategorySizeGroupFabricConsumptionRatio, ItemColorwayColorwayCategoryFabricConsumptionRatio, \
    ItemColorwayCategoryFabricConsumptionRatio, SupplierInquiry, SupplierInquiryDetail
from materials.models import FABRIC_TRIM_TYPES


class VersionCloneHelper:

    def __init__(self, source_version, clone_version, material_category=None, order_pack_item_ids=None, order_pack_ids=None):
        self.source_version = source_version
        self.clone_version = clone_version
        self.source_order_pack_item_ids = order_pack_item_ids
        self.clone_order_pack_items = clone_version.get_order_pack_items()
        self.source_order_pack_ids = order_pack_ids
        self.clone_order_packs = clone_version.get_order_version_packs()
        self.material_category = material_category

    def clone_data(self):
        self.clone_general_data()
        self.clone_version_ratios()
        self.clone_pack_item_material_data()
        self.clone_pack_material_data()
        self.clone_fabric_supplier_inquiry_data()
        self.clone_fabric_consumption_data()
        self.clone_other_cost_data()
        self.clone_services_data()

    def get_source_version_packs(self):
        if self.source_order_pack_ids is not None:
            packs = self.source_version.get_order_version_packs().filter(id__in=self.source_order_pack_ids)
        else:
            packs = self.source_version.get_order_version_packs()
        return packs

    def get_source_version_pack_items(self):
        if self.source_order_pack_item_ids is not None:
            pack_items = self.source_version.get_order_pack_items().filter(id__in=self.source_order_pack_item_ids)
        else:
            pack_items = self.source_version.get_order_pack_items()
        return pack_items

    def get_pack_item_placements(self, pack_item):
        if not self.material_category:
            return pack_item.get_pack_item_placements()
        else:
            return pack_item.get_pack_item_placements().filter(item_attribute_other__material__category=self.material_category)
        
    def get_pack_placements(self, pack, material_category=None):
        if not material_category:
            return pack.get_pack_placements()
        else:
            return pack.get_pack_placements().filter(item_attribute_other__material__category=material_category)
        
    def get_matching_source_order_pack_item_placement_material(self, clone_pack_item):
        source_order_pack_item = self.get_source_version_pack_items().get(item=clone_pack_item.item, pack__country=clone_pack_item.pack.country,
                                                pack__colorway=clone_pack_item.pack.colorway, pack__size=clone_pack_item.pack.size)
        if source_order_pack_item:
            pack_item_placements = self.get_pack_item_placements(source_order_pack_item)
            return OrderPackItemPlacementMaterial.objects.filter(placement__in=pack_item_placements).order_by('id')
        return None
    
    def get_matching_source_order_pack_placement_material(self, clone_pack):
        source_order_pack = self.get_source_version_packs().get(country=clone_pack.country,
                                                        colorway=clone_pack.colorway, size=clone_pack.size)
        if source_order_pack:
            pack_placements = self.get_pack_placements(source_order_pack)
            pack_placement_materials = OrderPackPlacementMaterial.objects.filter(placement__in=pack_placements).order_by('id')
            return pack_placement_materials
        return None
    
    def get_matching_source_order_pack(self, clone_pack):
        source_order_pack = self.get_source_version_packs().get(country=clone_pack.country,
                                                        colorway=clone_pack.colorway, size=clone_pack.size)
        if source_order_pack:
            return source_order_pack
        return None
    
    def get_matching_source_order_pack_item(self, clone_pack_item):
        source_order_pack_item = self.get_source_version_pack_items().get(item=clone_pack_item.item, pack__country=clone_pack_item.pack.country,
                                                pack__colorway=clone_pack_item.pack.colorway, pack__size=clone_pack_item.pack.size)
        if source_order_pack_item:
            return source_order_pack_item
        return None
    
    def get_macthing_clone_supplier_inquiry_detail(self, source_supplier_inquiry_detail):
        clone_supplier_inquiry_detail = SupplierInquiryDetail.objects.get(
            supplier_inquiry__customer_brand_material=source_supplier_inquiry_detail.supplier_inquiry.customer_brand_material,
            cutting_width=source_supplier_inquiry_detail.cutting_width,
            cutting_width_unit=source_supplier_inquiry_detail.cutting_width_unit,
            supplier_inquiry__version=self.clone_version,
            supplier_inquiry__supplier=source_supplier_inquiry_detail.supplier_inquiry.supplier
        )
        if clone_supplier_inquiry_detail:
            return clone_supplier_inquiry_detail
        return None
    
    def clone_general_data(self):
        self.clone_version.fabric_finance_cost_percentage = self.source_version.fabric_finance_cost_percentage
        self.clone_version.trim_finance_cost_percentage = self.source_version.trim_finance_cost_percentage
        self.clone_version.earnings_per_minute = self.source_version.earnings_per_minute
        self.clone_version.buyer_commission_percentage = self.source_version.buyer_commission_percentage
        self.clone_version.save()

    def clone_version_ratios(self):
        source_version_colorway_countries = OrderVersionColorwayCountry.objects.filter(version=self.source_version)

        for source_version_colorway_country in source_version_colorway_countries:
            clone_version_colorway_country, created = OrderVersionColorwayCountry.objects.get_or_create(
                colorway=source_version_colorway_country.colorway,
                country=source_version_colorway_country.country,
                version=self.clone_version
            )
            clone_version_colorway_country.estimated_quantity = source_version_colorway_country.estimated_quantity
            clone_version_colorway_country.save()

        for clone_order_pack in self.clone_order_packs:
            source_order_pack = self.get_matching_source_order_pack(clone_order_pack)
            if source_order_pack:
                clone_order_pack.cad_quantity = source_order_pack.cad_quantity
                clone_order_pack.save()

    def change_version_state(self):
        self.clone_version.version_state = OrderCostingVersion.PENDING_CONSUMPTION_DATA_VERSION_STATE
        self.clone_version.save()

    def clone_pack_item_material_data(self):
        # Clone PackItemPlacementMaterial assign data
        for clone_order_pack_item in self.clone_order_pack_items:
            source_order_pack_item_placement_materials = self.get_matching_source_order_pack_item_placement_material(clone_order_pack_item)
            for source_order_pack_item_placement_material in source_order_pack_item_placement_materials:
                order_pack_item_placements = self.get_pack_item_placements(clone_order_pack_item).filter(
                    item_attribute_other__item=source_order_pack_item_placement_material.placement.item_attribute_other.item,
                    item_attribute_other__item_attribute=source_order_pack_item_placement_material.placement.item_attribute_other.item_attribute
                )
                if order_pack_item_placements:
                    clone_order_pack_item_placement_material, created = OrderPackItemPlacementMaterial.objects.get_or_create(
                        placement=order_pack_item_placements[0], 
                        material=source_order_pack_item_placement_material.material
                    )
                    self.clone_pack_items_consumption_data(source_order_pack_item_placement_material, clone_order_pack_item_placement_material)
                    #print(clone_order_pack_item_placement_material, created)

    def clone_pack_material_data(self):
        #Clone PackPlacementMaterial assign data
        for clone_order_pack in self.clone_order_packs:
            source_order_pack_placement_materials = self.get_matching_source_order_pack_placement_material(clone_order_pack)
            for source_order_pack_placement_material in source_order_pack_placement_materials:
                order_pack_placements = self.get_pack_placements(clone_order_pack).filter(
                    item_attribute_other__item=source_order_pack_placement_material.placement.item_attribute_other.item,
                    item_attribute_other__item_attribute=source_order_pack_placement_material.placement.item_attribute_other.item_attribute
                )
                if order_pack_placements:
                    clone_order_pack_placement_material, created = OrderPackPlacementMaterial.objects.get_or_create(
                        placement=order_pack_placements[0], 
                        material=source_order_pack_placement_material.material
                    )
                    self.clone_packs_consumption_data(source_order_pack_placement_material, clone_order_pack_placement_material)
                    #print(clone_order_pack_placement_material, created)

        self.change_version_state()

    def clone_fabric_supplier_inquiry_data(self):
        source_supplier_inquiries = SupplierInquiry.objects.filter(version=self.source_version, customer_brand_material__material_detail__generic_material__user_material__category=FABRIC_TRIM_TYPES)
        for source_supplier_inquiry in source_supplier_inquiries:
            source_supplier_inquiry_details = source_supplier_inquiry.supplierinquirydetail_set.all().exclude(cutting_width=None)
            for source_supplier_inquiry_detail in source_supplier_inquiry_details:
                clone_supplier_inquiry, created = SupplierInquiry.objects.get_or_create(
                    version=self.clone_version,
                    customer_brand_material=source_supplier_inquiry_detail.supplier_inquiry.customer_brand_material,
                    #item_service = TODO Need to implement for services
                    supplier=source_supplier_inquiry_detail.supplier_inquiry.supplier,
                )
                clone_suuplier_inquiry_detail, created = SupplierInquiryDetail.objects.get_or_create(
                    supplier_inquiry=clone_supplier_inquiry,
                    cutting_width = source_supplier_inquiry_detail.cutting_width
                )
                clone_suuplier_inquiry_detail.cutting_width_unit = source_supplier_inquiry_detail.cutting_width_unit
                clone_suuplier_inquiry_detail.costing_unit = source_supplier_inquiry_detail.costing_unit
                clone_suuplier_inquiry_detail.cost_per_unit = source_supplier_inquiry_detail.cost_per_unit
                clone_suuplier_inquiry_detail.fob_price = source_supplier_inquiry_detail.fob_price
                clone_suuplier_inquiry_detail.cif_price = source_supplier_inquiry_detail.cif_price
                clone_suuplier_inquiry_detail.transport_charges = source_supplier_inquiry_detail.transport_charges
                clone_suuplier_inquiry_detail.ex_work_price = source_supplier_inquiry_detail.ex_work_price
                clone_suuplier_inquiry_detail.expiration_date = source_supplier_inquiry_detail.expiration_date
                clone_suuplier_inquiry_detail.lead_time = source_supplier_inquiry_detail.lead_time
                clone_suuplier_inquiry_detail.save()

    def clone_fabric_consumption_data(self):
        source_item_country_cw_cwy_category_size_group_fabric_consumption_ratios = ItemCountryCwCwyCategorySizeGroupFabricConsumptionRatio.objects.filter(version=self.source_version)
        item_colorway_colorway_category_fabric_consumption_ratios = ItemColorwayColorwayCategoryFabricConsumptionRatio.objects.filter(version=self.source_version)
        item_colorway_category_fabric_consumption_ratios = ItemColorwayCategoryFabricConsumptionRatio.objects.filter(version=self.source_version)

        for source_fabric_ratio in source_item_country_cw_cwy_category_size_group_fabric_consumption_ratios:
            source_supplier_inquiry_detail = source_fabric_ratio.supplier_inquiry_detail
            clone_supplier_inquiry_detail = self.get_macthing_clone_supplier_inquiry_detail(source_supplier_inquiry_detail)
            if clone_supplier_inquiry_detail:
                clone_fabric_ratio, created = ItemCountryCwCwyCategorySizeGroupFabricConsumptionRatio.objects.get_or_create(
                    version=self.clone_version,
                    customer_brand_fabric=source_fabric_ratio.customer_brand_fabric,
                    supplier_inquiry_detail=clone_supplier_inquiry_detail,
                    order_size_group=source_fabric_ratio.order_size_group,
                    order_country=source_fabric_ratio.order_country,
                    order_colorway=source_fabric_ratio.order_colorway,
                    colorway_category=source_fabric_ratio.colorway_category,
                    item=source_fabric_ratio.item
                )
                clone_fabric_ratio.costing_consumption_ratio = source_fabric_ratio.costing_consumption_ratio
                clone_fabric_ratio.wastage = source_fabric_ratio.wastage
                clone_fabric_ratio.save()

        for source_fabric_ratio in item_colorway_colorway_category_fabric_consumption_ratios:
            source_supplier_inquiry_detail = source_fabric_ratio.supplier_inquiry_detail
            clone_supplier_inquiry_detail = self.get_macthing_clone_supplier_inquiry_detail(source_supplier_inquiry_detail)
            if clone_supplier_inquiry_detail:
                clone_fabric_ratio, created = ItemColorwayColorwayCategoryFabricConsumptionRatio.objects.get_or_create(
                    version=self.clone_version,
                    customer_brand_fabric=source_fabric_ratio.customer_brand_fabric,
                    supplier_inquiry_detail=clone_supplier_inquiry_detail,
                    order_colorway = source_fabric_ratio.order_colorway,
                    colorway_category = source_fabric_ratio.colorway_category,
                    item = source_fabric_ratio.item
                )
                clone_fabric_ratio.costing_consumption_ratio = source_fabric_ratio.costing_consumption_ratio
                clone_fabric_ratio.wastage = source_fabric_ratio.wastage
                clone_fabric_ratio.save()

        for source_fabric_ratio in item_colorway_category_fabric_consumption_ratios:
            source_supplier_inquiry_detail = source_fabric_ratio.supplier_inquiry_detail
            clone_supplier_inquiry_detail = self.get_macthing_clone_supplier_inquiry_detail(source_supplier_inquiry_detail)
            if clone_supplier_inquiry_detail:
                clone_fabric_ratio, created = ItemColorwayCategoryFabricConsumptionRatio.objects.get_or_create(
                    version=self.clone_version,
                    customer_brand_fabric=source_fabric_ratio.customer_brand_fabric,
                    supplier_inquiry_detail=clone_supplier_inquiry_detail,
                    colorway_category = source_fabric_ratio.colorway_category,
                    item = source_fabric_ratio.item
                )
                clone_fabric_ratio.costing_consumption_ratio = source_fabric_ratio.costing_consumption_ratio
                clone_fabric_ratio.wastage = source_fabric_ratio.wastage
                clone_fabric_ratio.save()

    def clone_pack_items_consumption_data(self, source_order_pack_item_placement_material, clone_order_pack_item_placement_material):
        if hasattr(source_order_pack_item_placement_material, 'orderpackitemplacementmaterialconsumption'):
            consumption, created = OrderPackItemPlacementMaterialConsumption.objects.get_or_create(
                                        pack_item_placement_material=clone_order_pack_item_placement_material
                                    )
            consumption.costing_consumption_ratio = source_order_pack_item_placement_material.orderpackitemplacementmaterialconsumption.costing_consumption_ratio
            consumption.wastage = source_order_pack_item_placement_material.orderpackitemplacementmaterialconsumption.wastage
            consumption.save()

    def clone_packs_consumption_data(self, source_order_pack_placement_material, clone_order_pack_placement_material):
        if hasattr(source_order_pack_placement_material, 'orderpackplacementmaterialconsumption'):
            consumption, created = OrderPackPlacementMaterialConsumption.objects.get_or_create(
                                        pack_placement_material=clone_order_pack_placement_material
                                    )
            consumption.costing_consumption_ratio = source_order_pack_placement_material.orderpackplacementmaterialconsumption.costing_consumption_ratio
            consumption.wastage = source_order_pack_placement_material.orderpackplacementmaterialconsumption.wastage
            consumption.save()

    def clone_other_cost_data(self):
        for clone_order_pack in self.clone_order_packs:
            source_order_pack = self.get_matching_source_order_pack(clone_order_pack)
            if source_order_pack:
                source_other_costs = OrderPackOtherCost.objects.filter(pack=source_order_pack, other_cost_type__version=self.source_version)
                for source_other_cost in source_other_costs:
                    other_cost, created = OrderPackOtherCost.objects.get_or_create(
                        pack=clone_order_pack, other_cost_type__other_cost=source_other_cost.other_cost_type.other_cost,
                        other_cost_type__version=self.clone_version
                    )
                    other_cost.cost = source_other_cost.cost
                    other_cost.save()

    def clone_services_data(self):
        for clone_order_pack_item in self.clone_order_pack_items:
            source_order_pack_item = self.get_matching_source_order_pack_item(clone_order_pack_item)
            if source_order_pack_item:
                source_pack_item_serveices = PackItemService.objects.filter(pack_item=source_order_pack_item)
                for source_pack_item_serveice in source_pack_item_serveices:
                    source_service_object = source_pack_item_serveice.get_service_object()
                    if source_pack_item_serveice.service_type == PackItemService.EMBELLISHMENT_SERVICE_TYPE:
                        clone_embellishment_service_detail, created = EmbellishmentServiceDetail.objects.get_or_create(
                            version=self.clone_version, sub_type=source_service_object.embellishment_detail.sub_type , 
                            grading=source_service_object.embellishment_detail.grading)
                        clone_pack_item_embellishment_service, created = PackItemEmbellishmentService.objects.get_or_create(
                            pack_item=clone_order_pack_item, service_type=source_pack_item_serveice.service_type,
                            embellishment_detail=clone_embellishment_service_detail, size=source_service_object.size
                        )
                    elif source_pack_item_serveice.service_type ==PackItemService.WASH_SERVICE_TYPE:
                        clone_pack_item_wash_service, created = PackItemWashService.objects.get_or_create(
                            technique=source_service_object.technique, pack_item=clone_order_pack_item, 
                            service_type=source_pack_item_serveice.service_type,
                        )
 