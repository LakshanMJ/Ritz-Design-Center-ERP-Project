from marketing.models import OrderPackItemPlacement, OrderPackItemPlacementMaterial, POCountryColorwayItemPlacement, \
    OrderPackPlacementMaterial, POCountryColorwayPlacement


class POPackItemColorwayCountryPlacementBuilder:

    def __init__(self, purchase_order):
        self.purchase_order = purchase_order

    def get_placements(self, pack_items):
        placements = OrderPackItemPlacementMaterial.objects.filter(placement__order_pack_item__in=pack_items)

        unique_placements = placements.values('placement__item_attribute_other_id', 'material_id').distinct()

        data = []
        for unique_placement in unique_placements:
            data.append(
                {
                    'item_attribute_other_id': unique_placement.get('placement__item_attribute_other_id', None),
                    'costing_material_id': unique_placement.get('material_id')
                }
            )
        return data

    def create_country_colorway_item_placements(self, po_country, po_colorway, po_item, placements):
        for placement in placements:
            POCountryColorwayItemPlacement.objects.get_or_create(
                purchase_order=self.purchase_order,
                po_country=po_country,
                po_colorway=po_colorway,
                po_item=po_item,
                **placement
            )

    def create_colorway_country_item_placement_data(self):
        purchase_order = self.purchase_order
        order_version = purchase_order.costing_version
        order_pack_items = order_version.get_order_pack_items()
        po_countries = purchase_order.get_po_countries()
        po_colorways = purchase_order.get_po_colorways()
        po_items = purchase_order.get_po_items()

        for po_colorway in po_colorways:
            for po_country in po_countries:
                for po_item in po_items:
                    matching_order_pack_items = order_pack_items.filter(
                        pack__colorway=po_colorway.order_colorway,
                        pack__country=po_country.order_country,
                        item=po_item.order_item
                    )

                    unique_placements = self.get_placements(matching_order_pack_items)
                    self.create_country_colorway_item_placements(po_country, po_colorway, po_item, unique_placements)


class POPackColorwayCountryPlacementBuilder:

    def __init__(self, purchase_order):
        self.purchase_order = purchase_order

    def get_placements(self, packs):
        placements = OrderPackPlacementMaterial.objects.filter(placement__order_pack__in=packs)
        unique_placements = placements.values('placement__item_attribute_other_id', 'material_id').distinct()

        data = []
        for unique_placement in unique_placements:
            data.append(
                {
                    'item_attribute_other_id': unique_placement.get('placement__item_attribute_other_id', None),
                    'costing_material_id': unique_placement.get('material_id')
                }
            )
        return data

    def create_country_colorway_placements(self, po_country, po_colorway, placements):
        for placement in placements:
            POCountryColorwayPlacement.objects.get_or_create(
                purchase_order=self.purchase_order,
                po_country=po_country,
                po_colorway=po_colorway,
                **placement
            )

    def create_colorway_country_placement_data(self):
        purchase_order = self.purchase_order
        order_version = purchase_order.costing_version
        order_packs = order_version.get_order_version_packs()
        po_countries = purchase_order.get_po_countries()
        po_colorways = purchase_order.get_po_colorways()

        for po_colorway in po_colorways:
            for po_country in po_countries:
                    matching_order_packs = order_packs.filter(
                        colorway=po_colorway.order_colorway,
                        country=po_country.order_country,
                    )

                    unique_placements = self.get_placements(matching_order_packs)
                    self.create_country_colorway_placements(po_country, po_colorway, unique_placements)
