from django.db.models import Q

from marketing.models import SupplierPOGRN, SupplierPOGRNMaterial, SupplierDeliveryDate, PurchaseOrderBom, \
    UserDefinedMaterial, PurchaseOrderClubBomSupplier, SupplierActualDeliveryDate, PurchaseOrderAllocatedMaterial, \
    ActualPOClub, SupplierPOGRNMaterialDetail, FabricGRNBatchNumber, FabricGRNDetail, POClubMaterialColorTone, \
    DebitNote, DebitNoteMaterial, ReplacementQuantityDeliveryDate, PurchaseOrder
from materials.serializers.material_serializers import FabricColorToneSerializer
from materials.fieldmetadata.measuring_unit_helpers import MaterialUnitHelper
from materials.models import CustomerBrandMaterial, Material, SupplierCustomerBrandMaterial
from shared.utils import calculate_queryset_total_normalized_quantity, \
    calculate_queryset_total_normalized_quantity_from_property, get_quantity_dictionary, convert_quantity_to_unit
from shared.utils import get_object_or_none
from supplier_po.models import SupplierDeliveryDateQuantity, SupplierDeliveryDateQuantityPOAllocation, SupplierPO, \
    GeneralPO


class GRNMaterialSummaryCalculatorMixin:
    HEADERS_KEY = 'headers'
    QUANTITY_KEY = 'quantity'
    QUANTITY_UNITS_KEY = 'quantity_units'
    QUANTITY_UNITS_DISPLAY_KEY = 'quantity_units_display'
    PURCHASE_ORDER_ALLOCATIONS_KEY = 'purchaser_order_allocations'
    RELATED_PURCHASER_ORDERS_REQUIRED_TOTAL_QUANTITY = 'related_purchase_orders_required_total_quantity' # This has the total required quantity for all related po's in a supplier po


    PURCHASE_ORDER_REQUIRED_QUANTITY = 'purchase_order_required_quantity' # PurchaseOrderBom Quantity - this was order_quantity before # TODO -fix front end

    DELIVERY_DATE_PURCHASE_ORDER_ALLOCATED_QUANTITY = 'supplier_po_purchase_order_allocated_quantity' # This is the expected allocation quantity. IE When creating supplier PO. was supplier_po_order_quantity # TODO -fix front end
    DELIVERY_DATE_PURCHASE_ORDER_ALLOCATED_PI_QUANTITY = 'supplier_po_purchase_order_allocated_pi_quantity'
    GRNS_PURCHASE_ORDER_ALLOCATED_QUANTITY = 'grns_purchase_order_allocated_quantity' # PO Allocated quantity for the grn's provided
    PURCHASE_ORDER_ALLOCATED_QUANTITY = 'purchase_order_allocated_quantity' # Total allocated quantity, from all supplier pos/ GRNS/ Leftover
    SUPPLIER_PO_PURCHASE_ORDER_ACTUAL_ALLOCATED_QUANTITY = 'supplier_po_purchase_order_actual_allocated_quantity' # This is actual allocated post GRN. # TODO - fix front end was supplier_po_allocated_quantity

    TOTAL_CLUB_BOM_ALLOCATED_QUANTITY = 'club_bom_allocated_quantity'

    # SUPPLIER_PO_IN_HOUSED_DEFICIT_KEY = 'supplier_po_in_housed_deficit' # GRN_IN_HOUSED_DEFICIT_KEY SUPPLIER_PO_IN_HOUSED_DEFICIT_KEY

    DELIVERY_DATE_REQUESTED_QUANTITY_KEY = 'delivery_date_requested_quantity' # was delivery_date_quantity,  TOTAL_DELIVERY_DATE_QUANTITY_KEY
    DELIVERY_DATE_PI_QUANTITY_KEY = 'delivery_date_pi_quantity' # TODO fix front end the matching one is delivery_date_quantity.
    DELIVERY_DATE_PLANNED_REPLACEMENT_QUANTITY_KEY = 'delivery_date_planned_replacement_quantity' # TODO fix front end was total_planned_replacement_quantity

    GRN_INDICATED_QUANTITY_KEY = 'grn_indicated_quantity' # Indicated quantity total in the GRNS
    GRN_TOTAL_ACTUAL_QUANTITY_KEY = 'grn_total_actual_quantity' # Actual quantity total in the GRNS
    GRN_REJECTED_QUANTITY_KEY = 'grn_rejected_quantity' # TODO - fix front end was supplier_po_rejected_quantity
    GRN_QA_PASSED_QUANTITY_KEY = 'grn_qa_passed_quantity' # TODO - fix front end was supplier_po_qa_passed_quantity
    GRN_EXCESS_QUANTITY_KEY = 'grn_excess_quantity' # TODO - fix front end was supplier_po_return_excess_quantity
    GRN_DEFICIT_QUANTITY_KEY = 'grn_deficit_quantity' # TODO - fix front end was supplier_po_grn_deficit_quantity
    GRN_USABLE_QUANTITY_KEY = 'grn_usable_quantity'
    GRN_TOTAL_IN_HOUSED_QUANTITY_KEY = 'grn_total_in_housed_quantity'
    GRN_IN_HOUSED_EXCESS_KEY = 'grn_in_housed_excess' # TODO - fix front end was supplier_po_in_housed_excess
    GRN_REQUIRES_REPLACEMENT_QUANTITY_KEY = 'grn_requires_replacement_quantity' # TODO - fix front end was supplier_po_in_housed_excess

    # PI_QUANTITY_KEY = 'pi_quantity' TODO - this was removed. Fix front end usage
    # TOTAL_PI_QUANTITY_KEY = 'total_pi_quantity' # TODO - this was removed. Fix front end usage
    TOTAL_PO_CLUB_REQUIRED_QUANTITY = 'total_po_club_required_quantity' # This contains the required quantity for a po club
    TOTAL_SUPPLIER_PO_PI_QUANTITY_KEY = 'supplier_po_total_pi_quantity' # This contains the PI Required Quantity  (All deliveries). TODO - fix front end was total_order_quantity
    TOTAL_SUPPLIER_PO_REQUESTED_ORDER_QUANTITY = 'supplier_po_total_requested_order_quantity' # This contains the supplier po total requested quantity (All deliveries). TODO - fix front end was total_supplier_po_order_quantity

    # DELIVERY_DATE_QUANTITY_KEY = 'po_delivery_date_quantity' # TODO -fix front end (was delivery_date_quantity) Contains all the delivery date quantity allocated for the Purchase Order in a SupplierPO
    DIFFERENCE_DATA_KEY = 'allocated_minus_delivery_date_difference'
    SUPPLIER_PO_REJECTION_IMPACT_KEY = 'supplier_po_rejection_impact' # REJECTION_IMPACT_KEY
    SUPPLIER_PO_DEFICIT_IMPACT_KEY = 'supplier_po_deficit_impact' # DEFICIT_IMPACT_KEY
    SUPPLIER_PO_EXCESS_IMPACT_KEY = 'supplier_po_excess_impact' # EXCESS_IMPACT_KEY
    SUPPLIER_PO_USABLE_QUANTITY_KEY = 'supplier_po_usable_quantity' # This is the total usable quantity for all grns in supplier po
    SUPPLIER_PO_INHOUSED_EXCESS_QUANTITY_KEY = 'supplier_po_inhoused_excess_quantity'

    SUPPLIER_PO_PURCHASE_ORDER_ALLOCATED_TOTAL_REQUESTED_QUANTITY_KEY = 'supplier_po_purchase_order_allocated_total_requested_quantity'
    SUPPLIER_PO_PURCHASE_ORDER_ALLOCATED_TOTAL_PI_QUANTITY_KEY = 'supplier_po_purchase_order_allocated_total_pi_quantity'

    SHORT_TOLERANCE_VALUE = 'short_tolerance_value'
    EXCESS_TOLERANCE_VALUE = 'excess_tolerance_value'

    mh = MaterialUnitHelper()

    def has_total_value(self, total_value):
        has_total_value = False
        if total_value['quantity']:
            if total_value['quantity'] > 0:
                has_total_value = True
        return has_total_value

    def get_actual_delivery_dates(self, grns):
        invoice_ids = grns.values_list('supplier_pack_list__supplier_po_delivery_note__supplier_po_delivery_invoice_id', flat=True)
        actual_del_dates = SupplierActualDeliveryDate.objects.filter(supplier_po_delivery_invoice_id__in=invoice_ids)
        return actual_del_dates

    def get_delivery_dates(self, grns):
        actual_delivery_dates = self.get_actual_delivery_dates(grns)
        del_dates = SupplierDeliveryDate.objects.filter(actual_delivery_date__in=actual_delivery_dates)
        return del_dates

    # DS Reviewed 7/25 - post material fk change
    def get_delivery_date_materials(self, grns):
        delivery_dates = self.get_delivery_dates(grns)
        material_ids = self.get_purchase_order_bom_for_delivery_dates(delivery_dates).values_list('material_supplier__supplier_material__id', flat=True).distinct()
        materials = SupplierCustomerBrandMaterial.objects.filter(pk__in=material_ids)
        return materials
    
    def get_material_headers(self, material):
        headers = UserDefinedMaterial.get_material_headers(material.customer_brand_material.material_type)
        return headers

    def get_supplier_po_grn_materials(self, grns):
        grn_materials = SupplierPOGRNMaterial.objects.filter(supplier_po_grn__in=grns)
        return grn_materials

    def get_grn_materials(self, grns):
        grn_materials = self.get_supplier_po_grn_materials(grns).values_list('grn_material_id', flat=True)
        materials = SupplierCustomerBrandMaterial.objects.filter(pk__in=grn_materials)
        return materials

    def get_materials_in_delivery_date_and_grn_combined(self, grns):
        grn_materials = self.get_grn_materials(grns).values_list('pk', flat=True)
        del_date_materials = self.get_delivery_date_materials(grns).values_list('pk', flat=True)
        material_ids = set(list(grn_materials) + list(del_date_materials))
        materials = SupplierCustomerBrandMaterial.objects.filter(pk__in=material_ids).order_by('customer_brand_material__material_detail__generic_material__user_material__display_order')
        return materials

    def get_purchase_order_bom_for_delivery_dates(self, delivery_dates):
        delivery_date_boms = SupplierDeliveryDateQuantity.objects.filter(
            supplier_delivery_date__in=delivery_dates,
        )
        return delivery_date_boms

    def get_supplierpo_grn_materials(self, grns, material):
        grns = SupplierPOGRNMaterial.objects.filter(supplier_po_grn__in=grns, grn_material=material)
        return grns

    def get_allocation_summary_for_grns(self, purchase_order, material, grns, normalized_unit):
        allocation = PurchaseOrderAllocatedMaterial.objects.filter(
            in_house_material__supplier_material=material,
            purchase_order_bom__purchase_order=purchase_order,
            in_house_material__grn_material_detail__supplier_po_grn_material__supplier_po_grn__in=grns
        )
        allocated_quantity = calculate_queryset_total_normalized_quantity(allocation, normalized_unit, 'allocated_quantity', 'allocated_quantity_units')
        data = get_quantity_dictionary(allocated_quantity, normalized_unit)
        return data

    def get_grns_data_summary(self, grns, material, material_normalized_unit):
        grn_materials = self.get_supplier_po_grn_materials(grns).filter(grn_material=material)
        indicated_quantity = calculate_queryset_total_normalized_quantity(grn_materials, material_normalized_unit, 'total_indicated_quantity', 'total_indicated_quantity_units')
        rejected_quantity = calculate_queryset_total_normalized_quantity(grn_materials, material_normalized_unit, 'total_qa_rejected_quantity', 'total_qa_rejected_quantity_units')

        qa_passed_quantity = calculate_queryset_total_normalized_quantity_from_property(grn_materials, material_normalized_unit, 'total_qa_passed_quantity', 'total_qa_passed_quantity', 'total_qa_passed_quantity_units')

        excess_quantity = calculate_queryset_total_normalized_quantity(grn_materials, material_normalized_unit, 'total_excess_quantity', 'total_excess_quantity_units')
        in_housed_excess_quantity = calculate_queryset_total_normalized_quantity(grn_materials, material_normalized_unit, 'total_excess_quantity', 'total_excess_quantity_units')# TODO fixed it. It should be inhoused excess.- check what is the difference?

        short_quantity = calculate_queryset_total_normalized_quantity(grn_materials, material_normalized_unit, 'total_deficit_quantity', 'total_deficit_quantity_units')
        actual_total_quantity = calculate_queryset_total_normalized_quantity(grn_materials, material_normalized_unit, 'total_actual_quantity', 'total_actual_quantity_units')

        total_in_housed_quantity = calculate_queryset_total_normalized_quantity_from_property(grn_materials, material_normalized_unit, 'total_in_housed_quantity', 'quantity', 'quantity_units') # This gets data from Inhousematerial
        usable_quantity = calculate_queryset_total_normalized_quantity(grn_materials, material_normalized_unit, 'usable_quantity', 'usable_quantity_units') # This gets data from calculated data

        grn_replacements = ReplacementQuantityDeliveryDate.objects.filter(supplier_po_grn_material__supplier_po_grn__in=grns)
        replacement_quantity = calculate_queryset_total_normalized_quantity(grn_replacements, material_normalized_unit, 'quantity', 'quantity_units')

        units_dict = {self.QUANTITY_UNITS_KEY: material_normalized_unit, self.QUANTITY_UNITS_DISPLAY_KEY: self.mh.all_measuring_units_dictionary[material_normalized_unit]}
        data = {
            self.GRN_INDICATED_QUANTITY_KEY: {
                self.QUANTITY_KEY: indicated_quantity,
                **units_dict
            },
            self.GRN_REJECTED_QUANTITY_KEY: {
                self.QUANTITY_KEY: rejected_quantity,
                **units_dict
            },
            self.GRN_QA_PASSED_QUANTITY_KEY: {
                self.QUANTITY_KEY: qa_passed_quantity,
                **units_dict

            },
            self.GRN_EXCESS_QUANTITY_KEY: {
                self.QUANTITY_KEY: excess_quantity,
                **units_dict
            },
            self.GRN_DEFICIT_QUANTITY_KEY: {
                self.QUANTITY_KEY: short_quantity,
                **units_dict
            },
            self.GRN_USABLE_QUANTITY_KEY: {
                self.QUANTITY_KEY: usable_quantity,
                **units_dict
            },
            self.GRN_TOTAL_ACTUAL_QUANTITY_KEY: {
                self.QUANTITY_KEY: actual_total_quantity,
                **units_dict
            },
            self.GRN_TOTAL_IN_HOUSED_QUANTITY_KEY: {
                self.QUANTITY_KEY: total_in_housed_quantity,
                **units_dict
            },
            self.GRN_IN_HOUSED_EXCESS_KEY: {
                self.QUANTITY_KEY: in_housed_excess_quantity,
                **units_dict
            },
            self.GRN_REQUIRES_REPLACEMENT_QUANTITY_KEY: {
                self.QUANTITY_KEY: replacement_quantity,
                **units_dict
            },

        }
        return data

    def get_rejection_and_excess_or_deficit_impact(self, summary_data, material_unit):
        default_quantity = {self.QUANTITY_KEY: 0, self.QUANTITY_UNITS_KEY: material_unit, self.QUANTITY_UNITS_DISPLAY_KEY: self.mh.all_measuring_units_dictionary[material_unit]}
        purchase_order_allocations = summary_data[self.PURCHASE_ORDER_ALLOCATIONS_KEY]
        rejected_quantity = summary_data[self.GRN_REJECTED_QUANTITY_KEY]
        in_housed_deficit_quantity = summary_data[self.GRN_DEFICIT_QUANTITY_KEY]

        in_housed_excess_quantity = summary_data[self.GRN_IN_HOUSED_EXCESS_KEY]
        normalized_rejected_quantity = self.mh.convert_to_units(material_unit, rejected_quantity[self.QUANTITY_KEY], rejected_quantity[self.QUANTITY_UNITS_KEY])
        normalized_in_housed_deficit_quantity = self.mh.convert_to_units(material_unit, in_housed_deficit_quantity[self.QUANTITY_KEY], in_housed_deficit_quantity[self.QUANTITY_UNITS_KEY])
        normalized_in_housed_excess_quantity = self.mh.convert_to_units(material_unit, in_housed_excess_quantity[self.QUANTITY_KEY], in_housed_excess_quantity[self.QUANTITY_UNITS_KEY])

        allocated_rejection_amount = 0
        allocated_deficit_amount = 0
        allocated_excess_amount = 0

        total_delivery_quantity = 0
        # Sort based on allocation difference
        for purchase_order_allocation in purchase_order_allocations:
            if not purchase_order_allocation.get(self.SUPPLIER_PO_REJECTION_IMPACT_KEY, None):
                purchase_order_allocation[self.SUPPLIER_PO_REJECTION_IMPACT_KEY] = {**default_quantity}
                purchase_order_allocation[self.SUPPLIER_PO_EXCESS_IMPACT_KEY] = {**default_quantity}
                purchase_order_allocation[self.SUPPLIER_PO_DEFICIT_IMPACT_KEY] = {**default_quantity}

            quantity_unit = purchase_order_allocation[self.DELIVERY_DATE_PURCHASE_ORDER_ALLOCATED_PI_QUANTITY][self.QUANTITY_UNITS_KEY]
            delivery_date_ordered_quantity = self.mh.convert_to_units(material_unit, purchase_order_allocation[self.DELIVERY_DATE_PURCHASE_ORDER_ALLOCATED_PI_QUANTITY][self.QUANTITY_KEY], quantity_unit)

            allocated_quantity_unit = purchase_order_allocation[self.SUPPLIER_PO_PURCHASE_ORDER_ACTUAL_ALLOCATED_QUANTITY][self.QUANTITY_UNITS_KEY]
            allocated_quantity = self.mh.convert_to_units(material_unit, purchase_order_allocation[self.SUPPLIER_PO_PURCHASE_ORDER_ACTUAL_ALLOCATED_QUANTITY][self.QUANTITY_KEY], allocated_quantity_unit)

            quantity_difference = allocated_quantity - delivery_date_ordered_quantity # Positive means surplus in del date quantity, negative means deficit (can be due to rejection or deficit in quantity sent)
            purchase_order_allocation[self.DIFFERENCE_DATA_KEY] = {self.QUANTITY_KEY: quantity_difference, self.QUANTITY_UNITS_KEY: material_unit}
            total_delivery_quantity += delivery_date_ordered_quantity

            unallocated_rejection_amount = normalized_rejected_quantity - allocated_rejection_amount
            unallocated_deficit_amount = normalized_in_housed_deficit_quantity - allocated_deficit_amount
            unallocated_excess_amount = normalized_in_housed_excess_quantity - allocated_excess_amount
            if quantity_difference < 0:
                po_distributed_amount = 0
                if unallocated_rejection_amount > 0 :
                    if unallocated_rejection_amount < abs(quantity_difference):
                        allocation_rejection_impact = unallocated_rejection_amount
                    else:
                        allocation_rejection_impact = abs(quantity_difference)
                    po_distributed_amount += allocation_rejection_impact
                    allocated_rejection_amount += allocation_rejection_impact
                    purchase_order_allocation[self.SUPPLIER_PO_REJECTION_IMPACT_KEY][self.QUANTITY_KEY] = allocation_rejection_impact

                # Allocate remaining quantiy by the deficit, if there is any
                remaining_quantity_to_allocate = abs(quantity_difference) - po_distributed_amount
                if remaining_quantity_to_allocate > 0 and unallocated_deficit_amount > 0:
                    if unallocated_deficit_amount < abs(remaining_quantity_to_allocate):
                        allocation_deficit_impact = unallocated_rejection_amount
                    else:
                        allocation_deficit_impact = abs(remaining_quantity_to_allocate)
                    po_distributed_amount += allocation_deficit_impact
                    allocated_deficit_amount += allocation_deficit_impact
                    purchase_order_allocation[self.SUPPLIER_PO_DEFICIT_IMPACT_KEY][self.QUANTITY_KEY] = allocation_deficit_impact
            elif quantity_difference > 0 and unallocated_excess_amount > 0:
                if unallocated_excess_amount < abs(quantity_difference):
                    allocation_excess_impact = unallocated_excess_amount
                else:
                    allocation_excess_impact = abs(quantity_difference)
                allocated_excess_amount += allocation_excess_impact
                purchase_order_allocation[self.SUPPLIER_PO_EXCESS_IMPACT_KEY][self.QUANTITY_KEY] = allocation_excess_impact
        summary_data[self.PURCHASE_ORDER_ALLOCATIONS_KEY] = purchase_order_allocations

    def get_delivery_date_quantities(self, supplier_po, delivery_dates, material):
        quantities = supplier_po.get_supplier_po_material_quantity(material, delivery_dates)
        po_planned_replacements = supplier_po.get_supplier_po_deliveries_replacement_quantity(material, delivery_dates)

        data = {
            self.DELIVERY_DATE_REQUESTED_QUANTITY_KEY: quantities['requested_quantity'],
            self.DELIVERY_DATE_PI_QUANTITY_KEY: quantities['pi_quantity'],
            self.DELIVERY_DATE_PLANNED_REPLACEMENT_QUANTITY_KEY: po_planned_replacements
        }
        return data

    def get_supplier_po_quantities(self, supplier_po, supplier_material):
        material_unit = supplier_material.customer_brand_material.material_normalized_measuring_unit

        quantities = supplier_po.get_supplier_po_material_quantity(supplier_material)
        supplier_po_data = supplier_po.get_supplier_po_grn_material_summary(supplier_material)

        normalized_pi_quantity = convert_quantity_to_unit(material_unit, quantities['pi_quantity']['quantity'], quantities['pi_quantity']['quantity_units'])
        normalized_grn_quantity = convert_quantity_to_unit(material_unit, supplier_po_data[self.GRN_USABLE_QUANTITY_KEY]['quantity'], supplier_po_data[self.GRN_USABLE_QUANTITY_KEY]['quantity_units'])
        inhoused_excess_quantity = normalized_pi_quantity['quantity'] - normalized_grn_quantity['quantity']

        data = {
            self.TOTAL_SUPPLIER_PO_PI_QUANTITY_KEY: quantities['requested_quantity'],
            self.TOTAL_SUPPLIER_PO_REQUESTED_ORDER_QUANTITY: quantities['pi_quantity'],
            self.SUPPLIER_PO_USABLE_QUANTITY_KEY: supplier_po_data[self.GRN_USABLE_QUANTITY_KEY],
            self.SUPPLIER_PO_INHOUSED_EXCESS_QUANTITY_KEY: get_quantity_dictionary(inhoused_excess_quantity, material_unit)
        }

        if supplier_po.po_club:
            data[self.TOTAL_PO_CLUB_REQUIRED_QUANTITY] = supplier_po.po_club.get_po_club_material_required_quantity(
                supplier_material.customer_brand_material)
        return data


    def get_po_club_grns_material_breakdown(self, po_club, grns, supplier_po):
        delivery_dates = self.get_delivery_dates(grns)
        purchase_orders = PurchaseOrder.objects.none()
        if po_club:
            purchase_orders = po_club.get_purchase_orders()
        materials = self.get_materials_in_delivery_date_and_grn_combined(grns)
        material_data = []

        for material in materials:
            ud_material = material.customer_brand_material.get_user_defined_material()
            material_normalized_unit = self.mh.get_normalized_unit_based_on_category(ud_material.consumption_measurement_unit)
            material_grn_data = self.get_grns_data_summary(grns, material, material_normalized_unit)
            units_dict = {self.QUANTITY_UNITS_KEY: material_normalized_unit, self.QUANTITY_UNITS_DISPLAY_KEY: self.mh.all_measuring_units_dictionary[material_normalized_unit]}

            # po_club_bom = PurchaseOrderBom.objects.filter(purchase_order__actual_po_club=po_club, material=material.customer_brand_material)

            supplier_po_quantities = self.get_supplier_po_quantities(supplier_po, material)
            delivery_date_quantities = self.get_delivery_date_quantities(supplier_po, delivery_dates, material)
            club_allocations = PurchaseOrderAllocatedMaterial.objects.filter(purchase_order_bom__purchase_order__actual_po_club=po_club, in_house_material__supplier_material=material)
            allocated_total_quantity = calculate_queryset_total_normalized_quantity(club_allocations, material_normalized_unit, 'allocated_quantity', 'allocated_quantity_units')

            supplier_po_excess_and_deficit = supplier_po.get_shortage_and_excess_quantity(material)
            excess_tolerance = convert_quantity_to_unit(material_normalized_unit, supplier_po_excess_and_deficit['excess']['quantity'], supplier_po_excess_and_deficit['excess']['quantity_units'])['quantity']
            short_tolerance = convert_quantity_to_unit(material_normalized_unit, supplier_po_excess_and_deficit['deficit']['quantity'], supplier_po_excess_and_deficit['deficit']['quantity_units'])['quantity']

            po_break_down = {
                'material': material.get_attributes(),
                self.HEADERS_KEY: self.get_material_headers(material),
                self.TOTAL_CLUB_BOM_ALLOCATED_QUANTITY: {self.QUANTITY_KEY: allocated_total_quantity, **units_dict},
                self.SHORT_TOLERANCE_VALUE: {self.QUANTITY_KEY: short_tolerance, **units_dict},
                self.EXCESS_TOLERANCE_VALUE: {self.QUANTITY_KEY: excess_tolerance, **units_dict},
                **supplier_po_quantities,
                **material_grn_data,
                **delivery_date_quantities
            }

            # rejected_quantity = material_grn_data['grn_rejected_quantity']
            # excess_quantity = material_grn_data['grn_short_quantity']
            # grn_deficit_quantity = material_grn_data['grn_deficit_quantity']
            purchase_order_allocations = []
            # total_delivery_date_quantity = 0
            all_pos_required_quantity = 0
            for purchase_order in purchase_orders:
                po_req_quantity = purchase_order.get_material_required_quantity(material.customer_brand_material)
                all_pos_required_quantity += po_req_quantity['quantity']

                po_supplier_po_total_quantity = supplier_po.get_material_purchase_order_allocated_quantity(material, purchase_order)
                po_allocated_quantity = supplier_po.get_material_purchase_order_allocated_quantity(material, purchase_order, delivery_dates)


                deliveries_po_club_allocations = club_allocations.filter(purchase_order_bom__purchase_order=purchase_order, in_house_material__grn_material_detail__supplier_po_grn_material__supplier_po_grn__in=grns).distinct()
                deliveries_total_allocation_quantity = calculate_queryset_total_normalized_quantity(deliveries_po_club_allocations, material_normalized_unit, 'allocated_quantity', 'allocated_quantity_units')

                po_total_allocations = club_allocations.filter(purchase_order_bom__purchase_order=purchase_order)
                supplier_po_allocated_quantity = self.get_allocation_summary_for_grns(purchase_order, material, grns, material_normalized_unit)
                po_total_allocation_quantity = calculate_queryset_total_normalized_quantity(po_total_allocations, material_normalized_unit, 'allocated_quantity', 'allocated_quantity_units')

                purchase_order_allocations.append({
                    self.PURCHASE_ORDER_REQUIRED_QUANTITY: po_req_quantity,
                    self.DELIVERY_DATE_PURCHASE_ORDER_ALLOCATED_QUANTITY: po_allocated_quantity['requested_quantity'],
                    self.DELIVERY_DATE_PURCHASE_ORDER_ALLOCATED_PI_QUANTITY: po_allocated_quantity['pi_quantity'],
                    self.SUPPLIER_PO_PURCHASE_ORDER_ALLOCATED_TOTAL_REQUESTED_QUANTITY_KEY: po_supplier_po_total_quantity['requested_quantity'],
                    self.SUPPLIER_PO_PURCHASE_ORDER_ALLOCATED_TOTAL_PI_QUANTITY_KEY: po_supplier_po_total_quantity['pi_quantity'],
                    # self.DELIVERY_DATE_QUANTITY_KEY: { # TODO - this was removed fix it in front end
                    #     self.QUANTITY_KEY: delivery_date_quantity,
                    #     **units_dict
                    # },
                    self.GRNS_PURCHASE_ORDER_ALLOCATED_QUANTITY: {
                        self.QUANTITY_KEY: deliveries_total_allocation_quantity,
                        **units_dict
                    },
                    self.PURCHASE_ORDER_ALLOCATED_QUANTITY: {
                        self.QUANTITY_KEY: po_total_allocation_quantity,
                        **units_dict
                    },
                    self.SUPPLIER_PO_PURCHASE_ORDER_ACTUAL_ALLOCATED_QUANTITY: supplier_po_allocated_quantity,
                    'po_id': purchase_order.pk,
                    'purchase_order_name': purchase_order.name,
                    'purchase_order_display_number': purchase_order.display_number,
                })
            po_break_down[self.PURCHASE_ORDER_ALLOCATIONS_KEY] = purchase_order_allocations
            po_break_down[self.RELATED_PURCHASER_ORDERS_REQUIRED_TOTAL_QUANTITY] = {self.QUANTITY_KEY: all_pos_required_quantity, **units_dict}
            self.get_rejection_and_excess_or_deficit_impact(po_break_down, material_normalized_unit)
            material_data.append(po_break_down)
            # break
        return material_data


