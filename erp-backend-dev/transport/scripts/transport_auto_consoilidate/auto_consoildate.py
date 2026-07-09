from marketing.models import PurchaseOrderDelivery
from transport.serializers import DeliveryTransportTypeAutoConsolidateSerialzer

class PurchaseOrderDeliveryAutoConsolidate:
    
    def purchase_order_delivery_auto_consolidate(self):

        errors = {}
        shipments_found = False

        purchase_order_delivery_queryset = PurchaseOrderDelivery.objects.filter(active=True, transport_delivery_date_tracking=None)

        if purchase_order_delivery_queryset:
            purchase_order_delivery_customer_ids = {purchase_order_delivery.purchase_order.customer.id for purchase_order_delivery in purchase_order_delivery_queryset}
            
            for customer_id in purchase_order_delivery_customer_ids:
                customer_queryset = purchase_order_delivery_queryset.filter(purchase_order__customer__id=customer_id)
                if customer_queryset:
                    customer_delivery_port_ids = {purchase_order_delivery.delivery_port.address.id for purchase_order_delivery in customer_queryset if purchase_order_delivery.delivery_port is not None}
                    
                    for port_id in customer_delivery_port_ids:
                        customer_detination_queryset = customer_queryset.filter(delivery_port__address__id=port_id)
                        if customer_detination_queryset:
                            shipping_dates = {purchase_order_delivery.delivery_date for purchase_order_delivery in customer_detination_queryset
                                            if purchase_order_delivery.delivery_date is not None}

                            for shipping_date in shipping_dates:
                                customer_destination_delivery_date_queryset = customer_detination_queryset.filter(delivery_date=shipping_date)
                                if customer_destination_delivery_date_queryset:
                                    shipping_incoterms = {purchase_order_delivery.outgoing_commercial_invoice.incoterm for purchase_order_delivery in customer_destination_delivery_date_queryset
                                                        if purchase_order_delivery.outgoing_commercial_invoice is not None and purchase_order_delivery.outgoing_commercial_invoice.incoterm is not None}
                                    
                                    for shipping_incoterm in shipping_incoterms:
                                        customer_destination_delivery_date_incoterm_queryset = customer_destination_delivery_date_queryset.filter(outgoing_commercial_invoice__incoterm=shipping_incoterm)
                                        
                                        if customer_destination_delivery_date_incoterm_queryset:
                                            shipments_found = True
                                            tracking_serializer = DeliveryTransportTypeAutoConsolidateSerialzer(data={})
                                            if tracking_serializer.is_valid():
                                                tracking_instance = tracking_serializer.save()
                                                customer_destination_delivery_date_incoterm_queryset.update(transport_delivery_date_tracking=tracking_instance)
                                            else:
                                                errors.update({"serializer_errors": tracking_serializer.errors}) 
        if not shipments_found:
            errors.update({"shipments": "No shipments found for consolidate."})
        return errors