from django.urls import path, include
from django.views.generic.base import TemplateView
from shared.views import *
from materials.views import meta_views, supplier_inquiry_views, material_views
from marketing.serializers import ActualPOClubSerializer

app_name = 'materials'

urlpatterns = [
    path("fabric_metadata/", meta_views.CompositionTypeMetaView.as_view(), name="material-meta-data"),
    path("metadata/dropdown_options/<attribute_id>/", meta_views.UserDefinedDropDownFieldOptions.as_view(), name="material-attribute-dropdown-options"),

    path('supplierinquiry/create/<int:version_id>', supplier_inquiry_views.SupplierInquiryCreateView.as_view(), name = 'supplierinquiry-create'),
    path('supplierinquiry_detail/delete/<int:pk>', supplier_inquiry_views.SupplierInquiryDeleteView.as_view(), name = 'supplierinquiry-delete'),
    path('supplierinquiry/list/<int:version_id>', supplier_inquiry_views.SupplierInquiryListView.as_view(), name = 'supplierinquiry-list'),
    path('supplierinquiry/list/<int:version_id>/<int:supplier_id>', supplier_inquiry_views.SupplierInquiryListView.as_view(), name = 'supplierinquiry-list2'),
    path('supplierinquiry/detail/<int:pk>', supplier_inquiry_views.SupplierInquiryDetailView.as_view(), name = 'supplierinquiry-detail'),
    path('supplierinquiry/update/<int:version_id>', supplier_inquiry_views.SupplierInquiryUpdateView.as_view(), name = 'supplierinquiry-update'),

    path('manual_supplier_inquiry/update/<int:version_id>', supplier_inquiry_views.SupplierInquiryManualUpdateView.as_view(), name = 'manual-supplierinquiry-update'),

    path('supplierinquiry/delete/<int:version_id>/<int:pk>',
         supplier_inquiry_views.SupplierInquiryDetailDeleteView.as_view(),
         name = 'supplierinquiry-delete-view'),
    path('supplierinquiry/graph/<int:order_id>', supplier_inquiry_views.SupplierInquiryGraphView.as_view(), name='supplierinquiry-graph'),

    path('userdefinematerial/list/', meta_views.UserDefinedMaterialListView.as_view(), name = 'user-define-material-list'),
    path('userdefinematerial/<int:pk>/', meta_views.UserDefinedMaterialDetailDetailView.as_view(), name = 'user-define-materialt-detail'),
    path('userdefinematerial/', meta_views.UserDefinedMaterialDetailCreateView.as_view(), name = 'user-define-material-detail-create'),
    path('userdefinematerial/update/<int:pk>/', meta_views.UserDefinedMaterialDetailUpdateView.as_view(), name = 'user-define-material-detail-update'),
    path('userdefinematerial/measurement_unit/list/', meta_views.UserDefinedMaterialMeasurementListView.as_view(), name = 'user-define-material-measurement-unit-list'),
    path('userdefinematerial/attribute/<int:pk>/', meta_views.UserDefinedMaterialAttributeDetailView.as_view(), name = 'user-define-material-attribute-detail'),
    path('userdefinematerial/attribute/', meta_views.UserDefinedMaterialAttributeCreateView.as_view(), name = 'user-define-material-attribute-create'),
    path('userdefinematerial/attribute/update/<int:pk>/', meta_views.UserDefinedMaterialAttributeUpdateView.as_view(), name = 'user-define-material-attribute-update'),
    path('userdefinematerial/attribute/delete/<int:pk>/', meta_views.UserDefinedMaterialAttributeDeleteView.as_view(), name = 'user-define-material-attribute-delete'),
    path('userdefinematerial/attribute/dropdown/list/', meta_views.UserDefinedDropdownOptionListView.as_view(), name = 'user-define-material-attribute-delete'),
    path('userdefinematerial/dropdown/delete/<int:pk>/', meta_views.UserDefinedDropdownOptionDeleteView.as_view(), name = 'user-define-material-attribute-delete'),

    path('consumption_units/', meta_views.ConsumptionMeasuringUnits.as_view(), name='cad-measuring-units'),
    path('material_consumption_units/', meta_views.MeasureMentOptions.as_view(), name='material-consumption-units'),

    # Send Supplier Inquiry Emails

    path('pending_emails/list/<int:version_id>', supplier_inquiry_views.PendingSupplierInquiryEmailsView.as_view(), name='pending_emails-list'),
    
    path('supplier_inquiry/set_state_queued/<int:version_id>', supplier_inquiry_views.SupplierInquiryStateChangePendingEmailToQueuedEmailView.as_view(), name='supplier_inquiry_state_change_to_queued_email'),


    # Material views
    path('customer_brand_material/list/<int:customer_brand_id>/', meta_views.CustomerBrandMaterialList.as_view(),
         name='customer-brand-material-list'),

    path('generic_material/list/<int:material_id>/', meta_views.GenricMaterialListView.as_view(),
         name='generic-material-list'),

    path('materail_library/', meta_views.MaterailLibraryListView.as_view(),
         name='materail-library-list'),

     path('materail_library/delete/<int:material_id>/', meta_views.CustomerBrandMaterialDeleteView.as_view(),
         name='materail-library-list'),

    path('generic_material/customer_supplier_brand_material_code/list/<int:generic_material_variation_id>/',
         meta_views.CustomerBrandMaterialListView.as_view(), name='customer-brand_material-material-list'),

    path('material_details/<int:customer_brand_material_code_id>/', material_views.MaterialDetailView.as_view(),
         name='material-details'),


     path('embellishment_type/create/', meta_views.EmbellishmentTypeListCreateView.as_view(), name = 'embellishment-type-list-create-view'),

     path('embellishment_type/update/<int:pk>', meta_views.EmbellishmentTypeRetriveUpdateView.as_view(), name = 'embellishment-type-retrive-update-view'),

     path('embellishment_sub_type/create/', meta_views.EmbellishmentSubTypeListCreateView.as_view(), name = 'embellishment-sub-type-list-create-view'),

     path('embellishment_sub_type/update/<int:pk>', meta_views.EmbellishmentSubTypeRetriveUpdateView.as_view(), name = 'embellishment-sub-type-retrive-update-view'),

    path('supplier_inquiry/reply/list/<int:version_id>', supplier_inquiry_views.SupplierInquiryReplyListView.as_view(),
         name='supplier-inquiry-reply-list'),

    path('supplier_inquiry/details/', material_views.SupplierInquiryDetailsListView.as_view(), name = 'supplier-inquiry-details-list-view'),

     path('userdefinematerial/defect/', meta_views.UserDefinedMaterialDefectCreateView.as_view(), name = 'user-defined-material-defect-create-view'),

     path('userdefinematerial/defect/update/<int:pk>', meta_views.UserDefinedMaterialDefectUpdateView.as_view(), name = 'user-defined-material-defect-update-view'),

     path('color_tone/list/', meta_views.FabricColorToneListCreateView.as_view(), name = 'fabric-color-tone-list-save-view'),

     path('color_tone/details/<int:pk>/', meta_views.FabricColorToneDetailUpdateView.as_view(), name = 'fabric-color-tone-detail-update-view'),

     path('userdefinematerial/items/list/<int:generic_material_variation_id>', material_views.ItemMaterialListView.as_view(), name = 'item-material-list-view'),
     
     path('userdefinematerial/costing/list/<int:generic_material_variation_id>', material_views.CostingMaterialListView.as_view(), name = 'costing-material-list-view'),

     path('supplier_material/details/<int:customer_brand_material_id>', material_views.SupplierMaterialDetailView.as_view(), name='supplier-material-detail-view'),

     path('costing_material/list/<int:costing_version_id>/', meta_views.CostingVersionMaterialListView.as_view(), name = 'user-define-material-list-by-costing'),

     path('customer_brand_material/supplier/list/<int:material_id>/', meta_views.CustomerBrandMaterialSupplierList.as_view(), name = 'user-define-material-list-by-costing'),

     path('customer_brand_material/costing/list/<int:material_id>/', meta_views.CustomerBrandMaterialCostingList.as_view(), name = 'user-define-material-list-by-costing'),

     path('virtual_warehouse/', include('materials.material_urls.virtual_warehouse_urls')),


     path('inhouse_material/po_club/list/', material_views.InhouseMaterialPOClubListView.as_view(), name='inhouse-material-po-club-list-view'),

     path('transfer/po_club/pack_details/<int:po_club_id>/', material_views.MaterialTransferPOPackListView.as_view(), name='po-club-material-transfer-detail-view'),

     path('transfer/po_club/save/<int:po_club_id>/', material_views.POClubMaterialTransferSaveView.as_view(), name='po-club-material-transfer-save-view'),

     path('transfer/list/', material_views.MaterialTransferListView.as_view(), name='material-transfer-list-view'),

     path('transfer/detail/<int:pk>/', material_views.MaterialTransferDetailView.as_view(), name='material-transfer-detail-view'),

     path('transfer/force_edit/detail/<int:pk>/', material_views.MaterialTransferForceEditDetailView.as_view(), name='material-transfer-force-edit-detail-view'),

     path('transfer/force_edit/material_verification/list/<int:warehouse_material_trnasfer_id>/', material_views.MaterialTransferMaterialVerificationListView.as_view(), name='material-transfer-force-edit-detail-view'),

     path('transfer/force_edit/material_list/<int:po_club_id>/<int:warehouse_material_transfer_id>/', material_views.MaterialTransferForceEditMaterialListView.as_view(), name='material-transfer-force-edit-material-list-view'),

     path('transfer/force_edit/material_detail_list/<int:po_club_id>/<int:warehouse_material_transfer_id>/<int:customer_brand_material_id>/', material_views.MaterialTransferForceEditMaterialDetailListView.as_view(), name='material-transfer-force-edit-material-detail-list-view'),

     path('transfer/force_edit/save/<int:po_club_id>/<int:warehouse_material_transfer_id>/', material_views.MaterialTransferForceEditSaveView.as_view(), name='material-transfer-force-edit-save-view'),
     
     path('transfer/force_edit/update/<int:warehouse_material_transfer_id>/', material_views.MaterialTransferForceEditUpdateView.as_view(), name='material-transfer-force-edit-update-view'),

     path('transfer/force_edit/transfer_detail/in_line/update/<int:warehouse_material_transfer_id>/<int:warehouse_material_transfer_detail_id>/', material_views.MaterialTransferDetailInlineEditView.as_view(), name='material-transfer-detail-in-line-edit-view'),

     path('transfer/force_edit/detail/delete/<int:pk>/', material_views.MaterialTransferDetailDeleteView.as_view(), name='material-transfer-detail-delete-view'),

     path('transfer/force_edit/material/delete/<int:po_club>/<int:warehouse_material_transfer_id>/<int:customer_brand_material_id>/', material_views.MaterialTransferMaterialDeleteView.as_view(), name='material-transfer-material-delete-view'),

     path('transfer/leftover_verification/<int:pk>/', material_views.MaterialTransferLeftOverVerificationView.as_view(), name='material-transfer-detail-view'),

     path('transfer/pack_detail/save/<int:warehouse_material_transfer_id>/', material_views.POClubMaterialTransferPackDetailSaveView.as_view(), name='po-club-material-transfer-save-view'),

     path('transfer/material/list/<int:po_club_id>/', material_views.POClubTransferMaterialList.as_view(), name='po-club-material-transfer-list-view'),

     path('transfer/customer_brand_material/list/', material_views.TransferCustomerBrandMaterialList.as_view(), name='po-club-material-transfer-list-view'),

     path('transfer/customer_brand_material/inhouse_material/<int:customer_brand_material_id>/', material_views.TransferCustomerBrandMaterialInhouseMaterialList.as_view(), name='po-club-material-transfer-list-view'),

     path('transfer/customer_brand_material/inhouse_material/save/', material_views.TransferCustomerBrandMaterialInhouseMaterialSaveView.as_view(), name='po-club-material-transfer-list-view'),

     path('material/transfer/po_club/save/', material_views.POClubMaterialTransferDetailView.as_view(), name='po-club-material-transfer-detail-view'),

     path('inhouse/material/list/<int:po_club_id>/', material_views.POClubInhouseMaterialListView.as_view(), name='po-club-material-list-view'),

     path('transfer/state_change/<int:warehouse_material_transfer_id>/', material_views.MaterialTransferStateChangeView.as_view(), name='material-transfer-state-change-view'),

     path('transfer/state/list/', material_views.MaterialTransferStateListView.as_view(), name='material-transfer-state-change-view'),

     path('customer_brand_material/material_code/list/<int:customer_brand_material_id>/<int:supplier_id>/', material_views.CustomerBrandMaterialSupplierCodeList.as_view(), name='customer-brand-material-supplier-code-list-view'),

]