class GRNSummary(GRNMaterialSummaryCalculatorMixin):

    def __init__(self, grn):
        self.grn_queryset = SupplierPOGRN.objects.filter(pk=grn.pk).filter(state=SupplierPOGRN.GRN_COMPLETE)
        self.supplier_po = grn.supplier_po
        self.po_club = self.supplier_po.po_club

    def get_grn_summarized_data(self):
        data = self.get_po_club_grns_material_breakdown(self.po_club, self.grn_queryset, self.supplier_po)
        return data


class SupplierPOSummary(GRNMaterialSummaryCalculatorMixin):

    def __init__(self, supplier_po):
        self.grn_queryset = supplier_po.get_completed_grns()
        self.po_club = supplier_po.po_club
        self.supplier_po = supplier_po

    def get_supplier_po_summarized_data(self):
        data = self.get_po_club_grns_material_breakdown(self.po_club, self.grn_queryset, self.supplier_po)
        return data


class DeliveryNoteSummary(GRNMaterialSummaryCalculatorMixin):

    def __init__(self, delivery_note, supplier_po):
        self.grn_queryset = delivery_note.get_supplier_po_delivery_note_grns(supplier_po, True)
        self.supplier_po = supplier_po
        self.po_club = self.supplier_po.po_club

    def get_delivery_note_summarized_data(self):
        data = self.get_po_club_grns_material_breakdown(self.po_club, self.grn_queryset, self.supplier_po)
        return data


