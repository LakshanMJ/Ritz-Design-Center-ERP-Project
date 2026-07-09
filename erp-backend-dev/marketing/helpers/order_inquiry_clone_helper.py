from marketing.models import OrderInquiry, OrderCountry, OrderSize, OrderSizeGroup, OrderItem, OrderColorway, \
    ColorwayItemType, OrderPackItemPlacement, OrderPackPlacement, \
    OrderPlacement, OrderPackItemPlacementPattern, OrderPackItemPlacementMaterial, OrderPackPlacementMaterial, \
    OrderPackItemPlacementMaterialConsumption, OrderPackPlacementMaterialConsumption, \
    ItemCountryCwCwyCategorySizeGroupFabricConsumptionRatio, ItemColorwayColorwayCategoryFabricConsumptionRatio, \
    ItemColorwayCategoryFabricConsumptionRatio, OrderCostingColorwayMaterialSupplierInquiry, \
    OtherCostType, OrderPackOtherCost, SupplierInquiry, SupplierInquiryDetail, OrderItemColorwayOperation, \
    OrderCostingVersion, OrderPack, OrderPackItem, OrderPackSizeGroup, ItemAttribute, \
    PackItemWashService, PackItemEmbellishmentService, OrderVersionColorwayCountry, PackItemService, \
    EmbellishmentServiceDetail, OrderCostingServiceSupplierInquiry
from datetime import date
from shared.utils import get_object_or_none
from django.shortcuts import get_object_or_404


