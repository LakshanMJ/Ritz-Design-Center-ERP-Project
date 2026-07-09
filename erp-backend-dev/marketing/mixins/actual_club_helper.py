from marketing.models import POPackItem, POPackItemPlacement, OrderPlacement, POFabricMarkerPlacement
from marketing.serializers import OrderPackItemOtherPlacementSerializer


class ActualClubPlacementHelper:

    def __init__(self, po_fabric_marker):
        self.po_fabric_marker = po_fabric_marker

    def get_marker_placements(self):
        marker_placements = self.po_fabric_marker.pofabricmarkerplacement_set.all()
        return marker_placements

    def get_unique_placements(self, marker_placement_ids):
        placements = OrderPlacement.objects.filter(pk__in=marker_placement_ids)

        data = []
        for placement in placements:
            data.append({
                'id': placement.pk,
                'name': placement.name
            })
        return placements, data

    def get_related_markers(self):
        placements = self.get_marker_placements()

        related_marker_ids = []
        for placement in placements:
            marker_ids = list(placement.related_marker_placements.all().values_list('marker_id', flat=True))
            related_marker_ids = list(set([*related_marker_ids, *marker_ids]))
        return related_marker_ids

    def organize_data(self):
        marker_placements = self.get_marker_placements()
        data = {}
        placement_ids = []
        POFabricMarkerPlacement
        for marker_placement in marker_placements:
            po_pack_item = marker_placement.placement.po_pack_item
            po_pack = po_pack_item.po_pack
            order_placement = marker_placement.placement.costing_pack_item_placement.item_attribute_other
            po_display_name = po_pack.purchase_order.get_purchase_order_display_name()

            if order_placement.id not in placement_ids:
                placement_ids.append(order_placement.id)

            if not data.get(po_pack_item.pk, None):
                data[po_pack_item.pk] = {
                    'po_pack_item_id': po_pack_item.id,
                    'display_name': str(po_display_name) + " - " + po_pack_item.get_po_pack_item_display(),
                    'placements': {},
                    'quantity': po_pack_item.po_pack.quantity,
                    'pack_item_max_ratio': marker_placement.ratio,
                    'po_colorway_id': po_pack_item.po_pack.po_colorway.id,

                }

            current_max_ratio = data[po_pack_item.pk].get('pack_item_max_ratio', None)
            if not current_max_ratio:
                data[po_pack_item.pk]['pack_item_max_ratio'] = marker_placement.ratio
            elif marker_placement.ratio:
                if current_max_ratio < marker_placement.ratio:
                    data[po_pack_item.pk]['pack_item_max_ratio'] = marker_placement.ratio

            if not data[po_pack_item.pk]['placements'].get(order_placement.pk, None):
                pass
                # raise Exception("Invalid Data") # since a pack item can only have one order placement
            data[po_pack_item.pk]['placements'][order_placement.pk] = {
                'ratio': marker_placement.ratio,
                'marker_placement_id': marker_placement.pk,
                'po_pack_item_placement_id': marker_placement.placement_id,
                'order_placement_id': order_placement.id,
                'area': marker_placement.area,
                'placement_display': marker_placement.placement.get_po_pack_item_display(),
                'related_marker_placement': list(marker_placement.related_marker_placements.all().values_list('id', flat=True))
            }
        placements, placement_data = self.get_unique_placements(placement_ids)
        organized_data = {
            'marker_id': self.po_fabric_marker.id,
            'marker_name': self.po_fabric_marker.marker_name,
            'po_material_id': self.po_fabric_marker.po_material.id,
            'placement_data': placement_data,
            'ratio_data': data.values(),
            'consumption_ratio': self.po_fabric_marker.consumption_ratio,
            'wastage': self.po_fabric_marker.wastage,
            'width': self.po_fabric_marker.width.id if self.po_fabric_marker.width else None,
            'width_unit': self.po_fabric_marker.width.width_unit if self.po_fabric_marker.width else None,
            'marker_length': self.po_fabric_marker.marker_length,
            'marker_length_unit': self.po_fabric_marker.marker_length_unit,
            'number_of_plies': self.po_fabric_marker.number_of_plies,
            'attachments': [attachment.get_object_data() for attachment in self.po_fabric_marker.attachments.all()],
            'reviewed': self.po_fabric_marker.reviewed,
            'marker_classification': self.po_fabric_marker.marker_classification,
        }
        return organized_data