class PackListSummary(GRNMaterialSummaryCalculatorMixin):

    def __init__(self, pack_list, supplier_po):
        self.grn_queryset = pack_list.get_supplier_po_pack_list_grns(supplier_po, True)
        self.supplier_po = supplier_po
        self.po_club = self.supplier_po.po_club

    def get_pack_list_summarized_data(self):
        data = self.get_po_club_grns_material_breakdown(self.po_club, self.grn_queryset, self.supplier_po)
        return data


class InvoiceSummary(GRNMaterialSummaryCalculatorMixin):

    def __init__(self, invoice, supplier_po):
        self.grn_queryset = invoice.get_supplier_po_invoice_grns(supplier_po, True)
        self.supplier_po = supplier_po
        self.po_club = self.supplier_po.get_po_club_or_none()

    def get_invoice_summarized_data(self):
        data = self.get_po_club_grns_material_breakdown(self.po_club, self.grn_queryset, self.supplier_po)
        return data


# Reviewed on 08/17 and its good
class DeliveryDateSummary(GRNMaterialSummaryCalculatorMixin):
    DELIVERY_DATE_CONFIRMED_ORDER_QUANTITY_KEY = 'delivery_date_confirmed_order_quantity'
    DELIVERY_DATE_REPLACEMENT_QUANTITY_KEY = 'delivery_date_replacement_quantity'

    def __init__(self, delivery_date):
        self.grn_queryset = delivery_date.get_delivery_date_grns(True)
        self.supplier_po = delivery_date.general_po_supplier.supplier_po
        self.delivery_date = delivery_date
        self.po_club = delivery_date.general_po_supplier.general_po.po_club

    def get_delivery_date_summarized_data(self):
        data = self.get_po_club_grns_material_breakdown(self.po_club, self.grn_queryset, self.supplier_po)
        return data

    def get_materials_in_delivery_date_and_grn_combined(self, grns):
        materials = super().get_materials_in_delivery_date_and_grn_combined(grns).values_list('pk', flat=True).distinct()
        material_ids = SupplierDeliveryDateQuantity.objects.filter(
            supplier_delivery_date=self.delivery_date
        ).values_list('material_supplier__supplier_material_id', flat=True).distinct()
        materials = SupplierCustomerBrandMaterial.objects.filter(
            Q(pk__in=material_ids) | Q(pk__in=materials)
        ).distinct()
        return materials

    def get_delivery_dates(self, grns):
        deliveries = SupplierDeliveryDate.objects.filter(pk=self.delivery_date.pk)
        return deliveries

    def get_grns_data_summary(self, grns, material, material_normalized_unit):
        data = super().get_grns_data_summary(grns, material, material_normalized_unit)
        return data


