from shared.approvals.constants.approval_call_back_functions import update_costing_first_approval, update_costing_second_approval, update_supplier_po_approval, update_service_po_approval, update_grn_approval, update_bom_change_request_approval
from shared.approvals.constants.approval_choices import BUSINESS_ADMIN_COSTING_APPROVER_APPROVAL, FINANCE_COSTING_APPROVER_APPROVAL, SUPPLIER_PO_APPROVAL, SERVICE_PO_APPROVAL, BOM_CHANGE_REQUEST_APPROVAL, GRN_APPROVAL

ApprovalMappingFuntionData = {
    BUSINESS_ADMIN_COSTING_APPROVER_APPROVAL: update_costing_first_approval,
    FINANCE_COSTING_APPROVER_APPROVAL: update_costing_second_approval,
    SUPPLIER_PO_APPROVAL: update_supplier_po_approval,
    SERVICE_PO_APPROVAL: update_service_po_approval,
    BOM_CHANGE_REQUEST_APPROVAL: update_bom_change_request_approval,
    GRN_APPROVAL: update_grn_approval

}