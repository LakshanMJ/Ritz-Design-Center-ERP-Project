import DocumentHead from '@/components/DocumentHead';
import PurchaseOrderPageTitle from '@/components/PurchaseOrder/POPageTitle';
import PurchaseOrderCosting from '@/views/purchase_order/PurchaseOrderCosting'
import { useRouter } from 'next/router';
import React from 'react'
import POCountryColorwayItemMaterials
    from "@/views/purchase_order/country_colorway_materials/POCountryColorwayItemMaterials";
import * as restUrls from "@/helpers/constants/rest_urls/POUrls";

const ColorwayCountryItemMaterials = () => {
  const router = useRouter();
  const { purchase_order_id, po_colorway_id, po_country_id, po_item_id } = router.query;
  const title = 'Edit Colorway Country Materials';
    const placementMaterialURL = restUrls.purchaseOrderColorwayCountryItemPlacementDataURL(purchase_order_id as any, po_item_id as any,
        po_colorway_id as any, po_colorway_id as any);

  return (
    <>
      <DocumentHead title={title} />
      <PurchaseOrderPageTitle activeIndex={3}>{title}</PurchaseOrderPageTitle>
        <POCountryColorwayItemMaterials purchaseOrderId={purchase_order_id} dataGetUrl={placementMaterialURL}/>
    </>

  )
}

export default ColorwayCountryItemMaterials;