# TODO Major - fix this the data returned here is wrong. what is this used for?
class POClubDeliverySummary(GRNMaterialSummaryCalculatorMixin):

    def __init__(self, po_club, supplier_po):

        self.pos = PurchaseOrder.objects.none()
        if po_club:
            self.pos = po_club.get_purchase_orders()

        self.po_club = po_club
        self.supplier_po = supplier_po

    def get_materials_in_delivery_date_and_grn_combined(self, grns):
        materials = super().get_materials_in_delivery_date_and_grn_combined(grns).filter(pk=self.current_material.id)
        return materials

    def get_formatted_summary(self, grns):
        data = self.get_po_club_grns_material_breakdown(self.po_club, grns, self.supplier_po)
        if data:
            data = data[0] # TODO MAJOR - What is happening here? How can this return the data we need?
            data.pop('material', None)
        else:
            data = {}
        return data

    def get_actual_delivery_date_summarized_data(self):
        data = {
            'pos': [],
            'materials': []
        }
        for po in self.pos:
            data['pos'].append(
                {
                    'purchase_order_id': po.id,
                    'purchase_order_name': po.name
                }
            )

        materials = self.supplier_po.get_supplier_po_material_list()

        for material in materials:
            delivery_counter = 0
            self.current_material = material
            delivery_dates = self.supplier_po.get_material_delivery_dates(material)
            grn_ids = SupplierPOGRNMaterial.objects.filter(
                grn_material=material,
               supplier_po_grn__supplier_po=self.supplier_po
            ).values_list('supplier_po_grn', flat=True)

            grns = SupplierPOGRN.objects.filter(id__in=grn_ids)
            attributes = material.get_attributes()
            attributes['delivery_dates'] = []

            for delivery_date in delivery_dates:
                actual_delivery_date = None
                invoice_display_number = None
                invoice_id = None
                delivery_counter += 1
                display_value =  f"Delivery {delivery_counter}"
                summary_data = self.get_formatted_summary(grns)
                invoice = delivery_date.get_delivery_invoice()

                if invoice:
                    invoice_display_number = invoice.display_number
                    invoice_id = invoice.id

                if delivery_date.actual_delivery_date is not None:
                    actual_delivery_date = delivery_date.actual_delivery_date.delivery_date
                    
                attributes['delivery_dates'].append({
                    'id': delivery_date.id,
                    'display_value': display_value,
                    'confirmed_delivery_date': delivery_date.confirmed_delivery_date,
                    'actual_delivery_date': actual_delivery_date,
                    'invoice_display_number': invoice_display_number,
                    'invoice_id': invoice_id,
                    'summary': summary_data
                })
            data['materials'].append(attributes)
        return data
    