class OrderPackAndOrderPackItemCopyMixin:

    def get_or_create_order_placement(self, destination_version, source_order_placement):
        order_placement, created = OrderPlacement.objects.get_or_create(
            version=destination_version,
            copied_from=source_order_placement,
            item=source_order_placement.item
        )
        if created:
            order_placement.name = source_order_placement.name
            order_placement.type = source_order_placement.type
            order_placement.assign_type = source_order_placement.assign_type
            order_placement.material = source_order_placement.material
            order_placement.item_attribute = source_order_placement.item_attribute
            order_placement.estimated_consumption_ratio = source_order_placement.estimated_consumption_ratio
            order_placement.estimated_consumption_ratio_units = source_order_placement.estimated_consumption_ratio_units
            order_placement.copied_from = source_order_placement
            order_placement.save()
        return order_placement

    def make_copy_of_file_attachment(self, file_attachment):
        if file_attachment:
            file_attachment.pk = None
            file_attachment.save()
        return file_attachment

    ############# Order Pack Item Placement Related functions #####################
    def get_or_create_order_pack_item_placement(self, destination_order_pack_item, copied_from_order_pack_item_placement):
        destination_version = destination_order_pack_item.pack.version
        order_placement = self.get_or_create_order_placement(destination_version, copied_from_order_pack_item_placement.item_attribute_other)

        order_pack_item_placement, created = OrderPackItemPlacement.objects.get_or_create(
            order_pack_item=destination_order_pack_item,
            item_attribute_other=order_placement
        )
        if created:
            order_pack_item_placement.placement_name = order_placement.name
            order_pack_item_placement.copied_from = copied_from_order_pack_item_placement
        return order_pack_item_placement

    def get_or_create_order_pack_item_placement_material(self, destination_order_pack_item_placement, copied_placement_material):
        order_pack_item_placement_material, created = OrderPackItemPlacementMaterial.objects.get_or_create(
            placement=destination_order_pack_item_placement,
        )
        if created or order_pack_item_placement_material.copied_from != copied_placement_material:
            order_pack_item_placement_material.copied_from = copied_placement_material
            order_pack_item_placement_material.material = copied_placement_material.material
            order_pack_item_placement_material.save()
        return order_pack_item_placement_material

    def get_or_create_order_pack_item_placement_material_consumption(self, destination_order_pack_item_placement_material, copied_from_placement_material_consumption):
        ''' This function doesn't copy consumption ratios for fabrics '''
        order_pack_item_placement_material_consumption, created = OrderPackItemPlacementMaterialConsumption.objects.get_or_create(
            pack_item_placement_material=destination_order_pack_item_placement_material
        )
        if created or order_pack_item_placement_material_consumption.copied_from != copied_from_placement_material_consumption:
            order_pack_item_placement_material_consumption.copied_from = copied_from_placement_material_consumption
            order_pack_item_placement_material_consumption.costing_consumption_ratio = copied_from_placement_material_consumption.costing_consumption_ratio
            order_pack_item_placement_material_consumption.wastage = copied_from_placement_material_consumption.wastage
            order_pack_item_placement_material_consumption.save()
            # TODO - handle attachments
        return order_pack_item_placement_material_consumption

    def get_or_create_order_pack_item_placement_and_dependencies(self, destination_order_pack_item, copied_from_order_pack_item_placement):
        order_pack_item_placement = self.get_or_create_order_pack_item_placement(destination_order_pack_item, copied_from_order_pack_item_placement)

        copied_placement_material = copied_from_order_pack_item_placement.get_placement_material_object()
        if copied_placement_material:
            order_pack_item_placement_material = self.get_or_create_order_pack_item_placement_material(order_pack_item_placement, copied_placement_material)
            copied_from_placement_material_consumption = copied_placement_material.placement.get_material_consumption_object()
            if copied_from_placement_material_consumption:
                source_placement_material_consumption = self.get_or_create_order_pack_item_placement_material_consumption(order_pack_item_placement_material, copied_from_placement_material_consumption)
        return order_pack_item_placement

    def get_or_create_order_pack_item_wash_service(self, destination_order_pack_item, source_order_pack_item_service):
        if source_order_pack_item_service.service_type == PackItemService.WASH_SERVICE_TYPE:
            source_service_object = source_order_pack_item_service.get_service_object()
            service, created = PackItemWashService.objects.get_or_create(
                pack_item=destination_order_pack_item,
                copied_from=source_order_pack_item_service
            )
            if created:
                service.service_type = source_order_pack_item_service.service_type
                service.technique = source_service_object.technique
                wash_service_attachment_copy = self.make_copy_of_file_attachment(source_service_object.wash_service_attachment)
                service.wash_service_attachment = wash_service_attachment_copy
                service.copied_from = source_service_object
                service.save()
        else:
            raise Exception("Invalid copy pack item service type. It must be a wash service. - create_order_pack_item_wash_service")
        return service

    def get_or_create_costing_embellishment_detail(self, costing_version, source_embellishment_detail):
        source_service_object = source_embellishment_detail.get_service_object()
        embellishment_detail, created = EmbellishmentServiceDetail.objects.get_or_create(
            version=costing_version,
            copied_from=source_service_object.embellishment_detail,
            sub_type=source_service_object.embellishment_detail.sub_type
        )
        if created:
            embellishment_detail.grading = source_service_object.embellishment_detail.grading
            embellishment_detail.embellishment_attachment = self.make_copy_of_file_attachment(embellishment_detail.embellishment_attachment)
            embellishment_detail.copied_from = source_service_object.embellishment_detail
            embellishment_detail.save()
        return embellishment_detail

    def get_or_create_order_pack_item_embellishment_service(self, destination_order_pack_item, source_order_pack_item_service):
        if source_order_pack_item_service.service_type == PackItemService.EMBELLISHMENT_SERVICE_TYPE:
            source_service_object = source_order_pack_item_service.get_service_object()
            embellishment_detail = self.get_or_create_costing_embellishment_detail(destination_order_pack_item.pack.version, source_order_pack_item_service)
            service, created = PackItemEmbellishmentService.objects.get_or_create(
                embellishment_detail=embellishment_detail,
                copied_from=source_order_pack_item_service,
                pack_item=destination_order_pack_item,
                service_type=PackItemService.EMBELLISHMENT_SERVICE_TYPE
            )
            if created:
                service.size = source_service_object.size
                service.pack_item_embellishment_attachment = self.make_copy_of_file_attachment(source_service_object.pack_item_embellishment_attachment)
                service.copied_from = source_order_pack_item_service
                service.save()
        else:
            raise Exception("Invalid copy pack item service type. It must be an embellishment service. - create_order_pack_item_embellishment_service")
        return service

    def get_or_create_order_pack_item_service(self, destination_order_pack_item, source_order_pack_item_service):
        if source_order_pack_item_service.service_type == source_order_pack_item_service.WASH_SERVICE_TYPE:
            pack_item_service = self.get_or_create_order_pack_item_wash_service(destination_order_pack_item, source_order_pack_item_service)
        elif source_order_pack_item_service.service_type == source_order_pack_item_service.EMBELLISHMENT_SERVICE_TYPE:
            pack_item_service = self.get_or_create_order_pack_item_embellishment_service(destination_order_pack_item, source_order_pack_item_service)
        else:
            pack_item_service, created = PackItemService.objects.get_or_create(pack_item=destination_order_pack_item, service_type=source_order_pack_item_service.service_type, copied_from=source_order_pack_item_service)
            if created:
                pack_item_service.service_type = source_order_pack_item_service.service_type
                pack_item_service.save()
        return pack_item_service

    def get_or_create_colorway_item_type(self, order_colorway, order_item, copied_from):
        colorway_item_type, created = ColorwayItemType.objects.get_or_create(
            item=order_item,
            colorway=order_colorway
        )
        if created:
            colorway_item_type.colorway_category = copied_from.colorway_category
        colorway_item_type.copied_from = copied_from
        colorway_item_type.save()
        return colorway_item_type

    def get_or_create_colorway_item_operation(self, order_colorway, order_item, version, copied_from_ie_operation):
        colorway_item_category = self.get_or_create_colorway_item_type(order_colorway, order_item, copied_from_ie_operation.colorway_item_category)
        item_cw_operation, created = OrderItemColorwayOperation.objects.get_or_create(colorway_item_category=colorway_item_category, copied_from=copied_from_ie_operation, version=version)

        if created:
            item_cw_operation.display_order = copied_from_ie_operation.display_order
            item_cw_operation.item_variation_operation = copied_from_ie_operation.item_variation_operation
            item_cw_operation.operation_name = copied_from_ie_operation.operation_name
            item_cw_operation.video = copied_from_ie_operation.video
            item_cw_operation.costing_smv = copied_from_ie_operation.costing_smv
            item_cw_operation.factory_smv = copied_from_ie_operation.factory_smv
            item_cw_operation.machine_type = copied_from_ie_operation.machine_type
            item_cw_operation.folder_type = copied_from_ie_operation.folder_type
            item_cw_operation.display_order = copied_from_ie_operation.display_order
            item_cw_operation.save()
        return item_cw_operation

    def create_order_pack_item_dependencies(self, destination_order_pack_item, copied_from_order_pack_item):
        source_placements = copied_from_order_pack_item.orderpackitemplacement_set.all()

        for source_placement in source_placements:
            self.get_or_create_order_pack_item_placement_and_dependencies(destination_order_pack_item, source_placement)

        # Copy Services
        copied_from_order_pack_item_services = copied_from_order_pack_item.get_pack_item_services()
        for copied_from_order_pack_item_service in copied_from_order_pack_item_services:
            self.get_or_create_order_pack_item_service(destination_order_pack_item, copied_from_order_pack_item_service)

        # Copy IE Operations
        copied_from_ie_operations = copied_from_order_pack_item.get_colorway_item_operations()
        for copied_from_ie_operation in copied_from_ie_operations:
            self.get_or_create_colorway_item_operation(destination_order_pack_item.pack.colorway, destination_order_pack_item.item, destination_order_pack_item.pack.version, copied_from_ie_operation)


    ############# Order Pack Placement Related functions #####################
    def get_or_create_order_pack_placement(self, destination_order_pack, copied_from_order_pack_placement):
        destination_version = destination_order_pack.version
        order_placement = self.get_or_create_order_placement(destination_version, copied_from_order_pack_placement.item_attribute_other)

        order_pack_placement, created = OrderPackPlacement.objects.get_or_create(
            order_pack=destination_order_pack,
            item_attribute_other=order_placement
        )
        if created:
            order_pack_placement.placement_name = order_placement.name
            order_pack_placement.copied_from = copied_from_order_pack_placement
        return order_pack_placement

    def get_or_create_order_pack_placement_material(self, order_pack_placement, copied_order_pack_placement_material):
        order_pack_placement_material, created = OrderPackPlacementMaterial.objects.get_or_create(
            placement=order_pack_placement
        )
        if created or order_pack_placement_material.copied_from != copied_order_pack_placement_material:
            order_pack_placement_material.copied_from = copied_order_pack_placement_material
            order_pack_placement_material.material = copied_order_pack_placement_material.material
            order_pack_placement_material.save()
        return order_pack_placement_material

    def get_or_create_order_pack_placement_material_consumption(self, order_pack_placement_material, copied_from_placement_material_consumption):
        order_pack_placement_material_consumption, created = OrderPackPlacementMaterialConsumption.objects.get_or_create(
            pack_placement_material=order_pack_placement_material
        )
        if created or order_pack_placement_material_consumption.copied_from != copied_from_placement_material_consumption:
            order_pack_placement_material_consumption.copied_from = copied_from_placement_material_consumption
            order_pack_placement_material_consumption.costing_consumption_ratio = copied_from_placement_material_consumption.costing_consumption_ratio
            order_pack_placement_material_consumption.wastage = copied_from_placement_material_consumption.wastage
            order_pack_placement_material_consumption.save()
            # TODO - handle attachments
        return order_pack_placement_material_consumption

    def get_or_create_order_pack_placement_and_dependencies(self, destination_order_pack, copied_from_order_pack_placement):
        order_pack_placement = self.get_or_create_order_pack_placement(destination_order_pack, copied_from_order_pack_placement)

        copied_placement_material = copied_from_order_pack_placement.get_placement_material_object()
        if copied_placement_material:
            order_pack_placement_material = self.get_or_create_order_pack_placement_material(order_pack_placement, copied_placement_material)
            copied_from_placement_material_consumption = copied_from_order_pack_placement.get_placement_material_consumption()
            if copied_from_placement_material_consumption:
                source_placement_material_consumption = self.get_or_create_order_pack_placement_material_consumption(order_pack_placement_material, copied_from_placement_material_consumption)
        return order_pack_placement

    def get_or_create_other_cost_type(self, costing_version, copied_from_other_cost):
        other_cost_type, created = OtherCostType.objects.get_or_create(
            version=costing_version,
            other_cost=copied_from_other_cost.other_cost,
            copied_from=copied_from_other_cost
        )
        if created:
            other_cost_type.name = copied_from_other_cost.name
            other_cost_type.save()
        return other_cost_type

    def get_or_create_order_pack_other_cost(self, destination_order_pack, copied_from_other_cost):
        other_cost_type = self.get_or_create_other_cost_type(destination_order_pack.version, copied_from_other_cost.other_cost_type)

        order_other_cost, created = OrderPackOtherCost.objects.get_or_create(
            pack=destination_order_pack,
            other_cost_type=other_cost_type,
            copied_from=copied_from_other_cost
        )

        if created:
            order_other_cost.cost = copied_from_other_cost.cost
            order_other_cost.other_cost_type_name = copied_from_other_cost.other_cost_type_name
            order_other_cost.save()
        return other_cost_type

    def create_order_pack_dependencies(self, destination_order_pack, copied_from_order_pack):
        order_pack_placements = copied_from_order_pack.orderpackplacement_set.all()

        for order_pack_placement in order_pack_placements:
            self.get_or_create_order_pack_placement_and_dependencies(destination_order_pack, order_pack_placement)

        other_costs = copied_from_order_pack.get_other_costs()
        for other_cost in other_costs:
            self.get_or_create_order_pack_other_cost(destination_order_pack, other_cost)


