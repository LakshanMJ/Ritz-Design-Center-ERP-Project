from shared.approvals.constants.task_entities import *

TASK_ENTITY_MODEL_MAPPING =  {
    ORDER_COSTING_VERSION: 'marketing.models.OrderCostingVersion',
	PURCHASE_ORDER_ENTITY: 'marketing.models.PurchaseOrder',
    PO_CLUB_ENTITY: 'marketing.models.ActualPOClub',
    SUPPLIER_PO_ENTITY: 'supplier_po.models.SupplierPO',
    IN_HOUSE_MATERIAL_VERIFIATION_ENTITY: 'materials.models.InHouseMaterialVerification',
    SERVICE_PO_ENTITY: 'service_po.models.ServicePO',
    SUPPLIER_PO_GRN_ENTITY: 'supplier_po.models.SupplierPOGRN',
    BOM_CHANGE_REQUEST_ENTITY: 'marketing.models.BOMChangeRequest'
}