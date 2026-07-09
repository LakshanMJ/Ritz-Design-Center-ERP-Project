from django.db.models import Q, Sum
from marketing.models import PurchaseOrder, OrderCostingVersion, SizeCategory, Size, POSize, POCountry, POColorway, OrderInquiry, SupplierPOGRNMaterialDetail
from shared.utils import get_object_or_none
from random import randint


def validate_sizes(po_sizes):
    is_exist = False
    unique_po_size_set = set(po_sizes)
    unique_po_sizes_list = list(unique_po_size_set)
    size_categories = SizeCategory.objects.all()
    name_list = Q()
    abbreviation_list = Q()
    for q in [Q(name__iexact=n) for n in unique_po_sizes_list]:
        name_list |= q
    for q in [Q(abbreviation__iexact=n) for n in unique_po_sizes_list]:
        abbreviation_list |= q
    for size_category in size_categories:
        sizes_exist = Size.objects.filter(category=size_category).filter(Q(name_list | abbreviation_list))
        is_exist = sizes_exist.count() == len(unique_po_sizes_list)
        #print(sizes_exist.count(), len(unique_po_sizes_list))
        if is_exist:
            break
    return is_exist

def validate_sizes_from_costing_version(style, customer_id, po_sizes):
    costing_version = OrderCostingVersion.objects.filter(order__style_number=style, 
                                                         order__customer_id=customer_id, 
                                                         order__state=OrderInquiry.GENERAL_INFORMATION_COMPLETE_STATE).order_by('-id').first()
    size_category = costing_version.order.size_category
    is_exist = False
    unique_po_size_set = set(po_sizes)
    unique_po_sizes_list = list(unique_po_size_set)
    name_list = Q()
    abbreviation_list = Q()
    for q in [Q(name__iexact=n) for n in unique_po_sizes_list]:
        name_list |= q
    for q in [Q(abbreviation__iexact=n) for n in unique_po_sizes_list]:
        abbreviation_list |= q
    sizes_exist = Size.objects.filter(category=size_category).filter(Q(name_list | abbreviation_list))
    is_exist = sizes_exist.count() == len(unique_po_sizes_list)
    return is_exist

def mapping_po_sizes(po_id, po_number, style, customer_id, po_sizes):
    error = []
    #print(po_id, style, customer_id, po_sizes)
    po = get_object_or_none(PurchaseOrder, {'pk':po_id})
    costing_version = OrderCostingVersion.objects.filter(order__style_number=style, 
                                                         order__customer_id=customer_id, 
                                                         order__state=OrderInquiry.GENERAL_INFORMATION_COMPLETE_STATE).order_by('-id').first()
    #costing_version = get_object_or_none(OrderCostingVersion, {'order__style_number':style, 'order__customer_id':customer_id, 'order__state':OrderInquiry.GENERAL_INFORMATION_COMPLETE_STATE})
    #print(costing_version)
    if costing_version:
        po.costing_version = costing_version
        po.save()
        order_sizes = costing_version.order.get_order_sizes()
        for po_size in po_sizes:
            mapping_size = get_object_or_none(POSize, {'pk':po_size})
            if mapping_size:
                filter_size = order_sizes.filter(Q(size__name__iexact=mapping_size.po_size_name) | Q(size__abbreviation__iexact=mapping_size.po_size_name))[0]
                mapping_size.order_size = filter_size
                mapping_size.save()
    else:
        error.append({'errors':'Cannot find costing version for the PO %s, Sizes mapping aborted ' % str(po_number)})
    return error

def mapping_po_countries(po_id, po_number, style, customer_id, po_countries):
    error = []
    po = get_object_or_none(PurchaseOrder, {'pk':po_id})
    costing_version = get_object_or_none(OrderCostingVersion, {'order__style_number':style, 'order__customer_id':customer_id})
    if costing_version:
        po.costing_version = costing_version
        po.save()
        order_countries = costing_version.order.get_order_countries()
        for order_country in po_countries:
            mapping_country = get_object_or_none(POCountry, {'pk':order_country})
            filter_country = order_countries.filter(country__name__iexact=mapping_country.po_country_name)[0]
            mapping_country.order_country = filter_country
            mapping_country.save()
    else:
            error.append({'errors':'Cannot find costing version for the PO %s, Countries mapping aborted.'  % str(po_number)})
    return error