class InvoiceDeliverySummary(GRNMaterialSummaryCalculatorMixin):

    def __init__(self, invoice, supplier_po):
        self.supplier_po = supplier_po
        self.materials = self.supplier_po.general_po_supplier.general_po.get_materials_in_general_po()
        self.po_club = self.supplier_po.get_po_club_or_none()
        self.invoice = invoice
        self.pos = self.po_club.get_purchase_orders() if self.supplier_po.general_po_supplier.general_po.po_club else None
        #self.grn_queryset = invoice.get_supplier_po_invoice_grns(self.supplier_po, True)
        self.grns = invoice.get_supplier_po_invoice_grns(self.supplier_po, True)

    def get_materials_in_delivery_date_and_grn_combined(self, grns):
        materials = super().get_materials_in_delivery_date_and_grn_combined(grns).filter(pk=self.current_material.id)
        return materials
    
    def get_rejected_batch_color_tone_details(self, grn_material):
        data = []

        batch_ids = grn_material.supplierpogrnmaterialdetail_set.all().values_list('batch_number', flat=True)
        batches = FabricGRNBatchNumber.objects.filter(
            id__in=batch_ids
        )

        for batch in batches:
            color_tones = batch.get_rejected_color_tones()
            if color_tones:
                batch_data = {
                    'batch_id': batch.id,
                    'batch_name': batch.batch_number,
                    'inspection_status': batch.inspection_status,
                    'color_tones': []
                }
                for color_tone in color_tones:
                    batch_data['color_tones'].append(
                        {
                            'color_tone_id': color_tone.id,
                            'display_name': color_tone.display_value,
                            'grn': batch.grn_material.supplier_po_grn.id
                        }
                    )
                data.append(batch_data)
        return data
    
    def get_fabric_batch_details(self, grn_material):
        pack_data = {}
        is_fabric = grn_material.grn_material.customer_brand_material.material_type == Material.FABRIC_MATERIAL
        if is_fabric:
            pack = grn_material.supplier_po_grn.supplier_pack_list
            pack_data = {
                'id': pack.id,
                'pack_list_name': pack.display_number,
                'batches': []
            }
            batches = FabricGRNBatchNumber.objects.filter(grn_material=grn_material, grn_material__supplier_po_grn__supplier_pack_list=pack).order_by('batch_number')
            
            for batch in batches:
                rolls = grn_material.supplierpogrnmaterialdetail_set.filter(batch_number=batch).order_by('id')
                batch_data = {
                    'id': batch.id,
                    'batch_name': batch.batch_number,
                    'inspection_status': batch.inspection_status,
                    'rolls': []
                }
                
                for roll in rolls:
                    color_tone_data = None
                    if roll.fabricgrndetail.color_tone:
                        color_tone_data = FabricColorToneSerializer(roll.fabricgrndetail.color_tone, many=False).data
                    batch_data['rolls'].append(
                        {
                            'id': roll.id,
                            'pack_number': roll.fabricgrndetail.pack_number,
                            'qa_passed_quantity': roll.qa_passed_quantity,
                            'quantity': roll.actual_quantity,
                            'quantity_units': roll.get_actual_quantity_units_display(),
                            'color_tone': color_tone_data,
                            'is_valid_color_tone': roll.fabricgrndetail.is_valid_color_tone,
                            'excess_quantity': get_quantity_dictionary(roll.excess_quantity, roll.excess_quantity_units)
                        }
                    )
                pack_data['batches'].append(batch_data)
        return pack_data
        
    # def get_raise_type(self, grn_material):
    #     NOT_CREATED_TYPE = 'not_created'
    #     REPLACEMENT_TYPE = 'replacement'
    #     DEBIT_NOTE_TYPE = 'debit_note'
    #     COMBINE_TYPE = 'combine'

    #     is_debit_note_created = grn_material.is_debit_note_created(self.invoice)
    #     is_replacements_created = grn_material.is_replacements_created()

    #     if is_debit_note_created and is_replacements_created:
    #         type = COMBINE_TYPE
    #     elif is_debit_note_created and not is_replacements_created:
    #         type = DEBIT_NOTE_TYPE
    #     elif not is_debit_note_created and is_replacements_created:
    #         type = REPLACEMENT_TYPE
    #     else:
    #         type = NOT_CREATED_TYPE
    #     return type

    def get_formatted_summary(self, grns):
        data = self.get_po_club_grns_material_breakdown(self.po_club, grns, self.supplier_po)
        if data:
            data = data[0]
            data.pop('material', None)
        else:
            data = {}
        return data

    def get_current_delivery_data(self, grn_material, deliveries):

        grn = grn_material.supplier_po_grn
        grn_queryset = SupplierPOGRN.objects.filter(pk=grn.pk)
        summary_data = self.get_formatted_summary(grn_queryset)

        actual_delivery_date = ""
        confirmed_delivery_date = ""

        for delivery_date in deliveries:
            if delivery_date.actual_delivery_date is not None: # TODO Mahesh - actual delivery date should be passed as a param since it is one to one mapping with the invoice
                actual_delivery_date += str(delivery_date.actual_delivery_date.delivery_date)

            if delivery_date.confirmed_delivery_date is not None:
                confirmed_delivery_date += str(delivery_date.confirmed_delivery_date)
        roll_details = self.get_fabric_batch_details(grn_material)
        rejected_color_tones = self.get_rejected_batch_color_tone_details(grn_material)
        color_tone_remediation = self.get_color_tone_remediation(grn_material)
        defected_batches_remediation = self.get_defected_batches_remediation(grn_material)
        excess_remediation = self.get_excess_batches_remediation(grn_material)
        short_remediation = self.get_short_batches_remediation(grn_material)
        mismatch_remediation = self.get_mismatch_batches_remediation(grn_material)
        width_remediation = self.get_width_remediation(grn_material)

        data = {
            'delivery_date_id': delivery_date.id,
            'display_value': delivery_date.display_number,
            'confirmed_delivery_date': confirmed_delivery_date,
            'actual_delivery_date': actual_delivery_date,
            'summary': summary_data,
            'roll_detalis': roll_details,
            'rejected_color_tones': rejected_color_tones,
            'color_tone_remediation': color_tone_remediation,
            'defected_batches_remediation': defected_batches_remediation,
            'excess_remediation': excess_remediation,
            'short_remediation': short_remediation,
            'mismatch_remediation': mismatch_remediation,
            'width_remediation': width_remediation,
        }
        return data

    def get_previous_delivery_data(self, grn_material, deliveries):
        data = []
        grn_ids = SupplierPOGRNMaterial.objects.filter(
                grn_material=grn_material.grn_material, 
                supplier_po_grn__supplier_po=self.supplier_po
            ).values_list('supplier_po_grn', flat=True)
        grns = SupplierPOGRN.objects.filter(id__in=grn_ids)
        summary_data = self.get_formatted_summary(grns)

        for delivery_date in deliveries:
            summary_data = self.get_formatted_summary(grns)

            if delivery_date.actual_delivery_date is not None:
                actual_delivery_date = delivery_date.actual_delivery_date.delivery_date
                
            data.append({
                'id': delivery_date.id,
                'display_value': delivery_date.display_number,
                'confirmed_delivery_date': delivery_date.confirmed_delivery_date,
                'actual_delivery_date': actual_delivery_date,
                'summary': summary_data
            })
        return data
    
    def get_debit_note_details(self, grn_material, reason):
        data = {}
        debit_note_material = get_object_or_none(
            DebitNoteMaterial,
            {
                'debit_note__commercial_invoice': self.invoice,
                'supplier_po_grn_material': grn_material,
                'reason': reason
            }
        )
        if debit_note_material:
            data = {
                'debit_note_material_id': debit_note_material.id,
                'debit_note_id': debit_note_material.debit_note.id,
                'display_number': debit_note_material.debit_note.display_number,
                'unit_price': debit_note_material.unit_price,
                'unit_price_units': debit_note_material.unit_price,
                'total_price': debit_note_material.total_price,
                'quantity': debit_note_material.get_total_quantity()
            }
        return data
    
    def get_replacement_quantity_details(self, grn_material, reason):
        data = []
        deliveries = grn_material.get_replacement_delivery_details(reason)
        for delivery in deliveries:
            data.append(
                {
                'delivery_id': delivery.id,
                'display_number': delivery.replacement_expected_delivery_date.display_number,
                'confirmed_delivery_date': delivery.replacement_expected_delivery_date.confirmed_delivery_date,
                'actual_delivery_date': delivery.replacement_expected_delivery_date.actual_delivery_date.delivery_date if delivery.replacement_expected_delivery_date.actual_delivery_date else None,
                'quantity': delivery.get_quantity_details()
                }
            )
        return data
    
    def get_batch_wise_roll_details(self, grn_material, reason):
        data = []
        is_fabric = grn_material.grn_material.customer_brand_material.material_type == Material.FABRIC_MATERIAL

        if is_fabric:
            batch_ids = grn_material.supplierpogrnmaterialdetail_set.all().values_list('batch_number', flat=True)
            grn_material_details = grn_material.supplierpogrnmaterialdetail_set.all()
            batches = FabricGRNBatchNumber.objects.filter(
                id__in=batch_ids
            )
            for batch in batches:
                rolls = None
                if reason == DebitNoteMaterial.REJECTED_COLOR_TONE_REASON:
                    rolls = batch.get_color_tone_rejected_rolls(grn_material_details)
                if reason == DebitNoteMaterial.REJECTED_DEFECT_DEBIT_NOTE_REASON:
                    rolls = batch.get_defected_batches_remediation(grn_material_details)
                if reason == DebitNoteMaterial.EXCESS_REASON:
                    rolls = batch.get_excess_batches_remediation(grn_material_details)

                if rolls:
                    batch_data = {
                        'batch_id': batch.id,
                        'batch_name': batch.batch_number,
                        'supplier_po_grn_material_id': batch.grn_material.id,
                        'rolls': []
                    }
                    
                    for roll in rolls:
                        batch_data['rolls'].append(
                            {
                                'id': roll.id,
                                'pack_number': roll.fabricgrndetail.pack_number,
                                'quantity': roll.actual_quantity,
                                'quantity_units': roll.get_actual_quantity_units_display(),
                                'excess_quantity': get_quantity_dictionary(roll.excess_quantity, roll.excess_quantity_units)
                            }
                        )
                    data.append(batch_data)
        return data
    
    def get_color_tone_remediation(self, grn_material):
        pack_data = {}
        is_fabric = grn_material.grn_material.customer_brand_material.material_type == Material.FABRIC_MATERIAL
        if is_fabric:
            pack = grn_material.supplier_po_grn.supplier_pack_list
            total_quantity = grn_material.get_color_tone_rejected_total_replacement_quantity()
            pack_data = {
                'id': pack.id,
                'pack_list_name': pack.display_number,
                'total_quantity': total_quantity,
                'unit_price': grn_material.grn_price,
                'total_price': grn_material.get_price_from_quantity(total_quantity['quantity']),
                'batches': self.get_batch_wise_roll_details(grn_material, DebitNoteMaterial.REJECTED_COLOR_TONE_REASON),
                'debit_note_details': self.get_debit_note_details(grn_material, DebitNoteMaterial.REJECTED_COLOR_TONE_REASON),
                'replacements_details': self.get_replacement_quantity_details(grn_material, ReplacementQuantityDeliveryDate.COLOR_TONE_REJECTED_REPLACEMENT_REASON),
                'raise_type': None,#self.get_raise_type(grn_material),
                'has_total_value': self.has_total_value(total_quantity)
            }
        return pack_data
    
    def get_cpi_details(self, grn_material):
        data = []
        is_fabric = grn_material.grn_material.material_type == Material.FABRIC_MATERIAL
        if is_fabric:
            deliveries = grn_material.get_replacement_delivery_details()
            for delivery in deliveries:
                data.append(
                    {
                    'delivery_id': delivery.id,
                    'display_number': None,
                    'confirmed_delivery_date': delivery.replacement_expected_delivery_date.confirmed_delivery_date,
                    'actual_delivery_date': delivery.replacement_expected_delivery_date.actual_delivery_date.delivery_date if delivery.replacement_expected_delivery_date.actual_delivery_date else None,
                    'quantity': delivery.get_quantity_details()
                    }
                )
        return data
    
    def get_defected_batches_remediation(self, grn_material):
        pack_data = {}
        pack = grn_material.supplier_po_grn.supplier_pack_list
        total_quantity = get_quantity_dictionary(grn_material.total_qa_rejected_quantity, grn_material.total_qa_rejected_quantity_units) 
        pack_data = {
            'id': pack.id,
            'pack_list_name': pack.display_number,
            'total_quantity': total_quantity,
            'unit_price': grn_material.grn_price,
            'total_price': total_quantity['quantity'],
            'batches': self.get_batch_wise_roll_details(grn_material, DebitNoteMaterial.REJECTED_DEFECT_DEBIT_NOTE_REASON),
            'debit_note_details': self.get_debit_note_details(grn_material, DebitNoteMaterial.REJECTED_DEFECT_DEBIT_NOTE_REASON),
            'replacements_details': self.get_replacement_quantity_details(grn_material, ReplacementQuantityDeliveryDate.DEFECT_REJECTED_REPLACEMENT_REASON),
            'cpi_details': self.get_debit_note_details(grn_material, DebitNoteMaterial.REJECTED_DEFECT_CPI_REASON),
            'raise_type': None, #self.get_raise_type(grn_material),
            'has_total_value': self.has_total_value(total_quantity)
        }
        return pack_data
    
    def get_excess_batches_remediation(self, grn_material):
        pack_data = {}
        pack = grn_material.supplier_po_grn.supplier_pack_list
        total_quantity = get_quantity_dictionary(grn_material.total_excess_quantity, grn_material.total_excess_quantity_units)
        pack_data = {
            'id': pack.id,
            'pack_list_name': pack.display_number,
            'total_quantity': total_quantity,
            'unit_price': grn_material.grn_price,
            'total_price': grn_material.get_price_from_quantity(total_quantity['quantity']),
            'batches': self.get_batch_wise_roll_details(grn_material, DebitNoteMaterial.EXCESS_REASON),
            'debit_note_details': self.get_debit_note_details(grn_material, DebitNoteMaterial.EXCESS_REASON),
            'raise_type': None, #self.get_raise_type(grn_material),
            'has_total_value': self.has_total_value(total_quantity)
        }
        return pack_data
    
    def get_short_batches_remediation(self, grn_material):
        total_shortage_quantity = get_quantity_dictionary(grn_material.total_deficit_quantity, grn_material.total_deficit_quantity_units)
        data = {
            'total_quantity': total_shortage_quantity,
            'unit_price': grn_material.grn_price,
            'total_price': grn_material.get_price_from_quantity(total_shortage_quantity['quantity']),
            'debit_note_details': self.get_debit_note_details(grn_material, DebitNoteMaterial.SHORT_REASON),
            'replacements_details': self.get_replacement_quantity_details(grn_material, ReplacementQuantityDeliveryDate.SHORT_REPLACEMENT_REASON),
            'raise_type': None, #self.get_raise_type(grn_material),
            'has_total_value': self.has_total_value(total_shortage_quantity)
        }
        return data
    
    def get_mismatch_batches_remediation(self, grn_material):
        total_quantity = get_quantity_dictionary(grn_material.mismatch_quantity, grn_material.mismatch_quantity_units)
        data = {
            'total_quantity': total_quantity,
            'unit_price': grn_material.grn_price,
            'total_price': grn_material.get_price_from_quantity(total_quantity['quantity']),
            'debit_note_details': self.get_debit_note_details(grn_material, DebitNoteMaterial.MISMATCH_REASON),
            'raise_type': None, #self.get_raise_type(grn_material),
            'has_total_value': total_quantity['quantity'] < 0
        }
        return data
    
    def get_width_remediation(self, grn_material):
        total_width_quantity = get_quantity_dictionary(grn_material.width_replacement_quantity, grn_material.width_replacement_quantity_units)
        data = {
            'total_quantity': total_width_quantity,
            'unit_price': grn_material.grn_price,
            'total_price': grn_material.get_price_from_quantity(total_width_quantity['quantity']),
            'debit_note_details': None,
            'replacements_details': self.get_replacement_quantity_details(grn_material, ReplacementQuantityDeliveryDate.WIDTH_MISMATCH_REPLACEMENT_REASON),
            'raise_type': None,
            'has_total_value': self.has_total_value(total_width_quantity)
        }
        return data
        
    def get_delivery_note_dispaly_numbers(self):
        data = []
        delivery_notes = self.invoice.supplierpoinvoicedeliverynote_set.all()
        for delivery_note in delivery_notes:
            data.append({
                'id': delivery_note.id,
                'display_number': delivery_note.display_number,
                'delivery_note': delivery_note.delivery_note.get_object_data() if delivery_note.delivery_note else None,
            })
        return data
    
    def get_invoice_delivery_date_summarized_data(self):

        data = {
            'pos': [],
            'data': [] # TODO Mahesh Question - should this be a dictionary?
        }
        if self.pos:
            for po in self.pos:
                data['pos'].append(
                    {
                        'purchase_order_id': po.id,
                        'purchase_order_name': po.name,
                        'display_number': po.display_number
                    }
                )

        data['data'] = {
            'id': self.invoice.id,
            'display_number': self.invoice.display_number,
            'is_editable': self.invoice.get_is_editable(),
            'supplier_po_id': self.supplier_po.id,
            'invoice': self.invoice.invoice.get_object_data() if self.invoice.invoice else None,
            'performa_invoice': self.supplier_po.proforma_invoice.get_object_data() if self.supplier_po.proforma_invoice else None,
            'delivery_note_display_number': self.get_delivery_note_dispaly_numbers(),
            'grns': []
        }
        for grn in self.grns:
            grn_materials = grn.supplierpogrnmaterial_set.all().order_by('grn_material')
            grn_data = {
                'grn_id': grn.id,
                'display_number': grn.grn_number,
                'materials': []
            }
            
            for grn_material in grn_materials:
                self.current_material = grn_material.grn_material
                #current_delivery_dates = self.invoice.get_invoice_material_delivery_dates(grn_material.grn_material)
                current_delivery_dates = self.invoice.get_invoice_supplier_delivery_dates(self.supplier_po)
                if current_delivery_dates:
                    current_date = max(current_delivery_dates.values_list('actual_delivery_date__delivery_date', flat=True))
                    previous_delivery_dates = self.supplier_po.get_material_delivery_dates(grn_material.grn_material).filter(
                        actual_delivery_date__delivery_date__lte=current_date
                    ).exclude(id__in=current_delivery_dates.values_list('id', flat=True))
                    
                    attributes = grn_material.grn_material.get_attributes()
                    attributes['grn_material_id'] = grn_material.id
                    current_delivery_data = self.get_current_delivery_data(grn_material, current_delivery_dates)
                    previous_delivery_data = self.get_previous_delivery_data(grn_material, previous_delivery_dates)
                    attributes['current_delivery_data'] = current_delivery_data
                    attributes['previous_delivery_dates'] = previous_delivery_data
                    grn_data['materials'].append(attributes)
            data['data']['grns'].append(grn_data)
        return data