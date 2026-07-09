from marketing.models import MarkerCutPlan, SelectedRoll, RollSequence, PurchaseOrderAllocatedMaterial, ActualPOClub, CustomerBrandMaterial, Item
from materials.fieldmetadata.measuring_unit_helpers import MaterialUnitHelper
from django.db.models import Min, Sum
from shared.utils import calculate_queryset_total_normalized_quantity, convert_quantity_to_unit
from shared.utils import get_object_or_none, get_attributes, ceil_number
from numpy import sort
from supplier_po.models import SupplierPOGRNMaterialDetail

# class RollSequenceTest():

#     def get_material_available_clubs(self):
#         field = 'in_house_material__grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po__general_po_supplier__general_po__po_club'
#         rolls = PurchaseOrderAllocatedMaterial.objects.all().distinct(field)
#         for roll in rolls:
#             print(get_attributes(roll, field), 'test')
    
#     def test(self):
#         po_club = get_object_or_none(ActualPOClub, {'pk': 112})
#         material = get_object_or_none(CustomerBrandMaterial, {'pk': 6})
#         item = get_object_or_none(Item, {'pk': 9})
#         roll_sequence_generator = RollSequenceGenerator(po_club)
#         roll_sequence_generator.get_roll_sequence(material, item)


class RollSequenceGenerator():
    po_club = None
    po_club_materials = None
    po_club_markers = None
    mh = MaterialUnitHelper()
    LAYERING_TYPE_AUTO = MarkerCutPlan.LAYERING_TYPE_AUTO
    LAYERING_TYPE_WITH_JOINT = MarkerCutPlan.LAYERING_TYPE_WITH_JOINT
    LAYERING_TYPE_WITHOUT_JOINT = MarkerCutPlan.LAYERING_TYPE_WITHOUT_JOINT

    def __init__(self, po_club):
        self.po_club = po_club
        self.po_club_markers = po_club.get_markers().filter(reviewed=True)

    

    def get_left_over_material_placement_quantity(self):
        
        data = {}
        left_over_selected_rolls = SelectedRoll.objects.filter(roll_sequence__cut_plan__marker__in=self.po_club_markers.values_list('pk', flat=True),
                                                               purchase_order_allocated_material__is_left_over=True)
        for left_over_selected_roll in left_over_selected_rolls:
            ply_count = left_over_selected_roll.ply_count
            marker = left_over_selected_roll.roll_sequence.cut_plan.marker
            placements = marker.get_marker_placements()
            for placement in placements:
                if not str(placement.placement.id) in data:
                    data[str(placement.placement.id)] = {
                        "placement": placement.placement,
                        "quantity": placement.ratio*ply_count
                    }
                else:
                    data[str(placement.placement.id)]["quantity"] += placement.ratio*ply_count
        
        return data
                


    def get_next_widder_width(self, width, used_shades, marker_cut_plan):
        purchase_order_allocated_materials = PurchaseOrderAllocatedMaterial.objects.filter(width__gt=width,
                                                                                           in_house_material__supplier_material__customer_brand_material=marker_cut_plan.marker.po_material,
                                                                                           in_house_material__grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po__general_po_supplier__general_po__po_club=self.po_club,
                                                                                           )
        
        width_min = purchase_order_allocated_materials.aggregate(Min('width__width')).get('width__width__min', None)
        shade = None
        shade_total_quantity = 0
        if width_min:
            normalized_quantity_unit = purchase_order_allocated_materials[0].normalized_allocated_quantity_unit
            available_shades = [purchase_order_allocated_material.shade for purchase_order_allocated_material in purchase_order_allocated_materials.filter(shade__in=used_shades, width=width_min).distinct('shade')]
            for available_shade in available_shades:
                available_shade_total_quantity = calculate_queryset_total_normalized_quantity(purchase_order_allocated_materials.filter(shade=available_shade, width=width_min),
                                                                                    normalized_quantity_unit,
                                                                                    'allocated_quantity',
                                                                                    'allocated_quantity_units')
                if shade_total_quantity < available_shade_total_quantity:
                    shade = available_shade
                    shade_total_quantity = available_shade_total_quantity
            if not shade:
                shade = self.get_max_shade(width, [], marker_cut_plan, {})
        return width_min, shade
    
    def get_queryset_filtered_by_normalized_available_quantity(self, rolls, marker_cut_plan):
        excludes_ids = []
        normalized_marker_length = marker_cut_plan.normalized_marker_length_with_allowance
        # print(normalized_marker_length)
        for roll in rolls:
            if normalized_marker_length > roll.normalized_available_quantity:
                excludes_ids.append(roll.id)
        
        rolls = rolls.exclude(pk__in=excludes_ids)
        return rolls

    
    def get_max_shade(self, width, exlude_shades, marker_cut_plan, last_roll_in_last_cut):
        return_shade = None
        sum_value = 0
        customer_brand_material = marker_cut_plan.marker.po_material
        last_shade = last_roll_in_last_cut.get('layer_details', {}).get('shade', None)
        if last_shade:
            purchase_order_allocated_materials = PurchaseOrderAllocatedMaterial.objects.filter(shade=last_shade,
                                                                                           width=width,
                                                                                               in_house_material__supplier_material__customer_brand_material=customer_brand_material
                                                                                               )
            purchase_order_allocated_materials = self.get_queryset_filtered_by_normalized_available_quantity(purchase_order_allocated_materials, marker_cut_plan)
            if purchase_order_allocated_materials.exists():
                return_shade = last_shade
        if not return_shade:
            purchase_order_allocated_materials = PurchaseOrderAllocatedMaterial.objects.filter(width=width,
                                                                                               in_house_material__supplier_material__customer_brand_material=customer_brand_material
                                                                                               )
            purchase_order_allocated_materials = self.get_queryset_filtered_by_normalized_available_quantity(purchase_order_allocated_materials, marker_cut_plan)
            shades = purchase_order_allocated_materials.distinct('shade')
            for shade in shades:
                shade_purchase_order_allocated_materials = purchase_order_allocated_materials.filter(shade = shade.shade)
                temp_sum_value = 0
                for shade_purchase_order_allocated_material in shade_purchase_order_allocated_materials:
                    temp_sum_value += shade_purchase_order_allocated_material.normalized_available_quantity
                if sum_value < temp_sum_value:
                    sum_value = temp_sum_value
                    return_shade = shade.shade
                

        return return_shade
    
    def clear_genareted_roll_sequences(self, marker_cut_plans):
        for marker_cut_plan in marker_cut_plans:
            roll_sequenceses = marker_cut_plan.rollsequence_set.all()
            for roll_sequence in roll_sequenceses:
                roll_sequence.selectedroll_set.all().delete()
            roll_sequenceses.delete()
    
    def get_roll_sequence(self, material):

        marker_cut_plans = MarkerCutPlan.objects.filter(marker__actual_club=self.po_club,
                                                        marker__po_material=material,
                                                        # marker__item=item,
                                                        state=MarkerCutPlan.DRAFT_STATE
                                                        )
        self.clear_genareted_roll_sequences(marker_cut_plans)
        last_roll_details = {}
        for marker_cut_plan in marker_cut_plans:
            roll_sequences = {}
            #with joint
            if marker_cut_plan.layering_type in [self.LAYERING_TYPE_AUTO, self.LAYERING_TYPE_WITH_JOINT]:
                marker_cut_plan = get_object_or_none(MarkerCutPlan, {'id': marker_cut_plan.id})
                cutting_width = marker_cut_plan.marker.width
                width_changed = False
                used_shades = []
                roll_sequence = []
                cumulative_ply_count = 0
                last_roll_in_last_cut = last_roll_details
                while marker_cut_plan.ply_count > 0:
                    max_shade = self.get_max_shade(cutting_width, used_shades, marker_cut_plan, last_roll_in_last_cut)
                    if not max_shade:
                        cutting_width, max_shade = self.get_next_widder_width(cutting_width, used_shades, marker_cut_plan)
                        used_shades = []
                    if not max_shade:
                        break
                    roll_sequence = [*roll_sequence,*self.get_roll_sequence_with_joint(marker_cut_plan,max_shade, cumulative_ply_count, cutting_width, last_roll_in_last_cut)]
                    last_roll_in_last_cut = {}
                    if roll_sequence == []:
                        break
                    used_shades.append(max_shade)
                    cumulative_ply_count = roll_sequence[len(roll_sequence)-1]['layer_details']['cumulative_ply_count']
                roll_sequences[self.LAYERING_TYPE_WITH_JOINT] = roll_sequence

            #without joint
            if marker_cut_plan.layering_type in [self.LAYERING_TYPE_AUTO, self.LAYERING_TYPE_WITHOUT_JOINT]:
                marker_cut_plan = get_object_or_none(MarkerCutPlan, {'id': marker_cut_plan.id})
                cutting_width = marker_cut_plan.marker.width
                width_changed = False
                used_shades = []
                roll_sequence = []
                cumulative_ply_count = 0
                last_roll_in_last_cut = last_roll_details
                while marker_cut_plan.ply_count>0:
                    max_shade = self.get_max_shade(cutting_width, used_shades, marker_cut_plan, last_roll_in_last_cut)
                    if not max_shade:
                        cutting_width, max_shade = self.get_next_widder_width(cutting_width, used_shades, marker_cut_plan)
                        used_shades = []
                    if not max_shade:
                        break

                    roll_sequence = [*roll_sequence, *self.get_roll_sequence_without_joint(marker_cut_plan, max_shade, cumulative_ply_count, cutting_width, last_roll_in_last_cut)]
                    last_roll_in_last_cut = {}
                    if roll_sequence == []:
                        break
                    used_shades.append(max_shade)
                    cumulative_ply_count = roll_sequence[len(roll_sequence)-1]['layer_details']['cumulative_ply_count']
                roll_sequences[self.LAYERING_TYPE_WITHOUT_JOINT] = roll_sequence
                roll_sequence = []
                layering_type = marker_cut_plan.layering_type
                if marker_cut_plan.layering_type == self.LAYERING_TYPE_AUTO:
                    roll_sequence, layering_type = self.get_optimize_roll_sequence(roll_sequences)
                else:
                    roll_sequence = roll_sequences.get(layering_type, [])

                roll_sequence = self.get_rearranged_roll_sequence(roll_sequence)
                self.save_roll_sequence(marker_cut_plan, roll_sequence, layering_type)

    def get_roll_sequence_with_joint(self, marker_cut_plan, max_shade, cumulative_ply_count, cutting_width, last_roll_in_last_cut):
        roll_sequence = []
        selected_roll = {}
        last_layer_details = {}
        last_shade = last_roll_in_last_cut.get('layer_details',{}).get('shade',None)
        last_roll = False
        used_roll_ids = []
        customer_brand_material = marker_cut_plan.marker.po_material
        if max_shade == last_shade:
            roll_id = last_roll_in_last_cut['roll'].id
            used_roll_ids.append(roll_id)
            rolls = PurchaseOrderAllocatedMaterial.objects.filter(in_house_material__supplier_material__customer_brand_material=customer_brand_material,
                                                                  width=cutting_width,
                                                                  shade=max_shade,
                                                                  pk=roll_id,
                                                                  )
            rolls = self.get_queryset_filtered_by_normalized_available_quantity(rolls, marker_cut_plan)
            for roll in rolls:
                roll_data = roll.get_layering_details_with_joint(marker_cut_plan, last_layer_details, cumulative_ply_count, last_roll)
                selected_roll = {
                    'roll': roll,
                    'layer_details': roll_data
                }
            if rolls.count()>0:
                if selected_roll['layer_details']['ply_count'] > 0:
                    roll_sequence.append(selected_roll)
                    last_layer_details = selected_roll['layer_details']
                    marker_cut_plan.ply_count -= last_layer_details['ply_count']
                    cumulative_ply_count = last_layer_details['cumulative_ply_count']
                selected_roll = {}
            
            rolls = PurchaseOrderAllocatedMaterial.objects.filter(in_house_material__supplier_material__customer_brand_material=customer_brand_material,
                                                                  width=cutting_width,
                                                                  shade=max_shade,
                                                                  ).exclude(pk=roll_id)
            rolls = self.get_queryset_filtered_by_normalized_available_quantity(rolls, marker_cut_plan)
        else:
            rolls = PurchaseOrderAllocatedMaterial.objects.filter(in_house_material__supplier_material__customer_brand_material=customer_brand_material,
                                                                  width=cutting_width,
                                                                  shade=max_shade
                                                                  )
            rolls = self.get_queryset_filtered_by_normalized_available_quantity(rolls, marker_cut_plan)
        if rolls.count() == 1:
            last_roll = True
            

        while rolls and marker_cut_plan.ply_count > 0:
            for roll in rolls:
                roll_data = roll.get_layering_details_with_joint(marker_cut_plan, last_layer_details, cumulative_ply_count, last_roll)
                selected_roll = self.get_optimized_roll(selected_roll.get('layer_details', {}), roll_data)
            
            roll_sequence.append(selected_roll)
            last_layer_details = selected_roll['layer_details']
            marker_cut_plan.ply_count -= last_layer_details['ply_count']
            cumulative_ply_count = last_layer_details['cumulative_ply_count']
            used_roll_ids.append(selected_roll['roll'].id)
            selected_roll = {}
            rolls = rolls.filter().exclude(pk__in=used_roll_ids)
            if rolls.count() == 1:
                last_roll = True
        return roll_sequence

    def get_roll_sequence_without_joint(self, marker_cut_plan, max_shade, cumulative_ply_count, cutting_width, last_roll_in_last_cut):
        roll_sequence = []
        selected_roll = {}
        last_layer_details = {}
        last_shade = last_roll_in_last_cut.get('layer_details', {}).get('shade', None)
        last_roll = False
        used_roll_ids = []
        customer_brand_material = marker_cut_plan.marker.po_material
        if max_shade == last_shade:
            roll_id = last_roll_in_last_cut['roll'].id
            used_roll_ids.append(roll_id)
            rolls = PurchaseOrderAllocatedMaterial.objects.filter(in_house_material__supplier_material__customer_brand_material=customer_brand_material,
                                                                  width=cutting_width,
                                                                  shade=max_shade,
                                                                  pk=roll_id,
                                                                  )
            rolls = self.get_queryset_filtered_by_normalized_available_quantity(rolls, marker_cut_plan)
            for roll in rolls:
                roll_data = roll.get_layering_details_without_joint(marker_cut_plan, cumulative_ply_count)
                selected_roll = {
                    'roll': roll,
                    'layer_details': roll_data
                }
            if rolls.count() > 0:
                if selected_roll['layer_details']['ply_count'] > 0:
                    roll_sequence.append(selected_roll)
                    last_layer_details = selected_roll['layer_details']
                    marker_cut_plan.ply_count-= last_layer_details['ply_count']
                    cumulative_ply_count = last_layer_details['cumulative_ply_count']
                selected_roll = {}
            rolls = PurchaseOrderAllocatedMaterial.objects.filter(in_house_material__supplier_material__customer_brand_material=customer_brand_material,
                                                                  width=cutting_width,
                                                                  shade=max_shade
                                                                  ).exclude(pk=roll_id)
            rolls = self.get_queryset_filtered_by_normalized_available_quantity(rolls, marker_cut_plan)
        else:
            rolls = PurchaseOrderAllocatedMaterial.objects.filter(in_house_material__supplier_material__customer_brand_material=customer_brand_material,
                                                                  width=cutting_width,
                                                                  shade=max_shade
                                                                  )
            rolls = self.get_queryset_filtered_by_normalized_available_quantity(rolls, marker_cut_plan)
        
        while rolls and marker_cut_plan.ply_count > 0:
            for roll in rolls:
                roll_data = roll.get_layering_details_without_joint(marker_cut_plan, cumulative_ply_count)
                selected_roll = self.get_optimized_roll(selected_roll.get('layer_details', {}), roll_data)
            roll_sequence.append(selected_roll)
            last_layer_details = selected_roll['layer_details']
            marker_cut_plan.ply_count -= last_layer_details['ply_count']
            cumulative_ply_count = last_layer_details['cumulative_ply_count']
            used_roll_ids.append(selected_roll['roll'].id)
            selected_roll = {}
            rolls = rolls.filter(allocated_quantity__gte=marker_cut_plan.marker.marker_length).exclude(pk__in=used_roll_ids)
            if rolls.count() == 1:
                last_roll = True
        return roll_sequence
    
    def get_unusable_sum(self, roll_sequence):
        total_balance = 0
        for roll in roll_sequence:
            total_balance += roll['layer_details']['normalized_unusable_quantity']
        return total_balance
    
    def get_optimized_roll(self, old_roll, new_roll, select_max_ply_count=False):
        return_roll = {}
        selected_roll = {}
        if not old_roll:
            return_roll = new_roll
            old_roll = new_roll
        else:
            return_roll = old_roll

        if not select_max_ply_count:
            if old_roll['normalized_unusable_quantity'] > new_roll['normalized_unusable_quantity']:
                return_roll = new_roll
            elif old_roll['normalized_unusable_quantity'] == new_roll['normalized_unusable_quantity']:
                if old_roll['ply_count'] < new_roll['ply_count']:
                    return_roll = new_roll
        elif select_max_ply_count:
            if old_roll['ply_count'] < new_roll['ply_count']:
                return_roll = new_roll
        selected_roll = {
            'roll': return_roll['self'],
            'layer_details': return_roll
        }
        return selected_roll

    def get_optimize_roll_sequence(self, roll_sequences):
        layering_type = None
        roll_sequence = {}
        for key in roll_sequences:
            if not layering_type:
                layering_type = key
                roll_sequence = roll_sequences[key]
            else:
                if self.get_unusable_sum(roll_sequences[key]) < self.get_unusable_sum(roll_sequence):
                    layering_type = key
                    roll_sequence = roll_sequences[key]
        return roll_sequence, layering_type

    def get_rearranged_roll_sequence(self, roll_sequence):
        arranged_roll_sequence = []
        widths = []
        shades = []
        for roll in roll_sequence:
            if not roll['layer_details']['width'] in widths:
                widths.append(roll['layer_details']['width'])
            if not roll['layer_details']['shade'] in shades:
                shades.append(roll['layer_details']['shade'])
        widths = sort(widths)[::-1]
        for width in widths:
            for roll in roll_sequence:
                if width == roll['layer_details']['width']:
                    arranged_roll_sequence.append(roll)
        return arranged_roll_sequence

    def get_sequence_number(self, marker_cut_plan):
        roll_sequencees = RollSequence.objects.filter(
            cut_plan__marker__actual_club=self.po_club,
            cut_plan__marker__po_material=marker_cut_plan.marker.po_material,
            cut_plan__marker__item=marker_cut_plan.marker.item
        )
        return roll_sequencees.count() + 1

    def save_roll_sequence(self, marker_cut_plan, roll_sequence, layering_type):
        if roll_sequence:
            sequence_number = self.get_sequence_number(marker_cut_plan)
            marker_cut_plan_obj = get_object_or_none(MarkerCutPlan, {'pk': marker_cut_plan.id})
            if marker_cut_plan_obj:
                marker_cut_plan_obj.state = marker_cut_plan_obj.ROLL_SEQUENCE_GENARETED_STATE
                marker_cut_plan_obj.save()
            roll_sequence_object = RollSequence.objects.create(cut_plan=marker_cut_plan,
                                                            layering_type=layering_type,
                                                            sequence_number=sequence_number)
            sequence_number_of_roll = 1
            for roll in roll_sequence:
                quantity_units = roll['roll'].allocated_quantity_units
                normalized_used_quantity = roll['layer_details']['normalized_used_quantity']
                normalized_unusable_quantity = roll['layer_details']['normalized_unusable_quantity']
                normalized_quantity_units = roll['roll'].normalized_allocated_quantity_unit

                quantity = convert_quantity_to_unit(quantity_units, normalized_used_quantity, normalized_quantity_units)['quantity']
                unusable_quantity = convert_quantity_to_unit(quantity_units, normalized_unusable_quantity, normalized_quantity_units)['quantity']
                selected_roll = SelectedRoll.objects.create(purchase_order_allocated_material=roll['roll'],
                                                            sequence_number=sequence_number_of_roll,
                                                            ply_count=roll['layer_details']['ply_count'],
                                                            quantity=quantity,
                                                            quantity_units=quantity_units,
                                                            unusable_quantity=unusable_quantity,
                                                            unusable_quantity_units=quantity_units,
                                                            marker_point=roll['layer_details']['marker_point'],
                                                            roll_sequence=roll_sequence_object)
                sequence_number_of_roll += 1


