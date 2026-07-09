from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ObjectDoesNotExist
from shared.permissions.view_permissions import HasPermission
from shared.permissions.roles import FINANCE_ADMIN_ROLE, FINANCE_USER_ROLE, MERCHANT_ROLE, ADMIN_ROLE
from rest_framework.generics import get_object_or_404
from shared.utils import get_object_or_none
from marketing.models import ActualPOClub, PurchaseOrderDelivery, SupplierPOGRN, PurchaseOrder
from finance.models import IncomingPayment, IncomingPaymentDeduction, OutgoingPayment, OutgoingCommercialInvoice, PCLBankInformation, PCLBankInformationLinkedPOClub, \
                            SupplierPODeliveryInvoicePCL, PCLInterestRate
from finance.payments.serializers import IncomingPaymentSerializer, POClubPaymentSerializer, IncomingPaymentDeductionSerializer, OutgoingPaymentSerializer, OutgoingCommercialInvoiceSerializer, \
                                        OutgoingCommercialInvoiceBasicSerializer, IncomingPaymentDeductionActionSerializer, IncomingPaymentActionSerializer, OutgoingPaymentActionSerializer, \
                                        OutgoingCommercialInvoiceActionSerializer, CustomerPaymentSummarySerilaizer, ActualClubCustomerPaymentSummarySerilaizer, \
                                        PaymentGanttChartSerializer, TestSerilaizerPagination, POClubPCLBankInformationSerilaizer, \
                                        SupplierCommercialInvoiceDetailSerializer, SupplierCommercialInvoiceBasicSerializer, PCLMatchingOutgoingPaymentListViewSerializer, CustomPCLSettlementSerializer, \
                                        PCLBankInformationSerializer, PCLBankInformationDetailSerializer, SupplierPODeliveryInvoicePCLSerializer, PCLBankInformationDashBoardSerializer
from shared.helpers.general_results_set_pagination import GeneralLargeResultsSetPagination
from shared.utils import search_qs_from_id
from shared.helpers.currency_helper import CurrencyHelper
from shared.models import Customer
from marketing.serializers import ActualPOClubBasicSerializer, ActualPOClubBasicSerializerV2
from supplier_po.supplier_po.serializers import SupplierPODeliveryInvoice
from shared.utils import calculate_queryset_total_amount_normalized_amount, get_amount_dictionary, search_qs_from_global_filter, clean_search_dictionary
from supplier_po.models import SupplierPO
from marketing.models import Supplier, PurchaseOrderBom
from materials.models import FABRIC_TRIM_TYPES
from marketing.permissions.costing_permissions import ObjectStatePermissionMixin

class CurrencyListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        data = []
        for choice in CurrencyHelper.CURRENCY_CHOICES:
            data.append({"id": choice[0], "name": choice[1]})
        return Response(data, status=status.HTTP_200_OK)
    

class PaymentTypeListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        data = []
        for choice in OutgoingPayment.PAYMENT_METHOD_CHOICES:
            data.append({"id": choice[0], "name": choice[1]})
        return Response(data, status=status.HTTP_200_OK)
    

class PurchaseOrderDeliveryIncomingPaymentListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]
    
    def get(self, request, *args, **kwargs):
        data = []
        purchase_order_deliveries = PurchaseOrderDelivery.objects.filter().exclude(payment=None)

        for purchase_order_delivery in purchase_order_deliveries:
            data.append({
                'id':purchase_order_delivery.id,
                'customer': purchase_order_delivery.purchase_order.costing_version.order.customer.name,
                'purchase_order_id': purchase_order_delivery.purchase_order.id,
                'purchase_order_display_number': purchase_order_delivery.purchase_order.display_number,
                'po_club_id': purchase_order_delivery.purchase_order.actual_po_club.id,
                'po_club_display_number': purchase_order_delivery.purchase_order.actual_po_club.display_number,
                'payment': IncomingPaymentSerializer(purchase_order_delivery.payment, many=False).data,
            })
            
        return Response(data, status=status.HTTP_200_OK)
    

class POClubPaymentListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]
    queryset = ActualPOClub.objects.all().order_by('-id')
    serializer_class = POClubPaymentSerializer
    pagination_class = GeneralLargeResultsSetPagination

    def get_queryset(self):
        qs = super().get_queryset() 
        search_text = self.request.GET.get('search_text', None)
        if search_text and search_text != '':
            qs = search_qs_from_id(qs, search_text)
        return qs
    

class IncomingPaymentDeductionDeleteView(generics.RetrieveDestroyAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]
    queryset = IncomingPaymentDeduction.objects.all().order_by('-id')
    serializer_class = IncomingPaymentDeductionSerializer


class IncomingPaymentDeductionSaveView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]

    def validate_data(self, data):
        errors = {}
        for index, row in enumerate(data):
            amount = row.get('amount')
            reason = row.get('reason')
            currency = row.get('currency')
            
            if not amount['amount']:
                if index not in errors:
                    errors[index] = {}
                errors[index]['amount_error'] = 'Enter amount'
            
            if not reason:
                if index not in errors:
                    errors[index] = {}
                errors[index]['reason_error'] = 'Enter reason'

            if not currency:
                if index not in errors:
                    errors[index] = {}
                errors[index]['currency_error'] = 'Select currency'
                
        return errors
    
    def post(self, request, *args, **kwargs):
        data = request.data
        errors = self.validate_data(data)
        if not errors:
            incomming_payment = IncomingPayment.objects.get(id=self.kwargs['incoming_payment_id'])
            for row in data:
                payment_deduction_id = row['id']
                amount = row['amount']['amount']
                reason = row['reason']
                currency = row['currency']
                if payment_deduction_id:
                    payment_deduction = get_object_or_404(IncomingPaymentDeduction, pk=payment_deduction_id)
                else:
                    payment_deduction = IncomingPaymentDeduction.objects.create(
                        incomming_payment=incomming_payment
                    )
                payment_deduction.amount = amount
                payment_deduction.reason = reason
                payment_deduction.currency = currency
                payment_deduction.save()
            http_response = Response({'success': True})
        else:
            http_response = Response(errors, status=status.HTTP_400_BAD_REQUEST)
        return http_response
    

class IncomingPaymentListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]
    queryset = IncomingPayment.objects.all().order_by('-id')
    serializer_class = IncomingPaymentSerializer
    pagination_class = GeneralLargeResultsSetPagination

    sort_keys = {
        'id': 'id',
        'amount': 'amount',
        'payment_date': 'payment_date',
        'complete': 'complete',
    }

    def clean_dictionary(self, dic):
        replace_keys = {
            'id': 'id',
            'amount': 'amount',
            'payment_date': 'payment_date',
            'complete': 'complete',
        }
        dictionary = clean_search_dictionary(dic, replace_keys)
        return dictionary

    def get_queryset(self):
        qs = super().get_queryset()
        search_data = self.request.GET.dict()
        search_dictionary = self.clean_dictionary(search_data)
        global_filter = self.request.query_params.get('global_filter', None)
        sort_col = self.request.query_params.get('sort_col', None)
        sort_col = self.sort_keys.get(sort_col, 'id')
        sort_dir = self.request.query_params.get('sort_dir', default='desc')
        search_fields = ['payment_date', 'complete', 'id']
        qs = search_qs_from_global_filter(qs, global_filter, search_dictionary, search_fields, sort_col, sort_dir, IncomingPayment)
        return qs


class OutgoingPaymentListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]
    queryset = OutgoingPayment.objects.all().order_by('-id')
    serializer_class = OutgoingPaymentSerializer
    pagination_class = GeneralLargeResultsSetPagination

    sort_keys = {
        'id': 'id',
        'amount': 'amount',
        'payment_date': 'payment_date',
        'state': 'state',
    }

    def clean_dictionary(self, dic):
        replace_keys = {
            'id': 'id',
            'amount': 'amount',
            'payment_date': 'payment_date',
            'state': 'state',
        }
        dictionary = clean_search_dictionary(dic, replace_keys)
        return dictionary

    def get_queryset(self):
        qs = super().get_queryset()
        search_data = self.request.GET.dict()
        search_dictionary = self.clean_dictionary(search_data)
        global_filter = self.request.query_params.get('global_filter', None)
        sort_col = self.request.query_params.get('sort_col', None)
        sort_col = self.sort_keys.get(sort_col, 'id')
        sort_dir = self.request.query_params.get('sort_dir', default='desc')
        search_fields = ['payment_date', 'state', 'id']
        qs = search_qs_from_global_filter(qs, global_filter, search_dictionary, search_fields, sort_col, sort_dir, OutgoingPayment)
        return qs


class IncomingPaymentDetailView(generics.RetrieveAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]
    queryset = IncomingPayment.objects.all().order_by('-id')
    serializer_class = IncomingPaymentSerializer


class OutgoingCommercialInvoiceBasicListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]
    queryset = OutgoingCommercialInvoice.objects.all().order_by('-id')
    serializer_class = OutgoingCommercialInvoiceBasicSerializer
    pagination_class = GeneralLargeResultsSetPagination

    def get_queryset(self):
        qs = super().get_queryset() 
        search_text = self.request.GET.get('search_text', None)
        if search_text and search_text != '':
            qs = search_qs_from_id(qs, search_text)
        return qs


class IncomingPaymentSaveView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]

    def post(self, request, incoming_payment_id):
        data = request.data
        incoming_payment = IncomingPayment.objects.get(id=incoming_payment_id)
        incoming_payment.amount = data['amount']['amount']
        incoming_payment.complete = data['complete']
        incoming_payment.payment_date = data['payment_date']
        incoming_payment.outgoing_commercial_invoice_id = data['outgoing_commercial_invoice_id']
        incoming_payment.save()

        return Response({'status': True})


# class OutgoingPaymentSaveView(APIView):
#     permission_classes = (HasPermission,)
#     write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]
#     # queryset = OutgoingPayment.objects.all().order_by('-id')
#     # serializer_class = OutgoingPaymentActionSerializer

#     def post(self, request, pk):
#         data = request.data
#         outgoing_payment = get_object_or_404(OutgoingPayment, pk=pk)
#         outgoing_payment.amount = data['amount']['amount']
#         outgoing_payment.complete = data['complete']
#         outgoing_payment.payment_date = data['payment_date']
#         outgoing_payment.supplierpodeliveryinvoicepcl.pcl_settle_date = data['pcl_settle_date']
#         outgoing_payment.supplierpodeliveryinvoicepcl.pcl_create_date = data['pcl_create_date']
#         outgoing_payment.supplierpodeliveryinvoicepcl.save()
#         outgoing_payment.save()

#         return Response({'status': True})


class OutgoingCommercialInvoiceListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]
    queryset = OutgoingCommercialInvoice.objects.all().order_by('-id')
    serializer_class = OutgoingCommercialInvoiceSerializer
    pagination_class = GeneralLargeResultsSetPagination

    sort_keys = {
        'id': 'id',
        'amount': 'amount',
        'customer_name': 'customer__name',
    }

    def clean_dictionary(self, dic):
        replace_keys = {
            'id': 'id',
            'amount': 'amount',
            'customer_name': 'customer__name__icontains',
        }
        dictionary = clean_search_dictionary(dic, replace_keys)
        return dictionary

    def get_queryset(self):
        qs = super().get_queryset()
        search_data = self.request.GET.dict()
        search_dictionary = self.clean_dictionary(search_data)
        global_filter = self.request.query_params.get('global_filter', None)
        sort_col = self.request.query_params.get('sort_col', None)
        sort_col = self.sort_keys.get(sort_col, 'id')
        sort_dir = self.request.query_params.get('sort_dir', default='desc')
        search_fields = ['amount', 'customer__name', 'id']
        qs = search_qs_from_global_filter(qs, global_filter, search_dictionary, search_fields, sort_col, sort_dir, OutgoingCommercialInvoice)
        return qs


class OutgoingCommercialInvoiceCreateView(generics.CreateAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]
    queryset = OutgoingCommercialInvoice.objects.all().order_by('-id')
    serializer_class = OutgoingCommercialInvoiceActionSerializer


class OutgoingCommercialInvoiceUpdateView(generics.RetrieveUpdateAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]
    queryset = OutgoingCommercialInvoice.objects.all().order_by('-id')
    serializer_class = OutgoingCommercialInvoiceActionSerializer


class OutgoingCommercialInvoiceDetailView(generics.RetrieveAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]
    queryset = OutgoingCommercialInvoice.objects.all().order_by('-id')
    serializer_class = OutgoingCommercialInvoiceSerializer


class IncomingPaymentCreateView(generics.CreateAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]
    queryset = IncomingPayment.objects.all().order_by('-id')
    serializer_class = IncomingPaymentActionSerializer


    # def validate_data(self, amount, payment_date, currency, outgoing_commercial_invoice_id):
    #     errors = {}
    #     if not amount:
    #         errors['amount'] = 'Enter amount'

    #     if not payment_date:
    #         errors['payment_date'] = 'Select payment date'

    #     if not currency:
    #         errors['currency'] = 'Select currency'

    #     if not outgoing_commercial_invoice_id:
    #         errors['outgoing_commercial_invoice'] = 'Select invoice'

    #     return errors

    # def post(self, request):
    #     data = request.data
    #     amount = data['amount']['amount']
    #     payment_date = data['payment_date']
    #     currency = data['currency']
    #     outgoing_commercial_invoice_id = data['outgoing_commercial_invoice_id']
    #     complete = data['complete']

    #     errors = self.validate_data(amount, payment_date, currency, outgoing_commercial_invoice_id)

    #     if not errors:
    #         incoming_payment = IncomingPayment.objects.create(
    #             amount=amount,
    #             payment_date=payment_date,
    #             currency=currency,
    #             outgoing_commercial_invoice_id=outgoing_commercial_invoice_id,
    #             complete=complete
    #         )
    #         http_response = Response({'status': True})
    #     else:
    #         http_response = Response(errors, status=status.HTTP_400_BAD_REQUEST)
    #     return http_response


class IncomingPaymentDeductionCreateView(generics.CreateAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]
    queryset = IncomingPaymentDeduction.objects.all().order_by('-id')
    serializer_class = IncomingPaymentDeductionActionSerializer


class IncomingPaymentDeductionDetailView(generics.RetrieveAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]
    queryset = IncomingPaymentDeduction.objects.all().order_by('-id')
    serializer_class = IncomingPaymentDeductionSerializer


class IncomingPaymentDeductionUpdateView(generics.RetrieveUpdateAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]
    queryset = IncomingPaymentDeduction.objects.all().order_by('-id')
    serializer_class = IncomingPaymentDeductionActionSerializer
    

class PaymentSummaryByCustomerListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]
    queryset = Customer.objects.all().order_by('id')
    serializer_class = CustomerPaymentSummarySerilaizer
    #serializer_class = TestSerilaizerPagination
    #pagination_class = GeneralLargeResultsSetPagination

    # def get(self, request, *args, **kwargs):
    #     queryset = ActualPOClub.objects.all().order_by('material_fob_presentage')
    #     serialized_data = []
    #     previous_id = None
    #     for obj in queryset:
    #         print(obj)
    #         serializer = self.get_serializer(obj, context={'previous_id': previous_id})
    #         print(serializer.data)
    #         serialized_data.append(serializer.data)
    #         previous_id = serializer.data['id']
    #         print(previous_id)

    #     return Response(serialized_data)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['previous_id'] = None
        return context


class PaymentSummaryByPOClubDetailView(generics.RetrieveAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]
    queryset = ActualPOClub.objects.all().order_by('-id')
    serializer_class = ActualClubCustomerPaymentSummarySerilaizer


class ShipmentIncomingPaymentCreateView(generics.CreateAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]
    queryset = IncomingPayment.objects.all().order_by('-id')
    serializer_class = IncomingPaymentActionSerializer


class ShipmentIncomingPaymentUpdateView(generics.RetrieveUpdateAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]
    queryset = IncomingPayment.objects.all().order_by('-id')
    serializer_class = IncomingPaymentActionSerializer



class PCLSummaryDetailView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]

    def get_pcd_to_psd(self, purchase_order):
        pcd_to_psd = 0
        if purchase_order.production_cut_date and purchase_order.production_start_date:
            pcd_to_psd = (purchase_order.production_start_date - purchase_order.production_cut_date).days
        return pcd_to_psd
    
    def get_psd_to_ped(self, purchase_order):
        psd_to_ped = 0
        if purchase_order.production_start_date and purchase_order.production_end_date:
            psd_to_ped = (purchase_order.production_end_date - purchase_order.production_start_date).days
        return psd_to_ped
    
    def get_ped_to_efd(self, purchase_order):
        ped_to_efd = 0
        if purchase_order.production_end_date and purchase_order.ex_factory_date:
            ped_to_efd = (purchase_order.ex_factory_date - purchase_order.production_end_date).days
        return ped_to_efd

    def get(self, request, po_club_id):
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        
        data = {
            'supplier_details': [],
            'purchase_order_details': {
                'grns': [],
                'purchase_order_date_details': [],
                'shipments': [],
                'payments': []
            }
        }
        supplier_pos = po_club.get_supplier_pos()
        grns = po_club.get_completed_grns()
        purchase_orders = po_club.get_purchase_orders()

        for supplier_po in supplier_pos:
            materials = supplier_po.get_material_category_flat_list()
            data['supplier_details'].append({
                'id': supplier_po.id,
                'display_number': supplier_po.supplier_po_number,
                'supplier_name': supplier_po.general_po_supplier.supplier.name,
                'materials': materials,
                'payment_term': supplier_po.get_supplier_payment_term(),
                'country': supplier_po.get_supplier_country(),
                'shipment_time': supplier_po.get_shipment_time(),
                'production_lead_time': 0
            })
        
        for grn in grns:
            data['purchase_order_details']['grns'].append({
                'id': grn.id,
                'display_number': grn.grn_number,
                'complete_date': grn.complete_date,
                'material_categories': grn.get_material_categories(),
            })

        for purchase_order in purchase_orders:
            po_data = {
                'id': purchase_order.id,
                'display_number': purchase_order.display_number,
                'production_cut_date': purchase_order.production_cut_date.date() if purchase_order.production_cut_date else None,
                'pcd_to_psd': self.get_pcd_to_psd(purchase_order),
                'production_start_date': purchase_order.production_start_date.date() if purchase_order.production_start_date else None,
                'psd_to_ped': self.get_psd_to_ped(purchase_order),
                'production_end_date': purchase_order.production_end_date.date() if purchase_order.production_end_date else None,
                'ped_to_efd': self.get_ped_to_efd(purchase_order),
                'ex_factory_date': purchase_order.ex_factory_date.date() if purchase_order.ex_factory_date else None,
            }
            data['purchase_order_details']['purchase_order_date_details'].append(po_data)

        for purchase_order in purchase_orders:
            po_data = {
                'id': purchase_order.id,
                'display_number': purchase_order.display_number,
                'shipments': []
            }
            
            shipments = purchase_order.purchaseorderdelivery_set.all()
            for shipment in shipments:
                po_data['shipments'].append({
                    'id': shipment.id,
                    'display_number': shipment.display_number,
                    'delivery_date': shipment.delivery_date
                })
            
            data['purchase_order_details']['shipments'].append(po_data)

        payments = po_club.get_incoming_payments()
        for payment in payments:
            data['purchase_order_details']['payments'].append({
                'id': payment.id,
                'display_number': payment.display_number,
                'payment_date': payment.payment_date
            })

        return Response(data)
    

class TakenFromPOClubListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]
    queryset = ActualPOClub.objects.all().order_by('-id')
    serializer_class = ActualPOClubBasicSerializer


class POClubPCLMatchingListView(APIView):
    permission_classes = (HasPermission,)

    def get(self, request, po_club_id):
        base_po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        derived_po_clubs = ActualPOClub.objects.filter(material_fob_presentage__gt=70).exclude(id=base_po_club.id)

        base_po_club_data = POClubPCLBankInformationSerilaizer(base_po_club, many=False).data
        derived_po_clubs_data = POClubPCLBankInformationSerilaizer(derived_po_clubs, many=True, context={'base_po_club': base_po_club}).data

        data = {
            'base_po_club_data': base_po_club_data,
            'derived_po_clubs_data': derived_po_clubs_data
        }

        return Response(data)
    

class POClubPCLMatchingListViewTest(APIView):
    permission_classes = (HasPermission,)

    def get(self, request):
        pcl_bank_information_ids = PCLBankInformationLinkedPOClub.objects.filter(po_club__material_fob_presentage__lt=70).values_list('pcl_bank_information', flat=True)
        pcl_bank_informations = PCLBankInformation.objects.filter(id__in=pcl_bank_information_ids)
        derived_po_clubs_data = ActualPOClubBasicSerializerV2(pcl_bank_informations, many=True).data
        return Response(derived_po_clubs_data)
    

class POClubPCLMatchingCreateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]

    def post(self, request, po_club_id):
        base_po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        derived_po_clubs = request.data.get('derived_po_clubs', [])
        deleted_derived_po_clubs = request.data.get('deleted_derived_po_clubs', [])

        for row in derived_po_clubs:
            derived_po_club = get_object_or_404(ActualPOClub, pk=row['id'])
            pcl_bank_information, created = PCLBankInformation.objects.get_or_create(
                po_club=base_po_club
            )
            PCLBankInformationLinkedPOClub.objects.get_or_create(
                po_club=derived_po_club,
                pcl_bank_information=base_po_club.pclbankinformation
            )

        for row in deleted_derived_po_clubs:
            derived_po_club = get_object_or_404(ActualPOClub, pk=row['id'])
            derived_po_club.delete()

        return Response({'status': True})
    

class SupplierCommercialInvoiceListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]
    queryset = SupplierPODeliveryInvoice.objects.all().order_by('-id')
    serializer_class = SupplierCommercialInvoiceBasicSerializer
    pagination_class = GeneralLargeResultsSetPagination


class SupplierCommercialInvoiceDetailView(generics.RetrieveAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]
    queryset = SupplierPODeliveryInvoice.objects.all().order_by('-id')
    serializer_class = SupplierCommercialInvoiceDetailSerializer


class SupplierCommercialInvoiceStateListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE ]

    def get(self, request, *args, **kwargs):
        data = []
        for choice in SupplierPODeliveryInvoice.CI_STATE_CHOICES:
            data.append({"id": choice[0], "name": choice[1]})
        return Response(data, status=status.HTTP_200_OK)


class PCLBankInformationStateListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE ]

    def get(self, request, *args, **kwargs):
        data = []
        for choice in PCLBankInformation.STATE_CHOICES:
            data.append({"id": choice[0], "name": choice[1]})
        return Response(data, status=status.HTTP_200_OK)


class SupplierCommercialInvoiceUpdateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE ]

    def post(self, request, supplier_po_delivery_invoice_id):
        supplier_po_delivery_invoice = get_object_or_404(SupplierPODeliveryInvoice, pk=supplier_po_delivery_invoice_id)
        total_price = request.data.get('total_price', None)
        total_debit_note_amount = request.data.get('debit_note_total_amount', None)
        payment_due_date = request.data.get('payment_due_date', None)
        ci_state = request.data.get('ci_state', None)
        attachment = request.data.get('attachment', {})

        supplier_po_delivery_invoice.total_price = total_price
        supplier_po_delivery_invoice.debit_note_total_amount = total_debit_note_amount
        supplier_po_delivery_invoice.payment_due_date = payment_due_date
        supplier_po_delivery_invoice.ci_state = ci_state
        if attachment:
            supplier_po_delivery_invoice.invoice_id = attachment['id']
        supplier_po_delivery_invoice.save()

        return Response({'status': True})
    
    
class SupplierCommercialInvoiceCalculateValueUpdateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE ]

    def post(self, request, supplier_po_delivery_invoice_id):
        supplier_po_delivery_invoice = get_object_or_404(SupplierPODeliveryInvoice, pk=supplier_po_delivery_invoice_id)
        supplier_po_delivery_invoice.set_calculated_values()
        return Response({'status': True})
    

# class PCLMatchingOutgoingPaymentList(generics.ListAPIView):
#     permission_classes = (HasPermission,)
#     write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]
#     serializer_class = PCLMatchingOutgoingPaymentListViewSerializer
#     pagination_class = GeneralLargeResultsSetPagination

#     def get_queryset(self):
#         return []

#     def list(self, request, *args, **kwargs):
#         data = self.get_outgoing_payments()
#         paginator = self.pagination_class()
#         paginated_data = paginator.paginate_queryset(data, request, view=self)
#         serializer = self.get_serializer(paginated_data, many=True)
#         return paginator.get_paginated_response(serializer.data)
    
#     def get_costing_or_po_club(self, instance, type):
#         if type == 'advance':
#             if instance.general_po_supplier.general_po.po_club:
#                 return instance.general_po_supplier.general_po.po_club.display_number
#             else:
#                 return instance.general_po_supplier.general_po.costing.display_number
#         elif type == 'outgoing':
#             supplier_pos = instance.get_supplier_pos()
#             if supplier_pos:
#                 supplier_po = instance.get_supplier_pos()[0]
#                 if supplier_po.general_po_supplier.general_po.po_club:
#                     return supplier_po.general_po_supplier.general_po.po_club.display_number
#                 else:
#                     return supplier_po.general_po_supplier.general_po.costing.display_number
#             else:
#                 return None
#         else:
#             return None

#     def get_invoice_supplier(self, invoice):
#         supplier_pos = invoice.get_supplier_pos()
#         if supplier_pos:
#             supplier_po = invoice.get_supplier_pos()[0]
#             return supplier_po.general_po_supplier.supplier.name
#         else:
#             return None
        
#     def get_invoice_supplier_id(self, invoice):
#         supplier_pos = invoice.get_supplier_pos()
#         if supplier_pos:
#             supplier_po = invoice.get_supplier_pos()[0]
#             return supplier_po.general_po_supplier.supplier.id
#         else:
#             return None
        
#     def get_customer(self, instance, type):
#         if type == 'advance':
#             return instance.general_po_supplier.general_po.costing.order.customer.name
#         elif type == 'outgoing':
#             supplier_pos = instance.get_supplier_pos()
#             if supplier_pos:
#                 supplier_po = instance.get_supplier_pos()[0]
#                 return supplier_po.general_po_supplier.general_po.costing.order.customer.name
#             else:
#                 return None
#         else:
#             return None
        
#     def get_payment_term(self, instance, type):
#         if type == 'advance':
#             return instance.get_supplier_payment_term()
#         elif type == 'outgoing':
#             supplier_pos = instance.get_supplier_pos()
#             if supplier_pos:
#                 supplier_po = instance.get_supplier_pos()[0]
#                 return supplier_po.get_supplier_payment_term()
#             else:
#                 return None
#         else:
#             return None

#     def get_outgoing_payments(self):
#         from supplier_po.models import SupplierPO, SupplierPODeliveryInvoice
#         data = []
#         supplier_pos = SupplierPO.objects.all() #TODO filter not complete spos
#         invoices = SupplierPODeliveryInvoice.objects.all().order_by('-id') #TODO filter not complete invoices
#         ADVANCE_TYPE = 'advance'
#         OUTGOING_TYPE = 'outgoing'
#         index = 0

#         for po in supplier_pos:
#             if po.advance_payment and po.advance_payment_currency:
#                 outgoing_payment_data = []
#                 outgoing_payments = po.get_outgoing_payments()
#                 for outgoing_payment in outgoing_payments:
#                     outgoing_payment_data.append({
#                         'id': outgoing_payment.id,
#                         'display_number': outgoing_payment.display_number
#                     })
#                 amount_data = get_amount_dictionary(po.advance_payment)
#                 data.append({
#                     'id': po.id,
#                     'supplier_id': po.general_po_supplier.supplier.id,
#                     'supplier_name':  po.general_po_supplier.supplier.name,
#                     'material_types': po.get_material_types(),
#                     'costing_or_po_club': self.get_costing_or_po_club(po, ADVANCE_TYPE),
#                     'customer_name': self.get_customer(po, ADVANCE_TYPE),
#                     'display_number': f"{po.supplier_po_number} - {po.proforma_invoice_supplier_display_number}",
#                     'file_path': po.proforma_invoice.get_object_data() if po.proforma_invoice else None,
#                     'payment_term': self.get_payment_term(po, ADVANCE_TYPE),
#                     'type': 'advance',
#                     'amount': amount_data,
#                     'due_amount': po.get_due_amount(),
#                     'balance': po.get_balance_amount(),
#                     'payment_due_date': po.advance_payment_due_date,
#                     'index': index,
#                     'outgoing_payment_data': outgoing_payment_data
#                 })
#                 index += 1
#         for invoice in invoices:
#             amount_data = get_amount_dictionary(invoice.total_price)
#             outgoing_payment_data = []
#             outgoing_payments = invoice.get_outgoing_payments()
#             for outgoing_payment in outgoing_payments:
#                 outgoing_payment_data.append({
#                     'id': outgoing_payment.id,
#                     'display_number': outgoing_payment.display_number
#                 })
#             data.append({
#                 'id': invoice.id,
#                 'supplier_id': self.get_invoice_supplier_id(invoice),
#                 'supplier_name':  self.get_invoice_supplier(invoice),
#                 'costing_or_po_club': self.get_costing_or_po_club(invoice, OUTGOING_TYPE),
#                 'material_types': invoice.get_material_types(),
#                 'customer_name': self.get_customer(invoice, OUTGOING_TYPE),
#                 'display_number': invoice.display_number,
#                 'file_path': invoice.invoice.get_object_data() if invoice.invoice else None,
#                 'payment_term': self.get_payment_term(invoice, OUTGOING_TYPE),
#                 'type': 'outgoing',
#                 'amount': amount_data,
#                 'due_amount': invoice.get_due_amount(),
#                 'balance': invoice.get_balance_amount(),
#                 'payment_due_date': invoice.payment_due_date,
#                 'index': index,
#                 'outgoing_payment_data': outgoing_payment_data
#             })
#             index += 1
#         return data
    