class OrderInquiryCloneHelper(OrderPackAndOrderPackItemCopyMixin): #Create unit test for this

    NEW_PRE_COSTING = 'pre_costing'
    NEW_MARKETING_COSTING = 'marketing_costing'
    #CREATE_BASIC_PRE_COSTING = 'create_basic_pre_costing'
    #EDIT_BASIC_PRE_COSTING = 'edit_basic_pre_costing'
    VERIFY_BASIC_PRE_COSTING = 'verify_basic_pre_costing'

    def __init__(self, source_order_inquiry, source_version=None, destination_order_inquiry=None, destination_version=None, costing_type='marketing_costing', data=None):
        self.source_order_inquiry = source_order_inquiry
        self.source_version = source_version 
        self.costing_type = costing_type
        self.data = data
        self.destination_order_inquiry = destination_order_inquiry
        self.version = destination_version

    def set_costing_version_basic_data(self):
        self.version.fabric_finance_cost_percentage = self.source_version.fabric_finance_cost_percentage
        self.version.trim_finance_cost_percentage = self.source_version.trim_finance_cost_percentage
        self.version.earnings_per_minute = self.source_version.earnings_per_minute
        self.version.buyer_commission_percentage = self.source_version.buyer_commission_percentage
        if self.costing_type == self.NEW_PRE_COSTING:
            self.version.costing_type = OrderCostingVersion.PRE_COSTING
            self.version.marketing_costing = self.source_version
        self.version.save()

    def clone_data(self):
        if self.costing_type == self.NEW_PRE_COSTING or self.costing_type == self.NEW_MARKETING_COSTING:
            self.destination_order_inquiry = self.create_clone_order_inquiry()
            self.create_order_colorways()
            self.create_order_countires()
            self.create_order_sizes()
            self.create_order_items()
            self.create_colorway_item_types()
            self.destination_order_inquiry.copied_from = self.source_order_inquiry
            self.destination_order_inquiry.save()
            self.version = self.destination_order_inquiry.create_version(copied_from=self.source_version)
            self.set_costing_version_basic_data()
            self.verify_packs()
            self.create_order_version_colorway_country()
            #self.verify_order_quantities()
            self.create_order_pack_item_placements()
            # self.create_other_cost()
            # self.create_version_item_colorway_operations()
            self.create_order_costing_colorway_material_supplier_inquiry()
            self.destination_order_inquiry.generate_code()

        # elif self.costing_type == self.CREATE_BASIC_PRE_COSTING:
        #     self.destination_order_inquiry = self.create_clone_order_inquiry()
        #     self.create_order_colorways()
        #     self.create_order_items()
        #     self.create_colorway_item_types()
        #     self.destination_order_inquiry.copied_from = self.source_order_inquiry
        #     self.destination_order_inquiry.save()
        #     self.version = self.destination_order_inquiry.create_version(copied_from=self.source_version)
        #     self.set_costing_version_basic_data()
        #     self.verify_packs()
        #     self.create_order_version_colorway_country()
        #     self.verify_order_quantities()
        #     self.destination_order_inquiry.copied_from = self.source_order_inquiry
        #     self.destination_order_inquiry.save()

        # elif self.costing_type == self.EDIT_BASIC_PRE_COSTING:
        #     self.create_order_colorways()
        #     self.create_order_items()
        #     self.create_colorway_item_types()
        #     self.verify_packs()
        #     self.create_order_version_colorway_country()
        #     self.verify_order_quantities()

        elif self.costing_type == self.VERIFY_BASIC_PRE_COSTING:
            self.create_colorway_item_types()
            self.verify_packs()
            self.create_order_version_colorway_country()
            #self.verify_order_quantities()
            self.create_order_pack_item_placements()
            #self.create_other_cost()
            #self.create_version_item_colorway_operations()
            self.create_order_costing_colorway_material_supplier_inquiry()
            self.destination_order_inquiry.generate_code()
            self.destination_order_inquiry.state = OrderInquiry.GENERAL_INFORMATION_COMPLETE_STATE
            self.destination_order_inquiry.save()
            self.version.version_state = OrderCostingVersion.PENDING_MATERIALS_VERSION_STATE
            self.version.save()
        return self.destination_order_inquiry, self.version
    
    def verify_packs(self):
        order_items = self.version.order.get_order_items()
        order_colorways = self.version.order.get_order_colorways()
        order_countries = self.version.order.get_order_countries()
        order_sizes = self.version.order.get_order_sizes()
        order_size_groups = self.version.order.get_order_size_groups()

        for order_colorway in order_colorways:
            for order_country in order_countries:
                for order_size in order_sizes:
                    source_order_pack = get_object_or_none(OrderPack, 
                        {
                            'version':self.source_version,
                            'size': order_size.copied_from,
                            'colorway': order_colorway.copied_from,
                            'country': order_country.copied_from
                        }
                    )
                    pack = OrderPack.objects.get_or_create(size=order_size, country=order_country, colorway=order_colorway, version=self.version)[0]  # TODO major precosting -  is copied from being set correctly?
                    pack.copied_from = source_order_pack
                    if source_order_pack and self.version == OrderCostingVersion.PRE_COSTING:
                        pack.cad_quantity = source_order_pack.cad_quantity
                    pack.save()
                    for order_item in order_items:
                        source_order_pack_item = get_object_or_none(OrderPackItem,
                            {
                                'pack': source_order_pack,
                                'item': order_item.copied_from
                            }
                        )
                        order_pack_item, created = OrderPackItem.objects.get_or_create(pack=pack, item=order_item)
                        order_pack_item.copied_from = source_order_pack_item
                        order_pack_item.save()
                for order_size_group in order_size_groups:
                    pack = OrderPackSizeGroup.objects.get_or_create(size_group=order_size_group, country=order_country, colorway=order_colorway, version=self.version)[0]

    def verify_order_quantities(self):

        if self.data:
            for row in self.data:
                source_order_country = get_object_or_404(OrderCountry, pk=row['country_id'])
                order_country = OrderCountry.objects.get(order=self.destination_order_inquiry, country=source_order_country.country, copied_from=source_order_country)
                for colorway_row in row['colorways']:
                    total_colorway_country_quantity = 0
                    source_order_colorway = get_object_or_404(OrderColorway, pk=colorway_row['marketing_costing_colorway_id'])
                    order_colorway = OrderColorway.objects.get(order=self.destination_order_inquiry, colorway=colorway_row['name'], copied_from=source_order_colorway)
                    order_version_colorway_country = OrderVersionColorwayCountry.objects.get(version=self.version, colorway=order_colorway, country=order_country)

                    for size_row in colorway_row['sizes']:
                        source_order_size = get_object_or_404(OrderSize, pk=size_row['id'])
                        order_size = OrderSize.objects.get(order=self.destination_order_inquiry, size=source_order_size.size, copied_from=source_order_size)
                        order_pack = OrderPack.objects.get(country=order_country, colorway=order_colorway, size=order_size)
                        order_pack.cad_quantity = size_row['quantity']
                        order_pack.save()
                        total_colorway_country_quantity += size_row['quantity']
                    order_version_colorway_country.estimated_quantity = total_colorway_country_quantity
                    order_version_colorway_country.save()

    def copy_instance(self, instance):
        model_class = instance.__class__
        field_data = {}

        for field in model_class._meta.get_fields():
            if field.concrete and not field.auto_created:
                field_name = field.name
                if field_name != 'id' and field_name != 'items':
                    field_data[field_name] = getattr(instance, field_name)
        new_instance = model_class.objects.create(**field_data)
        return new_instance

    def create_clone_order_inquiry(self):
        today = date.today()
        order_inquiry = OrderInquiry.objects.create(
            date=today,
            customer=self.source_order_inquiry.customer,
            brand=self.source_order_inquiry.brand,
            season=self.source_order_inquiry.season,
            year=self.source_order_inquiry.year,
            pack_type=self.source_order_inquiry.pack_type,
            costing_method=self.source_order_inquiry.costing_method,
            size_category=self.source_order_inquiry.size_category,
            number_of_colorways=self.source_order_inquiry.number_of_colorways,
            quantity_per_pack=self.source_order_inquiry.quantity_per_pack,
            style_number=self.source_order_inquiry.style_number,
            style_description=self.source_order_inquiry.style_description,
            merchant=self.source_order_inquiry.merchant,
            state=OrderInquiry.OPEN_STATE,
            pattern_type=self.source_order_inquiry.pattern_type,
            department=self.source_order_inquiry.department
        )
        # if self.costing_type == self.CREATE_BASIC_PRE_COSTING or self.costing_type == self.EDIT_BASIC_PRE_COSTING:
        #     order_inquiry.state = OrderInquiry.OPEN_PRE_COSTING_STATE
        if self.costing_type == self.NEW_PRE_COSTING or self.costing_type == self.NEW_MARKETING_COSTING:
            order_inquiry.state = OrderInquiry.GENERAL_INFORMATION_COMPLETE_STATE
        order_inquiry.save()
        return order_inquiry

    def create_order_countires(self):
        source_order_countries = self.source_order_inquiry.get_order_countries()
        country_ids = []

        for source_order_country in source_order_countries:
            order_country, created = OrderCountry.objects.get_or_create(order=self.destination_order_inquiry, country_id=source_order_country.country_id)
            order_country.copied_from = source_order_country
            order_country.save()
            country_ids.append(order_country.country_id)
    
    def create_order_sizes(self):
        source_order_sizes = self.source_order_inquiry.get_order_sizes()
        size_ids = []

        for source_order_size in source_order_sizes:
            order_size, created = OrderSize.objects.get_or_create(order=self.destination_order_inquiry, size_id=source_order_size.size.id)
            order_size.copied_from = source_order_size
            order_size.save()
            size_ids.append(order_size.size.id)

        for source_size_group in self.source_order_inquiry.get_order_size_groups():
            size_group, created = OrderSizeGroup.objects.get_or_create(
                order=self.destination_order_inquiry,
                copied_from=source_size_group
            )
            source_sizes = source_size_group.get_sizes()
            for source_size in source_sizes:
                order_size = self.destination_order_inquiry.get_order_sizes().filter(size_id=source_size.size.id)[0]
                size_group.sizes.add(order_size)

    def create_order_items(self):
        source_order_items = self.source_order_inquiry.get_order_items()

        for source_order_item in source_order_items:
            order_item, created = OrderItem.objects.get_or_create(order=self.destination_order_inquiry, item_id=source_order_item.item.id, item_identifier=source_order_item.item_identifier)
            order_item.copied_from = source_order_item
            order_item.save()

    def create_order_colorways(self):

        # if self.data:
        #     for row in self.data:
        #         source_order_country = get_object_or_404(OrderCountry, pk=row['country_id'])
        #         order_country, created = OrderCountry.objects.get_or_create(order=self.destination_order_inquiry, country=source_order_country.country, copied_from=source_order_country)
        #         for colorway_row in row['colorways']:
        #             source_order_colorway = get_object_or_404(OrderColorway, pk=colorway_row['marketing_costing_colorway_id'])
        #             order_colorway, created = OrderColorway.objects.get_or_create(order=self.destination_order_inquiry, colorway=colorway_row['name'], copied_from=source_order_colorway)
        #             for size_row in colorway_row['sizes']:
        #                 source_order_size = get_object_or_404(OrderSize, pk=size_row['id'])
        #                 order_size, created = OrderSize.objects.get_or_create(order=self.destination_order_inquiry, size=source_order_size.size, copied_from=source_order_size)
            
        #     for source_size_group in self.source_order_inquiry.get_order_size_groups():
        #         size_group, created = OrderSizeGroup.objects.get_or_create(
        #             order=self.destination_order_inquiry,
        #             copied_from=source_size_group
        #         )
        #         source_sizes = source_size_group.get_sizes()
        #         for source_size in source_sizes:
        #             order_sizes = self.destination_order_inquiry.get_order_sizes().filter(copied_from=source_size)
        #             for order_size in order_sizes:
        #                 size_group.sizes.add(order_size)
        # else:
        source_order_colorways = self.source_order_inquiry.get_order_colorways()
        for source_order_colorway in source_order_colorways:
            order_colorway, created = OrderColorway.objects.get_or_create(order=self.destination_order_inquiry, colorway=source_order_colorway.colorway)
            order_colorway.copied_from = source_order_colorway
            order_colorway.save()

    def create_order_version_colorway_country(self):
        source_order_version_colorway_countries = self.source_version.orderversioncolorwaycountry_set.all()
        order_colorways = self.destination_order_inquiry.get_order_colorways()
        order_counries = self.destination_order_inquiry.get_order_countries()

        for order_clorway in order_colorways:
            for order_country in order_counries:
                source_order_version_colorway_country = get_object_or_none(OrderVersionColorwayCountry, 
                    {
                        'version': self.source_version,
                        'colorway': order_clorway.copied_from,
                        'country': order_country.copied_from
                    }
                )
                order_version_colorway_country, created = OrderVersionColorwayCountry.objects.get_or_create(
                    version=self.version,
                    colorway=order_clorway,
                    country=order_country
                )
                if self.version.costing_type == OrderCostingVersion.MARKETING_COSTING:
                    order_version_colorway_country.estimated_quantity = source_order_version_colorway_country.estimated_quantity
                order_version_colorway_country.copied_from = source_order_version_colorway_country
                order_version_colorway_country.save()

    def create_colorway_item_types(self):
        source_colorway_item_types = ColorwayItemType.objects.filter(colorway__order=self.source_order_inquiry, item__order=self.source_order_inquiry)
        order_items = self.destination_order_inquiry.get_order_items()
        order_colorways = self.destination_order_inquiry.get_order_colorways()

        for order_item in order_items:
            for order_colorway in order_colorways:
                if order_item.item_identifier:
                    source_colorway_item_type = source_colorway_item_types.filter(item__item=order_item.item, colorway__colorway=order_colorway.copied_from.colorway, item__item_identifier=order_item.item_identifier)[0]
                    colorway_item_type, created = ColorwayItemType.objects.get_or_create(
                        item=order_item,
                        colorway=order_colorway,
                        colorway_category=source_colorway_item_type.colorway_category
                    )
                    colorway_item_type.copied_from = source_colorway_item_type
                    colorway_item_type.save()

    def create_other_cost(self):
        source_other_cost_types = self.source_version.othercosttype_set.all()
        order_packs = self.version.get_order_version_packs()
        for source_other_cost_type in source_other_cost_types:
            other_cost_type, created = OtherCostType.objects.get_or_create(
                version=self.version,
                name=source_other_cost_type.name,
                other_cost=source_other_cost_type.other_cost
            )
            other_cost_type.copied_from = source_other_cost_type
            other_cost_type.save()

            source_order_pack_other_costs = source_other_cost_type.orderpackothercost_set.all()
            for source_order_pack_other_cost in source_order_pack_other_costs:
                order_packs = self.version.get_order_version_packs().filter(
                    country__copied_from=source_order_pack_other_cost.pack.country,
                    colorway__copied_from=source_order_pack_other_cost.pack.colorway,
                    size__copied_from=source_order_pack_other_cost.pack.size
                )
                for order_pack in order_packs:
                    order_pack_other_cost, created = OrderPackOtherCost.objects.get_or_create(
                        pack=order_pack,
                        other_cost_type=other_cost_type,
                        cost=source_order_pack_other_cost.cost,
                        other_cost_type_name=source_order_pack_other_cost.other_cost_type_name
                    )
                    order_pack_other_cost.copied_from = source_order_pack_other_cost
                    order_pack_other_cost.save()

    def create_version_item_colorway_operations(self):
        order_colorways = self.destination_order_inquiry.get_order_colorways()
        for order_colorway in order_colorways:
            colorway_item_types = order_colorway.colorwayitemtype_set.all()
            for colorway_item_type in colorway_item_types:
                source_order_item_colorway_operations = self.source_version.orderitemcolorwayoperation_set.filter(
                    colorway_item_category__colorway__colorway=colorway_item_type.colorway.copied_from.colorway
                )
                for source_order_item_colorway_operation in source_order_item_colorway_operations:
                    order_item_colorway_operation, created = OrderItemColorwayOperation.objects.get_or_create(
                        colorway_item_category=colorway_item_type,
                        item_variation_operation=source_order_item_colorway_operation.item_variation_operation,
                        version=self.version
                    )
                    order_item_colorway_operation.operation_name = source_order_item_colorway_operation.operation_name
                    order_item_colorway_operation.video = source_order_item_colorway_operation.video
                    order_item_colorway_operation.costing_smv = source_order_item_colorway_operation.costing_smv
                    order_item_colorway_operation.factory_smv = source_order_item_colorway_operation.factory_smv
                    order_item_colorway_operation.machine_type = source_order_item_colorway_operation.machine_type
                    order_item_colorway_operation.folder_type = source_order_item_colorway_operation.folder_type
                    order_item_colorway_operation.display_order = source_order_item_colorway_operation.display_order
                    order_item_colorway_operation.copied_from = source_order_item_colorway_operation
                    order_item_colorway_operation.save()

    def create_order_pack_item_placements(self):
        if self.source_version:
            order_pack_items = self.version.get_order_pack_items()
            order_packs = self.version.get_order_version_packs()
            for order_pack_item in order_pack_items:
                self.create_order_pack_item_dependencies(order_pack_item, order_pack_item.copied_from)

            for order_pack in order_packs:
                self.create_order_pack_dependencies(order_pack, order_pack.copied_from)

            # for source_order_placement in source_order_placements:
            #     order_placement = OrderPlacement.objects.create(item=source_order_placement.item, version=self.version)
            #     order_placement.name = source_order_placement.name
            #     order_placement.type = source_order_placement.type
            #     order_placement.assign_type = source_order_placement.assign_type
            #     order_placement.material = source_order_placement.material
            #     order_placement.item_attribute = source_order_placement.item_attribute
            #     order_placement.estimated_consumption_ratio = source_order_placement.estimated_consumption_ratio
            #     order_placement.estimated_consumption_ratio_units = source_order_placement.estimated_consumption_ratio_units
            #     order_placement.copied_from = source_order_placement
            #     order_placement.save()
            #
            #      #Create OrderPackItemPlamcenent Related Objects
            #     if order_placement.assign_type == ItemAttribute.ORDER_PACK_ITEM:
            #         source_order_pack_item_placements = source_order_placement.orderpackitemplacement_set.all()
            #         for source_order_pack_item_placement in source_order_pack_item_placements:
            #             order_pack_items = self.version.get_order_pack_items().filter(
            #                 item__item=source_order_pack_item_placement.order_pack_item.item.item,
            #                 pack__country__copied_from=source_order_pack_item_placement.order_pack_item.pack.country,
            #                 pack__colorway__copied_from=source_order_pack_item_placement.order_pack_item.pack.colorway,
            #                 pack__size__copied_from=source_order_pack_item_placement.order_pack_item.pack.size,
            #                 item__item_identifier=source_order_pack_item_placement.order_pack_item.item.item_identifier
            #             )
            #             for order_pack_item in order_pack_items:
            #                 # Create OrderPackItemPlacements and PlacementPattern
            #                 print(order_placement, order_placement.item_attribute, order_placement.name)
            #                 order_pack_item_placement, created = OrderPackItemPlacement.objects.get_or_create(order_pack_item=order_pack_item, item_attribute_other=order_placement, placement_name=order_placement.item_attribute.placement)
            #                 order_pack_item_placement.copied_from = source_order_pack_item_placement
            #                 order_pack_item_placement.save()
            #                 if hasattr(source_order_pack_item_placement, 'orderpackitemplacementpattern'):
            #                     source_order_pack_item_placement_pattern = source_order_pack_item_placement.orderpackitemplacementpattern
            #                     orderpackitemplacementpattern, created = OrderPackItemPlacementPattern.objects.get_or_create(
            #                         order_pack_item_placement=order_pack_item_placement
            #                     )
            #                     orderpackitemplacementpattern.pattern_url=source_order_pack_item_placement_pattern.pattern_url
            #                     orderpackitemplacementpattern.save()
            #
            #                 # Create OrderPackItemPlacementMaterial
            #                 source_order_pack_item_placement_material = source_order_pack_item_placement.orderpackitemplacementmaterial
            #                 order_pack_item_placement_material, created = OrderPackItemPlacementMaterial.objects.get_or_create(placement=order_pack_item_placement)
            #                 order_pack_item_placement_material.material = source_order_pack_item_placement_material.material
            #                 order_pack_item_placement_material.copied_from = source_order_pack_item_placement_material
            #                 order_pack_item_placement_material.save()
            #
            #                 # Create OrderPackItemPlacementMaterialConsumption
            #                 if hasattr(source_order_pack_item_placement_material, 'orderpackitemplacementmaterialconsumption'):
            #                     source_order_pack_item_placement_material_consumption = source_order_pack_item_placement_material.orderpackitemplacementmaterialconsumption
            #                     order_pack_item_placement_material_consumption, created = OrderPackItemPlacementMaterialConsumption.objects.get_or_create(pack_item_placement_material=order_pack_item_placement_material)
            #                     order_pack_item_placement_material_consumption.costing_consumption_ratio = source_order_pack_item_placement_material_consumption.costing_consumption_ratio
            #                     order_pack_item_placement_material_consumption.wastage = source_order_pack_item_placement_material_consumption.wastage
            #                     #order_pack_item_placement_material_consumption.attachments = source_order_pack_item_placement_material_consumption.attachments
            #                     order_pack_item_placement_material_consumption.copied_from = source_order_pack_item_placement_material_consumption
            #                     order_pack_item_placement_material_consumption.save()
            #
            #     else:
            #         # Create OrderPackPlacement Related Object
            #         source_order_pack_placements = source_order_placement.orderpackplacement_set.all()
            #
            #         for source_order_pack_placement in source_order_pack_placements:
            #             order_packs = self.version.get_order_version_packs().filter(
            #                 country__copied_from=source_order_pack_placement.order_pack.country,
            #                 colorway__copied_from=source_order_pack_placement.order_pack.colorway,
            #                 size__copied_from=source_order_pack_placement.order_pack.size
            #             )
            #             for order_pack in order_packs:
            #                 order_pack_placement, created = OrderPackPlacement.objects.get_or_create(order_pack=order_pack, item_attribute_other=order_placement, placement_name=source_order_pack_placement.item_attribute_other.name)
            #                 order_pack_placement.copied_from = source_order_pack_placement
            #                 order_pack_placement.save()
            #
            #                 # Create OrderPackPlacementMaterial
            #                 source_order_pack_placement_material = source_order_pack_placement.orderpackplacementmaterial
            #                 order_pack_placement_material, created = OrderPackPlacementMaterial.objects.get_or_create(placement=order_pack_placement)
            #                 order_pack_placement_material.material = source_order_pack_placement_material.material
            #                 order_pack_placement_material.copied_from = source_order_pack_placement_material
            #                 order_pack_placement_material.save()
            #
            #                 # Create OrderPackPlacementMaterialConsumption
            #                 source_order_pack_placement_material_consumption = source_order_pack_placement_material.orderpackplacementmaterialconsumption
            #                 order_pack_placement_material_consumption, created = OrderPackPlacementMaterialConsumption.objects.get_or_create(pack_placement_material=order_pack_placement_material)
            #                 order_pack_placement_material_consumption.costing_consumption_ratio = source_order_pack_placement_material_consumption.costing_consumption_ratio
            #                 order_pack_placement_material_consumption.wastage = source_order_pack_placement_material_consumption.wastage
            #                 #order_pack_placement_material_consumption.attachments = source_order_pack_placement_material_consumption.attachments
            #                 order_pack_placement_material_consumption.copied_from = source_order_pack_placement_material_consumption
            #                 order_pack_placement_material_consumption.save()

    # Create Fabric Consumption Part 1
    def create_item_country_cw_cwy_category_size_group_fabric_consumption_ratios(self, source_supplier_inquiry_detail, supplier_inquiry, supplier_inquiry_detail):
            source_item_country_cw_cwy_category_size_group_fabric_consumption_ratios = source_supplier_inquiry_detail.itemcountrycwcwycategorysizegroupfabricconsumptionratio_set.all()
            for source_item_country_cw_cwy_category_size_group_fabric_consumption_ratio in source_item_country_cw_cwy_category_size_group_fabric_consumption_ratios:
                order_colorways = self.destination_order_inquiry.get_order_colorways().filter(copied_from=source_item_country_cw_cwy_category_size_group_fabric_consumption_ratio.order_colorway)
                source_sizes = source_item_country_cw_cwy_category_size_group_fabric_consumption_ratio.order_size_group.sizes.all()
                matching_groups = self.destination_order_inquiry.get_order_size_groups().filter(
                    sizes__size__in=source_sizes.values_list('size', flat=True)
                ).distinct()
                size_group = matching_groups.first()
                order_countries = self.destination_order_inquiry.get_order_countries().filter(copied_from=source_item_country_cw_cwy_category_size_group_fabric_consumption_ratio.order_country)
                for order_colorway in order_colorways:
                    for order_country in order_countries:
                        item_country_cw_cwy_category_size_group_fabric_consumption_ratio, created = ItemCountryCwCwyCategorySizeGroupFabricConsumptionRatio.objects.get_or_create(
                            order_size_group=size_group,
                            order_country=order_country,
                            order_colorway=order_colorway,
                            colorway_category_id=source_item_country_cw_cwy_category_size_group_fabric_consumption_ratio.colorway_category_id,
                            item_id=source_item_country_cw_cwy_category_size_group_fabric_consumption_ratio.item_id,
                            version=self.version,
                            customer_brand_fabric=supplier_inquiry.customer_brand_material,
                            supplier_inquiry_detail=supplier_inquiry_detail
                        )
                        item_country_cw_cwy_category_size_group_fabric_consumption_ratio.costing_consumption_ratio = source_item_country_cw_cwy_category_size_group_fabric_consumption_ratio.costing_consumption_ratio
                        item_country_cw_cwy_category_size_group_fabric_consumption_ratio.wastage = source_item_country_cw_cwy_category_size_group_fabric_consumption_ratio.wastage
                        item_country_cw_cwy_category_size_group_fabric_consumption_ratio.copied_from = source_item_country_cw_cwy_category_size_group_fabric_consumption_ratio
                        item_country_cw_cwy_category_size_group_fabric_consumption_ratio.save()

    # Create Fabric Consumption Part 2
    def create_item_colorway_colorway_category_fabric_consumption_ratio(self, source_supplier_inquiry_detail, supplier_inquiry, supplier_inquiry_detail):
        source_item_colorway_colorway_category_fabric_consumption_ratios = source_supplier_inquiry_detail.itemcolorwaycolorwaycategoryfabricconsumptionratio_set.all()
        for source_item_colorway_colorway_category_fabric_consumption_ratio in source_item_colorway_colorway_category_fabric_consumption_ratios:
            order_colorways = self.destination_order_inquiry.get_order_colorways().filter(copied_from=source_item_colorway_colorway_category_fabric_consumption_ratio.order_colorway)
            for order_colorway in order_colorways:
                item_colorway_colorway_category_fabric_consumption_ratio, created = ItemColorwayColorwayCategoryFabricConsumptionRatio.objects.get_or_create(
                    order_colorway=order_colorway,
                    colorway_category_id=source_item_colorway_colorway_category_fabric_consumption_ratio.colorway_category_id,
                    item_id=source_item_colorway_colorway_category_fabric_consumption_ratio.item_id,
                    version=self.version,
                    customer_brand_fabric=supplier_inquiry.customer_brand_material,
                    supplier_inquiry_detail=supplier_inquiry_detail
                )
                item_colorway_colorway_category_fabric_consumption_ratio.costing_consumption_ratio = source_item_colorway_colorway_category_fabric_consumption_ratio.costing_consumption_ratio
                item_colorway_colorway_category_fabric_consumption_ratio.wastage = source_item_colorway_colorway_category_fabric_consumption_ratio.wastage
                item_colorway_colorway_category_fabric_consumption_ratio.copied_from = source_item_colorway_colorway_category_fabric_consumption_ratio
                item_colorway_colorway_category_fabric_consumption_ratio.save()

    # Create Fabric Consumption Part 3
    def create_item_colorway_category_fabric_consumption_ratio(self, source_supplier_inquiry_detail, supplier_inquiry, supplier_inquiry_detail):
        source_item_colorway_category_fabric_consumption_ratios = source_supplier_inquiry_detail.itemcolorwaycategoryfabricconsumptionratio_set.all()
        for source_item_colorway_category_fabric_consumption_ratio in source_item_colorway_category_fabric_consumption_ratios:
            item_colorway_category_fabric_consumption_ratio, created = ItemColorwayCategoryFabricConsumptionRatio.objects.get_or_create(
                colorway_category_id=source_item_colorway_category_fabric_consumption_ratio.colorway_category_id,
                item_id=source_item_colorway_category_fabric_consumption_ratio.item_id,
                version=self.version,
                customer_brand_fabric=supplier_inquiry.customer_brand_material,
                supplier_inquiry_detail=supplier_inquiry_detail
            )
            item_colorway_category_fabric_consumption_ratio.costing_consumption_ratio = source_item_colorway_category_fabric_consumption_ratio.costing_consumption_ratio
            item_colorway_category_fabric_consumption_ratio.wastage = source_item_colorway_category_fabric_consumption_ratio.wastage
            item_colorway_category_fabric_consumption_ratio.copied_from = source_item_colorway_category_fabric_consumption_ratio
            item_colorway_category_fabric_consumption_ratio.save()

    def create_order_costing_colorway_material_supplier_inquiry(self):
        source_order_costing_colorway_merial_supplier_inquiries = self.source_version.ordercostingcolorwaymaterialsupplierinquiry_set.all()
        for source_order_costing_colorway_merial_supplier_inquiry in source_order_costing_colorway_merial_supplier_inquiries:
            source_supplier_inquiry_detail = source_order_costing_colorway_merial_supplier_inquiry.supplier_inquiry_detail
            source_supplier_inquiry = source_order_costing_colorway_merial_supplier_inquiry.supplier_inquiry_detail.supplier_inquiry

            supplier_inquiry, created = SupplierInquiry.objects.get_or_create(
                hash_id=source_supplier_inquiry.hash_id,
                version=self.version,
                customer_brand_material=source_supplier_inquiry.customer_brand_material,
                item_service=source_supplier_inquiry.item_service,
                supplier=source_supplier_inquiry.supplier,
                has_supplier_feedback=source_supplier_inquiry.has_supplier_feedback,
                email_status=SupplierInquiry.PENDING_EMAIL
            )
            supplier_inquiry.copied_from = source_supplier_inquiry
            supplier_inquiry.save()

            supplier_inquiry_detail, created = SupplierInquiryDetail.objects.get_or_create(
                supplier_inquiry=supplier_inquiry,
                cutting_width=source_supplier_inquiry_detail.cutting_width,
                cutting_width_unit=source_supplier_inquiry_detail.cutting_width_unit,
                selected=source_supplier_inquiry_detail.selected,
                costing_unit=source_supplier_inquiry_detail.costing_unit,
                cost_per_unit=source_supplier_inquiry_detail.cost_per_unit,
                fob_price=source_supplier_inquiry_detail.fob_price,
                cif_price=source_supplier_inquiry_detail.cif_price,
                transport_charges=source_supplier_inquiry_detail.transport_charges,
                ex_work_price=source_supplier_inquiry_detail.ex_work_price,
                expiration_date=source_supplier_inquiry_detail.expiration_date,
                completed=source_supplier_inquiry_detail.completed,
                lead_time=source_supplier_inquiry_detail.lead_time,
                minimum_order_quantity=source_supplier_inquiry_detail.minimum_order_quantity,
                minimum_order_quantity_units=source_supplier_inquiry_detail.minimum_order_quantity_units,
                supplier_inquiry_material_code=source_supplier_inquiry_detail.supplier_inquiry_material_code,
                excess_threshold=source_supplier_inquiry_detail.excess_threshold,
                pay_mode=source_supplier_inquiry_detail.pay_mode,
                cost_per_unit_type=source_supplier_inquiry_detail.cost_per_unit_type,
            )
            supplier_inquiry_detail.copied_from = source_supplier_inquiry_detail
            supplier_inquiry_detail.save()

            if supplier_inquiry.customer_brand_material:
                source_colorway = source_order_costing_colorway_merial_supplier_inquiry.colorway
                order_colorways = self.destination_order_inquiry.get_order_colorways().filter(copied_from=source_colorway)
                for order_colorway in order_colorways:
                    order_costing_colorway_merial_supplier_inquiry, created = OrderCostingColorwayMaterialSupplierInquiry.objects.get_or_create(
                        order_costing_version=self.version,
                        customer_brand_material=supplier_inquiry.customer_brand_material,
                        colorway=order_colorway,
                        supplier_inquiry_detail=supplier_inquiry_detail
                    )
                    order_costing_colorway_merial_supplier_inquiry.copied_from = order_costing_colorway_merial_supplier_inquiry
                    order_costing_colorway_merial_supplier_inquiry.save()

                self.create_item_country_cw_cwy_category_size_group_fabric_consumption_ratios(source_supplier_inquiry_detail, supplier_inquiry, supplier_inquiry_detail)
                self.create_item_colorway_colorway_category_fabric_consumption_ratio(source_supplier_inquiry_detail, supplier_inquiry, supplier_inquiry_detail)
                self.create_item_colorway_category_fabric_consumption_ratio(source_supplier_inquiry_detail, supplier_inquiry, supplier_inquiry_detail)


        source_order_costing_service_supplier_inquiries = self.source_version.ordercostingservicesupplierinquiry_set.all()
        for source_order_costing_service_supplier_inquiry in source_order_costing_service_supplier_inquiries:
            source_supplier_inquiry_detail = source_order_costing_service_supplier_inquiry.supplier_inquiry_detail
            source_supplier_inquiry = source_order_costing_service_supplier_inquiry.supplier_inquiry_detail.supplier_inquiry

            item_services = PackItemService.objects.filter(copied_from=source_supplier_inquiry.item_service)

            for item_service in item_services:
                supplier_inquiry, created = SupplierInquiry.objects.get_or_create(
                    hash_id=source_supplier_inquiry.hash_id,
                    version=self.version,
                    customer_brand_material=source_supplier_inquiry.customer_brand_material,
                    item_service=item_service,
                    supplier=source_supplier_inquiry.supplier,
                    has_supplier_feedback=source_supplier_inquiry.has_supplier_feedback,
                    email_status=SupplierInquiry.PENDING_EMAIL
                )
                supplier_inquiry.copied_from = source_supplier_inquiry
                supplier_inquiry.save()

                supplier_inquiry_detail, created = SupplierInquiryDetail.objects.get_or_create(
                    supplier_inquiry=supplier_inquiry,
                    cutting_width=source_supplier_inquiry_detail.cutting_width,
                    cutting_width_unit=source_supplier_inquiry_detail.cutting_width_unit,
                    selected=source_supplier_inquiry_detail.selected,
                    costing_unit=source_supplier_inquiry_detail.costing_unit,
                    cost_per_unit=source_supplier_inquiry_detail.cost_per_unit,
                    fob_price=source_supplier_inquiry_detail.fob_price,
                    cif_price=source_supplier_inquiry_detail.cif_price,
                    transport_charges=source_supplier_inquiry_detail.transport_charges,
                    ex_work_price=source_supplier_inquiry_detail.ex_work_price,
                    expiration_date=source_supplier_inquiry_detail.expiration_date,
                    completed=source_supplier_inquiry_detail.completed,
                    lead_time=source_supplier_inquiry_detail.lead_time,
                    minimum_order_quantity=source_supplier_inquiry_detail.minimum_order_quantity,
                    minimum_order_quantity_units=source_supplier_inquiry_detail.minimum_order_quantity_units,
                    supplier_inquiry_material_code=source_supplier_inquiry_detail.supplier_inquiry_material_code,
                    excess_threshold=source_supplier_inquiry_detail.excess_threshold,
                    pay_mode=source_supplier_inquiry_detail.pay_mode,
                    cost_per_unit_type=source_supplier_inquiry_detail.cost_per_unit_type,
                )
                supplier_inquiry_detail.copied_from = source_supplier_inquiry_detail
                supplier_inquiry_detail.save()

                if supplier_inquiry.item_service:
                        order_costing_service_supplier_inquiry, created = OrderCostingServiceSupplierInquiry.objects.get_or_create(
                            order_costing_version=self.version,
                            item_service=item_service,
                            supplier_inquiry_detail=supplier_inquiry_detail
                        )
                        order_costing_service_supplier_inquiry.copied_from = source_order_costing_service_supplier_inquiry
                        order_costing_service_supplier_inquiry.save()

# OrderPackItemPlacementPattern - OK
# OrderPackItemPlacementMaterial - OK
# OrderPackPlacementMaterial - OK
# OrderPackItemPlacementMaterialConsumption - OK
# OrderPackPlacementMaterialConsumption - OK
# PackItemFabricConsumptionRatio - OK
# ItemCountryCwCwyCategorySizeGroupFabricConsumptionRatio - OK
# ItemColorwayColorwayCategoryFabricConsumptionRatio - OK
# ItemColorwayCategoryFabricConsumptionRatio - OK
# ItemColorwayCategoryFabricConsumptionComplete - OK
# ItemColorwayTypeFabricConsumptionComplete - OK
# OrderCostingColorwayMaterialSupplierInquiry - OK
# OrderCostingServiceSupplierInquiry
# OtherCostType - OK
# OrderPackOtherCost - OK
# PackItemService - Ok
# PackItemWashService - OK  
# EmbellishmentServiceDetail - OK
# PackItemEmbellishmentService - OK