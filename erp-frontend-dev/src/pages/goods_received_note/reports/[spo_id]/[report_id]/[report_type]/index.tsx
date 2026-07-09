import DocumentHead from '@/components/DocumentHead';
import RitzBreadcrumbs from '@/components/Ritz/RitzBreadcrumbs';
import SupplierPOSummary from '@/views/supplier_po/reports/SupplierPOSummary';
import { useRouter } from 'next/router';
import React from 'react';

const Index = (supplierPO: any) => {
    const router = useRouter();
    const { spo_id, report_id, report_type, id, is_po_club } = router.query;
    const title = 'Supplier PO Summary';

    const breadcrumbItems = is_po_club === 'true'
        ? [
            { label: 'Purchase Orders Clubs', url: '/purchase_order/purchase_order_club' },
            { label: 'Purchase Order Club', url: `/purchase_order/purchase_order_club/${id}?tab=12` },
            { label: 'SPO Summary' },
          ]
        : [
            { label: 'General Purchase Orders', url: '/general_purchase_order' },
            { label: 'General Purchase Order', url: `/general_purchase_order/${id}?&tab=6` },
            { label: 'SPO Summary' },
          ];

    return (
        <>
            <DocumentHead title={title} />
            <RitzBreadcrumbs
                items={breadcrumbItems}
                title={title}
            />
            <SupplierPOSummary spoId={spo_id} reportId={report_id} reportType={report_type} selectedId={id} isPOClub={is_po_club} />
        </>
    );
};

export default Index;