# class POClubPCLMatchingDataDetailView(APIView):
#     permission_classes = (HasPermission,)
#     write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]

#     def validate_total_amounts(self, po_club_pcls, selected_invoices_or_spos):
#         is_valid = True
#         total_available_amount = self.get_total_available_amount(po_club_pcls)
#         invoice_total_quantity = self.get_invoice_total_quantity(selected_invoices_or_spos)
#         if total_available_amount < invoice_total_quantity:
#             is_valid = False
#         return is_valid

#     def get_total_available_amount(self, po_club_pcls):
#         total_amount = 0
#         for po_club_pcl in po_club_pcls:
#             total_amount += po_club_pcl.po_club.get_pcl_available_value()
#         return total_amount
    
#     def get_invoice_total_quantity(self, selected_invoices_or_spos):
#         total_amount = 0
#         for row in selected_invoices_or_spos:
#             if row['type'] == 'advance':
#                 spo = get_object_or_404(SupplierPO, pk=row['id'])
#                 total_amount += spo.advance_payment
#             elif row['type'] == 'outgoing':
#                 invoice = get_object_or_404(SupplierPODeliveryInvoice, pk=row['id'])
#                 if invoice.total_price:
#                     total_amount += invoice.total_price
#         return total_amount

#     def sort_invoices(self, selected_invoices_or_spos):
#         items = []
#         for row in selected_invoices_or_spos:
#             if row['type'] == 'advance':
#                 spo = get_object_or_404(SupplierPO, pk=row['id'])
#                 items.append({'id': spo.id, 'amount_due': spo.advance_payment, 'type': 'advance'})
#             elif row['type'] == 'outgoing':
#                 invoice = get_object_or_404(SupplierPODeliveryInvoice, pk=row['id'])
#                 items.append({'id': invoice.id, 'amount_due': invoice.total_price, 'type': 'outgoing'})
#         return sorted(items, key=lambda x: x['amount_due'])

#     def distribute_amounts(self, po_club_pcls, items):
#         distribution_dict = {}

#         for po_club_pcl in po_club_pcls:
#             available_amount = po_club_pcl.po_club.get_pcl_available_value()
#             po_club_pcl_id = po_club_pcl.id

#             for item in items:
#                 if available_amount <= 0:
#                     break

#                 if item['amount_due'] > 0:
#                     allocation = min(available_amount, item['amount_due'])
#                     item['amount_due'] -= allocation
#                     available_amount -= allocation

#                     if po_club_pcl_id not in distribution_dict:
#                         distribution_dict[po_club_pcl_id] = {
#                             'id': po_club_pcl_id,
#                             'display_number': '%s - %s' % (po_club_pcl.display_number, po_club_pcl.po_club.display_number),
#                             'invoices_or_proforma_invoices': []
#                         }

#                     if item['type'] ==  'advance':
#                         spo = get_object_or_404(SupplierPO, pk=item['id'])
#                         distribution_dict[po_club_pcl_id]['invoices_or_proforma_invoices'].append({
#                             'id': spo.id,
#                             'amount': get_amount_dictionary(allocation),
#                             'type': item['type'],
#                             'supplier_po_delivery_invoice_pcl': None,
#                             'display_number': spo.supplier_po_number + '-' + spo.proforma_invoice_supplier_display_number,
#                             'file_path': spo.proforma_invoice.get_object_data() if spo.proforma_invoice else {},
#                         })

#                     elif item['type'] == 'outgoing':
#                         invoice = get_object_or_404(SupplierPODeliveryInvoice, pk=item['id'])
#                         distribution_dict[po_club_pcl_id]['invoices_or_proforma_invoices'].append({
#                             'id': invoice.id,
#                             'supplier_po_delivery_invoice_pcl': None,
#                             'display_number': invoice.display_number,
#                             'file_path': invoice.invoice.get_object_data() if invoice.invoice else {},
#                             'type': 'outgoing',
#                             'amount': get_amount_dictionary(allocation)
#                         })
#         distribution_results = list(distribution_dict.values())
#         return distribution_results
    
#     def get_invoice_data(self, selected_invoices_or_spos):
#         data = []
#         for row in selected_invoices_or_spos:
#             if row['type'] == 'advance':
#                 spo = get_object_or_404(SupplierPO, pk=row['id'])
#                 data.append({
#                     'id': spo.id,
#                     'display_number': spo.supplier_po_number + '-' + spo.proforma_invoice_supplier_display_number,
#                     'amount': get_amount_dictionary(spo.advance_payment),
#                     'type': 'Advance',
#                 })
#             elif row['type'] == 'outgoing':
#                 invoice = get_object_or_404(SupplierPODeliveryInvoice, pk=row['id'])
#                 data.append({
#                     'id': invoice.id,
#                     'display_number': invoice.display_number,
#                     'amount': get_amount_dictionary(invoice.total_price),
#                     'type': 'Outgoing',
#                 })
#             return data
        
#     def get_pcl_bank_information_data(self, selected_po_club_pcls):
#         data = []
#         for id in selected_po_club_pcls:
#             po_club_pcl = PCLBankInformation.objects.get(pk=id)
#             data.append({
#                 'id': po_club_pcl.id,
#                 'display_number': '%s - %s' % (po_club_pcl.display_number, po_club_pcl.po_club.display_number),
#                 'pcl_available_amount': get_amount_dictionary(po_club_pcl.total_amount),
#                 'pcl_used_amount': get_amount_dictionary(po_club_pcl.pcl_threshold_amount)
#             })
#         return data

#     def post(self, request):
#         selected_po_club_pcls = request.data.get('selected_po_clubs', [])
#         selected_invoices_or_spos = request.data.get('selected_invoices_or_spos', [])
#         data = {
#             'data': None,
#             'selected_po_clubs': [],
#             'selected_invoices_or_spos': [],
#             'payment_type': OutgoingPayment.PCL_PAYMENT_METHOD if selected_po_club_pcls else OutgoingPayment.CASH_PAYMENT,
#             'amount': get_amount_dictionary(self.get_invoice_total_quantity(selected_invoices_or_spos)),
#             'outgoing_payment': None
#         }

#         if data['payment_type'] == OutgoingPayment.PCL_PAYMENT_METHOD:            
#             po_club_pcl_instances = [get_object_or_404(PCLBankInformation, pk=pcl_id) for pcl_id in selected_po_club_pcls]
#             po_club_pcl_instances.sort(key=lambda x: x.po_club.get_pcl_available_value(), reverse=True)
#             is_valid = self.validate_total_amounts(po_club_pcl_instances, selected_invoices_or_spos)
#             if not is_valid:
#                 return Response({'pcl_total_amount_mismatch_error': 'PCL have not enough money to select'}, status=status.HTTP_400_BAD_REQUEST)

#             sorted_items = self.sort_invoices(selected_invoices_or_spos)
#             distribution_results = self.distribute_amounts(po_club_pcl_instances, sorted_items)
#             data['data'] = distribution_results

#         else:
#             data['data'] = []
#             for row in selected_invoices_or_spos:
#                 if row['type'] == 'advance':
#                     spo = get_object_or_404(SupplierPO, pk=row['id'])
#                     data['data'].append({
#                         'id': spo.id,
#                         'supplier_po_delivery_invoice_pcl': None,
#                         'display_number': spo.proforma_invoice_supplier_display_number,
#                         'file_path': spo.proforma_invoice.get_object_data() if spo.proforma_invoice else {},
#                         'type': 'advance',
#                         'amount': get_amount_dictionary(spo.advance_payment)
#                     })
#                 elif row['type'] == 'outgoing':
#                     invoice = get_object_or_404(SupplierPODeliveryInvoice, pk=row['id'])
#                     data['data'].append({
#                         'id': invoice.id,
#                         'supplier_po_delivery_invoice_pcl': None,
#                         'display_number': invoice.display_number,
#                         'file_path': invoice.invoice.get_object_data() if invoice.invoice else {},
#                         'type': 'outgoing',
#                         'amount': get_amount_dictionary(invoice.total_price)
#                     })
#         data['selected_po_clubs'] = selected_po_club_pcls
#         data['selected_invoices_or_spos'] = selected_invoices_or_spos
#         data['pcl_bank_information_data'] = self.get_pcl_bank_information_data(selected_po_club_pcls)
#         data['invoice_data'] = self.get_invoice_data(selected_invoices_or_spos)
#         return Response(data)
    

class OutgoingPaymentUpdateView(ObjectStatePermissionMixin, APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]
    editable_states = [OutgoingPayment.DRAFT_STATE, ]

    def get_object_current_state(self):
        outgoing_payment = self.get_outgoing_payment()
        return outgoing_payment.state   

    def get_outgoing_payment(self):
        outgoing_payment_id = self.kwargs['pk']
        outgoing_payment = get_object_or_404(OutgoingPayment, pk=outgoing_payment_id)
        user = self.request.user
        state = self.request.data.get('state')
        if user and user.has_role(ADMIN_ROLE):
            outgoing_payment.state = OutgoingPayment.DRAFT_STATE
        return outgoing_payment 
    
    def validate_data(self, selected_invoices_or_spos, pcl_bank_information):
        total_pay_amount = 0
        has_errors = False
        index = 0
        errors = {
            'pcl_bank_information_errors': None,
            'selected_invoices_or_spos_errors': {}
        }
        for row in selected_invoices_or_spos:
            type = row['type']
            amount = row['amount']['amount']
            paid_amount = row['paid_amount']['amount']
            if type == 'advance':
                supplier_po = get_object_or_404(SupplierPO, pk=row['id'])
                if not supplier_po.get_due_amount()['amount'] >= paid_amount:
                    has_errors = True
                    errors['selected_invoices_or_spos_errors'][index] = {
                        'error': 'Paid amount cannot exceed due amount.'
                    }
            else:
                invoice = get_object_or_404(SupplierPODeliveryInvoice, pk=row['id'])
                if not invoice.get_due_amount()['amount'] >= paid_amount:
                    has_errors = True
                    errors['selected_invoices_or_spos_errors'][index] = {
                        'error': 'Paid amount cannot exceed due amount.'
                    }
            index += 1
            total_pay_amount += paid_amount

        pcl_due_amount = pcl_bank_information.get_due_amount()
        if not pcl_due_amount >= total_pay_amount:
            errors['pcl_bank_information_errors'] = {
                        'id': pcl_bank_information.id,
                        'error': 'PCL falitity has not enugh money to settle'
                    }
            has_errors = True
        return has_errors, errors

    def post(self, request, pk):
        outgoing_payment = get_object_or_404(OutgoingPayment, pk=pk)
        pcl_bank_information_id = request.data.get('pcl_bank_information_id', None)
        payment_type = request.data.get('payment_type', None)
        pcl_create_date = request.data.get('pcl_create_date', None)
        pcl_end_date = request.data.get('pcl_end_date', None)
        pcl_settle_date = request.data.get('pcl_settle_date', None)
        payment_date = request.data.get('payment_date', None)
        interest_rate = request.data.get('interest_rate', None)
        interest_charge = request.data.get('interest_charge', None)
        interest_charge_currency = request.data.get('interest_charge_currency', None)
        state = request.data.get('state', None)
        invoices_or_proforma_invoices = request.data.get('selected_invoices_or_spos', [])
        pcl_bank_information = get_object_or_404(PCLBankInformation, pk=pcl_bank_information_id)

        has_errors, errors = self.validate_data(invoices_or_proforma_invoices, pcl_bank_information)

        if has_errors:
            http_response = Response(errors, status=status.HTTP_400_BAD_REQUEST)

        else:
            for row in invoices_or_proforma_invoices:
                supplier_po_delivery_invoice_pcl_id = row['supplier_po_delivery_invoice_pcl']
                type = row['type']
                amount = row['paid_amount']['amount']
                if supplier_po_delivery_invoice_pcl_id:
                    supplier_po_delivery_invoice_pcl = get_object_or_404(SupplierPODeliveryInvoicePCL, pk=supplier_po_delivery_invoice_pcl_id)
                else:
                    if type == 'advance':
                        content_type = ContentType.objects.get_for_model(SupplierPO)
                        supplier_po = get_object_or_404(SupplierPO, pk=row['id'])
                        supplier_po_delivery_invoice_pcl = SupplierPODeliveryInvoicePCL.objects.create(
                            entity_type=content_type,
                            entity_id=supplier_po.id,
                            outgoing_payment=outgoing_payment
                        )
                    else:
                        content_type = ContentType.objects.get_for_model(SupplierPODeliveryInvoice)
                        invoice = get_object_or_404(SupplierPODeliveryInvoice, pk=row['id'])
                        supplier_po_delivery_invoice_pcl = SupplierPODeliveryInvoicePCL.objects.create(
                            entity_type=content_type,
                            entity_id=invoice.id,
                            outgoing_payment=outgoing_payment
                        )
                supplier_po_delivery_invoice_pcl.amount = amount
                supplier_po_delivery_invoice_pcl.currency = CurrencyHelper.USD_CURRENCY
                supplier_po_delivery_invoice_pcl.save()

            outgoing_payment.payment_date = payment_date
            outgoing_payment.pcl_bank_information = pcl_bank_information
            outgoing_payment.payment_method = payment_type
            outgoing_payment.pcl_create_date = pcl_create_date
            outgoing_payment.pcl_end_date = pcl_end_date
            outgoing_payment.pcl_settle_date = pcl_settle_date
            #outgoing_payment.interest_rate = interest_rate
            outgoing_payment.interest_charge = interest_charge
            outgoing_payment.interest_charge_currency = interest_charge_currency
            outgoing_payment.state = state
            outgoing_payment.interest_rate = interest_rate
            outgoing_payment.save()
            outgoing_payment.recalculate_amount()
            http_response = Response({'sucess': True})

        return http_response
    