def mapping_po_colorways(po_id, po_number, style, customer_id, po_colorways):
    error = []
    po = get_object_or_none(PurchaseOrder, {'pk':po_id})
    costing_version = get_object_or_none(OrderCostingVersion, {'order__style_number':style, 'order__customer_id':customer_id})
    po.costing_version = costing_version
    po.save()
    order_colorways = costing_version.order.get_order_colorways()
    if order_colorways:
        for po_colorway in po_colorways:
            mapping_colorway = get_object_or_none(POColorway, {'pk':po_colorway})
            filter_colorway = order_colorways.filter(colorway__iexact=mapping_colorway.colorway)[0]
            mapping_colorway.order_colorway = filter_colorway
            mapping_colorway.save()
    else:
            error.append({'errors':'Cannot find costing version for the PO %s, Colorways mapping aborted.'  % str(po_number)})
    return error
    

class FabricGRNDetailInspection():

    def __init__(self, supplier_po_grn):
        self.supplier_po_grn  = supplier_po_grn
        self.supplier_po_grn_materials = self.supplier_po_grn.supplierpogrnmaterial_set.all()

    def get_batch_numbers(self, supplier_po_grn_material):
        return [supplier_po_grn_material_detail.batch_number
                for supplier_po_grn_material_detail in supplier_po_grn_material.supplierpogrnmaterialdetail_set.all().distinct('batch_number')
                if supplier_po_grn_material_detail.batch_number]

    def set_inspection(self):
        for supplier_po_grn_material in self.supplier_po_grn_materials:
            for batch_number in self.get_batch_numbers(supplier_po_grn_material):
                supplier_po_grn_material_details = supplier_po_grn_material.supplierpogrnmaterialdetail_set.all().filter(batch_number = batch_number)
                need_to_select = True
                batch_number_inspection_status = batch_number.set_inspection_status()
                if batch_number_inspection_status in [batch_number.INSPECTION_STATUS_INSPECTION_INPROGRESS, batch_number.INSPECTION_STATUS_INSPECTION_PASSED]:
                    need_to_select = False
                
                if supplier_po_grn_material_details.exclude(inspection_state = SupplierPOGRNMaterialDetail.INSPECTION_STATE_INSPECTION_NOT_NEED).exists():
                    need_to_select = False
                
                if batch_number_inspection_status == batch_number.INSPECTION_STATUS_INSPECTION_FAILED and supplier_po_grn_material_details.exclude(
                    inspection_state = SupplierPOGRNMaterialDetail.INSPECTION_STATE_INSPECTION_NOT_NEED
                    ).exclude(inspection_state = SupplierPOGRNMaterialDetail.INSPECTION_STATE_INSPECTION_COMPLETE).exists():
                    need_to_select = False
                
                if need_to_select:
                    inspection_attempt = len(supplier_po_grn_material_details.exclude(inspection_attempt = None).distinct('inspection_attempt')) + 1
                    total_batch_quantity = 0
                    for supplier_po_grn_material_detail in supplier_po_grn_material_details:
                        total_batch_quantity += supplier_po_grn_material_detail.normalized_actual_quantity
                    selected_quantity = 0
                    not_selected_supplier_po_grn_material_details = supplier_po_grn_material_details.filter(inspection_state = SupplierPOGRNMaterialDetail.INSPECTION_STATE_INSPECTION_NOT_NEED)
                    last_index = len(not_selected_supplier_po_grn_material_details) - 1
                    selected_supplier_po_grn_material_details_ids = []
                    
                    while len(selected_supplier_po_grn_material_details_ids) <= last_index:

                        random_supplier_po_grn_material_detail = not_selected_supplier_po_grn_material_details[randint(0,last_index)]
                        if not random_supplier_po_grn_material_detail.id in selected_supplier_po_grn_material_details_ids:
                            selected_supplier_po_grn_material_details_ids.append(random_supplier_po_grn_material_detail.id)
                            random_supplier_po_grn_material_detail.inspection_state = SupplierPOGRNMaterialDetail.INSPECTION_STATE_READY_FOR_INSPECTION
                            random_supplier_po_grn_material_detail.inspection_attempt = inspection_attempt
                            random_supplier_po_grn_material_detail.save()
                            selected_quantity += random_supplier_po_grn_material_detail.normalized_actual_quantity
                            if total_batch_quantity > 0:
                                if (selected_quantity/total_batch_quantity) >= 0.1:
                                    break
