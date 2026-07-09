from django.contrib.contenttypes.models import ContentType
from marketing.models import ActualPOClub, SupplierPO, CustomerBrandMaterial, PurchaseOrder, PurchaseOrderBom, OrderInquiry, POCountry, POPackOtherCost, SupplierPODeliveryInvoice, SupplierPO, SupplierDeliveryDate, \
                            PurchaseOrderDelivery, SupplierPOGRN
from shared.utils import convert_per_unit_cost, convert_quantity_to_unit, is_none, get_float_or_zero, \
    convert_to_float_or_none
from supplier_po.models import SupplierDeliveryDateQuantityPOAllocation, GeneralPOSupplier
from shared.utils import calculate_queryset_total_amount_normalized_amount, get_amount_dictionary, get_quantity_dictionary, calculate_queryset_total_normalized_quantity
from rest_framework.generics import get_object_or_404
from materials.models import FABRIC_TRIM_TYPES, SEWING_TRIM_TYPES, PACKAGING_TYPES, UserDefinedMaterial
from materials.fieldmetadata.measuring_unit_helpers import MaterialUnitHelper
from finance.payments.serializers import PaymentSummaryMaterialSerializer, PaymentGanttChartSerializer
from finance.models import OutgoingPayment, SupplierPODeliveryInvoicePCL, PCLBankInformationLinkedPOClub
from finance.payments.serializers import POClubPCLBankInformationSerilaizer
from shared.utils import round_if_number
from django.db.models import Sum, F, FloatField
from supplier_po.supplier_po.serializers import SupplierPODetailSerializer

