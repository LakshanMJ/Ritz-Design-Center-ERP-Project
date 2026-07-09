from math import pi, sqrt
import numpy as np
from collections import defaultdict
from supplier_po.models import SupplierPOGRN, SupplierPOGRNMaterial, SupplierPOGRNMaterialDetail
from shared.models import PlantWarehouseRackBin

class Roll:
    def __init__(self, grn_fabric_roll_id, indicated_quantity, indicated_quantity_units, actual_quantity, actual_quantity_units, 
                 supplier_barcode, batch_number, shade, diameter):

        self.grn_fabric_roll_id = grn_fabric_roll_id
        self.indicated_quantity = indicated_quantity
        self.indicated_quantity_units = indicated_quantity_units
        self.actual_quantity = actual_quantity
        self.actual_quantity_units = actual_quantity_units
        self.supplier_barcode = supplier_barcode
        self.batch_number = batch_number
        self.shade = shade
        self.diameter = diameter
        self.radius = round(diameter/2, 4)
        self.area = pi * self.radius ** 2
        self.x = None
        self.y = None

    def clone(self):
        cloned = Roll(
            grn_fabric_roll_id = self.grn_fabric_roll_id,
            indicated_quantity = self.indicated_quantity,
            indicated_quantity_units = self.indicated_quantity_units,
            actual_quantity = self.actual_quantity,
            actual_quantity_units = self.actual_quantity_units,
            supplier_barcode = self.supplier_barcode,
            batch_number = self.batch_number,
            shade = self.shade,
            diameter = self.diameter
        )
        cloned.x = self.x
        cloned.y = self.y
        return cloned


class Bin:
    def __init__(self, allocated_bin_id, length, length_unit, width, width_unit, height, height_unit, rack_id, warehouse_id):

        self.allocated_bin_id = allocated_bin_id
        self.length = length
        self.length_unit = length_unit
        self.width = width
        self.width_unit = width_unit
        self.height = height
        self.height_unit = height_unit
        self.rack_id = rack_id
        self.warehouse_id = warehouse_id
        self.area = length*height


