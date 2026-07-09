import OrderSummary from "@/views/costing/OrderSummary";
import { useRouter } from "next/router";
import { Grid } from "@mui/material";
import DocumentHead from "@/components/DocumentHead";
import RitzBreadcrumbs from "@/components/Ritz/RitzBreadcrumbs";

const OrderVersionSummaryPage = () => {
    const router = useRouter();
    const { id, version_id } = router.query;
    const title = 'Order Summary';

    return (
        <>
            <DocumentHead title={title} />

            <Grid container>
                <Grid item xs={12} md={6}>
                    <RitzBreadcrumbs
                        items={[
                            { label: 'Operation Inquiries', url: '/ie_interface/operation_inquiries' },
                            { label: title },
                        ]}
                        title={title}
                    />
                </Grid>
            </Grid>

            <OrderSummary orderId={id} versionId={version_id}/>      
        </>
     );
}

export default OrderVersionSummaryPage;