class MarkerCutPlanGenerator():
    po_club = None
    po_club_markers = []
    mh = MaterialUnitHelper()
    max_ply_count = 108
    devide_ply_count = 1

    def __init__(self, po_club):
        self.po_club = po_club
        self.get_marker_cut_plan_constraints()

    def get_marker_cut_plan_constraints(self):
        max_ply_count = 0
        devided_ply_count = 0
        costing_version = self.po_club.get_costing()
        pack_packagings = costing_version.packpackaging_set.all()
        for pack_packaging in pack_packagings:
            pack_instructions = pack_packaging.packinstruction_set.all()
            print("instruction", pack_instructions)
            for pack_instruction in pack_instructions:
                pack_instruction_order_pack = pack_instruction.packinstructionorderpack_set.all()
                print("order_pack", pack_instruction_order_pack)
        print("packagings", pack_packagings)

    def get_po_club_booking_width_markers(self, material):
        po_club_markers = self.po_club.get_markers()
        po_club_markers = po_club_markers.filter(po_material=material, derived_from_marker=None)
        return po_club_markers

    def get_other_width_marker(self, marker, normalized_width):
        other_width_markers = marker.pofabricmarker_set.filter(parent_marker=None).exclude(derived_from_marker=None)
        selected_other_width_marker = None
        for other_width_marker in other_width_markers:
            if normalized_width == other_width_marker.width.get_normalized_width():
                selected_other_width_marker = other_width_marker
        return selected_other_width_marker
    
    def get_required_normilized_fabric_length(self, marker):
        normalized_marker_length_allowance = 0.00
        normalized_marker_length = normalized_marker_length_allowance + marker.get_normalized_marker_length()
        ply_count = marker.number_of_plies
        return ceil_number(ply_count*normalized_marker_length*100)/100
    
    def get_required_normalized_fabric_length_for_ply_count(self, marker, ply_count):
        normalized_marker_length_allowance = 0.00
        normalized_marker_length = normalized_marker_length_allowance + marker.get_normalized_marker_length()
        return ceil_number(ply_count*normalized_marker_length*100)/100
    
    def get_posible_ply_count(self, marker, available_fabric_length):
        normalized_marker_length_allowance = 0.00
        normalized_marker_length = normalized_marker_length_allowance + marker.get_normalized_marker_length()
        return int(available_fabric_length/normalized_marker_length)
    
    def get_cut_number(self, marker):
        return len(MarkerCutPlan.objects.filter(marker__item=marker.item, marker__po_material=marker.po_material)) + 1
    
    def arrange_allocated_material_widths(self, widths):
        arranged_widths = []
        for width in widths:
            arranged_widths.append(widths[width])
        for index in range(0,len(arranged_widths)):
            for inner_index in range(index, len(arranged_widths)):
                outter_width = arranged_widths[index]
                inner_width = arranged_widths[inner_index]
                if outter_width['total'] < inner_width['total']:
                    arranged_widths[index] = inner_width
                    arranged_widths[inner_index] = outter_width
        
        return arranged_widths

    def get_allocated_material_details(self, material, shade_category):
        allocated_material_details = {
            "left_over": {
                "total": 0.00,
                "widths": {}
            },
            "po_allocated": {
                "total": 0.00,
                "widths": {}
            }
        }
        purchase_order_allocated_materials = PurchaseOrderAllocatedMaterial.objects.filter(
            in_house_material__supplier_material__customer_brand_material=material,
            in_house_material__grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po__general_po_supplier__general_po__po_club=self.po_club
        )
        for purchase_order_allocated_material in purchase_order_allocated_materials:
            if purchase_order_allocated_material.in_house_material.grn_material_detail.batch_number.shade_category == shade_category:
                normalized_width = purchase_order_allocated_material.width.get_normalized_width()
                is_left_over = purchase_order_allocated_material.is_left_over
                normalized_available_quantity = purchase_order_allocated_material.normalized_available_quantity
                shade_id = purchase_order_allocated_material.shade.id
                if is_left_over:
                    key = 'left_over'
                else:
                    key = 'po_allocated'
                
                allocated_material_details[key]['total'] += normalized_available_quantity

                if not str(normalized_width) in allocated_material_details[key]['widths']:
                    allocated_material_details[key]['widths'][str(normalized_width)] = {
                        "total": normalized_available_quantity,
                        "width": normalized_width,
                        "shades": {
                            str(shade_id): normalized_available_quantity
                        }
                    }
                else:
                    allocated_material_details[key]['widths'][str(normalized_width)]['total'] += normalized_available_quantity
                    if not str(shade_id) in allocated_material_details[key]['widths'][str(normalized_width)]['shades']:
                        allocated_material_details[key]['widths'][str(normalized_width)]['shades'][str(shade_id)] = normalized_available_quantity
                    else:
                        allocated_material_details[key]['widths'][str(normalized_width)]['shades'][str(shade_id)] += normalized_available_quantity
        arranged_allocated_material_details = {
            "left_over": {
                "total": allocated_material_details['left_over']['total'],
                "widths": self.arrange_allocated_material_widths(allocated_material_details['left_over']['widths'])
            },
            "po_allocated": {
                "total": allocated_material_details['po_allocated']['total'],
                "widths": self.arrange_allocated_material_widths(allocated_material_details['po_allocated']['widths'])
            }
        }
        return arranged_allocated_material_details
    
    def required_fabric_for_draft_marker_cut_plans(self, material, width):
        required_fabric = 0
        marker_cut_plans = MarkerCutPlan.objects.filter(marker__po_material=material, state=MarkerCutPlan.DRAFT_STATE)
        for marker_cut_plan in marker_cut_plans:
            if marker_cut_plan.marker.width.get_normalized_width() == width:
                required_fabric += self.get_required_normalized_fabric_length_for_ply_count(marker_cut_plan.marker, marker_cut_plan.ply_count)

        return required_fabric

    def create_marker_cut_plans(self, material):
        booking_width_markers = self.get_po_club_booking_width_markers(material)
        arranged_allocated_material_details = self.get_allocated_material_details(material, SupplierPOGRNMaterialDetail.SHADE_CATEGORY_ROLL_TO_ROLL_SHADING)
        marker_cut_plans = []
        if booking_width_markers:
            for booking_width_marker in booking_width_markers:
                marker_cut_plans.append({
                    "booking_width_marker": booking_width_marker,
                    "remaining_ply_count": booking_width_marker.get_remaining_ply_count(),
                })
            for material_allocation_type in arranged_allocated_material_details:
                material_details = arranged_allocated_material_details[material_allocation_type]
                for width in material_details['widths']:
                    width_total = width['total'] - self.required_fabric_for_draft_marker_cut_plans(material, width['width'])
                    width_total = ceil_number(width_total*100)/100

                    fabric_width = width['width']
                    for marker_cut_plan in marker_cut_plans:
                        remaining_ply_count = marker_cut_plan['remaining_ply_count']

                        if remaining_ply_count > 0:
                            booking_width = marker_cut_plan['booking_width_marker'].width.get_normalized_width()
                            selected_marker = None
                            if booking_width == fabric_width:
                                selected_marker = marker_cut_plan['booking_width_marker']
                            else:
                                selected_marker = self.get_other_width_marker(marker_cut_plan['booking_width_marker'], fabric_width)
                            if selected_marker:
                                required_fabric = self.get_required_normalized_fabric_length_for_ply_count(selected_marker, remaining_ply_count)
                                ply_count = 0
                                if width_total >= required_fabric:
                                    ply_count = remaining_ply_count
                                    if width_total == required_fabric:
                                        width_total = 0.00
                                    else:
                                        width_total = ceil_number((width_total-required_fabric)*100)/100
                                else:
                                    ply_count = self.get_posible_ply_count(selected_marker, width_total)
                                    if ply_count > 0:
                                        width_total = ceil_number((width_total-self.get_required_normalized_fabric_length_for_ply_count(selected_marker, ply_count))*100)/100
                                    else:
                                        break
                                marker_cut_plan['remaining_ply_count'] -= ply_count
                                cut_number = self.get_cut_number(selected_marker)
                                created_marker_cut_plan = MarkerCutPlan.objects.create(cut_number=cut_number,
                                                                                    ply_count=ply_count,
                                                                                    marker=selected_marker,
                                                                                    required_fabric_qty=self.get_required_normalized_fabric_length_for_ply_count(selected_marker, ply_count),
                                                                                    marker_length_allowance_units = MaterialUnitHelper.CENTIMETERS_UNIT,
                                                                                    layering_type=MarkerCutPlan.LAYERING_TYPE_AUTO)
                                if width_total == 0.00:
                                    break
    

    def get_marker_cut_plan_posible_pcs(self, item, material, grns = []):
        
        purchase_order_allocated_materials = PurchaseOrderAllocatedMaterial.objects.filter(
            in_house_material__supplier_material__customer_brand_material=material,
            in_house_material__grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po__general_po_supplier__general_po__po_club=self.po_club,
            is_left_over=False
        )
        if len(grns)>0:
            purchase_order_allocated_materials = purchase_order_allocated_materials.filter(
                in_house_material__grn_material_detail__supplier_po_grn_material__supplier_po_grn__id__in=grns
            )
        
        marker_cut_plans = self.get_marker_cut_plans(item, material)