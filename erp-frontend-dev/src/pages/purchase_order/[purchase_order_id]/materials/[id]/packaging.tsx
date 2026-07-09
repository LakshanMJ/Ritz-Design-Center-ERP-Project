import DocumentHead from '@/components/DocumentHead'
import { useRouter } from 'next/router'
import React from 'react'
import POOrderMaterials from "@/views/purchase_order/materials/POOrderMaterials";
import * as RestUrls from "@/helpers/constants/RestUrls";
import {ORDER_MATERIAL_PACK_TYPE, ORDER_PACKAGING_TYPE} from "@/helpers/constants/Constants";
import {savePOPackMaterialURL} from "@/helpers/constants/RestUrls";
import RitzBreadcrumbs from '@/components/Ritz/RitzBreadcrumbs';

const PackagingPage = () => {
  const router = useRouter();
  const { purchase_order_id } = router.query;
  const { id } = router.query;
  const title = 'Purchase Order Material Packing';
  return (
    <>
      <DocumentHead title={title} />
      <RitzBreadcrumbs
          items={[
              { label: 'Purchase Orders', url: '/purchase_order' },
              { label: 'Order Details' },
          ]}
          title={title}
      />
      <POOrderMaterials
          purchaseOrderId={purchase_order_id}
          objectId={id}
          materialsURLFunction={RestUrls.purchaseOrderPackMaterialsURL}
          materialType={ORDER_PACKAGING_TYPE}
          materialSaveURL={RestUrls.savePOPackMaterialURL}
      />

    </>
  )
}

export default PackagingPage


