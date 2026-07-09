import { Breadcrumbs, Link, Typography } from "@mui/material";
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NextLink from 'next/link';
import { useRouter } from "next/router";

const PURCHASE_ORDER_BREADCRUMBS = (purchaseOrderId: any, uploadedPOId: any) => [
    { label: 'Purchase Order', url: '/purchase_order' },
    { label: 'Purchase Order Details', url: `/purchase_order/${purchaseOrderId}?&tab=1` },
    { label: 'Purchase Order Upload', url: `/purchase_order/${purchaseOrderId}/upload_purchase_order` },
    { label: 'Purchase Order Costing', url: `/purchase_order/${purchaseOrderId}/purchase_order_costing` },
    { label: 'Purchase Order Sizes', url: `/purchase_order/${purchaseOrderId}/purchase_order_sizes` },
    { label: 'Purchase Order Countries', url: `/purchase_order/${purchaseOrderId}/purchase_order_countries` },
    { label: 'Purchase Order Quantities', url: `/purchase_order/${purchaseOrderId}/purchase_order_quantities` },
    { label: 'Purchase Order Colorways', url: `/purchase_order/${purchaseOrderId}/purchase_order_colorways` },
    { label: 'Colorway Category Mappings', url: `/purchase_order/${purchaseOrderId}/purchase_order_colorway_mappings` },
    { label: 'Edit Purchase Order Costing', url: `/purchase_order/${purchaseOrderId}/edit_purchase_order_costing` },
    { label: 'Purchase Order Clubing', url: `/purchase_order/${purchaseOrderId}/${uploadedPOId}/purchase_order_clubing` },
]

export const PurchaseOrderPageTitle = ({ children, activeIndex }: any) => {
    const router = useRouter();
    const id = router?.query?.purchase_order_id;
    const uploadedPOId = router?.query?.uploaded_purchase_order_id;

    const breadcrumbItems: any[] = PURCHASE_ORDER_BREADCRUMBS(id, uploadedPOId);

    // if (activeIndex === 22) {
    //     breadcrumbItems = [
    //         breadcrumbItems[0],
    //         breadcrumbItems[1],
    //         breadcrumbItems[2],
    //     ];
    // }

    return (
        <>
            <Breadcrumbs
                separator={<NavigateNextIcon fontSize="small" />}
                aria-label="breadcrumb"
                sx={{ mb: 1.5 }}
            >
                {breadcrumbItems.slice(0, 1).map((bc: any, index: number) =>
                    <Link key={index} underline='hover' color='text.primary' component={NextLink} href={bc.url}>{bc.label}</Link>
                )}
                {activeIndex >= 4 && (
                    <Link
                        underline='hover'
                        color='text.primary'
                        component={NextLink}
                        href={breadcrumbItems[1].url}
                    >
                        {breadcrumbItems[1].label}
                    </Link>
                )}
                {breadcrumbItems.slice(activeIndex, activeIndex + 1).map((bc: any, index: number) =>
                    <div key={index}>
                        <Typography color='inherit' key={index}>{bc.label}</Typography>
                    </div>
                )}
            </Breadcrumbs>
            <Typography variant='h1'>{children}</Typography>
        </>
    )
}

export default PurchaseOrderPageTitle;
