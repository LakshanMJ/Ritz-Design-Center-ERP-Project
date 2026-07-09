import DocumentHead from '@/components/DocumentHead';
import { useRouter } from 'next/router';
import React from 'react'
import POOrderMaterials from "@/views/purchase_order/materials/POOrderMaterials";
import * as RestUrls from '@/helpers/constants/RestUrls';
import {ORDER_MATERIAL_TYPE} from "@/helpers/constants/Constants";
import RitzBreadcrumbs from '@/components/Ritz/RitzBreadcrumbs';

const PackItemPage = () => {
  const router = useRouter();
  const { purchase_order_id } = router.query;
  const { id } = router.query;
  const title = 'Purchase Order Material Pack Item';
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
          materialsURLFunction={RestUrls.purchaseOrderPackItemMaterialsURL}
          materialType={ORDER_MATERIAL_TYPE}
          materialSaveURL={RestUrls.savePOItemMaterialURL}
      />
     </>
  )
}

export default PackItemPage