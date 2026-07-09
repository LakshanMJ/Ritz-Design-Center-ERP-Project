from django.urls import path, include, reverse
from django.conf import settings
from marketing.views.all_views import *
from marketing.views import cad_views, costing_views, po_views, general_information_views, po_cad_views, club_views, grn_views, invoice_views
from django.urls import path
from rest_framework import routers
app_name = 'marketing'

# router = routers.DefaultRouter()

urlpatterns = [

    # Items URLs
    path('items/', ItemCreateListView.as_view(), name='item-create-list'),
    path('paginated_items/', ItemListView.as_view(), name='paginated-item-list'),
    path('item/<int:pk>/', ItemUpdateDetailView.as_view(),
         name='item-update-detail'),

     path('item/paginate/list/', ItemPaginateListView.as_view(), name='item-paginate-list'),


    # OrderInquiry URLs
    path('orderinquiry/list/', general_information_views.OrderInquiryListTest.as_view(), name="order-inquiry-list"),
    path('orderinquiry/<int:pk>/', general_information_views.OrderInquiryUpdateDetailView.as_view(), name="order-inquiry-update-detail"),
    path('orderinquiry/create/', general_information_views.OrderInquiryCreate.as_view(), name="order-inquiry-create"),
    path('orderinquiry/sizes/<int:order_id>', general_information_views.OrderInquirySizesCreateUpdateDetailView.as_view(), name="order-inquiry-sizes-update-detail"),
    path('orderinquiry/items/<int:order_id>', general_information_views.OrderInquiryItemsCreateUpdateDetailView.as_view(), name="order-inquiry-items-update-detail"),
    path('orderinquiry/colorwayitemtypes/<int:order_id>/<int:item_id>', OrderColorwayItemTypesByItemView.as_view(), name="order-inquiry-colorway-item-types"),
    path('orderinquiry/general_information/update/<int:pk>/', OrderInquiryGeneralInformationUpdateView.as_view(), name="order-inquiry-general-information-update-view"),
    # path('orderinquiry/verify/<int:order_id>/', OrderInquiryVerifyView.as_view(), name='order-inquiry-varify'),

    # Order Country
    path('ordercountry/create/', general_information_views.OrderCountryCreateOrUpdate.as_view(),
         name="order-country-create-or-update"),
    path('ordercountry/list/<int:order_id>/', OrderCountryList.as_view(),
         name="order-country-list"),
    path('ordercountry/delete/<int:pk>/', OrderCountryDelete.as_view(), name='order-country-delete'),

    # Order Colorway
    #path('ordercolorway/create/', OrderColorwayCreate.as_view(), name="order-colorway-create"),
    # Update Colorway Count with create OrderColorwy
    path('ordercolorway/create/', OrderColorwayCreate.as_view(), name="order-colorway-create-with-update-colorwaycount"),
    path('ordercolorway/<int:pk>/', OrderColorwayEditDetailDestroy.as_view(), name="order-colorway-edit-delete-detail"),
    path('ordercolorway/list/<int:order_id>', OrderColorwayList.as_view(), name="order-colorway-list"),
    path('ordercolorway/list_create/<int:pk>', general_information_views.OrderColorwayListUpdateView.as_view(), name="order-colorway-list-update"),


    # Order Size
    path('ordersize/create/', OrderSizeCreate.as_view(), name="order-size-create"),
    path('ordersize/list/<int:order_id>/',  OrderSizeList.as_view(), name="order-size-list"),
    path('ordersize/<int:pk>/',
         OrderSizeEditDetail.as_view(), name="order-size-edit-detail"),
    path('ordersize/delete/<int:pk>/',
         OrderSizeDelete.as_view(), name="order-size-delete"),

     # Order SIze Group
     path("ordersizegroup/create/", OrderSizeGroupCreateView.as_view(), name="ordersizegroup-create"),
     path("ordersizegroup/<int:pk>", OrderSizeGroupUpdateView.as_view(), name="ordersizegroup-update-delete-detail"),
     path("ordersizegroup/list/by_order/<int:order_id>", general_information_views.OrderSizeGroupList.as_view(), name="ordresizegroup-list-by-order"),
     path("ordersizegroup/list/by_id/<int:pk>", general_information_views.OrderSizeGroupList.as_view(), name="ordresizegroup-list-by-order"),

    # Order Item
    path('orderitem/create/', OrderItemCreate.as_view(), name="order-item-create"),
    path('orderitem/list/<int:order_id>',  OrderItemList.as_view(), name="order-item-list"),
    path('orderitem/<int:pk>/',
         OrderItemEditDetail.as_view(), name="order-item-edit-detail"),
    path('orderitem/delete/<int:pk>/', OrderItemDelete.as_view(), name="order-item-delete"),
    # path('order_item_colorway_mapping/<int:order_id>/', costing_views.OrderItemVariationMappingView.as_view(), name="order-item-colorway-item-variation-mapping"),

    # Order Colorway Category
    # path('ordercolorwaycategory/create/', OrderColorwayCategoryCreateView.as_view(), name="order-cw-category-create"),
    # path('ordercolorwaycategory/list/<int:order_id>', general_information_views.OrderColorwayCategoryListView.as_view(), name="order-cw-category-list"),
    # path('ordercolorwaycategory/<int:pk>', OrderColorwayCategoryEditDetailDeleteView.as_view(), name="order-cw-category-delete"),

    # Order Colorway Category types
    # path('ordercolorwaycategorytype/create/', OrderColorwayCategoryTypeCreateView.as_view(), name="order-cw-category-create"),
    path('ordercolorwaycategorytype/<int:order_id>', general_information_views.OrderColorwayCategoryTypeListView.as_view(), name="order-cw-category-list-by-order"),
    # path('ordercolorwaycategorytype/delete/<int:pk>', OrderColorwayCategoryTypeDeleteView.as_view(), name="order-cw-categorytype-delete"),
    # path('ordercolorwaycategorytype/<int:pk>', OrderColorwayCategoryTypeEditView.as_view(), name="order-cw-categorytype-edit"),

    # Validate all data
    path('finalize_order_information/<int:order_id>', costing_views.ConfirmCostingGeneralInformation.as_view(), name="validate-order-form"),

    # Order Detail
    path("orderdetail/detail/<int:pk>/",
         OrderDetailView.as_view(), name="orderdetail-detail"),


    # Item Attributes
    path('item_attributes/', ItemAttributeCreateListView.as_view(),
         name='itemattribute-create-list'),
    path('item_attribute/<int:pk>', ItemAttributeDetailEditView.as_view(),
         name='itemattribute-detail-edit'),
     path('item_attribute/assign/types/', ItemAttributeAssignTypeListView.as_view(),
         name='itemattribute-assign-type-list'),
     # Return all items with item placement for given Order ID
     path('itemplacements/individual/<int:order_id>/<int:version_id>', ItemAttributeByCountryColorwayListView.as_view(),
         name='itemattribute-list-by-order'),
     path('itemplacements/all_applicable/<int:order_id>/<int:version_id>', ItemAttributeByCountryListView.as_view(),
         name='itemattribute-list-by-order'),
     path('itemplacement/list/<int:item_id>', ItemAttributeByItemListView.as_view(),
         name='itemattribute-list-by-item'),


    path('unit/list', UnitList.as_view(), name='unit-list'),
    path('unit/create/', UnitCreate.as_view(), name='unit-create'),
    path('unit/detail/<int:pk>', UnitDetail.as_view(), name='unit-detail'),
    path('unit/edit/<int:pk>', UnitEdit.as_view(), name='unit-edit'),

    # Order Item Colorway Country Size CAD
    path('orderpack/list/update/<int:order_id>/<int:version_id>/', costing_views.OrderPackListUpdateView.as_view(), name='orderpack-list-update'),

     # Colorway Item Type
     path('colorwayitemtypes/<int:order_id>', general_information_views.ColorwayItemTypeListCreateView.as_view(), name="colorway-item-type-list-by-order"),

     #OrderPackItem Pattern Placements and Other Placements API
     path('orderpackitemplacement/<int:order_id>/<int:version_id>', OrderPackItemPlacementCreateUpdateView.as_view(), name="order-pack-item-placement-create-update"),
     path('orderpackitemplacement/delete/<int:pattern_id>', OrderPackItemPlacementPatternDeleteView.as_view(), name="order-pack-item-placement-pattern-delete"),
     path('orderpatterntype/update/<int:order_id>/<int:version_id>/', OrderPatternTypeUpdateView.as_view(), name="order-pattern-type-update"),

      #Common API use to return unique other placements for OrderPackItemPlacements and OrderPackPlacements
     path('placements/other/<int:order_id>/<int:version_id>/', OrderUniquePlacementListView.as_view(), name="order-unique-placement-list"),

     path('placements/search/<int:order_id>/<int:version_id>/', costing_views.CostingVersionSearchPlacementView.as_view(), name="order-search-placement-list"),

     path('material_list/<int:order_id>/<int:version_id>/', costing_views.CostingMaterialListAPI.as_view(), name="order-costing-version-material-list"),

     path('material_selected_suppliers/<int:order_id>/<int:version_id>/<int:customer_brand_material_id>/',
          costing_views.MaterialColorwaySupplierDataAPI.as_view(),
          name="order-material-list"
          ),

    path('save_selected_consumption_ratios/<int:order_id>/<int:version_id>/',
          costing_views.MaterialCostingSaveConsumptionRatio.as_view(),
          name="material-costing-save-consumption-ratio"
    ),

    path('save_selected_material_supplier_inquiry_detail/<int:order_id>/<int:version_id>/',
         costing_views.SaveColorwaySupplierInquiryDetail.as_view(),
         name="save-material-colorway-supplier-inquiry-detail"
     ),

    path('order_pack_cost_summary/<int:order_id>/<int:version_id>/<int:pack_id>/',
         costing_views.OrderPackCostSummary.as_view(),
         name="material-costing-save-consumption-ratio"
         ),
     #OrderPackItemPlacement API's
     path('orderpackitemplacement/other/<int:order_id>/<int:version_id>/<int:item_id>/', costing_views.OrderPackItemPlacementOtherCreateUpdateView.as_view(),
          name="order-pack-item-other-placement-create"),

     path('orderpackitemplacement/other/delete/<int:pk>', OrderPackItemPlacementDeleteView.as_view(), name="order-pack-item-other-placement-delete"),

     path('orderpackitemotherplacement/detail/<int:other_placement_id>/<int:version_id>/<int:item_id>/', costing_views.OrderItemOtherPlacementDetailView.as_view(),
         name="order-pack-item-other-placements-detail"),

     #OrderPackPlacement API's
     path('orderpackplacement/other/<int:order_id>/<int:version_id>/', costing_views.OrderPackPlacementOtherCreateUpdateView.as_view(),
          name="order-pack-other-placement-create"),

    path('orderpackplacement/other/delete/<int:pk>', costing_views.OrderPackOtherPlacementDeleteView.as_view(), name="order-pack-other-placement-delete"),

    path(
        'orderpackplacement/other/detail/<int:other_placement_id>/<int:version_id>/',
         costing_views.OrderPackOtherPlacementDetailView.as_view(),
          name="order-pack-other-placement-detail"
         ),

    path('material/review/<int:order_id>', costing_views.MaterialReviewDetailUpdateView.as_view(), name="material-review-detail-update-view"),

    path('orderpack_items_materials/<int:order_id>/<int:version_id>/<int:order_colorway_id>/<int:order_country_id>/<int:order_size_group_id>/',
        costing_views.OrderPackItemSizeGroupMaterialsView.as_view(),
        name="order-pack-items-group-placement-materials"),

    path('orderpack_items_materials/review/<int:version_id>/<int:order_colorway_id>/<int:order_country_id>/<int:order_size_group_id>/',
        costing_views.GroupMaterialReviewDetailUpdateView.as_view(),
        name="order-pack-items-group-review-materials"),

    # Material assignment URLs
    path('orderpackitemplacements/<int:order_pack_item_id>/<int:version_id>', costing_views.PackItemMaterialAPI.as_view(),
         name="order-pack-item-placements-materials"),
    path('orderpackplacements/<int:order_pack_id>/<int:version_id>', costing_views.PackMaterialAPI.as_view(),
         name="order-pack-placements-materials"),

    # Assign materials
    path('pack_item/<int:version_id>/assign_materials', costing_views.PackItemAssignMaterial.as_view(), name='pack-item-assign-material'),

    path('pack_item_placements/<int:version_id>/<int:pack_item_placement_id>/',
         costing_views.OrderPackItemList.as_view(), name='item-version-pack-items'),

    path('pack/<int:version_id>/assign_materials', costing_views.PackAssignMaterial.as_view(), name='pack-assign-material'),

    path('pack_placements/<int:version_id>/<int:pack_placement_id>/',
         costing_views.OrderPackPlacementList.as_view(), name='item-version-packs'),

    # Navigation for Material Interface
     path('orderitemsizegrouppacks/<int:order_id>/<int:version_id>/', costing_views.OrderItemSizeGroupPacksDetailView.as_view(),
          name='orderitemsizegrouppacks-list'),

     # Items URLs
    path('material/types/', MaterialTypeMetaView.as_view(), name='material-type-meta-detail-view'),

    path('material/unit/', MaterialUnitCreateListView.as_view(), name='fabrictexture-create-list-view'),

    path('material/unit/<int:pk>/', MaterialUnitUpdateDetailView.as_view(), name='fabrictexture-update-detail-view'),

     # Import Item Templetes
     path('itemtemplate/import/', ItemTemplateImportView.as_view(), name='itemtemplate-import'),


     path('orderfabrictrim/detail/<int:order_id>/', OrderFabricTrimDetailByType.as_view(),
         name="order-pack-item-placements-materials-by-type"),

     path('orderpack/review/<int:pk>/', OrderPackReviewedUpdate.as_view(),
         name="order-pack-review-update"),

     path('orderpackitem/review/<int:pk>/', OrderPackItemReviewedUpdate.as_view(),
         name="order-pack-item-review-update"),

    # Order Version
    path('order_version/<int:order_id>/<int:pk>/', costing_views.OrderCostingVersionDetailUpdateView.as_view(), name='order-version-update-detail'),

    path('order_versions/<int:order_id>/', costing_views.OrderCostingVersionListCreateView.as_view(), name='order-versions-list-create'),

    # Order Material
     path('ordermaterial/details/<int:order_id>', OrderMaterialListView.as_view(), name='ordermaterial-details'),

     path('version_material/details/<int:version_id>', VersionMaterialListView.as_view(), name='version-aterial-details'),

    # Select customer brand material supplier inquiry
    path('pack_order_item_material/supplier_inquiry/<int:order_id>/<int:version_id>/<int:pack_item_id>/',
         costing_views.OrderPackItemColorwayMaterialSupplierInquiry.as_view(), name='packitem-ordermaterial-supplierinquiry'),

    path('pack_order_material/supplier_inquiry/<int:order_id>/<int:version_id>/<int:pack_id>/',
         costing_views.OrderPackColorwayMaterialSupplierInquiry.as_view(),
         name='pack-ordermaterial-supplierinquiry'),

    path('colorway_material/supplier_inquiry/<int:order_id>/<int:version_id>/<int:colorway_id>/',
         costing_views.OrderColorwayMaterialSupplierInquiry.as_view(), name='colorway-ordermaterial-supplierinquiry'),

    # CAD Interface APIs
    path(
        'orderpackitemgroupplacements/<int:order_id>/<int:version_id>/<int:order_colorway_id>/<int:order_country_id>/<int:order_item_id>/<int:order_size_group_id>/',
        cad_views.OrderPackItemSizeGroupPlacementMaterials.as_view(),
        name="order-pack-item-group-placements"),

    path(
        'orderpackgroupplacements/<int:order_id>/<int:version_id>/<int:order_colorway_id>/<int:order_country_id>/<int:order_size_group_id>/',
        cad_views.OrderPackSizeGroupPlacementMaterials.as_view(),
        name="order-pack-group-placements"),

    path('cad_interface_navigation/<int:order_id>/<int:version_id>/', cad_views.CADInterfaceNavigation.as_view(), name='cad-interface-navigation'),

    path('pending_consumption_ratio_entry/', cad_views.CADInquiryView.as_view(), name='pending-consumption-ratios'),

    path('completed_consumption_ratio_entry/', cad_views.CADInquiryView.as_view(), name='completed-consumption-ratios'),

    path('upcoming_consumption_ratio_entries/', cad_views.CADInquiryView.as_view(), name='upcoming-consumption-ratios'),

    # TODO - is this needed ?
    path('cad_interface_fabric_navigation/<int:order_id>/', cad_views.ItemColorwayCategoryNavigation.as_view(), name='cad-interface-fabric-navigation'),

    path('cad_fabric_navigation/<int:order_id>/<int:version_id>/', cad_views.FabricCadNavigation.as_view(), name='cad-interface-fabric-navigation-new'),

    path('save_consumption_data/<int:order_id>/<int:version_id>/', cad_views.AssignConsumptionRatio.as_view(), name='cad-save-cad-ratios'),

    path('save_pack_consumption_data/<int:order_id>/<int:version_id>/', cad_views.AssignPackConsumptionRatio.as_view(), name='cad-save-pack-cad-ratios'),

    ## Cad interface fabric details
    path('item_colorway_country_size_group_fabrics/<int:order_id>/<int:version_id>/<int:item_id>/<int:colorway_id>/<int:country_id>/<int:size_group_id>/<int:colorway_category_id>',
         cad_views.OrderItemCountryColorwaySizeGroupFabricsView.as_view(), name='cad-item-colorway-country-size-group-fabrics'),

    path('item_colorway_fabrics/<int:order_id>/<int:version_id>/<int:item_id>/<int:colorway_id>/<int:colorway_category_id>/',
         cad_views.OrderItemColorwayFabricsView.as_view(), name='cad-item-colorway-fabrics'),

    path('item_colorway_type_fabrics/<int:order_id>/<int:version_id>/<int:item_id>/<int:colorway_category_id>/',
         cad_views.OrderItemColorwayTypeFabricsView.as_view(), name='cad-item-colorway-type-fabrics'),

    ## Cad interface save fabrics
    path('save_item_colorway_country_size_group_fabrics/<int:order_id>/<int:version_id>/<int:item_id>/<int:colorway_id>/<int:country_id>/<int:size_group_id>/<int:colorway_category_id>/',
         cad_views.SaveItemSizeGroupColorwayTypeFabricConsumptionRatio.as_view(), name='save-cad-item-colorway-country-size-group-fabrics-ratios'),

    path('save_item_colorway_type_fabrics/<int:order_id>/<int:version_id>/<int:item_id>/<int:colorway_id>/<int:colorway_category_id>/',
         cad_views.SaveItemColorwayTypeColorwayFabricConsumptionRatio.as_view(), name='save-cad-item-colorway-fabrics'),

    path('save_item_colorway_type_fabrics/<int:order_id>/<int:version_id>/<int:item_id>/<int:colorway_category_id>/',
         cad_views.SaveItemColorwayTypeFabricConsumptionRatio.as_view(), name='save-cad-item-colorway-type-fabrics'),

    path('order_costing_version_state_change/<int:order_id>/<int:version_id>/',
         costing_views.OrderCostingStateChangeView.as_view(), name='costing_version-state-save-update'),

    path('perform_costing/<int:version_id>/<int:pk>/', costing_views.PackPackItemCostingDetails.as_view(), name='perform-costing'),

    path('recalculate_costing/<int:version_id>/', costing_views.ReCalculateVersionCosts.as_view(), name='recalculate-costing'),

    path('perform_grouped_costing/<int:version_id>/<int:order_country_id>/<int:order_colorway_id>/<int:size_group_id>/',
         costing_views.PerformSizeGroupPackCosting.as_view(), name='perform-grouped-costing'),

    path('pack_costs/<int:order_id>/<int:version_id>/', costing_views.VersionPackCosts.as_view(),
         name='version-packs-costs'),

    # Item variation related code # TODO - move this to meta view
    path('item/variation/', ItemVariationListCreateView.as_view(), name='item-variation-list-create'),

    path('item/variation_operation/', ItemVariationOperationListCreateView.as_view(),
         name='item-variation-operation-list-create'),

    path('item/variation/<int:pk>', ItemVariationDetailUpdateView.as_view(), name='item-variation-view-update'),

    path('item/variation_operation/<int:pk>', ItemVariationOperationDetailUpdateView.as_view(),
         name='item-variation-operation-view-update'),

    path('item/variation_operation/detail/<int:variation_id>', ItemVariationOperationDetailView.as_view(),
         name='item-variation-operation-detail-view'),

    path('item/variation/list/', ItemVariationListView.as_view(), name='item_variation-list'),

    path('item/variation/detail/<int:item_id>', ItemVariationDetailView.as_view(), name='item_variation-detail'),

    path('item/variation_operation/clone/<int:source_item_variation_id>/<int:destination_item_variation_id>/',
          ItemVariationOperationCloneView.as_view(), name='item-variation-operation-clone-view'),

     path('item/variation_operation/delete/<int:pk>/',
          ItemVariationOperationDeleteView.as_view(), name='item-variation-operation-clone-view'),

    path('order_item_colorway_operation/list/<int:order_item_id>/<int:order_colorway_id>/<int:version_id>',
         costing_views.OrderItemColorwayOperationListView.as_view(), name='order_item_colorway_operation-list'),

    path('order_pack_item_colorway_operation/list/<int:order_item_id>/<int:order_colorway_id>/<int:pack_item_id>/<int:version_id>',
         costing_views.OrderPackItemColorwayOperationListView.as_view(), name='order_pack_item_colorway_operation-list'),


    path('order_pack_item_consolidated_colorway_operations/<int:version_id>/<int:pack_item_id>/',
         costing_views.ConsolidatedOrderPackItemColorwayOperationListView.as_view(),
         name='consolidated_order_pack_item_colorway_operation-list'),

    path(
        'order_size_group_pack_item_colorway_operation/list/<int:country_id>/<int:colorway_id>/<int:size_group_id>/<int:order_item_id>/<int:version_id>',
         costing_views.OrderPackItemGroupItemColorwayOperationListView.as_view(), name='order_pack_item_colorway_operation-list'),

    path('order_item_colorway_operation/detail/<int:pk>', costing_views.OrderItemColorwayOperationDetailView.as_view(),
         name='order_item_colorway_operation-detail'),

    path('order_item_colorway_operation/create/<int:order_item_id>/<int:order_colorway_id>/<int:version_id>',
         costing_views.OrderItemColorwayOperationCreateView.as_view(), name='order_item_colorway_operation-create'),

    path('order_item_colorway_operation/display_order/update/',
         costing_views.OrderItemColorwayOperationDisplayOrderUpdateView.as_view(),
         name='order_item_colorway_operation_display_order-update'),

    path('item_variation_operation/display_order/update/', ItemVariationOperationDisplayOrderUpdateView.as_view(),
         name='item_variation_operation_display_order-update'),

    path('item_variation_operation/copy/<int:version_id>/<int:order_item_id>/<int:colorway_category_id>/<int:order_colorway_id>/', 
         OrderItemColorwayOperationCopyOperationCreateView.as_view(),  name='item_variation_operation_copy'),

    path('item_variation_operation/item/detail/<int:version_id>/<int:order_item_id>/<int:colorway_category_id>/<int:order_colorway_id>/', 
         OrderItemColorwayOperationItemListView.as_view(),  name='item-variation-operation-item-detail'),

    path('item/variation/detail/<int:item_id>', ItemVariationDetailView.as_view(), name='item_variation-detail'),

    path('operations/order_costing/list/', OrderCostingVersionListByOperatoinStatusView.as_view(),
         name='order-costing-list-by-operations-status'),

    path('operations/order_costing/update/<int:pk>', OrderCostingVersionOperatoinStatusUpdateView.as_view(),
         name='order-costing-operations-status-complete-update'),

    path('order_version/state/list/', OrderVersionStateListView.as_view(), name='order-version-state-list'),

    path('order_version/state/update/<int:order_id>/<int:pk>/', OrderVersionStateUpdateView.as_view(),
         name='order-version-state-list'),

    path('order_version/state/update/<int:order_id>/<int:pk>/', OrderVersionStateUpdateView.as_view(),
         name='order-version-state-list'),

    path('order_pack_other_cost/types/list/<int:version_id>/', costing_views.OtherCostTypeListView.as_view(),
         name='order-pack-other-cost-type-list'),

    path('order_pack_other_cost/<int:order_id>/<int:version_id>/',
         costing_views.OrderPackOtherCostCreateUpdateView.as_view(), name='order-pack-other-cost-create-update'),

    path('order_pack_other_cost/pack/<int:pack_id>/<int:other_cost_type_id>/',
         costing_views.OrderPackOtherCostByPackandTypeDetailView.as_view(),
         name='order-pack-other-cost-by-type-and-pack-detail'),

    path('order_pack_other_cost/group/<int:country_id>/<int:colorway_id>/<int:size_group_id>/<int:other_cost_type_id>/',
         costing_views.OrderPackOtherCostByGroupDetailView.as_view(),
         name='order-pack-other-cost-by-group-detail-list'),

    path('order_pack_other_cost/detail/<int:pack_id>', costing_views.OrderPackOtherCostDetailView.as_view(),
         name='order-pack-other-cost-detail-update'),

    path('order_pack_other_cost/delete/<int:pk>', costing_views.OrderPackOtherCostDeleteView.as_view(),
         name='order-pack-other-cost-delete'),

    path('order_pack_other_cost/group/delete/<int:other_cost_type_id>/<int:country_id>/<int:colorway_id>/', costing_views.OrderPackOtherCostGroupDeleteView.as_view(),
         name='order-pack-other-cost-delete'),
     

    # Wash Service Views
    path('pack_item_wash_create_update/<int:order_id>/<int:version_id>/<int:pack_item_id>/',
         costing_views.WashServiceCreateUpdate.as_view(),
         name='pack-item-wash-create-update'),

    path('pack_item_wash_list/<int:pack_item_id>/',
         costing_views.WashServiceListView.as_view(),
         name='pack-item-wash-list-update'),

    path('pack_item_wash/<int:version_id>/<int:wash_service_id>/',
         costing_views.WashServiceDetailDeleteView.as_view(),
         name='pack-item-wash-detail-delete'),

    # Embellishment service
    path('embellishment_service_type/create/<int:order_id>/<int:version_id>/',
         costing_views.EmbellishmentServiceCreateUpdateView.as_view(), name='embellishment-service-type-create-update-view'),

    path('pack_item_embellishment_service/detail/<int:pk>/',
        costing_views.PackItemEmbellishmentServiceDetailView.as_view(), name='pack_item_embellishment-service-detail-view'),

    path('embellishment_service_type/detail/<int:pk>/',
         costing_views.EmbellishmentServiceTypeDetailByServiceView.as_view(),
         name='embellishment-service-type-detail-view-by-service'),

    path('embellishment_service_list/<int:pack_item_id>/', costing_views.EmbellishmentServiceListView.as_view(),
         name='embellishment-service-type-detail-view-by-service'),

    path('embellishment_service_type/meta_data/<int:order_id>/<int:version_id>/<int:item_id>/<int:country_id>/<int:colorway_id>/',
        costing_views.EmbellishmentServiceTypeMetaDataDetailView.as_view(),
        name='embellishment-service-type-meta-data-detail-service'),
     
    path('pack_item_embellishment_service/delete/<int:pk>/',
        costing_views.PackItemEmbellishmentServiceDeleteView.as_view(), name='pack-item-embelishment-service-delete-view'),

    #################################### PO URLS ####################################################
    path('purchase_order/create/<int:order_id>/<int:version_id>/',
         po_views.PurchaseOrderListCreateView.as_view(),
         name='save-purchase-order'),

    path('purchase_orders/', po_views.PurchaseOrderList.as_view(), name='purchase-order-list'),

     path('purchase_order/colorway_country_size/<int:order_id>/<int:version_id>/<int:po_id>/',
         po_views.POColorwayCountrySizeCreateEditView.as_view(), name='save-edit-purchase-order-colorway-country_size'),
     path('po_colorway_order_colorway_list/<int:purchase_order_id>', po_views.POColorwayOrderColorwayListView.as_view(), name = 'po_colorway_order_colorway-list'),


     path('po_colorway_order_colorway/matching/', po_views.POColorwayOrderColorwayMatchingListView.as_view(), name='po_colorway_order_colorway-matching'),

     path('po_information_list/create/<int:order_id>/<int:order_costing_version_id>', po_views.POInformationCreateView.as_view(), name='po_information_list-create'),

     path('po_information_list/update/<int:purchase_order_id>', po_views.POInformationUpdateView.as_view(), name='po_information_list-update'),

     path('po_information_list/list/<int:purchase_order_id>', po_views.POInformationListView.as_view(), name='po_information_list-list'),

     path('purchase_order/create/file/<int:order_id>/<int:version_id>/',
         po_views.PurchaseOrderFileListCreateView.as_view(), name='save-purchase_order-from-file'),

     path('purchase_order/update/file/<int:pk>',
         po_views.PurchaseOrderFileRetriveUpdateView.as_view(), name='detail-update-purchase_order-file'),

     path('purchase_order/capture/file/<int:customer_id>/',
         po_views.PurchaseOrderCaptureData.as_view(), name='capture-excel-po-file'),

     path('purchase_order/pack/details/<int:purchase_order_id>/',
         po_views.PurchaseOrderPackDetailView.as_view(), name='purchase-order-pack-detail-view'),

     path('purchase_order/list/<int:order_id>/<int:version_id>/',
         po_views.PurchaseOrderListView.as_view(), name='purchase-order-list'),

     path('po_club/purchase_order/list/<int:po_club_id>/',
         po_views.POClubPurchaseOrderListView.as_view(), name='po-club-purchase-order-list'),

    path('po_country_order_country_list/<int:purchase_order_id>', po_views.POCountryOrderCountryListView.as_view(), name = 'po_country_order_country-list'),

    path('po_country_order_country/matching', po_views.POCountryOrderCountryMatchingListView.as_view(), name='po_country_order_country-matching'),

    path('po_size_order_size_list/<int:purchase_order_id>', po_views.POSizeOrderSizeListView.as_view(), name = 'po_size_order_size-list'),

    path('po_size_order_size/matching/', po_views.POSizeOrderSizeMatchingListView.as_view(), name='po_size_order_size-matching'),

    path('po_pack/list/update/', po_views.POPackUpdateListView.as_view(), name='po-pack=list-update'),

    path('po/status/list/<int:purchase_order_id>', po_views.POStatusListView.as_view(), name='po-status-list'),

    path('change_po_status/<int:purchase_order_id>/', po_views.ChangePOState.as_view(), name='change-po-status'),

    path('purchase_order/packs/<int:purchase_order_id>/', po_views.POPackListView.as_view(), name='purchase-order-list'),

    path('purchase_order/material_navigation/<int:purchase_order_id>/', po_views.POMaterialNavigation.as_view(), name='purchase-order-material-list'),

    path('purchase_order/po_colorway_country_sizes/<int:purchase_order_id>/', po_views.POColorwayCountrySizeList.as_view(), name='purchase-order-cw-country-size-list'),

    path('purchase_order/colorway_country_material_navigation/<int:purchase_order_id>/', po_views.POColorwayCountryNavigation.as_view(), name='purchase-order-material-cw-country-list'),

    path('po_colorway_country_size/details/list/<int:purchase_order>', po_views.POColorwayCountrySizeDetailsView.as_view(), name='po_colorway_country_size_details-list'),

    # Colorway Country materials
    path('po_colorway_country_materials/<int:purchase_order_id>/<int:po_country_id>/<int:po_colorway_id>/',
         po_views.PurchaseOrderColorwayCountryMaterial.as_view(),
         name='po-colorway-country-materials'),

    path('po_colorway_country_navigation/<int:purchase_order_id>/',
         po_views.PurchaseOrderColorwayCountryNavigation.as_view(),
         name='po-colorway-country-materials'),

    path('po_colorway_country_save_material/<int:purchase_order_id>/',
         po_views.SavePurchaseOrderColorwayCountryMaterial.as_view(),
         name='save-po-colorway-country-materials'),

    path('po_pack_item_materials/<int:purchase_order_id>/<int:po_pack_item_id>/', po_views.POPackItemMaterialView.as_view(), name='po-pack-item-material-list'),

    path('po_pack_materials/<int:purchase_order_id>/<int:po_pack_id>/', po_views.POPackMaterialView.as_view(), name='po-pack-material-list'),

    path('save_po_pack_item_materials/<int:po_pack_item_id>/', po_views.PurchaseOrderPackItemSaveMaterial.as_view(), name='po-pack-item-material-save'),

    path('save_po_pack_materials/<int:po_pack_id>/', po_views.PurchaseOrderPackSaveMaterial.as_view(), name='po-pack-material-save'),

    path('purchase_order/<int:purchase_order_id>/<int:reference_code_id>/materials', po_views.POCustomerBrandMaterialView.as_view(), name='po-reference-code-materials'),

    path('build_purchase_order_bom/<int:purchase_order_id>/', po_views.POBuildBom.as_view(), name='po-build-bom'),

    path('purchase_order_bom/<int:purchase_order_id>/', po_views.PurchaseOrderBomView.as_view(), name='po-material-bom'),

    path('purchase_order_version/matching', po_views.PurchaseOrderVersionMatchingListView.as_view(),
         name='purchase_order_version-matching'),

    path('customer_order_version/list/<int:purchase_order_id>', po_views.CustomerOrderVerisionListView.as_view(),
         name='customer_order_version-list1'),

    path(
        'po_country_colorway_item_placements/<int:purchase_order_id>/<int:po_item_id>/<int:po_colorway_id>/<int:po_country_id>/',
        po_views.POColorwayCountryItemPlacementView.as_view(), name='po-country-colorway-item-placements'),

    path('po_country_colorway_placements/<int:purchase_order_id>/<int:po_colorway_id>/<int:po_country_id>/',
         po_views.POColorwayCountryPlacementView.as_view(), name='po-country-colorway-placements'),

    path('customer_order_version/list/<int:customer_id>/<int:file_id>',
         po_views.CustomerOrderVerisionListView.as_view(), name='customer_order_version-list2'),

    path('costing_vs_po_quantities/list/<purchase_order_id>', po_views.CostingVSPOQuantitiesListView.as_view(),
         name='costing_vs_po_quantities-list'),

    path('po_pack_review/update/', po_views.POPackReviewUpdateView.as_view(), name='po_pack_review-update'),

    path('po_pack_review/status/<int:object_id>/', po_views.POPackReviewStatusView.as_view(),
         name='po_pack_review-status'),

    path('po_colorway_item/list/<int:po_id>/', po_views.POColorwayItemView.as_view(), name='po-colorway-item-list'),

    path('po_colorway_items/mapping/', po_views.POColorwayItemMappingUpdateView.as_view(),
         name='po-colorway-item-mapping'),
     
    path('po_colorway_item/matrix/<int:po_id>/', po_views.POColorwayMatrixDetailView.as_view(),
         name='po-colorway-item-mapping'),

    path('order/program/create/', costing_views.OrderProgramListCreateView.as_view(), name = 'order-programe-create-view'),

    path('order/program/inquiry/create/<int:program_id>', costing_views.OrderProgramInquiryCreateView.as_view(), name = 'order-programe-order-inquiries-create-view'),

    path('order/program/list/<int:program_id>', costing_views.OrderProgramInquiryListView.as_view(), name = 'order-programe-order-inquiries-create-view'),

    path('order_version_colorway/list/<int:version_id>/', costing_views.OrderVersionColorwayListView.as_view(),
         name='order-version-colorway-list'),

    path('order/program/update/<int:pk>', costing_views.OrderProgramRetriveUpdateView.as_view(), name = 'order-programe-update-view'),

    path('order/sizegroup/item/pack/details/<int:order_id>/<int:version_id>/<int:country_id>/<int:colorway_id>/<int:size_group_id>/', costing_views.OrderSizeGroupItemPackDetailView.as_view(), 
         name='order-size-group-item-pack-detail-view'),

    path('order/supplier_inquiry/complete_status/<int:pk>',
         costing_views.OrderSupplierCompleteStatusUpdateView.as_view(),
         name='order-supplier-inquiry-complete-status-update-view'),

     path('delete_group_pack_item_placement/<int:version_id>/<int:colorway_id>/<int:country_id>/<int:size_group_id>/<int:order_item_id>/<int:item_attribute_other_id>/',
         costing_views.GroupPackItemPlacementDeleteView.as_view(),
         name='group-pack-item-placement-delete-view'),

     path('delete_group_pack_placement/<int:version_id>/<int:colorway_id>/<int:country_id>/<int:size_group_id>/<int:item_attribute_other_id>/',
         costing_views.GroupPackPlacementDeleteView.as_view(),
         name='group-pack-placement-delete-view'),

     path('purchase_order/state/list/', po_views.PurchaseOrderStateListView.as_view(), name='purchase-order-state-list'),

     path('purchase_order/state/update/<int:po_club_id>/', po_views.PurchaseOrderStateUpdateView.as_view(), name='purchase-order-state-list'),

    path('purchase_order/uploaded_purchase_order/list/', po_views.UploadedPurchaseOrderListView.as_view(),
         name='uploaded-purchase-order-list-view'),

    path('purchase_order/uploaded_purchase_order/<int:pk>/', po_views.UploadedPurchaseOrderDetailView.as_view(),
         name='uploaded-purchase-order-detail-view'),

    path('purchase_order/actual_club/po_update/', po_views.PurchaseOrderActualClubUpdateView.as_view(),
         name='purchase-order-actual-club-po-update'),

    # CAD views
    path('purchase_order/cad/fabrics/<int:purchase_order_id>/<int:po_colorway_id>/<int:po_order_item_id>/',
         po_views.PurchaseOrderFabricDataCad.as_view(), name='cad-purchase-order-colorway-country-cad-fabrics'),

    path('purchase_order/cad_navigation/<int:purchase_order_id>/',
         po_views.PurchaseOrderColorwayCountryView.as_view(), name='cad-purchase-order-navigation'),

    path('purchase_order/save_colorway_item_cad_data/<int:purchase_order_id>/',
         po_views.SavePOColorwayItemCadData.as_view(), name='cad-purchase-order-navigation'),

     path('order_inquiry/style_number/',costing_views.OrderInquiryStyleNumberCreateView.as_view(), name='order-inquiry-style-number-create'),

     path('order_inquiry/style_number/<int:order_id>/',costing_views.OrderInquiryStyleNumberListView.as_view(), name='order-inquiry-style-number-list'),

     path('order_inquiry/style_number/detail/<int:pk>/',costing_views.OrderInquiryStyleNumberRetriveUpdateView.as_view(), name='order-inquiry-style-number-create-detail-update'),

    path('purchace_order/bom/detail/<int:purchase_order_id>/', po_views.PurchaseOrderMaterialFilteredView.as_view(),
         name='purchase-order-materials-filtered-view'),

    path('purchase_order/po_clubbing/complete_status/<int:pk>/',
         po_views.UploadedPurchaseOrderCompleteStatusUpdateView.as_view(),
         name='purchase-order-clubbing-complete-status-update-view'),

    # Clubbed CAD Team
    path('purchase_order_club/fabrics/<int:po_club_id>/', po_cad_views.POClubFabricsView.as_view(), name='actual-club-fabrics'),

    path('purchase_order_club/item_clubs/<int:po_club_id>/<int:item_id>/<int:po_material_id>/',
         po_cad_views.POClubItemFabricPlacements.as_view(),
         name='actual-club-item-materials-placements'),

     # path('purchase_order_club/fabric_marker/<int:actual_po_club_id>/<int:fabric_width_id>/',
     #     po_cad_views.MarkerFabricWidthSupplierDetailView.as_view(),
     #     name='actual-club-marker-fabric-marker-supplier-detail-view'),

    path('purchase_order_club/item_fabric_markers/<int:po_club_id>/<int:material_id>/',
         po_cad_views.POClubFabricMarkers.as_view(),
         name='po-club-item-markers'),

    #path('purchase_order_club/item_clubs/<int:po_club_id>/',
    #     po_cad_views.POCreateNewFabricMarker.as_view(),
    #     name='po-club-create-markers'),

    path('purchase_order_club/merge_fabrics/<int:po_club_id>/',
         po_cad_views.ActualClubMergeMaterials.as_view(),
         name='po-club-merge-fabrics'),

    path('club_fabric_list/<int:po_club_id>/',
         po_cad_views.ActualClubFabricList.as_view(),
         name='po-club-fab'),
    path('club_material_list/<int:po_club_id>/',
         po_cad_views.ActualClubMaterialList.as_view(),
         name='po-club-material'),

    path('purchase_order_club/item_fabric_markers/<int:pk>/', po_cad_views.POClubItemFabricMarkerRetriveDeleteView.as_view(), name='po-club-item-fabric-markers-retrive-delete-view'),

    path('purchase_order_club/item_fabric_markers/list/<int:po_club_id>/<int:po_material_id>/<int:item_id>/<int:marker_id>/',
          po_cad_views.POClubItemNotSelectFabricMarkerListView.as_view(), name='po-club-item-not-select-fabric-markers-list-view'),

    path('purchase_order_club/item_fabric_markers/placements/copy/<int:po_club_id>/<int:marker_id>/',
          po_cad_views.POClubItemFabricMarkersPlacementsCopyView.as_view(), name='po-club-item-fabric-marker-placements-copy-view'),

    path('purchase_order_club/item_fabric_markers/placements/delete/<int:po_club_id>/<int:marker_id>/',
          po_cad_views.FabricMarkerPlacementDeleteView.as_view(), name='po-club-item-fabric-marker-placements-delete-view'), #TODO check this with front end.(Unused API)

    path('po_material/review/<int:po_id>/', po_views.POMaterialReviewDetailUpdateView.as_view(),
         name="po-material-review-detail-update-view"),

    path('actual_po_club/state_options/', po_views.ActualPOClubStateOptionView.as_view(),
         name="actual-po-club-state-options"),
     
    path('purchase_order/current_clubbing_mapping_complete_or_open/list/<int:pk>/',
         po_views.POMappingCompleteOpenListView.as_view(),
         name='current-clubbing-mapping-complete-or-open-list'),

    path('purchase_order/actual_po_club/list/',
         po_views.ActualPOClubListView.as_view(),
         name='actual-po-club-list'),

    path('purchase_order/actual_po_club/<int:pk>/',
         po_views.ActualPOClubDetailView.as_view(),
         name='actual-po-club-detail'),

    path('change_po_club_status/<int:po_club_id>/', po_views.ChangePOClubState.as_view(), name='change-po-club_status'),

    path('po_marker_details/<int:po_club_id>/<int:marker_id>/', po_cad_views.POActualClubFabricCadData.as_view(),
         name="actual-po-club-cad-area"),

    #path('po_marker/save_cad_date/<int:po_club_id>/<int:marker_id>/', po_cad_views.SaveActualPOClubFabricData.as_view(),
    #     name="actual-po-club-cad-area"),

    path('po_clubs/purchase_orders/navigation/<int:po_club_id>/', po_cad_views.POClubPacksNavigation.as_view(),
         name="actual-po-club-pos-navigation-view"),

    path('po_clubs/refresh_create/bom/<int:po_club_id>/', po_cad_views.POClubBOMRefreshCreateView.as_view(),
         name="actual-po-club-refresh-create-view"),

    path('po_club/purchase_orders_bom/<int:po_club_id>/', po_cad_views.ActualClubPurchaseOrdersBomView.as_view(), name='po-club-pos-material-bom-list-view'),

    path('po_club/bom/detail/<int:club_id>/', po_views.POClubMaterialFilteredView.as_view(),
         name='purchase-order-club-materials-filtered-view'),

    path('po_club/bom/generate/excel/<int:club_id>/', po_views.POClubBOMGenerateExcelView.as_view(),
         name='purchase-order-club-materials-filtered-view'),


    #path('po_club/bom/material/detail/<int:actual_club_bom_id>/<int:material_id>/', po_views.POClubBOMMaterialDetailView.as_view(), name='purchase-order-club-bom-material-detail-view'),

    path('po_club/bom/supplier/detail/<int:actual_club_bom_id>/<int:material_id>/', po_views.POClubBOMSupplierDetailView.as_view(), name='purchase-order-club-bom-supplier-detail-view'),

    path('po_club/bom/supplier/delete/<int:pk>/', po_views.POClubBOMSupplierDeleteView.as_view(), name='purchase-order-club-bom-supplier-delete-view'),

    path('purchase_order/state/meta/list/', po_views.StateListView.as_view(), name='state-meta-list'),

    path('purchase_order/club/supplier_po/file/list/<int:actual_po_club_id>/', po_views.ClubSupplierPOFileListView.as_view(), name='supplier-po-file-list'),

    path('purchase_order/club/state/force_change/<int:actual_po_club_id>/', po_views.ClubStateForceChangeView.as_view(), name='po-club-force-change-view'),

    path('purchase_order/club/supplier/list/<int:general_po_material_quantity_id>/<int:material_id>/', po_views.OrderInquirySupplierList.as_view(), name='po-club-supplier-list'),

    path('order_costing/version/attachments/<int:version_id>/', costing_views.TechPackUploadView.as_view(),
         name='attachments-upload'),

     path('order/tech_pack/upload/<int:order_id>/', costing_views.OrderInquiryTechPackUploadView.as_view(),
         name='order-tech-pack-upload'),

    path('order_costing/version/attachments/delete/<int:version_id>/<int:file_id>',
         costing_views.TechPackDeleteView.as_view(), name='attachments-delete'),

    path('po_club/material/marker/placements/<int:actual_club_id>/<customer_brand_material_id>/',
         po_cad_views.POFabricMarkerItemPlacementsView.as_view(),
         name='po-club-marker-meta-data-detail'),

    path('po_club/create_marker/<int:actual_club_id>/<customer_brand_material_id>/',
         po_cad_views.CreatePOFabricMarker.as_view(),
         name='po-club-marker-create'),

     path('po_club/left_over_marker/status/<int:po_club_id>/',
         po_cad_views.POClubLeftOverMaterialStatusView.as_view(),
         name='po-club-left-over-material-status-view'),

     path('po_club/marker/classification/list/',
         po_cad_views.MarkerClassificationListView.as_view(),
         name='po-club-marker-create'),

    path('po_club/create_sub_marker/<int:parent_marker_id>/',
         po_cad_views.CreatePOFabricSubMarker.as_view(),
         name='po-club-sub-marker-create'),

    path('po_club/marker/cad_data/<int:actual_club_id>/<int:marker_id>/', po_cad_views.MarkerCadDataUpdateView.as_view(), name='po-club-marker-cad-data-update'),

    path('po_club/marker/cad_data/detail/<int:marker_id>/', po_cad_views.MarkerCadDataDetailView.as_view(), name='po-club-marker-cad-data-detail-view'),

    path('po_club/marker/widht/list/<int:actual_po_club_id>/<int:customer_brand_material_id>/', po_cad_views.FabricWidthListView.as_view(), name='po-club-marker-width-list'),

    path('po_club/marker/delete/<int:pk>/', po_cad_views.FabricMarkerDeleteView.as_view(), name='po-club-marker-delete-view'),

    path('order/version/copy/<int:source_version_id>/<int:clone_version_id>/', costing_views.VersionCloneTriggerView.as_view(), name='version-clone-view'),

    path('po_club/marker/details/<int:po_club_id>/<int:po_material_id>/<int:marker_id>', po_cad_views.POClubItemMaterialFabricMarkerRetriveView.as_view(), name = 'po-club-item-material-marker-detail-view'),

    path('po_club/marker/placements/<int:related_marker_id>', po_cad_views.POClubMarkerPlacementAddView.as_view(), name = 'po-club-marker-placement-add-view'),

    path('po_club/', include('marketing.marketing_urls.club_urls')),

    path('supplier_po/grn/', include('marketing.marketing_urls.grn_urls')),

    path('purchase_order/', include('marketing.marketing_urls.po_urls')),

    path('cad/', include('marketing.marketing_urls.cad_urls')),

    # path('commercial_invoice/', include('marketing.marketing_urls.invoice_urls')),

    #path('general_po/', include('marketing.marketing_urls.general_po_urls')),

    path('actual_po_club/grn/material/list/<int:actual_po_club_id>/', grn_views.ActualPOClubGRNMaterialListView.as_view(), name = 'actual-po-club-grn-material-list-view'),

    path('po_club/in_house/material/list/material/<int:club_id>/', cad_views.CADPurchaseOrderAllocatedMaterialListMaterialView.as_view(), name = 'po-club-in-house-material-list-material-view'),
    
    path('po_club/in_house/material/list/delivery_date/<int:club_id>/', cad_views.CADPurchaseOrderAllocatedMaterialListDeliveryDateView.as_view(), name = 'po-club-in-house-material-list-delivery-date-view'),
    
    path('po_club/in_house/material/list/shade_group/<int:club_id>/', cad_views.CADPurchaseOrderAllocatedMaterialListShadeGroupView.as_view(), name = 'po-club-in-house-material-list-shade-group-view'),

    path('packaging/instruction/material/list/<int:costing_version_id>/', costing_views.PackagingMaterialList.as_view(), name = 'packaging-instruction-material-list'),

    path('packaging/instruction/detail/<int:costing_version_id>/', costing_views.PackagingInstructionDetailView.as_view(), name = 'packaging-instruction-detail-view'),

    path('packaging/instruction/save/<int:pack_packaging_id>/', costing_views.PackagingInstructionCreateUpdateView.as_view(), name = 'packaging-instruction-create-update-view'),

    path('packaging/instruction/version/list/<int:costing_version_id>/', costing_views.PackagingInstructionVersionListView.as_view(), name = 'packaging-instruction-version-list-view'),

    path('packaging/instruction/version/create/<int:costing_version_id>/', costing_views.PackagingInstructionVersionCreateView.as_view(), name = 'packaging-instruction-version-create-view'),

    path('packaging/instruction/version/current_version/<int:pack_packaging_id>/', costing_views.PackagingInstructionCurrentVersionUpdateView.as_view(), name = 'packaging-instruction-current-version-change-view'),

    path('packaging/instruction/delete/<int:pack_packaging_instruction_id>/', costing_views.PackagingInstructionDeleteView.as_view(), name = 'packaging-instruction-delete-view'),

    path('orderinquiry/size_groups/detail/<int:costing_id>/', costing_views.SizeGroupDetailListView.as_view(), name="order-inquiry-size-groups-detail-list"),

     path('orderinquiry/size_groups/<int:general_po_id>/', costing_views.GeneralPOSizeGroupListView.as_view(), name="general-po-size-groups-detail"),

     path('orderinquiry/size_groups/quantities/<int:pk>/', costing_views.SizeGroupQuantityListView.as_view(), name="order-inquiry-size-groups-quantity-detail"),

     path('costing/activity/detail/<int:costing_id>/', costing_views.CostingActivityDetailView.as_view(), name='costing-activity-detail-view'),

     path('costing/clone/<int:source_costing_id>/<int:source_costing_version_id>/', costing_views.CostingCloneView.as_view(), name='costing-clone-view'),

     path('order_inquiry/pre_costing/create/<int:source_order_inquiry_id>/<int:source_costing_version_id>', costing_views.OrderInquiryPreCostingCreateView.as_view(), name='order_inquiry-pre_costing-create-view'),

     path('order_inquiry/pre_costing/update/<int:pre_costing_order_inquiry_id>/<int:pre_costing_version_id>', costing_views.OrderInquiryPreCostingEditView.as_view(), name='order_inquiry-pre_costing-edit-view'),

     path('costing/version/source/list/', costing_views.OrderCostingBasicListView.as_view(), name='costing-clone-source-list-view'),

     path('costing/version/pack_placement/bulk_delete/', costing_views.OrderCostingPackPlacementDeleteView.as_view(), name='costing-clone-source-list-view'),

     path('pre_costing/colorway/mappling/detail/<int:costing_id>/<int:version_id>/', costing_views.PreCostingColorwayMappingDetailView.as_view(), name='pre-costing-colorway-mapping-detail-view'),

     path('costing/clone/from_club/<int:po_club_id>/', costing_views.POClubCostingCloneView.as_view(), name='po-clubcosting-clone-view'),

     path('order_process/widget/', costing_views.OrderInquiryProcessWidgetView.as_view(), name='order-process-widget-detail-view'),

     path('order_process/po_club/widget/<int:pk>/', costing_views.OrderInquiryProcessPOClubWidgetView.as_view(), name='order-process-po-club-widget-detail-view'),

     #Paginated basic API for filtering

     path('order_costing/list/', PaginatedOrderCostingListView.as_view(), name='paginated-order-costing-list'),

     path('purchase_order/list/', PaginatedPurchaseOrderListView.as_view(), name='paginated-purchase-order-costing-list'),

     path('po_club/list/', PaginatedPOClubListView.as_view(), name='paginated-po-club-list'),


     #Consolidated supplier inquiry URL's

     path('consolidate/supplier_inquiry/material/list/', ConsolidateSupplierInquiryMaterialListView.as_view(), name='consolidate-supplier-inquiry-material-list-view'),

     path('consolidate/supplier_inquiry/material/costing/list/', ConsolidateSupplierInquiryMaterialCostingListView.as_view(), name='consolidate-supplier-inquiry-material-costing-list-view'),

     path('consolidate/supplier_inquiry/material/save/', ConsolidateSupplierInquiryMaterialCostingSaveView.as_view(), name='consolidate-supplier-inquiry-material-costing-list-view'),

     path('consolidate/supplier_inquiry/send/list/', SendSupplierInquiryListView.as_view(), name='consolidate-supplier-inquiry-material-costing-list-view'),

     path('consolidate/supplier_inquiry/send/detail/<int:pk>/', SendSupplierInquiryDetailView.as_view(), name='consolidate-supplier-inquiry-material-costing-detail-view'),

     path('consolidate/supplier_inquiry/costing/list/<int:pk>/', SendSupplierInquiryCostingListView.as_view(), name='consolidate-supplier-inquiry-costing-list-view'),

     path('consolidate/supplier_inquiry/send/update/<int:pk>/', SendSupplierInquiryUpdateView.as_view(), name='consolidate-supplier-inquiry-material-costing-update-view'),

     path('consolidate/supplier_inquiry/send/create/', SendSupplierInquiryCreateView.as_view(), name='consolidate-supplier-inquiry-material-costing-update-view'),

     path('consolidate/supplier_inquiry_detail/send/delete/<int:pk>/', SendSupplierInquiryDetailDeleteView.as_view(), name='consolidate-supplier-inquiry-material-costing-delete-view'),

     path('consolidate/supplier_inquiry/send/delete/<int:pk>/', SendSupplierInquiryDeleteView.as_view(), name='consolidate-supplier-inquiry-material-costing-delete-view'),

     path('consolidate/supplier_inquiry/move_state/', ConsolidateSupplierInquiryMoveStateView.as_view(), name='consolidate-supplier-inquiry-move-state-view'),

     path('prevoius/supplier_inquiry/list/<int:customer_brand_material_id>/', PreviousSupplierInquiryListView.as_view(), name='previous-supplier-inquiry-list-view'),

     path('supplier_inquiry/related_material/list/<int:customer_brand_material_id>/', RelatedMaterialListView.as_view(), name='previous-related-material-list-view'),

     path('supplier_inquiry/copy/<int:costing_version_id>/<int:customer_brand_material_id>/', PreviousSupplierInquiryCopyView.as_view(), name='previous-supplier-inquiry-copy-view'),

     path('order_costing_version_detail/', costing_views.OrderCostingVersionDetailView.as_view(), name='order_costing_version'),

     path('order/speed_consumption/detail/<int:pk>/', costing_views.OrderPlacementSpeedConsumptionDetailView.as_view(), name='order-order-placement-speed-consumption-detail-view'),

     path('order/speed_consumption/save/', costing_views.OrderPlacementSpeedConsumptionSaveView.as_view(), name='order-order-placement-speed-consumption-save-view'),

     path('order/speed_consumption/list/<int:item_id>/<int:version_id>/', costing_views.OrderPlacementSpeedConsumptionListView.as_view(), name='order-order-placement-speed-consumption-list-view'),

     path('order/speed_consumption/send_to_cad_team/<int:version_id>/', costing_views.OrderPlacementSpeedConsumptionSendtoCadTeamView.as_view(), name='order-order-placement-speed-consumption-list-view'),

     path('order/speed_consumption/material_list/<int:version_id>/', costing_views.CostingFabricMaterialListView.as_view(), name='costing-fabric-material-list-view'),

     path('order/speed_consumption/send_to_cad_team/list/', cad_views.PendingSpeedConsumptionListView.as_view(), name='order-order-placement-speed-consumption-list-view'),

     path('order/speed_consumption/send_to_cad_team/detail/<int:pk>/', cad_views.PendingSpeedConsumptionDetailView.as_view(), name='order-order-placement-speed-consumption-list-view'),

     path('order/speed_consumption/cad/save/', cad_views.OrderPlacementSpeedConsumptionCADSaveView.as_view(), name='order-order-placement-speed-consumption-save-view'),

     path('order/speed_consumption/cad/task_complete/<int:version_id>/', cad_views.OrderPlacementSpeedConsumptionCADTaskCompleteUpdateView.as_view(), name='order-order-placement-speed-consumption-task-complete-update-view'),

     #Colorway item image update API
     path('colorway_item_type/file/update/<int:colorway_item_type_id>/', costing_views.ColorwayItemTypeAttachmentUpdateView.as_view(), name='colorway-item-type-image-update-view'),

     path('order_item/file/update/<int:order_item_id>/', costing_views.OrderItemAttachmentUpdateView.as_view(), name='order-item-image-update-view'),

     path('pre_costing/material/list/<int:version_id>/', costing_views.PreCostingMaterialListAPI.as_view(), name='prr-costing-material-list-view'),

     path('pre_costing/completed_material/update/<int:version_id>/', costing_views.PreCostingMaterialCompleteUpdateAPI.as_view(), name='prr-costing-material-update-view'),

     path('pre_costing/completed_material/date/update/<int:version_id>/', costing_views.PreCostingMaterialCompleteDateUpdateAPI.as_view(), name='prr-costing-material-update-view'),

     path('pre_costing/completed_material/po_club/list/<int:version_id>/', costing_views.PreCostingMaterialCompletePOClubListViewAPI.as_view(), name='pre-costing-material-complete-po_club-list-view'),

     path('pre_costing/completed_material/po_club/update/', costing_views.PreCostingMaterialCompletePOClubUpdateViewAPI.as_view(), name='pre-costing-material-complete-po_club-update-view'),

     path('po_club/generate_general_service_po_services/<int:po_club_id>/', club_views.POClubGenerateGeneralServicePOServicesView.as_view(), name='po_club-generate_general_service_po_services'),

     path('costing/diffrence/<int:marketing_costing_version_id>/<int:pre_costing_version_id>/', costing_views.CostingDifferenceDetailView.as_view(), name='costing-diference-detail-view'),

     path('po_club/diffrence/<int:pre_costing_version_id>/<int:po_club_id>/', costing_views.POClubCostingDifferenceDetailView.as_view(), name='costing-po-club-diference-detail-view'),

     path('colorway/diffrence/<int:marketing_costing_version_id>/<int:pre_costing_version_id>/<int:pack_id>/', costing_views.CostingColorwayDifferenceDetailView.as_view(), name='costing-colorway-diference-detail-view'),
     
]