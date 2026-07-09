import math

class POFabricConsumptionUtils:

    def __init__(self, marker):
        self.marker = marker

    def get_indexes(self, base_pack_item_marker_detail):
        '''
        :param base_placement:
        :return:
            indexes: returns a index
            total_length: total length of material
            total_quantity: quantity of all the placements
        '''
        # placements = self.marker.get_marker_details()
        marker_details = self.marker.get_marker_material_placements()
        ratio = float(self.marker.consumption_ratio)
        indexes = []
        total_length = 0
        total_quantity = 0
        for pack_item_marker_detail in marker_details:
            index = (pack_item_marker_detail.area - base_pack_item_marker_detail.area) / base_pack_item_marker_detail.area
            per_garment_length = float(index) * float(ratio) + float(ratio)
            placement_ratio = pack_item_marker_detail.ratio
            per_garment_quantity = per_garment_length * placement_ratio
            total_length += per_garment_quantity
            total_quantity += placement_ratio
            indexes.append({
                'index': index,
                'per_garment_length': per_garment_quantity,
                'ratio_quantity': placement_ratio,
                'marker_placement_object': pack_item_marker_detail,
                'filled_placement_quantity': pack_item_marker_detail.filled_placement_quantity
            })
        return indexes, total_length, total_quantity

    def marker_complete(self):
        return self.marker.validate_fabric_marker()[0]

    def get_base_pack_item_marker_detail_and_yy(self):
        pack_item_marker_details = self.marker.get_marker_material_placements()
        ratio = float(self.marker.consumption_ratio)
        base_yy = None
        base_pack_item_marker_detail = None
        selected_dif = 9999 # highest possible value
        for pack_item_marker_detail in pack_item_marker_details:
            indexes, total_length, total_quantity = self.get_indexes(pack_item_marker_detail)
            placement_yy = total_length / total_quantity
            diff = float(placement_yy) - float(ratio)
            if base_pack_item_marker_detail == None or abs(diff) < abs(selected_dif):
                base_yy = ratio - diff
                selected_dif = diff
                base_pack_item_marker_detail = pack_item_marker_detail
        return base_pack_item_marker_detail, base_yy

    def calculate_real_placement_ratios(self):
        if self.marker_complete():
            self.marker.calculate_filled_placement_quantity()
            base_pack_item_marker_detail, base_yy = self.get_base_pack_item_marker_detail_and_yy()
            error = float(self.marker.consumption_ratio) - base_yy
            indexes, total_length, total_quantity = self.get_indexes(base_pack_item_marker_detail)
            new_ratio = float(self.marker.consumption_ratio) - error
            total_material_quantity = 0
            for index in indexes:
                placement_ratio = index['index'] * new_ratio + new_ratio

                marker_placement_object = index['marker_placement_object']
                quantity = index['filled_placement_quantity']
                material_quantity = placement_ratio * quantity * (1 + float(self.marker.wastage) / 100)

                marker_placement_object.calculated_material_quantity = round(material_quantity, 2)
                marker_placement_object.calculated_consumption_ratio = placement_ratio
                marker_placement_object.save()
                total_material_quantity += material_quantity
            self.marker.calculated_total_material_quantity = total_material_quantity
            self.marker.base_po_pack_item_marker_detail = base_pack_item_marker_detail
            self.marker.calculated_consumption_ratio = new_ratio
            self.marker.save()
        else:
            raise Exception("Please make sure consumption data is complete")