class GRNMaterialBinAllocation:

    def circle_packing_heuristic(self, circles, rectangle):
        placed_circles = []
        max_layers = int(rectangle.height / (2 * max(circle.radius for circle in circles)))

        for layer in range(max_layers):
            allowed_overlap = 0.02  # 0.125  # Decrease overlap tolerance with each layer
            for circle in circles:
                if circle.x is None:
                    if self.try_place_circle(circle, placed_circles, rectangle, allowed_overlap):
                        circle.layer = layer
                        placed_circles.append(circle)

        return placed_circles

    def try_place_circle(self, circle, placed_circles, rectangle, allowed_overlap):
        step_size = 0.01  # Adjusted for faster packing in layers

        for y in np.arange(circle.radius, rectangle.height - circle.radius, step_size):
            for x in np.arange(circle.radius, rectangle.width - circle.radius, step_size):
                if self.is_valid_position(circle, x, y, placed_circles, rectangle, allowed_overlap):
                    circle.x, circle.y = round(x, 4), round(y, 4)
                    return True
        return False

    def is_valid_position(self, circle, x, y, placed_circles, rectangle, allowed_overlap):

        if not (circle.radius <= x <= rectangle.width - circle.radius and
                circle.radius <= y <= rectangle.height - circle.radius):
            return False

        for other_circle in placed_circles:
            distance = sqrt((x - other_circle.x) ** 2 + (y - other_circle.y) ** 2)
            max_allowed_distance = (circle.radius + other_circle.radius) * (1 - allowed_overlap)
            if distance < max_allowed_distance:
                return False
        return True
    
    def get_shade(self, supplier_po_grn_material):

        po_club_shade = supplier_po_grn_material.shade.supplier_po_shade.copied_from
        supplier_po_shade = supplier_po_grn_material.shade.supplier_po_shade

        if po_club_shade:
            shade = po_club_shade.shade_name
        elif supplier_po_shade:
            shade = supplier_po_shade.shade_name
        else:
            shade = None

        return shade
    
    def get_grn_fabric_detail(self, supplier_po_grn_material_detail):
        
        grn_fabric_roll_id = supplier_po_grn_material_detail.id
        indicated_quantity = supplier_po_grn_material_detail.indicated_quantity
        indicated_quantity_units = supplier_po_grn_material_detail.indicated_quantity_units
        actual_quantity = supplier_po_grn_material_detail.actual_quantity
        actual_quantity_units = supplier_po_grn_material_detail.actual_quantity_units
        supplier_barcode = supplier_po_grn_material_detail.supplier_barcode
        batch_number = supplier_po_grn_material_detail.batch_number.batch_number
        shade = self.get_shade(supplier_po_grn_material_detail)
        diameter = supplier_po_grn_material_detail.diameter
        
        return Roll(grn_fabric_roll_id, indicated_quantity, indicated_quantity_units, actual_quantity, actual_quantity_units, 
                    supplier_barcode, batch_number, shade, diameter)

    def get_allocated_bin_detail(self, allocated_bin):

        allocated_bin_id = allocated_bin.id
        length = allocated_bin.length
        length_unit = allocated_bin.length_unit
        width = allocated_bin.width
        width_unit = allocated_bin.width_unit
        height = allocated_bin.height
        height_unit = allocated_bin.height_unit
        rack_id = allocated_bin.warehouse_rack.id
        warehouse_id = allocated_bin.warehouse_rack.warehouse.id
        
        return Bin(allocated_bin_id, length, length_unit, width, width_unit, height, height_unit, rack_id, warehouse_id)
    
    def get_reset(self, rolls):

        for roll in rolls:
            roll.x = None
            roll.y = None

        return rolls
    
    def get_past_allocation_details(self, supplier_po_grn_fabric_id, shade_id):

        supplier_po_grn_fabric = SupplierPOGRNMaterial.objects.get(id=supplier_po_grn_fabric_id)
        supplier_po_grn_fabric_details = supplier_po_grn_fabric.supplierpogrnmaterialdetail_set.all()
        past_allocated_supplier_po_grn_fabric_details = supplier_po_grn_fabric_details.exclude(bin_location=None)
        past_allocated_supplier_po_grn_fabric_details = past_allocated_supplier_po_grn_fabric_details.filter(shade__id=shade_id)

        past_allocated_bin_ids = {past_allocated_supplier_po_grn_fabric_detail.bin_location.id for past_allocated_supplier_po_grn_fabric_detail in past_allocated_supplier_po_grn_fabric_details}

        past_allocation_grn_fabric_details_for_bins = {}
        for past_allocated_bin_id in past_allocated_bin_ids:
            past_allocated_supplier_po_grn_fabrics = [self.get_grn_fabric_detail(past_allocated_supplier_po_grn_fabric_detail) for past_allocated_supplier_po_grn_fabric_detail in past_allocated_supplier_po_grn_fabric_details
                                                      if past_allocated_supplier_po_grn_fabric_detail.bin_location.id == past_allocated_bin_id]
            past_allocation_grn_fabric_details_for_bins[past_allocated_bin_id] = past_allocated_supplier_po_grn_fabrics

        return past_allocated_bin_ids, past_allocation_grn_fabric_details_for_bins

    def get_grn_materials(self, grn_id=None):

        if grn_id:
            grn = SupplierPOGRN.objects.get(id=grn_id)
        supplier_po_grn_materials = grn.supplierpogrnmaterial_set.all()
        supplier_po_grn_fabrics = supplier_po_grn_materials.filter(grn_material__customer_brand_material__material_detail__generic_material__user_material__category="fabric")
        grn_materials = []

        for supplier_po_grn_fabric in supplier_po_grn_fabrics:
            supplier_po_grn_fabric_id = supplier_po_grn_fabric.id
            grn_material_customer = supplier_po_grn_fabric.grn_material.customer_brand_material.material_code.customer_brand.customer.name
            supplier_po_grn_material_data = {"supplier_po_grn_material_id": supplier_po_grn_fabric_id,
                                             "customer": grn_material_customer}
            supplier_po_grn_fabric_details = supplier_po_grn_fabric.supplierpogrnmaterialdetail_set.all().order_by('pk')
            supplier_po_grn_fabric_details = supplier_po_grn_fabric_details.filter(qa_inspection_passed=True, bin_location=None)
            
            grouped_by_shade = defaultdict(list)
            for detail in supplier_po_grn_fabric_details:
                shade_id = detail.shade.id
                grouped_by_shade[shade_id].append(self.get_grn_fabric_detail(detail))

            supplier_po_grn_material_data["supplier_po_grn_fabric_details"] = dict(grouped_by_shade)
            grn_materials.append(supplier_po_grn_material_data)

        return grn_materials

    def get_remaining_empty_bins_for_grn_material(self, supplier_po_grn_fabric_id, shade_id):

        supplier_po_grn_fabric = SupplierPOGRNMaterial.objects.get(id=supplier_po_grn_fabric_id)
        grn_material_customer_id = supplier_po_grn_fabric.grn_material.customer_brand_material.material_code.customer_brand.customer.id
        bins_for_customer = PlantWarehouseRackBin.objects.filter(customer__id=grn_material_customer_id)

        supplier_po_grn_fabric_details_with_bin_allocation = SupplierPOGRNMaterialDetail.objects.filter(supplier_po_grn_material__id=supplier_po_grn_fabric.id, bin_location__isnull=False)
        already_allocated_bin_ids = {detail.bin_location.id for detail in supplier_po_grn_fabric_details_with_bin_allocation}
        past_allocated_bin_ids, output2 = self.get_past_allocation_details(supplier_po_grn_fabric_id, shade_id)
        
        allocated_bin_ids = already_allocated_bin_ids | past_allocated_bin_ids
        remaining_empty_bins_for_grn_material = bins_for_customer.exclude(id__in=list(allocated_bin_ids))
        
        remaining_empty_bins = []
        for remaining_bin in remaining_empty_bins_for_grn_material:
            remaining_empty_bins.append(remaining_bin.id)

        return remaining_empty_bins

    def bin_allocation(self, bin_id, rolls):

        roll_ids = [roll.grn_fabric_roll_id for roll in rolls]
        bin_object = PlantWarehouseRackBin.objects.get(id=bin_id)
        SupplierPOGRNMaterialDetail.objects.filter(id__in=roll_ids).update(bin_location=bin_object)

    def bin_allocation_details(self, rolls):

        for roll in rolls:
            roll_id = roll.grn_fabric_roll_id
            allocation_detail = {"x": roll.x, "y": roll.y, "radius": roll.radius}
            SupplierPOGRNMaterialDetail.objects.filter(id=roll_id).update(material_bin_allocation_details=allocation_detail)

    def get_allocation_for_remaining_bins(self, remaining_bins, rolls_to_be_allocated, allocation, allocation_error):

        while len(rolls_to_be_allocated)>0:
            usability_of_remaining_bins = {}
            usage_of_remaining_bins = {} # store the placed rolls for the each bin

            for remaining_bin in remaining_bins:
                remaining_bin_object = PlantWarehouseRackBin.objects.get(id=remaining_bin)
                rolls_to_be_allocated = sorted(rolls_to_be_allocated, key=lambda roll: roll.radius, reverse=True)
                placed_rolls_in_remaining_bin = self.circle_packing_heuristic(rolls_to_be_allocated, self.get_allocated_bin_detail(remaining_bin_object))
                
                roll_difference = len(rolls_to_be_allocated) - len(placed_rolls_in_remaining_bin)
                usability_of_remaining_bins[remaining_bin] = roll_difference
                usage_of_remaining_bins[remaining_bin] = [roll.clone() for roll in placed_rolls_in_remaining_bin]

                self.get_reset(placed_rolls_in_remaining_bin)

            usability_of_remaining_bins = dict(sorted(usability_of_remaining_bins.items(), key=lambda item: item[1]))
            chosen_bin = list(usability_of_remaining_bins.keys())[0]
            self.bin_allocation(chosen_bin, usage_of_remaining_bins[chosen_bin])
            self.bin_allocation_details(list(usage_of_remaining_bins[chosen_bin]))
            allocation[chosen_bin] = usage_of_remaining_bins[chosen_bin]

            used_ids = {roll.grn_fabric_roll_id for roll in usage_of_remaining_bins[chosen_bin]}
            rolls_to_be_allocated = list(filter(
                lambda roll: roll.grn_fabric_roll_id not in used_ids,
                rolls_to_be_allocated
            ))
            remaining_bins.remove(chosen_bin)

            if len(rolls_to_be_allocated)>0 and len(remaining_bins)==0:
                allocation_error = "Allocation cannot be completed."
                break

        return allocation, allocation_error, rolls_to_be_allocated
    
    def get_grn_materials_allocation(self, grn_id):
        
        grn_materials_to_be_allocated = self.get_grn_materials(grn_id)
        
        grn_material_bin_allocation = []
        grn_material_wise_shade_wise_grn_material_shade_allocation = {}
        grn_material_wise_shade_wise_errors = []
        for grn_material in grn_materials_to_be_allocated:

            supplier_po_grn_fabric_id = grn_material["supplier_po_grn_material_id"]
            shade_wise_grn_material_shade_allocation = {}

            grn_material_shade_wise_errors = {}
            shade_wise_errors = []
            for shade_id, grn_fabrics_to_be_allocated in (grn_material["supplier_po_grn_fabric_details"]).items():

                grn_material_shade_allocation = {}
                errors = {}
                level0_error, level2_error, level4_error = None, None, None

                past_allocated_bin_ids, past_allocation_grn_fabric_details_for_bins = self.get_past_allocation_details(supplier_po_grn_fabric_id, shade_id)
                allocated_bins = list(past_allocated_bin_ids)
                past_allocations = past_allocation_grn_fabric_details_for_bins
                remaining_bins = self.get_remaining_empty_bins_for_grn_material(supplier_po_grn_fabric_id, shade_id)

                grn_fabrics_to_be_allocated_in_past_allocated_bin = False

                if allocated_bins:
                    for allocated_bin in allocated_bins:
                        past_allocated_rolls = past_allocations[allocated_bin]

                        past_allocated_rolls = sorted(past_allocated_rolls, key=lambda roll: roll.radius, reverse=True)
                        grn_fabrics_to_be_allocated = sorted(grn_fabrics_to_be_allocated, key=lambda roll: roll.radius, reverse=True)

                        rolls = past_allocated_rolls + grn_fabrics_to_be_allocated
                        allocated_bin_object = PlantWarehouseRackBin.objects.get(id=allocated_bin)
                        placed_rolls_in_allocated_bin = self.circle_packing_heuristic(rolls, self.get_allocated_bin_detail(allocated_bin_object))

                        if len(placed_rolls_in_allocated_bin) == len(rolls):
                            chosen_bin = allocated_bin
                            self.bin_allocation(chosen_bin, placed_rolls_in_allocated_bin)
                            self.bin_allocation_details(list(placed_rolls_in_allocated_bin))
                            level1_allocation = {chosen_bin: placed_rolls_in_allocated_bin}
                            grn_fabrics_to_be_allocated_in_past_allocated_bin = True
                            break
                        else:
                            grn_fabrics_to_be_allocated_in_past_allocated_bin = False
                            break

                    if grn_fabrics_to_be_allocated_in_past_allocated_bin == False:
                        
                        self.get_reset(grn_fabrics_to_be_allocated)

                        for bin, rolls in past_allocations.items():
                            past_allocations[bin] = self.get_reset(rolls)
                        
                        level2_allocation = {}
                        while len(grn_fabrics_to_be_allocated)>0:

                            usability_of_allocation_bins = {} # store the roll differenced for the each bin
                            usage_of_allocation_bins = {} # store the placed rolls for the each bin
                            roll_lists = {} # store the rolls trying to allocated for the each bin
                            for allocated_bin in allocated_bins:

                                past_allocated_rolls = past_allocations[allocated_bin]

                                past_allocated_rolls = sorted(past_allocated_rolls, key=lambda roll: roll.radius, reverse=True)
                                grn_fabrics_to_be_allocated = sorted(grn_fabrics_to_be_allocated, key=lambda roll: roll.radius, reverse=True)

                                rolls = past_allocated_rolls + grn_fabrics_to_be_allocated
                                roll_lists[allocated_bin] = rolls
                                
                                allocated_bin_object = PlantWarehouseRackBin.objects.get(id=allocated_bin)
                                placed_rolls_in_allocated_bin = self.circle_packing_heuristic(rolls, self.get_allocated_bin_detail(allocated_bin_object))
                                
                                usage_of_allocation_bins[allocated_bin] = [roll.clone() for roll in placed_rolls_in_allocated_bin]
                                roll_difference = len(rolls) - len(placed_rolls_in_allocated_bin)
                                usability_of_allocation_bins[allocated_bin] = roll_difference

                                self.get_reset(placed_rolls_in_allocated_bin)

                            usability_of_allocation_bins = dict(sorted(usability_of_allocation_bins.items(), key=lambda item: item[1]))
                            chosen_bin = list(usability_of_allocation_bins.keys())[0]
                            self.bin_allocation(chosen_bin, usage_of_allocation_bins[chosen_bin])
                            self.bin_allocation_details(list(usage_of_allocation_bins[chosen_bin]))
                            level2_allocation[chosen_bin] = usage_of_allocation_bins[chosen_bin]

                            used_ids = {roll.grn_fabric_roll_id for roll in usage_of_allocation_bins[chosen_bin]}
                            grn_fabrics_to_be_allocated = list(filter(
                                lambda roll: roll.grn_fabric_roll_id not in used_ids,
                                roll_lists[chosen_bin]
                            ))
                            allocated_bins.remove(chosen_bin)

                            if len(grn_fabrics_to_be_allocated)>0 and len(allocated_bins)==0:

                                self.get_reset(grn_fabrics_to_be_allocated)

                                grn_fabrics_to_be_allocated_in_remaining_bins = False
                                if remaining_bins:
                                    for remaining_bin in remaining_bins:
                                        remaining_bin_object = PlantWarehouseRackBin.objects.get(id=remaining_bin)

                                        grn_fabrics_to_be_allocated = sorted(grn_fabrics_to_be_allocated, key=lambda roll: roll.radius, reverse=True)
                                        placed_rolls_in_remaining_bin = self.circle_packing_heuristic(grn_fabrics_to_be_allocated, self.get_allocated_bin_detail(remaining_bin_object))

                                        if len(placed_rolls_in_remaining_bin) == len(grn_fabrics_to_be_allocated):
                                            chosen_bin = remaining_bin
                                            self.bin_allocation(chosen_bin, grn_fabrics_to_be_allocated)
                                            self.bin_allocation_details(list(grn_fabrics_to_be_allocated))
                                            level3_allocation = {chosen_bin: grn_fabrics_to_be_allocated}
                                            grn_fabrics_to_be_allocated_in_remaining_bins = True
                                            break

                                    if grn_fabrics_to_be_allocated_in_remaining_bins==False:                 

                                        grn_fabrics_to_be_allocated_for_remaining_bins = grn_fabrics_to_be_allocated
                                        self.get_reset(grn_fabrics_to_be_allocated_for_remaining_bins)

                                        level4_allocation = {}
                                        level4_allocation, level4_error, grn_fabrics_to_be_allocated_for_remaining_bins  = self.get_allocation_for_remaining_bins(self, remaining_bins, grn_fabrics_to_be_allocated_for_remaining_bins, level4_allocation, level4_error)
                                        grn_fabrics_to_be_allocated = grn_fabrics_to_be_allocated_for_remaining_bins
                                        
                                        grn_material_bin_allocation.append(level2_allocation)
                                        grn_material_bin_allocation.append(level4_allocation)
                                        grn_material_shade_allocation["level 02 allocation"] = level2_allocation
                                        grn_material_shade_allocation["level 04 allocation"] = level4_allocation
                                        break 

                                    else:
                                        grn_material_bin_allocation.append(level2_allocation)
                                        grn_material_bin_allocation.append(level3_allocation)
                                        grn_material_shade_allocation["level 02 allocation"] = level2_allocation
                                        grn_material_shade_allocation["level 03 allocation"] = level3_allocation
                                        break
                                else:
                                    grn_material_bin_allocation.append(level2_allocation)
                                    grn_material_shade_allocation["level 02 allocation"] = level2_allocation
                                    level2_error = "Allocation cannot be completed."
                                    break
                            else:
                                grn_material_bin_allocation.append(level2_allocation)
                                grn_material_shade_allocation["level 02 allocation"] = level2_allocation            
                    else:
                        grn_material_bin_allocation.append(level1_allocation)
                        grn_material_shade_allocation["level 01 allocation"] = level1_allocation

                else:
                    if remaining_bins:
                        level0_allocation = {}
                        level0_allocation, level0_error, grn_fabrics_to_be_allocated  = self.get_allocation_for_remaining_bins(remaining_bins, grn_fabrics_to_be_allocated, level0_allocation, level0_error)
                        grn_material_bin_allocation.append(level0_allocation)
                        grn_material_shade_allocation["level 00 allocation"] = level0_allocation
                    else:
                        level0_error = "No bins available for this material"

                shade_wise_grn_material_shade_allocation[shade_id] = grn_material_shade_allocation
                errors["shade_id"] = shade_id

                if level0_error:
                    errors["error_type"] = "level_00_error"
                    errors["error_state"] = level0_error
                if level2_error:
                    errors["error_type"] = "level_02_error"
                    errors["error_state"] = level2_error
                if level4_error:
                    errors["error_type"] = "level_04_error"
                    errors["error_state"] = level4_error
                if level0_error or level2_error or level4_error:
                    shade_wise_errors.append(errors)

            grn_material_wise_shade_wise_grn_material_shade_allocation[supplier_po_grn_fabric_id] = shade_wise_grn_material_shade_allocation
            grn_material_shade_wise_errors["supplier_po_grn_fabric_id"] = supplier_po_grn_fabric_id
            grn_material_shade_wise_errors["shade_wise_errors"] = shade_wise_errors

        # print(grn_material_bin_allocation)
        # print(grn_material_wise_shade_wise_grn_material_shade_allocation)
        grn_material_wise_shade_wise_errors.append(grn_material_shade_wise_errors)

        return grn_material_wise_shade_wise_errors
