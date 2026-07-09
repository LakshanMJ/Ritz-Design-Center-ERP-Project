from marketing.models import SupplierPO, PurchaseOrderDelivery
from supplier_po.models import SupplierPOGRN
from finance.models import IncomingPayment, OutgoingPayment, SupplierPODeliveryInvoicePCL, PCLBankInformationLinkedPOClub
from shared.approvals.constants.task_entities import TASK_ENTITY_CHOICES, SUPPLIER_PO_ENTITY, PO_CLUB_ENTITY, PURCHASE_ORDER_ENTITY, SUPPLIER_PO_GRN_ENTITY, INCOMING_PAYMENT_ENTITY, \
                                                    OUTGOING_PAYMENT_ENTITY


class POClubTimelineHelper:

    def __init__(self, request, po_club):
            self.po_club = po_club
            self.purchase_orders = self.po_club.get_purchase_orders()
            self.request = request

    @staticmethod
    def get_date_display(date):
        str_date = None
        if date:
            str_date = date.strftime("%Y-%m-%d %I:%M:%S %p")
        return str_date
    
    def get_club_data(self):
        data = []
        data.append(
            {
                'id': self.po_club.id,
                'date': self.po_club.created,
                'date_display': self.get_date_display(self.po_club.created),
                'activity': 'PO Club Created',
                'entity': PO_CLUB_ENTITY,
                'display_number': self.po_club.display_number,
                'purchase_order_data': self.get_purchase_order_data()
            }
        )
        return data
    
    def get_supplier_po_data(self):
        data = []
        supplier_pos = SupplierPO.objects.filter(general_po_supplier__general_po__po_club=self.po_club).order_by('created')
        for supplier_po in supplier_pos:
            if supplier_po.po_sent_date:
                general_po_data = {
                    'id': supplier_po.id,
                    'date': supplier_po.po_sent_date,
                    'date_display': self.get_date_display(supplier_po.po_sent_date),
                    'activity': dict(TASK_ENTITY_CHOICES).get(SUPPLIER_PO_ENTITY),
                    'entity': SUPPLIER_PO_ENTITY,
                    'display_number': supplier_po.supplier_po_number,
                    'supplier_po_file': supplier_po.supplier_po_file.get_object_data() if supplier_po.supplier_po_file else None
                }
                data.append(general_po_data)
        return data

    def get_purchase_order_data(self):
        data = []
        pos = self.po_club.purchaseorder_set.all()
        for po in pos:
            data.append({
                'id': po.id,
                'date': po.created,
                'date_display': self.get_date_display(po.created),
                'activity': dict(TASK_ENTITY_CHOICES).get(PURCHASE_ORDER_ENTITY),
                'entity': PURCHASE_ORDER_ENTITY,
                'display_number': po.display_number,
            })
        return data
    
    def get_grn_data(self):
        data = []
        supplier_po_grns = SupplierPOGRN.objects.filter(supplier_po__general_po_supplier__general_po__po_club=self.po_club)
        for supplier_po_grn in supplier_po_grns:
            data.append({
                'id': supplier_po_grn.id,
                'date': supplier_po_grn.created,
                'date_display': self.get_date_display(supplier_po_grn.created),
                'activity': dict(TASK_ENTITY_CHOICES).get(SUPPLIER_PO_GRN_ENTITY),
                'entity': SUPPLIER_PO_GRN_ENTITY,
                'display_number': supplier_po_grn.grn_number,
            })
        return data
    
    def get_incoming_payment_data(self):
        data = []
        purchase_order_deliveries = PurchaseOrderDelivery.objects.filter(purchase_order__actual_po_club=self.po_club).values_list('outgoing_commercial_invoice', flat=True)
        incoming_payments = IncomingPayment.objects.filter(outgoing_commercial_invoice__in=purchase_order_deliveries)
        for incoming_payment in incoming_payments:
            data.append({
                'id': incoming_payment.id,
                'date': incoming_payment.created,
                'date_display': self.get_date_display(incoming_payment.created),
                'activity': dict(TASK_ENTITY_CHOICES).get(INCOMING_PAYMENT_ENTITY),
                'entity': INCOMING_PAYMENT_ENTITY,
                'display_number': incoming_payment.display_number,
            })
        return data
    
    def get_outgoing_payment_data(self):
        data = []
        pcl_bank_information_ids = PCLBankInformationLinkedPOClub.objects.filter(po_club=self.po_club).values_list('pcl_bank_information', flat=True)
        outgoing_payments = OutgoingPayment.objects.filter(
            pcl_bank_information_id__in=pcl_bank_information_ids
        )
        for outgoing_payment in outgoing_payments:
            data.append({
                'id': outgoing_payment.id,
                'date': outgoing_payment.created,
                'date_display': self.get_date_display(outgoing_payment.created),
                'activity': dict(TASK_ENTITY_CHOICES).get(OUTGOING_PAYMENT_ENTITY),
                'entity': OUTGOING_PAYMENT_ENTITY,
                'display_number': outgoing_payment.display_number,
            })
        return data
    
    def get_combined_data(self):
        supplier_po_data = self.get_supplier_po_data()
        po_club_data = self.get_club_data()
        grn_data = self.get_grn_data()
        incoming_payment_data = self.get_incoming_payment_data()
        outgoing_payment_data = self.get_outgoing_payment_data()
        combined_data = po_club_data + supplier_po_data + grn_data + incoming_payment_data + outgoing_payment_data
        combined_data = sorted(combined_data, key=lambda x: x['date'])
        return combined_data