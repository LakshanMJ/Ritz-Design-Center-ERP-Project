LEFT_OVER_ASSIGN_DIFFERENT_ORDER = 'left_over_assign_different_order'
PURCHASE_ORDER_APPROVAL = 'purchase_order_reviewed'
GRN_APPROVAL = 'grn_approval'
BUSINESS_ADMIN_COSTING_APPROVER_APPROVAL = 'business_costing_approver_approval'
FINANCE_COSTING_APPROVER_APPROVAL = 'finance_costing_approver_approval'
SUPPLIER_PO_APPROVAL = 'supplier_po_approval'
SERVICE_PO_APPROVAL = 'service_po_approval'
BOM_CHANGE_REQUEST_APPROVAL = 'bom_change_request_approval'

APPROVAL_NAME_CHOICES = (
    (LEFT_OVER_ASSIGN_DIFFERENT_ORDER, 'Review PO Club and check if it can be assigned'),
    (PURCHASE_ORDER_APPROVAL, 'Review Purchase Order and approved'),
    (GRN_APPROVAL, 'Review GRN and and approved'),
    (BUSINESS_ADMIN_COSTING_APPROVER_APPROVAL, 'Business Admin Costing Approval'),
    (FINANCE_COSTING_APPROVER_APPROVAL, 'Finance Costing Approval'),
    (SUPPLIER_PO_APPROVAL, 'Supplier PO Approval'),
    (SERVICE_PO_APPROVAL, 'Service PO Approval'),
    (BOM_CHANGE_REQUEST_APPROVAL, 'BOM Change Request Approval')
)

APPROVAL_FRONTEND_LINKS = {
    BUSINESS_ADMIN_COSTING_APPROVER_APPROVAL: ('costing/add/', 'version/'),
    FINANCE_COSTING_APPROVER_APPROVAL: 'costing/add/',
    SUPPLIER_PO_APPROVAL: 'supplier_po/',
    SERVICE_PO_APPROVAL: 'service_po/',
    BOM_CHANGE_REQUEST_APPROVAL: 'purchase_order/purchase_order_club/additional_cost/15?&tab=1'

}

def get_approval_display_value(key):
    approval_name_dict = dict(APPROVAL_NAME_CHOICES)
    return approval_name_dict.get(key, None)

def get_approval_frontend_links(entity, approval_type):
    from rest_framework.generics import get_object_or_404
    from marketing.models import OrderCostingVersion, BOMChangeRequest
    from supplier_po.models import SupplierPO, SupplierPOGRN
    link = None
    if approval_type == BUSINESS_ADMIN_COSTING_APPROVER_APPROVAL or approval_type==FINANCE_COSTING_APPROVER_APPROVAL:
        costing = get_object_or_404(OrderCostingVersion, pk=entity['entity_id'])
        link = '%s%s%s%s' % ('costing/add/', costing.order.id, '/version/', costing.id)
    elif approval_type == BOM_CHANGE_REQUEST_APPROVAL:
        bcr = get_object_or_404(BOMChangeRequest, pk=entity['entity_id'])
        link = '%s%s' % ('purchase_order/purchase_order_club/additional_cost/', bcr.id)
    elif approval_type == GRN_APPROVAL:
        grn = get_object_or_404(SupplierPOGRN, pk=entity['entity_id'])
        link = '%s%s' % ('goods_received_note/', grn.id)
    else:
        id = entity['entity_id']
        supplier_po = get_object_or_404(SupplierPO, pk=id)
        link = supplier_po.supplier_po_file.file_path
    return link