class PCLBankInformationHelper:

    def get_delivery_payments(self, merged_po_clubs):
        delivery_dates = SupplierDeliveryDate.objects.filter(general_po_supplier__general_po__po_club__in=merged_po_clubs)
        data = PaymentGanttChartSerializer(delivery_dates, many=True).data
        return data
    
    def get_payment_data(self, pcl_bank_information):
        outgoing_payments = pcl_bank_information.get_outgoing_payments()

        grouped_data = {}
        for outgoing_payment in outgoing_payments:
            invoice_data = []
            supplier_po_data = []
            invoices = outgoing_payment.get_supplier_po_delivery_invoices()
            supplier_pos = outgoing_payment.get_supplier_pos()
            grns = SupplierPOGRN.objects.filter(supplier_pack_list__supplier_po_delivery_note__supplier_po_delivery_invoice__in=invoices)

            for invoice in invoices:
                invoice_data.append({'id': invoice.id, 'display_number': invoice.display_number, 'type': 'outgoing'})

            for supplier_po in supplier_pos:
                invoice_data.append({'id': supplier_po.id, 'display_number': supplier_po.proforma_invoice_supplier_display_number, 'type': 'advance' })
           

            activity_type = outgoing_payment.display_number
            
            if activity_type not in grouped_data:
                grouped_data[activity_type] = {
                    'id': outgoing_payment.id,
                    'display_number': activity_type,
                    'invoice_data': invoice_data,
                    'supplier_po_data': supplier_po_data,
                    'pcl_activities': [],
                    'invoice_spo_data': self.get_gantt_chart_material_data(outgoing_payment)
                }


            for invoice in invoices:
                ci_display  = '%s / %s' % ('CI Created Date', invoice.display_number)
                grouped_data[activity_type]['pcl_activities'].append(
                    {'id': invoice.id, 'date': invoice.created.date(), 'activity': ci_display, 'key': 'ci_create_date'}
                )

            for po in supplier_pos:
                pi_display  = '%s / %s - %s' % ('PI Created Date', po.supplier_po_number, po.proforma_invoice_supplier_display_number)
                grouped_data[activity_type]['pcl_activities'].append(
                    {'id': po.id, 'date': po.proforma_invoice_date, 'activity': pi_display, 'key': 'pi_create_date'}
                )

            if grns:
                complete_date = grns[0].complete_date
                grouped_data[activity_type]['pcl_activities'].append(
                    {'id': outgoing_payment.id, 'date': complete_date, 'activity': 'GRN Complete Date', 'key': 'grn_complete_date'}
                )


            grouped_data[activity_type]['pcl_activities'].append(
                {'id': outgoing_payment.id, 'date': outgoing_payment.pcl_create_date, 'activity': 'PCL Open', 'key': 'pcl_open_date'}
            )

            grouped_data[activity_type]['pcl_activities'].append(
                {'id': outgoing_payment.id, 'date': outgoing_payment.pcl_end_date, 'activity': 'PCL End', 'key': 'pcl_end_date'}
            )

            grouped_data[activity_type]['pcl_activities'].append(
                {'id': outgoing_payment.id, 'date': outgoing_payment.pcl_settle_date, 'activity': 'PCL Settle', 'key': 'pcl_settle_date'}
            )

        return list(grouped_data.values())
    
    def get_gantt_chart_material_data(self, outgoing_payment):
        data = {}
        supplier_pos = outgoing_payment.get_supplier_pos()
        invoices = outgoing_payment.get_supplier_po_delivery_invoices()

        for supplier_po in supplier_pos:
            materials = supplier_po.get_supplier_po_material_list()
            po_club = supplier_po.po_club
            date_key = str(supplier_po.advance_payment_due_date)

            if date_key not in data:
                data[date_key] = []

            supplier_data = {
                'id': supplier_po.id,
                'display_number': supplier_po.pi_display_number(),
                'type': 'advance',
                'club_id': po_club.id if po_club else None,
                'club_display_number': po_club.short_code if po_club else None,
                'materials': []
            }
            for material in materials:
                material_data = {
                    'material_id': material.id,
                    'headers': material.customer_brand_material.material_detail.generic_material.user_material.get_material_headers(material.customer_brand_material.material_detail.generic_material.user_material.name),
                    'attributes': material.customer_brand_material.get_attributes()
                }
                supplier_data['materials'].append(material_data)

            data[date_key].append(supplier_data)

        for invoice in invoices:
            materials = invoice.get_delivery_invoice_material_list()
            po_club = invoice.get_costing_or_po_club()
            date_key = str(invoice.created.date())

            if date_key not in data:
                data[date_key] = []

            invoice_data = {
                'id': invoice.id,
                'display_number': invoice.display_number,
                'type': 'invoice',
                'club_id': po_club.id if po_club else None,
                'club_display_number': po_club.short_code if po_club else None,
                'materials': []
            }
            for material in materials:
                material_data = {
                    'material_id': material.id,
                    'headers': material.customer_brand_material.material_detail.generic_material.user_material.get_material_headers(material.customer_brand_material.material_detail.generic_material.user_material.name),
                    'attributes': material.customer_brand_material.get_attributes()
                }
                invoice_data['materials'].append(material_data)

            data[date_key].append(invoice_data)

        return data
    
    def get_gantt_chart(self, pcl_bank_information, merged_po_clubs):
        data = {
            'shipment_dates': {},
            'pcl_facility_data': [],
            'data': []
        }
        shipment_dates = PurchaseOrderDelivery.objects.filter(
            purchase_order__actual_po_club__in=merged_po_clubs
        ).order_by('delivery_date')
        for shipment_date in shipment_dates:
            delivery_date_str = str(shipment_date.delivery_date)
            if delivery_date_str not in data['shipment_dates']:
                data['shipment_dates'][delivery_date_str] = []

            data['shipment_dates'][delivery_date_str].append({
                'id': shipment_date.id,
                'amount': get_amount_dictionary(shipment_date.total_amount),
                'display_number': shipment_date.display_number,
                'purchase_order_display_number': shipment_date.purchase_order.display_number,
                'outgoing_commercial_invoice_due_date': shipment_date.outgoing_commercial_invoice.due_date if shipment_date.outgoing_commercial_invoice else None,
                'outgoing_commercial_invoice_amount': get_amount_dictionary(shipment_date.outgoing_commercial_invoice.amount) if shipment_date.outgoing_commercial_invoice else None
            })
        data['data'] = self.get_payment_data(pcl_bank_information)
        data['pcl_facility_data'].append({'date': pcl_bank_information.pcl_facility_start_date, 'activity': 'PCL Facility Start'})
        data['pcl_facility_data'].append({'date': pcl_bank_information.pcl_facility_end_date, 'activity': 'PCL Facility End'})
        return data
    
    def get_payments(self, pcl_bank_information):
        data = {
            'payments': [],
            'advances': []
        }
        invoices = pcl_bank_information.get_supplier_po_delivery_invoices()
        advances = pcl_bank_information.get_supplier_pos()
        for invoice in invoices:
            data['payments'].append(
                {
                    'id': invoice.id,
                    'display_number': invoice.display_number,
                    'supplier_invoice_number': invoice.supplier_invoice_number,
                    'payment_due_date': invoice.payment_due_date,
                    'calculated_debit_note_total_amount': invoice.calculated_debit_note_total_amount,
                    'calculated_debit_note_total_amount_currency': invoice.calculated_debit_note_total_amount_currency,
                    'debit_note_total_amount': invoice.debit_note_total_amount,
                    'debit_note_total_amount_currency': invoice.debit_note_total_amount_currency,
                    'total_price': invoice.total_price,
                    'total_price_currency': invoice.total_price_currency,
                    'file': invoice.invoice.get_object_data() if invoice.invoice else {}
                }
            )

        for advance in advances:
            data['advances'].append(
                {
                    'id': advance.id,
                    'proforma_invoice_supplier_display_number': advance.proforma_invoice_supplier_display_number,
                    'total_price': advance.total_price,
                    'total_price_currency': advance.total_price_currency,
                    'advance_payment': advance.advance_payment,
                    'advance_payment_currency': advance.advance_payment_currency,
                    'advance_payment_due_date': advance.advance_payment_due_date,
                    'file': advance.proforma_invoice.get_object_data() if advance.proforma_invoice else {}
                }
            )
        return data

    def get_orders(self, merged_po_clubs):
        order_ids = merged_po_clubs.values_list('pre_costing', flat=True)
        orders = OrderInquiry.objects.filter(id__in=order_ids)
        return orders
    
    def get_po_countries(self, merged_po_clubs):
        purchase_orders = self.get_merged_po_club_purchase_orders(merged_po_clubs)
        countries = POCountry.objects.filter(purchase_order__in=purchase_orders)
        return countries
    
    def get_total_required_quantity(self, normalized_unit, material, merged_po_clubs):
        purchase_orders = self.get_merged_po_club_purchase_orders(merged_po_clubs)
        total_quntity = 0
        purchase_order_boms = PurchaseOrderBom.objects.filter(
            purchase_order__in=purchase_orders,
            material=material
        )
        total_quntity = calculate_queryset_total_normalized_quantity(purchase_order_boms, normalized_unit, 'quantity', 'measuring_unit')
        return total_quntity
    
    def get_total_order_quantity(self, qs):
        total_quntity = 0
        for row in qs:
            total_quntity += row.get_order_quantity()
        return total_quntity
    
    def get_order_quantity(self, qs):
        total_quntity = 0
        for row in qs:
            total_quntity += row.get_order_quantity()
        return total_quntity
    
    def get_total_grn_quantity(self, qs):
        total_quntity = 0
        for row in qs:
            total_quntity += row.get_grn_quantity()['quantity']
        return round_if_number(total_quntity, 2)
    
    def get_total_price(self, qs):
        total_price = 0
        for row in qs:
            total_price += row.calculate_quantity_price()
        return round_if_number(total_price, 2)
    
    def get_price(self, qs):
        total_price = 0
        for row in qs:
            total_price += row.calculate_quantity_price()
        return total_price
    
    def get_receiving_types(self, qs):
        receiving_types = set()
        for row in qs:
            if row.supplier_delivery_date_quantity.general_po_material_quantity.general_po.po_club:
                receiving_types.add('GRN')
            else:
                receiving_types.add('General PO')
        return receiving_types
    
    def set_supplier_po_data(self, supplier_delivery_date_quantity_po_allocations, material, merged_po_clubs, pcl_bank_information):
        supplier_delivery_date_quantity_po_allocation_filter_data = supplier_delivery_date_quantity_po_allocations.filter(supplier_delivery_date_quantity__material_supplier__supplier_material__customer_brand_material=material)
        supplier_po_ids = supplier_delivery_date_quantity_po_allocation_filter_data.values_list('supplier_delivery_date_quantity__material_supplier__general_po_supplier__supplierpo', flat=True)
        supplier_pos = SupplierPO.objects.filter(id__in=supplier_po_ids)
        supplier_data = []
        main_qs = supplier_delivery_date_quantity_po_allocation_filter_data.filter(supplier_delivery_date_quantity__material_supplier__general_po_supplier__supplierpo__in=supplier_pos)
        for supplier_po in supplier_pos:
            qs = supplier_delivery_date_quantity_po_allocation_filter_data.filter(supplier_delivery_date_quantity__material_supplier__general_po_supplier__supplierpo=supplier_po)
            normalized_unit = material.material_normalized_measuring_unit
            supplier_data.append({
                'supplier_po_id': supplier_po.id,
                'supplier_po': supplier_po.supplier_po_number,
                'supplier_name': supplier_po.general_po_supplier.supplier.name,
                'order_quantity': get_quantity_dictionary(self.get_total_order_quantity(qs), normalized_unit),
                'grn_quantity': get_quantity_dictionary(self.get_total_grn_quantity(qs), normalized_unit),
                'price': get_amount_dictionary(self.get_price(qs)),
                'receiving_type': self.get_receiving_types(qs),
                'gantt_chart': self.get_bom_gantt_chart(supplier_po, pcl_bank_information)
            })
        serialize_data = PaymentSummaryMaterialSerializer(qs, many=True).data
        data = {
            'id': material.id,
            'headers': UserDefinedMaterial.get_material_headers(material.material_detail.generic_material.user_material.name),
            'attributes': material.get_attributes(),
            'total_required_quantity': get_quantity_dictionary(self.get_total_required_quantity(normalized_unit, material, merged_po_clubs), normalized_unit),
            'total_order_quantity': get_quantity_dictionary(self.get_total_order_quantity(main_qs), normalized_unit),
            'total_price': get_amount_dictionary(self.get_total_price(main_qs)),
            'supplier_data': supplier_data
        }
        return data
    
    def get_merged_po_club_purchase_orders(self, merged_po_clubs):
        puechase_orders = PurchaseOrder.objects.filter(actual_po_club__in=merged_po_clubs)
        return puechase_orders
    
    def get_materials(self, merged_po_clubs):
        purchase_order_ids = self.get_merged_po_club_purchase_orders(merged_po_clubs)
        material_ids = SupplierDeliveryDateQuantityPOAllocation.objects.filter(
            purchase_order__in=purchase_order_ids
        ).values_list('supplier_delivery_date_quantity__material_supplier__supplier_material__customer_brand_material', flat=True)
        materials = CustomerBrandMaterial.objects.filter(id__in=material_ids)
        return materials

    def get_supplier_pos(self, pcl_bank_information, merged_po_clubs):
        data = []
        fabric_data = {
            'category': FABRIC_TRIM_TYPES,
            'material_data': []
        }
        sewing_trim_data = {
            'category': SEWING_TRIM_TYPES,
            'material_data': []
        }
        packaging_data = {
            'category': PACKAGING_TYPES,
            'material_data': []
        }

        supplier_delivery_date_quantity_po_allocations = SupplierDeliveryDateQuantityPOAllocation.objects.filter(
            supplier_delivery_date_quantity__general_po_material_quantity__general_po__po_club__in=merged_po_clubs
        ).order_by('id')

        materials = self.get_materials(merged_po_clubs)
        for material in materials:
            if material.material_category == FABRIC_TRIM_TYPES:
                supplier_po_data = self.set_supplier_po_data(supplier_delivery_date_quantity_po_allocations, material, merged_po_clubs, pcl_bank_information)
                fabric_data['material_data'].append(supplier_po_data)
            elif material.material_category == SEWING_TRIM_TYPES:
                supplier_po_data = self.set_supplier_po_data(supplier_delivery_date_quantity_po_allocations, material, merged_po_clubs, pcl_bank_information)
                sewing_trim_data['material_data'].append(supplier_po_data)
            elif material.material_category == PACKAGING_TYPES:
                supplier_po_data = self.set_supplier_po_data(supplier_delivery_date_quantity_po_allocations, material, merged_po_clubs, pcl_bank_information)
                packaging_data['material_data'].append(supplier_po_data)

        data.append(fabric_data)
        data.append(sewing_trim_data)
        data.append(packaging_data)
        return data

    def get_merged_po_club_data(self, merged_po_clubs):
        data = []
        for merged_po_club in merged_po_clubs:
            data.append(POClubPCLBankInformationSerilaizer(merged_po_club, many=False).data)
        return data

    def get_purchase_order_data(self, merged_po_clubs):
        data = []
        for purchase_order in self.get_merged_po_club_purchase_orders(merged_po_clubs):
            fob_total_value = purchase_order.total_fob_value
            max_pcl_value = purchase_order.max_pcl_value
            data.append({
                'id': purchase_order.id,
                'display_number': purchase_order.display_number,
                'long_code': purchase_order.long_code,
                'short_code': purchase_order.short_code,
                'fob_total_value':  get_amount_dictionary(fob_total_value),
                'max_pcl_value':  get_amount_dictionary(max_pcl_value),
                'total_raw_material_cost': get_amount_dictionary(purchase_order.total_raw_material_cost),
                'fob_presentage': purchase_order.material_fob_presentage,
                'production_cut_date': purchase_order.production_cut_date,
                'production_start_date': purchase_order.production_start_date,
                'production_end_date': purchase_order.production_end_date,
            })
        return data

    def get_total_fob_value(self, merged_po_clubs):
        total_value = calculate_queryset_total_amount_normalized_amount(merged_po_clubs, 'total_fob_value')
        return total_value
    
    def get_total_supplier_po_raw_material_cost(self, merged_po_clubs):
        total_value = calculate_queryset_total_amount_normalized_amount(merged_po_clubs, 'total_raw_material_cost')
        return total_value
    
    def get_total_supplier_po_raw_material_paid(self, merged_po_clubs):
        total_value = 0
        for merged_po_club in merged_po_clubs:
            total_value += merged_po_club.get_supplier_po_raw_material_total_paid()
        data = get_amount_dictionary(total_value)
        return data

    def get_fob_presentage(self, merged_po_clubs):
        precentage = 0
        raw_material_cost = self.get_total_supplier_po_raw_material_cost(merged_po_clubs)
        fob_total_value = self.get_total_fob_value(merged_po_clubs)
        if raw_material_cost > 0 and fob_total_value > 0:
            precentage = (raw_material_cost / fob_total_value) * 100
            return round(precentage, 2)
        return precentage
    
    def get_max_pcl_value(self, merged_po_clubs):
        total_value = calculate_queryset_total_amount_normalized_amount(merged_po_clubs, 'max_pcl_value')
        return total_value
    
    def get_outgoing_payments(self, pcl_bank_information):
        data = []
        outgoing_payments = pcl_bank_information.get_outgoing_payments()
        for outging_payment in outgoing_payments:
            data.append({
                'id': outging_payment.id,
                'display_number': outging_payment.display_number,
                'amount': get_amount_dictionary(outging_payment.amount),
                'payment_date': outging_payment.payment_date,
                'payment_method': outging_payment.get_payment_method_display(),
	            'complete': outging_payment.complete,

            })
        return data
    
    def get_fabric_costs(self, merged_po_clubs):
        total_cost = calculate_queryset_total_amount_normalized_amount(merged_po_clubs, 'total_fabric_cost')
        return total_cost
    
    def get_sewing_trim_costs(self, merged_po_clubs):
        total_cost = calculate_queryset_total_amount_normalized_amount(merged_po_clubs, 'total_sewing_trim_cost')
        return total_cost
    
    def get_packing_trim_costs(self, merged_po_clubs):
        total_cost = calculate_queryset_total_amount_normalized_amount(merged_po_clubs, 'total_packing_trim_cost')
        return total_cost
    
    def get_total_embellishment_service_cost(self, merged_po_clubs):
        total_cost = calculate_queryset_total_amount_normalized_amount(merged_po_clubs, 'total_embellishment_service_cost')
        return total_cost
    
    def get_total_wash_service_cost(self, merged_po_clubs):
        total_cost = calculate_queryset_total_amount_normalized_amount(merged_po_clubs, 'total_wash_service_cost')
        return total_cost
    
    def get_fabric_financing_cost(self, merged_po_clubs):
        fabric_financing_cost = 0
        purchase_orders = self.get_merged_po_club_purchase_orders(merged_po_clubs)
        for purchase_order in purchase_orders:
            fabric_cost = purchase_order.total_fabric_cost
            if purchase_order.costing_version:
                fabric_financing_percentage = purchase_order.costing_version.fabric_finance_cost_percentage
                if fabric_financing_percentage and fabric_cost:
                    fabric_financing_cost += fabric_cost * (get_float_or_zero(fabric_financing_percentage)/100)
        return fabric_financing_cost

    def get_trim_financing_cost(self, merged_po_clubs):
        trim_financing_cost = 0
        purchase_orders = self.get_merged_po_club_purchase_orders(merged_po_clubs)
        for purchase_order in purchase_orders:
            trim_cost = purchase_order.total_sewing_trim_cost
            if purchase_order.costing_version:
                trim_financing_percentage = purchase_order.costing_version.trim_finance_cost_percentage
                if trim_financing_percentage and trim_cost:
                    trim_financing_cost += trim_cost * (get_float_or_zero(trim_financing_percentage)/100)
        return trim_financing_cost

    def get_total(self, merged_po_clubs):
        total = 0
        total = self.get_fabric_costs(merged_po_clubs) + self.get_sewing_trim_costs(merged_po_clubs) + self.get_packing_trim_costs(merged_po_clubs) + \
                self.get_fabric_financing_cost(merged_po_clubs) + self.get_trim_financing_cost(merged_po_clubs) + self.get_total_other_cost(merged_po_clubs) + \
                self.get_total_embellishment_service_cost(merged_po_clubs) + self.get_total_wash_service_cost(merged_po_clubs)
        return total
    
    def get_shipto_countries(self, merged_po_clubs):
        data = set()
        po_countries = self.get_po_countries(merged_po_clubs)
        for country in po_countries:
            data.add(country.po_country_name)
        return data
    
    def get_order_name(self, merged_po_clubs):
        order_name = None
        orders = self.get_orders(merged_po_clubs)
        if orders:
            order_name = orders[0].ritz_code
        return order_name
    
    def get_profit(self, merged_po_clubs):
        profit = 0
        fob_total = self.get_total_fob_value(merged_po_clubs)
        total_cost = self.get_total(merged_po_clubs)
        profit = fob_total - total_cost
        return profit
    
    def get_total_other_cost(self, merged_po_clubs):
        from django.db.models import F, Sum
        total_cost = POPackOtherCost.objects.filter(
            pack__purchase_order__actual_po_club__in=merged_po_clubs
        ).aggregate(total_cost=Sum(F('cost') * F('pack__quantity')))['total_cost']
    
        return float(total_cost) or 0
    
    def get_other_costs_data(self, merged_po_clubs):
        costs = (
            POPackOtherCost.objects
            .filter(pack__purchase_order_id__actual_po_club__in=merged_po_clubs)
            .annotate(
                total_cost=F('cost') * F('pack__quantity')
            )
            .values('other_cost_type__name')
            .annotate(
                total_cost=Sum('total_cost', output_field=FloatField())
            )
            .values('other_cost_type__name', 'total_cost')
        )

        data = [
            {
                'name': cost['other_cost_type__name'],
                'total_cost': get_amount_dictionary(cost['total_cost'])
            }
            for cost in costs
        ]
        return data
    
    def get_profit_ratio(self, merged_po_clubs):
        profit_ratio = 0
        profit = self.get_profit(merged_po_clubs)
        total_cost = self.get_total(merged_po_clubs)
        if profit > 0 and total_cost > 0:
            profit_ratio = (profit / total_cost) * 100
        return round(profit_ratio, 2)

    def get_order_profitability_data(self, merged_po_clubs):
        data = {
            'order_number': self.get_order_name(merged_po_clubs),
            'shipto': self.get_shipto_countries(merged_po_clubs),
            'total_fob_value': get_amount_dictionary(self.get_total_fob_value(merged_po_clubs)),
            'total_fabric_cost': get_amount_dictionary(self.get_fabric_costs(merged_po_clubs)),
            'total_sewing_trim_cost': get_amount_dictionary(self.get_sewing_trim_costs(merged_po_clubs)),
            'total_packing_trim_cost': get_amount_dictionary(self.get_packing_trim_costs(merged_po_clubs)),
            'total_embellishment_service_cost': get_amount_dictionary(self.get_total_embellishment_service_cost(merged_po_clubs)),
            'total_wash_service_cost': get_amount_dictionary(self.get_total_wash_service_cost(merged_po_clubs)),
            'fabric_financing_cost': get_amount_dictionary(self.get_fabric_financing_cost(merged_po_clubs)),
            'trim_financing_cost': get_amount_dictionary(self.get_trim_financing_cost(merged_po_clubs)),
            'other_costs_data': self.get_other_costs_data(merged_po_clubs),
            'total_order_profit': get_amount_dictionary(self.get_profit(merged_po_clubs)),
            'total': get_amount_dictionary(self.get_total(merged_po_clubs)),
            'total_profitability_ratio': self.get_profit_ratio(merged_po_clubs),
        }
        return data

    def calculate_pcl_data(self, pcl_bank_information):
        merged_po_club_ids = pcl_bank_information.pclbankinformationlinkedpoclub_set.filter().values_list('po_club', flat=True)
        merged_po_clubs = ActualPOClub.objects.filter(id__in=merged_po_club_ids)

        pcl_data = {
            'total_pcl_amount': pcl_bank_information.total_amount,
	        'total_pcl_amount_currency': pcl_bank_information.total_amount_currency,
	        'pcl_threshold_amount': pcl_bank_information.pcl_threshold_amount,
	        'pcl_threshold_amount_currency': pcl_bank_information.pcl_threshold_amount_currency,
            'state': pcl_bank_information.state,
            'pcl_facility_start_date': pcl_bank_information.pcl_facility_start_date,
            'pcl_facility_end_date': pcl_bank_information.pcl_facility_end_date,
            'fob_total_value': get_amount_dictionary(self.get_total_fob_value(merged_po_clubs)),
            'raw_material_total_cost': get_amount_dictionary(self.get_total_supplier_po_raw_material_cost(merged_po_clubs)),
            'supplier_po_raw_material_total_paid': self.get_total_supplier_po_raw_material_paid(merged_po_clubs),
            'fob_presentage': self.get_fob_presentage(merged_po_clubs),
            'max_pcl_value': get_amount_dictionary(self.get_max_pcl_value(merged_po_clubs)),
            'merged_po_club_list': self.get_merged_po_club_data(merged_po_clubs),
            'pruchase_order_data': self.get_purchase_order_data(merged_po_clubs),
            'bom_details': self.get_supplier_pos(pcl_bank_information, merged_po_clubs),
            'outgoing_payments': self.get_outgoing_payments(pcl_bank_information),
            'payments': self.get_payments(pcl_bank_information),
            'gantt_chart': self.get_gantt_chart(pcl_bank_information, merged_po_clubs),
            # 'test_data': self.test(merged_po_clubs)
        }
        return pcl_data

    def get_bom_payment_data(self, supplier_po):
        outgoing_payments = supplier_po.get_supplier_po_all_outgoing_payments()
        pcl_activities = []
        for outgoing_payment in outgoing_payments:
            invoice_supplier_po_data = []
            invoices = supplier_po.get_invoices()
            supplier_pos = outgoing_payment.get_supplier_pos()
            grns = SupplierPOGRN.objects.filter(supplier_pack_list__supplier_po_delivery_note__supplier_po_delivery_invoice__in=invoices)

            for invoice in invoices:
                invoice_supplier_po_data.append({'id': invoice.id, 'display_number': invoice.display_number, 'type': 'outgoing'})

            for supplier_po in supplier_pos:
                invoice_supplier_po_data.append({'id': supplier_po.id, 'display_number': supplier_po.proforma_invoice_supplier_display_number, 'type': 'advance' })


            for invoice in invoices:
                ci_display  = '%s / %s' % ('CI Created Date', invoice.display_number)
                pcl_activities.append(
                    {'id': invoice.id, 'date': invoice.created.date(), 'activity': ci_display, 'key': 'ci_create_date'}
                )

            for po in supplier_pos:
                pi_display  = '%s / %s - %s' % ('PI Created Date', po.supplier_po_number, po.proforma_invoice_supplier_display_number)
                pcl_activities.append(
                    {'id': po.id, 'date': po.proforma_invoice_date, 'activity': pi_display, 'key': 'pi_create_date'}
                )

            if grns:
                complete_date = grns[0].complete_date
                pcl_activities.append(
                    {'id': outgoing_payment.id, 'date': complete_date, 'activity': 'GRN Complete Date', 'key': 'grn_complete_date'}
                )


            pcl_activities.append(
                {'id': outgoing_payment.id, 'date': outgoing_payment.pcl_create_date, 'activity': 'PCL Open', 'key': 'pcl_open_date'}
            )

            pcl_activities.append(
                {'id': outgoing_payment.id, 'date': outgoing_payment.pcl_end_date, 'activity': 'PCL End', 'key': 'pcl_end_date'}
            )

            pcl_activities.append(
                {'id': outgoing_payment.id, 'date': outgoing_payment.pcl_settle_date, 'activity': 'PCL Settle', 'key': 'pcl_settle_date'}
            )

        return pcl_activities
    
    def get_bom_gantt_chart(self, supplier_po, pcl_bank_information):
        data = {
            'shipment_dates': {},
            'pcl_activities': []
        }
        clubs = SupplierPO.objects.filter(general_po_supplier__supplierpo=supplier_po).values_list('general_po_supplier__general_po__po_club', flat=True)
        shipment_dates = PurchaseOrderDelivery.objects.filter(
            purchase_order__actual_po_club__in=clubs
        ).order_by('delivery_date')
        for shipment_date in shipment_dates:
            delivery_date_str = str(shipment_date.delivery_date)
            if delivery_date_str not in data['shipment_dates']:
                data['shipment_dates'][delivery_date_str] = []

            data['shipment_dates'][delivery_date_str].append({
                'id': shipment_date.id,
                'amount': get_amount_dictionary(shipment_date.total_amount),
                'display_number': shipment_date.display_number,
                'purchase_order_display_number': shipment_date.purchase_order.display_number,
                'outgoing_commercial_invoice_due_date': shipment_date.outgoing_commercial_invoice.due_date if shipment_date.outgoing_commercial_invoice else None,
                'outgoing_commercial_invoice_amount': get_amount_dictionary(shipment_date.outgoing_commercial_invoice.amount) if shipment_date.outgoing_commercial_invoice else None
            })
        data['pcl_activities'] = self.get_bom_payment_data(supplier_po)
        # data['pcl_facility_data'].append({'date': pcl_bank_information.pcl_facility_start_date, 'activity': 'PCL Facility Start'})
        # data['pcl_facility_data'].append({'date': pcl_bank_information.pcl_facility_end_date, 'activity': 'PCL Facility End'})
        return data