class OutgoingPaymentDetailView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]

    def get_invoice_data(self, selected_invoices_or_spos):
        data = []
        for row in selected_invoices_or_spos:
            if row['type'] == 'advance':
                spo = get_object_or_404(SupplierPO, pk=row['id'])
                data.append({
                    'id': spo.id,
                    'display_number': f"{spo.supplier_po_number} - {spo.proforma_invoice_supplier_display_number}",
                    'amount': get_amount_dictionary(spo.advance_payment),
                    'balance_amount': spo.get_balance_amount(),
                    'type': 'Advance',
                })
            elif row['type'] == 'outgoing':
                invoice = get_object_or_404(SupplierPODeliveryInvoice, pk=row['id'])
                data.append({
                    'id': invoice.id,
                    'display_number': invoice.display_number,
                    'amount': get_amount_dictionary(invoice.total_price),
                    'balance_amount': invoice.get_balance_amount(),
                    'type': 'Outgoing',
                })
        return data

    def get_invoice_spo_id(self, supplier_po_delivery_invoice_pcl):
        if supplier_po_delivery_invoice_pcl.supplier_po:
            return supplier_po_delivery_invoice_pcl.supplier_po.id
        elif supplier_po_delivery_invoice_pcl.invoice:
            return supplier_po_delivery_invoice_pcl.invoice.id
        else:
            return None
        
    def get_invoice_spo_display_number(self, supplier_po_delivery_invoice_pcl):
        if supplier_po_delivery_invoice_pcl.supplier_po:
            supplier_po_number = supplier_po_delivery_invoice_pcl.supplier_po.supplier_po_number or ""
            proforma_invoice_supplier_display_number = supplier_po_delivery_invoice_pcl.supplier_po.proforma_invoice_supplier_display_number or ""
            display_number = '%s - %s' % (supplier_po_number, proforma_invoice_supplier_display_number)
            return display_number
        elif supplier_po_delivery_invoice_pcl.invoice:
            return supplier_po_delivery_invoice_pcl.invoice.display_number
        else:
            return None
        
    def get_invoice_spo_type(self, supplier_po_delivery_invoice_pcl):
        if supplier_po_delivery_invoice_pcl.supplier_po:
            return 'advance'
        elif supplier_po_delivery_invoice_pcl.invoice:
            return 'outgoing'
        else:
            return None
        
    def get_invoice_spo_amount(self, supplier_po_delivery_invoice_pcl):
        if supplier_po_delivery_invoice_pcl.supplier_po:
            return get_amount_dictionary(supplier_po_delivery_invoice_pcl.supplier_po.advance_payment)
        elif supplier_po_delivery_invoice_pcl.invoice:
            return get_amount_dictionary(supplier_po_delivery_invoice_pcl.invoice.total_price)
        else:
            return {}
        
    def get_invoice_spo_balance_amount(self, supplier_po_delivery_invoice_pcl):
        if supplier_po_delivery_invoice_pcl.supplier_po:
            return supplier_po_delivery_invoice_pcl.supplier_po.get_balance_amount()
        elif supplier_po_delivery_invoice_pcl.invoice:
            return supplier_po_delivery_invoice_pcl.invoice.get_balance_amount()
        else:
            return {}
        
    def get_invoice_spo_due_amount(self, supplier_po_delivery_invoice_pcl):
        if supplier_po_delivery_invoice_pcl.supplier_po:
            return supplier_po_delivery_invoice_pcl.supplier_po.get_due_amount()
        elif supplier_po_delivery_invoice_pcl.invoice:
            return supplier_po_delivery_invoice_pcl.invoice.get_due_amount()
        else:
            return {}

    def get(self, request, pk):
        outgoing_payment = get_object_or_404(OutgoingPayment, pk=pk)
        data = {
            'data': [],
            'pcl_bank_information_id': outgoing_payment.pcl_bank_information.id if outgoing_payment.pcl_bank_information else None,
            'pcl_bank_information_display_number': outgoing_payment.pcl_bank_information.display_number if outgoing_payment.pcl_bank_information else None,
            'pcl_threshold_amount': get_amount_dictionary(outgoing_payment.pcl_bank_information.pcl_threshold_amount if outgoing_payment.pcl_bank_information else 0),
            'pcl_balance_amount': get_amount_dictionary(outgoing_payment.pcl_bank_information.get_balance_amount() if outgoing_payment.pcl_bank_information else 0),
            'pcl_used_amount': get_amount_dictionary(outgoing_payment.pcl_bank_information.get_used_amount() if outgoing_payment.pcl_bank_information else 0),
            'selected_invoices_or_spos': [],
            'payment_type': outgoing_payment.payment_method,
            'payment_type_display': outgoing_payment.get_payment_method_display(),
            'amount': get_amount_dictionary(outgoing_payment.amount),
            'payment_date': outgoing_payment.payment_date,
            'outgoing_payment': outgoing_payment.id,
            'invoice_data': None,
            'display_number': outgoing_payment.display_number,
            'pcl_settle_date': outgoing_payment.pcl_settle_date,
            'pcl_create_date': outgoing_payment.pcl_create_date,
            'pcl_end_date': outgoing_payment.pcl_end_date,
            'complete': outgoing_payment.complete,
            'interest_charge': outgoing_payment.interest_charge,
	        'interest_charge_currency': outgoing_payment.interest_charge_currency,
            'interest_rate': outgoing_payment.interest_rate,
            'state': outgoing_payment.state,
            'state_display': outgoing_payment.get_state_display()
        }
        supplier_po_delivery_invoice_pcls = outgoing_payment.get_supplier_po_delivery_invoice_pcls()

        for supplier_po_delivery_invoice_pcl in supplier_po_delivery_invoice_pcls:
            data['selected_invoices_or_spos'].append({
                'id': self.get_invoice_spo_id(supplier_po_delivery_invoice_pcl),
                'supplier_po_delivery_invoice_pcl': supplier_po_delivery_invoice_pcl.id,
                'display_number': self.get_invoice_spo_display_number(supplier_po_delivery_invoice_pcl),
                #'file_path': supplier_po_delivery_invoice_pcl.supplier_po.proforma_invoice.get_object_data() if supplier_po_delivery_invoice_pcl.supplier_po.proforma_invoice else {},
                'type': self.get_invoice_spo_type(supplier_po_delivery_invoice_pcl),
                'amount': self.get_invoice_spo_amount(supplier_po_delivery_invoice_pcl),
                'due_amount': self.get_invoice_spo_balance_amount(supplier_po_delivery_invoice_pcl),
                'balance_amount': self.get_invoice_spo_balance_amount(supplier_po_delivery_invoice_pcl),
                'paid_amount': get_amount_dictionary(supplier_po_delivery_invoice_pcl.amount),
            })

        data['invoice_data'] = self.get_invoice_data(data['selected_invoices_or_spos'])
        return Response(data)
    

class OutgoingPaymentStateListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        data = []
        for choice in OutgoingPayment.STATE_CHOICES:
            data.append({"id": choice[0], "name": choice[1]})
        return Response(data, status=status.HTTP_200_OK)
    

class OutgoingPaymentInterestRateListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        data = []
        interest_rates = PCLInterestRate.objects.filter(active=True)
        for interest_rate in interest_rates:
            data.append({"id": interest_rate.id, "name": interest_rate.interest_rate})
        return Response(data, status=status.HTTP_200_OK)
    

class OutgoingPaymentStateChangeView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE]

    def post(self, request, *args, **kwargs):
        outgoing_payment_id = kwargs.get('pk', None)
        state = request.data.get('new_state', None)
        outgoing_payment = get_object_or_404(OutgoingPayment, pk=outgoing_payment_id)
        response = outgoing_payment.move_to_next_state(state)
        http_response = Response(response)
        return http_response
    

class BankPCLCreateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]

    def post(self, request, po_club_id):
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        pcl_available_value = get_amount_dictionary(po_club.get_pcl_available_value())
        pcl_bank_information, created = PCLBankInformation.objects.get_or_create(po_club=po_club)
        pcl_bank_information.total_amount = pcl_available_value['amount']
        pcl_bank_information.total_amount_currency = pcl_available_value['amount_currency']
        pcl_bank_information.state = PCLBankInformation.DRAFT_STATE
        return Response({'status': True})
    

class DuePaymentCalanderView(APIView):
    permission_classes = (HasPermission,)

    def validate_dates(self, start_date, end_date):
        from datetime import datetime
        errors = []
        has_errors = False
        if not start_date or not end_date:
            errors.append({'Start date and End date are required.'})
            has_errors = True
        try:
            start_date = datetime.strptime(start_date, "%Y-%m-%d")
            end_date = datetime.strptime(end_date, "%Y-%m-%d")
        except ValueError:
            errors.append({'Invalid date format. Use YYYY-MM-DD.'})
            has_errors = True
        if start_date > end_date:
            errors.append({'Start date cannot be after end_date.'})
            has_errors = True
        return has_errors, errors
    
    def get_count(self, qs):
        index = 0
        for row in qs:
            if row.get_balance_amount()['amount'] > 0:
                index += 1
        return index
    
    def get_total_advance(self, qs):
        total = 0
        for row in qs:
            total += row.get_balance_amount()['amount']
        return total

    def get_total_on_grn(self, qs):
        total = 0
        for row in qs:
            total += row.get_balance_amount()['amount']
        return total

    def get(self, request):
        from datetime import datetime, timedelta
        from django.db.models import Sum

        start_date = request.query_params.get('start_date', None)
        end_date = request.query_params.get('end_date', None)
        has_errors, errors = self.validate_dates(start_date, end_date)
        has_errors = False
        
        if not has_errors:
            start_date = datetime.strptime(start_date, "%Y-%m-%d")
            end_date = datetime.strptime(end_date, "%Y-%m-%d")
            results = {}
            current_date = start_date

            while current_date <= end_date:
                total_payable = 0.00
                date_data = {
                    'customers': [],
                }
                supplier_pos = SupplierPO.objects.filter(advance_payment_due_date=current_date.date())
                invoices = SupplierPODeliveryInvoice.objects.filter(payment_due_date=current_date.date())
                grns = SupplierPOGRN.objects.filter(supplier_pack_list__supplier_po_delivery_note__supplier_po_delivery_invoice__payment_due_date=current_date.date())
                outgoing_commercial_invoices = OutgoingCommercialInvoice.objects.filter(due_date=current_date.date())
                customer_ids = list(supplier_pos.values_list('general_po_supplier__general_po__costing__order__customer', flat=True)) + \
                                list(grns.values_list('supplier_po__general_po_supplier__general_po__costing__order__customer', flat=True))
                customers = Customer.objects.filter(id__in=customer_ids)
                total_receivable = outgoing_commercial_invoices.aggregate(amount=Sum('amount'))['amount'] or 0

                for customer in customers:
                    advance_count_qs = supplier_pos.filter(general_po_supplier__general_po__costing__order__customer=customer)
                    on_grn_count_qs = grns.filter(
                        supplier_po__general_po_supplier__general_po__costing__order__customer=customer,
                        supplier_pack_list__supplier_po_delivery_note__supplier_po_delivery_invoice__in=invoices
                    )
                    invoice_qs = invoices.filter(
                        id__in=on_grn_count_qs.values_list('supplier_pack_list__supplier_po_delivery_note__supplier_po_delivery_invoice', flat=True)
                    )
                    total_advance = self.get_total_advance(advance_count_qs)
                    total_on_grn_total = self.get_total_on_grn(invoice_qs)
                    value = total_advance + total_on_grn_total

                    date_data['customers'].append({
                        'id': customer.id,
                        'name': customer.name,
                        'advance_count': self.get_count(advance_count_qs),
                        'on_grn_count': self.get_count(invoice_qs),
                        'value': get_amount_dictionary(value),
                        'total_count': self.get_count(advance_count_qs) + self.get_count(invoice_qs),
                    })
                    total_payable += value
                    
                date_data['total_payable'] = get_amount_dictionary(total_payable)
                date_data['total_receivable'] = get_amount_dictionary(total_receivable)

                if date_data['customers']:
                    if str(current_date.date()) not in results:
                        results[str(current_date.date())] = {}
                    results[str(current_date.date())] = date_data
                current_date += timedelta(days=1)

            return Response(results)
        else:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)
        

class DuePaymentCalanderAdvancePaymentListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]
    serializer_class = PCLMatchingOutgoingPaymentListViewSerializer
    pagination_class = GeneralLargeResultsSetPagination

    def get_queryset(self):
        return []

    def list(self, request, *args, **kwargs):
        date = self.request.query_params.get('date', None)
        customer_id = self.kwargs['customer_id']
        data = self.get_data(customer_id, date)
        paginator = self.pagination_class()
        paginated_data = paginator.paginate_queryset(data, request, view=self)
        serializer = self.get_serializer(paginated_data, many=True)
        return paginator.get_paginated_response(serializer.data)

    def get_data(self, customer_id, date):
        data = []
        customer = get_object_or_404(Customer, pk=customer_id)
        supplier_pos = SupplierPO.objects.filter(general_po_supplier__general_po__costing__order__customer=customer, advance_payment_due_date=date)
        index = 0
        for supplier_po in supplier_pos:
            if supplier_po.get_balance_amount()['amount'] > 0:
                data.append({
                    'id': supplier_po.id,
                    'supplier_name':  supplier_po.general_po_supplier.supplier.name,
                    'material_types': supplier_po.get_material_types(),
                    'customer_name': supplier_po.get_customer().name,
                    'costing_or_po_club': supplier_po.get_costing_or_po_club().display_number,
                    'display_number': f"{supplier_po.supplier_po_number} - {supplier_po.proforma_invoice_supplier_display_number}",
                    'file_path': supplier_po.proforma_invoice.get_object_data() if supplier_po.proforma_invoice else None,
                    'payment_term': supplier_po.get_payment_term(),
                    'type': 'advance',
                    'amount': get_amount_dictionary(supplier_po.advance_payment),
                    'due_amount': supplier_po.get_due_amount(),
                    'balance_display': supplier_po.get_balance_amount(),
                    'balance': supplier_po.get_balance_amount(),
                    'paid_amount': supplier_po.get_paid_amount(),
                    'payment_due_date': supplier_po.advance_payment_due_date,
                    'index': index
                })
                index += 1
        return data
    

class DuePaymentCalanderInvoiceListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]
    serializer_class = PCLMatchingOutgoingPaymentListViewSerializer
    pagination_class = GeneralLargeResultsSetPagination

    def get_queryset(self):
        return []

    def list(self, request, *args, **kwargs):
        date = self.request.query_params.get('date', None)
        customer_id = self.kwargs['customer_id']
        data = self.get_data(customer_id, date)
        paginator = self.pagination_class()
        paginated_data = paginator.paginate_queryset(data, request, view=self)
        serializer = self.get_serializer(paginated_data, many=True)
        return paginator.get_paginated_response(serializer.data)

    def get_data(self, customer_id, date):
        data = []
        customer = get_object_or_404(Customer, pk=customer_id)
        invoices = SupplierPODeliveryInvoice.objects.filter(payment_due_date=date)
        grns = SupplierPOGRN.objects.filter(supplier_pack_list__supplier_po_delivery_note__supplier_po_delivery_invoice__in=invoices)
        grn_qs = grns.filter(
            supplier_po__general_po_supplier__general_po__costing__order__customer=customer,
            supplier_pack_list__supplier_po_delivery_note__supplier_po_delivery_invoice__in=invoices
        )
        invoice_qs = invoices.filter(
            id__in=grn_qs.values_list('supplier_pack_list__supplier_po_delivery_note__supplier_po_delivery_invoice', flat=True)
        )
        index = 0
        for invoice in invoice_qs:
            if invoice.get_balance_amount()['amount'] > 0:
                data.append({
                    'id': invoice.id,
                    'supplier_name':  invoice.get_invoice_supplier().name if invoice.get_invoice_supplier() else None,
                    'material_types': invoice.get_material_types(),
                    'customer_name': invoice.get_customer().name if invoice.get_customer() else None,
                    'costing_or_po_club': invoice.get_costing_or_po_club().display_number,
                    'display_number': invoice.display_number,
                    'file_path': invoice.invoice.get_object_data() if invoice.invoice else None,
                    'payment_term': invoice.get_payment_term(),
                    'type': 'outgoing',
                    'amount': get_amount_dictionary(invoice.total_price),
                    'due_amount': invoice.get_due_amount(),
                    'balance_display': invoice.get_balance_amount(),
                    'balance': invoice.get_balance_amount(),
                    'paid_amount': invoice.get_paid_amount(),
                    'payment_due_date': invoice.payment_due_date,
                    'index': index
                })
                index += 1
        return data
    


class DuePaymentCalanderAllDuePaymentListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]
    serializer_class = PCLMatchingOutgoingPaymentListViewSerializer
    pagination_class = GeneralLargeResultsSetPagination

    def get_queryset(self):
        return []

    def list(self, request, *args, **kwargs):
        date = self.request.query_params.get('date', None)
        customer_id = self.kwargs['customer_id']
        data = self.get_data(customer_id, date)
        paginator = self.pagination_class()
        paginated_data = paginator.paginate_queryset(data, request, view=self)
        serializer = self.get_serializer(paginated_data, many=True)
        return paginator.get_paginated_response(serializer.data)

    def get_data(self, customer_id, date):
        data = []
        customer = get_object_or_404(Customer, pk=customer_id)
        supplier_pos = SupplierPO.objects.filter(general_po_supplier__general_po__costing__order__customer=customer, advance_payment_due_date=date)
        index = 0
        for supplier_po in supplier_pos:
            if supplier_po.get_balance_amount()['amount'] > 0:
                data.append({
                    'id': supplier_po.id,
                    'supplier_name':  supplier_po.general_po_supplier.supplier.name,
                    'material_types': supplier_po.get_material_types(),
                    'customer_name': supplier_po.get_customer().name,
                    'costing_or_po_club': supplier_po.get_costing_or_po_club().display_number,
                    'display_number': f"{supplier_po.supplier_po_number} - {supplier_po.proforma_invoice_supplier_display_number}",
                    'file_path': supplier_po.proforma_invoice.get_object_data() if supplier_po.proforma_invoice else None,
                    'payment_term': supplier_po.get_payment_term(),
                    'type': 'advance',
                    'amount': get_amount_dictionary(supplier_po.advance_payment),
                    'due_amount': supplier_po.get_due_amount(),
                    'balance_display': supplier_po.get_balance_amount(),
                    'balance': supplier_po.get_balance_amount(),
                    'paid_amount': supplier_po.get_paid_amount(),
                    'payment_due_date': supplier_po.advance_payment_due_date,
                    'index': index
                })
                index += 1

        invoices = SupplierPODeliveryInvoice.objects.filter(payment_due_date=date)
        grns = SupplierPOGRN.objects.filter(supplier_pack_list__supplier_po_delivery_note__supplier_po_delivery_invoice__in=invoices)
        grn_qs = grns.filter(
            supplier_po__general_po_supplier__general_po__costing__order__customer=customer,
            supplier_pack_list__supplier_po_delivery_note__supplier_po_delivery_invoice__in=invoices
        )
        invoice_qs = invoices.filter(
            id__in=grn_qs.values_list('supplier_pack_list__supplier_po_delivery_note__supplier_po_delivery_invoice', flat=True)
        )

        for invoice in invoice_qs:
            if invoice.get_balance_amount()['amount'] > 0:
                data.append({
                    'id': invoice.id,
                    'supplier_name':  invoice.get_invoice_supplier().name if invoice.get_invoice_supplier() else None,
                    'material_types': invoice.get_material_types(),
                    'customer_name': invoice.get_customer().name if invoice.get_customer() else None,
                    'costing_or_po_club': invoice.get_costing_or_po_club().display_number,
                    'display_number': invoice.display_number,
                    'file_path': invoice.invoice.get_object_data() if invoice.invoice else None,
                    'payment_term': invoice.get_payment_term(),
                    'type': 'outgoing',
                    'amount': get_amount_dictionary(invoice.total_price),
                    'due_amount': invoice.get_due_amount(),
                    'balance_display': invoice.get_balance_amount(),
                    'balance': invoice.get_balance_amount(),
                    'paid_amount': invoice.get_paid_amount(),
                    'payment_due_date': invoice.payment_due_date,
                    'index': index
                })
                index += 1
        return data


# class DuePaymentListView(generics.ListAPIView):
#     permission_classes = (HasPermission,)
#     write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]
#     serializer_class = CustomPCLSettlementSerializer
#     pagination_class = GeneralLargeResultsSetPagination

#     def get_queryset(self):
#         return []

#     def list(self, request, *args, **kwargs):
#         data = self.get_outgoing_payments()
#         paginator = self.pagination_class()
#         paginated_data = paginator.paginate_queryset(data, request, view=self)
#         serializer = self.get_serializer(paginated_data, many=True)
#         return paginator.get_paginated_response(serializer.data)
    

#     def get_costing_or_po_club(self, instance, type):
#         if type == 'advance':
#             if instance.general_po_supplier.general_po.po_club:
#                 return instance.general_po_supplier.general_po.po_club.display_number
#             else:
#                 return instance.general_po_supplier.general_po.costing.display_number
#         elif type == 'outgoing':
#             supplier_pos = instance.get_supplier_pos()
#             if supplier_pos:
#                 supplier_po = instance.get_supplier_pos()[0]
#                 if supplier_po.general_po_supplier.general_po.po_club:
#                     return supplier_po.general_po_supplier.general_po.po_club.display_number
#                 else:
#                     return supplier_po.general_po_supplier.general_po.costing.display_number
#             else:
#                 return None
#         else:
#             return None

#     def get_invoice_supplier(self, invoice):
#         supplier_pos = invoice.get_supplier_pos()
#         if supplier_pos:
#             supplier_po = invoice.get_supplier_pos()[0]
#             return supplier_po.general_po_supplier.supplier.name
#         else:
#             return None
        
#     def get_customer(self, instance, type):
#         if type == 'advance':
#             return instance.general_po_supplier.general_po.costing.order.customer.name
#         elif type == 'outgoing':
#             supplier_pos = instance.get_supplier_pos()
#             if supplier_pos:
#                 supplier_po = instance.get_supplier_pos()[0]
#                 return supplier_po.general_po_supplier.general_po.costing.order.customer.name
#             else:
#                 return None
#         else:
#             return None
        
#     def get_payment_term(self, instance, type):
#         if type == 'advance':
#             return instance.get_supplier_payment_term()
#         elif type == 'outgoing':
#             supplier_pos = instance.get_supplier_pos()
#             if supplier_pos:
#                 supplier_po = instance.get_supplier_pos()[0]
#                 return supplier_po.get_supplier_payment_term()
#             else:
#                 return None
#         else:
#             return None

#     def validate_dates(self, start_date, end_date):
#         from datetime import datetime
#         errors = []
#         has_errors = False
#         if not start_date or not end_date:
#             errors.append({'Start date and End date are required.'})
#             has_errors = True
#         try:
#             start_date = datetime.strptime(start_date, "%Y-%m-%d")
#             end_date = datetime.strptime(end_date, "%Y-%m-%d")
#         except ValueError:
#             errors.append({'Invalid date format. Use YYYY-MM-DD.'})
#             has_errors = True
#         if start_date > end_date:
#             errors.append({'Start date cannot be after end_date.'})
#             has_errors = True

#         return has_errors, errors

#     def get_outgoing_payments(self):
#         from datetime import datetime, timedelta
#         from django.db.models import Sum
#         start_date = self.request.query_params.get('start_date')
#         end_date = self.request.query_params.get('end_date')
#         has_errors, errors = self.validate_dates(start_date, end_date)

#         ADVANCE_TYPE = 'advance'
#         OUTGOING_TYPE = 'outgoing'

#         if not has_errors:
#             start_date = datetime.strptime(start_date, "%Y-%m-%d")
#             end_date = datetime.strptime(end_date, "%Y-%m-%d")
#             results = []

#             supplier_pos = SupplierPO.objects.filter(advance_payment_due_date__range=[start_date.date(), end_date.date()])
#             grns = SupplierPOGRN.objects.filter(supplier_pack_list__supplier_po_delivery_note__supplier_po_delivery_invoice__payment_due_date__range=[start_date.date(), end_date.date()])

#             customer_ids = list(supplier_pos.values_list('general_po_supplier__general_po__costing__order__customer', flat=True)) + \
#                             list(grns.values_list('supplier_po__general_po_supplier__general_po__costing__order__customer', flat=True))

#             customers = Customer.objects.filter(id__in=customer_ids)
#             for customer in customers:
#                 customer_data = {
#                     'id': customer.id,
#                     'name': customer.name,
#                     'po_clubs': []
#                 }
#                 customer_supplier_pos = supplier_pos.filter(general_po_supplier__general_po__costing__order__customer=customer)
#                 customer_grns = grns.filter(supplier_po__general_po_supplier__general_po__costing__order__customer=customer)

#                 po_club_ids = list(customer_supplier_pos.values_list('general_po_supplier__general_po__po_club', flat=True)) + \
#                                 list(customer_grns.values_list('supplier_po__general_po_supplier__general_po__po_club', flat=True))
#                 po_clubs = ActualPOClub.objects.filter(id__in=po_club_ids)
#                 for po_club in po_clubs:
#                     club_supplier_pos = customer_supplier_pos.filter(general_po_supplier__general_po__po_club=po_club)
#                     club_invoice_ids = customer_grns.filter(supplier_po__general_po_supplier__general_po__po_club=po_club).values_list('supplier_pack_list__supplier_po_delivery_note__supplier_po_delivery_invoice', flat=True)
#                     club_invoices = SupplierPODeliveryInvoice.objects.filter(id__in=club_invoice_ids)

#                     po_club_data = {
#                         'id': po_club.id,
#                         'dispaly_name': po_club.display_number,
#                         'payments': []
#                     }
#                     for po in club_supplier_pos:
#                         if po.advance_payment and po.advance_payment_currency:
#                             amount_data = get_amount_dictionary(po.advance_payment)
#                             po_club_data['payments'].append({
#                                 'id': po.id,
#                                 'supplier_id': po.general_po_supplier.supplier.id,
#                                 'supplier_name':  po.general_po_supplier.supplier.name,
#                                 'material_types': ['Fabric', 'Sewing Trims'],
#                                 'costing_or_po_club': self.get_costing_or_po_club(po, ADVANCE_TYPE),
#                                 'customer_name': self.get_customer(po, ADVANCE_TYPE),
#                                 'display_number': f"{po.supplier_po_number} - {po.proforma_invoice_supplier_display_number}",
#                                 'file_path': po.proforma_invoice.get_object_data() if po.proforma_invoice else None,
#                                 'payment_term': self.get_payment_term(po, ADVANCE_TYPE),
#                                 'type': 'advance',
#                                 'amount': amount_data,
#                                 'payment_due_date': po.advance_payment_due_date
#                             })
#                     for invoice in club_invoices:
#                         amount_data = get_amount_dictionary(invoice.total_price)
#                         po_club_data['payments'].append({
#                             'id': invoice.id,
#                             'supplier_name':  self.get_invoice_supplier(invoice),
#                             'costing_or_po_club': self.get_costing_or_po_club(invoice, OUTGOING_TYPE),
#                             'material_types': ['Fabric', 'Sewing Trims'],
#                             'customer_name': self.get_customer(invoice, OUTGOING_TYPE),
#                             'display_number': invoice.display_number,
#                             'file_path': invoice.invoice.get_object_data() if invoice.invoice else None,
#                             'payment_term': self.get_payment_term(invoice, OUTGOING_TYPE),
#                             'type': 'outgoing',
#                             'amount': amount_data,
#                             'payment_due_date': invoice.payment_due_date
#                         })
#                     customer_data['po_clubs'].append(po_club_data)
#                 results.append(customer_data)
#         return results


class DuePaymentListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]
    serializer_class = PCLMatchingOutgoingPaymentListViewSerializer
    pagination_class = GeneralLargeResultsSetPagination

    start_date = None
    end_date = None
    due_count = 0

    def get_queryset(self):
        return []

    def list(self, request, *args, **kwargs):
        data = self.get_outgoing_payments()
        paginator = self.pagination_class()
        paginated_data = paginator.paginate_queryset(data, request, view=self)
        serializer = self.get_serializer(paginated_data, many=True)
        meta_data = {
            'start_date': self.start_date.date(),
            'end_date': self.end_date.date(),
            'due_count': self.due_count
        }
        return paginator.get_paginated_response(serializer.data, meta_data)

    def validate_dates(self, start_date, end_date):
        from datetime import datetime
        errors = []
        has_errors = False
        
        try:
            if start_date or end_date:
                start_date = datetime.strptime(start_date, "%Y-%m-%d")
                end_date = datetime.strptime(end_date, "%Y-%m-%d")
        except ValueError:
            errors.append({'Invalid date format. Use YYYY-MM-DD.'})
            has_errors = True
        if start_date > end_date:
            errors.append({'Start date cannot be after end_date.'})
            has_errors = True

        return has_errors, errors
    
    def get_total_due_count(self):
        from datetime import date
        today = date.today()
        spos = SupplierPO.objects.filter(advance_payment_due_date__lte=today)
        grns = SupplierPOGRN.objects.filter(supplier_pack_list__supplier_po_delivery_note__supplier_po_delivery_invoice__payment_due_date__lte=today)
        invoice_ids = grns.filter().values_list('supplier_pack_list__supplier_po_delivery_note__supplier_po_delivery_invoice', flat=True)
        invoices = SupplierPODeliveryInvoice.objects.filter(id__in=invoice_ids)
        for spo in spos:
            if spo.get_balance_amount()['amount'] > 0:
                self.due_count += 1
        for invoice in invoices:
            if invoice.get_balance_amount()['amount'] > 0:
                self.due_count += 1

    def get_outgoing_payments(self):
        from datetime import datetime, timedelta, date
        from django.db.models import Sum
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        customer = self.request.query_params.get('customer')
        supplier = self.request.query_params.get('supplier')
        has_errors, errors = self.validate_dates(start_date, end_date)
        index = 0
        self.get_total_due_count()

        if not has_errors:
            results = []
            if not start_date and not end_date:
                today = date.today()
                start_week_date = today - timedelta(days=today.weekday())
                end_week_date = start_week_date + timedelta(days=6)
                self.start_date = datetime.combine(start_week_date, datetime.min.time())
                self.end_date = datetime.combine(end_week_date, datetime.min.time())
            else:
                self.start_date = datetime.strptime(start_date, "%Y-%m-%d")
                self.end_date = datetime.strptime(end_date, "%Y-%m-%d")
            
            if supplier:
                supplier_pos = SupplierPO.objects.filter(advance_payment_due_date__range=[self.start_date.date(), self.end_date.date()], general_po_supplier__supplier__id=supplier)
                grns = SupplierPOGRN.objects.filter(supplier_pack_list__supplier_po_delivery_note__supplier_po_delivery_invoice__payment_due_date__range=[self.start_date.date(), self.end_date.date()], supplier_po__general_po_supplier__supplier__id=supplier)
            elif customer:
                supplier_pos = SupplierPO.objects.filter(advance_payment_due_date__range=[self.start_date.date(), self.end_date.date()], general_po_supplier__general_po__costing__order__customer_id=customer)
                grns = SupplierPOGRN.objects.filter(supplier_pack_list__supplier_po_delivery_note__supplier_po_delivery_invoice__payment_due_date__range=[self.start_date.date(), self.end_date.date()], supplier_po__general_po_supplier__general_po__costing__order__customer_id=customer)
            else:
                supplier_pos = SupplierPO.objects.filter(advance_payment_due_date__range=[self.start_date.date(), self.end_date.date()])
                grns = SupplierPOGRN.objects.filter(supplier_pack_list__supplier_po_delivery_note__supplier_po_delivery_invoice__payment_due_date__range=[self.start_date.date(), self.end_date.date()])
            invoice_ids = grns.filter().values_list('supplier_pack_list__supplier_po_delivery_note__supplier_po_delivery_invoice', flat=True)
            invoices = SupplierPODeliveryInvoice.objects.filter(id__in=invoice_ids)

            for po in supplier_pos:
                if po.advance_payment and po.advance_payment_currency:
                    outgoing_payment_data = []
                    amount_data = get_amount_dictionary(po.advance_payment)
                    outgoing_payments = po.get_outgoing_payments()
                    for outgoing_payment in outgoing_payments:
                        outgoing_payment_data.append({
                            'id': outgoing_payment.id,
                            'display_number': outgoing_payment.display_number
                        })
                    if po.get_balance_amount()['amount'] > 0:
                        results.append({
                            'id': po.id,
                            'supplier_name':  po.general_po_supplier.supplier.name,
                            'material_types': po.get_material_types(),
                            'costing_or_po_club': po.get_costing_or_po_club().display_number,
                            'customer_name': po.get_customer().name,
                            'display_number': f"{po.supplier_po_number} - {po.proforma_invoice_supplier_display_number}",
                            'file_path': po.proforma_invoice.get_object_data() if po.proforma_invoice else None,
                            'payment_term': po.get_payment_term(),
                            'type': 'advance',
                            'amount': amount_data,
                            'due_amount': po.get_due_amount(),
                            'balance_display': po.get_balance_amount(),
                            'balance': po.get_balance_amount(),
                            'paid_amount': po.get_paid_amount(),
                            'payment_due_date': po.advance_payment_due_date,
                            'index': index,
                            'outgoing_payment_data': outgoing_payment_data
                        })
                    index += 1
            for invoice in invoices:
                outgoing_payment_data = []
                amount_data = get_amount_dictionary(invoice.total_price)
                outgoing_payments = invoice.get_outgoing_payments()
                for outgoing_payment in outgoing_payments:
                    outgoing_payment_data.append({
                        'id': outgoing_payment.id,
                        'display_number': outgoing_payment.display_number
                    })
                if invoice.get_balance_amount()['amount'] > 0:
                    results.append({
                        'id': invoice.id,
                        'supplier_name':  invoice.get_invoice_supplier().name if invoice.get_invoice_supplier() else None,
                        'costing_or_po_club': invoice.get_costing_or_po_club().display_number if invoice.get_costing_or_po_club() else None,
                        'material_types': invoice.get_material_types(),
                        'customer_name': invoice.get_customer().name if invoice.get_customer() else None,
                        'display_number': invoice.display_number,
                        'file_path': invoice.invoice.get_object_data() if invoice.invoice else None,
                        'payment_term': invoice.get_payment_term(),
                        'type': 'outgoing',
                        'amount': amount_data,
                        'due_amount': invoice.get_due_amount(),
                        'balance_display': invoice.get_balance_amount(),
                        'balance': invoice.get_balance_amount(),
                        'paid_amount': invoice.get_paid_amount(),
                        'payment_due_date': invoice.payment_due_date,
                        'index': index,
                        'outgoing_payment_data': outgoing_payment_data
                    })
                index += 1
        else:
            return []
        return results
    

class DuePaymentAllListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]
    serializer_class = PCLMatchingOutgoingPaymentListViewSerializer
    pagination_class = GeneralLargeResultsSetPagination

    count = 0

    def get_queryset(self):
        return []

    def list(self, request, *args, **kwargs):
        data = self.get_outgoing_payments()
        paginator = self.pagination_class()
        paginated_data = paginator.paginate_queryset(data, request, view=self)
        serializer = self.get_serializer(paginated_data, many=True)
        meta_data = {
            'count': self.count
        }
        return paginator.get_paginated_response(serializer.data, meta_data)

    def get_outgoing_payments(self):
        from datetime import date
        today = date.today()
        index = 0

        results = []
        supplier_pos = SupplierPO.objects.filter(advance_payment_due_date__lte=today)
        grns = SupplierPOGRN.objects.filter(supplier_pack_list__supplier_po_delivery_note__supplier_po_delivery_invoice__payment_due_date__lte=today)
        invoice_ids = grns.filter().values_list('supplier_pack_list__supplier_po_delivery_note__supplier_po_delivery_invoice', flat=True)
        invoices = SupplierPODeliveryInvoice.objects.filter(id__in=invoice_ids)

        for po in supplier_pos:
            if po.advance_payment and po.advance_payment_currency:
                outgoing_payment_data = []
                amount_data = get_amount_dictionary(po.advance_payment)
                outgoing_payments = po.get_outgoing_payments()
                for outgoing_payment in outgoing_payments:
                    outgoing_payment_data.append({
                        'id': outgoing_payment.id,
                        'display_number': outgoing_payment.display_number
                    })
                if po.get_balance_amount()['amount'] > 0:
                    results.append({
                        'id': po.id,
                        'supplier_name':  po.general_po_supplier.supplier.name,
                        'material_types': po.get_material_types(),
                        'costing_or_po_club': po.get_costing_or_po_club().display_number,
                        'customer_name': po.get_customer().name,
                        'display_number': f"{po.supplier_po_number} - {po.proforma_invoice_supplier_display_number}",
                        'file_path': po.proforma_invoice.get_object_data() if po.proforma_invoice else None,
                        'payment_term': po.get_payment_term(),
                        'type': 'advance',
                        'amount': amount_data,
                        'due_amount': po.get_due_amount(),
                        'balance_display': po.get_balance_amount(),
                        'balance': po.get_balance_amount(),
                        'balance_display': po.get_balance_amount(),
                        'paid_amount': po.get_paid_amount(),
                        'payment_due_date': po.advance_payment_due_date,
                        'index': index,
                        'outgoing_payment_data': outgoing_payment_data
                    })
                    index += 1
        for invoice in invoices:
            outgoing_payment_data = []
            amount_data = get_amount_dictionary(invoice.total_price)
            outgoing_payments = invoice.get_outgoing_payments()
            for outgoing_payment in outgoing_payments:
                outgoing_payment_data.append({
                    'id': outgoing_payment.id,
                    'display_number': outgoing_payment.display_number
                })
            if invoice.get_balance_amount()['amount'] > 0:
                results.append({
                    'id': invoice.id,
                    'supplier_name':  invoice.get_invoice_supplier().name if invoice.get_invoice_supplier() else None,
                    'costing_or_po_club': invoice.get_costing_or_po_club().display_number if invoice.get_costing_or_po_club() else None,
                    'material_types': invoice.get_material_types(),
                    'customer_name': invoice.get_customer().name if invoice.get_customer() else None,
                    'display_number': invoice.display_number,
                    'file_path': invoice.invoice.get_object_data() if invoice.invoice else None,
                    'payment_term': invoice.get_payment_term(),
                    'type': 'outgoing',
                    'amount': amount_data,
                    'due_amount': invoice.get_due_amount(),
                    'balance_display': invoice.get_balance_amount(),
                    'balance': invoice.get_balance_amount(),
                    'paid_amount': invoice.get_paid_amount(),
                    'payment_due_date': invoice.payment_due_date,
                    'index': index,
                    'outgoing_payment_data': outgoing_payment_data
                })
                index += 1
        self.count = index
        return results
    

class DueCommercialInvoiceList(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]
    serializer_class = PCLMatchingOutgoingPaymentListViewSerializer
    pagination_class = GeneralLargeResultsSetPagination

    count = 0
    def get_queryset(self):
        return []

    def list(self, request, *args, **kwargs):
        search_text = request.query_params.get('search_text', None)
        data = self.get_outgoing_payments(search_text)
        paginator = self.pagination_class()
        paginated_data = paginator.paginate_queryset(data, request, view=self)
        serializer = self.get_serializer(paginated_data, many=True)
        meta_data = {
            'count': self.count
        }
        return paginator.get_paginated_response(serializer.data, meta_data)

    def get_outgoing_payments(self, search_text):
        from datetime import date
        today = date.today()
        index = 0
        results = []
        grns = SupplierPOGRN.objects.filter(supplier_pack_list__supplier_po_delivery_note__supplier_po_delivery_invoice__payment_due_date__lte=today)
        invoice_ids = grns.filter().values_list('supplier_pack_list__supplier_po_delivery_note__supplier_po_delivery_invoice', flat=True)
        invoices = SupplierPODeliveryInvoice.objects.filter(id__in=invoice_ids)
        if search_text and search_text != '':

            invoices = search_qs_from_id(invoices, search_text)
    
        for invoice in invoices:
            outgoing_payment_data = []
            amount_data = get_amount_dictionary(invoice.total_price)
            outgoing_payments = invoice.get_outgoing_payments()
            for outgoing_payment in outgoing_payments:
                outgoing_payment_data.append({
                    'id': outgoing_payment.id,
                    'display_number': outgoing_payment.display_number
                })
            if invoice.get_balance_amount()['amount'] > 0:
                results.append({
                    'id': invoice.id,
                    'supplier_name':  invoice.get_invoice_supplier().name if invoice.get_invoice_supplier() else None,
                    'costing_or_po_club': invoice.get_costing_or_po_club().display_number if invoice.get_costing_or_po_club() else None,
                    'material_types': invoice.get_material_types(),
                    'customer_name': invoice.get_customer().name if invoice.get_customer() else None,
                    'display_number': invoice.display_number,
                    'file_path': invoice.invoice.get_object_data() if invoice.invoice else None,
                    'payment_term': invoice.get_payment_term(),
                    'type': 'outgoing',
                    'amount': amount_data,
                    'due_amount': invoice.get_due_amount(),
                    'balance_display': invoice.get_balance_amount(),
                    'balance': invoice.get_balance_amount(),
                    'paid_amount': invoice.get_paid_amount(),
                    'payment_due_date': invoice.payment_due_date,
                    'index': index,
                    'outgoing_payment_data': outgoing_payment_data
                })
                index += 1
        self.count = index
        return results
    

class DueAdvancePaymentList(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]
    serializer_class = PCLMatchingOutgoingPaymentListViewSerializer
    pagination_class = GeneralLargeResultsSetPagination

    count = 0

    def get_queryset(self):
        return []

    def list(self, request, *args, **kwargs):
        data = self.get_outgoing_payments()
        paginator = self.pagination_class()
        paginated_data = paginator.paginate_queryset(data, request, view=self)
        serializer = self.get_serializer(paginated_data, many=True)
        meta_data = {
            'count': self.count
        }
        return paginator.get_paginated_response(serializer.data, meta_data)

    def get_outgoing_payments(self):
        from datetime import date
        today = date.today()
        index = 0

        results = []
        supplier_pos = SupplierPO.objects.filter(advance_payment_due_date__lte=today)
        
        for po in supplier_pos:
            if po.advance_payment and po.advance_payment_currency:
                outgoing_payment_data = []
                amount_data = get_amount_dictionary(po.advance_payment)
                outgoing_payments = po.get_outgoing_payments()
                for outgoing_payment in outgoing_payments:
                    outgoing_payment_data.append({
                        'id': outgoing_payment.id,
                        'display_number': outgoing_payment.display_number
                    })
                if po.get_balance_amount()['amount'] > 0:
                    results.append({
                        'id': po.id,
                        'supplier_name':  po.general_po_supplier.supplier.name,
                        'material_types': po.get_material_types(),
                        'costing_or_po_club': po.get_costing_or_po_club().display_number,
                        'customer_name': po.get_customer().name if po.get_customer() else None,
                        'display_number': f"{po.supplier_po_number} - {po.proforma_invoice_supplier_display_number}",
                        'file_path': po.proforma_invoice.get_object_data() if po.proforma_invoice else None,
                        'payment_term': po.get_payment_term(),
                        'type': 'advance',
                        'amount': amount_data,
                        'due_amount': po.get_due_amount(),
                        'balance_display': po.get_balance_amount(),
                        'balance': po.get_balance_amount(),
                        'paid_amount': po.get_paid_amount(),
                        'payment_due_date': po.advance_payment_due_date,
                        'index': index,
                        'outgoing_payment_data': outgoing_payment_data
                    })
                    index += 1
        self.count = index
        return results
    

class PCLBankInformationListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    queryset = PCLBankInformation.objects.all().order_by('-id')
    serializer_class = PCLBankInformationSerializer
    pagination_class = GeneralLargeResultsSetPagination

    def get_queryset(self):
        qs = super().get_queryset() 
        search_text = self.request.GET.get('search_text', None)
        if search_text and search_text != '':
            qs = search_qs_from_id(qs, search_text)
        return qs
    

class PendingPCLBankInformationListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    queryset = PCLBankInformation.objects.all().order_by('-id')
    serializer_class = PCLBankInformationSerializer
    pagination_class = GeneralLargeResultsSetPagination

    def get_queryset(self):
        qs = super().get_queryset() 
        search_text = self.request.GET.get('search_text', None)
        if search_text and search_text != '':
            qs = search_qs_from_id(qs, search_text)
        return qs
    

class PCLBankInformationBasicDetailView(generics.RetrieveAPIView):
    permission_classes = (HasPermission,)
    queryset = PCLBankInformation.objects.all().order_by('-id')
    serializer_class = PCLBankInformationSerializer


class SupplierPODeliveryInvoicePCLDeleteView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]
    
    def delete(self, request, pk):
        supplier_po_delivery_invoice_pcl = get_object_or_404(SupplierPODeliveryInvoicePCL, pk=pk)
        outgoing_payment = supplier_po_delivery_invoice_pcl.outgoing_payment
        supplier_po_delivery_invoice_pcl.delete()
        outgoing_payment.recalculate_amount()
        return Response({'sucess': True}, status=status.HTTP_200_OK)


class OutgoingPaymentInterestRecalculateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE ]

    def post(self, request, outgoing_payment_id):
        outgoing_payment = get_object_or_404(OutgoingPayment, pk=outgoing_payment_id)
        outgoing_payment.calculate_interest_charge()
        return Response({'sucess': True}, status=status.HTTP_200_OK)
    

class PCLDashBoardListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE ]
    serializer_class = PCLBankInformationDashBoardSerializer
    pagination_class = GeneralLargeResultsSetPagination

    def get_queryset(self):
        search_data = self.request.GET.dict()
        search_dictionary = self.clean_dictionary(search_data)
        global_filter = self.request.query_params.get('global_filter', None)
        sort_col = self.request.query_params.get('sort_col', None)
        sort_dir = self.request.query_params.get('sort_dir', None)
        search_fields = ['id']

        if self.kwargs['customer_id'] == 0:
            qs = PCLBankInformation.objects.all()
        else:
            customer = get_object_or_404(Customer, pk=self.kwargs['customer_id'])
            pcl_bank_information_linked_po_clubs = PCLBankInformationLinkedPOClub.objects.filter(po_club__pre_costing__order__customer=customer)
            qs = PCLBankInformation.objects.filter(id__in=pcl_bank_information_linked_po_clubs.values_list('pcl_bank_information', flat=True))
        qs = search_qs_from_global_filter(qs, global_filter, search_dictionary, search_fields, sort_col, sort_dir, PCLBankInformation)
        return qs
    
    def clean_dictionary(self, dic):
        replace_keys = {
        }
        dictionary = clean_search_dictionary(dic, replace_keys)
        return dictionary

    # def get_foreign_pcl_used_amount(self, po_club, pcl_bank_information):
    #     outgoing_payments = po_club.get_outgoing_payments().filter(pcl_bank_information=pcl_bank_information)
    #     pcls = SupplierPODeliveryInvoicePCL.objects.filter(outgoing_payment__in=outgoing_payments)
    #     used_value = calculate_queryset_total_amount_normalized_amount(pcls, 'amount', 'amount_currency')
    #     return used_value

    # def get(self, request, customer_id):
    #     data = {
    #         'results': []
    #     }
    #     customer = get_object_or_404(Customer, pk=customer_id)
    #     
    #     
    #     for pcl_bank_information in pcl_bank_informations:
    #         pcl_bank_information_data = {
    #             'id': pcl_bank_information.id,
    #             'display_name': pcl_bank_information.display_number,
    #             'total_amount': get_amount_dictionary(pcl_bank_information.total_amount),
    #             'pcl_threshold_amount': get_amount_dictionary(pcl_bank_information.pcl_threshold_amount),
    #             'used_amount': get_amount_dictionary(pcl_bank_information.get_used_amount()),
    #             'balance_amount': get_amount_dictionary(pcl_bank_information.get_balance_amount()),
    #             'po_club_data': [],
    #             'foreign_pcl_po_clubs':[]
    #         }
    #         po_clubs = ActualPOClub.objects.filter(id__in=pcl_bank_information.pclbankinformationlinkedpoclub_set.all().values_list('po_club', flat=True))
    #         for po_club in po_clubs:
    #             po_club_data = {
    #                 'id': po_club.id,
    #                 'material_fob_presentage': po_club.material_fob_presentage,
    #                 'display_name': po_club.display_number,
    #                 'short_code': po_club.short_code,
    #                 'long_code': po_club.long_code,
    #                 'total_fob_value': po_club.total_fob_value,
    #                 'max_pcl_value': get_amount_dictionary(po_club.max_pcl_value),
    #                 'customer_name': po_club.customer_name,
    #                 'used_amount': get_amount_dictionary(po_club.get_pcl_used_value()),
    #             }
    #             pcl_bank_information_data['po_club_data'].append(po_club_data)

    #         foreign_pcl_po_clubs = pcl_bank_information.get_foreign_pcl_po_clubs()
    #         for foreign_pcl_po_club in foreign_pcl_po_clubs:
    #             foreign_pcl_used_amount = self.get_foreign_pcl_used_amount(foreign_pcl_po_club, pcl_bank_information)
    #             foreign_pcl_po_club_data = {
    #                 'id': foreign_pcl_po_club.id,
    #                 'material_fob_presentage': foreign_pcl_po_club.material_fob_presentage,
    #                 'display_name': foreign_pcl_po_club.display_number,
    #                 'short_code': foreign_pcl_po_club.short_code,
    #                 'long_code': foreign_pcl_po_club.long_code,
    #                 'total_fob_value': foreign_pcl_po_club.total_fob_value,
    #                 'max_pcl_value': get_amount_dictionary(foreign_pcl_po_club.max_pcl_value),
    #                 'customer_name': foreign_pcl_po_club.customer_name,
    #                 'used_amount': get_amount_dictionary(foreign_pcl_used_amount),
    #             }
    #             pcl_bank_information_data['foreign_pcl_po_clubs'].append(foreign_pcl_po_club_data)
                
    #         data['results'].append(pcl_bank_information_data)
            
    #     return Response(data)



class PCLBankInformationDetailView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        pcl_bank_information_id = kwargs.get('pk', None)
        pcl_bank_information = get_object_or_404(PCLBankInformation, pk=pcl_bank_information_id)
        data = pcl_bank_information.calculate_merged_po_club_pcl_data()
        return Response(data)


class PCLBankInformationMergedPOClubListView(APIView):
    permission_classes = (HasPermission,)

    def get(self, request, *args, **kwargs):
        pcl_bank_information_id = kwargs.get('pk', None)
        pcl_bank_information = get_object_or_404(PCLBankInformation, pk=pcl_bank_information_id)
        saved_po_club_ids = PCLBankInformationLinkedPOClub.objects.filter(pcl_bank_information=pcl_bank_information).values_list('po_club', flat=True)
        saved_po_clubs = ActualPOClub.objects.filter(id__in=saved_po_club_ids)
        data = POClubPCLBankInformationSerilaizer(saved_po_clubs, many=True).data
        return Response(data)


class PCLBankInformationMergedPOClubEditView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def set_state(self, pcl_bank_information, next_state, user):
        if user and user.has_role(ADMIN_ROLE):
            pcl_bank_information.state = next_state
            pcl_bank_information.save()
        else:
            raise Response({'status': False}, status=status.HTTP_403_FORBIDDEN)
    
    def post(self, request, pk):
        state = request.data.get('state', None)
        po_club_ids = request.data.get('po_club_ids', [])
        deleted_po_club_ids = request.data.get('deleted_po_club_ids', [])
        pcl_facility_start_date = request.data.get('pcl_facility_start_date', None)
        pcl_facility_end_date = request.data.get('pcl_facility_end_date', None)
        pcl_bank_information = get_object_or_404(PCLBankInformation, pk=pk)
        self.set_state(pcl_bank_information, state, request.user)

        pcl_bank_information.pcl_facility_start_date = pcl_facility_start_date
        pcl_bank_information.pcl_facility_end_date = pcl_facility_end_date
        pcl_bank_information.save()

        for po_club_id in po_club_ids:
            po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
            pcl_bank_information_linked_po_club, created = PCLBankInformationLinkedPOClub.objects.get_or_create(
                po_club=po_club,
                pcl_bank_information=pcl_bank_information
            )
        for deleted_po_club_id in deleted_po_club_ids:
            pcl_bank_information_linked_po_club = get_object_or_none(PCLBankInformationLinkedPOClub,
                {'pcl_bank_information': pcl_bank_information, 'po_club_id': deleted_po_club_id}
            )
            if pcl_bank_information_linked_po_club:
                pcl_bank_information_linked_po_club.delete()
        http_response =  Response({'status': True, 'pcl_bank_information_id': pcl_bank_information.id})

        return http_response


class PCLBankInformationStateChangeView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE]

    def post(self, request, *args, **kwargs):
        pcl_bank_information_id = kwargs.get('pk', None)
        state = request.data.get('new_state', None)
        pcl_bank_information = get_object_or_404(PCLBankInformation, pk=pcl_bank_information_id)
        response = pcl_bank_information.move_to_next_state(state)
        http_response = Response(response)
        return http_response

    # def get_queryset(self):
    #     qs = super().get_queryset()
    #     pcl_bank_information_id = self.kwargs.get('pk', None)
    #     pcl_bank_information = get_object_or_404(PCLBankInformation, pk=pcl_bank_information_id)
    #     saved_po_club_ids = PCLBankInformationLinkedPOClub.objects.filter(pcl_bank_information=pcl_bank_information).values_list('po_club', flat=True)
    #     saved_po_club_qs = list(ActualPOClub.objects.filter(id__in=saved_po_club_ids).order_by('id'))
    #     not_pending_po_club_ids = PCLBankInformationLinkedPOClub.objects.filter().values_list('po_club', flat=True)
    #     qs = qs.filter().exclude(id__in=not_pending_po_club_ids).order_by('id')
    #     qs = saved_po_club_qs + list(qs)
    #     search_text = self.request.GET.get('search_text', None)
    #     if search_text and search_text != '':
    #         qs = search_qs_from_id(qs, search_text)
    #     return qs


class PCLBankInformationOrderProfitabilityDetailView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def calculate_order_profitability_data(self, pcl_bank_information, merged_po_clubs):
        from finance.helpers.pcl_bank_information_helper import PCLBankInformationHelper
        pcl_data = PCLBankInformationHelper().get_order_profitability_data(merged_po_clubs)
        return pcl_data

    def get(self, request, *args, **kwargs):
        pcl_bank_information_id = kwargs.get('pk', None)
        pcl_bank_information = get_object_or_404(PCLBankInformation, pk=pcl_bank_information_id)
        merged_po_club_ids = pcl_bank_information.pclbankinformationlinkedpoclub_set.filter().values_list('po_club', flat=True)
        merged_po_clubs = ActualPOClub.objects.filter(id__in=merged_po_club_ids)
        data = self.calculate_order_profitability_data(pcl_bank_information, merged_po_clubs)
        return Response(data)
    

class POClubOrderProfitabilityDetailView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def calculate_order_profitability_data(self, po_club):
        from marketing.helpers.order_profitability_helper import ActualPOClubOrderProfitabilityHelper
        calculated_data = ActualPOClubOrderProfitabilityHelper().calculate_order_profitability_data(po_club)
        return calculated_data

    def get(self, request, *args, **kwargs):
        po_club_id = kwargs.get('pk', None)
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        data = self.calculate_order_profitability_data(po_club)
        return Response(data)
    
    
class PurchaseOrderOrderProfitabilityDetailView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def calculate_order_profitability_data(self, purchase_order):
        from marketing.helpers.order_profitability_helper import PurchaseOrderOrderProfitabilityHelper
        pcl_data = PurchaseOrderOrderProfitabilityHelper().calculate_order_profitability_data(purchase_order)
        return pcl_data

    def get(self, request, *args, **kwargs):
        purchase_order_id = kwargs.get('pk', None)
        purchase_order = get_object_or_404(PurchaseOrder, pk=purchase_order_id)
        data = self.calculate_order_profitability_data(purchase_order)
        return Response(data)
    

class CommercialInvoiceMoveToNextStateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, pk):
        new_state = request.data.get('new_state', None)
        invoice = get_object_or_404(SupplierPODeliveryInvoice, pk=pk)
        data = invoice.move_to_next_state(new_state)
        return Response(data)
    

class PCLSettleView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, FINANCE_USER_ROLE, ]

    ADVANCE_TYPE = 'advance'
    OUTGOING_TYPE = 'outgoing'

    def create_supplier_po_delivery_invoice_pcl(self, type, amount, outgoing_payment, supplier_po, invoice, pcl_bank_information=None):
        if type == self.ADVANCE_TYPE:
            content_type = ContentType.objects.get_for_model(SupplierPO)
            supplier_po_delivery_invoice_pcl = SupplierPODeliveryInvoicePCL.objects.create(
                entity_type=content_type,
                entity_id=supplier_po.id,
                outgoing_payment=outgoing_payment
            )
        else:
            content_type = ContentType.objects.get_for_model(SupplierPODeliveryInvoice)
            supplier_po_delivery_invoice_pcl = SupplierPODeliveryInvoicePCL.objects.create(
                entity_type=content_type,
                entity_id=invoice.id,
                outgoing_payment=outgoing_payment
            )
        supplier_po_delivery_invoice_pcl.amount = amount
        supplier_po_delivery_invoice_pcl.currency = CurrencyHelper.USD_CURRENCY
        supplier_po_delivery_invoice_pcl.save()
        return supplier_po_delivery_invoice_pcl
    
    def validate_data(self, pcl_bank_information_id, payment_method, pcl_start_date, pcl_end_date, payments):
        errors = {
            'payment_type': None,
            'pcl_bank_information': None,
            'exceed_pcl_value': None,
            'pcl_start_date': None,
            'pcl_end_date': None,
            'payments': {}
        }

        has_error = False
        total_settlement_value = 0
        if not payment_method:
            errors['payment_type'] = "Select payment type"
            has_error = True

        if payment_method == OutgoingPayment.PCL_PAYMENT_METHOD:
            if not pcl_start_date:
                errors['pcl_start_date'] = "Select pcl start date"
                has_error = True

            if not pcl_end_date:
                errors['pcl_end_date'] = "Select pcl end date"
                has_error = True

            if pcl_start_date and pcl_end_date:
                if pcl_end_date < pcl_start_date:
                    errors['pcl_end_date'] = "End date cannot be earlier than start date"
                    has_error = True
            
            if not pcl_bank_information_id:
                errors['pcl_bank_information'] = "Select pcl facility."
                has_error = True

        for payment in payments:
            index = payment.get('index')
            if index is None:
                continue
            
            if index not in errors['payments']:
                errors['payments'][index] = {}

            amount = payment.get('balance', {}).get('amount')
            if not amount:
                errors['payments'][index]['balance'] = "Enter amount"
                has_error = True

            if payment['type'] == 'advance':
                spo = get_object_or_404(SupplierPO, pk=payment['id'])
                total_payment = spo.get_balance_amount()
                balance = payment['balance']
                if balance['amount']:
                    total_settlement_value += balance['amount']
                    if total_payment['amount'] < balance['amount']:
                        errors['payments'][index]['balance'] = "Amount cannot be exceed"
                        has_error = True

            if payment['type'] == 'outgoing':
                invoice = get_object_or_404(SupplierPODeliveryInvoice, pk=payment['id'])
                total_payment = invoice.get_balance_amount()
                balance = payment['balance']
                if balance['amount']:
                    total_settlement_value += balance['amount']
                    if total_payment['amount'] < balance['amount']:
                        errors['payments'][index]['balance'] = "Amount cannot be exceed"
                        has_error = True

        if pcl_bank_information_id and payment_method == OutgoingPayment.PCL_PAYMENT_METHOD:
            pcl_bank_information = get_object_or_404(PCLBankInformation, pk=pcl_bank_information_id)
            if not pcl_bank_information.get_pcl_balance_amount() >= total_settlement_value:
                errors['exceed_pcl_value'] = "Settlement amount exceed pcl thershold amount"
                has_error = True

        if not any(errors['payments'].values()):
            errors.pop('payments')

        return has_error, errors
    
    def create_outgoing_payment(self, pcl_bank_information, payment_method, pcl_start_date, pcl_end_date, today, payments):
        total_amount = 0
        for payment in payments:
            amount = payment['balance']['amount']
            total_amount += amount
        outgoing_payment = OutgoingPayment.objects.create(
                    amount=total_amount,
                    payment_date=today,
                    currency=CurrencyHelper.USD_CURRENCY,
                    payment_method=payment_method,
                    pcl_create_date=pcl_start_date,
                    pcl_end_date=pcl_end_date
                )
        if payment_method == OutgoingPayment.PCL_PAYMENT_METHOD:
            outgoing_payment.pcl_bank_information = pcl_bank_information
            outgoing_payment.save()
        return outgoing_payment
    
    def post(self, request):
        from datetime import datetime
        payment_method = request.data.get('type', None)
        pcl_bank_information = None
        pcl_bank_information_id = request.data.get('pcl_bank_information_id', None)
        pcl_start_date = request.data.get('pcl_start_date', None)
        pcl_end_date = request.data.get('pcl_end_date', None)
        payments = request.data.get('payments', None)
        invoice = None
        supplier_po = None
        
        has_error, errors = self.validate_data(pcl_bank_information_id, payment_method, pcl_start_date, pcl_end_date, payments)

        if not has_error:
            if payment_method == OutgoingPayment.PCL_PAYMENT_METHOD:
                pcl_bank_information = get_object_or_404(PCLBankInformation, pk=pcl_bank_information_id)
            today = datetime.now()
            outgoing_payment = self.create_outgoing_payment(pcl_bank_information, payment_method, pcl_start_date, pcl_end_date, today, payments)
            for payment in payments:
                type = payment['type']
                id = payment['id']
                if type == self.ADVANCE_TYPE:
                    supplier_po = get_object_or_404(SupplierPO, pk=id)
                elif type == self.OUTGOING_TYPE:
                    invoice = get_object_or_404(SupplierPODeliveryInvoice, pk=id)
                amount = payment['balance']['amount']
                self.create_supplier_po_delivery_invoice_pcl(type, amount, outgoing_payment, supplier_po, invoice, pcl_bank_information)
            http_response = Response({'status': True})
        else:
            http_response = Response(errors, status=status.HTTP_400_BAD_REQUEST)
        return http_response


class PCLClubbingCreateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    MANUAL_MAPPING_TYPE = 'manual'
    AUTOMAP_MAPPING_TYPE = 'automap'

    def post(self, request):
        mapping_type = request.data.get('type', None)
        if mapping_type == self.MANUAL_MAPPING_TYPE:
            data = request.data.get('data', None)
            pcl_bank_information = PCLBankInformation.objects.create(
	                state=PCLBankInformation.DRAFT_STATE
                )
            for po_club_id in data:
                po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
                pcl_bank_information_linked_po_club, created = PCLBankInformationLinkedPOClub.objects.get_or_create(
                    po_club=po_club,
                    pcl_bank_information=pcl_bank_information
                )
            pcl_bank_information.set_amount_values()
            http_response =  Response({'status': True})
        elif mapping_type == self.AUTOMAP_MAPPING_TYPE:
            data = request.data.get('automap_data', None)
            for row in data:
                pcl_bank_information = PCLBankInformation.objects.create(
	                state=PCLBankInformation.DRAFT_STATE
                )
                for po_club_id in row['automap_clubs']:
                    po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
                    pcl_bank_information_linked_po_club, created = PCLBankInformationLinkedPOClub.objects.get_or_create(
                        po_club=po_club,
                        pcl_bank_information=pcl_bank_information
                    )
            pcl_bank_information.set_amount_values()
            http_response =  Response({'status': True})
        else:
            return Response({'error': 'Invalid mapping type'}, status=status.HTTP_400_BAD_REQUEST)

        return http_response


class PCLClubbingAutomapView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def process_data(self, po_club_ids):
        from django.db.models import Count, Max
        not_pending_po_club_ids = PCLBankInformationLinkedPOClub.objects.all().values_list('po_club', flat=True)
        po_club_grouped_values = ActualPOClub.objects.filter(id__in=po_club_ids).exclude(id__in=not_pending_po_club_ids).values(
            'pre_costing__order__customer', 'pre_costing__order__style_number'
        ).annotate(po_club_count=Count('id')).filter().exclude()
        data = {}
        for po_club_grouped_value in po_club_grouped_values:
            customer = po_club_grouped_value['pre_costing__order__customer']
            style_number = po_club_grouped_value['pre_costing__order__style_number']

            if customer and style_number:
                po_clubs = ActualPOClub.objects.filter(
                    pre_costing__order__customer=customer,
                    pre_costing__order__style_number=style_number,
                    id__in=po_club_ids
                ).exclude(id__in=not_pending_po_club_ids).annotate(
                    last_delivery_date=Max('purchaseorder__purchaseorderdelivery__delivery_date'),
                )
                for po_club in po_clubs:
                    po_ids = po_club.get_purchase_orders().values_list('id', flat=True)
                    supplier_ids = PurchaseOrderBom.objects.filter(
                        purchase_order__actual_po_club=po_club,
                        material__material_detail__generic_material__user_material__category=FABRIC_TRIM_TYPES
                    ).distinct('supplier_inquiry_detail__supplier_inquiry__supplier').values_list(
                            'supplier_inquiry_detail__supplier_inquiry__supplier', flat=True
                        ).order_by('supplier_inquiry_detail__supplier_inquiry__supplier')
                    po_club_data = {
                        'id': po_club.id,
                        'display_number': po_club.short_code,
                        'customer': po_club.pre_costing.order.customer.id,
                        'style_number': po_club.pre_costing.order.style_number,
                        'last_delivery_date': po_club.last_delivery_date,
                        'supplier_ids': supplier_ids,
                        'purchase_order_ids': po_ids
                    }
                    if customer not in data:
                        data[customer] = {}
                    if style_number not in data[customer]:
                        data[customer][style_number] = []
                    data[customer][style_number].append(po_club_data)
        results = self.group_po_clubs(data)
        return results

    def parse_date(self, date_str):
        from datetime import datetime
        if isinstance(date_str, str):
            return datetime.strptime(date_str, "%Y-%m-%d").date()
        return date_str

    def group_po_clubs(self, payload):
        grouped_result = []
        index = 1

        for customer_data in payload.values():
            for style_number, po_clubs in customer_data.items():
                po_clubs.sort(key=lambda x: self.parse_date(x["last_delivery_date"]))
                while po_clubs:
                    base = po_clubs.pop(0)
                    group = [base]
                    base_date = self.parse_date(base["last_delivery_date"])
                    base_suppliers = set(base["supplier_ids"])
                    remaining_clubs = []

                    for club in po_clubs:
                        club_date = self.parse_date(club["last_delivery_date"])
                        club_suppliers = set(club["supplier_ids"])

                        if (club_date - base_date).days <= 14 and base_suppliers & club_suppliers:
                            group.append(club)
                            base_suppliers |= club_suppliers
                        else:
                            remaining_clubs.append(club)

                    po_clubs = remaining_clubs
                    grouped_result.append({
                        "display_order": f"PCL Group - {index}",
                        "automap_clubs": [{"id": club["id"], "style_number": club["style_number"],"display_number": club["display_number"]} for club in group]
                    })
                    index += 1
        return grouped_result

    def post(self, request):
        po_club_ids = request.data.get('po_club_ids', None)
        data = self.process_data(po_club_ids)
        return Response(data)


class PCLClubbingAutomapByClubView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def process_data(self, po_club_ids, base_po_club_id):
        from django.db.models import Count, Max
        not_pending_po_club_ids = PCLBankInformationLinkedPOClub.objects.filter(id__in=po_club_ids).values_list('po_club', flat=True)
        po_club_grouped_values = ActualPOClub.objects.filter(id__in=po_club_ids).exclude(id__in=not_pending_po_club_ids).values(
            'pre_costing__order__customer', 'pre_costing__order__style_number'
        ).annotate(po_club_count=Count('id')).filter().exclude()
        data = {}
        for po_club_grouped_value in po_club_grouped_values:
            customer = po_club_grouped_value['pre_costing__order__customer']
            style_number = po_club_grouped_value['pre_costing__order__style_number']

            if customer and style_number:
                po_clubs = ActualPOClub.objects.filter(
                    pre_costing__order__customer=customer,
                    pre_costing__order__style_number=style_number,
                    id__in=po_club_ids
                ).exclude(id__in=not_pending_po_club_ids).annotate(
                    last_delivery_date=Max('purchaseorder__purchaseorderdelivery__delivery_date'),
                )
                for po_club in po_clubs:
                    po_ids = po_club.get_purchase_orders().values_list('id', flat=True)
                    supplier_ids = PurchaseOrderBom.objects.filter(
                        purchase_order__actual_po_club=po_club,
                        material__material_detail__generic_material__user_material__category=FABRIC_TRIM_TYPES
                    ).distinct('supplier_inquiry_detail__supplier_inquiry__supplier').values_list(
                            'supplier_inquiry_detail__supplier_inquiry__supplier', flat=True
                        ).order_by('supplier_inquiry_detail__supplier_inquiry__supplier')
                    po_club_data = {
                        'id': po_club.id,
                        'display_number': po_club.display_number,
                        'long_code': po_club.long_code,
                        'short_code': po_club.short_code,
                        'customer': po_club.pre_costing.order.customer.id,
                        'style_number': po_club.pre_costing.order.style_number,
                        'last_delivery_date': po_club.last_delivery_date,
                        'supplier_ids': supplier_ids,
                        'purchase_order_ids': po_ids
                    }
                    if customer not in data:
                        data[customer] = {}
                    if style_number not in data[customer]:
                        data[customer][style_number] = []
                    data[customer][style_number].append(po_club_data)
        results = self.group_po_clubs(data, base_po_club_id)
        return results

    def parse_date(self, date_str):
        from datetime import datetime
        if isinstance(date_str, str):
            return datetime.strptime(date_str, "%Y-%m-%d").date()
        return date_str

    def group_po_clubs(self, payload, base_po_club_id):
        grouped_result = []

        for customer_data in payload.values():
            for style_number, po_clubs in customer_data.items():
                po_clubs.sort(key=lambda x: self.parse_date(x["last_delivery_date"]))

                base = None
                if base_po_club_id:
                    for club in po_clubs:
                        if club["id"] == base_po_club_id:
                            base = club
                            break

                if not base:
                    base = po_clubs.pop(0) if po_clubs else None

                if base:
                    group = []
                    base_date = self.parse_date(base["last_delivery_date"])
                    base_suppliers = set(base["supplier_ids"])
                    remaining_clubs = []

                    for club in po_clubs:
                        club_date = self.parse_date(club["last_delivery_date"])
                        club_suppliers = set(club["supplier_ids"])

                        if (club_date - base_date).days <= 14 and base_suppliers & club_suppliers:
                            group.append(club)
                            base_suppliers |= club_suppliers
                        else:
                            remaining_clubs.append(club)

                    grouped_data = []
                    for row in group:
                        if row["id"] == base["id"]:
                            continue

                        po_club = get_object_or_404(ActualPOClub, pk=row["id"])
                        grouped_data.append(POClubPCLBankInformationSerilaizer(po_club, many=False).data)

                    if grouped_data:
                        grouped_result.append({
                            "display_order": "PCL Group - 1",
                            "automap_clubs": grouped_data
                        })

        return grouped_result

    def extract_automap_club_data(self, grouped_data):
        if not grouped_data:
            return []

        return grouped_data[0]["automap_clubs"] if "automap_clubs" in grouped_data[0] else []

    def get_shipment_dates(self, po_club):
        data = []
        pos = po_club.get_purchase_orders()
        shipments = PurchaseOrderDelivery.objects.filter(purchase_order__in=pos)
        for shipment in shipments:
            data.append(shipment.delivery_date)
        return data

    def post(self, request, po_club_id):
        data = {}
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        if not po_club.pre_costing:
            http_response = Response({'msg': 'No pre costing created for this club.'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            po_club_ids = ActualPOClub.objects.filter(
                pre_costing__order__customer=po_club.pre_costing.order.customer,
                pre_costing__order__style_number=po_club.pre_costing.order.style_number
            )
            automap_data = self.process_data(po_club_ids, po_club.id)
            data['base_po_club_data'] = POClubPCLBankInformationSerilaizer(po_club, many=False).data
            automap_data = self.extract_automap_club_data(automap_data)
            data['automap_po_club_data'] = automap_data
            http_response =  Response(data)
        return http_response


class PCLClubbingAutomapByClubCreateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]


    def post(self, request, po_club_id):
        po_club_ids = request.data.get('po_club_ids', [])
        pcl_facility_start_date	= request.data.get('pcl_facility_start_date', None)
        pcl_facility_end_date = request.data.get('pcl_facility_end_date', None)
        pcl_bank_information = PCLBankInformation.objects.create(
                pcl_facility_start_date=pcl_facility_start_date,
                pcl_facility_end_date=pcl_facility_end_date,
                state=PCLBankInformation.DRAFT_STATE
            )
        po_club_ids.append(po_club_id)
        for po_club_id in po_club_ids:
            po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
            pcl_bank_information_linked_po_club, created = PCLBankInformationLinkedPOClub.objects.get_or_create(
                po_club=po_club,
                pcl_bank_information=pcl_bank_information
            )
        pcl_bank_information.set_amount_values()
        http_response =  Response({'status': True, 'pcl_bank_information_id': pcl_bank_information.id})
        return http_response


class PendingPCLPOClubListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    queryset = ActualPOClub.objects.all().order_by('-id')
    serializer_class = POClubPCLBankInformationSerilaizer
    pagination_class = GeneralLargeResultsSetPagination

    def get_queryset(self):
        qs = super().get_queryset()
        not_pending_po_club_ids = PCLBankInformationLinkedPOClub.objects.all().values_list('po_club', flat=True)
        #qs = qs.filter(state=ActualPOClub.COMPLETE_STATE).exclude(id__in=not_pending_po_club_ids)
        qs = qs.filter().exclude(id__in=not_pending_po_club_ids)
        if self.request.query_params.get('base_po_club_id'):
            qs = qs.filter().exclude(id=self.request.query_params.get('base_po_club_id'))
        search_text = self.request.GET.get('search_text', None)
        if search_text and search_text != '':
            qs = search_qs_from_id(qs, search_text)
        return qs