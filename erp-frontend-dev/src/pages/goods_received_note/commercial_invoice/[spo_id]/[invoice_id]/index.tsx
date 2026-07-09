import DocumentHead from '@/components/DocumentHead';
import RitzBreadcrumbs from '@/components/Ritz/RitzBreadcrumbs';
import ActualPoClubDetails from '@/views/purchase_order/club/ActualPoClubDetails'
import CISummary from '@/views/supplier_po/reports/CISummary';
import GRNSummary from '@/views/supplier_po/reports/GrnSummary';
import SupplierPOSummary from '@/views/supplier_po/reports/SupplierPOSummary';
import { useRouter } from 'next/router';
import React from 'react'

const index = (supplierPO: any) => {

    const router = useRouter();
    const { spo_id, invoice_id, id, is_po_club } = router.query;
    const title = 'Commercial Invoice Report';
    const breadcrumbItems = is_po_club === 'true'
    ? [
        { label: 'Purchase Orders Clubs', url: '/purchase_order/purchase_order_club' },
        { label: 'Purchase Order Club', url: `/purchase_order/purchase_order_club/${id}?tab=12` },
        { label: 'Commercial Invoice' },
      ]
    : [
        { label: 'General Purchase Orders', url: '/general_purchase_order' },
        { label: 'General Purchase Order', url: `/general_purchase_order/${id}?&tab=6` },
        { label: 'Commercial Invoice' },
      ];
    return (
        <>
            <DocumentHead title={title} />
            <RitzBreadcrumbs
                items={breadcrumbItems}
                title={title}
            />
            
            <CISummary spoId={spo_id} invoiceId={invoice_id} sourceId={id}  isPoClub={is_po_club}/>
        </>
    )
}

export default index