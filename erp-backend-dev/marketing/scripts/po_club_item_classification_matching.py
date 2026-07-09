import os
from shared.utils import get_attributes, get_object_or_none
from marketing.models import POPackItem, POClubItemClassification, ActualPOClub


class POClubItemClassificationMattching:
    classification_groups = {}
    def __init__(self, actual_po_club):
        self.actual_po_club = actual_po_club
        self.classification_groups = {}

    def get_matching_data_location(self,pack_type_placement_filter):
        for classification_group_location in self.classification_groups:
            classification_group = self.classification_groups[classification_group_location]
            if all([pack_type_placement_filter[filter_key] == classification_group[filter_key] for filter_key in pack_type_placement_filter]):
                return classification_group_location
        classification_group_location = len(self.classification_groups) + 1
        self.classification_groups[classification_group_location] = pack_type_placement_filter
        self.classification_groups[classification_group_location]['po_pack_items'] = []
        return classification_group_location
    
    def po_club_item_classification_matching_script(self):
        attributes = [('item', 'po_item__order_item__item'),
                    ('size', 'po_pack__po_size__order_size__size'),
                    ('country', 'po_pack__po_country__order_country__country')]
        po_packs = POPackItem.objects.filter(po_pack__purchase_order__actual_po_club = self.actual_po_club, po_club_item_classification = None)
        type_of_po_packs = po_packs.distinct(attributes[0][1],attributes[1][1],attributes[2][1])
        for type_of_po_pack in type_of_po_packs:
            pack_type_filter = {attribute[1]: get_attributes(type_of_po_pack, attribute[1]) for attribute in attributes}
            for po_pack in po_packs.filter(**pack_type_filter):
                matterial_type_filter = {placement.costing_pack_item_placement.id: placement.get_po_item_placement_material_details()['po_pack_item_material_details']['customer_brand_material_id'] for placement in po_pack.popackitemplacement_set.all() if placement.get_po_item_placement_material_details()['po_pack_item_material_details']['material_type'] == 'fabric'}
                pack_type_placement_filter = {
                    'pack_type_filter': pack_type_filter,
                    'material_type_filter': matterial_type_filter
                }
                location = self.get_matching_data_location(pack_type_placement_filter)
                self.classification_groups[location]['po_pack_items'].append(po_pack)
        for classification_group_location in self.classification_groups:
            classification_group = self.classification_groups[classification_group_location]
            po_club_item_classification = POClubItemClassification.objects.create(**{attribute[0]:classification_group['pack_type_filter'][attribute[1]] for attribute in attributes}, po_club = self.actual_po_club, name = 'PO Pack Item Classification Group ' + str(classification_group_location))
            for po_pack_item in classification_group['po_pack_items']:
                po_pack_item.po_club_item_classification = po_club_item_classification
                po_pack_item.save()